import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalApplication} from '../serve-local.mjs';
async function fixture(requireIp=true,auth='approval'){
 const app=createLocalApplication({databasePath:':memory:',setupCode:'test-only-code'});let teacher='';
 async function call(url,body,{status=200,cookie=teacher,ip='1.2.3.4'}={}){
  const response=await app.dispatch(new Request('https://class.test'+url,{method:body?'POST':'GET',headers:{Origin:'https://class.test','Content-Type':'application/json','cf-connecting-ip':ip,Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})}));
  const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));return {result,cookie:response.headers.get('set-cookie')?.split(';')[0]||''};
 }
 teacher=(await call('/api/auth',{action:'register',role:'teacher',name:'Teacher',email:'teacher@example.com',password:'test-teacher-password',setupCode:'test-only-code'})).cookie;
 async function enroll(name,roll,email){await call('/api/attendance',{action:'student',name,roll,email});const student=app.sql.prepare('SELECT id FROM students WHERE roll=?').get(roll);const invitation=(await call('/api/attendance',{action:'studentInvite',studentId:student.id})).result;return (await call('/api/auth',{action:'register',role:'student',name,email,password:'test-student-password',invite:new URL(invitation.inviteUrl).searchParams.get('invite')})).cookie;}
 const student=await enroll('Harshit More','R1','harshit@example.com');
 const token=(await call('/api/attendance',{action:'session',subject:'COA',room:'B204',duration:180,mode:'qr',auth,requireIp})).result.token;
 return {...app,call,enroll,token,student};
}

test('matching signed-in student is queued, not auto-marked; request uses registered identity and deduplicates',async()=>{
 const h=await fixture();
 await h.call('/api/attendance',{action:'requestAttendance',token:h.token},{cookie:'',status:401});
 const result=(await h.call('/api/attendance',{action:'requestAttendance',token:h.token,name:'Fake Name',roll:'NOT-R1',studentId:'forged'},{cookie:h.student})).result;
 assert(result.pending);assert.equal(result.requestStatus,'Pending');assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM attendance').get().n,0);
 const row=h.sql.prepare('SELECT * FROM attendance_requests').get();assert.equal(row.name,'Harshit More');assert.equal(row.roll,'R1');assert(row.account_id);
 await h.call('/api/attendance',{action:'requestAttendance',token:h.token},{cookie:h.student});assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM attendance_requests').get().n,1);
 await h.call('/api/attendance',{action:'checkin',token:h.token},{cookie:h.student,status:403});
 const mine=(await h.call('/api/attendance?portal=student&token='+h.token,null,{cookie:h.student})).result;assert.equal(mine.myAttendanceRequests[0].status,'Pending');assert.deepEqual(mine.approvalRequests,[]);h.close();
});

test('teacher approves after session closes; student sees approval and one saved attendance record',async()=>{
 const h=await fixture();await h.call('/api/attendance',{action:'requestAttendance',token:h.token},{cookie:h.student});
 const queue=(await h.call('/api/attendance')).result.approvalRequests;assert.equal(queue.length,1);assert(queue[0].account_id);assert.equal(queue[0].receipt_hash,undefined);
 await h.call('/api/attendance',{action:'reviewAttendance',requestId:queue[0].id,decision:'Approve'},{cookie:h.student,status:403});
 await h.call('/api/attendance',{action:'close',token:h.token});
 await h.call('/api/attendance',{action:'reviewAttendance',requestId:queue[0].id,decision:'Approve'});
 const mine=(await h.call('/api/attendance?portal=student&token='+h.token,null,{cookie:h.student})).result;assert.equal(mine.myAttendanceRequests[0].status,'Approved');assert.equal(mine.records.length,1);
 const again=(await h.call('/api/attendance',{action:'requestAttendance',token:h.token},{cookie:h.student})).result;assert(again.alreadyPresent);
 await h.call('/api/attendance',{action:'reviewAttendance',requestId:queue[0].id,decision:'Approve'},{status:409});assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM attendance').get().n,1);h.close();
});

