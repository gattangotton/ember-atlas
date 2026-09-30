import test from 'node:test';
import assert from 'node:assert/strict';
import {equipmentCurves,emberCurves,abilityFamily} from '../public/growth-patterns.js';
import {validateEquipmentPatterns} from '../public/equipment-model.js';
const weapon={id:'target',kind:'equipment',power:12000,slot:'武器'};
const values=[26.5,33.1,39.7,46.3,53,59.6];
test('Builtin weapon curve covers all attributes but not other power, slots or ability families',()=>{
 for(const el of ['火','水','風','雷','土','光','闇'])assert.deepEqual(equipmentCurves(weapon,el+'属性リーダー攻撃力','%')[0].values,values);
 for(const r of [{...weapon,power:13000},{...weapon,power:null},{...weapon,slot:'身体'}])assert.equal(equipmentCurves(r,'火属性リーダー攻撃力','%').length,0);
 assert.equal(equipmentCurves(weapon,'対妖魔攻撃力','%').length,0);
 assert.equal(equipmentCurves(weapon,'火属性リーダー攻撃力','秒').length,0);
 assert.notEqual(abilityFamily('対妖魔攻撃力'),abilityFamily('対宝庫攻撃力'));
});
test('Saved patterns survive backup validation and offer individual compatible effects only',()=>{
 const p={id:'ep-test',name:'12000素材',power:12000,slot:'武器',mainAbilities:[{name:'対妖魔素材倍加率',unit:'%',values:[7.5,9.3,11.2,13.1,15,16.8]},{name:'対妖魔攻撃力',unit:'%',values:[1,null,null,null,null,null]}]};
 const saved=validateEquipmentPatterns(JSON.parse(JSON.stringify([p])));
 assert.equal(saved[0].slot,'武器');assert.equal(equipmentCurves(weapon,'対龍素材倍化率','%',[],saved).length,1);
 assert.equal(equipmentCurves(weapon,'対宝庫攻撃力','%',[],saved).length,0);
 assert.deepEqual(equipmentCurves(weapon,'対妖魔攻撃力','%',[],saved)[0].values,[1,null,null,null,null,null]);
 assert.equal(equipmentCurves({...weapon,slot:'頭部'},'対妖魔素材倍化率','%',[],saved).length,0);
});
test('Conflicting recorded curves remain selectable and do not invent missing values',()=>{
 const records=[1,2].map((n)=>({...weapon,id:String(n),name:'武具'+n,mainAbilities:[{name:'水属性リーダー攻撃力',unit:'%',values:values.map(v=>v*n)}]}));
 const curves=equipmentCurves(weapon,'火属性リーダー攻撃力','%',records);
 assert.equal(curves.length,2);assert.equal(curves[0].sources.length,2);curves[1].values[0]=0;assert.equal(records[1].mainAbilities[0].values[0],53);
});
test('Ember candidates match effect, unit and stage count; reusable patterns work without equipment curves',()=>{
 const records=[{kind:'characters',name:'例',rarity:'☆4',skills:{active:{effects:[{name:'威力',unit:'',values:[100,125,150,175,200]}]}},coreEffects:[{name:'研究速度',unit:'%',values:[2,4,6,8,10,null]}]}];
 assert.equal(emberCurves('威力','',5,records).length,1);assert.equal(emberCurves('威力','%',5,records).length,0);
 assert.equal(emberCurves('研究速度','%',5,records).length,1);assert.equal(emberCurves('研究速度','%',6,records).length,0);
 assert.deepEqual(emberCurves('任意','%',5,[],[{name:'共通',values:[1,2,3,4,5]}])[0].values,[1,2,3,4,5]);
});
