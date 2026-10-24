import {createHash,createHmac} from 'node:crypto';
import {isIP} from 'node:net';
const backend='https://smart-attendance-coa.bhavya-tiwari2027.chatgpt.site';
const endpoints=new Set(['auth','attendance','checkin','demo-attendance','face-enrollment']);
const hash=s=>createHash('sha256').update(s).digest('hex');
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');const fail=(status,error)=>res.status(status).json({error});
 const endpoint=req.query.endpoint;if(!endpoints.has(endpoint))return fail(404,'Unknown API endpoint.');
 if(!['GET','POST'].includes(req.method))return fail(405,'Method not allowed.');
 const host=req.headers.host;if(!host||!/^[a-z0-9.-]+(?::\d+)?$/i.test(host))return fail(400,'Invalid host.');const origin='https://'+host;
 if(req.method==='POST'&&req.headers.origin!==origin)return fail(403,'Request origin rejected.');
 if(!process.env.CLASS_SYNC_PROXY_SECRET)return fail(503,'Classroom connection is not configured.');
 const ip=String(req.headers['x-forwarded-for']||'').split(',')[0].trim();if(!isIP(ip))return fail(503,'Client connection could not be verified.');
 const body=req.method==='POST'?(typeof req.body==='string'?req.body:JSON.stringify(req.body||{})):'';if(Buffer.byteLength(body)>150000)return fail(413,'Request too large.');
 const url=new URL('/api/'+endpoint,backend);for(const [key,value]of Object.entries(req.query))if(key!=='endpoint'&&typeof value==='string')url.searchParams.set(key,value);
 const cookie=String(req.headers.cookie||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith('classsync_session=')).join('; '),time=String(Date.now());
 const signature=createHmac('sha256',process.env.CLASS_SYNC_PROXY_SECRET).update([req.method,url.pathname+url.search,ip,time,hash(body),hash(cookie)].join('\n')).digest('hex');
 try{
 const upstream=await fetch(url,{method:req.method,headers:{'Content-Type':'application/json',Origin:backend,Cookie:cookie,'x-classsync-proxy-ip':ip,'x-classsync-proxy-time':time,'x-classsync-proxy-signature':signature},...(req.method==='POST'?{body}:{}),redirect:'error',signal:AbortSignal.timeout(25000)});
 const cookies=upstream.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
 const type=upstream.headers.get('content-type')||'';if(!type.includes('application/json'))return fail(502,'Classroom service returned an unexpected response.');
 const rewrite=value=>typeof value==='string'&&value.startsWith(backend+'/')?origin+value.slice(backend.length):Array.isArray(value)?value.map(rewrite):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([k,v])=>[k,rewrite(v)])):value;
 return res.status(upstream.status).json(rewrite(await upstream.json()));
 }catch{return fail(502,'Classroom service is temporarily unavailable. Please retry.');}
}
