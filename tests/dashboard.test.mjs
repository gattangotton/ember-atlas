import test from 'node:test';
import assert from 'node:assert/strict';
import {dashboardSummary,dashboard} from '../public/dashboard-ui.js';
import fs from 'node:fs';
test('Dashboard renders new equipment using the same native portrait paths as the library',()=>{
 const read=n=>JSON.parse(fs.readFileSync(new URL('../public/data/'+n+'.json',import.meta.url)));
 const masters=read('game-masters'),images=read('game-images');
 const records=masters.extraRecords.map(r=>({...r,portrait:images.equipment[r.id]}));
 const html=dashboard({records,state:{profile:{name:'test'}},nodes:[],memories:[],esc:String,icon:()=>'',progressRow:()=>''});
 for(const r of records.filter(r=>r.id.startsWith("equipment-pc-506")))assert.ok(html.includes('src="'+r.portrait+'"'));
 assert.ok(!html.includes('src=""'));
});
test('Dashboard counts owned copies, researched nodes and actionable skill goals without seeding progress',()=>{
 const records=[{id:'a',kind:'characters'},{id:'b',kind:'characters'},{id:'c',kind:'characters'},{id:'g',kind:'equipment'},{id:'h',kind:'equipment'},{id:'i',kind:'equipment'}];
 const nodes=[{id:'r1',documentedMax:5},{id:'r2',documentedMax:10},{id:'r3',documentedMax:1}];
 const state={progress:{a:{owned:true,skills:{charge:1},targetSkills:{charge:2}},b:{owned:true,skills:{charge:3},targetSkills:{charge:3}},c:{owned:false,targetSkills:{charge:7}},g:{owned:false,instances:[{id:'1'},{id:'2'}]},h:{owned:true,level:5},i:{owned:true,instances:[]}},memoryInventory:{m:[{id:'1'},{id:'2'}]},research:{r1:5,r2:3,unknown:99},researchPlan:{targetId:'r2',targetLevel:9},buildingProgress:{'building-1':[18]}};
 const before=structuredClone(state),s=dashboardSummary(records,state,nodes);
 assert.equal(s.owned.length,2);assert.deepEqual(s.training.map(r=>r.id),['a']);assert.equal(s.equipment,3);assert.equal(s.memories,2);assert.equal(s.completed,1);assert.equal(s.researched,2);assert.equal(s.castle,18);assert.equal(s.plan.id,'r2');assert.deepEqual(state,before);
 const empty=dashboardSummary(records,{},nodes);assert.equal(empty.equipment,0);assert.equal(empty.memories,0);assert.equal(empty.plan,undefined);assert.equal(empty.castle,0);
});
