import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalApplication} from '../serve-local.mjs';
async function fixture(requireIp=true){
 const app=createLocalApplication({databasePath:':memory:',setupCode:'test-only-code'});let teacher='';
 async function call(url,body,{status=200,cookie=teacher,ip='1.2.3.4'}={}){
  const r=await app.dispatch(new Request('https://class.test'+url,{method:body?'POST':'GET',headers:{Origin:'https://class.test','Content-Type':'application/json','cf-connecting-ip':ip,Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})}));
  const result=await r.json();assert.equal(r.status,status,JSON.stringify(result));return {result,cookie:r.headers.get('set-cookie')?.split(';')[0]||''};
 }
 teacher=(await call('/api/auth',{action:'register',role:'teacher',name:'Teacher',email:'teacher@example.com',password:'test-teacher-password',setupCode:'test-only-code'})).cookie;
 await call('/api/attendance',{action:'student',name:'Harshit More',roll:'R1',email:'harshit@example.com'});
 const token=(await call('/api/attendance',{action:'session',subject:'COA',room:'B204',duration:180,mode:'qr',auth:'direct',requireIp})).result.token;
 return {...app,call,token};
}

test('name+roll match normalizes name case/spacing and marks directly; missing names fail',async()=>{
 const h=await fixture();
 await h.call('/api/checkin',{session:h.token,roll:'R1'},{status:400,cookie:''});
 const result=(await h.call('/api/checkin',{session:h.token,name:'  HARSHIT   More ',roll:'R1'},{cookie:''})).result;assert(result.ok);assert(!result.pending);
 assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM attendance').get().n,1);assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM attendance_requests').get().n,0);
 await h.call('/api/checkin',{session:h.token,name:'Harshit More',roll:'R1'},{cookie:''});assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM attendance').get().n,1);h.close();
});

test('mismatched name queues once, receipt reports status, only teacher can approve, and approval is idempotent',async()=>{
 const h=await fixture();
 const pending=(await h.call('/api/checkin',{session:h.token,name:'Harshit typo',roll:'R1'},{status:202,cookie:''})).result;assert(pending.pending);assert(pending.receipt);
 assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM attendance').get().n,0);
 await h.call('/api/checkin',{session:h.token,name:'Harshit typo',roll:'R1'},{cookie:''});assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM attendance_requests').get().n,1);
 const queue=(await h.call('/api/attendance')).result.approvalRequests;assert.equal(queue.length,1);assert.equal(queue[0].registered_name,'Harshit More');assert.equal(queue[0].receipt_hash,undefined);
 await h.call('/api/attendance',{action:'reviewAttendance',requestId:queue[0].id,decision:'Approve'},{cookie:'',status:401});
 const student=h.sql.prepare('SELECT id FROM students').get();const invitation=(await h.call('/api/attendance',{action:'studentInvite',studentId:student.id})).result;
 const invite=new URL(invitation.inviteUrl).searchParams.get('invite');const signed=await h.call('/api/auth',{action:'register',role:'student',email:'harshit@example.com',name:'Harshit',password:'student-test-password',invite});
 await h.call('/api/attendance',{action:'reviewAttendance',requestId:queue[0].id,decision:'Approve'},{cookie:signed.cookie,status:403});
 assert.deepEqual((await h.call('/api/attendance?portal=student',null,{cookie:signed.cookie})).result.approvalRequests,[]);
 await h.call('/api/checkin?session='+h.token+'&receipt=bad',null,{cookie:'',status:404});
 assert.equal((await h.call('/api/checkin?session='+h.token+'&receipt='+pending.receipt,null,{cookie:''})).result.requestStatus,'Pending');
 await h.call('/api/attendance',{action:'close',token:h.token});
 await h.call('/api/attendance',{action:'reviewAttendance',requestId:queue[0].id,decision:'Approve'});
 assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM attendance').get().n,1);
 assert.equal((await h.call('/api/checkin?session='+h.token+'&receipt='+pending.receipt,null,{cookie:''})).result.requestStatus,'Approved');
 await h.call('/api/attendance',{action:'reviewAttendance',requestId:queue[0].id,decision:'Reject'},{status:409});assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM attendance').get().n,1);h.close();
});

