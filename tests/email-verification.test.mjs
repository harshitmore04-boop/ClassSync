import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalApplication} from '../serve-local.mjs';

function fixture(){
 const app=createLocalApplication({databasePath:':memory:',setupCode:'test-registration-code'});
 async function call(body,{cookie='',origin='https://classsync.test',ip='1.2.3.4'}={}){
  const response=await app.dispatch(new Request('https://classsync.test/api/auth',{method:body?'POST':'GET',headers:{Origin:origin,Cookie:cookie,'cf-connecting-ip':ip},...(body?{body:JSON.stringify(body)}:{})}));
  return {status:response.status,value:await response.json(),cookie:response.headers.get('set-cookie')};
 }
 const teacher=(email,password='password123')=>({action:'create',role:'teacher',email,password,setupCode:'test-registration-code'});
 const student=(email,password='password123',roll='USN123')=>({action:'create',role:'student',email,password,name:'Real Student',roll});
 return {...app,call,teacher,student};
}

test('password signup and login preserve roles, sessions, and teacher registration code',async()=>{
 const h=fixture();try{
  assert.equal((await h.call()).value.authMethod,'password');
  assert.equal((await h.call({...h.teacher('teacher@example.com'),setupCode:''})).status,403);
  assert.equal((await h.call({...h.teacher('teacher@example.com'),setupCode:'wrong'})).status,403);
  assert.equal((await h.call({...h.teacher('teacher@example.com'),password:'short'})).status,400);
  assert.equal((await h.call({action:'sendEmailCode',email:'teacher@example.com',role:'teacher'})).status,400);
  const teacher=await h.call(h.teacher('teacher@example.com'));
  assert.equal(teacher.status,200);assert.equal(teacher.value.redirect,'/teacher');assert.match(teacher.cookie,/HttpOnly/);assert.match(teacher.cookie,/SameSite=Lax/);assert.match(teacher.cookie,/Secure/);
  const record=h.sql.prepare('SELECT * FROM accounts WHERE email=?').get('teacher@example.com');
  assert.notEqual(record.password_hash,'password123');assert.equal(record.iterations,210000);
  assert.equal(h.sql.prepare('SELECT owner FROM workspace').get().owner,record.id);
  assert.equal((await h.call({action:'create',role:'teacher',email:'teacher@example.com',password:'password123',setupCode:'test-registration-code'})).status,409);
  assert.equal((await h.call({action:'signin',role:'teacher',email:'teacher@example.com',password:'wrongpass'})).status,401);
  const login=await h.call({action:'signin',role:'teacher',email:'TEACHER@EXAMPLE.COM',password:'password123'});assert.equal(login.status,200);
  assert.equal((await h.call(null,{cookie:login.cookie})).value.user.role,'teacher');
  assert.equal((await h.call({action:'signin',role:'student',email:'teacher@example.com',password:'password123'})).status,403);
  assert.equal((await h.call({action:'logout'},{cookie:login.cookie})).status,200);
  assert.equal((await h.call(null,{cookie:login.cookie})).value.user,null);
 }finally{h.close();}
});

test('any email can register a student for real QR attendance and face enrollment',async()=>{
 const h=fixture();try{
  const email='self@student.test',details=h.student(email);
  assert.equal((await h.call({action:'signin',role:'student',email,password:'password123'})).status,404);
  const student=await h.call(details);assert.equal(student.status,200);
  assert.equal(h.sql.prepare('SELECT roll FROM students WHERE email=?').get(email).roll,'USN123');
  const teacher=await h.call(h.teacher('teacher@any.test'));
  async function api(path,body,cookie){const r=await h.dispatch(new Request('https://classsync.test'+path,{method:body?'POST':'GET',headers:{Origin:'https://classsync.test',Cookie:cookie,'cf-connecting-ip':'1.2.3.4'},...(body?{body:JSON.stringify(body)}:{})}));const value=await r.json();assert.equal(r.status,200,JSON.stringify(value));return value;}
  const session=await api('/api/attendance',{action:'session',subject:'Math',room:'A',duration:300,mode:'qr',auth:'account',requireIp:false},teacher.cookie);
  const marked=await api('/api/attendance',{action:'checkin',token:session.token},student.cookie);assert.equal(marked.roll,'USN123');
  const link=await api('/api/face-enrollment',{action:'create'},teacher.cookie);const enrollment=await api('/api/face-enrollment?enrollment='+link.token,null,student.cookie);assert.equal(enrollment.scope,'live');
  assert.equal(h.sql.prepare('SELECT descriptors FROM students WHERE email=?').get(email).descriptors,null);
 }finally{h.close();}
});

test('existing OTP account can set password only with a valid session',async()=>{
 const h=fixture();try{
  const email='old@student.test',id='old-account';
  h.sql.prepare('INSERT INTO accounts (id,email,name,role,password_hash,salt,iterations,created) VALUES (?,?,?,?,?,?,?,?)').run(id,email,'Old Student','student','a'.repeat(64),'b'.repeat(64),100000,Date.now());
  assert.equal((await h.call({action:'signin',role:'student',email,password:'password123'})).status,409);
  assert.equal((await h.call({action:'setPassword',password:'password123'})).status,401);
  const {seedSession}=await import('./account-fixture.mjs');const cookie=seedSession(h,{role:'teacher',email:'other@teacher.test'});
  // A session for another account cannot change the legacy student's credentials.
  assert.equal((await h.call({action:'setPassword',password:'password123'},{cookie})).status,409);
  const token='c'.repeat(64);const {createHash}=await import('node:crypto');
  h.sql.prepare('INSERT INTO account_sessions (token_hash,account_id,expires) VALUES (?,?,?)').run(createHash('sha256').update(token).digest('hex'),id,Date.now()+60000);
  const oldCookie='classsync_session='+token;
  assert.equal((await h.call(null,{cookie:oldCookie})).value.passwordSetupRequired,true);
  assert.equal((await h.call({action:'setPassword',password:'password123'},{cookie:oldCookie})).status,200);
  assert.equal((await h.call(null,{cookie:oldCookie})).value.passwordSetupRequired,false);
  assert.equal((await h.call({action:'signin',role:'student',email,password:'password123'})).status,200);
 }finally{h.close();}
});

test('same-origin and attempt limits still apply without an email provider',async()=>{
 const h=fixture();try{
  assert.equal((await h.call(h.teacher('teacher@example.com'),{origin:'https://evil.test'})).status,403);
  for(let i=0;i<12;i++)assert.equal((await h.call({action:'signin',role:'teacher',email:'nobody@test.example',password:'password123'})).status,404);
  assert.equal((await h.call({action:'signin',role:'teacher',email:'nobody@test.example',password:'password123'})).status,429);
 }finally{h.close();}
});
