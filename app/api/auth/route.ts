import {proxyRequest} from '../../lib/trusted-proxy';
import {env} from 'cloudflare:workers';
import {getAccountUser,cookieToken,sessionCookie,createSession,digest,equal,randomToken,passwordHash,reserveAuthAttempt} from '../../lib/accounts';
export const dynamic='force-dynamic';
const reply=(body:any,status=200,cookie?:string)=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
const denied='This email already belongs to a different portal. Use the matching student or teacher portal.';
const ITERATIONS=210000;

async function eligibleAccount(email:string,role:string){
 const existing=await env.DB!.prepare('SELECT id,email,name,role,password_hash,salt,iterations FROM accounts WHERE email=?').bind(email).first<any>();
 if(existing)return existing.role===role?{existing,name:existing.name}:null;
 const student=role==='student'?await env.DB!.prepare('SELECT name FROM students WHERE email=?').bind(email).first<any>():null;
 return {existing:null,name:student?.name||email.split('@')[0]};
}
async function registrationAllowed(role:string,code:unknown){
 if(role!=='teacher')return true;
 const hash=String((env as any).CLASS_SYNC_TEACHER_SETUP_HASH||'');
 return typeof code==='string'&&code.length>0&&code.length<=128&&!!hash&&equal(await digest(code),hash);
}
async function activateAccount(email:string,role:string,name:string,password:string,profile?:{name:string,roll:string}){
 const id=crypto.randomUUID(),salt=randomToken(),hash=await passwordHash(password,salt,ITERATIONS);
 const statements:any[]=[];
 if(role==='student'&&profile)statements.push(env.DB!.prepare('INSERT INTO students (id,name,roll,email,created_at,parent_email) VALUES (?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING').bind(crypto.randomUUID(),profile.name,profile.roll,email,Date.now(),''));
 statements.push(env.DB!.prepare('INSERT INTO accounts (id,email,name,role,password_hash,salt,iterations,created) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(email) DO NOTHING').bind(id,email,name,role,hash,salt,ITERATIONS,Date.now()));
 await env.DB!.batch(statements);
 const account=await env.DB!.prepare('SELECT id,email,name,role FROM accounts WHERE email=?').bind(email).first<any>();
 if(!account||account.id!==id)throw Error('An account with this email already exists. Choose Sign in.');
 if(role==='teacher')await env.DB!.prepare("INSERT INTO workspace (id,owner) VALUES ('classroom',?) ON CONFLICT(id) DO NOTHING").bind(id).run();
 return account;
}
export async function GET(request:Request){
 try{request=await proxyRequest(request);const user=await getAccountUser(request);const old=user?await env.DB!.prepare('SELECT salt,iterations FROM accounts WHERE id=?').bind(user.userId).first<any>():null;return reply({user:user?{email:user.email,name:user.displayName,role:user.role}:null,passwordSetupRequired:!!old&&old.salt?.length===64&&Number(old.iterations)===100000,authMethod:'password',teacherSetupAvailable:false});}
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
  const password=body.password;
  if(body.action==='setPassword'){
   const user=await getAccountUser(request);
   if(!user)return reply({error:'Sign in with your existing session before setting a password.'},401);
   if(typeof password!=='string'||password.length<8||password.length>128)return reply({error:'Choose a password of 8 to 128 characters.'},400);
   if(!await reserveAuthAttempt(request,user.email))return reply({error:'Too many attempts. Please wait 15 minutes and try again.'},429);
   const account=await env.DB!.prepare('SELECT salt,iterations FROM accounts WHERE id=?').bind(user.userId).first<any>();
   if(!account||account.salt?.length!==64||Number(account.iterations)!==100000)return reply({error:'This account already has a password. Sign in normally.'},409);
   const salt=randomToken(),hash=await passwordHash(password,salt,ITERATIONS);
   const result=await env.DB!.prepare('UPDATE accounts SET password_hash=?,salt=?,iterations=? WHERE id=? AND salt=? AND iterations=100000').bind(hash,salt,ITERATIONS,user.userId,account.salt).run();
   if(result.meta?.changes!==1)return reply({error:'Password was already set. Sign in normally.'},409);
   return reply({ok:true,redirect:user.role==='teacher'?'/teacher':'/student'});
  }
  if(!['signin','create'].includes(body.action))return reply({error:'Choose Sign in or Create account.'},400);
  const email=String(body.email||'').trim().toLowerCase(),role=body.role;
  if(!/^\S+@\S+\.\S+$/.test(email)||email.length>150||!['student','teacher'].includes(role))return reply({error:'Enter a valid email address and choose a portal.'},400);
  if(typeof password!=='string'||password.length<8||password.length>128)return reply({error:'Enter a password of 8 to 128 characters.'},400);
  if(!await reserveAuthAttempt(request,email))return reply({error:'Too many attempts. Please wait 15 minutes and try again.'},429);
  const eligible=await eligibleAccount(email,role);if(!eligible)return reply({error:denied},403);
  if(body.action==='signin'){
   if(!eligible.existing)return reply({error:'No account found. Choose Create account first.'},404);
   const current=eligible.existing;
   if(current.salt?.length===64&&Number(current.iterations)===100000)return reply({error:'This older account needs a password. If you are still signed in on another tab, use Set password there. Otherwise ask your teacher for help.'},409);
   if(!current.salt||!current.password_hash||!Number.isInteger(Number(current.iterations))||Number(current.iterations)<100000||Number(current.iterations)>1000000)return reply({error:'Account credentials are unavailable. Ask your teacher for help.'},403);
   if(!equal(await passwordHash(password,current.salt,Number(current.iterations)),current.password_hash))return reply({error:'Incorrect email or password.'},401);
   return reply({ok:true,role,redirect:role==='teacher'?'/teacher':'/student'},200,await createSession(request,current.id));
  }
  if(eligible.existing)return reply({error:'This account already exists. Choose Sign in.'},409);
  let profile:{name:string,roll:string}|undefined;
  if(role==='student'){
   const name=String(body.name||'').trim(),roll=String(body.roll||'').trim().toUpperCase();
   if(!name||name.length>60||! /^[A-Z0-9][A-Z0-9._/-]{0,29}$/.test(roll))return reply({error:'Enter your full name and valid USN / roll number.'},400);
   const registered=await env.DB!.prepare('SELECT email FROM students WHERE roll=?').bind(roll).first<any>();
   if(registered&&registered.email!==email)return reply({error:'This USN is already registered with another email. Ask your teacher to link your account; existing attendance is preserved.'},409);
   profile={name,roll};eligible.name=name;
  }
  if(!await registrationAllowed(role,body.setupCode))return reply({error:'Enter the teacher registration code to create your account.',needsTeacherCode:true},403);
  const account=await activateAccount(email,role,eligible.name,password,profile);
  return reply({ok:true,role:account.role,redirect:role==='teacher'?'/teacher':'/student'},200,await createSession(request,account.id));
 }catch(error){console.error('ClassSync password sign-in failed:',error instanceof Error?error.name:'Error');return reply({error:'Unable to complete sign-in. Please retry.'},503);}
}
