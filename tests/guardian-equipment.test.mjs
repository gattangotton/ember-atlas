import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GUARDIAN_GEAR,raidBossFor,raidBadge} from '../public/raid-data.js';
import {unlockedSlots} from '../public/mechanics.js';
import {normalizeAbilityRecord} from '../public/ability-names.js';
import {validateCopies} from '../public/equipment-inventory.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../public/data/catalog.json',import.meta.url)));
const mechanics=JSON.parse(fs.readFileSync(new URL('../public/data/mechanics.json',import.meta.url)));
test('five Guardian weapons remain non-raid, resolve by slot, and unlock third only at G6',()=>{
 const names=[];
 for(const id of GUARDIAN_GEAR){
  const base=[...catalog.records,...mechanics.extraRecords].find(r=>r.id===id);assert.ok(base);names.push(base.name);
  const r=normalizeAbilityRecord({...base,...mechanics.additions[id],raid:'yes',unlockGrades:[1,5,null]});
  assert.equal(r.raid,'no');assert.equal(raidBossFor(id),null);assert.deepEqual(r.unlockGrades,[1,5,6]);
  for(let g=0;g<=6;g++)assert.deepEqual(unlockedSlots(r,g),[g>=1,g>=5,g>=6]);
  assert.match(raidBadge(r,String),/特殊武具/);assert.doesNotMatch(raidBadge(r,String),/レイド武具/);
  const copies=[{id:'guardian-copy',grade:6,target:6,subAbilities:[null,null,{name:'攻撃力',value:3}]}];
  assert.deepEqual(validateCopies(JSON.parse(JSON.stringify(copies)),r),copies);
  assert.throws(()=>validateCopies([{...copies[0],grade:5}],r));
 }
 assert.deepEqual(names,['セルヴァンス','エレメンタルヘルム','エレメンタルアーマー','エレメンタルカリガ','神木のネックレス']);
 assert.deepEqual(unlockedSlots({id:'ordinary',raid:'no'},6),[true,true,false]);
});
