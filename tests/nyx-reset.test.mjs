import test from 'node:test';
import assert from 'node:assert/strict';
import {migrateNyxValues,NYX_RESET_KEY} from '../public/nyx-reset.js';
test('Nyx correction survives reload, preserves player data and runs once per browser',()=>{
 const original={overrides:{nyx:{id:'nyx',name:'ニュクス',skills:{old:true},coreEffects:[]},other:{skills:{keep:true}}},progress:{nyx:{owned:true,skills:{charge:7},note:'維持'}}};
 const state=structuredClone(original),map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 let saved;
 assert.equal(migrateNyxValues(state,'nyx',storage,()=>{saved=JSON.stringify(state);return true;}),true);
 assert.deepEqual(JSON.parse(map.get(NYX_RESET_KEY+'-backup')).state,original);
 const reloaded=JSON.parse(saved);
 assert.equal(reloaded.overrides.nyx.skills,undefined);assert.equal(reloaded.overrides.nyx.coreEffects,undefined);
 assert.deepEqual(reloaded.progress,original.progress);assert.deepEqual(reloaded.overrides.other,original.overrides.other);
 reloaded.overrides.nyx.skills={later:true};
 assert.equal(migrateNyxValues(reloaded,'nyx',storage,()=>assert.fail('second save')),false);
 assert.deepEqual(reloaded.overrides.nyx.skills,{later:true});
});
