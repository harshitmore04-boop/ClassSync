import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalApplication} from '../serve-local.mjs';

function fixture(enabled=true){
 const keys=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_OTP_ENABLED','CLASS_SYNC_TEACHER_EMAILS'],previous=keys.map(key=>process.env[key]),originalFetch=globalThis.fetch;
 process.env.SUPABASE_URL='https://project.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='test-public-key';process.env.SUPABASE_OTP_ENABLED=String(enabled);process.env.CLASS_SYNC_TEACHER_EMAILS='teacher@example.com,second@example.com';
 const app=createLocalApplication({databasePath:':memory:',setupCode:'test-registration-code'}),codes=new Map();let sent=0,identityOverride=null;
 globalThis.fetch=async(url,options)=>{
  const path=new URL(url).pathname,body=JSON.parse(options.body||'{}');
  if(path.endsWith('/otp')){sent++;codes.set(body.email,'123456');return Response.json({});}
  if(path.endsWith('/verify')){
   if(codes.get(body.email)!==body.token)return Response.json({error:'invalid code'},{status:403});
   codes.delete(body.email);
   return Response.json({access_token:'verified-provider-token',user:{email:identityOverride||body.email,email_confirmed_at:new Date().toISOString(),user_metadata:{role:'teacher'}}});
  }
  throw Error('Unexpected provider endpoint');
 };
 async function call(body,{cookie='',origin='https://classsync.test'}={}){
  const response=await app.dispatch(new Request('https://classsync.test/api/auth',{method:body?'POST':'GET',headers:{Origin:origin,Cookie:cookie,'cf-connecting-ip':'1.2.3.4'},...(body?{body:JSON.stringify(body.role==='teacher'&&!Object.hasOwn(body,'setupCode')?{...body,setupCode:'test-registration-code'}:body)}:{})}));
  return {status:response.status,value:await response.json(),cookie:response.headers.get('set-cookie')};
 }
 return {...app,call,codes,get sent(){return sent;},setIdentity(email){identityOverride=email;},close(){app.close();globalThis.fetch=originalFetch;keys.forEach((key,i)=>previous[i]===undefined?delete process.env[key]:process.env[key]=previous[i]);}};
}

test('First teacher registers with a code; returning teachers and roster students use OTP only',async()=>{
 const h=fixture();try{
  assert.equal((await h.call()).value.emailOtpEnabled,true);
  assert.equal((await h.call({action:'register',role:'teacher',email:'teacher@example.com',password:'legacy-password',setupCode:'unused'})).status,400);
  assert.equal((await h.call({action:'login',email:'teacher@example.com',password:'legacy-password'})).status,400);
  assert.equal((await h.call({action:'sendEmailCode',role:'teacher',email:' Teacher@Example.com '})).status,200);
  assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM accounts').get().n,0,'requesting a code does not create an account');
  const teacher=await h.call({action:'verifyEmailCode',role:'teacher',email:'teacher@example.com',code:'123456'});
  assert.equal(teacher.status,200);assert.equal(teacher.value.redirect,'/teacher');assert.match(teacher.cookie,/HttpOnly/);assert.match(teacher.cookie,/SameSite=Lax/);assert.match(teacher.cookie,/Secure/);
  const account=h.sql.prepare("SELECT * FROM accounts WHERE role='teacher'").get();assert.equal(h.sql.prepare('SELECT owner FROM workspace').get().owner,account.id);
  assert.equal((await h.call({action:'verifyEmailCode',role:'teacher',email:'teacher@example.com',code:'123456'})).status,400,'used codes cannot be replayed');
  assert.equal((await h.call({action:'sendEmailCode',role:'teacher',email:'second@example.com',setupCode:''})).status,403,'new teachers require the registration code');
  h.sql.prepare('INSERT INTO students (id,name,roll,email,created_at) VALUES (?,?,?,?,?)').run('s1','Student One','R1','student@example.com',Date.now());
  assert.equal((await h.call({action:'sendEmailCode',role:'student',email:'student@example.com'})).status,200);
  const student=await h.call({action:'verifyEmailCode',role:'student',email:'student@example.com',code:'123456'});
  assert.equal(student.status,200);assert.equal(student.value.role,'student','provider user metadata cannot grant teacher privileges');
  assert.equal(h.sql.prepare('SELECT name FROM accounts WHERE email=?').get('student@example.com').name,'Student One');
  assert.equal((await h.call(null,{cookie:student.cookie})).value.user.role,'student');
  assert.equal((await h.call({action:'sendEmailCode',role:'teacher',email:'student@example.com'})).status,403);
  assert.equal((await h.call({action:'sendEmailCode',role:'student',email:'teacher@example.com'})).status,403);
  assert.equal((await h.call({action:'logout'},{cookie:student.cookie})).status,200);
  assert.equal((await h.call(null,{cookie:student.cookie})).value.user,null);
 }finally{h.close();}
});

