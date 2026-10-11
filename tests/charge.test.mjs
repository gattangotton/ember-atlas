import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chargeSkillEffects} from '../public/charge-model.js';
import {simulateLoadout} from '../public/loadout-model.js';
import {recommendLoadout} from '../public/loadout-optimizer.js';
import {recommendTerritory,evaluateTerritoryTeam} from '../public/territory-model.js';
import {validatePartySettings} from '../public/party-model.js';
const fx=(name,v,unit='%')=>({name,unit,values:Array(7).fill(v)});
function hero(id,attack=0,buff=0){return {record:{id,name:id,element:'水',troop:'歩兵',skills:{charge:{name:'チャージ',effects:[fx('与ダメージ',buff),fx('与ダメージ 効果時間',2,'秒')]},trigger1:{effects:[fx('攻撃力',attack)]},trigger2:{effects:[]},trigger3:{effects:[]}}},heroLevel:40,levels:{charge:7,trigger1:7,trigger2:7,trigger3:7}};}
const context={mode:'attack',battle:'fieldBoss',race:'悪魔',troop:'歩兵',element:'水',attackType:'normal',enemyElement:'火',chargeEffects:'active'};
test('Charge is opt-in, stays separate from attack percent, and multiplies comparison only',()=>{
 const heroes=[hero('one',100,20)];const args={heroes,context,base:{mode:'none'}};
 const on=simulateLoadout(args),off=simulateLoadout({...args,context:{...context,chargeEffects:'off'}});
 assert.equal(on.total,100);assert.equal(off.total,100);assert.equal(off.charge,null);assert.equal(on.comparisonIndex,2.4);
 assert.equal(simulateLoadout({...args,context:{...context,mode:'loot'}}).charge,null);
 const team=evaluateTerritoryTeam(args);assert.equal(team.index,Math.round(on.comparisonIndex*team.factors.factor*1e6)/1e6);
});
test('Effects keep sides separate, max same-kind, cap mixed types, exclude supports and ally copies',()=>{
 const a=hero('a',0,150),b=hero('b',0,100),support={...hero('support',0,900),support:true};
 a.record.skills.charge.effects.push(fx('敵の被ダメージ',80),fx('自分の被ダメージ',-60),fx('敵の与ダメージ',-30),fx('味方の被ダメージ',-90),fx('敵の行軍速度',-70));
 const r=chargeSkillEffects([a,b,support]);assert.equal(r.bonus,200);assert.equal(r.reduction,-75);assert.equal(r.groups.outgoing,150);assert.equal(r.factor,3);assert.equal(r.skills.length,2);
 assert.equal(r.rows.find(x=>x.name==='味方の被ダメージ').applied,false);
});
test('Registered and overridden charge levels retain missing versus known zero',()=>{
 const h=hero('a');delete h.levels.charge;h.record.skills.charge.effects[0].values=[0,2,3,4,5,6,7];
 const state={progress:{a:{skills:{charge:2}}}};
 assert.equal(chargeSkillEffects([h],state).bonus,2);
 assert.equal(chargeSkillEffects([{...h,levels:{charge:1}}],state).unknown,0);
 const unknown=chargeSkillEffects([{...h,levels:{charge:0}}],state);assert.equal(unknown.bonus,0);assert.ok(unknown.unknown>0);
});
test('Single and multiple optimizers include charge buffs in selection without sharing heroes',()=>{
 const heroes=[hero('strong1',100),hero('strong2',99),hero('buff',0,100),hero('strong3',98),hero('strong4',97)];
 const args={context,candidates:{heroes,gear:[],memories:[]},base:{mode:'none'}};
 assert.ok(recommendLoadout(args).heroes.some(h=>h.record.id==='buff'));
 assert.ok(!recommendLoadout({...args,context:{...context,chargeEffects:'off'}}).heroes.some(h=>h.record.id==='buff'));
 const multi=recommendTerritory({...args,troop:'歩兵'});const chosen=multi.teams.flatMap(t=>t.heroes.map(h=>h.record.id));assert.ok(chosen.includes('buff'));assert.equal(new Set(chosen).size,4);
 const recomputed=multi.teams.map(t=>evaluateTerritoryTeam({context:t.context,heroes:t.heroes,base:{mode:'none'}}));assert.equal(multi.score,Math.round(recomputed.reduce((n,t)=>n+t.index,0)*1e6)/1e6);
});
test('Game data examples preserve duration, potency and defensive-only behavior',()=>{
 const records=Object.values(JSON.parse(fs.readFileSync(new URL('../public/data/game-heroes.json',import.meta.url))).characters);
 const get=name=>({record:{...records.find(r=>r.name===name),id:name},levels:{charge:7}});
 const r=chargeSkillEffects([get('サクヤ'),get('リアム'),get('ジュード')]);assert.equal(r.bonus,42);assert.equal(r.reduction,-35);
 assert.equal(r.rows.find(x=>x.hero==='サクヤ').duration,2);assert.equal(r.skills[0].powers[0].value,1160);
 assert.equal(chargeSkillEffects([get('ニュクス')]).bonus,0);
});
test('Save validates charge mode and level, preserves older saves and bundle consistency',()=>{
 const old={battle:'fieldBoss',race:'悪魔',grade:6,boss:'malacoda',tab:'hero',troop:'歩兵',attackType:'normal',owned:true,heroes:['a','b',''],memories:['','',''],gear:{},heroSettings:{a:{levels:{trigger1:7}}},drops:{},base:{mode:'none'}};
 const legacy=validatePartySettings(old);assert.equal(legacy.chargeEffects,'off');assert.equal(legacy.heroSettings.a.levels.charge,undefined);
 const s={...old,chargeEffects:'active',heroSettings:{a:{levels:{charge:6}}}};const clean=validatePartySettings(s);assert.equal(clean.heroSettings.a.levels.charge,6);assert.deepEqual(validatePartySettings(clean),clean);
 assert.throws(()=>validatePartySettings({...s,chargeEffects:'invalid'}));assert.throws(()=>validatePartySettings({...s,heroSettings:{a:{levels:{charge:8}}}}));
 const two={...s,heroes:['c','d','']},bundle={...s,territory:{options:{teamCount:2,shared:false,troop:'auto',supportCount:0,enemyElement:'auto'},teams:[{settings:s,supports:[]},{settings:two,supports:[]}]}};
 assert.equal(validatePartySettings(bundle).territory.teams[1].settings.chargeEffects,'active');
 assert.throws(()=>validatePartySettings({...bundle,territory:{...bundle.territory,teams:[{settings:s,supports:[]},{settings:{...two,chargeEffects:'off'},supports:[]}]}}));
});
