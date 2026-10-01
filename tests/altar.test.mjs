import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BUILDINGS,validateBuildingEffects,validateBuildingProgress,buildingSources} from '../public/building-progress.js';
import {expandAltarBuildings} from '../public/building-definitions.js';
import {validateBuildingRules} from '../public/building-model.js';
test('altar levels and effects remain independent for all seven elements, preserving unassigned legacy records',()=>{
 const altars=BUILDINGS.filter(b=>b.baseId==='building-3');assert.equal(altars.length,7);
 const state={buildingProgress:validateBuildingProgress({'building-3':[7],'building-3-fire':[2],'building-3-water':[5]}),buildingEffects:validateBuildingEffects({'building-3-fire':[{name:'火属性リーダー攻撃力',unit:'%',values:Array(20).fill(10)}],'building-3-water':[{name:'水属性リーダー攻撃力',unit:'%',values:Array(20).fill(20)}]})};
 const restored=JSON.parse(JSON.stringify(state));assert.deepEqual(validateBuildingProgress(restored.buildingProgress),state.buildingProgress);
 const sources=buildingSources(restored);assert.deepEqual(sources.map(x=>[x.level,x.value]),[[2,10],[5,20]]);
 assert.throws(()=>validateBuildingProgress({'building-3-fire':[1,2]}));assert.throws(()=>validateBuildingProgress({'building-3-fire':[21]}));
 const raw=JSON.parse(fs.readFileSync(new URL('../public/data/buildings.json',import.meta.url))).buildings;
 const expanded=expandAltarBuildings(raw);assert.equal(raw.length,16);assert.equal(expanded.length,23);
 const rules={'building-3-fire:3':{status:'known',requirements:[{buildingId:'building-3-water',level:2}],note:''}};
 assert.deepEqual(validateBuildingRules(rules,expanded),rules);
});
