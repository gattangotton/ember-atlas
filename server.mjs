import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {accessConfig,createAccess} from './server-auth.mjs';
const root=fileURLToPath(new URL('./public/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp'};
export function createAppServer(config=accessConfig(),options={}){
 const access=createAccess(config,options),loginFiles=new Set(['/login.html','/login.js','/login.css','/favicon.svg']);
 return http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  if(config.secure)res.setHeader('Strict-Transport-Security','max-age=31536000');
  try{
   const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname),normalized=path.posix.normalize(pathname.replaceAll('\\','/'));
   if(/[\x00:]/.test(normalized)||normalized.split('/').some(p=>/[. ]$/.test(p))){res.writeHead(400).end();return;}
   if(await access.handle(req,res,normalized))return;
   if(normalized==='/auth/session'&&!access.enabled){res.writeHead(200,{'Content-Type':types['.json']}).end(JSON.stringify({enabled:false,role:'admin'}));return;}
   if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'}).end();return;}
   const file=path.resolve(root,'.'+(normalized==='/'?'/index.html':normalized));
   if(!file.startsWith(root.endsWith(path.sep)?root:root+path.sep)){res.writeHead(403).end();return;}
   if(access.enabled&&!loginFiles.has(normalized)){
    const session=access.session(req),isAdmin=normalized.toLowerCase()==='/admin.html';
    if(!session||(isAdmin&&session.role!=='admin')){
     if(normalized==='/'||path.extname(normalized).toLowerCase()==='.html')res.writeHead(303,{'Location':'/login.html'+(isAdmin?'?role=admin':'')}).end();
     else res.writeHead(401,{'Content-Type':types['.json']}).end(JSON.stringify({error:'ログインしてください。'}));
     return;
    }
   }
   const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(req.method==='HEAD'?undefined:body);
  }catch{if(!res.headersSent)res.writeHead(404);res.end('Not found');}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const config=accessConfig(),port=Number(process.env.PORT||5174);
 createAppServer(config).listen(port,config.host,()=>console.log(`Ember Atlas: ${config.origin||`http://localhost:${port}`} (${config.enabled?'password access':'local only'})`));
}
