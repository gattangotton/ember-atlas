import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {gameBuildingRules,prerequisiteStatus} from '../public/building-prerequisites.js';
import {validateBuildingRules} from '../public/building-model.js';
const game=JSON.parse(fs.readFileSync(new URL('../public/data/game-masters.json',import.meta.url)));
test('All game building requirements resolve to valid facilities and levels without cycles',()=>{
 const rules=gameBuildingRules(game),buildings=Object.entries(game.buildings).map(([id,b])=>({id,levels:b.levels}));
 assert.equal(Object.keys(rules).length,buildings.reduce((n,b)=>n+b.levels.length,0));assert.doesNotThrow(()=>validateBuildingRules(rules,buildings));
 assert.deepEqual(rules['building-1:1'].requirements,[]);
 assert.deepEqual(rules['building-1:26'].requirements,[{buildingId:'building-8',level:25},{buildingId:'building-2',level:25}]);
});
test('Multiple copies satisfy a facility requirement when at least one reaches the level',()=>{const r={buildingId:'building-11',level:10};assert.deepEqual(prerequisiteStatus(r,{'building-11':[1,9,10]}),{current:10,met:true});assert.equal(prerequisiteStatus(r,{}).met,false);});
test('Unknown condition types stay unknown instead of being treated as no prerequisites',()=>{const g=structuredClone(game);g.buildings['building-1'].levels[0].requirements=[{'-1':999,0:1,1:1}];assert.equal(gameBuildingRules(g)['building-1:1'],undefined);});
