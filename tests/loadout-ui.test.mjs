import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLoadoutUI} from '../public/loadout-ui.js';
import {validatePartySettings} from '../public/party-model.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../public/data/'+n+'.json',import.meta.url)));
test('Attack screen selects compatible partners, saves supports and reloads the same conditions; gathering remains usable',()=>{
 const listeners={};globalThis.document={addEventListener:(name,f)=>(listeners[name]??=[]).push(f)};
 try{
  const h=read('game-heroes'),records=Object.entries(h.characters).map(([id,r])=>({id,kind:'characters',...r})),simulation=read('game-simulation'),state={profile:{id:'test'},progress:{}},memories=read('game-memories');
  let saved;
  const esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const common={$:()=>null,esc,records:()=>records,state:()=>state,toast:()=>{},data:()=>({research:[]}),evidence:()=>({}),memories:()=>memories,simulation:()=>simulation,saveParty:(mode,settings,result)=>{saved={mode,settings:validatePartySettings(settings),result};}};
  const ui=createLoadoutUI(common,'attack');assert.match(ui.page(),/適性スコア順/);
  const change=(key,value)=>listeners.change.at(-1)({target:{closest:()=>true,dataset:{sim:key},value}});
  change('owned','catalog');change('baseMode','none');
  const leader=records.find(r=>r.name==='サクヤ');change('hero-0',leader.id);change('supportCount','1');change('partnerMatch','both');
  const click=action=>listeners.click.at(-1)({target:{closest:()=>({dataset:{simAction:action},closest:()=>true})}});
  click('partners');assert.match(ui.page(),/サポート 1/);click('save');assert.equal(saved.settings.heroes[0],leader.id);assert.equal(saved.settings.supports.filter(Boolean).length,1);assert.equal(saved.settings.supportCount,1);
  assert.equal(saved.settings.heroes.filter(Boolean).length,2);assert.equal(saved.settings.partnerMatch,'both');
  change('chargeEffects','active');change('enemyElement','風');change('heroSort','main');click('save');
  ui.load(saved.settings);assert.match(ui.page(),/編成の適性スコア/);assert.match(ui.page(),/チャージ効果・発動中の比較/);
  assert.equal(saved.settings.enemyElement,'風');assert.equal(saved.settings.heroSort,'main');
  const gather=createLoadoutUI(common,'gather');assert.match(gather.page(),/採集資源量/);assert.doesNotMatch(gather.page(),/fitness-controls/);
 }finally{delete globalThis.document;}
});

test('Goal inputs, recommendations, manual choices, invalidation and saved settings work in both simulators',()=>{
 const listeners={};globalThis.document={addEventListener:(name,f)=>(listeners[name]??=[]).push(f)};
 try{
  const nodes=[{id:'research-test',name:'対悪魔素材倍化率',lab:0,group:'討伐①',documentedMax:2,levels:[[10,0,0,0,10],[20,0,0,0,20]]}];
  const state={profile:{id:'goal'},progress:{},researchSpecs:{'research-test':{ability:'対悪魔素材倍化率',unit:'%',values:[10,20],requirementsKnown:true,requirements:[]}}};let saved;
  const ui=createLoadoutUI({$:()=>null,esc:x=>String(x??''),records:()=>[],state:()=>state,toast:()=>{},data:()=>({research:nodes}),evidence:()=>({}),memories:()=>({records:[]}),simulation:()=>({bosses:[],drops:[]}),saveParty:(mode,s)=>saved=validatePartySettings(s)},'loot');
  ui.page();
  const change=(sim,value)=>listeners.change.at(-1)({target:{dataset:{sim},value,closest:()=>true}});
  const click=dataset=>{const b={dataset,closest:()=>true};listeners.click.at(-1)({target:{closest:selector=>selector==='[data-goal-action]'?(dataset.goalAction?b:null):b}});};
  change('goalTarget','25');change('goalSub','5');click({goalAction:'calculate'});
  assert.match(ui.page(),/時間優先/);assert.match(ui.page(),/計画後の合計<b>25%/);
  click({goalAction:'choose',goalIndex:'1'});assert.match(ui.page(),/Lv.0 → 2/);
  listeners.change.at(-1)({target:{dataset:{goalCandidate:'research:research-test:2'},checked:false,closest:()=>true}});
  assert.match(ui.page(),/計画後の合計<b>5%/);
  click({goalAction:'calculate'});state.research={'research-test':1};assert.doesNotMatch(ui.page(),/class="goal-plans"/,'external progress changes invalidate cached proposals');
  click({simAction:'save'});assert.equal(saved.goalTarget,25);assert.equal(saved.goalSub,5);ui.load(saved);assert.match(ui.page(),/data-sim="goalTarget" value="25"/);
  change('race','龍');assert.doesNotMatch(ui.page(),/class="goal-plans"/);
  const attack=createLoadoutUI({$:()=>null,esc:x=>String(x??''),records:()=>[],state:()=>state,toast:()=>{},data:()=>({research:[]}),evidence:()=>({}),memories:()=>({records:[]}),simulation:()=>({bosses:[],drops:[]}),saveParty:()=>{}},'attack');
  assert.match(attack.page(),/目標達成プラン/);assert.match(attack.page(),/113%/);assert.match(ui.page(),/14.3%/);
 }finally{delete globalThis.document;}
});
