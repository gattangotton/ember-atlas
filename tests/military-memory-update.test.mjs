import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gameTreeLayout} from '../public/research-layout.js';
import {seedGameResearch} from '../public/game-masters.js';
import {planResearch,aggregateAbilities} from '../public/strategy-model.js';
import {filterMemories,newMemoryCopy,validateMemoryInventory} from '../public/memory-model.js';
import {EQUIPMENT_FILTERS,equipmentMatches} from '../public/equipment-model.js';
import {gatherKind} from '../public/gather-model.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../public/data/'+n+'.json',import.meta.url)));
const nodes=read('mechanics').research,game=read('game-masters');
test('Military II additions preserve source prerequisites, effects, exact costs, and visual links',()=>{
 const layout=gameTreeLayout(nodes,3);
 for(let i=0;i<3;i++){
  const id='research-3-'+(68+i),parent='research-3-'+(65+i),node=nodes.find(n=>n.id===id),spec=game.researchSpecs[id];
  assert.equal(node.lab,30);assert.equal(node.documentedMax,5);
  assert.deepEqual(spec.values,[2,4,8,12,20]);assert.equal(spec.requirementsKnown,true);
  assert.deepEqual(spec.requirements,[{id:parent,level:5}]);
  assert.deepEqual(game.researchCosts[id][0],[11900000,11900000,25400000,11900000,1511100]);
  assert.deepEqual(game.researchCosts[id][4],[189600000,189600000,405600000,189600000,18136800]);
  assert.ok(layout.edges.some(e=>e.from===parent&&e.to===id));
  const state={research:{[parent]:5,[id]:2}};seedGameResearch(state,game);
  assert.equal(state.research[id],2);assert.deepEqual(state.researchSpecs[id].requirements,spec.requirements);
  const plan=planResearch(nodes,state.research,state.researchSpecs,{targetId:id,targetLevel:3,useAuto:false});
  assert.equal(plan.rows.length,1);assert.equal(plan.rows[0].level,3);assert.equal(plan.complete,true);
  const ability=aggregateAbilities({nodes:[node],state}).find(a=>a.name===node.name);assert.equal(ability.total,4);
 }
});
test('Memory ability search distinguishes resource, fixed ability and registered sub, including aliases',()=>{
 const records=[{id:'food',name:'食料メモリ',mainEffects:[{name:'食料採集速度',value:5}],rarity:3},{id:'wood',name:'木材メモリ',mainEffects:[{name:'木材採集量',value:5}],rarity:3}];
 const copy=newMemoryCopy('one');copy.subs[0]={status:'set',name:'エーテル採集速度',value:2,unit:'%'};
 const inventory=validateMemoryInventory({wood:[copy]},records);
 assert.deepEqual(filterMemories(records,inventory,{ability:'食料採取速度'}).map(r=>r.id),['food']);
 assert.deepEqual(filterMemories(records,inventory,{ability:'木材採集量',scope:'main'}).map(r=>r.id),['wood']);
 assert.deepEqual(filterMemories(records,inventory,{ability:'エーテル採集速度',scope:'sub'}).map(r=>r.id),['wood']);
 assert.equal(filterMemories(records,inventory,{ability:'エーテル採集速度',scope:'main'}).length,0);
 assert.equal(filterMemories(records,inventory,{ability:'木材採集速度'}).length,0);
 assert.deepEqual(filterMemories(records,inventory,{query:'エーテル採取速度'}).map(r=>r.id),['wood']);
});
test('All resource-specific gathering options match equipment filters and gather calculations',()=>{
 for(const resource of ['食料','木材','金属','エーテル'])for(const kind of ['量','速度']){
  const name=resource+'採集'+kind;
  assert.ok(EQUIPMENT_FILTERS['採集'].includes(name));assert.equal(gatherKind(name,resource),kind);
  assert.equal(gatherKind(name,resource==='食料'?'木材':'食料'),null);
  const gear={kind:'equipment',name:'test',mainAbilities:[{name,values:[1,2,3,4,5,6]}]};
  assert.equal(equipmentMatches(gear,{abilities:[name]}),true);
 }
});
