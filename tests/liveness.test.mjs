import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {evaluateLiveness} from '../public/liveness-core.js';
const require=createRequire(import.meta.url), ts=require('typescript');
const root=fileURLToPath(new URL('../',import.meta.url));
const vector=()=>Array(128).fill(.1);
function evidence(challenge){
  const neutral={ear:.3,yaw:0},closed={ear:.1,yaw:0},turn={ear:.3,yaw:.2*challenge.direction};
  const blink=[closed,neutral,neutral],head=[turn,turn,neutral,neutral];
  return [neutral,neutral,neutral,...(challenge.order==='blink-turn'?[...blink,...head]:[...head,...blink])].map((s,i)=>({...s,t:i*160}));
}
function proof(c){return {nonce:c.nonce,samples:evidence(c),startDescriptor:vector(),endDescriptor:vector()}}
function harness(){
  const sql=new DatabaseSync(':memory:');
  for(const f of fs.readdirSync(path.join(root,'drizzle')).filter(f=>f.endsWith('.sql')).sort())sql.exec(fs.readFileSync(path.join(root,'drizzle',f),'utf8').replace(/--> statement-breakpoint/g,''));
  let user={userId:'owner',email:'teacher@example.com',displayName:'Teacher'};
  const db={prepare(q){let values=[];return {bind(...v){values=v;return this},async run(){return {meta:{changes:Number(sql.prepare(q).run(...values).changes)}}},async first(){return sql.prepare(q).get(...values)||null},async all(){return {results:sql.prepare(q).all(...values)}}}},async batch(statements){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};
  const cache=new Map();
  function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,allowJs:true}}).outputText;new Function('require','exports',js)(n=>n==='cloudflare:workers'?{env:{DB:db}}:n.endsWith('/accounts')?{getAccountUser:async()=>user?{...user,role:user.userId==='owner'?'teacher':'student'}:null}:n.startsWith('.')?load(path.resolve(path.dirname(file),n)+(path.extname(n)?'':'.ts')):require(n),exports);return exports}
  sql.prepare('INSERT INTO workspace (id,owner) VALUES (?,?)').run('classroom','owner');const api=load(path.join(root,'app/api/attendance/route.ts'));
  async function post(body,status=200,ip='1.2.3.4'){const response=await api.POST(new Request('https://test.site/api/attendance',{method:'POST',headers:{Origin:'https://test.site','Content-Type':'application/json','cf-connecting-ip':ip},body:JSON.stringify(body)}));const result=await response.json();assert.equal(response.status,status,JSON.stringify(result));return result}
  async function challenge(token,purpose='checkin',studentId=''){const c=await post({action:'livenessChallenge',token,purpose,studentId});sql.prepare('UPDATE liveness_challenges SET created=? WHERE nonce=?').run(Date.now()-5000,c.nonce);return c}
  return {sql,api,post,challenge,setUser(value){user=value}};
}

test('motion rules accept both orders/directions and reject static, wrong direction, out-of-order and broken timing',()=>{
 for(const order of ['blink-turn','turn-blink'])for(const direction of [-1,1]){
  const c={order,direction};assert(evaluateLiveness(evidence(c),order,direction).complete);
  assert(!evaluateLiveness(evidence(c).map(s=>({...s,ear:.3,yaw:0})),order,direction).complete);
  assert(!evaluateLiveness(evidence({...c,direction:-direction}),order,direction).complete);
  assert(!evaluateLiveness(evidence({...c,order:order==='blink-turn'?'turn-blink':'blink-turn'}),order,direction).complete);
 }
 const c={order:'blink-turn',direction:1},samples=evidence(c);samples[4].t=100;
 assert.throws(()=>evaluateLiveness(samples,c.order,c.direction),/Interrupted/);
 assert.throws(()=>evaluateLiveness([{t:0,ear:NaN,yaw:0}],c.order,c.direction),/invalid/);
});

