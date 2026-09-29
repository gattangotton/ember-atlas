import {test} from 'node:test';
import assert from 'node:assert/strict';
import {equipmentCopies,validateCopies,copyProgress,growthUpdates} from '../public/equipment-inventory.js';
import {buildShare,validateShare} from '../public/model.js';
const gear={id:'gear',name:'武具',kind:'equipment',raid:'no'};
const ability={name:'攻撃',value:0};
const copy=(grade=1)=>({id:'one',grade,target:6,subAbilities:[ability,null,null]});
test('Legacy equipment becomes one independent copy, retaining unknown grade and goals',()=>{
 assert.deepEqual(equipmentCopies(),[]);assert.deepEqual(equipmentCopies({owned:false}),[]);
 const p={owned:true,level:0,target:6,note:'private'};const instances=equipmentCopies(p);
 assert.equal(instances.length,1);assert.equal(instances[0].grade,0);assert.equal(instances[0].target,6);
 const saved=copyProgress(p,[copy(),{...copy(5),id:'two'}],gear);
 assert.equal(saved.level,5);assert.equal(saved.instances.length,2);assert.equal(saved.note,'private');
 const cloned=equipmentCopies(saved);cloned[0].subAbilities[0].value=10;assert.equal(saved.instances[0].subAbilities[0].value,0);
 assert.equal(copyProgress(saved,[],gear).owned,false);
});
test('Each owned weapon enforces G5 second slot and raid-only G6 third slot',()=>{
 for(const grade of [1,2,3,4])assert.throws(()=>validateCopies([{...copy(grade),subAbilities:[ability,ability,null]}],{...gear,unlockGrades:[1,2,3]}));
 assert.equal(validateCopies([{...copy(5),subAbilities:[ability,ability,null]}],gear).length,1);
 const third={...copy(6),subAbilities:[ability,ability,ability]};
 assert.throws(()=>validateCopies([third],gear));assert.throws(()=>validateCopies([{...third,grade:5}],{...gear,raid:'yes'}));
 assert.equal(validateCopies([third],{...gear,raid:'yes'}).length,1);
 assert.throws(()=>validateCopies([copy(),copy()],gear));assert.throws(()=>validateCopies([{...copy(),subAbilities:[{name:'攻撃',value:null},null,null]}],gear));
});
test('Sharing and JSON backups retain individual copies but exclude private notes',()=>{
 const p=copyProgress({note:'PRIVATE'},[copy(),{...copy(5),id:'two'}],gear);
 const payload=buildShare({id:'user',name:'A',alliance:''},{gear:p},[gear],{});
 assert.deepEqual(validateShare(payload),payload);assert.ok(!JSON.stringify(payload).includes('PRIVATE'));
 assert.deepEqual(validateCopies(JSON.parse(JSON.stringify(p)).instances,gear),p.instances);
});
const effect=(name,values,unit='%')=>({name,values,unit});
test('Equal G1 percentages propagate across effect names and preserve unknown source stages',()=>{
 const before={...gear,mainAbilities:[effect('攻撃',[10,null,null,null,null,null])]};
 const next={...before,mainAbilities:[effect('攻撃',[10,15,null,25,30,35])]};
 const other={...gear,id:'other',portrait:'keep',mainAbilities:[effect('防御',[10,12,19,24,29,34],'％'),effect('異なる',[20,1,2,3,4,5]),effect('固定値',[10,1,2,3,4,5],'秒')]};
 const updates=growthUpdates(before,next,[before,other]);
 assert.equal(updates.length,1);assert.deepEqual(updates[0].record.mainAbilities[0].values,[10,15,19,25,30,35]);
 assert.equal(updates[0].record.mainAbilities[0].name,'防御');assert.equal(updates[0].record.portrait,'keep');
 assert.deepEqual(updates[0].record.mainAbilities.slice(1),other.mainAbilities.slice(1));assert.equal(other.mainAbilities[0].values[1],12);
 assert.deepEqual(growthUpdates(next,next,[other]),[]);
 assert.throws(()=>growthUpdates(before,{...next,mainAbilities:[...next.mainAbilities,effect('別効果',[10,16,null,null,null,null])]},[other]));
});
