import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../public/account-login.js',import.meta.url),'utf8');
async function page({ready=true,role='student',teacherSetupAvailable=false,href='https://classsync.test/student-login'}={}){
 const elements=new Map();
 const node=id=>elements.get(id)||elements.set(id,{value:'',hidden:id==='emailCodeForm',disabled:id==='sendEmailCode',textContent:'',focus(){},setAttribute(){},reportValidity(){return true;},reset(){if(id==='emailCodeForm')node('emailCode').value='';}}).get(id);
 const requests=[],redirects=[];let failVerify=false,needTeacherCode=false;
 const context={document:{body:{dataset:{role}},getElementById:node},location:{href,origin:'https://classsync.test',pathname:'/student-login',assign:value=>redirects.push(value)},history:{replaceState(){}},URL,AbortSignal,Date,Math,Number,Error,setInterval(){return 1;},clearInterval(){},window:{addEventListener(){}},fetch:async(url,options={})=>{
  if(options.method!=='POST')return Response.json({emailOtpEnabled:ready,teacherSetupAvailable});
  const body=JSON.parse(options.body);requests.push(body);if(needTeacherCode&&body.action==='sendEmailCode'&&!body.setupCode)return Response.json({error:'Enter teacher registration code',needsTeacherCode:true},{status:403});
  return failVerify&&body.action==='verifyEmailCode'?Response.json({error:'Code expired'},{status:400}):Response.json({ok:true,resendAfter:60});
 }};
 vm.runInNewContext(source,context);await new Promise(setImmediate);
 return {node,requests,redirects,requireTeacherCode(){needTeacherCode=true;},failVerification(){failVerify=true;},async send(){node('accountForm').onsubmit({preventDefault(){}});await new Promise(setImmediate);},async verify(){await node('emailCodeForm').onsubmit({preventDefault(){}});}};
}
test('email-only form binds verification to the sent email, prevents immediate resend, and preserves safe attendance return paths',async()=>{
 const p=await page({href:'https://classsync.test/student-login?returnTo=%2Fstudent%3Fsession%3Dclass-token'});
 assert.equal(p.node('sendEmailCode').disabled,false);
 p.node('email').value=' Student@Example.com ';await p.send();
 assert.deepEqual(p.requests,[{action:'sendEmailCode',email:'student@example.com',role:'student',mode:'signin'}]);
 assert.equal(p.node('accountForm').hidden,true);assert.equal(p.node('emailCodeForm').hidden,false);
 p.node('resendEmailCode').onclick();assert.equal(p.requests.length,1);
 p.node('email').value='different@example.com';p.node('emailCode').value='123456';await p.verify();
 assert.deepEqual(p.requests[1],{action:'verifyEmailCode',email:'student@example.com',role:'student',code:'123456',mode:'signin'});
 assert.deepEqual(p.redirects,['/student?session=class-token']);
});
test('failed verification stays on the code form and changing email clears the pending code',async()=>{
 const p=await page({href:'https://classsync.test/student-login?returnTo=https%3A%2F%2Fevil.test'});
 p.node('email').value='student@example.com';await p.send();p.failVerification();p.node('emailCode').value='000000';await p.verify();
 assert.equal(p.node('accountStatus').textContent,'Code expired');assert.deepEqual(p.redirects,[]);
 p.node('changeEmail').onclick();assert.equal(p.node('emailCodeForm').hidden,true);assert.equal(p.node('emailCode').value,'');
 p.node('emailCode').value='123456';await p.verify();assert.equal(p.requests.length,2,'changing email invalidates the pending client challenge');
});
test('email delivery configuration must be ready before the send button is enabled',async()=>{
 const p=await page({ready:false});assert.equal(p.node('sendEmailCode').disabled,true);assert.match(p.node('accountStatus').textContent,/temporarily unavailable/);
});

test('teacher registration code appears only during first setup and is retained through OTP verification',async()=>{
 const first=await page({role:'teacher',teacherSetupAvailable:true});
 assert.equal(first.node('teacherRegistration').hidden,false);assert.equal(first.node('teacherCode').required,true);
 first.node('email').value='teacher@example.com';first.node('teacherCode').value='test-code';await first.send();
 first.node('emailCode').value='123456';await first.verify();
 assert.equal(first.requests[0].setupCode,'test-code');assert.equal(first.requests[1].setupCode,'test-code');
 const returning=await page({role:'teacher'});assert.equal(returning.node('teacherRegistration').hidden,true);assert.equal(returning.node('teacherCode').required,false);
});

test('new teachers are prompted for code after email; existing teachers proceed without it',async()=>{
 const p=await page({role:'teacher'});p.requireTeacherCode();p.node('email').value='new@teacher.test';await p.send();
 assert.equal(p.node('teacherRegistration').hidden,false);assert.equal(p.node('teacherCode').required,true);assert.equal(p.node('emailCodeForm').hidden,true);
 p.node('teacherCode').value='registration-code';await p.send();assert.equal(p.requests[1].setupCode,'registration-code');assert.equal(p.node('emailCodeForm').hidden,false);
 p.node('changeEmail').onclick();assert.equal(p.node('teacherCode').required,false);assert.equal(p.node('teacherCode').value,'');
});

test('create account collects student profile and preserves it until OTP verification',async()=>{const p=await page();p.node('chooseCreate').onclick();p.node('studentName').value='Student';p.node('studentRoll').value='USN7';p.node('email').value='new@student.test';await p.send();p.node('studentRoll').value='changed';p.node('emailCode').value='123456';await p.verify();assert.equal(p.requests[1].mode,'create');assert.equal(p.requests[1].roll,'USN7');assert.equal(p.requests[1].name,'Student');});
