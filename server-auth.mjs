import {randomBytes,scryptSync,scrypt,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const derive=promisify(scrypt);
const loopback=host=>['127.0.0.1','localhost','::1','[::1]'].includes(host);
const hashToken=token=>createHash('sha256').update(token).digest('hex');
export function accessConfig(env=process.env){
 const host=env.HOST||'127.0.0.1',enabled=env.ACCESS_MODE==='password';
 if(env.ACCESS_MODE&&!['local','password'].includes(env.ACCESS_MODE))throw Error('ACCESS_MODE must be local or password.');
 if(!enabled){if(!loopback(host)||env.NODE_ENV==='production')throw Error('Web release requires ACCESS_MODE=password.');return {enabled:false,host};}
 let url;try{url=new URL(env.APP_ORIGIN);}catch{throw Error('Set APP_ORIGIN to the exact public HTTPS origin.');}
 if(url.username||url.password||url.pathname!=='/'||url.search||url.hash||!['https:','http:'].includes(url.protocol))throw Error('APP_ORIGIN must contain only scheme and host.');
 if(url.protocol!=='https:'&&(!loopback(url.hostname)||!loopback(host)||env.NODE_ENV==='production'))throw Error('Web release requires HTTPS.');
 const passwords={user:env.TEST_USER_PASSWORD,admin:env.TEST_ADMIN_PASSWORD};
 for(const password of Object.values(passwords))if(typeof password!=='string'||password.length<16||Buffer.byteLength(password)>1024)throw Error('Both test passwords must have at least 16 characters (max 1024 bytes).');
 if(passwords.user===passwords.admin)throw Error('Participant and administrator passwords must be different.');
 return {enabled:true,host,origin:url.origin,secure:url.protocol==='https:',passwords};
}
export function createAccess(config,{now=Date.now}={}){
 if(!config.enabled)return {enabled:false,session:()=>({role:'admin'}),handle:async()=>false};
 const digests=Object.fromEntries(Object.entries(config.passwords).map(([role,password])=>{const salt=randomBytes(16);return [role,{salt,key:scryptSync(password,salt,32)}];}));
 const sessions=new Map(),attempts=new Map(),cookieName=config.secure?'__Host-ember_session':'ember_local_session';
 const ttl=8*60*60*1000,idle=30*60*1000,windowMs=15*60*1000;
 const token=req=>{const found=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(cookieName+'='));return found?.slice(cookieName.length+1)||'';};
 const prune=()=>{const t=now();for(const [key,s] of sessions)if(s.expires<=t||s.last+idle<=t)sessions.delete(key);for(const [key,a] of attempts)if(a.until<=t)attempts.delete(key);};
 function session(req){const value=token(req);if(!/^[a-f0-9]{64}$/.test(value))return null;const key=hashToken(value),s=sessions.get(key);if(!s)return null;if(s.expires<=now()||s.last+idle<=now()){sessions.delete(key);return null;}s.last=now();return {role:s.role};}
 const setCookie=(res,value,age)=>res.setHeader('Set-Cookie',`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${age}${config.secure?'; Secure':''}`);
 const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
 async function handle(req,res,pathname){
  if(!pathname.startsWith('/auth/'))return false;
  if(pathname==='/auth/session'&&req.method==='GET'){const s=session(req);json(res,200,{enabled:true,role:s?.role||null});return true;}
  if(!['/auth/login','/auth/logout'].includes(pathname)){json(res,404,{error:'Not found'});return true;}
  if(req.method!=='POST'){res.setHeader('Allow','POST');json(res,405,{error:'Method not allowed'});return true;}
  if(req.headers.origin!==config.origin||req.headers['sec-fetch-site']==='cross-site'){json(res,403,{error:'この画面からログインし直してください。'});return true;}
  if(pathname==='/auth/logout'){sessions.delete(hashToken(token(req)));setCookie(res,'',0);json(res,200,{ok:true});return true;}
  if(req.headers['content-type']?.split(';')[0]!=='application/json'){json(res,415,{error:'リクエスト形式が正しくありません。'});return true;}
  prune();
  // Never trust a client-supplied forwarding header. Behind a reverse proxy
  // this conservative limit is shared; see the deployment guide.
  const key=req.socket.remoteAddress||'unknown';
  if(!attempts.has(key)&&attempts.size>=10000){json(res,429,{error:'しばらく待ってから再試行してください。'});return true;}
  const a=attempts.get(key)||{count:0,until:now()+windowMs};attempts.set(key,a);
  if(a.count>=10){res.setHeader('Retry-After',String(Math.ceil((a.until-now())/1000)));json(res,429,{error:'しばらく待ってから再試行してください。'});return true;}
  a.count++;
  let bytes=0,input;const chunks=[];
  try{for await(const part of req){bytes+=part.length;if(bytes>4096){json(res,413,{error:'入力が長すぎます。'});return true;}chunks.push(part);}input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{json(res,400,{error:'入力を確認してください。'});return true;}
  const role=input?.role,password=input?.password,validRole=role==='user'||role==='admin',entry=digests[validRole?role:'user'];
  const validPassword=typeof password==='string'&&Buffer.byteLength(password)<=1024;
  const candidate=await derive(validPassword?password:'',entry.salt,32);
  if(!validRole||!validPassword||!timingSafeEqual(candidate,entry.key)){json(res,401,{error:'パスワードを確認してください。'});return true;}
  // A valid participant login must not reset failed administrator guesses.
  a.count=Math.max(0,a.count-1);sessions.delete(hashToken(token(req)));prune();
  if(sessions.size>=1000)sessions.delete(sessions.keys().next().value);
  const value=randomBytes(32).toString('hex');sessions.set(hashToken(value),{role,expires:now()+ttl,last:now()});setCookie(res,value,ttl/1000);json(res,200,{ok:true,role});return true;
 }
 return {enabled:true,session,handle};
}
