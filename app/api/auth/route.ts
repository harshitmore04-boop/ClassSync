import {emailVerificationEnabled,sendEmailCode,verifyEmailCode,verifyEmailProof} from '../../lib/email-verification';
import {proxyRequest} from '../../lib/trusted-proxy';
import {env} from 'cloudflare:workers';
import {getAccountUser,cookieToken,sessionCookie,createSession,passwordHash,digest,randomToken,equal,reserveAuthAttempt} from '../../lib/accounts';
export const dynamic='force-dynamic';
const reply=(body:any,status=200,cookie?:string)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
export async function GET(request:Request){try{request=await proxyRequest(request);const user=await getAccountUser(request);return reply({user:user?{email:user.email,name:user.displayName,role:user.role}:null,emailOtpEnabled:emailVerificationEnabled(),teacherSetupAvailable:!await env.DB!.prepare("SELECT id FROM accounts WHERE teacher_slot='classroom'").first()});}catch(error){console.error('ClassSync account service error:',error instanceof Error?error.message:'unknown');return reply({error:'Account service unavailable.'},503)}}
export async function POST(request:Request){
 try{request=await proxyRequest(request);
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Request origin rejected.'},403);
  const raw=await request.text();if(raw.length>6000)return reply({error:'Request too large.'},413);
  let b:any;try{b=JSON.parse(raw)}catch{return reply({error:'Send valid account details.'},400)}
  if(!b||typeof b!=='object')return reply({error:'Send valid account details.'},400);
  if(b.action==='logout'){const token=cookieToken(request);if(token)await env.DB!.prepare('DELETE FROM account_sessions WHERE token_hash=?').bind(await digest(token)).run();return reply({ok:true},200,sessionCookie(request,'',0));}
  const email=String(b.email||'').trim().toLowerCase(),password=String(b.password||'');
  if(['sendEmailCode','verifyEmailCode'].includes(b.action)){
   if(!emailVerificationEnabled())return reply({error:'Email verification is waiting for the email provider setup. You can still use your password.'},503);
   if(!/^\S+@\S+\.\S+$/.test(email)||email.length>150||!['student','teacher'].includes(b.role))return reply({error:'Enter your registered email and choose the correct portal.'},400);
   if(!await reserveAuthAttempt(request,email))return reply({error:'Too many attempts. Please wait 15 minutes and try again.'},429);
   const existing=await env.DB!.prepare('SELECT id,email,name,role FROM accounts WHERE email=?').bind(email).first<any>();
   if(b.action==='sendEmailCode'){
    if(b.registering){
     if(b.role==='teacher'){
      const setupHash=(env as any).CLASS_SYNC_TEACHER_SETUP_HASH;
      if(!setupHash||!equal(await digest(String(b.setupCode||'')),setupHash)||await env.DB!.prepare("SELECT id FROM accounts WHERE teacher_slot='classroom'").first())return reply({error:'Use the private teacher setup code, or sign in to the existing teacher account.'},403);
     }else{
      const invite=await env.DB!.prepare('SELECT s.email FROM account_invites i JOIN students s ON s.id=i.student_id WHERE i.token_hash=? AND i.expires>?').bind(await digest(String(b.invite||'')),Date.now()).first<any>();
      if(!invite||invite.email!==email)return reply({error:'Use your teacher’s valid invitation and its registered email.'},403);
     }
    }else if(!existing||existing.role!==b.role)return reply({error:'Use an activated account in the matching portal.'},403);
    try{await sendEmailCode(email);return reply({ok:true,message:'Check your email for the verification code.'});}catch(error){return reply({error:error instanceof Error?error.message:'Email delivery failed.'},502);}
   }
   try{
    const proof=await verifyEmailCode(email,String(b.code||''));
    if(b.registering)return reply({ok:true,emailProof:proof});
    if(!existing||existing.role!==b.role)return reply({error:'Use an activated account in the matching portal.'},403);
    return reply({ok:true,role:existing.role,redirect:existing.role==='teacher'?'/teacher':'/student'},200,await createSession(request,existing.id));
   }catch(error){return reply({error:error instanceof Error?error.message:'Unable to verify email.'},400);}
  }

  if(!/^\S+@\S+\.\S+$/.test(email)||email.length>150||password.length<10||password.length>128)return reply({error:'Use a valid email and a password of 10–128 characters.'},400);
  const attempt=await reserveAuthAttempt(request,email);if(!attempt)return reply({error:'Too many attempts. Please wait 15 minutes and try again.'},429);
  let account:any;
  if(b.action==='login'){
   account=await env.DB!.prepare('SELECT * FROM accounts WHERE email=?').bind(email).first<any>();
   const hash=await passwordHash(password,account?.salt||'classsync-dummy-password-salt',account?.iterations||100000);
   if(!account||!equal(account.password_hash,hash))return reply({error:'Email or password is incorrect.'},401);
   if(b.role&&account.role!==b.role)return reply({error:'This account belongs to the other portal. Choose the matching role.'},403);
  }else if(b.action==='register'){
   if(emailVerificationEnabled()){try{await verifyEmailProof(email,b.emailProof)}catch(error){return reply({error:error instanceof Error?error.message:'Verify your email first.'},403)}}
   const name=String(b.name||'').trim();if(!name||name.length>60||!['teacher','student'].includes(b.role))return reply({error:'Enter your name and a valid role.'},400);
   const salt=randomToken(),hash=await passwordHash(password,salt),id=crypto.randomUUID();
   if(b.role==='teacher'){
    const setupHash=(env as any).CLASS_SYNC_TEACHER_SETUP_HASH;
    if(!setupHash||!equal(await digest(String(b.setupCode||'')),setupHash))return reply({error:'A valid private teacher setup code is required.'},403);
    if(await env.DB!.prepare("SELECT id FROM accounts WHERE teacher_slot='classroom'").first())return reply({error:'The teacher account is already configured. Sign in instead.'},409);
    try{await env.DB!.batch([
     env.DB!.prepare('INSERT INTO accounts (id,email,name,role,password_hash,salt,iterations,teacher_slot,created) VALUES (?,?,?,?,?,?,?,?,?)').bind(id,email,name,'teacher',hash,salt,100000,'classroom',Date.now()),
     env.DB!.prepare('INSERT INTO workspace (id,owner) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner').bind('classroom',id)
    ]);}catch{return reply({error:'The teacher account or email is already registered.'},409)}
    account={id,email,name,role:'teacher'};
   }else{
    const tokenHash=await digest(String(b.invite||''));const invite=await env.DB!.prepare('SELECT i.*,s.email FROM account_invites i JOIN students s ON s.id=i.student_id WHERE i.token_hash=? AND i.expires>?').bind(tokenHash,Date.now()).first<any>();
    if(!invite||invite.email!==email)return reply({error:'Use the unexpired invitation from your teacher and its registered email.'},403);
    const existing=await env.DB!.prepare('SELECT id,role FROM accounts WHERE email=?').bind(email).first<any>();
    if(existing&&existing.role!=='student')return reply({error:'This email is already used by a teacher.'},409);
    const accountId=existing?.id||id;
    // The claim is conditional inside the transaction; a concurrent reuse changes zero rows.
    const statements:any[]=[env.DB!.prepare('INSERT INTO accounts (id,email,name,role,password_hash,salt,iterations,created) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM account_invites WHERE token_hash=? AND expires>?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,password_hash=excluded.password_hash,salt=excluded.salt,iterations=excluded.iterations').bind(accountId,email,name,'student',hash,salt,100000,Date.now(),tokenHash,Date.now()),env.DB!.prepare('DELETE FROM account_sessions WHERE account_id=? AND EXISTS (SELECT 1 FROM account_invites WHERE token_hash=? AND expires>?)').bind(accountId,tokenHash,Date.now()),env.DB!.prepare('DELETE FROM account_invites WHERE token_hash=?').bind(tokenHash)];
    const result=await env.DB!.batch(statements);if(!result[0].meta.changes)return reply({error:'Invitation was already used. Request another from your teacher.'},409);
    account={id:accountId,email,name,role:'student'};
   }
  }else return reply({error:'Unknown account action.'},400);
  await env.DB!.prepare('DELETE FROM auth_attempts WHERE id=?').bind(attempt).run();
  return reply({ok:true,role:account.role,redirect:account.role==='teacher'?'/teacher':'/student'},200,await createSession(request,account.id));
 }catch(e){console.error('Account request failed',e instanceof Error?e.name:'Error');return reply({error:'Unable to complete account request. Please retry.'},503)}
}
