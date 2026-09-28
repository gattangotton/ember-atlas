import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validateFoundation,seedFoundations,applyFoundation} from '../public/foundation-model.js';
import {validateRecord} from '../public/model.js';
import {coreStage,inferCharge,validateMechanics} from '../public/mechanics.js';
const read=async f=>JSON.parse(await readFile(new URL('../public/data/'+f,import.meta.url),'utf8'));
const catalog=await read('catalog.json'),mechanics=await read('mechanics.json');
const records=catalog.records.map(r=>({...r,...mechanics.additions[r.id]}));
test('Screenshot states retain independently indexed upgrade values through catalog round trip',()=>{
 for(const [name,powers] of [['ステラ',[1400,2800,4200]],['エプレ',[1400,2800]]]){
  const r=validateRecord(records.find(r=>r.kind==='characters'&&r.name===name));
  assert.deepEqual(r.skills.charge.variants.map(v=>v.effects[0].values[6]),powers);
  assert.ok(r.skills.charge.variants.every(v=>v.effects[0].values.slice(0,6).every(x=>x===null)));
  assert.deepEqual(validateRecord(JSON.parse(JSON.stringify(r))),r);
 }
 assert.equal(coreStage(true,{charge:7,active:5,trigger1:7,trigger2:7,trigger3:4}),6);
});
test('Reusable data can be seeded, validated, copied to a compatible slot and edited independently',()=>{
 const seeded=seedFoundations(records);assert.ok(seeded.some(t=>t.type==='trigger'));assert.ok(seeded.some(t=>t.type==='core'));
 const template={id:'base-test',name:'溜めテスト',type:'active',spec:{...inferCharge(),variants:[1,2,3].map(n=>({name:'溜めLv'+n,condition:'状態'+n,effects:[{name:'威力',unit:'',values:[null,null,null,null,n*100]}]}))}};
 const validated=validateFoundation([template]);assert.deepEqual(validateFoundation(JSON.parse(JSON.stringify(validated))),validated);
 const original=records.find(r=>r.kind==='characters'),result=applyFoundation(original,template,'active');
 result.skills.active.variants[0].effects[0].values[4]=999;
 assert.equal(template.spec.variants[0].effects[0].values[4],100);
 assert.throws(()=>applyFoundation(original,template,'charge'));
 assert.throws(()=>validateFoundation([{...template,spec:undefined}]));
 assert.throws(()=>validateFoundation([{...template,type:'core',spec:{}}]));
 assert.throws(()=>validateFoundation([template,template]));
 assert.throws(()=>validateMechanics({skills:{active:{...template.spec,variants:[{name:'bad',effects:[{name:'bad',values:[1,2,3]}]}]}}}));
});
