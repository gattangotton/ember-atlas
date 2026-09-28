import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {equipmentMatches,validateEquipmentPatterns,applyEquipmentPattern,EQUIPMENT_FILTERS} from '../public/equipment-model.js';
import {validateRecord} from '../public/model.js';
import {equipmentEvidence} from '../tools/equipment-evidence.mjs';
import {equipmentG1Evidence,equipmentNameKey} from '../tools/equipment-g1-sep28.mjs';
const cat=JSON.parse(readFileSync(new URL('../public/data/catalog.json',import.meta.url))),m=JSON.parse(readFileSync(new URL('../public/data/mechanics.json',import.meta.url)));
const rs=[...cat.records,...m.extraRecords].map(r=>({...r,...m.additions[r.id]})).filter(r=>r.kind==='equipment');
test('Equipment evidence retains power, independent grade values and source in catalogue round trip',()=>{
 assert.equal(equipmentEvidence.length,110);assert.equal(Object.values(EQUIPMENT_FILTERS).flat().length,60);
 for(const e of equipmentEvidence){const r=rs.find(r=>equipmentNameKey(r.name)===equipmentNameKey(e.name)),latest=equipmentG1Evidence.find(x=>equipmentNameKey(x.name)===equipmentNameKey(e.name))||e;assert.ok(r,e.name);assert.equal(r.power,latest.power);assert.equal(validateRecord(r).power,latest.power);assert.deepEqual(validateRecord(r).powerGrades,r.powerGrades);assert.ok(r.equipmentEvidence);}
 const sword=rs.find(r=>r.name==='エクスカリバー(FFBE)');assert.equal(sword.powerGrades[5],27000);assert.equal(sword.mainAbilities.find(e=>e.name==='攻撃力').values[5],84.3);assert.equal(sword.mainAbilities[0].values[1],null);
 assert.equal(new Set(rs.map(r=>r.name)).size,rs.length);
});
test('September slot videos provide complete G1 values and valid artwork, without duplicate records',()=>{
 assert.equal(equipmentG1Evidence.length,189);
 assert.deepEqual(Object.fromEntries(['武器','頭部','身体','脚部','装飾'].map(s=>[s,equipmentG1Evidence.filter(e=>e.slot===s).length])),{武器:45,頭部:36,身体:37,脚部:34,装飾:37});
 for(const e of equipmentG1Evidence){
  const matches=rs.filter(r=>equipmentNameKey(r.name)===equipmentNameKey(e.name));assert.equal(matches.length,1,e.name);
  const r=matches[0],saved=validateRecord(r);assert.equal(r.slot,e.slot);assert.equal(r.powerGrades[0],e.power);
  assert.deepEqual(r.mainAbilities.map(a=>[a.name,a.values[0],a.unit]),e.mainAbilities.map(a=>[a.name,a.values[0],a.unit]),e.name);
  assert.equal(saved.portrait,e.portrait);assert.ok(existsSync(new URL('../public/'+r.portrait,import.meta.url)),e.name);
  assert.ok(r.equipmentEvidence.includes(e.video));
  for(const a of saved.mainAbilities)assert.equal(a.values.length,6);
 }
 // Corrections must retain the old record key so progress/ownership stays attached.
 for(const [oldName,newName] of [['氷菓ブロード','氷菓フロート'],['妖刀悪霊','妖刀屍霊'],['コルテロブーツ','コルデロブーツ']]){
  const original=[...cat.records,...m.extraRecords].find(r=>r.name===oldName);assert.ok(original,oldName);assert.equal(rs.find(r=>r.id===original.id).name,newName);
 }
});
test('Equipment filters combine exact main effects with slot, power and AND/OR',()=>{
 const r={kind:'equipment',name:'試験',slot:'武器',power:12000,mainAbilities:[{name:'騎兵攻撃力'},{name:'集結攻撃力'}],subCandidates:[{name:'採集量'}]};
 assert.equal(equipmentMatches(r,{abilities:['攻撃力']}),false);assert.equal(equipmentMatches(r,{abilities:['採集量']}),false);
 assert.equal(equipmentMatches(r,{slot:'武器',power:'12000',abilities:['騎兵攻撃力','集結部隊時攻撃力']}),true);
 assert.equal(equipmentMatches(r,{abilities:['騎兵攻撃力','採集量']}),false);assert.equal(equipmentMatches(r,{abilities:['騎兵攻撃力','採集量'],mode:'any'}),true);
 assert.equal(equipmentMatches(r,{slot:'頭部'}),false);assert.equal(equipmentMatches(r,{power:'unknown'}),false);assert.equal(equipmentMatches({...r,power:null},{power:'unknown'}),true);
});
test('Power patterns preserve unknown values, copy independently and reject incompatible equipment',()=>{
 const p={id:'ep-test',name:'12000攻撃',power:12000,mainAbilities:[{name:'攻撃力',unit:'%',values:[0,null,null,null,75,84.3]}]};
 const saved=validateEquipmentPatterns(JSON.parse(JSON.stringify([p])))[0],r=applyEquipmentPattern({kind:'equipment',power:12000},saved);
 r.mainAbilities[0].values[0]=5;assert.equal(saved.mainAbilities[0].values[0],0);assert.equal(r.mainAbilities[0].values[1],null);
 assert.throws(()=>applyEquipmentPattern({kind:'equipment',power:13000},saved));assert.throws(()=>validateEquipmentPatterns([p,p]));assert.throws(()=>validateEquipmentPatterns([{...p,power:-1}]));assert.throws(()=>validateEquipmentPatterns([{...p,mainAbilities:undefined}]));
});
console.log('Equipment records:',rs.length,'; video confirmed:',rs.filter(r=>r.equipmentEvidence).length);
