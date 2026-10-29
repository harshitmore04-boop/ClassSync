import {emailVerificationEnabled,sendEmailCode,verifyEmailCode} from '../../lib/email-verification';
import {proxyRequest} from '../../lib/trusted-proxy';
import {env} from 'cloudflare:workers';
import {getAccountUser,cookieToken,sessionCookie,createSession,digest,equal,randomToken,reserveAuthAttempt} from '../../lib/accounts';
export const dynamic='force-dynamic';
const reply=(body:any,status=200,cookie?:string)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
const denied='This email already belongs to a different portal. Use the matching student or teacher portal.';

async function eligibleAccount(email:string,role:string){
 const existing=await env.DB!.prepare('SELECT id,email,name,role FROM accounts WHERE email=?').bind(email).first<any>();
 if(existing)return existing.role===role?{existing,name:existing.name}:null;
 const student=role==='student'?await env.DB!.prepare('SELECT name FROM students WHERE email=?').bind(email).first<any>():null;
 return {existing:null,name:student?.name||email.split('@')[0]};
}
async function registrationAllowed(eligible:{existing:any},role:string,code:unknown){
 if(role!=='teacher'||eligible.existing)return true;
 const hash=String((env as any).CLASS_SYNC_TEACHER_SETUP_HASH||'');
 return typeof code==='string'&&code.length>0&&code.length<=128&&!!hash&&equal(await digest(code),hash);
}
async function activateAccount(email:string,role:string,eligible:{existing:any,name:string},profile?:{name:string,roll:string}){
 if(eligible.existing)return eligible.existing;
 const id=crypto.randomUUID();
 // Random unusable placeholders preserve the existing database schema. Password login is disabled.
 const values=[id,email,eligible.name,role,randomToken(),randomToken(),100000,Date.now()];
 const statements:any[]=[];
 if(role==='student'&&profile)statements.push(env.DB!.prepare('INSERT INTO students (id,name,roll,email,created_at,parent_email) VALUES (?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING').bind(crypto.randomUUID(),profile.name,profile.roll,email,Date.now(),''));
 statements.push(env.DB!.prepare('INSERT INTO accounts (id,email,name,role,password_hash,salt,iterations,created) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING').bind(...values));
 await env.DB!.batch(statements);
 if(role==='teacher')await env.DB!.prepare("INSERT INTO workspace (id,owner) SELECT 'classroom',id FROM accounts WHERE email=? AND role='teacher' ON CONFLICT(id) DO NOTHING").bind(email).run();
 const account=await env.DB!.prepare('SELECT id,email,name,role FROM accounts WHERE email=?').bind(email).first<any>();
 if(!account||account.role!==role)throw Error('Your classroom access changed. Please contact your teacher.');
 return account;
}
export async function GET(request:Request){
 try{request=await proxyRequest(request);const user=await getAccountUser(request);return reply({user:user?{email:user.email,name:user.displayName,role:user.role}:null,authMethod:'email_otp',emailOtpEnabled:emailVerificationEnabled(),teacherSetupAvailable:false});}
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
  if(!/^\S+@\S+\.\S+$/.test(email)||email.length>150||!['student','teacher'].includes(role))return reply({error:'Enter a valid email address and choose a portal.'},400);
  if(!await reserveAuthAttempt(request,email))return reply({error:'Too many attempts. Please wait 15 minutes and try again.'},429);
  const eligible=await eligibleAccount(email,role);if(!eligible)return reply({error:denied},403);
  if(body.mode==='signin'&&!eligible.existing)return reply({error:'No account found. Choose Create account first.'},404);
  if(body.mode==='create'&&eligible.existing)return reply({error:'This account already exists. Choose Sign in.'},409);
  let profile:{name:string,roll:string}|undefined;
  if(body.mode==='create'&&role==='student'){
   const name=String(body.name||'').trim(),roll=String(body.roll||'').trim().toUpperCase();
   if(!name||name.length>60||! /^[A-Z0-9][A-Z0-9._/-]{0,29}$/.test(roll))return reply({error:'Enter your full name and valid USN / roll number.'},400);
   const registered=await env.DB!.prepare('SELECT email FROM students WHERE roll=?').bind(roll).first<any>();
   if(registered&&registered.email!==email)return reply({error:'This USN is already registered with another email. Ask your teacher to link your verified email; existing attendance is preserved.'},409);
   profile={name,roll};eligible.name=name;
  }
  if(!await registrationAllowed(eligible,role,body.setupCode))return reply({error:'Enter the teacher registration code for your first sign-in.',needsTeacherCode:true},403);
  if(body.action==='sendEmailCode'){
   try{await sendEmailCode(email);return reply({ok:true,message:'Check your email for the verification code.',resendAfter:60});}
   catch(error){return reply({error:error instanceof Error?error.message:'Email delivery failed.'},502);}
  }
  try{await verifyEmailCode(email,String(body.code||''));}
  catch(error){return reply({error:error instanceof Error?error.message:'Unable to verify email.'},400);}
  // Authorization is checked again after provider verification, before issuing a session.
  const current=await eligibleAccount(email,role);if(!current)return reply({error:denied},403);
  if(!await registrationAllowed(current,role,body.setupCode))return reply({error:'Enter the teacher registration code for your first sign-in.',needsTeacherCode:true},403);
  const account=await activateAccount(email,role,{...current,name:profile?.name||current.name},profile);
  return reply({ok:true,role:account.role,redirect:account.role==='teacher'?'/teacher':'/student'},200,await createSession(request,account.id));
 }catch(error){console.error('ClassSync email sign-in failed:',error instanceof Error?error.name:'Error');return reply({error:'Unable to complete sign-in. Please retry.'},503);}
}
