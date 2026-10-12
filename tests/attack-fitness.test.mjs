import test from 'node:test';
import assert from 'node:assert/strict';
import {attackFitness,matchesPartner,recommendAttackPartners,recommendAttackLoadout} from '../public/attack-fitness.js';
import {TERRITORY_COMBAT as DATA} from '../public/territory-combat-data.js';
import {evaluateTerritoryTeam} from '../public/territory-model.js';
import {validatePartySettings} from '../public/party-model.js';
const effect=(name,v,unit='%')=>({name,unit,values:Array(7).fill(v)});
const hero=(id,value=0,element='火',troop='歩兵',buff=0)=>({record:{id,name:id,element,troop,skills:{trigger1:{effects:[effect('攻撃力',value)]},trigger2:{effects:[]},trigger3:{effects:[]},charge:{name:id+'のチャージ',effects:[effect('与ダメージ',buff),effect('与ダメージ 効果時間',2,'秒')]}}},levels:{charge:7,trigger1:7,trigger2:7,trigger3:7},heroLevel:40});
const a=hero('a'),b=hero('b',90),c=hero('c',100,'水','弓兵'),d=hero('d',0,'火','歩兵',100);
const data={...DATA,heroes:Object.fromEntries([a,b,c,d].map(h=>[h.record.id,{name:h.record.name,birthplace:2,efficiency:{歩兵:h.record.troop==='歩兵'?1:.8}}]))};
const context={mode:'attack',battle:'fieldBoss',race:'悪魔',troop:'歩兵',element:'火',enemyElement:'風',attackType:'normal',chargeEffects:'off'};
const args={context,state:{},base:{mode:'none'},heroes:[a],gear:[],memories:[]};
test('Leader ranking includes favourable element, efficiency and actual trigger values; charge affinity is separate',()=>{
 const fire=attackFitness({...args,heroes:[]},b,0,data),water=attackFitness({...args,heroes:[]},c,0,data);
 assert.ok(fire.score>water.score);assert.equal(fire.factors.affinity,1.3);assert.equal(water.factors.efficiency,.8);
 assert.equal(attackFitness({...args,context:{...context,attackType:'charge'}},b,0,data).factors.affinity,1);
 assert.equal(attackFitness({...args,context:{...context,enemyElement:''}},b,0,data).factors.attributeUnknown,true);
});
test('Partner ranking can favour leader compatibility over higher attack percent and reacts to the chosen leader',()=>{
 const matching=attackFitness(args,b,1,data),other=attackFitness(args,c,1,data);
 assert.equal(matching.bonus.total,24);assert.equal(other.bonus.total,9);assert.ok(matching.score>other.score);
 assert.ok(attackFitness({...args,heroes:[c]},b,1,data).bonus.total<matching.bonus.total);
 assert.equal(matchesPartner(a,b,'both',data),true);assert.equal(matchesPartner(a,c,'troop',data),false);
 const cross={...data,heroes:{a:{name:'a',birthplace:9},b:{name:'b',birthplace:14}}};assert.equal(matchesPartner(a,b,'world',cross),true);
});
test('A support contributes only the slot bonus regardless of enormous triggers and charge buffs',()=>{
 const support={...hero('s',999,'火','歩兵',999),support:true},small={...support,record:{...support.record,skills:{}}};
 const x=attackFitness({...args,context:{...context,chargeEffects:'active'},heroes:[a,b]},support,2,data),y=attackFitness({...args,context:{...context,chargeEffects:'active'},heroes:[a,b]},small,2,data);
 assert.equal(x.score,y.score);assert.equal(x.result.total,90);assert.equal(x.result.charge.bonus,0);assert.equal(x.bonus.total,3.5);
 assert.equal(x.role,'support');assert.equal(x.main,null);
});
test('Charge mode changes partner recommendation, full recomputation matches and inputs stay unchanged',()=>{
 const options={...args,leader:a,candidates:[a,b,c,d],data},before=JSON.stringify(options);
 const off=recommendAttackPartners(options),on=recommendAttackPartners({...options,context:{...context,chargeEffects:'active'}});
 assert.equal(off.heroes[1].record.id,'b');assert.equal(on.heroes[1].record.id,'d');
 const recomputed=evaluateTerritoryTeam({...args,context:on.context,heroes:on.heroes},data);assert.equal(recomputed.index,on.index);assert.equal(JSON.stringify(options),before);
 const supported=recommendAttackPartners({...options,supportCount:1,match:'both'});assert.equal(new Set(supported.heroes.map(h=>h.record.id)).size,3);assert.ok(supported.heroes.at(-1).support);
 assert.throws(()=>recommendAttackPartners({...options,supportCount:2,match:'both'}),/不足/);
});
test('Empty leader cannot give a partner a concrete suitability score; empty second keeps third coefficient',()=>{
 assert.equal(attackFitness({...args,heroes:[{},{}]},b,1,data).score,null);
 const x=attackFitness({...args,heroes:[a,{},{}]},b,2,data);assert.equal(x.bonus.total,12);
 const missing=attackFitness(args,{...b,heroLevel:0},1,data);assert.equal(missing.bonus.parts.level,0);assert.ok(missing.unknown>0);
});
test('Automatic attack loadout has disjoint heroes, actual effects, supports and distinct memory types',()=>{
 const x=hero('x',25),y=hero('y',20),z=hero('z',1),heroes=[a,b,c,d,x,y,z];
 const memories=[{key:'m1',record:{id:'m',name:'M',mainEffects:[{name:'攻撃力',value:20,unit:'%'}]}},{key:'m2',record:{id:'m',name:'M',mainEffects:[{name:'攻撃力',value:20,unit:'%'}]}}];
 const r=recommendAttackLoadout({...args,candidates:{heroes,gear:[],memories},supportCount:1});
 assert.equal(new Set(r.heroes.map(h=>h.record.id)).size,3);assert.equal(r.memories.length,1);assert.ok(r.heroes.at(-1).support);
 assert.equal(evaluateTerritoryTeam({...args,context:r.context,heroes:r.heroes,gear:r.gear,memories:r.memories}).index,r.index);
});
test('Saved preferences and support selections round-trip, reject duplicate roles and retain legacy saves',()=>{
 const old={battle:'fieldBoss',race:'悪魔',grade:6,boss:'',tab:'hero',troop:'歩兵',attackType:'normal',heroes:['a','b',''],memories:['','',''],gear:{},base:{mode:'none'}};
 assert.deepEqual(validatePartySettings(old).supports,['','']);assert.equal(validatePartySettings(old).enemyElement,'auto');
 const s={...old,heroSort:'fitness',partnerMatch:'both',enemyElement:'風',supportCount:1,supports:['c','']},clean=validatePartySettings(s);assert.deepEqual(validatePartySettings(clean),clean);
 assert.throws(()=>validatePartySettings({...s,supports:['b','']}),/同じ/);assert.throws(()=>validatePartySettings({...s,supportCount:0}));assert.throws(()=>validatePartySettings({...s,enemyElement:'unknown'}));
});
