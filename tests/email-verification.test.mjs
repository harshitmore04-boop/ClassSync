import test from 'node:test';import assert from 'node:assert/strict';import {createLocalApplication} from '../serve-local.mjs';
test('email codes verify provider identity without granting user-selected roles or bypassing teacher/student enrollment',async()=>{
 const keys=['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY','SUPABASE_OTP_ENABLED'],old=keys.map(k=>process.env[k]),original=globalThis.fetch;
 process.env.SUPABASE_URL='https://project.supabase.co';process.env.SUPABASE_PUBLISHABLE_KEY='test-public-key';process.env.SUPABASE_OTP_ENABLED='true';
 const app=createLocalApplication({databasePath:':memory:',setupCode:'teacher-setup'});let sent=0,verifiedEmail='teacher@example.com';
 globalThis.fetch=async(url,options)=>{
  const path=new URL(url).pathname;
  if(path.endsWith('/otp')){sent++;return Response.json({});}
  if(path.endsWith('/verify')){const b=JSON.parse(options.body);if(b.token!=='123456')return Response.json({error:'invalid code'},{status:403});return Response.json({access_token:'verified-proof',user:{email:verifiedEmail,email_confirmed_at:new Date().toISOString(),user_metadata:{role:'teacher'}}});}
  if(path.endsWith('/user'))return options.headers.Authorization==='Bearer verified-proof'?Response.json({email:verifiedEmail,email_confirmed_at:new Date().toISOString()}):Response.json({error:'invalid'},{status:401});
  throw Error('Unexpected provider endpoint');
 };
 async function call(body,cookie=''){const r=await app.dispatch(new Request('https://classsync.test/api/auth',{method:'POST',headers:{Origin:'https://classsync.test',Cookie:cookie},body:JSON.stringify(body)}));return {status:r.status,value:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 const registration={action:'register',role:'teacher',email:'teacher@example.com',password:'long-secure-password',name:'Teacher',setupCode:'teacher-setup'};
 try{
  assert.equal((await call(registration)).status,403,'registration requires a verified email');
  const denied=await call({action:'sendEmailCode',registering:true,role:'teacher',email:'teacher@example.com',setupCode:'wrong'});assert.equal(denied.status,403);assert.equal(sent,0);
  assert.equal((await call({action:'sendEmailCode',registering:true,role:'teacher',email:'teacher@example.com',setupCode:'teacher-setup'})).status,200);assert.equal(sent,1);
  const verified=await call({action:'verifyEmailCode',registering:true,role:'teacher',email:'teacher@example.com',code:'123456'});assert.equal(verified.value.emailProof,'verified-proof');assert.equal(verified.cookie,undefined,'verification alone cannot grant a classroom session');
  const created=await call({...registration,emailProof:verified.value.emailProof});assert.equal(created.status,200);assert.match(created.cookie,/classsync_session=/);
  assert.equal((await call({action:'sendEmailCode',role:'student',email:'teacher@example.com'})).status,403);
  assert.equal((await call({action:'verifyEmailCode',role:'student',email:'teacher@example.com',code:'123456'})).status,403);
  assert.equal((await call({action:'verifyEmailCode',role:'teacher',email:'teacher@example.com',code:'000000'})).status,400);
  verifiedEmail='attacker@example.com';assert.equal((await call({action:'verifyEmailCode',role:'teacher',email:'teacher@example.com',code:'123456'})).status,400);
  verifiedEmail='teacher@example.com';const login=await call({action:'verifyEmailCode',role:'teacher',email:'teacher@example.com',code:'123456'});assert.equal(login.status,200);assert.match(login.cookie,/HttpOnly|classsync_session=/);
  assert.equal((await call({action:'sendEmailCode',registering:true,role:'student',email:'new@example.com',invite:'forged'})).status,403);
 }finally{app.close();globalThis.fetch=original;keys.forEach((k,i)=>old[i]===undefined?delete process.env[k]:process.env[k]=old[i]);}
});
