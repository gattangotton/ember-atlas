import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {accessConfig} from '../server-auth.mjs';
import {createAppServer} from '../server.mjs';
const env={ACCESS_MODE:'password',APP_ORIGIN:'https://atlas.example.test',TEST_USER_PASSWORD:'test-participant-password',TEST_ADMIN_PASSWORD:'test-administrator-password'};
async function fixture(t,options={}){
 const config=accessConfig(env),server=createAppServer(config,options);server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise(resolve=>server.close(resolve)));
 const base=`http://127.0.0.1:${server.address().port}`;
 const request=(path,options={})=>fetch(base+path,{redirect:'manual',...options});
 const login=(role='user',password=env.TEST_USER_PASSWORD,headers={})=>request('/auth/login',{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json',...headers},body:JSON.stringify({role,password})});
 return {request,login,config};
}
const cookie=response=>response.headers.get('set-cookie').split(';')[0];
test('Release configuration refuses unprotected public bindings, weak/equal passwords and HTTP production',()=>{
 assert.equal(accessConfig({}).enabled,false);
 for(const settings of [{HOST:'0.0.0.0'},{NODE_ENV:'production'},{ACCESS_MODE:'typo'},{...env,APP_ORIGIN:'http://atlas.example.test'},{...env,TEST_ADMIN_PASSWORD:env.TEST_USER_PASSWORD},{...env,TEST_USER_PASSWORD:'short'},{...env,APP_ORIGIN:'https://atlas.example.test/subpath'},{...env,NODE_ENV:'production',APP_ORIGIN:'http://localhost:5175'}])assert.throws(()=>accessConfig(settings));
 assert.equal(accessConfig({...env,HOST:'0.0.0.0',NODE_ENV:'production'}).secure,true);
});
test('Anonymous users cannot fetch the application or common data; only sign-in assets are public',async t=>{
 const {request}=await fixture(t);
 assert.equal((await request('/')).headers.get('location'),'/login.html');
 assert.equal((await request('/admin.html')).headers.get('location'),'/login.html?role=admin');
 for(const p of ['/app.js','/data/catalog.json','/data/game-memories.json','/assets/game/missing.png'])assert.equal((await request(p)).status,401,p);
 for(const p of ['/login.html','/login.js','/login.css','/favicon.svg'])assert.equal((await request(p)).status,200,p);
 assert.deepEqual(await (await request('/auth/session')).json(),{enabled:true,role:null});
});
test('Participant sessions cannot enter administrator HTML, including case/encoding variants',async t=>{
 const {request,login}=await fixture(t),response=await login();assert.equal(response.status,200);
 const header=response.headers.get('set-cookie');for(const text of ['__Host-ember_session=','HttpOnly','Secure','SameSite=Strict','Path=/'])assert.ok(header.includes(text));
 const headers={Cookie:cookie(response)};
 assert.equal((await request('/',{headers})).status,200);assert.equal((await request('/data/catalog.json',{headers})).status,200);
 for(const p of ['/admin.html','/ADMIN.HTML','/%61dmin.html','/x/%2e%2e/admin.html'])assert.equal((await request(p,{headers})).status,303,p);
 for(const p of ['/admin.html.','/admin.html%20','/admin.html::$DATA'])assert.equal((await request(p,{headers})).status,400,p);
 assert.equal((await login('admin')).status,401);assert.equal((await login('__proto__')).status,401);
 assert.equal((await request('/server-auth.mjs',{headers})).status,404);assert.equal((await request('/.env',{headers})).status,404);
});
test('Admin login, role response, rotation, logout and server-side invalidation work without storing progress',async t=>{
 const {request,login,config}=await fixture(t),old=await login(),headers={Cookie:cookie(old)};
 const admin=await login('admin',env.TEST_ADMIN_PASSWORD,headers);headers.Cookie=cookie(admin);
 assert.equal((await request('/admin.html',{headers})).status,200);
 assert.deepEqual(await (await request('/auth/session',{headers})).json(),{enabled:true,role:'admin'});
 assert.equal((await request('/data/catalog.json',{headers:{Cookie:cookie(old)}})).status,401);
 const logout=await request('/auth/logout',{method:'POST',headers:{...headers,Origin:config.origin}});assert.equal(logout.status,200);assert.ok(logout.headers.get('set-cookie').includes('Max-Age=0'));
 assert.equal((await request('/data/catalog.json',{headers})).status,401);
 assert.equal((await request('/data/catalog.json',{method:'POST',headers})).status,405);
});
test('Idle and absolute expiry are enforced, and fabricated session IDs grant no access',async t=>{
 let time=0;const {request,login}=await fixture(t,{now:()=>time}),response=await login(),headers={Cookie:cookie(response)};
 assert.equal((await request('/auth/session',{headers:{Cookie:'__Host-ember_session='+'f'.repeat(64)}})).status,200);
 assert.equal((await request('/data/catalog.json',{headers:{Cookie:'__Host-ember_session='+'f'.repeat(64)}})).status,401);
 time=30*60*1000;assert.equal((await request('/data/catalog.json',{headers})).status,401);
 headers.Cookie=cookie(await login());const start=time;
 for(let i=1;i<16;i++){time=start+i*29*60*1000;assert.equal((await request('/data/catalog.json',{headers})).status,200);}
 time=start+8*60*60*1000;assert.equal((await request('/data/catalog.json',{headers})).status,401);
});
test('Cross-origin sign-in/out, malformed payloads, excessive size and repeated failures are rejected',async t=>{
 let time=0;const {request,login,config}=await fixture(t,{now:()=>time});
 assert.equal((await login('user',env.TEST_USER_PASSWORD,{Origin:'https://evil.example'})).status,403);
 assert.equal((await login('user',env.TEST_USER_PASSWORD,{'Sec-Fetch-Site':'cross-site'})).status,403);
 assert.equal((await request('/auth/logout',{method:'POST'})).status,403);
 assert.equal((await request('/auth/login')).status,405);
 assert.equal((await request('/auth/login',{method:'POST',headers:{Origin:config.origin,'Content-Type':'text/plain'},body:'bad'})).status,415);
 assert.equal((await request('/auth/login',{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json'},body:'bad'})).status,400);
 assert.equal((await login('user','x'.repeat(5000))).status,413);
 for(let i=0;i<8;i++)assert.equal((await login('admin','wrong',{'X-Forwarded-For':`10.0.0.${i}`})).status,401);
 const blocked=await login();assert.equal(blocked.status,429);assert.equal(blocked.headers.get('retry-after'),'900');
 time+=15*60*1000;assert.equal((await login()).status,200);
});
test('Local mode continues to serve existing personal-data origins without a login or password cookie',async t=>{
 const server=createAppServer(accessConfig({}));server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>server.close(r)));
 const base=`http://127.0.0.1:${server.address().port}`,session=await fetch(base+'/auth/session');
 assert.deepEqual(await session.json(),{enabled:false,role:'admin'});assert.equal(session.headers.get('set-cookie'),null);
 assert.equal((await fetch(base+'/admin.html')).status,200);
});
test('Successful participant login cannot reset the administrator guessing limit',async t=>{
 const {login}=await fixture(t);
 for(let i=0;i<8;i++)assert.equal((await login('admin','wrong')).status,401);
 assert.equal((await login()).status,200);
 for(let i=0;i<2;i++)assert.equal((await login('admin','wrong')).status,401);
 assert.equal((await login('admin',env.TEST_ADMIN_PASSWORD)).status,429);
});