test('OTP rejects unlisted emails, invalid/expired codes, wrong identities, and enrollment revoked before verification',async()=>{
 const h=fixture();try{
  assert.equal((await h.call({action:'sendEmailCode',role:'teacher',email:'stranger@example.com',setupCode:''})).status,403);
  assert.equal(h.sent,0,'unapproved emails cannot trigger messages');
  assert.equal((await h.call({action:'sendEmailCode',role:'teacher',email:'teacher@example.com'},{origin:'https://evil.test'})).status,403);
  assert.equal((await h.call({action:'sendEmailCode',role:'teacher',email:'teacher@example.com'})).status,200);
  for(const code of ['not-a-code','000000'])assert.equal((await h.call({action:'verifyEmailCode',role:'teacher',email:'teacher@example.com',code})).status,400);
  h.setIdentity('other@example.com');assert.equal((await h.call({action:'verifyEmailCode',role:'teacher',email:'teacher@example.com',code:'123456'})).status,400);
  assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM account_sessions').get().n,0);
  h.setIdentity(null);h.codes.delete('teacher@example.com');
  assert.equal((await h.call({action:'verifyEmailCode',role:'teacher',email:'teacher@example.com',code:'123456'})).status,400);
  h.sql.prepare('INSERT INTO students (id,name,roll,email,created_at) VALUES (?,?,?,?,?)').run('s1','Student','R1','student@example.com',Date.now());
  await h.call({action:'sendEmailCode',role:'student',email:'student@example.com'});h.sql.prepare('DELETE FROM students').run();
  assert.equal((await h.call({action:'verifyEmailCode',role:'student',email:'student@example.com',code:'123456'})).status,200);
 }finally{h.close();}
});

test('provider setup failure and per-email attempt limits fail closed',async()=>{
 const disabled=fixture(false);try{
  assert.equal((await disabled.call()).value.emailOtpEnabled,false);
  assert.equal((await disabled.call({action:'sendEmailCode',role:'teacher',email:'teacher@example.com'})).status,503);
 }finally{disabled.close();}
 const h=fixture();try{
  for(let i=0;i<12;i++)assert.equal((await h.call({action:'verifyEmailCode',role:'teacher',email:'teacher@example.com',code:'000000'})).status,400);
  assert.equal((await h.call({action:'verifyEmailCode',role:'teacher',email:'teacher@example.com',code:'000000'})).status,429);
  assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM account_sessions').get().n,0);
 }finally{h.close();}
});

 test('first teacher code is required at send and verify, then returning login needs no registration code',async()=>{
 const h=fixture();try{
  assert.equal((await h.call()).value.teacherSetupAvailable,false);
  for(const setupCode of ['', 'wrong']){
   assert.equal((await h.call({action:'sendEmailCode',role:'teacher',email:'teacher@example.com',setupCode})).status,403);
  }
  assert.equal(h.sent,0);
  await h.call({action:'sendEmailCode',role:'teacher',email:'teacher@example.com'});
  assert.equal((await h.call({action:'verifyEmailCode',role:'teacher',email:'teacher@example.com',code:'123456',setupCode:''})).status,403);
  assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM accounts').get().n,0);
  assert.equal((await h.call({action:'verifyEmailCode',role:'teacher',email:'teacher@example.com',code:'123456'})).status,200);
  assert.equal((await h.call()).value.teacherSetupAvailable,false);
  assert.equal((await h.call({action:'sendEmailCode',role:'teacher',email:'teacher@example.com',setupCode:''})).status,200);
  assert.equal((await h.call({action:'verifyEmailCode',role:'teacher',email:'teacher@example.com',code:'123456',setupCode:''})).status,200);
 }finally{h.close();}
});