test('rejection never marks attendance; student privacy, missing registration and expiry fail closed',async()=>{
 const h=await fixture();const other=await h.enroll('Other Student','R2','other@example.com');
 await h.call('/api/attendance',{action:'requestAttendance',token:h.token},{cookie:h.student});const row=h.sql.prepare('SELECT id FROM attendance_requests').get();
 const unrelated=(await h.call('/api/attendance?portal=student',null,{cookie:other})).result;assert.deepEqual(unrelated.myAttendanceRequests,[]);assert.deepEqual(unrelated.approvalRequests,[]);
 await h.call('/api/attendance',{action:'reviewAttendance',requestId:row.id,decision:'Reject'});
 const result=(await h.call('/api/attendance',{action:'requestAttendance',token:h.token},{cookie:h.student})).result;assert.equal(result.requestStatus,'Rejected');assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM attendance').get().n,0);
 h.sql.prepare('UPDATE sessions SET expires=0 WHERE token=?').run(h.token);await h.call('/api/attendance',{action:'requestAttendance',token:h.token},{cookie:other,status:410});
 const next=(await h.call('/api/attendance',{action:'session',subject:'COA',room:'B',duration:180,mode:'qr',auth:'approval'})).result;
 h.sql.prepare("DELETE FROM students WHERE roll='R2'").run();await h.call('/api/attendance',{action:'requestAttendance',token:next.token},{cookie:other,status:403});h.close();
});

test('teacher-assisted and signed-in instant modes retain separate behavior',async()=>{
 const manual=await fixture(false,'manual');
 await manual.call('/api/attendance',{action:'requestAttendance',token:manual.token},{cookie:manual.student});
 assert.equal(manual.sql.prepare('SELECT COUNT(*) n FROM attendance_requests').get().n,1);
 const id=manual.sql.prepare('SELECT id FROM students').get().id;
 await manual.call('/api/attendance',{action:'checkin',token:manual.token,studentId:id});
 assert.equal(manual.sql.prepare('SELECT COUNT(*) n FROM attendance').get().n,1);manual.close();
 const account=await fixture(false,'account');
 await account.call('/api/attendance',{action:'checkin',token:account.token},{status:403});
 await account.call('/api/attendance',{action:'requestAttendance',token:account.token},{cookie:account.student,status:400});
 await account.call('/api/attendance',{action:'checkin',token:account.token},{cookie:account.student});
 assert.equal(account.sql.prepare('SELECT COUNT(*) n FROM attendance').get().n,1);
 assert.equal(account.sql.prepare('SELECT COUNT(*) n FROM attendance_requests').get().n,0);account.close();
});

test('optional IP matching still applies to student requests and face scans',async()=>{
 const h=await fixture();
 await h.call('/api/attendance',{action:'requestAttendance',token:h.token},{cookie:h.student,ip:'9.8.7.6',status:403});
 await h.call('/api/attendance',{action:'sessionIp',token:h.token,requireIp:false});
 const off=(await h.call('/api/checkin?session='+h.token,null,{cookie:h.student,ip:'9.8.7.6'})).result;assert.equal(off.connectionRequired,false);assert.equal(off.connectionMatches,true);
 await h.call('/api/attendance',{action:'requestAttendance',token:h.token},{cookie:h.student,ip:'9.8.7.6'});
 const other=await h.enroll('Other Student','R2','other@example.com');await h.call('/api/attendance',{action:'sessionIp',token:h.token,requireIp:true});await h.call('/api/attendance',{action:'requestAttendance',token:h.token},{cookie:other,ip:'9.8.7.6',status:403});
 const face=(await h.call('/api/attendance',{action:'session',subject:'COA',room:'B',duration:180,mode:'face',auth:'manual',requireIp:false})).result;
 const faceOff=(await h.call('/api/attendance',{action:'checkin',token:face.token,descriptor:Array(128).fill(.1)},{ip:'9.8.7.6',status:403})).result;assert.match(faceOff.error,/live camera challenge/);
 await h.call('/api/attendance',{action:'sessionIp',token:face.token,requireIp:true});const faceOn=(await h.call('/api/attendance',{action:'checkin',token:face.token,descriptor:Array(128).fill(.1)},{ip:'9.8.7.6',status:403})).result;assert.match(faceOn.error,/Connection check failed/);h.close();
});
