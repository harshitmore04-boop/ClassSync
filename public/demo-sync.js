// Shared QR transport for the isolated demo. Real attendance APIs are never used.
(()=>{if(!window.classSyncDemoMode)return;
 const key='classsync-demo-workspace-v1',ownerKey='classsync-demo-teacher-key-v1',base=window.classSyncDemoAPI,published=new Map();let owner;
 function teacherKey(){if(owner)return owner;owner=localStorage.getItem(ownerKey);if(!owner){owner=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');localStorage.setItem(ownerKey,owner)}return owner}
 function read(){return JSON.parse(localStorage.getItem(key)||'null')}
 function save(d){localStorage.setItem(key,JSON.stringify(d))}
 async function remote(body){let r;try{r=await fetch('/api/demo-attendance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...body,owner:teacherKey()})})}catch{throw Object.assign(Error('Shared demo needs the hosted website or full local server.'),{unavailable:true})}let value;try{value=await r.json()}catch{throw Object.assign(Error('Shared demo needs the hosted website or full local server.'),{unavailable:true})}if(!r.ok)throw Object.assign(Error(value.error||'Shared demo attendance failed.'),{status:r.status});return value}
 async function publish(d,s,force=false){if(!s||s.mode!=='qr'||(!force&&(!s.open||s.expires<=Date.now())))return;const body={action:'create',token:s.token,subject:s.subject,room:s.room,auth:s.auth,classDate:s.class_date,expires:s.expires,requireIp:s.require_ip!==0,open:!!s.open,students:d.students.map(({id,name,roll})=>({id,name,roll}))},signature=JSON.stringify(body);if(published.get(s.token)===signature)return;await remote(body);published.set(s.token,signature);const latest=read(),current=latest.sessions.find(c=>c.token===s.token);if(current){current.shared=true;save(latest)}}
 async function sync(){const {requests}=await remote({action:'list'}),d=read();d.approvalRequests||=[];const remoteIds=new Set(requests.map(r=>r.id));d.approvalRequests=d.approvalRequests.filter(r=>!r.shared&&!remoteIds.has(r.id));
  for(const r of requests){d.approvalRequests.push({...r,shared:true,ip:'Shared demo QR'});const student=d.students.find(s=>s.id===r.student_id),session=d.sessions.find(s=>s.token===r.token);if(r.status==='Approved'&&student&&session&&!d.records.some(a=>a.student_id===student.id&&a.token===session.token)){d.records.push({id:'shared-'+r.id,student_id:student.id,token:session.token,time:r.created,method:session.auth==='direct'?'Demo shared direct QR':'Demo shared QR + teacher approval',name:student.name,roll:student.roll,email:student.email,subject:session.subject,room:session.room});d.changes.unshift({id:'shared-change-'+r.id,student_id:student.id,token:session.token,status:'Present',time:r.reviewed||r.created})}}
  save(d);
 }
 window.classSyncDemoAPI=async(role,body,token)=>{
  if(role!=='teacher')return base(role,body,token);
  let d=read();
  if(body?.action==='reviewAttendance'){const r=d?.approvalRequests?.find(r=>r.id===body.requestId);if(r?.shared){await publish(d,d.sessions.find(s=>s.token===r.token),true);const result=await remote({action:'review',token:r.token,requestId:r.id,decision:body.decision});await sync();return result}}
  if(['deleteFace','deleteStudent'].includes(body?.action)){const r=await fetch('/api/face-enrollment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'revoke',scope:'demo',owner:teacherKey(),studentId:body.studentId})});if(!r.ok){let v;try{v=await r.json()}catch{}throw Error(v?.error||'Unable to delete the shared face profile. Retry.')}}
  if(body?.action==='close'&&d?.sessions.find(s=>s.token===body.token)?.shared)await remote({action:'close',token:body.token});
  if(body?.action==='checkin'){const s=d?.sessions.find(s=>s.token===body.token);if(s?.shared&&s.mode==='qr'&&['manual','direct'].includes(s.auth)){await remote({action:'mark',token:s.token,studentId:body.studentId});await sync();return {ok:true,name:d.students.find(s=>s.id===body.studentId)?.name,method:'Demo shared teacher confirmation'}}}
  const result=await base(role,body,token);d=read();const current=body?.action==='session'?d.sessions.find(s=>s.token===result.token):d.sessions[d.sessions.length-1];
  try{await publish(d,current);if(!body||body.action==='sessionIp'||body.action==='student'){await sync();if(!body)return base(role,null,token)}}catch(e){if(!e.unavailable)throw e;if(body?.action==='session')result.shared=false;}
  return result;
 };
})();
