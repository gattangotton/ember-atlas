import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=(await readFile(new URL('../public/session-ui.js',import.meta.url),'utf8')).replace(/^import .*;\r?\n/gm,'').replace('export async function','async function');
function setup(search,session){
 const calls=[],redirects=[];
 const ctx=vm.createContext({URLSearchParams,Error,cloudConfig:{enabled:true},cloudApi:async action=>{calls.push(action);return session;},setCsrf(){},setIdentity(){},location:{search,replace:x=>redirects.push(x)},document:{addEventListener(){},querySelector:()=>({})}});
 vm.runInContext(source,ctx);
 return {run:admin=>ctx.initializeSession(admin),calls,redirects};
}
test('explicit guest mode works without calling Auth or any cloud API',async()=>{
 const f=setup('?mode=guest',null);const s=await f.run(false);
 assert.equal(s.guest,true);assert.equal(s.cloud,false);assert.equal(s.role,'user');assert.deepEqual(f.calls,[]);
});
test('guest parameter cannot bypass the administrator login',async()=>{
 const f=setup('?mode=guest',{user:null});await assert.rejects(f.run(true),/Login required/);
 assert.deepEqual(f.calls,['session']);assert.deepEqual(f.redirects,['./cloud-login.html']);
});
test('ordinary access still requires login and authenticated access keeps cloud persistence',async()=>{
 const no=setup('',{user:null});await assert.rejects(no.run(false),/Login required/);
 const yes=setup('',{enabled:true,user:{id:'a',site_admin:false}});assert.equal((await yes.run(false)).cloud,true);
 const admin=setup('?mode=guest',{user:{id:'a',site_admin:false}});await assert.rejects(admin.run(true),/Administrator required/);
});
