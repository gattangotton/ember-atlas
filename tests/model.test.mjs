import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {filterRecords,validateRecord,validateShare,buildShare,equipmentTotal} from '../public/model.js';
const {records,manifest}=JSON.parse(await readFile(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
test('Excel extraction preserves percent units and omissions',()=>{
 assert.equal(manifest.sheets.length,43);
 assert.deepEqual(manifest.counts,{characters:71,equipment:54,abilities:70});
 assert.equal(new Set(records.map(r=>r.id)).size,records.length);
 assert.equal(records.find(r=>r.name==='ニュクス').maximum,'45%');
 assert.deepEqual(records.find(r=>r.name==='クリムゾンセイバー(FFBE)').grades,[9.5,11.8,14.2,16.6,19,21.3]);
 assert.ok(records.some(r=>r.grades?.includes(null)));
});
test('Search combines ownership, element, troop, and fullwidth normalization',()=>{
 const r=records.find(r=>r.name==='ニュクス');
 assert.equal(filterRecords(records,{kind:'characters',query:'ニュクス',element:'水',troop:'歩兵'}).length,1);
 assert.equal(filterRecords(records,{kind:'characters',owned:true,progress:{[r.id]:{owned:true}}})[0].name,'ニュクス');
 assert.equal(filterRecords([{kind:'characters',name:'2B'}],{query:'２ｂ'}).length,1);
});
test('Shared snapshot excludes private notes and preferences',()=>{
 const r=records[0],payload=buildShare({id:'member-1',name:'試験',alliance:'検証'},{[r.id]:{owned:true,level:10,target:20,note:'PRIVATE'}},records);
 assert.equal(JSON.stringify(payload).includes('PRIVATE'),false);
 assert.deepEqual(validateShare(payload),payload);
});
test('Imported progress rejects malformed ranges, duplicate IDs and dangerous keys',()=>{
 const payload={type:'ember-atlas-progress',version:1,profile:{id:'member-1',name:'試験'},exportedAt:new Date().toISOString(),items:[{id:'e-1',name:'装備',kind:'equipment',owned:true,level:6,target:6}]};
 assert.equal(validateShare(payload).items.length,1);
 assert.throws(()=>validateShare({...payload,items:[{...payload.items[0],level:7}]}));
 assert.throws(()=>validateShare({...payload,items:[...payload.items,...payload.items]}));
 assert.throws(()=>validateShare({...payload,profile:{id:'__proto__',name:'bad'}}));
 assert.throws(()=>validateShare({...payload,items:[null]}));
});
test('Catalog import rejects missing names, invalid kinds, and invalid grades',()=>{
 assert.throws(()=>validateRecord({kind:'toString',name:'bad'}));
 assert.throws(()=>validateRecord({kind:'characters',name:' '}));
 assert.throws(()=>validateRecord({kind:'characters',name:'valid',id:'__proto__'}));
 assert.throws(()=>validateRecord({kind:'equipment',name:'valid',grades:[1,2,3]}));
 assert.throws(()=>validateRecord({kind:'equipment',name:'valid',grades:[1,2,3,4,5,-1]}));
 assert.equal(validateRecord({kind:'equipment',name:'valid',grades:[0,null,3,4,5,6]}).grades[0],0);
});
test('Unavailable grade never becomes a numeric zero',()=>{
 assert.equal(equipmentTotal([{id:'a',grades:[0,null]}],[{id:'a',grade:1}]),0);
 assert.equal(equipmentTotal([{id:'a',grades:[0,null]}],[{id:'a',grade:2}]),null);
});
