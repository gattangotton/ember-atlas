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
