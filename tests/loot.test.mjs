import test from 'node:test';
import assert from 'node:assert/strict';
import {lootContribution,lootTotal} from '../public/loot-model.js';
const effect=(name,v)=>({name,unit:'%',values:v});
test('Only material effects for the selected race and common monsters are counted',()=>{
 const record={mainAbilities:[effect('対竜素材倍加率',[12]),effect('対魔獣素材倍化率',[5]),effect('対不浄素材倍化率',[99]),effect('対龍メモリ倍化率',[80])]};
 assert.equal(lootContribution(record,1,'龍',[{name:'対魔獣素材倍加率',value:3},{name:'攻撃力',value:500}]).total,20);
});
test('Missing grades remain unknown; zero remains a known value',()=>{
 const record={mainAbilities:[effect('対悪魔素材倍化率',[0,null])]};
 assert.deepEqual([lootContribution(record,1,'悪魔').total,lootContribution(record,1,'悪魔').unknown],[0,0]);
 assert.equal(lootContribution(record,2,'悪魔').unknown,1);
});
test('Worksheet values fill only matching missing grades, never double-count or replace a registered zero',()=>{
 const r={effect:'対龍素材倍加率',grades:[5,6,7],mainAbilities:[effect('対竜素材倍化率',[5,null,0])]};
 assert.equal(lootContribution(r,2,'龍').total,6);
 assert.equal(lootContribution(r,3,'龍').total,0);
 assert.equal(lootContribution({...r,grades:[99,100]},2,'龍').unknown,1);
});
test('Each selected copy uses its own grade and sub abilities; empty slots contribute zero',()=>{
 const record={mainAbilities:[effect('対超獣素材倍化率',[2,3])]};
 const result=lootTotal([{record,grade:2,subAbilities:[{name:'対超獣素材倍加率',value:4}]},{record:null,grade:1}], '超獣');
 assert.equal(result.total,7);assert.equal(result.unknown,0);
});