test('live API requires a fresh bound one-use challenge for enrollment and face check-in; QR still works',async()=>{
 const h=harness(),{post,sql}=h;
 await post({action:'student',name:'Alice',roll:'R1',email:'alice@example.com'});
 const student=sql.prepare('SELECT * FROM students').get();
 const {token}=await post({action:'session',subject:'COA',room:'B204',duration:180,mode:'face',auth:'manual'});
 const enroll={action:'enroll',token,studentId:student.id,descriptors:[vector(),vector()],consent:true};
 await post(enroll,403);
 let c=await h.challenge(token,'enroll',student.id);
 await post({...enroll,liveness:proof(c)});
 await post({...enroll,liveness:proof(c)},403);
 await post({action:'checkin',token,descriptor:vector()},403);
 c=await h.challenge(token);
 const bad=proof(c);bad.samples=bad.samples.map(s=>({...s,ear:.3,yaw:0}));
 await post({action:'checkin',token,descriptor:vector(),liveness:bad},403);
 // Valid evidence can be retried until consumed; the attendance unique constraint remains independent.
 await post({action:'checkin',token,descriptor:vector(),liveness:proof(c)});
 assert.equal(sql.prepare('SELECT method FROM attendance').get().method,'Face + motion challenge');
 await post({action:'checkin',token,descriptor:vector(),liveness:proof(c)},403);
 c=await h.challenge(token);await post({action:'checkin',token,descriptor:vector(),liveness:proof(c)},409);
 c=await h.challenge(token);sql.prepare('UPDATE liveness_challenges SET expires=0 WHERE nonce=?').run(c.nonce);
 await post({action:'checkin',token,descriptor:vector(),liveness:proof(c)},403);
 c=await h.challenge(token);const changed=proof(c);changed.endDescriptor=Array(128).fill(.8);
 await post({action:'checkin',token,descriptor:vector(),liveness:changed},403);
 c=await h.challenge(token,'enroll',student.id);await post({action:'checkin',token,descriptor:vector(),liveness:proof(c)},403);
 c=await h.challenge(token);await post({action:'checkin',token,descriptor:vector(),liveness:proof(c)},403,'5.6.7.8');
 await post({action:'close',token});await post({action:'checkin',token,descriptor:vector(),liveness:proof(c)},410);
 const qr=await post({action:'session',subject:'COA',room:'B204',duration:180,mode:'qr',auth:'manual'});
 await post({action:'checkin',token:qr.token,studentId:student.id});
 h.setUser({userId:'student',email:'alice@example.com',displayName:'Alice'});
 await post({action:'livenessChallenge',token:qr.token,purpose:'checkin'},403);
 sql.close();
});

test('challenge is bound to actor/session/student and newer challenges replace previous ones',async()=>{
 const h=harness();await h.post({action:'student',name:'Alice',roll:'R1',email:'alice@example.com'});
 const s=h.sql.prepare('SELECT * FROM students').get();const a=await h.post({action:'session',subject:'COA',room:'B',duration:180,mode:'face',auth:'manual'});
 const c=await h.challenge(a.token,'enroll',s.id);const newer=await h.challenge(a.token,'enroll',s.id);
 assert.equal(h.sql.prepare('SELECT COUNT(*) n FROM liveness_challenges').get().n,1);
 await h.post({action:'enroll',token:a.token,studentId:s.id,descriptors:[vector(),vector()],consent:true,liveness:proof(c)},403);
 // Direct helper checks isolate ownership and binding checks from API role checks.
 h.sql.prepare('UPDATE liveness_challenges SET actor=? WHERE nonce=?').run('other-teacher',newer.nonce);
 await h.post({action:'enroll',token:a.token,studentId:s.id,descriptors:[vector(),vector()],consent:true,liveness:proof(newer)},403);
 h.sql.prepare('UPDATE liveness_challenges SET actor=?,student_id=? WHERE nonce=?').run('owner','different-student',newer.nonce);
 await h.post({action:'enroll',token:a.token,studentId:s.id,descriptors:[vector(),vector()],consent:true,liveness:proof(newer)},403);
 h.sql.prepare('UPDATE liveness_challenges SET student_id=? WHERE nonce=?').run(s.id,newer.nonce);
 await h.post({action:'enroll',token:'wrong-session',studentId:s.id,descriptors:[vector(),vector()],consent:true,liveness:proof(newer)},403);
 h.sql.close();
});

