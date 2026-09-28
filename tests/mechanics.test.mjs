import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {SKILLS,skillLevels,coreStage,groupCore,coreEffects,unlockedSlots,validateMechanics,validatePatterns,validateResearch} from '../public/mechanics.js';
import {validateRecord,validateShare,buildShare} from '../public/model.js';
const catalog=JSON.parse(await readFile(new URL('../public/data/catalog.json',import.meta.url)));
const extra=JSON.parse(await readFile(new URL('../public/data/mechanics.json',import.meta.url)));
test('Core unlocks depend on ownership and total skills at every threshold',()=>{
 const skillsFor=total=>{const v={};for(const [key,s] of Object.entries(SKILLS)){v[key]=Math.min(total,s.max);total-=v[key];}return v;};
 for(const [total,stage] of [[0,1],[9,1],[10,2],[14,2],[15,3],[19,3],[20,4],[24,4],[25,5],[29,5],[30,6],[33,6]]){
  assert.equal(coreStage(true,skillsFor(total)),stage);assert.equal(coreStage(false,skillsFor(total)),0);
 }
 assert.throws(()=>skillLevels({charge:8}));assert.throws(()=>skillLevels({active:6}));assert.throws(()=>skillLevels({trigger2:1.5}));assert.throws(()=>skillLevels({trigger3:-1}));
});
test('Composite core effects split their maxima and preserve unknown tiers',()=>{
 const r={id:'a',kind:'characters',name:'ウラノス',ability:'採集量/研究資源効率',maximum:'18％/9%'};
 const e=coreEffects(r);assert.equal(e[0].values[5],18);assert.equal(e[1].values[5],9);assert.deepEqual(e[0].values.slice(0,5),[null,null,null,null,null]);assert.equal(groupCore([r]).length,2);
 assert.equal(coreEffects({...r,maximum:''})[0].values[5],null);
});
test('Only raid equipment opens slot three at G6',()=>{
 assert.deepEqual(unlockedSlots({raid:'yes'},1),[true,false,false]);
 assert.deepEqual(unlockedSlots({raid:'yes'},5),[true,true,false]);
 assert.deepEqual(unlockedSlots({raid:'yes'},6),[true,true,true]);
 assert.deepEqual(unlockedSlots({raid:'no'},6),[true,true,false]);
 assert.deepEqual(unlockedSlots({raid:'unknown',unlockGrades:[null,5,6]},6),[null,true,null]);
 assert.deepEqual(unlockedSlots({raid:'yes'},3),[true,null,false]);
});
test('Effect values and probability validation distinguish missing and zero',()=>{
 const values=[0,null,3,4,5,6];const r=validateMechanics({mainAbilities:[{name:'攻撃',unit:'%',values}],subCandidates:[{slot:1,name:'攻撃',value:0,probability:null}]});assert.equal(r.mainAbilities[0].values[0],0);assert.equal(r.mainAbilities[0].values[1],null);assert.equal(r.subCandidates[0].probability,null);
 assert.throws(()=>validateMechanics({subCandidates:[{slot:1,name:'a',value:1,probability:60},{slot:1,name:'b',value:2,probability:60}]}));
 assert.throws(()=>validateMechanics({subCandidates:[{slot:4,name:'a',value:1,probability:10}]}));
 assert.throws(()=>validateMechanics({portrait:'javascript:alert(1)'}));
 assert.throws(()=>validateMechanics({mainAbilities:[{name:'a',values:[1,2]}]}));
 assert.throws(()=>validatePatterns([{name:'bad',values:[1,Infinity,3,4,5]}]));
});
test('Catalogue import/export preserves nested mechanics and source portrait paths',()=>{
 for(const r of [...catalog.records,...extra.extraRecords]){const enriched={...r,...extra.additions[r.id]};const clean=validateRecord(enriched);for(const key of ['skills','coreEffects','mainAbilities','raid','portrait','unlockGrades'])if(enriched[key]!==undefined)assert.deepEqual(clean[key],enriched[key]);}
});
test('Shared v2 snapshot keeps skill goals and research but excludes private notes',()=>{
 const r=catalog.records[0],skills={charge:7,active:5,trigger1:7,trigger2:7,trigger3:4};const p={owned:true,level:80,target:90,skills,targetSkills:skills,note:'PRIVATE'};
 const payload=buildShare({id:'one',name:'A',alliance:'GIFT'},{[r.id]:p},[r],{'research-0-3':4});
 assert.equal(payload.version,2);assert.deepEqual(validateShare(payload),payload);assert.ok(!JSON.stringify(payload).includes('PRIVATE'));
 assert.throws(()=>validateShare({...payload,research:{'research-0-3':6}}));assert.throws(()=>validateShare({...payload,items:[{...payload.items[0],skills:{active:7}}]}));
 assert.throws(()=>validateResearch(JSON.parse('{"__proto__":1}')));
});
test('Research values map to the workbook row and confirmed edges remain in the same tree',()=>{
 assert.equal(extra.research.length,419);const ids=new Set(extra.research.map(n=>n.id));assert.equal(ids.size,419);
 const n=extra.research.find(n=>n.id==='research-1-3');assert.equal(n.name,'兵士訓練資源効率');assert.deepEqual(n.levels[0],[450,450,900,450,900]);
 for(const n of extra.research)for(const id of n.parents){assert.ok(ids.has(id));const parent=extra.research.find(p=>p.id===id);assert.equal(parent.group,n.group);assert.ok(parent.lab<n.lab);}
});
