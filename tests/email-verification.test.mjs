import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalApplication} from '../serve-local.mjs';

function fixture(enabled=true){
 const keys=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_OTP_ENABLED','CLASS_SYNC_TEACHER_EMAILS'],previous=keys.map(key=>process.env[key]),originalFetch=globalThis.fetch;
 process.env.SUPABASE_URL='https://project.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='test-public-key';process.env.SUPABASE_OTP_ENABLED=String(enabled);process.env.CLASS_SYNC_TEACHER_EMAILS='teacher@example.com,second@example.com';
 const app=createLocalApplication({databasePath:':memory:'}),codes=new Map();let sent=0,identityOverride=null;
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
  const response=await app.dispatch(new Request('https://classsync.test/api/auth',{method:body?'POST':'GET',headers:{Origin:origin,Cookie:cookie,'cf-connecting-ip':'1.2.3.4'},...(body?{body:JSON.stringify(body)}:{})}));
  return {status:response.status,value:await response.json(),cookie:response.headers.get('set-cookie')};
 }
 return {...app,call,codes,get sent(){return sent;},setIdentity(email){identityOverride=email;},close(){app.close();globalThis.fetch=originalFetch;keys.forEach((key,i)=>previous[i]===undefined?delete process.env[key]:process.env[key]=previous[i]);}};
}

test('OTP alone signs in an authorized teacher and roster student; passwords and setup codes are not required',async()=>{
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
  assert.equal((await h.call({action:'sendEmailCode',role:'teacher',email:'second@example.com'})).status,403,'a second email cannot claim the existing classroom');
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
  for(const role of ['student','teacher'])assert.equal((await h.call({action:'sendEmailCode',role,email:'stranger@example.com'})).status,403);
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
  assert.equal((await h.call({action:'verifyEmailCode',role:'student',email:'student@example.com',code:'123456'})).status,403);
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
