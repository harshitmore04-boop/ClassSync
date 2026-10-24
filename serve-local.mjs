import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {handleRequest as serveStatic} from './serve-demo.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
export function createLocalApplication({databasePath,setupCode}){
 let ts;try{ts=createRequire(new URL('./local-server/package.json',import.meta.url))('typescript')}catch{try{ts=createRequire(import.meta.url)('typescript')}catch{throw Error('Install the local server dependency first: npm install --prefix local-server')}}
 const sql=new DatabaseSync(databasePath);sql.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS classsync_migrations (name TEXT PRIMARY KEY)');
 for(const name of fs.readdirSync(path.join(root,'drizzle')).filter(f=>f.endsWith('.sql')).sort()){
  if(sql.prepare('SELECT name FROM classsync_migrations WHERE name=?').get(name))continue;
  sql.exec('BEGIN');try{sql.exec(fs.readFileSync(path.join(root,'drizzle',name),'utf8').replaceAll('--> statement-breakpoint',''));sql.prepare('INSERT INTO classsync_migrations (name) VALUES (?)').run(name);sql.exec('COMMIT')}catch(e){sql.exec('ROLLBACK');throw e}
 }
 const db={prepare(query){let values=[];return {bind(...next){values=next;return this},run(){return {meta:{changes:Number(sql.prepare(query).run(...values).changes)}}},async first(){return sql.prepare(query).get(...values)||null},async all(){return {results:sql.prepare(query).all(...values)}}}},async batch(statements){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(s.run());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};
 const env={SUPABASE_URL:process.env.SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY:process.env.SUPABASE_PUBLISHABLE_KEY,SUPABASE_OTP_ENABLED:process.env.SUPABASE_OTP_ENABLED,DB:db,CLASS_SYNC_PROXY_SECRET:process.env.CLASS_SYNC_PROXY_SECRET,CLASS_SYNC_TEACHER_SETUP_HASH:crypto.createHash('sha256').update(setupCode).digest('hex'),BREVO_API_KEY:process.env.BREVO_API_KEY,MAIL_FROM_EMAIL:process.env.MAIL_FROM_EMAIL};
 const cache=new Map();
 function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file);const exports={};cache.set(file,exports);const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,allowJs:true}}).outputText;
  new Function('require','exports',js)(name=>{if(name==='cloudflare:workers')return {env};if(name.startsWith('.'))return load(path.resolve(path.dirname(file),name)+(path.extname(name)?'':'.ts'));return createRequire(pathToFileURL(file))(name)},exports);return exports;
 }
 const routes=new Map(['/api/auth','/api/attendance','/api/checkin','/api/demo-attendance','/api/face-enrollment'].map(url=>[url,load(path.join(root,'app',url,'route.ts'))]));
 return {db,sql,async dispatch(request){const route=routes.get(new URL(request.url).pathname);if(!route)return null;const handler=route[request.method];return handler?handler(request):Response.json({error:'Method not allowed.'},{status:405})},close(){sql.close()}};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const port=Number(process.argv[2]||8080);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Choose a port from 1 to 65535.');
 const stateDirectory=path.join(root,'.local');fs.mkdirSync(stateDirectory,{recursive:true});const codePath=path.join(stateDirectory,'teacher-setup-code.txt');
 if(!fs.existsSync(codePath))fs.writeFileSync(codePath,crypto.randomBytes(16).toString('hex'),{mode:0o600});const setupCode=fs.readFileSync(codePath,'utf8').trim();
 const app=createLocalApplication({databasePath:path.join(stateDirectory,'classsync.sqlite'),setupCode});
 const server=http.createServer(async(req,res)=>{try{
  const url=new URL(req.url,`http://${req.headers.host}`);if(!['localhost','127.0.0.1'].includes(url.hostname)){res.writeHead(403);res.end('Use localhost.');return;}
  if(!url.pathname.startsWith('/api/')){await serveStatic(req,res);return;}
  let body='';for await(const chunk of req){body+=chunk.toString();if(Buffer.byteLength(body)>160000){res.writeHead(413);res.end('Request too large.');return;}}
  const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);headers.set('cf-connecting-ip',req.socket.remoteAddress||'127.0.0.1');
  const request=new Request(url,{method:req.method,headers,...(!['GET','HEAD'].includes(req.method)?{body}:{})});const response=await app.dispatch(request);
  if(!response){res.writeHead(404);res.end('API not found.');return;}res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error('Local request failed:',e.message);res.writeHead(500,{'Content-Type':'text/plain'});res.end('Local service error. See terminal.')}});
 server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is busy. Try node serve-local.mjs ${port+1}`:e.message);app.close();process.exitCode=1});
 server.listen(port,'127.0.0.1',()=>{console.log(`ClassSync with real local accounts: http://localhost:${port}/login`);if(!app.sql.prepare("SELECT id FROM accounts WHERE teacher_slot='classroom'").get())console.log(`Private teacher setup code: ${setupCode}\nOpen Teacher sign-in → First-time teacher setup. Choose your own email and password.`);console.log('Database stays in .local/. This launcher is single-computer only. Press Ctrl+C to stop.');});
}
