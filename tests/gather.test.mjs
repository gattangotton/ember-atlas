import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateGather,gatherGearEffects,gatherTriggerEffects,gatherBase} from '../public/gather-model.js';
test('Gather baseline matches worksheet; game drops add speed and items multiply speed',()=>{
 const x=calculateGather({resource:'食料',level:4,speed:375.7,amount:110.8});
 assert.ok(Math.abs(x.seconds/3600-1.261299138)<1e-8);assert.equal(Math.round(x.quantity),1264800);
 const boosted=calculateGather({resource:'食料',level:4,speed:375.7,amount:110.8,droplet:10,item:true});
 assert.ok(Math.abs(boosted.seconds-21600/(1+(375.7+10)/100)/1.5)<1e-8);assert.equal(boosted.quantity,x.quantity);
 assert.equal(calculateGather({resource:'エーテル',level:7}).quantity,900000);
 assert.throws(()=>calculateGather({resource:'食料',level:4,droplet:15}));
});
test('Resource-specific triggers use the Excel level curve, with no duplicate registered effect',()=>{
 const r={name:'ウラノス'};
 assert.equal(gatherTriggerEffects(r,{trigger1:7,trigger2:7},'金属').reduce((s,e)=>s+e.value,0),78.4);
 assert.equal(gatherTriggerEffects(r,{trigger1:7},'食料')[0].value,25.2);
 assert.deepEqual(gatherTriggerEffects(r,{trigger1:0},'金属'),[]);
 r.skills={trigger1:{effects:[{name:'金属採集速度',unit:'%',values:[8,16,24,32,40,48,56]}]}};
 assert.equal(gatherTriggerEffects(r,{trigger1:7},'金属')[0].value,56);
 assert.equal(gatherTriggerEffects(r,{trigger1:7},'食料').length,0);
});
test('Gear reference fills matching G1 only and retains unknown values and explicit zero',()=>{
 const r={name:'ケアテイカー',mainAbilities:[{name:'採集速度',unit:'%',values:[5,0,null,null,null,null]}]};
 assert.deepEqual(gatherGearEffects(r)[0].values,[5,0,7.5,8.7,10,11.2]);
 r.mainAbilities[0].values[0]=6;assert.equal(gatherGearEffects(r)[0].values[5],null);
});
test('Base inputs include acquired core/research/facility once, exclude gear and preserve unknown',()=>{
 const sources=[{kind:'研究',acquired:true,value:20},{kind:'コアアビリティ',acquired:true,value:null},{kind:'施設',acquired:false,value:9},{kind:'装備',acquired:true,value:50}];
 const x=gatherBase([{name:'食料の採集速度',unit:'%',sources},{name:'木材採集速度',unit:'%',sources}],'食料');
 assert.deepEqual(x.map(e=>e.value),[20,null]);
});
