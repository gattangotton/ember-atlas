import test from 'node:test';
import assert from 'node:assert/strict';
import {SKILLS,coreStage,coreEffects,coreThresholds} from '../public/mechanics.js';
import {aggregateAbilities} from '../public/strategy-model.js';
const skillsFor=total=>Object.fromEntries(Object.entries(SKILLS).map(([key,s])=>{const n=Math.min(total,s.max);total-=n;return [key,n];}));
test('Starting rarity controls all unlock boundaries, including ownership and MAX',()=>{
 for(const rarity of ['☆3','☆4','☆３','☆４']){
  const r={rarity};assert.deepEqual(coreThresholds(r),[10,15,20,25,30]);
  for(const [total,stage] of [[0,0],[9,0],[10,1],[14,1],[15,2],[19,2],[20,3],[24,3],[25,4],[29,4],[30,5],[33,5]]){
   assert.equal(coreStage(true,skillsFor(total),r),stage);
   assert.equal(coreStage(false,skillsFor(total),r),0);
   assert.equal(coreStage(true,skillsFor(total),{rarity:'☆5'}),stage+1);
  }
 }
});
test('Legacy maximum-only values belong to V for lower rarity without mutating stored data',()=>{
 const r={rarity:'☆3',ability:'研究速度',maximum:'8%',coreEffects:[{name:'研究速度',unit:'%',values:[null,null,null,null,null,8]}]};
 assert.deepEqual(coreEffects(r)[0].values,[null,null,null,null,8,null]);
 assert.equal(r.coreEffects[0].values[5],8);
 assert.deepEqual(coreEffects({...r,coreEffects:undefined})[0].values,[null,null,null,null,8,null]);
 assert.deepEqual(coreEffects({...r,coreEffects:[{values:[1,2,3,4,5,null]}]})[0].values,[1,2,3,4,5,null]);
});
test('Base ability totals use the unlocked lower-rarity stage, zero until total ten',()=>{
 const record={id:'low',kind:'characters',rarity:'☆4',name:'test',coreEffects:[{name:'研究速度',unit:'%',values:[2,4,6,8,10,null]}]};
 for(const [total,value] of [[0,0],[9,0],[10,2],[15,4],[30,10],[33,10]]){
  const groups=aggregateAbilities({records:[record],state:{progress:{low:{owned:true,skills:skillsFor(total)}}}});
  assert.equal(groups.find(g=>g.name==='研究速度').total,value);
 }
});
