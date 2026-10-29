import {emailVerificationEnabled,sendEmailCode,verifyEmailCode} from '../../lib/email-verification';
import {proxyRequest} from '../../lib/trusted-proxy';
import {env} from 'cloudflare:workers';
import {getAccountUser,cookieToken,sessionCookie,createSession,digest,equal,randomToken,reserveAuthAttempt} from '../../lib/accounts';
export const dynamic='force-dynamic';
const reply=(body:any,status=200,cookie?:string)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
const denied='Use your authorized teacher email or the student email registered on the class list, in the matching portal.';

// Mailbox ownership authenticates a person; classroom records determine their role.
async function eligibleAccount(email:string,role:string){
 const existing=await env.DB!.prepare('SELECT id,email,name,role FROM accounts WHERE email=?').bind(email).first<any>();
 if(existing)return existing.role===role?{existing,name:existing.name}:null;
 if(role==='student'){
  const student=await env.DB!.prepare('SELECT name FROM students WHERE email=?').bind(email).first<any>();
  return student?{existing:null,name:student.name}:null;
 }
 const authorized=String((env as any).CLASS_SYNC_TEACHER_EMAILS||'').split(',').map(value=>value.trim().toLowerCase()).filter(Boolean);
 if(!authorized.includes(email)||await env.DB!.prepare("SELECT id FROM accounts WHERE teacher_slot='classroom'").first())return null;
 return {existing:null,name:email.split('@')[0]};
}
async function registrationAllowed(eligible:{existing:any},role:string,code:unknown){
 if(role!=='teacher'||eligible.existing)return true;
 const hash=String((env as any).CLASS_SYNC_TEACHER_SETUP_HASH||'');
 return typeof code==='string'&&code.length>0&&code.length<=128&&!!hash&&equal(await digest(code),hash);
}
async function activateAccount(email:string,role:string,eligible:{existing:any,name:string}){
 if(eligible.existing)return eligible.existing;
 const id=crypto.randomUUID();
 // Random unusable placeholders preserve the existing database schema. Password login is disabled.
 const values=[id,email,eligible.name,role,randomToken(),randomToken(),100000,Date.now()];
 if(role==='teacher'){
  await env.DB!.batch([
   env.DB!.prepare("INSERT INTO accounts (id,email,name,role,password_hash,salt,iterations,created,teacher_slot) SELECT ?,?,?,?,?,?,?,?,'classroom' WHERE NOT EXISTS (SELECT 1 FROM accounts WHERE teacher_slot='classroom') ON CONFLICT(email) DO NOTHING").bind(...values),
   env.DB!.prepare("INSERT INTO workspace (id,owner) SELECT 'classroom',id FROM accounts WHERE email=? AND role='teacher' AND teacher_slot='classroom' ON CONFLICT(id) DO UPDATE SET owner=excluded.owner").bind(email)
  ]);
 }else{
  await env.DB!.prepare("INSERT INTO accounts (id,email,name,role,password_hash,salt,iterations,created) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM students WHERE email=?) ON CONFLICT(email) DO NOTHING").bind(...values,email).run();
 }
 const account=await env.DB!.prepare('SELECT id,email,name,role FROM accounts WHERE email=?').bind(email).first<any>();
 if(!account||account.role!==role)throw Error('Your classroom access changed. Please contact your teacher.');
 return account;
}
export async function GET(request:Request){
 try{request=await proxyRequest(request);const user=await getAccountUser(request);return reply({user:user?{email:user.email,name:user.displayName,role:user.role}:null,authMethod:'email_otp',emailOtpEnabled:emailVerificationEnabled(),teacherSetupAvailable:!await env.DB!.prepare("SELECT id FROM accounts WHERE teacher_slot='classroom'").first()});}
 catch{return reply({error:'Account service unavailable.'},503);}
}
export async function POST(request:Request){
 try{
  request=await proxyRequest(request);
  if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Request origin rejected.'},403);
  const raw=await request.text();if(raw.length>6000)return reply({error:'Request too large.'},413);
  let body:any;try{body=JSON.parse(raw);}catch{return reply({error:'Send valid account details.'},400);}
  if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'Send valid account details.'},400);
  if(body.action==='logout'){
   const token=cookieToken(request);if(token)await env.DB!.prepare('DELETE FROM account_sessions WHERE token_hash=?').bind(await digest(token)).run();
   return reply({ok:true},200,sessionCookie(request,'',0));
  }
  if(!['sendEmailCode','verifyEmailCode'].includes(body.action))return reply({error:'Use an email verification code to sign in.'},400);
  if(!emailVerificationEnabled())return reply({error:'Email sign-in is temporarily unavailable. Please try again shortly.'},503);
  const email=String(body.email||'').trim().toLowerCase(),role=body.role;
  if(!/^\S+@\S+\.\S+$/.test(email)||email.length>150||!['student','teacher'].includes(role))return reply({error:'Enter your registered email and choose the correct portal.'},400);
  if(!await reserveAuthAttempt(request,email))return reply({error:'Too many attempts. Please wait 15 minutes and try again.'},429);
  const eligible=await eligibleAccount(email,role);if(!eligible)return reply({error:denied},403);
  if(!await registrationAllowed(eligible,role,body.setupCode))return reply({error:'Enter the teacher registration code for your first sign-in.'},403);
  if(body.action==='sendEmailCode'){
   try{await sendEmailCode(email);return reply({ok:true,message:'Check your email for the verification code.',resendAfter:60});}
   catch(error){return reply({error:error instanceof Error?error.message:'Email delivery failed.'},502);}
  }
  try{await verifyEmailCode(email,String(body.code||''));}
  catch(error){return reply({error:error instanceof Error?error.message:'Unable to verify email.'},400);}
  // Authorization is checked again after provider verification, before issuing a session.
  const current=await eligibleAccount(email,role);if(!current)return reply({error:denied},403);
  if(!await registrationAllowed(current,role,body.setupCode))return reply({error:'Enter the teacher registration code for your first sign-in.'},403);
  const account=await activateAccount(email,role,current);
  return reply({ok:true,role:account.role,redirect:account.role==='teacher'?'/teacher':'/student'},200,await createSession(request,account.id));
 }catch(error){console.error('ClassSync email sign-in failed:',error instanceof Error?error.name:'Error');return reply({error:'Unable to complete sign-in. Please retry.'},503);}
}
