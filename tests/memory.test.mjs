import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newMemoryCopy,validateMemoryInventory,filterMemories} from '../public/memory-model.js';
const data=JSON.parse(fs.readFileSync(new URL('../public/data/game-memories.json',import.meta.url)));
test('Memory common data excludes unnamed placeholders and preserves unknown fixed effects',()=>{
 assert.equal(data.records.length,82);assert.equal(new Set(data.records.map(r=>r.id)).size,82);
 assert.equal(data.records.find(r=>r.id==='memory-10001').mainEffects[0].value,20);
 const unknown=data.records.filter(r=>!r.mainEffectsKnown);assert.deepEqual(unknown.map(r=>r.name),['忘れられし者','テンプルドラゴン']);
 for(const r of data.records){assert.ok(r.name.trim());assert.equal(r.maxSubSlots,3);assert.ok(r.mainEffects.every(e=>Number.isFinite(e.value)));}
});
test('Copies of the same memory keep independent sub abilities, zero, empty and unknown slots',()=>{
 const a=newMemoryCopy('one'),b=newMemoryCopy('two');a.label='討伐用';a.subs[0]={status:'set',name:'対魔獣攻撃力',value:0,unit:'%'};b.subs[0]={status:'set',name:'採集速度',value:5.5,unit:'%'};b.subs[1].status='empty';
 const saved=validateMemoryInventory({'memory-10001':[a,b]},data.records),restored=validateMemoryInventory(JSON.parse(JSON.stringify(saved)),data.records);
 assert.deepEqual(restored,saved);assert.equal(restored['memory-10001'][0].subs[0].value,0);assert.equal(restored['memory-10001'][1].subs[0].value,5.5);assert.equal(restored['memory-10001'][1].subs[1].status,'empty');assert.equal(restored['memory-10001'][1].subs[2].status,'unknown');
 restored['memory-10001'][0].label='変更';assert.equal(saved['memory-10001'][0].label,'討伐用');
 assert.equal(filterMemories(data.records,saved,{owned:true,query:'採集速度'}).length,1);
 assert.equal(filterMemories(data.records,saved,{owned:true,rarity:'5'}).length,0);
});
test('Invalid inventory cannot overwrite a valid memory backup',()=>{
 for(const input of [null,[],{'memory-unknown':[]},{'memory-10001':[newMemoryCopy('x'),newMemoryCopy('x')]},{'memory-10001':[{...newMemoryCopy('x'),subs:[]}]},{'memory-10001':[{...newMemoryCopy('x'),label:'a'.repeat(81)}]}])assert.throws(()=>validateMemoryInventory(input,data.records));
 const c=newMemoryCopy('ok');c.subs[0]={status:'set',name:'',unit:'%',value:10};assert.throws(()=>validateMemoryInventory({'memory-10001':[c]},data.records));
 c.subs[0].name='攻撃力';c.subs[0].value=NaN;assert.throws(()=>validateMemoryInventory({'memory-10001':[c]},data.records));
 assert.deepEqual(validateMemoryInventory({},data.records),{});
});
