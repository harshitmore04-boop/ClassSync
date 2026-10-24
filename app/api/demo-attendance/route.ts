import {env} from 'cloudflare:workers';
import {digest,randomToken} from '../../lib/accounts';
import {normalizeStudentName} from '../../lib/attendance-requests';
export const dynamic='force-dynamic';
const DAY=86400000,reply=(value:any,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
function fail(message:string,status=400):never{throw Object.assign(Error(message),{status})}
const text=(v:any,max:number)=>{if(typeof v!=='string'||!v.trim()||v.trim().length>max)fail('Enter valid attendance details.');return v.trim()};
const message=(status:string)=>status==='Approved'?'Attendance recorded. Your teacher can see it in the demo register.':status==='Rejected'?'Your teacher rejected this request. Contact them if a correction is needed.':'Request sent. Waiting for teacher approval; attendance is not marked yet.';
async function getSession(token:string){const s=await env.DB!.prepare('SELECT * FROM demo_qr_sessions WHERE token=?').bind(token).first<any>();if(!s||s.created<Date.now()-DAY)fail('This demo session is unavailable. Ask the teacher to create a fresh QR.',404);return s;}
function active(s:any){if(!s.open||s.expires<=Date.now())fail('This class is closed or expired. Ask the teacher for a fresh QR.',410);}
function connection(s:any,request:Request){if(s.require_ip&&(!s.ip||s.ip!==request.headers.get('cf-connecting-ip')))fail('Your teacher requires matching IP. Use their network or ask them to turn off matching IP.',403);}
function roster(s:any):any[]{return JSON.parse(s.roster)}
export async function GET(request:Request){try{
 const url=new URL(request.url),token=url.searchParams.get('session')||'',s=await getSession(token),receipt=url.searchParams.get('receipt');
 if(receipt){const r=await env.DB!.prepare('SELECT status FROM demo_qr_requests WHERE token=? AND receipt_hash=?').bind(token,await digest(receipt)).first<any>();if(!r)fail('Attendance receipt not found.',404);return reply({requestStatus:r.status,message:message(r.status)});}
 return reply({session:{token:s.token,subject:s.subject,room:s.room,auth:s.auth,expires:s.expires,open:s.open,class_date:s.class_date},connectionRequired:!!s.require_ip,connectionMatches:!s.require_ip||!!s.ip&&s.ip===request.headers.get('cf-connecting-ip')});
 }catch(e){return reply({error:e instanceof Error?e.message:'Demo attendance unavailable.'},(e as any)?.status||503)}}
export async function POST(request:Request){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)fail('Request origin rejected.',403);
 const raw=await request.text();if(raw.length>24000)fail('Request too large.',413);let b:any;try{b=JSON.parse(raw)}catch{fail('Send valid attendance details.')}
 const db=env.DB!,now=Date.now(),ip=request.headers.get('cf-connecting-ip')||'';
 if(b.action==='create'){
  const token=text(b.token,80);if(!/^[-a-f0-9]{36}$/i.test(token))fail('Invalid demo token.');const owner=text(b.owner,100);if(owner.length<32)fail('Invalid teacher demo key.');const ownerHash=await digest(owner),existing=await db.prepare('SELECT * FROM demo_qr_sessions WHERE token=?').bind(token).first<any>();if(existing&&existing.owner_hash!==ownerHash)fail('Teacher demo key does not match.',403);
  const students=b.students;if(!Array.isArray(students)||students.length>100)fail('Use at most 100 demo students.');const clean=students.map((s:any)=>({id:text(s.id,80),name:text(s.name,60),roll:text(s.roll,30)}));if(new Set(clean.map(s=>s.roll)).size!==clean.length)fail('Use unique demo rolls.');
  const auth=['approval','manual','direct','account'].includes(b.auth)?b.auth:'approval',subject=text(b.subject,100),room=text(b.room,80),classDate=text(b.classDate,12),requireIp=b.requireIp===true?1:0;
  if(existing){await db.prepare('UPDATE demo_qr_sessions SET roster=?,open=?,require_ip=?,ip=? WHERE token=? AND owner_hash=?').bind(JSON.stringify(clean),b.open===false?0:existing.open,requireIp,requireIp?ip:'',token,ownerHash).run();return reply({ok:true,shared:true});}
  const expires=Number(b.expires);if(!Number.isFinite(expires)||expires<=now||expires>now+610000)fail('Choose a demo QR lasting at most 10 minutes.');
  const creatorHash=await digest(ip),count=await db.prepare('SELECT COUNT(*) n FROM demo_qr_sessions WHERE creator_hash=? AND created>?').bind(creatorHash,now-3600000).first<any>();if(count.n>=30)fail('Too many demo sessions. Please try later.',429);
  await db.batch([db.prepare('DELETE FROM demo_qr_requests WHERE token IN (SELECT token FROM demo_qr_sessions WHERE created<?)').bind(now-DAY),db.prepare('DELETE FROM demo_qr_sessions WHERE created<?').bind(now-DAY),db.prepare('UPDATE demo_qr_sessions SET open=0 WHERE owner_hash=?').bind(ownerHash),db.prepare('INSERT INTO demo_qr_sessions (token,owner_hash,creator_hash,subject,room,auth,class_date,expires,open,require_ip,ip,roster,created) VALUES (?,?,?,?,?,?,?,?,1,?,?,?,?)').bind(token,ownerHash,creatorHash,subject,room,auth,classDate,expires,requireIp,requireIp?ip:'',JSON.stringify(clean),now)]);return reply({ok:true,shared:true});
 }
 if(b.action==='list'){
  const ownerHash=await digest(text(b.owner,100));const rows=await db.prepare('SELECT r.id,r.token,r.name,r.normalized_name,r.roll,r.student_id,r.status,r.created,r.reviewed,s.subject,s.room,s.class_date FROM demo_qr_requests r JOIN demo_qr_sessions s ON s.token=r.token WHERE s.owner_hash=? AND s.created>? ORDER BY r.created DESC LIMIT 1000').bind(ownerHash,now-DAY).all<any>();return reply({requests:rows.results});
 }
 const s=await getSession(text(b.token,80));
 if(b.action==='review'||b.action==='mark'||b.action==='close'){
  if(await digest(text(b.owner,100))!==s.owner_hash)fail('Only the creating teacher demo can manage this session.',403);
  if(b.action==='close'){await db.prepare('UPDATE demo_qr_sessions SET open=0 WHERE token=?').bind(s.token).run();return reply({ok:true});}
  if(b.action==='mark'){
   active(s);connection(s,request);if(!['manual','direct'].includes(s.auth))fail('Use student approval for this session.',403);const student=roster(s).find(x=>x.id===b.studentId);if(!student)fail('Choose a registered demo student.');
   await db.prepare('INSERT INTO demo_qr_requests (id,token,name,normalized_name,roll,student_id,status,receipt_hash,created,reviewed) VALUES (?,?,?,?,?,?,\'Approved\',?,?,?) ON CONFLICT(token,roll,normalized_name) DO UPDATE SET status=\'Approved\',student_id=excluded.student_id,reviewed=excluded.reviewed').bind(crypto.randomUUID(),s.token,student.name,normalizeStudentName(student.name),student.roll,student.id,await digest(randomToken()),now,now).run();return reply({ok:true,name:student.name});
  }
  const r=await db.prepare('SELECT * FROM demo_qr_requests WHERE id=? AND token=?').bind(text(b.requestId,80),s.token).first<any>();if(!r)fail('Request not found.',404);if(r.status!=='Pending')fail('Request already reviewed.',409);if(!['Approve','Reject'].includes(b.decision))fail('Choose Approve or Reject.');const student=roster(s).find(x=>x.roll===r.roll);if(b.decision==='Approve'&&!student)fail('Register this roll in the teacher demo first.',409);
  const changed=await db.prepare('UPDATE demo_qr_requests SET status=?,student_id=?,reviewed=? WHERE id=? AND status=\'Pending\'').bind(b.decision==='Approve'?'Approved':'Rejected',student?.id||null,now,r.id).run();if(!changed.meta.changes)fail('Request already reviewed.',409);return reply({ok:true});
 }
 if(b.action!=='submit')fail('Unknown demo attendance action.');active(s);connection(s,request);
 const name=text(b.name,60),roll=text(b.roll,30),normal=normalizeStudentName(name),student=roster(s).find(x=>x.roll===roll),match=student&&normalizeStudentName(student.name)===normal;
 if(s.auth==='account'&&!match)fail('Enter the name and roll registered in this demo.');
 const receipt=text(b.receipt,100);if(receipt.length<32)fail('Invalid attendance receipt.');const receiptHash=await digest(receipt);
 const previous=await db.prepare('SELECT status,receipt_hash FROM demo_qr_requests WHERE token=? AND roll=? AND normalized_name=?').bind(s.token,roll,normal).first<any>();
 if(previous){if(previous.receipt_hash!==receiptHash)fail('This student already submitted for this class. Use the original browser to view the decision.',409);return reply({ok:true,requestStatus:previous.status,message:message(previous.status)});}
 const count=await db.prepare('SELECT COUNT(*) n FROM demo_qr_requests WHERE token=?').bind(s.token).first<any>();if(count.n>=200)fail('Demo request limit reached.',429);
 const status=match&&['direct','account'].includes(s.auth)?'Approved':'Pending';
 const result=await db.prepare('INSERT OR IGNORE INTO demo_qr_requests (id,token,name,normalized_name,roll,student_id,status,receipt_hash,created,reviewed) SELECT ?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM demo_qr_sessions WHERE token=? AND open=1 AND expires>?)').bind(crypto.randomUUID(),s.token,name,normal,roll,student?.id||null,status,receiptHash,now,status==='Approved'?now:null,s.token,now).run();if(!result.meta.changes)fail('Class closed or attendance was already submitted. Refresh the page.',409);
 return reply({ok:true,requestStatus:status,message:message(status)});
 }catch(e){return reply({error:e instanceof Error?e.message:'Demo attendance unavailable.'},(e as any)?.status||503)}}
