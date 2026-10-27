(() => {
 const role=document.body.dataset.role;
 const form=document.getElementById('accountForm'),codeForm=document.getElementById('emailCodeForm');
 const status=document.getElementById('accountStatus'),emailInput=document.getElementById('email'),codeInput=document.getElementById('emailCode');
 const sendButton=document.getElementById('sendEmailCode'),verifyButton=document.getElementById('verifyEmailCode');
 const resendButton=document.getElementById('resendEmailCode'),changeButton=document.getElementById('changeEmail');
 let pendingEmail='',resendAt=0,timer=null,busy=false;
 let returnTo=role==='student'?'/student':'/teacher';
 const query=new URL(location.href).searchParams;
 if(role==='student'&&query.has('returnTo')){
  try{const target=new URL(query.get('returnTo'),location.origin);if(target.origin===location.origin&&['/student','/student.html','/face-enroll.html','/attendance.html'].includes(target.pathname))returnTo=target.pathname+target.search;}catch{}
 }
 // Old invitation links may prefill an email, but invitations are no longer credentials.
 if(query.has('email'))emailInput.value=query.get('email');
 if(query.has('invite'))history.replaceState({},'',location.pathname+(query.has('returnTo')?'?returnTo='+encodeURIComponent(query.get('returnTo')):''));
 async function request(body){
  const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  let value;try{value=await response.json();}catch{throw Error('Sign-in is temporarily unavailable. Please try again.');}
  if(!response.ok)throw Error(value.error||'Unable to complete sign-in. Please try again.');
  return value;
 }
 function cooldown(){
  const remaining=Math.max(0,Math.ceil((resendAt-Date.now())/1000));
  resendButton.textContent=remaining?'Resend code in '+remaining+'s':'Resend code';
  resendButton.disabled=busy||remaining>0;
 }
 function setBusy(value){busy=value;sendButton.disabled=value;verifyButton.disabled=value;changeButton.disabled=value;cooldown();}
 function showError(error){status.textContent=error.name==='TimeoutError'?'The request timed out. Please try again.':error.message;}
 async function sendCode(email){
  setBusy(true);sendButton.textContent='Sending code…';status.textContent='';
  try{
   const result=await request({action:'sendEmailCode',email,role});
   pendingEmail=email;resendAt=Date.now()+Math.max(60,Number(result.resendAfter)||60)*1000;
   document.getElementById('codeDestination').textContent=email;
   form.hidden=true;codeForm.hidden=false;codeForm.reset();
   status.textContent='Code sent. Check your inbox and spam folder.';
   if(timer)clearInterval(timer);timer=setInterval(cooldown,1000);codeInput.focus();
  }catch(error){showError(error);}finally{sendButton.textContent='Send verification code';setBusy(false);}
 }
 form.onsubmit=event=>{event.preventDefault();if(!busy&&form.reportValidity())sendCode(emailInput.value.trim().toLowerCase());};
 resendButton.onclick=()=>{if(!busy&&pendingEmail&&Date.now()>=resendAt)sendCode(pendingEmail);};
 changeButton.onclick=()=>{if(busy)return;pendingEmail='';if(timer)clearInterval(timer);timer=null;codeForm.reset();codeForm.hidden=true;form.hidden=false;status.textContent='';emailInput.focus();};
 codeForm.onsubmit=async event=>{
  event.preventDefault();if(busy||!pendingEmail||!codeForm.reportValidity())return;
  setBusy(true);verifyButton.textContent='Verifying…';status.textContent='';
  try{await request({action:'verifyEmailCode',email:pendingEmail,role,code:codeInput.value.trim()});location.assign(returnTo);}
  catch(error){showError(error);codeInput.focus();}
  finally{verifyButton.textContent='Verify & sign in';setBusy(false);}
 };
 fetch('/api/auth',{cache:'no-store'}).then(async response=>{
  if(!response.ok)throw Error('Email sign-in is temporarily unavailable. Please refresh and try again.');
  const config=await response.json();if(!config.emailOtpEnabled)throw Error('Email sign-in is temporarily unavailable. Please try again shortly.');
  sendButton.disabled=false;
 }).catch(showError);
 window.addEventListener('pagehide',()=>{if(timer)clearInterval(timer);});
})();
