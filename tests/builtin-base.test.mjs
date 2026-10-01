import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {seedBaseDefinitions,withBuiltinRecord} from '../public/builtin-base.js';
import {compareCoreNames,coreFamily} from '../public/core-order.js';
test('Built-in numeric definitions load on an empty profile, without personal state',()=>{
 const base=JSON.parse(fs.readFileSync(new URL('../public/data/builtin-base.json',import.meta.url)));
 assert.equal(Object.keys(base.records).length,21);for(const k of ['progress','research','profile','accounts','members','abilityUser'])assert.equal(base[k],undefined);
 const r=withBuiltinRecord({id:'characters-5fe90a499c46ce',skills:{}},base);
 assert.equal(r.skills.trigger1.effects.find(e=>e.name==='金属採集速度').values[6],50.4);
 const state={progress:{a:{owned:true}},researchSpecs:{x:{values:[9]}},patterns:[]};seedBaseDefinitions(state,{researchSpecs:{x:{values:[1]},y:{values:[2]}}});
 assert.deepEqual(state.researchSpecs.x.values,[9]);assert.deepEqual(state.researchSpecs.y.values,[2]);assert.equal(state.progress.a.owned,true);
});
test('Core ordering keeps equivalent families adjacent',()=>{
 const names=['研究速度','建設資源効率','研究資源効率','採集量','建設速度'];names.sort(compareCoreNames);
 assert.deepEqual(names.map(coreFamily),['建設','建設','研究','研究','採集']);
 const attrs=['闇属性リーダー攻撃力','火属性リーダー攻撃力','水属性リーダー攻撃力'];attrs.sort(compareCoreNames);assert.equal(attrs[0],'火属性リーダー攻撃力');
});

test('Restored common definitions validate and repeated seeding retains all named patterns',async()=>{
 const base=JSON.parse(fs.readFileSync(new URL('../public/data/builtin-base.json',import.meta.url)));
 const {validatePatterns,validateMechanics}=await import('../public/mechanics.js');
 const {validateResearchSpecs}=await import('../public/strategy-model.js');
 const nodes=JSON.parse(fs.readFileSync(new URL('../public/data/mechanics.json',import.meta.url))).research;
 assert.equal(Object.keys(base.recordOverrides).length,40);
 for(const record of Object.values(base.recordOverrides)){assert.equal(record.note,undefined);assert.equal(record.training,undefined);assert.doesNotThrow(()=>validateMechanics(record));}
 assert.equal(Object.keys(validateResearchSpecs(base.researchSpecs,nodes)).length,24);
 assert.equal(validatePatterns(base.patterns).length,13);
 const state={};seedBaseDefinitions(state,base);seedBaseDefinitions(state,base);assert.equal(state.patterns.length,13);
});
