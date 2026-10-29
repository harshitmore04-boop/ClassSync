import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLocalApplication} from '../serve-local.mjs';
import {seedSession} from './account-fixture.mjs';
function harness(){
 const app=createLocalApplication({databasePath:':memory:'});
 async function request(url,body,{cookie='',status=200,ip='1.2.3.4',origin='https://class.test'}={}){
  const req=new Request('https://class.test'+url,{method:body?'POST':'GET',headers:{Origin:origin,'Content-Type':'application/json','cf-connecting-ip':ip,...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const response=await app.dispatch(req),value=await response.json();assert.equal(response.status,status,JSON.stringify(value));return {value,cookie:response.headers.get('set-cookie')?.split(';')[0]||'',headers:response.headers};
 }
 return {...app,request};
}
test('approval QR requires student login and submits approval instead of immediate presence',async()=>{
 const h=harness(),r=h.request,teacher=seedSession(h,{role:'teacher',email:'teacher@example.com'});
 try{
  await r('/api/attendance',{action:'student',name:'Harshit',roll:'R1',email:'harshit@example.com'},{cookie:teacher});
  const session=(await r('/api/attendance',{action:'session',subject:'COA',room:'B204',duration:180,mode:'qr',auth:'approval',requireIp:false},{cookie:teacher})).value;
  const anon=await r('/api/checkin?session='+session.token,null,{status:401});assert(anon.value.loginRequired);assert(new URL(anon.value.loginUrl,'https://test.site').searchParams.get('returnTo').includes(session.token));
  await r('/api/checkin',{session:session.token,name:'Harshit',roll:'R1'},{status:401});
  await r('/api/checkin',{session:session.token},{cookie:teacher,status:403});
  const student=seedSession(h,{role:'student',email:'harshit@example.com'});
  const result=await r('/api/checkin',{session:session.token,name:'Someone else',roll:'wrong'},{cookie:student});assert(result.value.pending);
  assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM attendance').get().n,0);assert.equal(h.sql.prepare('SELECT roll FROM attendance_requests').get().roll,'R1');
 }finally{h.close();}
});
test('invalid and expired session cookies cannot access classroom data',async()=>{
 const h=harness();try{
  await h.request('/api/attendance',null,{cookie:'classsync_session=forged',status:401});
  const cookie=seedSession(h,{role:'teacher',email:'teacher@example.com'});
  h.sql.prepare('UPDATE account_sessions SET expires=0').run();await h.request('/api/attendance',null,{cookie,status:401});
 }finally{h.close();}
});
test('sign-in pages use email and OTP, with a separate first-teacher registration code',()=>{
 for(const role of ['student','teacher']){
  const login=fs.readFileSync(new URL('../public/'+role+'-login.html',import.meta.url),'utf8');
  assert.match(login,/id="accountForm"/);assert.match(login,/type="email"/);assert.match(login,/autocomplete="one-time-code"/);assert.doesNotMatch(login,/id="password"|name="password"|id="setupCode"|id="invite"|id="toggleAccount"|signin-with-chatgpt/);
  if(role==='student')assert.doesNotMatch(login,/type="password"|id="teacherCode"/);
  else assert.match(login,/id="teacherRegistration" hidden/);
  const portal=fs.readFileSync(new URL('../public/'+role+'.html',import.meta.url),'utf8');assert.match(portal,/data-signout/);assert.match(portal,/data-switch-portal/);
 }
});
