import {env} from 'cloudflare:workers';
const COOKIE='classsync_session';
const encoder=new TextEncoder();
export const hex=(bytes:ArrayBuffer|Uint8Array)=>Array.from(new Uint8Array(bytes as ArrayBuffer)).map(b=>b.toString(16).padStart(2,'0')).join('');
export const digest=async(value:string)=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
export const randomToken=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
export async function passwordHash(password:string,salt:string,iterations=100000){
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations,hash:'SHA-256'},key,256));
}
export function equal(a:string,b:string){let difference=a.length^b.length;for(let i=0;i<Math.max(a.length,b.length);i++)difference|=(a.charCodeAt(i)||0)^(b.charCodeAt(i)||0);return difference===0;}
export function cookieToken(request:Request){return request.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';}
export function sessionCookie(request:Request,token:string,maxAge=604800){return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${new URL(request.url).protocol==='https:'?'; Secure':''}`;}
export async function getAccountUser(request:Request){
 const token=cookieToken(request);if(!/^[a-f0-9]{64}$/.test(token))return null;
 const account=await env.DB!.prepare('SELECT a.id,a.email,a.name,a.role FROM account_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires>?').bind(await digest(token),Date.now()).first<any>();
 return account?{userId:account.id,email:account.email,displayName:account.name,role:account.role}:null;
}
export async function createSession(request:Request,accountId:string){
 const token=randomToken();await env.DB!.batch([env.DB!.prepare('DELETE FROM account_sessions WHERE expires<?').bind(Date.now()),env.DB!.prepare('INSERT INTO account_sessions (token_hash,account_id,expires) VALUES (?,?,?)').bind(await digest(token),accountId,Date.now()+604800000)]);
 return sessionCookie(request,token);
}
export async function reserveAuthAttempt(request:Request,email:string){
 const db=env.DB!,now=Date.now(),bucket=Math.floor(now/900000),ip=request.headers.get('cf-connecting-ip')||'local';
 const keys=[{key:await digest('email:'+email+':'+bucket),limit:12},{key:await digest('ip:'+ip+':'+bucket),limit:100}];
 await db.prepare('DELETE FROM auth_attempts WHERE expires<?').bind(now).run();
 for(const entry of keys){await db.prepare('INSERT INTO auth_attempts (id,hits,expires) VALUES (?,1,?) ON CONFLICT(id) DO UPDATE SET hits=hits+1').bind(entry.key,(bucket+1)*900000).run();const row=await db.prepare('SELECT hits FROM auth_attempts WHERE id=?').bind(entry.key).first<any>();if(row.hits>entry.limit)return null;}
 return keys[0].key;
}
export async function issueStudentInvite(studentId:string){
 const token=randomToken();await env.DB!.batch([env.DB!.prepare('DELETE FROM account_invites WHERE student_id=? OR expires<?').bind(studentId,Date.now()),env.DB!.prepare('INSERT INTO account_invites (token_hash,student_id,expires) VALUES (?,?,?)').bind(await digest(token),studentId,Date.now()+86400000)]);return token;
}
