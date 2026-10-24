(() => {
 const role=document.body.dataset.role,form=document.getElementById('accountForm'),status=document.getElementById('accountStatus');
 let registering=false;
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
 function render(){document.getElementById('registrationFields').hidden=!registering;document.getElementById('submitAccount').textContent=registering?(role==='teacher'?'Create teacher account':'Activate student account'):'Sign in';document.getElementById('toggleAccount').textContent=registering?'Already have an account? Sign in':role==='teacher'?'First-time teacher setup':'Have a teacher invitation? Activate account';document.getElementById('password').autocomplete=registering?'new-password':'current-password';}
 document.getElementById('toggleAccount').onclick=()=>{registering=!registering;status.textContent='';render()};render();
 form.onsubmit=async event=>{
  event.preventDefault();const button=document.getElementById('submitAccount');button.disabled=true;status.textContent=registering?'Creating your account…':'Signing in…';
  try{
   const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:registering?'register':'login',role,email:form.elements.namedItem('email').value,password:form.elements.namedItem('password').value,name:form.elements.namedItem('accountName').value,setupCode:form.elements.namedItem('setupCode')?.value,invite:form.elements.namedItem('invite')?.value})});
   let value;try{value=await r.json()}catch{throw Error('This local demo launcher does not provide real accounts. Use a demo button, the full local server, or the hosted website.')}
   if(!r.ok)throw Error(value.error||'Unable to sign in.');location.assign(role==='student'?returnTo:value.redirect);
  }catch(e){status.textContent=e.message;button.disabled=false;}
 };
})();
