import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGoalCandidates,mergePackages,recommendGoalPlans,subAbilityHeadroom} from '../public/goal-planner.js';
import {simulateLoadout} from '../public/loadout-model.js';
import {isNew,newBadge,routeNewBadge,NEW_DURATION_MS} from '../public/whats-new.js';
import {applyGameWorld} from '../public/game-masters.js';
import {expandAltarBuildings} from '../public/building-definitions.js';

const context={mode:'loot',race:'悪魔',battle:'field'};
const node=(id,values,cost=100)=>({id,name:id,group:'討伐①',lab:0,documentedMax:values.length,levels:values.map(()=>[cost,0,0,0,cost])});
const spec=(values,requirements=[])=>({ability:'対悪魔素材倍化率',unit:'%',values,requirementsKnown:true,requirements});
test('NEW expires at exactly fourteen days in Japan time, independently for releases',()=>{
 const start=Date.parse('2026-10-17T00:00:00+09:00');
 assert.equal(isNew('2026-10-17',start-1),false);assert.equal(isNew('2026-10-17',start),true);
 assert.match(newBadge('2026-10-17',start+NEW_DURATION_MS-1),/NEW/);
 assert.equal(newBadge('2026-10-17',start+NEW_DURATION_MS),'');
 assert.equal(isNew('bad',start),false);
 const now=Date.parse('2026-11-01T00:00:00+09:00');assert.equal(routeNewBadge('characters',now),'');assert.match(routeNewBadge('loot',now),/NEW/);
});
test('shared prerequisites and alternate levels are charged and counted once; current progress is subtracted',()=>{
 const args={context,nodes:[node('a',[2,5]),node('b',[10]),node('c',[20])],state:{research:{a:1},researchSpecs:{a:spec([2,5]),b:spec([10],[{id:'a',level:2}]),c:spec([20],[{id:'a',level:2}])}}};
 const before=structuredClone(args),{candidates}=createGoalCandidates(args),b=candidates.find(c=>c.id==='research:b:1'),c=candidates.find(c=>c.id==='research:c:1');
 assert.equal(b.gain,13);const merged=mergePackages([b,c,candidates.find(c=>c.id==='research:a:2')]);
 assert.equal(merged.gain,33);assert.deepEqual(merged.totals,[300,0,0,0,300]);assert.deepEqual(args,before);
 const projected={...args.state,research:{a:2,b:1,c:1}};
 assert.equal(simulateLoadout({...args,state:projected}).total-simulateLoadout(args).total,merged.gain);
});
test('time and resource priorities find different combinations and impossible goals retain a shortage',()=>{
 const make=(id,gain,resource,seconds)=>({...mergePackages([{effects:{[id]:{level:1,gain,label:id}},costs:{[id]:[resource,0,0,0,seconds]},warnings:[]}]),id});
 const cs=[make('fast',10,1000,1),make('cheap',10,1,1000),make('unknown',50,null,null)];
 const plans=recommendGoalPlans(cs,10);assert.deepEqual(plans[0].selected,['fast']);assert.deepEqual(plans[1].selected,['cheap']);
 const impossible=recommendGoalPlans(cs.slice(0,2),100);assert.equal(impossible[0].remaining,80);assert.equal(impossible[0].reached,false);
 assert.equal(recommendGoalPlans(cs,0)[0].gain,0);
});
test('unknown current effects are not treated as zero; manual or excluded base adds no base candidates',()=>{
 const args={context,nodes:[node('a',[null,10])],state:{research:{a:1},researchSpecs:{a:spec([null,10])}}};
 assert.equal(createGoalCandidates(args).candidates.length,0);assert.equal(createGoalCandidates(args).omitted.length,1);
 assert.equal(createGoalCandidates({...args,base:{mode:'manual'}}).candidates.length,0);
 assert.equal(createGoalCandidates({...args,base:{mode:'auto',research:false}}).candidates.length,0);
});
test('building plans include prerequisite levels and only incremental effects with existing speed',()=>{
 const effects=[{name:'対悪魔素材倍化率',unit:'%',values:[2,5]}];
 const buildings={buildings:[{id:'building-1',name:'拠点',levels:[{level:1,resources:[10,0,0,0],seconds:100}]},{id:'building-2',name:'研究所',levels:[{level:1,resources:[20,0,0,0],seconds:100},{level:2,resources:[30,0,0,0],seconds:100}]}],rules:{'building-1:1':{status:'none'},'building-2:1':{status:'none'},'building-2:2':{status:'known',requirements:[{buildingId:'building-1',level:1}]}}};
 const args={context,state:{buildingProgress:{'building-2':[1]},buildingEffects:{'building-2':effects},abilityUser:{extras:[{id:'speed',ability:'建設速度',unit:'%',kind:'その他',value:100,acquired:true}]}}};
 const c=createGoalCandidates(args,{buildings}).candidates.find(c=>c.id==='building:building-2:0:2');assert.equal(c.gain,3);assert.deepEqual(c.totals,[40,0,0,0,100]);assert.equal(c.uncertain,0);
});
test('sub references distinguish known values, unknown slots, other grades, and material doubling on equipment',()=>{
 const m={record:{name:'M'},copy:{subs:[{status:'empty'},{status:'empty'},{status:'set',name:'対悪魔素材倍化率',value:10,unit:'%'}]}};
 assert.equal(subAbilityHeadroom({context,memories:[m]})[0].headroom,4.3);
 m.copy.subs[2]={status:'unknown'};assert.equal(subAbilityHeadroom({context,memories:[m]})[0].headroom,null);
 const gear={record:{name:'G',power:13000},owned:true,grade:1,subAbilities:[{name:'対悪魔攻撃力',value:90}]};
 assert.equal(subAbilityHeadroom({context:{...context,mode:'attack'},gear:[gear]})[0].headroom,23);
 assert.equal(subAbilityHeadroom({context:{...context,mode:'attack'},gear:[{...gear,grade:2}]})[0].headroom,null);
 assert.equal(subAbilityHeadroom({context,gear:[gear]}).length,0);
});
test('shipped research and building data produce finite plans without changing data',()=>{
 const read=n=>JSON.parse(fs.readFileSync(new URL('../public/data/'+n+'.json',import.meta.url)));
 const mechanics=read('mechanics'),buildings=read('buildings'),game=read('game-masters');buildings.buildings=expandAltarBuildings(buildings.buildings);applyGameWorld(mechanics,buildings,game);
 const args={context,nodes:mechanics.research,state:{research:{},researchSpecs:game.researchSpecs,buildingEffects:game.buildingEffects}};
 const {candidates}=createGoalCandidates(args,{buildings});assert.ok(candidates.length>0);const plans=recommendGoalPlans(candidates,100);
 for(const p of plans){assert.ok(Number.isFinite(p.gain));assert.ok(p.totals.every(Number.isFinite));assert.equal(new Set(Object.keys(p.costs)).size,Object.keys(p.costs).length);}
});
