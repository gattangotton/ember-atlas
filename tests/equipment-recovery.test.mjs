import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEquipmentProgress} from '../public/equipment-inventory.js';
import {equipmentCurves} from '../public/growth-patterns.js';
import {validateEquipmentPatterns} from '../public/equipment-model.js';
test('Restored copies determine ownership and grades while legacy ownership migrates without loss',()=>{
 const records=[{id:'r',kind:'equipment',raid:'yes'},{id:'old',kind:'equipment',raid:'no'}];
 const input={r:{owned:false,level:0,target:0,note:'keep',instances:[{id:'a',grade:6,target:6,subAbilities:[{name:'攻撃力',value:3.25},null,{name:'防御効率',value:5.5}]}]},old:{owned:true,level:5,target:6,note:'legacy'}};
 const restored=normalizeEquipmentProgress(JSON.parse(JSON.stringify(input)),records);
 assert.equal(restored.r.owned,true);assert.equal(restored.r.level,6);assert.equal(restored.r.target,6);
 assert.deepEqual(restored.r.instances,input.r.instances);assert.equal(restored.r.note,'keep');
 assert.equal(restored.old.instances.length,1);assert.equal(restored.old.instances[0].grade,5);
 assert.deepEqual(normalizeEquipmentProgress(restored,records),restored);
 assert.equal(input.r.owned,false);
});
test('Partial equipment patterns remain selectable after JSON restoration without inventing missing values',()=>{
 const p={id:'ep-test',name:'部分登録',power:9999,slot:'武器',mainAbilities:[{name:'攻撃力',unit:'%',values:[3.25,null,5,null,null,9]}]};
 const restored=validateEquipmentPatterns(JSON.parse(JSON.stringify([p])));
 const curves=equipmentCurves({power:9999,slot:'武器'},'攻撃力','%',[],restored);
 assert.equal(curves.length,1);assert.deepEqual(curves[0].values,p.mainAbilities[0].values);
 assert.equal(equipmentCurves({power:9999,slot:'頭部'},'攻撃力','%',[],restored).length,0);
});
