import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createLocalApplication} from '../serve-local.mjs';
const password='A-real-test-password-45';
function harness(){
 const app=createLocalApplication({databasePath:':memory:',setupCode:'private-test-setup'});
 async function request(url,body,{cookie='',status=200,ip='1.2.3.4',origin='https://class.test'}={}){
  const req=new Request('https://class.test'+url,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':ip,...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const response=await app.dispatch(req);assert(response);const value=await response.json();assert.equal(response.status,status,JSON.stringify(value));return {value,cookie:response.headers.get('set-cookie')?.split(';')[0]||'',headers:response.headers};
 }
 return {...app,request,async teacher(){return request('/api/auth',{action:'register',role:'teacher',name:'Teacher',email:'teacher@example.com',password,setupCode:'private-test-setup'})}};
}

test('real email/password signup, invite activation, role isolation, logout and reset invalidate sessions',async()=>{
 const h=harness(),r=h.request;
 await r('/api/attendance',null,{status:401});
 await r('/api/auth',{action:'register',role:'teacher',name:'Intruder',email:'bad@example.com',password,setupCode:'wrong'},{status:403});
 const teacher=await h.teacher();assert.match(teacher.headers.get('set-cookie'),/HttpOnly/);assert.match(teacher.headers.get('set-cookie'),/SameSite=Lax/);assert.match(teacher.headers.get('set-cookie'),/Secure/);
 const account=h.sql.prepare("SELECT * FROM accounts WHERE role='teacher'").get();assert.notEqual(account.password_hash,password);assert.equal(account.password_hash.length,64);assert.equal(h.sql.prepare('SELECT owner FROM workspace').get().owner,account.id);
 await r('/api/auth',{action:'register',role:'teacher',name:'Second teacher',email:'second@example.com',password,setupCode:'private-test-setup'},{status:409});
 await r('/api/auth',{action:'login',role:'teacher',email:'teacher@example.com',password:'incorrect-password'},{status:401});
 await r('/api/auth',{action:'login',role:'student',email:'teacher@example.com',password},{status:403});
 await r('/api/attendance',{action:'student',name:'Harshit',roll:'R1',email:'harshit@example.com'},{cookie:teacher.cookie});
 const student=h.sql.prepare('SELECT * FROM students').get();
 const invite=(await r('/api/attendance',{action:'studentInvite',studentId:student.id},{cookie:teacher.cookie})).value;
 const token=new URL(invite.inviteUrl).searchParams.get('invite');assert(token);
 await r('/api/auth',{action:'register',role:'student',name:'Other',email:'other@example.com',password,invite:token},{status:403});
 const signed=await r('/api/auth',{action:'register',role:'student',name:'Harshit',email:'harshit@example.com',password,invite:token});assert.equal(signed.value.redirect,'/student');
 await r('/api/auth',{action:'register',role:'student',name:'Harshit',email:'harshit@example.com',password,invite:token},{status:403});
 const mine=await r('/api/attendance?portal=student',null,{cookie:signed.cookie});assert.equal(mine.value.students.length,1);assert.equal(mine.value.user.teacher,false);
 await r('/api/attendance',{action:'studentInvite',studentId:student.id},{cookie:signed.cookie,status:403});
 await r('/api/attendance',{action:'student',name:'Illegal',roll:'R2',email:'illegal@example.com'},{cookie:signed.cookie,status:403});
 const reset=(await r('/api/attendance',{action:'studentInvite',studentId:student.id},{cookie:teacher.cookie})).value;
 const resetToken=new URL(reset.inviteUrl).searchParams.get('invite');
 await r('/api/auth',{action:'register',role:'student',name:'Harshit',email:'harshit@example.com',password:'new-password-for-student',invite:resetToken});
 await r('/api/attendance',null,{cookie:signed.cookie,status:401});
 await r('/api/auth',{action:'logout'},{cookie:teacher.cookie});await r('/api/attendance',null,{cookie:teacher.cookie,status:401});
 await r('/api/auth',{action:'login',role:'teacher',email:'teacher@example.com',password},{origin:'https://evil.test',status:403});
 h.close();
});

test('approval QR requires student login and submits approval instead of immediate presence',async()=>{
 const h=harness(),r=h.request,teacher=await h.teacher();
 await r('/api/attendance',{action:'student',name:'Harshit',roll:'R1',email:'harshit@example.com'},{cookie:teacher.cookie});
 const session=(await r('/api/attendance',{action:'session',subject:'COA',room:'B204',duration:180,mode:'qr',auth:'approval',requireIp:false},{cookie:teacher.cookie})).value;
 const anon=await r('/api/checkin?session='+session.token,null,{cookie:'',status:401});assert(anon.value.loginRequired);assert(new URL(anon.value.loginUrl,'https://test.site').searchParams.get('returnTo').includes(session.token));
 await r('/api/checkin',{session:session.token,name:'Harshit',roll:'R1'},{cookie:'',status:401});
 await r('/api/checkin',{session:session.token},{cookie:teacher.cookie,status:403});
 const student=h.sql.prepare('SELECT id FROM students').get();const invite=(await r('/api/attendance',{action:'studentInvite',studentId:student.id},{cookie:teacher.cookie})).value;
 const signed=await r('/api/auth',{action:'register',role:'student',name:'Harshit',email:'harshit@example.com',password,invite:new URL(invite.inviteUrl).searchParams.get('invite')});
 const result=await r('/api/checkin',{session:session.token,name:'Someone else',roll:'wrong'},{cookie:signed.cookie});assert(result.value.pending);
 assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM attendance').get().n,0);assert.equal(h.sql.prepare('SELECT roll FROM attendance_requests').get().roll,'R1');
 h.close();
});

test('invalid session cookies, expired sessions and auth rate limits fail closed',async()=>{
 const h=harness(),r=h.request,teacher=await h.teacher();
 await r('/api/attendance',null,{cookie:'classsync_session=forged',status:401});
 h.sql.prepare('UPDATE account_sessions SET expires=0').run();await r('/api/attendance',null,{cookie:teacher.cookie,status:401});
 for(let i=0;i<12;i++)await r('/api/auth',{action:'login',role:'teacher',email:'missing@example.com',password},{status:401});
 await r('/api/auth',{action:'login',role:'teacher',email:'missing@example.com',password},{status:429});
 h.close();
});

test('public portal markup has password forms and sign-out controls with no platform login links',()=>{
 for(const role of ['student','teacher']){
  const login=fs.readFileSync(new URL('../public/'+role+'-login.html',import.meta.url),'utf8');assert.match(login,/id="accountForm"/);assert.match(login,/type="password"/);assert.doesNotMatch(login,/signin-with-chatgpt|Continue with ChatGPT/);
  const portal=fs.readFileSync(new URL('../public/'+role+'.html',import.meta.url),'utf8');assert.match(portal,/data-signout/);assert.match(portal,/data-switch-portal/);assert.doesNotMatch(portal,/signout-with-chatgpt|signin-with-chatgpt/);
 }
});
