(() => {
 const role=document.body.dataset.role;
 const form=document.getElementById('accountForm'),status=document.getElementById('accountStatus');
 const email=document.getElementById('email'),password=document.getElementById('password'),confirm=document.getElementById('confirmPassword');
 const submit=document.getElementById('accountSubmit');
 let mode='signin',busy=false,legacyEmail='';
 let returnTo=role==='student'?'/student':'/teacher';
 const query=new URL(location.href).searchParams;
 if(role==='student'&&query.has('returnTo')){
  try{const target=new URL(query.get('returnTo'),location.origin);if(target.origin===location.origin&&['/student','/student.html','/face-enroll.html','/attendance.html'].includes(target.pathname))returnTo=target.pathname+target.search;}catch{}
 }
 if(query.has('email'))email.value=query.get('email');
 if(query.has('invite'))history.replaceState({},'',location.pathname+(query.has('returnTo')?'?returnTo='+encodeURIComponent(query.get('returnTo')):''));
 async function request(body){
  const response=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
  let value;try{value=await response.json();}catch{throw Error('Sign-in is temporarily unavailable. Please try again.');}
  if(!response.ok){const error=Error(value.error||'Unable to complete sign-in. Please try again.');error.needsTeacherCode=!!value.needsTeacherCode;throw error;}
  return value;
 }
 function showError(error){
  if(role==='teacher'&&error.needsTeacherCode){chooseMode('create');document.getElementById('teacherCode').focus();}
  status.textContent=error.name==='TimeoutError'?'The request timed out. Please try again.':error.message;
 }
 function chooseMode(next){
  if(busy)return;
  mode=next;status.textContent='';email.readOnly=false;
  document.getElementById('chooseSignIn').setAttribute('aria-pressed',String(mode==='signin'));
  document.getElementById('chooseCreate').setAttribute('aria-pressed',String(mode==='create'));
  document.getElementById('loginTitle').textContent=mode==='create'?'Create your '+role+' account.':'Welcome back, '+role+'.';
  document.getElementById('accessMode').textContent=mode==='create'?'Create your account with an email and password.':'Sign in with your email and password.';
  document.getElementById('confirmPasswordGroup').hidden=mode==='signin';
  confirm.required=mode==='create';
  password.autocomplete=mode==='create'?'new-password':'current-password';
  submit.textContent=mode==='create'?'Create account':'Sign in';
  if(role==='teacher'){document.getElementById('teacherRegistration').hidden=mode!=='create';document.getElementById('teacherCode').required=mode==='create';}
  else {document.getElementById('studentRegistration').hidden=mode!=='create';for(const id of ['studentName','studentRoll'])document.getElementById(id).required=mode==='create';}
 }
 document.getElementById('chooseSignIn').onclick=()=>chooseMode('signin');
 document.getElementById('chooseCreate').onclick=()=>chooseMode('create');
 form.onsubmit=async event=>{
  event.preventDefault();if(busy||!form.reportValidity())return;
  if(mode!=='signin'&&password.value!==confirm.value){status.textContent='Passwords do not match.';confirm.focus();return;}
  const action=mode==='setup'?'setPassword':mode;
  busy=true;submit.disabled=true;submit.textContent=action==='setPassword'?'Saving password…':mode==='create'?'Creating account…':'Signing in…';status.textContent='';
  try{
   const details=action==='setPassword'?{action,password:password.value}:{action,email:email.value.trim().toLowerCase(),password:password.value,role,...(mode==='create'&&role==='student'?{name:document.getElementById('studentName').value.trim(),roll:document.getElementById('studentRoll').value.trim()}:{}),...(mode==='create'&&role==='teacher'?{setupCode:document.getElementById('teacherCode').value}:{})};
   await request(details);
   password.value='';confirm.value='';
   location.assign(returnTo);
  }catch(error){showError(error);}
  finally{busy=false;submit.disabled=false;submit.textContent=mode==='setup'?'Set password':mode==='create'?'Create account':'Sign in';}
 };
 document.getElementById('setPassword').onclick=()=>{
  if(busy||!legacyEmail)return;
  chooseMode('signin');mode='setup';email.value=legacyEmail;email.readOnly=true;
  document.getElementById('loginTitle').textContent='Set your '+role+' password.';
  document.getElementById('accessMode').textContent='Your existing session will securely add a password to this account.';
  document.getElementById('confirmPasswordGroup').hidden=false;confirm.required=true;password.autocomplete='new-password';submit.textContent='Set password';password.focus();
 };
 fetch('/api/auth',{cache:'no-store'}).then(async response=>{
  if(!response.ok)throw Error('Sign-in is temporarily unavailable. Please refresh and try again.');
  const config=await response.json();
  if(config.passwordSetupRequired&&config.user?.role===role){legacyEmail=config.user.email;document.getElementById('legacyPassword').hidden=false;}
 }).catch(showError);
})();