test('any email can register as student or code-authorized teacher, while classroom ownership is preserved',async()=>{const h=fixture();try{
 for(const email of ['one@new-domain.test','two@new-domain.test']){
  assert.equal((await h.call({action:'sendEmailCode',role:'teacher',email,setupCode:''})).status,403);
  assert.equal((await h.call({action:'sendEmailCode',role:'teacher',email})).status,200);
  const result=await h.call({action:'verifyEmailCode',role:'teacher',email,code:'123456'});assert.equal(result.status,200);
  const response=await h.dispatch(new Request('https://classsync.test/api/attendance',{headers:{Cookie:result.cookie}}));assert.equal(response.status,200);
 }
 assert.equal(h.sql.prepare("SELECT COUNT(*) n FROM accounts WHERE role='teacher'").get().n,2);
 const owner=h.sql.prepare('SELECT owner FROM workspace').get().owner;assert.equal(h.sql.prepare('SELECT email FROM accounts WHERE id=?').get(owner).email,'one@new-domain.test');
 await h.call({action:'sendEmailCode',role:'student',email:'any@student.test'});assert.equal((await h.call({action:'verifyEmailCode',role:'student',email:'any@student.test',code:'123456'})).status,200);
 assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM students').get().n,0,'registration does not enroll a student or grant attendance');
}finally{h.close();}});

test('student account creation links verified email to real QR attendance and face enrollment',async()=>{const h=fixture();try{
 const email='self@student.test',details={role:'student',email,mode:'create',name:'Real Student',roll:'USN123'};
 assert.equal((await h.call({action:'sendEmailCode',role:'student',email,mode:'signin'})).status,404);
 assert.equal((await h.call({action:'sendEmailCode',...details})).status,200);
 const student=await h.call({action:'verifyEmailCode',...details,code:'123456'});assert.equal(student.status,200);assert.equal(h.sql.prepare('SELECT roll FROM students WHERE email=?').get(email).roll,'USN123');
 await h.call({action:'sendEmailCode',role:'teacher',email:'teacher@any.test'});const teacher=await h.call({action:'verifyEmailCode',role:'teacher',email:'teacher@any.test',code:'123456'});
 async function api(path,body,cookie){const r=await h.dispatch(new Request('https://classsync.test'+path,{method:body?'POST':'GET',headers:{Origin:'https://classsync.test',Cookie:cookie,'cf-connecting-ip':'1.2.3.4'},...(body?{body:JSON.stringify(body)}:{})}));const value=await r.json();assert.equal(r.status,200,JSON.stringify(value));return value;}
 const session=await api('/api/attendance',{action:'session',subject:'Math',room:'A',duration:300,mode:'qr',auth:'account',requireIp:false},teacher.cookie);
 const marked=await api('/api/attendance',{action:'checkin',token:session.token},student.cookie);assert.equal(marked.roll,'USN123');
 const link=await api('/api/face-enrollment',{action:'create'},teacher.cookie);const enrollment=await api('/api/face-enrollment?enrollment='+link.token,null,student.cookie);assert.equal(enrollment.scope,'live');assert.equal(enrollment.student.roll,'USN123');
 assert.equal(h.sql.prepare('SELECT descriptors FROM students WHERE email=?').get(email).descriptors,null,'face matching still requires guided enrollment and teacher approval');
}finally{h.close();}});
