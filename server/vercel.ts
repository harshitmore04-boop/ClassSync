import * as auth from '../app/api/auth/route';import * as attendance from '../app/api/attendance/route';import * as checkin from '../app/api/checkin/route';import * as demo from '../app/api/demo-attendance/route';import * as face from '../app/api/face-enrollment/route';
const routes={auth,attendance,checkin,'demo-attendance':demo,'face-enrollment':face};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 const endpoint=req.query.endpoint;if(typeof endpoint!=='string'||!Object.hasOwn(routes,endpoint))return res.status(404).json({error:'Unknown API endpoint.'});
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Method not allowed.'});
 const host=req.headers.host;if(!host||!/^[a-z0-9.-]+(?::\d+)?$/i.test(host))return res.status(400).json({error:'Invalid host.'});
 const origin='https://'+host;if(req.method==='POST'&&req.headers.origin!==origin)return res.status(403).json({error:'Request origin rejected.'});
 const url=new URL('/api/'+endpoint,origin);for(const[key,value]of Object.entries(req.query))if(!['endpoint','path'].includes(key)&&typeof value==='string')url.searchParams.set(key,value);
 const headers=new Headers({'Content-Type':'application/json'});if(req.headers.cookie)headers.set('cookie',req.headers.cookie);if(req.headers.origin)headers.set('origin',req.headers.origin);
 headers.set('cf-connecting-ip',String(req.headers['x-forwarded-for']||'').split(',')[0].trim());
 const body=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});if(Buffer.byteLength(body)>150000)return res.status(413).json({error:'Request too large.'});
 try{const request=new Request(url,{method:req.method,headers,...(req.method==='POST'?{body}:{})});const response=await routes[endpoint][req.method](request);for(const[key,value]of response.headers)res.setHeader(key,value);return res.status(response.status).send(await response.text());}catch(error){console.error('ClassSync API request failed:',error.name);return res.status(503).json({error:'Classroom service unavailable. Please retry.'});}
}
