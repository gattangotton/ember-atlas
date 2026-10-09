import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {decodeMessagePack} from '../tools/read-messagepack.mjs';
import {withGameEquipment,seedGameResearch,gameEquipmentOverride} from '../public/game-masters.js';
import {seedBaseDefinitions,withBuiltinRecord} from '../public/builtin-base.js';
import {validateMechanics} from '../public/mechanics.js';
import {aggregateAbilities,validateResearchSpecs,researchSpec} from '../public/strategy-model.js';
import {abilityName} from '../public/ability-names.js';
const json=name=>JSON.parse(fs.readFileSync(new URL('../public/data/'+name+'.json',import.meta.url)));
const data=json('game-masters'),base=json('builtin-base'),mechanics=json('mechanics'),catalog=json('catalog');

test('All ten previously missing gear records have source values, slot and original images',()=>{
 const images=json('game-images');
 for(const masterId of [51,50041,50044,50051,50055,50061,50062,50063,50091,50201]){
  const id='equipment-pc-'+masterId,r=data.extraRecords.find(r=>r.id===id),source=data.equipment[id];
  assert.ok(r);assert.equal(source.masterId,masterId);assert.equal(source.slot,r.slot);
  assert.ok(source.powerGrades.every(Number.isFinite));assert.ok(source.mainAbilities.every(a=>a.values.every(Number.isFinite)));
  assert.ok(fs.existsSync(new URL('../public/'+images.equipment[id],import.meta.url)));
 }
 assert.ok(Object.keys(data.buildings).length>0);assert.equal(Object.keys(data.researchCosts).length,422);
});

test('October event equipment preserves six source grades, slots and the standard two sub slots',async()=>{
 const {unlockedSlots}=await import('../public/mechanics.js');
 assert.deepEqual(data.extraRecords.filter(r=>Number(r.id.split("-").at(-1))>=50601).map(r=>r.name),['スイートスケアリー','ナイトメアロッド','紅月のイヤーカフ']);
 assert.deepEqual(data.extraRecords.filter(r=>Number(r.id.split("-").at(-1))>=50601).map(r=>r.slot),['武器','武器','装飾']);
 for(const r of data.extraRecords){assert.deepEqual(unlockedSlots(r,6),[true,true,false]);assert.equal(data.equipment[r.id].powerGrades.length,6);assert.ok(data.equipment[r.id].mainAbilities.every(a=>a.values.length===6&&a.values.every(Number.isFinite)));}
 const sweet=data.equipment['equipment-pc-50601'];assert.deepEqual(sweet.powerGrades,[11500,14375,17250,20125,23000,25875]);assert.deepEqual(sweet.mainAbilities.find(a=>a.name==='光属性リーダー攻撃力').values,[23.5,29.38,35.25,41.13,47,52.88]);
});

test('All existing equipment and research IDs map uniquely to local masters',()=>{
 const equipment=[...catalog.records,...mechanics.extraRecords,...data.extraRecords].filter(r=>r.kind==='equipment');
 assert.equal(equipment.length,207);assert.deepEqual(new Set(Object.keys(data.equipment)),new Set(equipment.map(r=>r.id)));
 assert.equal(new Set(Object.values(data.equipment).map(e=>e.masterId)).size,207);
 assert.deepEqual(new Set(Object.keys(data.researchMapping)),new Set(mechanics.research.map(r=>r.id)));
 assert.equal(new Set(Object.values(data.researchMapping).map(r=>r.groupId+':'+r.masterId)).size,422);
 assert.equal(Object.keys(validateResearchSpecs(data.researchSpecs,mechanics.research)).length,404);
 for(const e of Object.values(data.equipment))assert.doesNotThrow(()=>validateMechanics(e));
 for(const [id,mapping] of Object.entries(data.researchMapping))if(mapping.kind==='unlock')assert.equal(data.researchSpecs[id],undefined);
});

test('Every equipment uses audited sub-slot unlocks, including Malacoda Ring',async()=>{
 const {unlockedSlots}=await import('../public/mechanics.js');
 const {normalizeAbilityRecord}=await import('../public/ability-names.js');
 for(const [id,master] of Object.entries(data.equipment)){
  const r=normalizeAbilityRecord(withGameEquipment({id,kind:'equipment'},data));
  for(let grade=1;grade<=6;grade++)assert.deepEqual(unlockedSlots(r,grade),master.unlockGrades.map(g=>g!==null&&grade>=g),master.name+' G'+grade);
 }
 assert.deepEqual(unlockedSlots(withGameEquipment({id:'equipment-d1b910cf47b734',kind:'equipment'},data),6),[true,true,true]);
});

test('Independent known values anchor percent scale and cumulative level interpretation',()=>{
 assert.deepEqual(data.researchSpecs['research-0-3'].values,[1,2,4,6,10]);
 const stat=mechanics.research.find(n=>n.group==='軍事②'&&n.lab===21&&n.name==='上級歩兵基礎攻撃力');
 assert.equal(data.researchSpecs[stat.id].unit,'');assert.deepEqual(data.researchSpecs[stat.id].values,[3,5,9,13,21]);
 const sword=Object.values(data.equipment).find(e=>e.name==='エクスカリバー(FFBE)');
 assert.deepEqual(sword.mainAbilities.find(a=>a.name==='攻撃力').values,[37.5,46.88,56.25,65.63,75,84.38]);
 assert.deepEqual(sword.powerGrades,[12000,15000,18000,21000,24000,27000]);
 const fiveGrades=Object.values(data.equipment).find(e=>e.name==='アルテマウェポン(FF9)');
 assert.equal(fiveGrades.powerGrades[5],null);assert.ok(fiveGrades.mainAbilities.every(a=>a.values[5]===null));
});