test('demo refuses face enrollment/check-in without liveness and still supports QR',async()=>{
 const storage=new Map(),window={};
 const location={href:'http://localhost:8080/teacher?demo=1'};
 const code=fs.readFileSync(path.join(root,'public/demo-data.js'),'utf8').replaceAll("'/liveness-core.js?v=1'",JSON.stringify(pathToFileURL(path.join(root,'public/liveness-core.js')).href));
 new Function('window','localStorage','location','crypto',code)(window,{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},location,crypto);
 const api=body=>window.classSyncDemoAPI('teacher',body);
 const data=await api(),s=data.students[0];
 const c=await api({action:'session',subject:'COA',room:'B',duration:180,mode:'face',auth:'manual'});
 await assert.rejects(api({action:'enroll',token:c.token,studentId:s.id,descriptors:[vector(),vector()],consent:true}),/fresh live camera/);
 await assert.rejects(api({action:'checkin',token:c.token,descriptor:vector()}),/fresh live camera/);
 const challenge=await api({action:'livenessChallenge',token:c.token,purpose:'checkin'});assert(['blink-turn','turn-blink'].includes(challenge.order));
 const qr=await api({action:'session',subject:'COA',room:'B',duration:180,mode:'qr',auth:'manual'});
 assert((await api({action:'checkin',token:qr.token,studentId:s.id})).ok);
});


test('camera runner follows landmarks and fails closed on static view, lost/multiple faces, cancellation and identity switch',async()=>{
 function detection(sample,descriptor=vector()){
  const points=Array.from({length:68},()=>({x:0,y:0}));
  for(const [start,x] of [[36,100],[42,200]]){
   const eye=[[-10,0],[-5,-sample.ear*10],[5,-sample.ear*10],[10,0],[5,sample.ear*10],[-5,sample.ear*10]];
   eye.forEach(([dx,dy],i)=>points[start+i]={x:x+dx,y:100+dy});
  }
  points[30]={x:150+sample.yaw*100,y:130};
  return {detection:{box:{width:120}},landmarks:{positions:points},descriptor};
 }
 async function run(frames,cancelled=()=>false,recoverTracking=false){
  let clock=0,index=0;const window={},updates=[];
  const source=fs.readFileSync(path.join(root,'public/liveness.js'),'utf8').replaceAll("'/liveness-core.js?v=1'",JSON.stringify(pathToFileURL(path.join(root,'public/liveness-core.js')).href));
  const faceapi={TinyFaceDetectorOptions:class{},detectAllFaces(){return {withFaceLandmarks(){return {withFaceDescriptors:async()=>frames[Math.min(index++,frames.length-1)]}}}}};
  new Function('window','faceapi','document','performance','setTimeout',source)(window,faceapi,{hidden:false},{now:()=>clock+=160},callback=>queueMicrotask(callback));
  const result=await window.runClassSyncLiveness({video:{readyState:4,srcObject:{getVideoTracks:()=>[{readyState:'live'}]}},challenge:{order:'blink-turn',direction:1,expires:Date.now()+90000},cancelled,recoverTracking,onUpdate:s=>updates.push(s)});
  return {result,updates};
 }
 const samples=evidence({order:'blink-turn',direction:1}),frames=samples.map(s=>[detection(s)]);
 const success=await run(frames);assert(success.result.liveness.samples.length>=10);assert.equal(success.updates.at(-1).complete,true);
 await assert.rejects(run([[detection({ear:.3,yaw:0})]]),/timed out/);
 await assert.rejects(run([[]]),/Face lost/);
 const recovered=await run([[],...frames.slice(0,4),[],...frames],()=>false,true);assert.equal(recovered.updates.at(-1).complete,true);assert(recovered.updates.some(s=>s.message.includes('restart')));
 await assert.rejects(run([[]],()=>false,true),/Face lost|timed out/);
 await assert.rejects(run([[detection(samples[0]),detection(samples[0])]]),/Multiple faces/);
 await assert.rejects(run(frames,()=>true),/cancelled/);
 const switched=frames.slice();switched[4]=[detection(samples[4],Array(128).fill(.8))];
 await assert.rejects(run(switched),/Face changed/);
});
