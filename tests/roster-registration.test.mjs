import test from 'node:test';import assert from 'node:assert/strict';import {createLocalApplication} from '../serve-local.mjs';import {parseRoster,parsePdfRosterLines} from '../public/roster-core.js';
test('CSV, TSV, roll-only lists and PDF rows preserve student names and reject duplicates',()=>{
 assert.deepEqual(parseRoster('\uFEFFUSN,Student Name,Email\r\n25btrpw046,"More, Harshit",\r\n')[0],{roll:'25BTRPW046',name:'More, Harshit',email:''});
 assert.equal(parseRoster('R01\nR02')[1].name,'');assert.equal(parseRoster('roll\tname\nR01\tHarshit')[0].name,'Harshit');
 assert.throws(()=>parseRoster('roll,name\nR1,A\nr1,B'),/Duplicate/);assert.throws(()=>parseRoster('roll,name\nR1,"Bad'),/quote/);
 const pdf=parsePdfRosterLines(['Class student list','S No Roll Number Name','1 25BTRPW046 Harshit More','2 25BTRPW038 Garv Joshi','Page 1']);assert.equal(pdf.rows.length,2);assert.equal(pdf.rows[0].name,'Harshit More');assert(pdf.skipped.includes('Class student list'));
 assert.throws(()=>parsePdfRosterLines(['Scanned image no readable students']),/No readable/);
});
test('teacher imports class list atomically; unlisted rolls and wrong names cannot start face enrollment',async()=>{
 const h=createLocalApplication({databasePath:':memory:',setupCode:'code'});let teacher='';
 async function call(path,body,{cookie=teacher,status=200}={}){const r=await h.dispatch(new Request('https://class.test'+path,{method:body?'POST':'GET',headers:{Origin:'https://class.test','Content-Type':'application/json',Cookie:cookie,'cf-connecting-ip':'1.2.3.4'},...(body?{body:JSON.stringify(body)}:{})}));const v=await r.json();assert.equal(r.status,status,JSON.stringify(v));return {v,cookie:r.headers.get('set-cookie')?.split(';')[0]||''};}
 const api=(body,opts)=>call('/api/face-enrollment',body,opts).then(r=>r.v);
 try{
 teacher=(await call('/api/auth',{action:'register',role:'teacher',name:'Teacher',email:'teacher@example.com',password:'test-password-very-long',setupCode:'code'})).cookie;
 await call('/api/attendance',{action:'rosterImport',rows:[{roll:'R1',name:'Harshit More'},{roll:'R2'}]},{cookie:'',status:401});
 const first=(await call('/api/attendance',{action:'rosterImport',rows:[{roll:'r1',name:'Harshit More'},{roll:'R2'}]})).v;assert.equal(first.added,2);
 await call('/api/attendance',{action:'rosterImport',rows:[{roll:'R3',name:'Garv'},{roll:'r3',name:'Other'}]},{status:400});assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM students').get().n,2);
 await call('/api/attendance',{action:'rosterImport',rows:[{roll:'R3',name:'Garv'},{roll:'R1',name:'Wrong',email:'other@example.com'}]},{status:409});assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM students').get().n,2);
 const token=(await api({action:'create'})).token;const page=(await call('/api/face-enrollment?enrollment='+token,null,{cookie:''})).v;assert.equal(page.scope,'roster');assert.equal(page.students,undefined);
 const receipt='a'.repeat(64),base={token,receipt,name:'Harshit More',roll:'r1'};
 await api({action:'identify',...base,roll:'R999'},{cookie:'',status:403});await api({action:'challenge',...base,name:'Wrong',consent:true},{cookie:'',status:403});
 const who=await api({action:'identify',...base},{cookie:''});assert.equal(who.student.roll,'R1');
 await api({action:'challenge',...base},{cookie:'',status:400});const c=await api({action:'challenge',...base,consent:true},{cookie:''});h.sql.prepare('UPDATE liveness_challenges SET created=? WHERE nonce=?').run(Date.now()-5000,c.nonce);
 const v=Array(128).fill(.1),neutral={ear:.3,yaw:0},blink=[{ear:.1,yaw:0},neutral,neutral],turn=[{ear:.3,yaw:.2*c.direction},{ear:.3,yaw:.2*c.direction},neutral,neutral];const samples=[neutral,neutral,neutral,...(c.order==='blink-turn'?[...blink,...turn]:[...turn,...blink])].map((s,i)=>({...s,t:i*160}));
 await api({action:'submit',...base,consent:true,descriptors:[v,v,v],liveness:{nonce:c.nonce,startDescriptor:v,endDescriptor:v,samples}},{cookie:''});assert.equal(h.sql.prepare('SELECT descriptors FROM students WHERE roll=?').get('R1').descriptors,null);
 const own=(await call('/api/face-enrollment?enrollment='+token+'&receipt='+receipt,null,{cookie:''})).v;assert.equal(own.request.status,'Pending');assert.equal(own.request.descriptors,undefined);
 const row=h.sql.prepare('SELECT id FROM face_enrollment_requests').get();await api({action:'review',requestId:row.id,decision:'Approve',verified:true});assert(h.sql.prepare('SELECT descriptors FROM students WHERE roll=?').get('R1').descriptors);
 const r2=await api({action:'identify',token,receipt:'b'.repeat(64),name:'Garv Joshi',roll:'R2'},{cookie:''});assert.equal(r2.student.name,'Garv Joshi');
 const duplicate=(await call('/api/attendance',{action:'rosterImport',rows:[{roll:'R1',name:'Harshit More'}]})).v;assert.equal(duplicate.linked,1);assert(h.sql.prepare('SELECT descriptors FROM students WHERE roll=?').get('R1').descriptors);
 await api({action:'close',token});await api({action:'identify',...base},{cookie:'',status:410});
 // Existing manual registration still works alongside list imports.
 await call('/api/attendance',{action:'student',roll:'R4',name:'Manual Student',email:'manual@example.com'});assert(h.sql.prepare('SELECT id FROM students WHERE roll=?').get('R4'));
 }finally{h.close()}
});
