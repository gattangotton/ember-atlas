import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CONSUMABLES,RESOURCE_BOXES} from '../public/consumable-data.js';
import {allocateResourceBoxes,boxResourceTotals,validateConsumableStock,consumableTotals,consumableBalance,reverseSpeedups,importConsumableEstimate} from '../public/consumable-model.js';
import {estimateView} from '../public/research-plan-view.js';
import {calculateBuilding} from '../public/building-calculator.js';
import {consumableEstimateButton} from '../public/consumable-link.js';
test('Game consumables have unique IDs, valid game icons and 4 resources / 5 speed types',()=>{
 assert.equal(CONSUMABLES.length,105);assert.equal(new Set(CONSUMABLES.map(i=>i.id)).size,105);
 for(const kind of ['food','wood','metal','ether'])assert.equal(CONSUMABLES.filter(i=>i.kind===kind).length,17);
 for(const kind of ['building','research','training','healing'])assert.equal(CONSUMABLES.filter(i=>i.kind===kind).length,6);
 assert.equal(CONSUMABLES.filter(i=>i.kind==='universal').length,13);
 for(const i of CONSUMABLES)assert.ok(fs.existsSync(new URL('../public/'+i.image,import.meta.url)));
});
test('Resources count each denomination and loose resources once, without mixing kinds',()=>{
 const s={counts:{101:3,111:2,212:4,317:1,401:1},loose:{food:250000},resources:{food:3000000,wood:5000000,ether:501}};
 const before=structuredClone(s),t=consumableTotals(s),b=consumableBalance(s);
 assert.deepEqual(t.resources,{food:2251500,wood:6000000,metal:20000000,ether:500});
 assert.equal(b.resources.food.shortfall,748500);assert.equal(b.resources.wood.shortfall,0);assert.equal(b.resources.ether.shortfall,1);assert.deepEqual(s,before);
});
test('Dedicated speedups never leak into other types; universal is added once on demand',()=>{
 const s={counts:{1009:2,1106:3,1202:12,1301:2,1406:4},kind:'research',seconds:{research:3*86400},includeUniversal:true};
 assert.deepEqual(consumableTotals(s).seconds,{building:10800,research:3600,training:120,healing:14400,universal:172800});
 assert.equal(consumableBalance(s).speed.available,176400);assert.equal(consumableBalance(s).speed.shortfall,82800);
 assert.equal(consumableBalance({...s,includeUniversal:false}).speed.available,3600);
 assert.equal(consumableBalance({...s,kind:'universal'}).speed.available,172800);
});
test('Reverse quantities ceil fractional items, distinguish whole target and shortfall, never go negative',()=>{
 const s={kind:'building',seconds:{building:86401},counts:{1106:1},includeUniversal:false},r=reverseSpeedups(s);
 assert.equal(r.find(r=>r.seconds===60).forTarget,1441);assert.equal(r.find(r=>r.seconds===300).forTarget,289);
 assert.equal(r.find(r=>r.seconds===300).forShortfall,277);assert.equal(r.find(r=>r.seconds===300).excess,299);
 assert.equal(reverseSpeedups({kind:'research'})[0].forTarget,0);
 assert.ok(reverseSpeedups({...s,seconds:{building:1},counts:{1106:1}}).every(r=>r.forShortfall===0));
 assert.equal(r.length,6);assert.equal(reverseSpeedups({...s,includeUniversal:true}).length,13);
});
test('Invalid counts and oversized numbers cannot enter backup/profile state',()=>{
 for(const s of [{counts:{101:-1}},{counts:{101:1.1}},{counts:{101:Infinity}},{counts:{101:1000001}},{counts:{999999:1}},{resources:{food:NaN}},{seconds:{building:-1}},{kind:'other'},{includeUniversal:1},{counts:[]},{source:{kind:'building',label:'test',at:'invalid'}}])assert.throws(()=>validateConsumableStock(s));
 const s=validateConsumableStock({counts:{101:1000000,117:1000000}});assert.ok(Number.isSafeInteger(consumableTotals(s).resources.food));assert.deepEqual(validateConsumableStock(JSON.parse(JSON.stringify(s))),s);
 assert.deepEqual(validateConsumableStock().counts,{});
});
test('Estimate import preserves stock and other speed goals, replaces resources and keeps an exact second target',()=>{
 const input={counts:{1106:3},loose:{food:5},resources:{food:99},seconds:{research:7200}},before=structuredClone(input);
 const s=importConsumableEstimate(input,{kind:'building',resources:[1,2,3,4],seconds:3601,label:'拠点 Lv.2'},'2026-10-07T00:00:00Z');
 assert.deepEqual(s.counts,{1106:3});assert.deepEqual(s.loose,{food:5});assert.deepEqual(s.resources,{food:1,wood:2,metal:3,ether:4});assert.deepEqual(s.seconds,{building:3601,research:7200});assert.equal(s.kind,'building');assert.deepEqual(input,before);
 assert.throws(()=>importConsumableEstimate(s,{kind:'building',resources:[null,2,3,4],seconds:3601,label:'未確認'}));
});
test('Research link transfers post-item resource costs and post-support times; unknown estimates are disabled',()=>{
 const r={rows:[{name:'研究速度',lab:1,level:2,resources:[110,220,0,0],seconds:7201}],totals:[110,220,0,0,7201],missing:[0,0,0,0,0]},c={resourceItem:true,useAuto:false,speed:0,efficiency:0,fixed:0,fountain:0,support:0};
 const html=estimateView(r,c,[{},{},{}],s=>String(s).replaceAll('"','&quot;'));
 const payload=JSON.parse(html.match(/data-consumable-estimate="([^"]*)"/)[1].replaceAll('&quot;','"'));
 assert.deepEqual(payload.resources,[100,200,0,0]);assert.equal(payload.seconds,7201);
 assert.match(estimateView({...r,missing:[1,0,0,0,0]},c,[{},{},{}],s=>s),/data-consumable-estimate=.* disabled/);
 const b=calculateBuilding({resources:[110,220,0,0],seconds:7200},{speed:100,resourceItem:true});
 const link=consumableEstimateButton({...b,kind:'building',label:'拠点'},s=>s);assert.match(link,/"seconds":3600/);assert.deepEqual(b.resources,[100,200,0,0]);
});