test('New profiles receive all values, corrected units, and corrected legacy seed values',()=>{
 const state={progress:{owned:{owned:true}},research:{'research-0-3':5}};
 const before=structuredClone(state);seedBaseDefinitions(state,base);seedGameResearch(state,data,base.researchSpecs);
 for(const [id,s] of Object.entries(data.researchSpecs)){assert.deepEqual(state.researchSpecs[id].values,s.values);assert.equal(state.researchSpecs[id].unit,s.unit);}
 assert.equal(state.researchSpecs['research-0-18'].values[4],15);
 assert.equal(state.researchSpecs['research-0-6'].unit,'%');
 assert.deepEqual(state.progress,before.progress);assert.deepEqual(state.research,before.research);
 const seeded=structuredClone(state);seedBaseDefinitions(state,base);seedGameResearch(state,data,base.researchSpecs);assert.deepEqual(state,seeded);
 const sums=aggregateAbilities({nodes:[mechanics.research[0]],state,evidence:{}});
 assert.equal(sums.find(s=>s.name==='建設速度').total,10);
});

test('Edited research values, prerequisites, notes and per-player progress survive seeding',()=>{
 const id='research-0-3';const custom={...structuredClone(data.researchSpecs[id]),values:[9,null,4,6,10],requirementsKnown:true,requirements:[{id:'research-0-4',level:1}],note:'手動メモ'};
 const state={researchSpecs:{[id]:custom},accounts:[{research:{[id]:2}}]};seedGameResearch(state,data,base.researchSpecs);
 assert.deepEqual(state.researchSpecs[id].values,[9,2,4,6,10]);assert.ok(state.researchSpecs[id].note.startsWith('手動メモ'));
 assert.deepEqual(state.researchSpecs[id].requirements,custom.requirements);assert.equal(state.researchSpecs[id].requirementsKnown,true);
 assert.equal(state.accounts[0].research[id],2);
 const other={...structuredClone(custom),ability:'別の効果',unit:'秒'};state.researchSpecs[id]=other;seedGameResearch(state,data,base.researchSpecs);assert.deepEqual(state.researchSpecs[id],other);
 const node=mechanics.research[0];assert.equal(researchSpec(node,{}, {specs:data.researchSpecs}).values[4],10);
});

test('Common equipment values override old built-in patterns and remain below manual edits',()=>{
 const row=[...catalog.records,...mechanics.extraRecords].find(r=>r.id==='equipment-7bbdc1430f3b3a');
 const original={...row,...mechanics.additions[row.id]},merged=withGameEquipment(withBuiltinRecord(original,base),data);
 assert.equal(merged.mainAbilities.find(a=>abilityName(a.name)==='攻撃力').values[5],84.38);
 const manual={mainAbilities:[{name:'手動',unit:'%',values:[1,2,3,4,5,6]}]};
 assert.deepEqual({...merged,...manual}.mainAbilities,manual.mainAbilities);
 merged.mainAbilities[0].values[0]=999;assert.notEqual(data.equipment[row.id].mainAbilities[0].values[0],999);
 assert.deepEqual(withGameEquipment({id:row.id,kind:'characters'},data),{id:row.id,kind:'characters'});
});

test('MessagePack reader rejects truncated/trailing data and preserves typed maps and timestamps',()=>{
 assert.deepEqual(decodeMessagePack(Buffer.from('9282000701a3616263d6ff683b9800','hex')),[{'0':7,'1':'abc'},{extension:-1,hex:'683b9800'}]);
 assert.throws(()=>decodeMessagePack(Buffer.from('d90261','hex')));
 assert.throws(()=>decodeMessagePack(Buffer.from('0102','hex')));
 assert.throws(()=>decodeMessagePack(Buffer.from('8201010102','hex')));
});

test('Sparse saved G5/G6 equipment overrides inherit missing grades while retaining entered values',()=>{
 const id='equipment-7bbdc1430f3b3a',original={mainAbilities:[{name:'攻撃力',unit:'%',values:[null,null,null,null,75,84.3]}],powerGrades:[12000,null,null,null,24000,27000]};
 const before=structuredClone(original),merged=gameEquipmentOverride(id,original,data);
 assert.deepEqual(merged.mainAbilities[0].values,[37.5,46.88,56.25,65.63,75,84.3]);
 assert.deepEqual(merged.powerGrades,[12000,15000,18000,21000,24000,27000]);
 assert.deepEqual(original,before);
 original.mainAbilities[0].values[0]=0;assert.equal(gameEquipmentOverride(id,original,data).mainAbilities[0].values[0],0);
 assert.deepEqual(gameEquipmentOverride(id,{mainAbilities:[]},data).mainAbilities,[]);
});
