// Route QR check-in according to the teacher-selected attendance method.
import {GET as directGET,POST as directPOST} from '../../lib/direct-checkin';
import {env} from 'cloudflare:workers';
import {getAccountUser} from '../../lib/accounts';
import {submitStudentAttendanceRequest} from '../../lib/attendance-requests';
import {attendanceLoginPath} from '../../lib/attendance-login';
export const dynamic='force-dynamic';
const reply=(body:any,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(request:Request){try{
 const token=new URL(request.url).searchParams.get('session')||'';
 const policy=await env.DB!.prepare('SELECT auth FROM sessions WHERE token=? AND mode=?').bind(token,'qr').first<any>();if(policy?.auth==='direct')return directGET(request);
 const user=await getAccountUser(request);
 if(!user)return reply({error:'Sign in with your ClassSync student account to request attendance.',loginRequired:true,loginUrl:attendanceLoginPath(token)},401);
 if(user.role!=='student')return reply({error:'Use a student account for QR attendance.'},403);
 const session=await env.DB!.prepare('SELECT subject,room,open,expires,require_ip,ip FROM sessions WHERE token=? AND mode=?').bind(token,'qr').first<any>();
 if(!session)return reply({error:'Class session not found.'},404);
 const approval=await env.DB!.prepare('SELECT status FROM attendance_requests WHERE token=? AND account_id=?').bind(token,user.userId).first<any>();
 return reply({approvalRequired:true,requestStatus:approval?.status||null,session:{subject:session.subject,room:session.room,open:session.open,expires:session.expires},connectionRequired:!!session.require_ip,connectionMatches:!session.require_ip||!!session.ip&&session.ip===request.headers.get('cf-connecting-ip')});
 }catch{return reply({error:'Attendance service unavailable.'},503)}}
export async function POST(request:Request){try{
 const cloned=request.clone();
 if(request.headers.get('origin')!==new URL(request.url).origin)return reply({error:'Request origin rejected.'},403);
 const raw=await request.text();if(raw.length>1600)return reply({error:'Request too large.'},413);let b:any;try{b=JSON.parse(raw)}catch{return reply({error:'Send a valid attendance request.'},400)}
 const token=String(b?.session||b?.token||'');const policy=await env.DB!.prepare('SELECT auth FROM sessions WHERE token=? AND mode=?').bind(token,'qr').first<any>();if(policy?.auth==='direct')return directPOST(cloned as unknown as Request);
 const user=await getAccountUser(request);
 if(!user)return reply({error:'Student login is required before requesting attendance.',loginRequired:true,loginUrl:attendanceLoginPath(token)},401);
 return reply(await submitStudentAttendanceRequest({db:env.DB,user,teacher:user.role==='teacher'},token,request.headers.get('cf-connecting-ip')||''));
 }catch(e){return reply({error:e instanceof Error?e.message:'Unable to request attendance.'},(e as any)?.status||503)}}