test('unknown roll must be registered before approval; rejection and later registration are handled',async()=>{
 const h=await fixture();
 const pending=(await h.call('/api/checkin',{session:h.token,name:'New Student',roll:'R2'},{cookie:'',status:202})).result;
 const row=h.sql.prepare('SELECT * FROM attendance_requests').get();
 await h.call('/api/attendance',{action:'reviewAttendance',requestId:row.id,decision:'Approve'},{status:409});assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM attendance').get().n,0);
 await h.call('/api/attendance',{action:'close',token:h.token});
 await h.call('/api/attendance',{action:'student',name:'New Student',roll:'R2',email:'new@example.com'});
 h.sql.prepare('UPDATE students SET created_at=? WHERE roll=?').run(row.created+10000,'R2');
 await h.call('/api/attendance',{action:'reviewAttendance',requestId:row.id,decision:'Approve'});
 assert.equal(h.sql.prepare('SELECT created_at FROM students WHERE roll=?').get('R2').created_at,row.created);
 assert.equal((await h.call('/api/checkin?session='+h.token+'&receipt='+pending.receipt,null,{cookie:''})).result.requestStatus,'Approved');
 const next=(await h.call('/api/attendance',{action:'session',subject:'COA',room:'B',duration:180,mode:'qr',auth:'direct'})).result;
 await h.call('/api/checkin',{session:next.token,name:'Unknown',roll:'R3'},{cookie:'',status:202});
 const reject=h.sql.prepare("SELECT * FROM attendance_requests WHERE roll='R3'").get();await h.call('/api/attendance',{action:'reviewAttendance',requestId:reject.id,decision:'Reject'});
 assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM attendance').get().n,1);assert.equal(h.sql.prepare('SELECT status FROM attendance_requests WHERE id=?').get(reject.id).status,'Rejected');h.close();
});

test('teacher can create and toggle IP matching; QR and face share the optional enforcement',async()=>{
 const h=await fixture();
 const body={session:h.token,name:'Harshit More',roll:'R1'};
 await h.call('/api/checkin',body,{cookie:'',ip:'9.8.7.6',status:403});
 await h.call('/api/attendance',{action:'sessionIp',token:h.token,requireIp:false});
 const metadata=(await h.call('/api/checkin?session='+h.token,null,{cookie:'',ip:'9.8.7.6'})).result;assert.equal(metadata.connectionRequired,false);assert.equal(metadata.connectionMatches,true);
 await h.call('/api/checkin',body,{cookie:'',ip:'9.8.7.6'});
 await h.call('/api/attendance',{action:'sessionIp',token:h.token,requireIp:true});
 await h.call('/api/checkin',body,{cookie:'',ip:'9.8.7.6',status:403});
 const face=(await h.call('/api/attendance',{action:'session',subject:'COA',room:'B',duration:180,mode:'face',auth:'manual',requireIp:false})).result;
 const off=(await h.call('/api/attendance',{action:'checkin',token:face.token,descriptor:Array(128).fill(.1)},{ip:'9.8.7.6',status:403})).result;assert.match(off.error,/live camera challenge/);
 await h.call('/api/attendance',{action:'sessionIp',token:face.token,requireIp:true});
 const on=(await h.call('/api/attendance',{action:'checkin',token:face.token,descriptor:Array(128).fill(.1)},{ip:'9.8.7.6',status:403})).result;assert.match(on.error,/Connection check failed/);
 await h.call('/api/attendance',{action:'close',token:face.token});await h.call('/api/attendance',{action:'sessionIp',token:face.token,requireIp:false},{status:410});
 h.close();
});
