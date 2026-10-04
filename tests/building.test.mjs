import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateBuildingRules,formatDuration,formatBuildingResource as formatResource,formatBuildingNumber} from '../public/building-model.js';
const d=JSON.parse(readFileSync(new URL('../public/data/buildings.json',import.meta.url))),s=JSON.parse(readFileSync(new URL('../public/data/sheets.json',import.meta.url)));
test('Facility display rounds the second decimal place without fractional zero padding',()=>{
 assert.equal(formatResource(36512030),'36.5M');assert.equal(formatResource(36750000),'36.8M');
 assert.equal(formatResource(1250),'1.3K');assert.equal(formatResource(1000),'1K');
 assert.equal(formatBuildingNumber(12.35),'12.4');assert.equal(formatBuildingNumber(12),'12');assert.equal(formatResource(null),'未確認');
});
test('Construction preserves 485 source levels, base seconds, blank resources and discrepancies',()=>{
 assert.equal(d.buildings.length,16);assert.equal(d.buildings.flatMap(b=>b.levels).length,485);
 for(const b of d.buildings)for(const l of b.levels){const row=s[l.source.sheet].find(r=>r.row===l.source.row);assert.equal(row.cells.A,b.name+l.level);assert.equal(l.seconds,typeof row.cells.B==='number'?row.cells.B:null);assert.equal(l.requirements,null);}
 const base=d.buildings.find(b=>b.name==='拠点');assert.equal(base.levels[24].resources[0],36600000);assert.equal(base.levels[24].seconds,6048000);assert.equal(base.levels[24].resources[3],null);assert.equal(base.levels[0].seconds,null);assert.ok(base.levels[1].differences.length);
 const lab=d.buildings.find(b=>b.name==='研究所');assert.deepEqual(lab.levels[30].resources,[null,null,null,null]);assert.equal(lab.levels[30].rawResources[0],159.75);
 const altar=d.buildings.find(b=>b.name==='祭壇');assert.equal(altar.levels[0].resources[0],500000);assert.equal(altar.levels[0].seconds,0);assert.equal(formatDuration(0),'0秒');assert.equal(formatDuration(null),'未確認');assert.equal(formatDuration(6048000),'70日');assert.equal(formatResource(null),'未確認');assert.equal(formatResource(0),'0');
});
test('Facility prerequisite records survive JSON roundtrip and reject invalid or cyclic dependencies',()=>{
 const r={'building-1:25':{status:'known',requirements:[{buildingId:'building-2',level:24}],note:'確認メモ'}};
 assert.deepEqual(validateBuildingRules(JSON.parse(JSON.stringify(r)),d.buildings),r);
 for(const patch of [{status:'known',requirements:[],note:''},{status:'none',requirements:r['building-1:25'].requirements,note:''},{status:'known',requirements:[{buildingId:'building-3',level:31}],note:''},{status:'known',requirements:[{buildingId:'building-1',level:25}],note:''}])assert.throws(()=>validateBuildingRules({'building-1:25':patch},d.buildings));
 assert.throws(()=>validateBuildingRules({...r,'building-2:24':{status:'known',requirements:[{buildingId:'building-1',level:25}],note:''}},d.buildings));
 assert.throws(()=>validateBuildingRules(JSON.parse('{"__proto__":{}}'),d.buildings));
});
