import {env} from 'cloudflare:workers';
// Only a signed request from our Vercel function may forward the original client IP.
export async function proxyRequest(request:Request){
 const signature=request.headers.get('x-classsync-proxy-signature');if(!signature)return request;
 const secret=(env as any).CLASS_SYNC_PROXY_SECRET,ip=request.headers.get('x-classsync-proxy-ip')||'',time=request.headers.get('x-classsync-proxy-time')||'';
 if(!secret||!/^\d{13}$/.test(time)||Math.abs(Date.now()-Number(time))>30000||!/^[a-f0-9]{64}$/.test(signature)||!ip||ip.length>64)throw Error('Invalid proxy request.');
 const encoder=new TextEncoder(),url=new URL(request.url),body=['GET','HEAD'].includes(request.method)?'':await request.clone().text();
 const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s))),b=>b.toString(16).padStart(2,'0')).join('');
 const message=[request.method,url.pathname+url.search,ip,time,await hash(body),await hash(request.headers.get('cookie')||'')].join('\n');
 const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
 const valid=await crypto.subtle.verify('HMAC',key,Uint8Array.from(signature.match(/../g)!,s=>parseInt(s,16)),encoder.encode(message));if(!valid)throw Error('Invalid proxy request.');
 const headers=new Headers(request.headers);headers.set('cf-connecting-ip',ip);return new Request(request.url,{method:request.method,headers,...(!['GET','HEAD'].includes(request.method)?{body}:{})});
}