test('G3/G4 choice boxes resolve game rewards, count only allocated resources and never duplicate stock',()=>{
 assert.deepEqual(RESOURCE_BOXES.map(b=>b.choices.map(c=>c.value)),[[500000,500000,500000,250000],[1000000,1000000,1000000,500000]]);
 const s={boxes:{13013:{count:5,allocations:{food:2,ether:1}},13014:{count:2,allocations:{wood:1}}},resources:{food:1500000,wood:1000000,ether:500000}};
 assert.deepEqual(consumableTotals(s).resources,{food:0,wood:0,metal:0,ether:0});
 assert.deepEqual(boxResourceTotals(s),{food:1000000,wood:1000000,metal:0,ether:250000});
 assert.equal(consumableBalance(s).resources.food.shortfall,500000);
 assert.equal(consumableBalance(s).resources.wood.shortfall,0);
 assert.throws(()=>validateConsumableStock({boxes:{13013:{count:1,allocations:{food:1,wood:1}}}}));
 assert.throws(()=>validateConsumableStock({boxes:{13013:{count:1,allocations:{food:.5}}}}));
 assert.throws(()=>validateConsumableStock({boxes:{13099:{count:1}}}));
 assert.deepEqual(boxResourceTotals({boxes:{13013:{count:99,allocations:{}}}}),{food:0,wood:0,metal:0,ether:0});
});
test('Automatic BOX suggestion respects budgets, targets, ether yield and leaves unneeded boxes unallocated',()=>{
 const s={counts:{111:1},resources:{food:1500000,wood:1000000,ether:250000},boxes:{13013:{count:3,allocations:{}},13014:{count:2,allocations:{food:1}}}},before=structuredClone(s),plan=allocateResourceBoxes(s);
 assert.deepEqual(s,before);assert.deepEqual(plan.boxes,{13013:{count:3,allocations:{food:1,ether:1}},13014:{count:2,allocations:{wood:1}}});
 assert.ok(Object.values(consumableBalance(plan).resources).every(r=>r.shortfall===0));
 assert.equal(Object.values(allocateResourceBoxes({...s,resources:{}}).boxes).reduce((n,b)=>n+Object.values(b.allocations).reduce((a,b)=>a+b,0),0),0);
 const large=allocateResourceBoxes({resources:{food:1e15,wood:1e15},boxes:{13013:{count:1e6},13014:{count:1e6}}});
 for(const b of Object.values(large.boxes))assert.ok(Object.values(b.allocations).reduce((a,b)=>a+b,0)<=b.count);
 assert.deepEqual(validateConsumableStock(JSON.parse(JSON.stringify(plan))),plan);
});

test('Item visibility migrates owned stock, preserves zero-count choices and protects nonzero inventory',()=>{
 const before={counts:{'111':2,'101':0}};
 const migrated=validateConsumableStock(before);
 assert.deepEqual(migrated.selectedItems,['111']);
 assert.deepEqual(before,{counts:{'111':2,'101':0}});
 const selected=validateConsumableStock({...migrated,selectedItems:['101','101']});
 assert.deepEqual(selected.selectedItems,['101','111']);
 assert.deepEqual(consumableTotals(selected),consumableTotals(before));
 assert.deepEqual(validateConsumableStock(JSON.parse(JSON.stringify(selected))),selected);
 assert.deepEqual(validateConsumableStock({counts:{'111':0},selectedItems:[]}).selectedItems,[]);
 for(const selectedItems of ['111',['missing'],[111],Array(106).fill('111')])assert.throws(()=>validateConsumableStock({selectedItems}));
});
