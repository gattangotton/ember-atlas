import test from 'node:test';
import assert from 'node:assert/strict';
import {equipmentPower,sortEquipment,equipmentMatches} from '../public/equipment-model.js';
const rows=[
 {kind:'equipment',id:'a',name:'アーク',power:100,powerGrades:[100,600,null,null,null,500]},
 {kind:'equipment',id:'b',name:'イーグル',power:200,powerGrades:[200,300,null,null,null,200]},
 {kind:'equipment',id:'c',name:'ウィング',power:0,powerGrades:[0,0,null,null,null,0]},
 {kind:'equipment',id:'d',name:'エッジ',power:400,powerGrades:[400,null,null,null,null,null]},
];
test('Displayed-grade power controls sorting and filtering, without falling back to G1 for missing higher grades',()=>{
 assert.equal(equipmentPower(rows[0],6),500);assert.equal(equipmentPower(rows[3],6),null);
 assert.equal(equipmentPower({power:12},1),12);assert.equal(equipmentPower({power:12},2),null);
 assert.deepEqual(sortEquipment(rows,{grade:1}).map(r=>r.id),['d','b','a','c']);
 assert.deepEqual(sortEquipment(rows,{grade:6}).map(r=>r.id),['a','b','c','d']);
 assert.deepEqual(sortEquipment(rows,{grade:6,direction:'asc'}).map(r=>r.id),['c','b','a','d']);
 assert.equal(equipmentMatches(rows[0],{power:'500',grade:6}),true);
 assert.equal(equipmentMatches(rows[0],{power:'100',grade:6}),false);
 assert.equal(equipmentMatches(rows[3],{power:'unknown',grade:6}),true);
 assert.equal(equipmentMatches(rows[2],{power:'unknown',grade:6}),false);
});
test('Japanese name sorting supports both directions, stable power ties, and does not mutate the catalogue',()=>{
 const before=structuredClone(rows);
 assert.deepEqual(sortEquipment([...rows].reverse(),{key:'name',direction:'asc'}).map(r=>r.id),['a','b','c','d']);
 assert.deepEqual(sortEquipment(rows,{key:'name',direction:'desc'}).map(r=>r.id),['d','c','b','a']);
 assert.deepEqual(sortEquipment([rows[1],rows[0]].map(r=>({...r,powerGrades:[100]})),{grade:1}).map(r=>r.id),['a','b']);
 assert.deepEqual(rows,before);
});
