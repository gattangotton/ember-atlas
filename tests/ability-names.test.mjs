import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {abilityName,normalizeAbilityRecord,normalizeAbilityState} from '../public/ability-names.js';
import {aggregateAbilities,diagnoseAbility} from '../public/strategy-model.js';
import {equipmentMatches} from '../public/equipment-model.js';
import {researchIcon} from '../public/research-icons.js';
const data=path=>JSON.parse(readFileSync(new URL('../public/data/'+path,import.meta.url)));
test('Base labels are unchanged and aliases are idempotent without merging distinct effects',()=>{
 for(const a of data('strategy-evidence.json').abilities)assert.equal(abilityName(a.name),a.name);
 for(const [old,expected] of [['火属性','火属性リーダー攻撃力'],['治癒速度効率','兵士治療速度'],['建築資源効率','建設資源効率'],['不浄・メモリ倍加','対不浄メモリ倍化率'],['竜倍化','対龍素材倍化率'],['対魔獣経験値','対魔獣獲得経験値'],['歩兵行軍','歩兵行軍速度']]){assert.equal(abilityName(old),expected);assert.equal(abilityName(expected),expected);}
 assert.notEqual(abilityName('施設防衛時攻撃力'),abilityName('拠点防衛時攻撃力'));
 assert.notEqual(abilityName('防御効率'),abilityName('攻撃力'));
 assert.equal(abilityName('T4基礎値'),'T4基礎値');
});
test('Structured fields normalize without touching source names, notes, values or IDs',()=>{
 const r={id:'test',name:'建築の戦士',kind:'characters',ability:'建築速度/火属性',note:'原文：建築速度',coreEffects:[{name:'建築速度',values:[1,null,3]}],skills:{charge:{name:'建築の力',effects:[{name:'対魔獣攻撃',values:[2]}]}}};
 const normalized=normalizeAbilityRecord(r);assert.equal(normalized.name,r.name);assert.equal(normalized.note,r.note);assert.equal(normalized.id,r.id);assert.equal(normalized.ability,'建設速度/火属性リーダー攻撃力');assert.deepEqual(normalized.coreEffects[0].values,r.coreEffects[0].values);assert.equal(normalized.skills.charge.name,r.skills.charge.name);assert.equal(r.coreEffects[0].name,'建築速度');
});
test('Old player, alliance and reusable data use the same names after repeated normalization',()=>{
 const progress={item:{instances:[{subAbilities:[{name:'竜倍加',value:5},null]}]}};
 const state={progress,accounts:[{progress:structuredClone(progress)}],members:[{items:[structuredClone(progress.item)]}],researchSpecs:{r:{ability:'兵士治癒速度'}},foundations:[{type:'core',name:'火属性',spec:{effects:[{name:'火属性',values:[1]}]}}]};
 normalizeAbilityState(state);const copy=structuredClone(state);normalizeAbilityState(state);assert.deepEqual(state,copy);assert.equal(state.progress.item.instances[0].subAbilities[0].name,'対龍素材倍化率');assert.equal(state.accounts[0].progress.item.instances[0].subAbilities[0].value,5);assert.equal(state.foundations[0].spec.effects[0].name,'火属性リーダー攻撃力');
});
test('Manual totals under old keys are retained, conflicts are surfaced, and source totals are combined once',()=>{
 const manual={'建築速度|%':{total:15},'建設速度|%':{total:20}};
 const state={abilityUser:{manual,extras:[{kind:'施設',label:'a',ability:'建築速度',unit:'%',acquired:true,value:5},{kind:'施設',label:'b',ability:'建設速度',unit:'%',acquired:true,value:10}]}};
 let rows=aggregateAbilities({state});assert.equal(rows.length,1);assert.equal(rows[0].total,15);assert.equal(rows[0].manual.total,20);assert.equal(rows[0].manualConflicts.length,1);assert.ok(diagnoseAbility(rows[0]).some(s=>s.includes('旧表記')));assert.equal(manual['建築速度|%'].total,15);
 rows=aggregateAbilities({state:{abilityUser:{manual:{'建築速度|%':{total:15}}}}});assert.equal(rows[0].manual.total,15);
});
test('Alias searches match equipment and renamed research retains every icon',()=>{
 assert.equal(equipmentMatches({kind:'equipment',name:'例',mainAbilities:[{name:'対龍素材倍化率'}]},{query:'竜倍加'}),true);
 for(const n of data('mechanics.json').research)assert.equal(researchIcon(abilityName(n.name)),researchIcon(n.name),n.name);
});
