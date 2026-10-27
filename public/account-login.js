(() => {
 const role=document.body.dataset.role,form=document.getElementById('accountForm'),status=document.getElementById('accountStatus');
 let registering=false,otpEnabled=false,pendingAccount=null,resendAt=0;
 const codeForm=document.getElementById("emailCodeForm"),codeButton=document.getElementById("emailCodeLogin"),toggle=document.getElementById("toggleAccount");
 const query=new URL(location.href).searchParams;
 let returnTo=role==='student'?'/student':'/teacher';
 if(role==='student'&&query.has('returnTo')){try{const target=new URL(query.get('returnTo'),location.origin);if(target.origin===location.origin&&['/student','/student.html','/face-enroll.html'].includes(target.pathname))returnTo=target.pathname+target.search;}catch{}}
 const continueLink=document.querySelector('.continue[href]');if(continueLink)continueLink.href=returnTo;
 const demoLink=document.querySelector('.demo-action');
 if(role==='student'&&returnTo.includes('session=')){
  const target=new URL(returnTo,location.origin);status.textContent='Sign in to continue attendance for the scanned class. The teacher’s selected method determines whether confirmation or approval is required.';
  if(target.searchParams.get('demo')==='1'){demoLink.href=returnTo;demoLink.textContent='Continue as demo student →';}
  else{demoLink.hidden=true;const note=document.querySelector('.demo-note');if(note)note.textContent='Use your real student account for this attendance request. Ask the teacher for an activation link if needed.';}
 }

 if(role==='student'&&returnTo.startsWith('/face-enroll.html?')){status.textContent='Sign in to enroll your own face for teacher approval.';demoLink.hidden=true;document.querySelector('.demo-note').textContent='Use the student account registered by your teacher.';}
 if(query.has('invite')){document.getElementById('invite').value=query.get('invite');document.getElementById('email').value=query.get('email')||'';history.replaceState({},'',location.pathname);registering=true;}
 asyncfunction isValidDomain(e){return e.endsWith('@jainuniversity.ac.in')||e.endsWith('@jgi.ac.in');}
 function request(body){
  const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  let value;try{value=await response.json()}catch{throw Error('Account service is unavailable. Please retry.');}
  if(!response.ok)throw Error(value.error||'Unable to complete this request.');return value;
 }
 function accountDetails(){return {action:registering?'register':'login',role,email:form.elements.namedItem('email').value.trim().toLowerCase(),password:form.elements.namedItem('password').value,name:form.elements.namedItem('accountName').value,setupCode:form.elements.namedItem('setupCode')?.value,invite:form.elements.namedItem('invite')?.value};}
 function render(){document.getElementById('registrationFields').hidden=!registering;document.getElementById('submitAccount').textContent=registering?(otpEnabled?'Verify email & continue':role==='teacher'?'Create teacher account':'Activate student account'):'Sign in';toggle.textContent=registering?'Already have an account? Sign in':role==='teacher'?'First-time teacher setup':'Have a teacher invitation? Activate account';document.getElementById('password').autocomplete=registering?'new-password':'current-password';codeButton.hidden=!otpEnabled||registering||!!pendingAccount;}
 function cancelCode(){pendingAccount=null;codeForm.hidden=true;codeForm.reset();form.hidden=false;toggle.hidden=false;render();}
 toggle.onclick=()=>{cancelCode();registering=!registering;status.textContent='';render()};render();
 fetch('/api/auth',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(value=>{otpEnabled=!!value?.emailOtpEnabled;render();}).catch(()=>{});
 async function sendCode(details){
  if(Date.now()<resendAt)throw Error('Please wait before requesting another code.');
  await request({action:'sendEmailCode',role,email:details.email,registering:details.action==='register',setupCode:details.setupCode,invite:details.invite});
  resendAt=Date.now()+60000;pendingAccount=details;form.hidden=true;toggle.hidden=true;codeButton.hidden=true;codeForm.hidden=false;document.getElementById('emailCode').focus();status.textContent='Enter the verification code sent to '+details.email+'. Check spam too.';
 }
 codeButton.onclick=async()=>{const email=form.elements.namedItem('email');if(!email.reportValidity())returif(!isValidDomain(email.value.trim())){status.textContent='Please use your official college email address (@jainuniversity.ac.in or @jgi.ac.in).';return;}n;codeButton.disabled=true;try{await sendCode({...accountDetails(),action:'login',password:undefined});}catch(error){status.textContent=error.message;}finally{codeButton.disabled=false;}};
 document.getElementById('cancelEmailCode').onclick=()=>{cancelCode();status.textContent='';};
 document.getElementById('resendEmailCode').onclick=async()=>{if(!pendingAccount)return;try{await sendCode(pendingAccount)}catch(error){status.textContent=error.message;}};
 codeForm.onsubmit=async event=>{
  event.preventDefault();if(!pendingAccount)return;const button=document.getElementById('verifyEmailCode');button.disabled=true;
  try{const details=pendingAccount,value=await request({action:'verifyEmailCode',email:details.email,role,registering:details.action==='register',code:document.getElementById('emailCode').value.trim()});
   const result=details.action==='register'?await request({...details,emailProof:value.emailProof}):value;
   pendingAccount=null;location.assign(role==='student'?returnTo:result.redirect);
  }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
 };
 form.onsubmit=async event=>{
  event.preventDefault();const button=document.getElementById('submitAccount');button.disabled=true;status.textContent=registering?'Preparing your account…':'Signing in…';
  try{const details=accountDetails();if(registering&&otpEnabled){await sendCode(details);return;}const value=await request(details);location.assign(role==='student'?returnTo:value.redirect);}
  catch(error){status.textContent=error.message;}finally{button.disabled=false;}
 };
})();
