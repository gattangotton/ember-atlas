import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BUILDINGS,validateBuildingProgress,validateBuildingEffects} from '../public/building-progress.js';
import {aggregateAbilities} from '../public/strategy-model.js';
import {buildShare,validateShare} from '../public/model.js';
import {normalizeAbilityRecord} from '../public/ability-names.js';
import {characterCard} from '../public/character-ui.js';
const farm=BUILDINGS.find(b=>b.name==='農場');
test('building definitions match shipped levels and six multiple-building limits',()=>{
 const data=JSON.parse(readFileSync(new URL('../public/data/buildings.json',import.meta.url)));
 for(const b of BUILDINGS){assert.equal(b.max,data.buildings.find(x=>x.id===b.id).levels.at(-1).level);}
 assert.deepEqual(BUILDINGS.filter(b=>b.limit===5).map(b=>b.name).sort(),['病院','防衛施設','農場','製材所','鉄工所','エーテル抽出所'].sort());
 assert.throws(()=>validateBuildingProgress({[farm.id]:[1,2,3,4,5,6]}));
 assert.throws(()=>validateBuildingProgress({'building-1':[1,2]}));
 assert.throws(()=>validateBuildingProgress({[farm.id]:[32]}));
 assert.throws(()=>validateBuildingProgress(JSON.parse('{"__proto__":[]}')));
});
test('each constructed copy adds its current cumulative level once; unknown and zero differ',()=>{
 const values=Array(farm.max).fill(null);values[0]=10;values[1]=20;values[3]=0;
 const state={buildingProgress:validateBuildingProgress({[farm.id]:[1,2,3,4,0]}),buildingEffects:validateBuildingEffects({[farm.id]:[{name:'食料生産量',unit:'%',values}]})};
 const g=aggregateAbilities({state:JSON.parse(JSON.stringify(state))})[0];
 assert.equal(g.total,30);assert.equal(g.unknown,1);assert.equal(g.sources.length,5);assert.equal(g.sources[4].acquired,false);
 assert.throws(()=>validateBuildingEffects({[farm.id]:[...state.buildingEffects[farm.id],...state.buildingEffects[farm.id]]}));
 const share=buildShare({id:'p',name:'検証',alliance:''},{},[],{},state.buildingProgress);
 assert.deepEqual(validateShare(JSON.parse(JSON.stringify(share))).buildingProgress,state.buildingProgress);
 assert.ok(!('buildingEffects' in share));
});
test('Gerardesca legacy core expands to three non-percent effects and remains idempotent',()=>{
 const old={name:'ゲラルデスカ',kind:'characters',ability:'攻撃力/T4基礎値',maximum:'45%/+27',coreEffects:[{name:'攻撃力',unit:'%',values:[5,10,15,25,35,45]},{name:'T4基礎値',unit:'%',values:[null,null,null,null,null,null]}]};
 const r=normalizeAbilityRecord(old);assert.equal(r.coreEffects.length,4);assert.equal(old.coreEffects.length,2);
 for(const e of r.coreEffects.slice(1)){assert.equal(e.unit,'');assert.deepEqual(e.values,[3,6,9,15,21,27]);}
 assert.deepEqual(normalizeAbilityRecord(r),r);
 const card=characterCard(r,{owned:true,skills:{}},{esc:String,portrait:()=>'',favorite:false,compared:false});
 assert.ok(card.includes('現在 5%'));assert.ok(card.includes('現在 3'));assert.ok(!card.includes('最大'));assert.ok(!card.includes('T4基礎値'));
 const locked=characterCard(r,{owned:false},{esc:String,portrait:()=>''});assert.ok(locked.includes('未解放 · 0%'));
});
