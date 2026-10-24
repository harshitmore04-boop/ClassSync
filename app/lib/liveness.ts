import {evaluateLiveness, faceDistance} from '../../public/liveness-core.js';

type Context = {db:any,user:{userId:string}};
export async function issueLiveness(a:Context, token:string, purpose:string, studentId:string) {
  if (!['checkin','enroll'].includes(purpose)) throw Error('Choose a valid liveness purpose.');
  const session=await a.db.prepare('SELECT * FROM sessions WHERE token=?').bind(token).first();
  if(!session || session.mode!=='face' || !session.open || session.expires<=Date.now()) throw Error('Create an active face session before starting liveness.');
  if(purpose==='enroll' && !await a.db.prepare('SELECT id FROM students WHERE id=?').bind(studentId).first()) throw Error('Select a registered student.');
  const random=new Uint8Array(2);crypto.getRandomValues(random);
  const challenge={nonce:crypto.randomUUID(),order:random[0]%2?'blink-turn':'turn-blink',direction:random[1]%2?1:-1,expires:Math.min(Date.now()+90000,session.expires)};
  await a.db.batch([
    a.db.prepare('DELETE FROM liveness_challenges WHERE actor=? OR expires<?').bind(a.user.userId,Date.now()),
    a.db.prepare('INSERT INTO liveness_challenges (nonce,actor,token,purpose,student_id,challenge_order,direction,created,expires,used) VALUES (?,?,?,?,?,?,?,?,?,0)').bind(challenge.nonce,a.user.userId,token,purpose,studentId,challenge.order,challenge.direction,Date.now(),challenge.expires)
  ]);
  return challenge;
}

export async function consumeLiveness(a:Context, proof:any, token:string, purpose:string, studentId:string, descriptors:number[][]) {
  if(!proof || typeof proof.nonce!=='string') throw Error('Complete the live camera challenge first.');
  const row=await a.db.prepare('SELECT * FROM liveness_challenges WHERE nonce=?').bind(proof.nonce).first();
  if(!row || row.actor!==a.user.userId || row.token!==token || row.purpose!==purpose || row.student_id!==studentId || row.used || row.expires<=Date.now()) throw Error('Liveness challenge expired, used or mismatched. Retry the camera challenge.');
  const session=await a.db.prepare('SELECT * FROM sessions WHERE token=?').bind(token).first();
  if(!session || !session.open || session.mode!=='face' || session.expires<=Date.now()) throw Error('Face session closed or expired. Start a fresh session.');
  const status=evaluateLiveness(proof.samples,row.challenge_order,row.direction);
  if(!status.complete || proof.samples.length<10 || proof.samples.at(-1).t> Date.now()-row.created+1000) throw Error('Liveness steps were not completed in order. Retry.');
  if(faceDistance(proof.startDescriptor,proof.endDescriptor)>.45 || !descriptors.length || descriptors.some(d=>faceDistance(d,proof.endDescriptor)>.5)) throw Error('Face changed between capture and liveness. Recapture the same person.');
  const result=await a.db.prepare('UPDATE liveness_challenges SET used=1 WHERE nonce=? AND used=0 AND expires>?').bind(proof.nonce,Date.now()).run();
  if(!result.meta.changes) throw Error('Liveness challenge was already used. Retry.');
}
