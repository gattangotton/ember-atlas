import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {calculateBuilding,validateBuildingCalculation} from '../public/building-calculator.js';
import {calculationControls} from '../public/research-plan-view.js';
import {seedGameBuildingEffects} from '../public/game-masters.js';
import {validateBuildingEffects,buildingSources} from '../public/building-progress.js';
import {calculateGather} from '../public/gather-model.js';
import {GATHER_DROPS,GATHER_DROP_MAX} from '../public/gather-drop-data.js';
import {validatePartySettings} from '../public/party-model.js';
const game=JSON.parse(fs.readFileSync(new URL('../public/data/game-masters.json',import.meta.url)));
test('Construction applies speed, fountain, drop, fixed acceleration and per-help minimum in order',()=>{
 const level={resources:[1000,2000,3000,4000],seconds:10000};
 const r=calculateBuilding(level,{speed:85,fountain:5,drop:10,blacksmith:true,fixed:100,support:30,efficiency:25,resourceItem:true});
 assert.equal(r.seconds,2646);assert.deepEqual(r.resources,[728,1455,2182,2910]);
 assert.equal(calculateBuilding(level,{fixed:20000,support:30}).seconds,0);
 assert.equal(calculateBuilding({...level,seconds:null,resources:[null,0,1,1000]},{}).seconds,null);
 assert.deepEqual(calculateBuilding({...level,resources:[null,0,1,1000]},{}).resources,[null,0,1,1000]);
 for(const invalid of [{support:31},{support:0.5},{drop:11},{fountain:10},{speed:NaN},{fixed:-1}])assert.throws(()=>validateBuildingCalculation(invalid));
});
test('Confirmed facility curves replace obsolete common values without changing player progress',()=>{
 assert.doesNotThrow(()=>validateBuildingEffects(game.buildingEffects));
 const progress={'building-5':[31,31],'building-15':[31]},s={buildingEffects:{'building-1':[{name:'最大部隊兵士数',unit:'人',values:[999]}]},buildingProgress:structuredClone(progress)};
 seedGameBuildingEffects(s,game);assert.deepEqual(s.buildingProgress,progress);
 assert.ok(!s.buildingEffects['building-1'].some(e=>e.name==='最大部隊兵士数'));
 assert.equal(s.buildingEffects['building-1'].find(e=>e.name==='最大防衛部隊兵士数').values.at(-1),2300000);
 assert.equal(s.buildingEffects['building-15'].find(e=>e.name==='最大病院収容兵士数').values.at(-1),285000);
 assert.equal(s.buildingEffects['building-8'].find(e=>e.name==='最大歩兵収容数').values.at(-1),3800000);
 assert.equal(buildingSources(s).filter(e=>e.ability==='拠点防衛時攻撃力').reduce((n,e)=>n+e.value,0),186);
});
test('Research and building preparations use distinct game icons',()=>{
 const c={fountain:0,support:0,drop:0},auto=Array.from({length:3},()=>({total:0,unknown:0}));
 for(const kind of ['research','building']){const html=calculationControls(c,auto,String,kind);for(const icon of [kind==='research'?'alchemist':'blacksmith',kind+'-resource']){assert.ok(html.includes('assets/research/'+icon+'.png'));assert.ok(fs.existsSync(new URL('../public/assets/research/'+icon+'.png',import.meta.url)));}}
});
test('Gather drops reach 14 for each resource, add to speed and preserve quantity',()=>{
 assert.equal(GATHER_DROP_MAX,14);
 for(const resource of ['食料','木材','金属','エーテル']){assert.ok(GATHER_DROPS.some(d=>d.name===resource+'採集速度+14%'));
  const r=calculateGather({resource,level:4,speed:100,droplet:14});
  assert.ok(Math.abs(r.seconds-21600/2.14)<1e-8);assert.equal(r.quantity,calculateGather({resource,level:4}).quantity);
 }
 const settings={battle:'field',race:'悪魔',grade:1,boss:'',tab:'hero',troop:'歩兵',attackType:'all',heroes:['','',''],memories:['','',''],base:{mode:'none'},droplet:14};
 assert.equal(validatePartySettings(settings).droplet,14);assert.throws(()=>validatePartySettings({...settings,droplet:15}));
});
