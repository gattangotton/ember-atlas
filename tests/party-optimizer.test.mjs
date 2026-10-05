import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendLoadout,ownedCandidates} from '../public/loadout-optimizer.js';
import {simulateLoadout} from '../public/loadout-model.js';
import {validateParties,validatePartySettings} from '../public/party-model.js';
import {buildShare,validateShare} from '../public/model.js';
const effect=(name,value)=>({name,unit:'%',values:Array(7).fill(value)});
const hero=(id,element,effects)=>({record:{id,kind:'characters',name:id,element,skills:{trigger1:{effects},trigger2:{effects:[]},trigger3:{effects:[]}}},levels:{trigger1:1,trigger2:1,trigger3:1}});
const gear=(key,slot,effects)=>({key,record:{id:key,kind:'equipment',name:key,slot,mainAbilities:effects},grade:6,subAbilities:[]});
const memory=(key,value)=>({key,record:{id:'memory-1',name:'メモリ',mainEffects:[{name:'対悪魔素材倍化率',value,unit:'%'}]},copy:{id:key,subs:[]}});
test('Optimizer searches leader-dependent effects rather than choosing heroes independently',()=>{
 const heroes=[hero('fire','火',[effect('攻撃力',10)]),hero('water','水',[effect('攻撃力',30)]),hero('third','風',[effect('攻撃力',20)])],gears=[gear('fire-gear','武器',[effect('火属性リーダー攻撃力',100)]),gear('water-gear','武器',[effect('水属性リーダー攻撃力',25)])];
 const context={mode:'attack',race:'悪魔',troop:'歩兵',battle:'fieldBoss'},candidates={heroes,gear:gears,memories:[]};
 const r=recommendLoadout({context,candidates,base:{mode:'none'}});assert.equal(r.heroes[0].record.id,'fire');assert.equal(r.heroes[1].record.id,'water');assert.equal(r.result.total,140);
 const brute=[];for(const a of heroes)for(const b of heroes)if(a!==b)for(const g of gears)brute.push(simulateLoadout({context:{...context,element:a.record.element},heroes:[a,b],gear:[g],base:{mode:'none'}}).total);assert.equal(r.result.total,Math.max(...brute));
});
test('Gather objective switches recommendation; memory copies and gear subs participate',()=>{
 const candidates={heroes:[hero('speed','水',[effect('採集速度',30)]),hero('amount','火',[effect('採集量',40)])],gear:[gear('speed-gear','武器',[effect('食料採集速度',10)]),{...gear('amount-gear','武器',[]),subAbilities:[{name:'食料採集量',value:25}]}],memories:[]};
 const context={mode:'gather',resource:'食料'};
 const a=recommendLoadout({context:{...context,objective:'amount'},candidates,heroCount:1,base:{mode:'none'}}),s=recommendLoadout({context:{...context,objective:'speed'},candidates,heroCount:1,base:{mode:'none'}});
 assert.equal(a.heroes[0].record.id,'amount');assert.equal(a.result.total,65);assert.equal(s.heroes[0].record.id,'speed');assert.equal(s.result.total,40);
 const ms=recommendLoadout({context:{mode:'loot',race:'悪魔'},candidates:{heroes:[],gear:[],memories:[memory('copy-a',10),memory('copy-b',20),memory('copy-c',5)]},base:{mode:'none'}});assert.equal(ms.result.total,30);assert.equal(new Set(ms.memories.map(m=>m.key)).size,2);
});
test('Only owned copies and actual registered skill levels are eligible; inputs are untouched',()=>{
 const records=[hero('owned','火',[]).record,hero('other','水',[]).record,gear('g','武器',[]).record],state={progress:{owned:{owned:true,skills:{trigger1:2}},g:{owned:true,instances:[{id:'copy',grade:3,target:6,subAbilities:[null,null,null]}]}}};const before=structuredClone(state),r=ownedCandidates(records,state,[]);assert.deepEqual(r.heroes.map(h=>h.record.id),['owned']);assert.equal(r.heroes[0].levels.trigger1,2);assert.equal(r.gear[0].grade,3);assert.deepEqual(state,before);
});
const settings={battle:'field',race:'悪魔',grade:6,boss:'',tab:'hero',troop:'歩兵',attackType:'all',owned:true,heroes:['hero','',''],memories:['','',''],gear:{},heroSettings:{hero:{levels:{trigger1:2}}},drops:{},base:{mode:'auto',research:true,core:true,building:true,extra:false}};
const party={id:'party-1',name:'素材PT',mode:'loot',updatedAt:'2026-10-05T00:00:00Z',settings,result:{total:42,unknown:0}};
test('Saved parties round-trip with strict bounds and without extraneous private payloads',()=>{
 const p=validateParties([{...party,private:'secret',settings:{...settings,private:'secret'}}]);assert.equal(p[0].settings.heroSettings.hero.levels.trigger1,2);assert.ok(!JSON.stringify(p).includes('secret'));assert.deepEqual(validateParties(p),p);
 for(const invalid of [[party,party],[{...party,mode:'bad'}],[{...party,result:{total:Infinity,unknown:0}}],[{...party,settings:{...settings,heroes:['hero','hero','']}}]])assert.throws(()=>validateParties(invalid));
 assert.throws(()=>validatePartySettings({...settings,heroSettings:{hero:{levels:{trigger1:99}}}}));
});
test('Version 3 alliance sharing includes selected parties and strips memory notes and labels',()=>{
 const profile={id:'p',name:'Player',alliance:'A'},memoryInventory={'memory-1':[{id:'copy',label:'private-label',note:'private-note',subs:Array.from({length:3},()=>({status:'empty',name:'',unit:'%',value:null}))}]};
 const v=buildShare(profile,{},[],{}, {},{memoryInventory,savedParties:[party]});assert.equal(v.version,3);assert.ok(!JSON.stringify(v).includes('private'));assert.deepEqual(validateShare(v),v);assert.equal(validateShare(v).savedParties.length,1);
 const omitted=buildShare(profile,{},[],{}, {},{memoryInventory});assert.equal(validateShare(omitted).savedParties,undefined);assert.equal(validateShare(buildShare(profile,{},[],{})).version,2);
});
