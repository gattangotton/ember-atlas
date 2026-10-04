import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {effectWeight,lootExpectation,simulateLoadout,triggerCondition,memorySlotCount} from '../public/loadout-model.js';
const effect=(name,value)=>({name,unit:'%',values:Array(7).fill(value)});
const context={mode:'loot',race:'悪魔',battle:'field'};
const none={mode:'none'};
const hero={id:'hero-a',kind:'characters',name:'テスト',rarity:'☆5',skills:{trigger1:{name:'攻撃',effects:[effect('対悪魔攻撃力',20)]},trigger2:{name:'収集',effects:[effect('対魔獣素材倍化率',6)]},trigger3:{name:'悪魔収集',effects:[effect('対悪魔素材倍化率',10)]}},coreEffects:[effect('対悪魔素材倍化率',4)]};
const h={record:hero,levels:{trigger1:1,trigger2:1,trigger3:1}};
const gear={record:{id:'g',name:'武器',slot:'武器',mainAbilities:[effect('対悪魔素材倍化率',5),effect('対魔獣素材倍化率',3)]},grade:6,subAbilities:[{name:'対悪魔素材倍加率',value:2}]};
const memory={record:{id:'m',name:'メモリ',mainEffectsKnown:true,mainEffects:[{name:'対悪魔素材倍化率',unit:'%',value:15}]},copy:{id:'one',subs:[{status:'set',name:'対魔獣素材倍化率',unit:'%',value:2},{status:'empty'},{status:'empty'}]}};
const node={id:'research-a',name:'対悪魔素材倍化率',group:'討伐①',documentedMax:2};
const state={progress:{'hero-a':{owned:true,skills:{}}},research:{'research-a':1},researchSpecs:{'research-a':{ability:node.name,unit:'%',values:[8,16]}},abilityUser:{manual:{'対悪魔素材倍化率|%':{total:50}},extras:[]}};
test('All selected sources combine, research and globally owned core contribute exactly once',()=>{
 const result=simulateLoadout({context,heroes:[h],gear:[gear],memories:[memory],records:[hero],nodes:[node],state,drops:[{ability:'対悪魔素材倍化率',name:'雫',value:9}]});
 assert.equal(result.total,64);assert.equal(result.unknown,0);
 assert.equal(result.rows.find(x=>x.source==='hero').total,16);assert.equal(result.rows.find(x=>x.source==='core').total,4);assert.equal(result.rows.find(x=>x.source==='research').total,8);
 assert.equal(simulateLoadout({context,records:[hero],nodes:[node],state}).total,12,'Owned core does not require selection');
});
test('Unselected inventories do not count and simulation does not mutate personal data',()=>{
 const s=structuredClone(state);s.memoryInventory={m:[memory.copy]};s.progress.g={owned:true,instances:[{id:'g1',grade:6}]};const before=structuredClone(s);
 assert.equal(simulateLoadout({context,state:s,base:none}).total,0);assert.deepEqual(s,before);
});
test('Recorded base totals replace automatic sources including research and core',()=>{
 const result=simulateLoadout({context,records:[hero],nodes:[node],state,heroes:[h],base:{mode:'manual'}});
 assert.equal(result.total,66);assert.equal(result.rows.find(x=>x.source==='core').total,0);assert.equal(result.rows.find(x=>x.source==='research').total,0);
 const missing=simulateLoadout({context,nodes:[node],state:{research:{},researchSpecs:state.researchSpecs},base:{mode:'manual'}});assert.equal(missing.unknown,1);
});
test('Source toggles and equipment/item extras prevent double counting',()=>{
 const s=structuredClone(state);s.abilityUser.extras=['装備','アイテム','その他'].map((kind,i)=>({id:'extra-'+i,kind,label:kind,ability:'対悪魔素材倍化率',unit:'%',value:10,acquired:true}));
 const r=simulateLoadout({context,records:[hero],nodes:[node],state:s,base:{mode:'auto',research:false,core:false,building:false,extra:true}});assert.equal(r.total,10);assert.equal(r.ignored.length,2);
});
test('Matching race, universal effect, dragon aliases, and battle type are distinguished',()=>{
 assert.equal(effectWeight('対竜攻撃力',{mode:'attack',race:'龍'}),1);assert.equal(effectWeight('対悪魔素材倍化率',{...context,race:'堕天'}),0);
 assert.equal(effectWeight('対魔獣素材倍加率',context),1);assert.equal(effectWeight('対悪魔メモリ倍化率',context),0);
 for(const battle of ['field','fieldBoss','raid','rally']){
  assert.equal(effectWeight('集結部隊時攻撃力',{mode:'attack',battle}),battle==='rally'?1:0);
  assert.equal(effectWeight('対大型魔獣攻撃力',{mode:'attack',battle}),['raid','rally'].includes(battle)?1:0);
  assert.equal(effectWeight('対集結魔獣素材倍化率',{...context,battle}),battle==='rally'?1:0);
 }
});
test('Raid disables all drops and temporary title extras; field boss permits drops',()=>{
 const drops=[{name:'雫',ability:'対魔獣攻撃力',value:60}],s={abilityUser:{extras:[{id:'title',kind:'称号',label:'称号',ability:'攻撃力',unit:'%',value:10,acquired:true}]}};
 assert.equal(simulateLoadout({context:{mode:'attack',battle:'raid'},drops,state:s}).total,0);
 assert.equal(simulateLoadout({context:{mode:'attack',battle:'fieldBoss'},drops,state:s}).total,70);
});
test('Leader element and troop conditions exclude unrelated target effects',()=>{
 const c={mode:'attack',race:'悪魔',battle:'fieldBoss',troop:'歩兵',element:'水'};
 for(const n of ['攻撃力','部隊時攻撃力','歩兵攻撃力','水属性リーダー攻撃力','対悪魔攻撃力','対魔獣攻撃力'])assert.equal(effectWeight(n,c),1,n);
 for(const n of ['対歩兵攻撃力','対部隊攻撃力','騎兵攻撃力','雷属性リーダー攻撃力','施設防衛時攻撃力','対集結魔獣攻撃力'])assert.equal(effectWeight(n,c),0,n);
 assert.equal(effectWeight('歩兵攻撃力',{...c,troops:{歩兵:30,弓兵:70}}),.3);
});
test('Action-specific bonuses are separate from common bonuses',()=>{
 assert.equal(effectWeight('通常攻撃時攻撃力',{mode:'attack',attackType:'normal'}),1);
 assert.equal(effectWeight('通常攻撃時攻撃力',{mode:'attack',attackType:'charge'}),0);
 assert.equal(effectWeight('アクティブスキル攻撃力',{mode:'attack',attackType:'active',battle:'fieldBoss'}),0);
});
test('Trigger skill levels are respected and missing levels remain unknown',()=>{
 const x=structuredClone(hero);x.skills.trigger2.effects[0].values=[1,2,3,4,5,6,7];
 assert.equal(simulateLoadout({context,heroes:[{record:x,levels:{trigger2:3,trigger3:0}}],base:none}).total,3);
 assert.equal(simulateLoadout({context,heroes:[{record:x,levels:{trigger2:3,trigger3:0}}],base:none}).unknown,1);
});
test('Probabilistic and multiple-enemy effects require explicit activation',()=>{
 const r=structuredClone(hero);r.skillDescriptions={trigger1:['攻撃時に15%の確率で通常攻撃の攻撃力がアップします']};r.skills.trigger1.effects=[effect('通常攻撃攻撃力',150)];
 const c={mode:'attack',attackType:'normal'},heroItem={...h,record:r};assert.equal(triggerCondition(r,'trigger1'),'proc');
 assert.equal(simulateLoadout({context:c,heroes:[heroItem],base:none}).total,0);
 assert.equal(simulateLoadout({context:c,heroes:[{...heroItem,enabled:{trigger1:true}}],base:none}).total,150);
 r.skillDescriptions.trigger1=['2部隊以上の敵との戦闘時に攻撃力がアップします'];assert.equal(triggerCondition(r,'trigger1'),'multiple');
});
test('Loss-trigger stacks are capped at six and are not added by default',()=>{
 const r=structuredClone(hero);r.skillDescriptions={trigger1:['部隊兵士が15％減少するたびに攻撃力：+12%']};r.skills.trigger1.effects=[effect('15％減少するたびに攻撃力',12)];
 assert.equal(simulateLoadout({context:{mode:'attack'},heroes:[{...h,record:r,stacks:3}],base:none}).total,36);
 assert.equal(simulateLoadout({context:{mode:'attack'},heroes:[{...h,record:r,stacks:20}],base:none}).total,72);
});
test('Same memory type allows distinct copies but rejects the same individual',()=>{
 assert.throws(()=>simulateLoadout({context,memories:[memory,memory],base:none}),/同じメモリ個体/);
 const second={...memory,copy:{...memory.copy,id:'two'}};
 assert.equal(simulateLoadout({context,memories:[memory,second],base:none}).total,34);
 assert.throws(()=>simulateLoadout({context,heroes:[h,h],base:none}),/同じエンバース/);
});
test('Memory unknown, empty and zero sub effects are distinct',()=>{
 const m=structuredClone(memory);m.copy.subs=[{status:'unknown'},{status:'empty'},{status:'set',name:'対悪魔素材倍化率',unit:'%',value:0}];
 const r=simulateLoadout({context,memories:[m],base:none});assert.equal(r.total,15);assert.equal(r.unknown,1);
});
test('Only unlocked missing gear subs count as unknown, and grade missing is not G1',()=>{
 const g={...gear,owned:true,grade:1,subAbilities:[null,null,null]};assert.equal(simulateLoadout({context,gear:[g],base:none}).unknown,1);
 const missing=structuredClone(gear);missing.record.mainAbilities[0].values[5]=null;assert.equal(simulateLoadout({context,gear:[missing],base:none}).unknown,1);
});
test('Loot thresholds 0, 100 and 200 preserve guaranteed multipliers and fractional chance',()=>{
 assert.deepEqual(lootExpectation(0),{minimum:1,maximum:1,chance:0,expected:1});
 assert.deepEqual(lootExpectation(100),{minimum:2,maximum:2,chance:0,expected:2});
 assert.deepEqual(lootExpectation(250.5),{minimum:3,maximum:4,chance:50.5,expected:3.505});
});
test('Shipped simulation data has source-linked drops, verified races and research unlock',()=>{
 const d=JSON.parse(fs.readFileSync('public/data/game-simulation.json'));assert.equal(d.drops.length,50);assert.equal(d.bosses.length,6);
 assert.equal(d.bosses.find(b=>b.id==='chiliat').race,'超獣');assert.equal(d.bosses.find(b=>b.id==='jormungand').race,'龍');
 assert.equal(d.drops.find(d=>d.id==='3116').value,9);assert.equal(d.drops.find(d=>d.id==='3026').value,60);
 assert.ok(d.drops.every(x=>Number.isFinite(x.value)&&x.source&&x.duration===3600));
 assert.equal(memorySlotCount({},d),2);assert.equal(memorySlotCount({research:{[d.memorySlots.researchId]:1}},d),3);
});
