(() => {
 async function leave(event){event.preventDefault();if(!new URL(location.href).searchParams.has('demo')){try{const r=await fetch('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})});if(!r.ok)throw Error('Sign-out failed. Please retry.')}catch(e){alert(e.message);return;}}location.assign('/login');}
 document.querySelectorAll('[data-signout],[data-switch-portal]').forEach(button=>button.addEventListener('click',leave));
})();
