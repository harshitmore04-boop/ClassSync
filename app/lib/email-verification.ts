import {env} from 'cloudflare:workers';
export function emailVerificationEnabled(){return (env as any).SUPABASE_OTP_ENABLED==='true'&&!!(env as any).SUPABASE_URL&&!!(env as any).SUPABASE_PUBLISHABLE_KEY;}
async function authCall(path:string,body?:unknown,token?:string){
 const settings=env as any,url=new URL(settings.SUPABASE_URL);
 if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co'))throw Error('Email verification is not configured.');
 const response=await fetch(new URL('/auth/v1/'+path,url),{method:body?'POST':'GET',headers:{apikey:settings.SUPABASE_PUBLISHABLE_KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 const value=await response.json() as any;
 if(!response.ok){if(response.status===429)throw Error('Please wait before requesting another email code.');if(path==='verify'||path==='user')throw Error('The verification code is invalid or expired. Request a new code.');throw Error('Email delivery is unavailable. Ask the teacher to check email settings.');}
 return value;
}
export async function sendEmailCode(email:string){await authCall('otp',{email,create_user:true});}
export async function verifyEmailCode(email:string,code:string){
 if(!/^\d{6,8}$/.test(code))throw Error('Enter the verification code from your email.');
 const value=await authCall('verify',{email,token:code,type:'email'});
 if(!value.access_token||!value.user?.email_confirmed_at||value.user.email?.toLowerCase()!==email)throw Error('Email could not be verified.');
 return value.access_token as string;
}
export async function verifyEmailProof(email:string,token:unknown){
 if(typeof token!=='string'||token.length>5000||!token)throw Error('Verify your email before creating the account.');
 const user=await authCall('user',undefined,token);
 if(!user.email_confirmed_at||user.email?.toLowerCase()!==email)throw Error('Verify the same email used for this account.');
}
