import {env} from 'cloudflare:workers';
import {digest,randomToken} from './accounts';
import {normalizeStudentName} from './attendance-requests';
export const dynamic='force-dynamic';
const answer=(body:any,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
async function sessionFor(token:string){if(!/^[a-f0-9-]{36}$/i.test(token))return null;return env.DB!.prepare("SELECT token,subject,room,class_date,expires,open,ip,require_ip FROM sessions WHERE token=? AND mode='qr' AND auth='direct'").bind(token).first<any>();}
export async function GET(request:Request){try{
 const url=new URL(request.url),token=url.searchParams.get('session')||'',receipt=url.searchParams.get('receipt');
 if(receipt){const row=await env.DB!.prepare('SELECT status FROM attendance_requests WHERE token=? AND receipt_hash=?').bind(token,await digest(receipt)).first<any>();if(!row)return answer({error:'Request receipt not found.'},404);return answer({requestStatus:row.status,message:row.status==='Pending'?'Waiting for teacher approval. Attendance is not marked yet.':row.status==='Approved'?'Your teacher approved the request. Attendance is recorded.':'Your teacher rejected the request. Contact them for help.'});}
 const session=await sessionFor(token);if(!session||!session.open||session.expires<=Date.now())return answer({error:'This direct QR session is closed, expired or unavailable. Ask the teacher for a new QR.'},410);
 const ip=request.headers.get('cf-connecting-ip')||'';return answer({session:{subject:session.subject,room:session.room,classDate:session.class_date,expires:session.expires},connectionRequired:!!session.require_ip,connectionMatches:!session.require_ip||!!ip&&ip===session.ip});
 }catch{return answer({error:'Attendance service unavailable.'},503)}}
export async function POST(request:Request){try{
 if(request.headers.get('origin')!==new URL(request.url).origin)return answer({error:'Request origin rejected.'},403);
 const raw=await request.text();if(raw.length>1600)return answer({error:'Request too large.'},413);
 let b:any;try{b=JSON.parse(raw)}catch{return answer({error:'Enter a valid name and roll number.'},400)}
 const token=String(b?.session||''),name=String(b?.name||'').trim(),roll=String(b?.roll||'').trim(),ip=request.headers.get('cf-connecting-ip')||'';
 const session=await sessionFor(token);if(!session||!session.open||session.expires<=Date.now())return answer({error:'Session closed or expired. Ask the teacher for a new QR.'},410);
 const recent=await env.DB!.prepare("SELECT COUNT(*) n FROM scan_events WHERE actor='direct-qr' AND token=? AND ip=? AND time>? AND status IN ('Rejected','Pending')").bind(token,ip,Date.now()-300000).first<any>();
 if(Number(recent?.n)>=60)return answer({error:'Too many requests from this connection. Ask the teacher for assistance.'},429);
 let student:any=null;
 const audit=async(status:string,reason:string)=>env.DB!.prepare('INSERT INTO scan_events (id,token,student_id,actor,method,ip,status,reason,time) VALUES (?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),token,student?.id||null,'direct-qr','qr',ip,status,reason,Date.now()).run();
 if(session.require_ip&&(!ip||ip!==session.ip)){await audit('Rejected','Direct QR connection mismatch');return answer({error:'Connect to the teacher’s internet connection and retry.'},403);}
 if(!name||name.length>60||/[\u0000-\u001f]/.test(name)||roll.length>30||!roll){await audit('Rejected','Invalid name or roll entry');return answer({error:'Enter your full registered name and roll number.'},400);}
 const normalized=normalizeStudentName(name);
 student=await env.DB!.prepare('SELECT id,name,created_at FROM students WHERE roll=?').bind(roll).first<any>();
 if(!student||normalizeStudentName(student.name)!==normalized||student.created_at>session.expires){
  const existing=await env.DB!.prepare('SELECT id,status FROM attendance_requests WHERE token=? AND roll=? AND normalized_name=?').bind(token,roll,normalized).first<any>();
  if(existing)return answer({ok:true,pending:existing.status==='Pending',requestStatus:existing.status,message:existing.status==='Pending'?'This name and roll already have a request waiting for teacher approval.':existing.status==='Approved'?'Your teacher has approved this request. Attendance is recorded.':'This request was rejected. Contact your teacher.'});
  const receipt=randomToken(),id=crypto.randomUUID(),now=Date.now();
  const result=await env.DB!.prepare("INSERT OR IGNORE INTO attendance_requests (id,token,name,normalized_name,roll,status,student_id,ip,created,receipt_hash) SELECT ?,?,?,?,?,'Pending',?,?,?,? WHERE EXISTS (SELECT 1 FROM sessions WHERE token=? AND open=1 AND expires>?)").bind(id,token,name,normalized,roll,student?.id||null,ip,now,await digest(receipt),token,now).run();
  if(!result.meta.changes)return answer({error:'Session closed or request already submitted. Please refresh.'},409);
  await audit('Pending','Name/roll did not match the roster; sent for teacher approval');
  return answer({ok:true,pending:true,requestStatus:'Pending',receipt,message:'Request sent to your teacher for approval. Attendance is not marked yet.'},202);
 }
 const now=Date.now();let alreadyPresent=false;
 try{const result=await env.DB!.prepare('INSERT INTO attendance (id,student_id,token,time,method) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM sessions WHERE token=? AND open=1 AND expires>?)').bind(crypto.randomUUID(),student.id,token,now,'Direct QR + registered name/roll',token,now).run();if(!result.meta.changes)return answer({error:'Session closed while checking in.'},410);}catch(e){if(String(e).includes('UNIQUE'))alreadyPresent=true;else throw e;}
 await env.DB!.prepare("UPDATE attendance_requests SET status='Approved',student_id=?,reviewer='Automatic name/roll match',reviewed=? WHERE token=? AND roll=? AND normalized_name=? AND status='Pending'").bind(student.id,now,token,roll,normalized).run();
 if(!alreadyPresent)await audit('Accepted',session.require_ip?'Registered name/roll matched; public IP matched':'Registered name/roll matched; IP check disabled by teacher');
 return answer({ok:true,alreadyPresent,message:alreadyPresent?'Attendance is already recorded for this student.':'Name and roll matched. Attendance recorded successfully.'});
 }catch{return answer({error:'Unable to record attendance. Retry or contact your teacher.'},503)}}
