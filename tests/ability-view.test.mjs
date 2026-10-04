import test from 'node:test';
import assert from 'node:assert/strict';
import {abilityOverview,abilityDelta,groupAbilitySources,needsAbilityReview} from '../public/ability-view-model.js';
import {aggregateAbilities} from '../public/strategy-model.js';

test('Compact ability pages include every matching item exactly once and clamp stale page numbers',()=>{
 const rows=Array.from({length:43},(_,i)=>({key:String(i),name:`効果${i}`,category:'軍事',total:0,unknown:0,sources:[]}));
 const snapshot=structuredClone(rows),seen=[1,2,3].flatMap(page=>abilityOverview(rows,{category:'軍事',page}).items.map(g=>g.key));
 assert.deepEqual(seen,rows.map(g=>g.key));assert.equal(new Set(seen).size,43);
 const last=abilityOverview(rows,{category:'軍事',page:99});assert.equal(last.page,3);assert.equal(last.start,41);assert.equal(last.end,43);
 const empty=abilityOverview(rows,{category:'内政',page:3});assert.equal(empty.start,0);assert.equal(empty.page,1);assert.equal(empty.pages,1);
 assert.deepEqual(rows,snapshot);
});

test('Review filters distinguish missing values, recorded zero, conflicts and actual differences',()=>{
 const row={key:'x',name:'建設速度',category:'内政',total:0,unknown:0,sources:[],manual:{total:0}};
 assert.equal(abilityDelta(row),0);assert.equal(needsAbilityReview(row),false);
 assert.equal(abilityDelta({...row,manual:null}),null);
 const rows=[row,{...row,key:'unknown',unknown:1},{...row,key:'different',manual:{total:5}},{...row,key:'conflict',manualConflicts:['旧表記']},{...row,key:'float',total:0.1+0.2,manual:{total:0.3}}];
 assert.deepEqual(abilityOverview(rows,{filter:'review'}).items.map(g=>g.key),['unknown','different','conflict']);
 assert.equal(abilityDelta(rows[4]),0);
});

test('Search normalizes width and spacing and finds acquisition sources beyond the first page',()=>{
 const rows=Array.from({length:25},(_,i)=>({key:String(i),name:'建設速度',category:'内政',total:0,unknown:0,sources:[{location:i===24?'Ｌｖ１　Alpha エンバース':'別のエンバース',acquired:i===24}]}));
 assert.deepEqual(abilityOverview(rows,{query:'lv1 alpha',page:3}).items.map(g=>g.key),['24']);
 assert.deepEqual(abilityOverview(rows,{filter:'active'}).items.map(g=>g.key),['24']);
});

test('Source folding preserves real aggregate totals, acquired zero and unknown without treating inactive as missing',()=>{
 const nodes=[{id:'a',name:'研究速度',group:'拠点①',lab:1,documentedMax:2,levels:[[0,0,0,0,0],[0,0,0,0,0]]},{id:'b',name:'研究速度',group:'拠点①',lab:1,documentedMax:1,levels:[[0,0,0,0,0]]}];
 const state={research:{a:1},researchSpecs:{a:{ability:'研究速度',unit:'%',values:[0,5]}},abilityUser:{extras:[{id:'unknown',label:'称号',ability:'研究速度',unit:'%',kind:'称号',value:null,acquired:true}]}};
 const g=aggregateAbilities({nodes,state}).find(g=>g.name==='研究速度');
 const before=structuredClone(g),visible=groupAbilitySources(g),all=groupAbilitySources(g,{includeInactive:true});
 assert.equal(visible.reduce((n,x)=>n+x.sources.length,0),2);assert.equal(all.reduce((n,x)=>n+x.sources.length,0),3);
 assert.equal(visible.reduce((n,x)=>n+x.total,0),g.total);assert.equal(visible.reduce((n,x)=>n+x.unknown,0),1);
 assert.equal(abilityOverview([g],{filter:'active'}).count,1);assert.deepEqual(g,before);
});
