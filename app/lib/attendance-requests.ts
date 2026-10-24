import {digest,randomToken} from './accounts';
export function normalizeStudentName(value:string){return value.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();}
export async function reviewAttendanceRequest(a:any,id:string,decision:string){
 if(!['Approve','Reject'].includes(decision))throw Error('Choose Approve or Reject.');
 const request=await a.db.prepare('SELECT * FROM attendance_requests WHERE id=?').bind(id).first();
 if(!request)throw Error('Attendance request not found.');
 if(request.status!=='Pending')throw Error('This request has already been reviewed.');
 const now=Date.now();
 if(decision==='Reject'){
  const result=await a.db.prepare("UPDATE attendance_requests SET status='Rejected',reviewer=?,reviewed=? WHERE id=? AND status='Pending'").bind(a.user.userId,now,id).run();
  if(!result.meta.changes)throw Error('This request has already been reviewed.');
  return {ok:true,status:'Rejected',token:request.token};
 }
 const student=await a.db.prepare('SELECT id FROM students WHERE roll=?').bind(request.roll).first();
 if(!student)throw Error('Register this roll number in the student roster first, then approve this request.');
 if(request.account_id&&request.student_id!==student.id)throw Error('This student registration changed. Reject the old request and ask the student to scan again.');
 const session=await a.db.prepare('SELECT token FROM sessions WHERE token=?').bind(request.token).first();
 if(!session)throw Error('The class session no longer exists.');
 const exists="EXISTS (SELECT 1 FROM attendance_requests WHERE id=? AND status='Pending')";
 const results=await a.db.batch([
  a.db.prepare('INSERT INTO attendance (id,student_id,token,time,method) SELECT ?,?,?,?,? WHERE '+exists+' ON CONFLICT(student_id,token) DO NOTHING').bind(crypto.randomUUID(),student.id,request.token,request.created,'QR + teacher approval',id),
  // Approval confirms that a newly registered student was enrolled when they requested check-in.
  a.db.prepare('UPDATE students SET created_at=MIN(created_at,?) WHERE id=? AND '+exists).bind(request.created,student.id,id),
  a.db.prepare('INSERT INTO attendance_changes (id,student_id,token,status,teacher,time) SELECT ?,?,?,?,?,? WHERE '+exists).bind(crypto.randomUUID(),student.id,request.token,'Present',a.user.userId,now,id),
  a.db.prepare('INSERT INTO scan_events (id,token,student_id,actor,method,ip,status,reason,time) SELECT ?,?,?,?,?,?,?,?,? WHERE '+exists).bind(crypto.randomUUID(),request.token,student.id,a.user.userId,'qr',request.ip,'Accepted','Teacher approved name/roll request',now,id),
  a.db.prepare("UPDATE attendance_requests SET status='Approved',student_id=?,reviewer=?,reviewed=? WHERE id=? AND status='Pending'").bind(student.id,a.user.userId,now,id)
 ]);
 if(!results.at(-1).meta.changes)throw Error('This request has already been reviewed.');
 return {ok:true,status:'Approved',token:request.token};
}

export async function submitStudentAttendanceRequest(a:any,token:string,ip:string){
 const deny=(message:string,status=400)=>Object.assign(new Error(message),{status});
 if(a.teacher||a.user.role!=='student')throw deny('Sign in with a student account to request attendance.',403);
 const student=await a.db.prepare('SELECT id,name,roll FROM students WHERE email=?').bind(a.user.email.toLowerCase()).first();
 if(!student)throw deny('Your teacher must register your account email before you can request attendance.',403);
 const session=await a.db.prepare('SELECT * FROM sessions WHERE token=?').bind(token).first();
 if(!session||session.mode!=='qr')throw deny('This QR class session was not found.',404);
 if(!['approval','manual'].includes(session.auth))throw deny(session.auth==='direct'?'Use the name-and-roll form for this session.':'Confirm attendance with your signed-in student account for this session.',400);
 const existing=await a.db.prepare('SELECT id,status,account_id FROM attendance_requests WHERE token=? AND (account_id=? OR (roll=? AND normalized_name=?))').bind(token,a.user.userId,student.roll,normalizeStudentName(student.name)).first();
 const present=await a.db.prepare('SELECT id FROM attendance WHERE student_id=? AND token=?').bind(student.id,token).first();
 if(present)return {ok:true,requestStatus:'Approved',alreadyPresent:true,message:'Your attendance is already recorded.'};
 if(existing?.account_id===a.user.userId)return {ok:true,requestStatus:existing.status,pending:existing.status==='Pending',message:existing.status==='Pending'?'Request sent. Waiting for your teacher’s approval. Attendance is not marked yet.':existing.status==='Rejected'?'Your teacher rejected this request. Contact them if a correction is needed.':'Your request was approved. Ask your teacher if the attendance record needs correction.'};
 if(!session.open||session.expires<=Date.now())throw deny('The session is closed or expired. Ask your teacher for a new QR.',410);
 if(session.require_ip&&(!ip||!session.ip||ip!==session.ip))throw deny('Your teacher requires matching IP. Connect to their internet connection and retry.',403);
 const now=Date.now();
 const statements:any[]=[];
 if(existing){
  if(existing.account_id&&existing.account_id!==a.user.userId)throw deny('This request belongs to another account.',403);
  if(existing.status==='Approved')return {ok:true,requestStatus:'Approved',message:'Your teacher already reviewed this class request.'};
  statements.push(a.db.prepare("UPDATE attendance_requests SET account_id=?,student_id=?,name=?,normalized_name=?,ip=?,status='Pending',created=?,reviewer=NULL,reviewed=NULL WHERE id=? AND account_id IS NULL").bind(a.user.userId,student.id,student.name,normalizeStudentName(student.name),ip,now,existing.id));
 }else{
  statements.push(a.db.prepare("INSERT OR IGNORE INTO attendance_requests (id,account_id,token,name,normalized_name,roll,status,student_id,ip,created,receipt_hash) SELECT ?,?,?,?,?,?,'Pending',?,?,?,? WHERE EXISTS (SELECT 1 FROM sessions WHERE token=? AND open=1 AND expires>?)").bind(crypto.randomUUID(),a.user.userId,token,student.name,normalizeStudentName(student.name),student.roll,student.id,ip,now,await digest(randomToken()),token,now));
 }
 statements.push(a.db.prepare("INSERT INTO scan_events (id,token,student_id,actor,method,ip,status,reason,time) SELECT ?,?,?,?,?,?,'Pending',?,? WHERE EXISTS (SELECT 1 FROM attendance_requests WHERE token=? AND account_id=? AND status='Pending')").bind(crypto.randomUUID(),token,student.id,a.user.userId,'qr',ip,'Signed-in student requested teacher approval',now,token,a.user.userId));
 const results=await a.db.batch(statements);
 if(!results[0].meta.changes){const row=await a.db.prepare('SELECT status FROM attendance_requests WHERE token=? AND account_id=?').bind(token,a.user.userId).first();if(!row)throw deny('The session closed while submitting. Refresh and retry.',410);return {ok:true,requestStatus:row.status,pending:row.status==='Pending',message:'Your attendance request is '+row.status.toLowerCase()+'.'};}
 return {ok:true,pending:true,requestStatus:'Pending',message:'Request sent. Waiting for your teacher’s approval. Attendance is not marked yet.'};
}
