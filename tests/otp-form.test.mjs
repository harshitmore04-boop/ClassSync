import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../public/account-login.js',import.meta.url),'utf8');
async function page({role='student',legacy=false,href='https://classsync.test/student-login'}={}){
 const elements=new Map();
 const node=id=>elements.get(id)||elements.set(id,{value:'',hidden:id==='legacyPassword'||id==='confirmPasswordGroup'||id==='teacherRegistration'||id==='studentRegistration',disabled:false,textContent:'',focus(){},setAttribute(key,value){this[key]=value;},reportValidity(){return true;}}).get(id);
 const requests=[],redirects=[];let fail=false;
 const context={document:{body:{dataset:{role}},getElementById:node},location:{href,origin:'https://classsync.test',pathname:'/student-login',assign:value=>redirects.push(value)},history:{replaceState(){}},URL,AbortSignal,Error,window:{addEventListener(){}},fetch:async(url,options={})=>{
  if(options.method!=='POST')return Response.json({authMethod:'password',user:legacy?{role,email:'old@account.test'}:null,passwordSetupRequired:legacy});
  const body=JSON.parse(options.body);requests.push(body);
  return fail?Response.json({error:'Incorrect email or password.'},{status:401}):Response.json({ok:true});
 }};
 vm.runInNewContext(source,context);await new Promise(setImmediate);
 return {node,requests,redirects,fail(){fail=true;},async send(){await node('accountForm').onsubmit({preventDefault(){}});}};
}
test('student password sign-in preserves safe attendance return path',async()=>{
 const p=await page({href:'https://classsync.test/student-login?returnTo=%2Fstudent%3Fsession%3Dclass-token'});
 p.node('email').value=' Student@Example.com ';p.node('password').value='password123';await p.send();
 assert.deepEqual(p.requests,[{action:'signin',email:'student@example.com',password:'password123',role:'student'}]);
 assert.deepEqual(p.redirects,['/student?session=class-token']);
});
test('creation collects student details and confirms matching password',async()=>{
 const p=await page();p.node('chooseCreate').onclick();
 assert.equal(p.node('confirmPasswordGroup').hidden,false);
 p.node('studentName').value='Student';p.node('studentRoll').value='USN7';p.node('email').value='new@student.test';p.node('password').value='password123';p.node('confirmPassword').value='different';await p.send();
 assert.equal(p.requests.length,0);assert.match(p.node('accountStatus').textContent,/do not match/);
 p.node('confirmPassword').value='password123';await p.send();
 assert.equal(p.requests[0].action,'create');assert.equal(p.requests[0].roll,'USN7');assert.equal(p.requests[0].name,'Student');
});
test('new teachers provide registration code; returning teachers use only password',async()=>{
 const p=await page({role:'teacher'});p.node('chooseCreate').onclick();
 assert.equal(p.node('teacherRegistration').hidden,false);assert.equal(p.node('teacherCode').required,true);
 p.node('email').value='teacher@example.com';p.node('password').value='password123';p.node('confirmPassword').value='password123';p.node('teacherCode').value='JIAN23';await p.send();
 assert.equal(p.requests[0].setupCode,'JIAN23');
 const returning=await page({role:'teacher'});assert.equal(returning.node('teacherRegistration').hidden,true);
});
test('signed-in legacy user can set a password for the same account',async()=>{
 const p=await page({legacy:true});assert.equal(p.node('legacyPassword').hidden,false);
 p.node('setPassword').onclick();p.node('password').value='password123';p.node('confirmPassword').value='password123';await p.send();
 assert.deepEqual(p.requests,[{action:'setPassword',password:'password123'}]);
});
test('failed login stays on form and rejects cross-origin return path',async()=>{
 const p=await page({href:'https://classsync.test/student-login?returnTo=https%3A%2F%2Fevil.test'});p.fail();p.node('email').value='student@example.com';p.node('password').value='password123';await p.send();
 assert.equal(p.node('accountStatus').textContent,'Incorrect email or password.');assert.deepEqual(p.redirects,[]);
});
