import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {formationBonus,combatFactors,allocateItems,recommendTerritory} from '../public/territory-model.js';
import {TERRITORY_COMBAT} from '../public/territory-combat-data.js';
import {ownedCandidates} from '../public/loadout-optimizer.js';
import {validatePartySettings} from '../public/party-model.js';
const effect=(name,value)=>({name,unit:'%',values:Array(7).fill(value)});
const hero=(id,element='火',troop='歩兵',value=0)=>({record:{id,name:id,element,troop,skills:{trigger1:{effects:[effect('攻撃力',value)]},trigger2:{effects:[]},trigger3:{effects:[]}}},levels:{trigger1:1,trigger2:1,trigger3:1},heroLevel:40});
const a=hero('a'),b=hero('b'),c=hero('c','水'),d=hero('d','風','弓兵');
const data={...TERRITORY_COMBAT,heroes:Object.fromEntries([a,b,c,d].map(h=>[h.record.id,{name:h.record.name,birthplace:2,efficiency:{歩兵:1,弓兵:.8,騎兵:.8}}]))};
test('Game bonuses distinguish slots, matching origin, level and leader efficiency',()=>{
 assert.equal(formationBonus([a,b],{},data).total,24);
 assert.equal(formationBonus([a,b,c,{...d,support:true}],{},data).total,35.6);
 assert.equal(combatFactors([a,b],{troop:'弓兵',attackType:'normal',enemyElement:'風'},{},data).affinity,1.3);
 assert.equal(combatFactors([a,b],{troop:'弓兵',attackType:'charge',enemyElement:'風'},{},data).affinity,1);
 assert.equal(combatFactors([a,b],{troop:'弓兵',attackType:'normal'},{},data).attributeUnknown,true);
 const unknown={...b,heroLevel:0};assert.equal(formationBonus([a,unknown],{},data).unknown,1);
 const cross={...data,heroes:{a:{name:'a',birthplace:9},b:{name:'b',birthplace:14}}};assert.equal(formationBonus([a,b],{},cross).rows[0].parts.birthplace,1);
});
test('Joint item assignment gives a scarce item to the team that needs it, not the first team',()=>{
 const items=[{key:'rare'},{key:'common'}],teams=[{},{}],score=(x,t,i)=>x.key==='rare'?(i?99:100):(i?1:98);
 const result=allocateItems(items,teams,1,score);assert.equal(result[0][0].key,'common');assert.equal(result[1][0].key,'rare');
 const shared=allocateItems(items,teams,1,score,{shared:true});assert.deepEqual(shared.map(xs=>xs[0].key),['rare','rare']);
});
test('Memory matching prevents same-name duplicates per team but allows owned copies across teams',()=>{
 const items=[{key:'x1',name:'X'},{key:'x2',name:'X'},{key:'y',name:'Y'}];const r=allocateItems(items,[{},{}],2,x=>x.name==='X'?10:5,{typeKey:x=>x.name});
 assert.equal(r.flat().length,3);assert.equal(new Set(r.flat().map(x=>x.key)).size,3);for(const t of r)assert.equal(new Set(t.map(x=>x.name)).size,t.length);
});
test('Multi-team planning keeps heroes and owned items disjoint and respects selected troop',()=>{
 const candidates={heroes:[a,b,c,d],gear:[{key:'g1',record:{id:'g',slot:'武器',mainAbilities:[effect('攻撃力',100)]},grade:6}],memories:[]};
 const args={candidates,context:{race:'悪魔',attackType:'normal',enemyElement:'風'},base:{mode:'none'},troop:'歩兵',data};const before=JSON.stringify(args);const r=recommendTerritory(args);
 assert.equal(r.teams.length,2);assert.equal(new Set(r.teams.flatMap(t=>t.heroes.map(h=>h.record.id))).size,4);assert.equal(r.teams.flatMap(t=>t.gear).length,1);assert.ok(r.teams.every(t=>t.context.troop==='歩兵'));assert.equal(JSON.stringify(args),before);
 assert.throws(()=>recommendTerritory({...args,teamCount:3}),/最低6人/);
 assert.equal(recommendTerritory({...args,shared:true}).teams.flatMap(t=>t.gear).length,2);
});
test('Saved multi-team bundles round-trip and reject duplicate heroes, copies and recursive bundles',()=>{
 const s={battle:'fieldBoss',race:'悪魔',grade:6,boss:'malacoda',tab:'hero',troop:'歩兵',attackType:'normal',owned:true,heroes:['a','b',''],memories:['','',''],gear:{武器:'g:1'},heroSettings:{},drops:{},base:{mode:'none'}};
 const two={...s,heroes:['c','d',''],gear:{武器:'g:2'}};const bundle={...s,territory:{options:{teamCount:2,shared:false,troop:'auto',supportCount:0,enemyElement:'auto'},teams:[{settings:s,supports:[]},{settings:two,supports:[]}]}};
 const clean=validatePartySettings(bundle);assert.deepEqual(validatePartySettings(clean),clean);
 assert.throws(()=>validatePartySettings({...bundle,territory:{...bundle.territory,teams:[{settings:s,supports:[]},{settings:s,supports:[]}]}}),/重複/);
 assert.throws(()=>validatePartySettings({...bundle,territory:{...bundle.territory,teams:[{settings:bundle,supports:[]},{settings:two,supports:[]}]}}));
 assert.throws(()=>validatePartySettings({...bundle,territory:{...bundle.territory,options:{...bundle.territory.options,shared:true}}}));
 assert.throws(()=>validatePartySettings({...bundle,territory:{...bundle.territory,teams:[{settings:s,supports:[]},{settings:{...two,gear:s.gear},supports:[]}]}}),/重複/);
 assert.throws(()=>validatePartySettings({...bundle,territory:{...bundle.territory,teams:[{settings:s,supports:[]},{settings:{...two,race:'龍'},supports:[]}]}}));
});
test('Three parties with third and support slots remain disjoint',()=>{
 const heroes=Array.from({length:12},(_,i)=>hero('hero'+i,i%2?'水':'火','歩兵',12-i));
 const r=recommendTerritory({candidates:{heroes,gear:[],memories:[]},teamCount:3,heroCount:3,supportCount:1,context:{race:'悪魔',attackType:'normal',enemyElement:'火'},base:{mode:'none'},troop:'歩兵'});
 assert.equal(r.teams.length,3);assert.ok(r.teams.every(t=>t.heroes.length===4));
 assert.equal(new Set(r.teams.flatMap(t=>t.heroes.map(h=>h.record.id))).size,12);
});
test('Real game inventory produces a valid bounded plan with no personal data mutation',()=>{
 const read=n=>JSON.parse(fs.readFileSync(new URL('../public/data/'+n+'.json',import.meta.url))),h=read('game-heroes'),m=read('game-masters'),cat=read('catalog'),mem=read('game-memories');
 const heroes=Object.entries(h.characters).slice(0,12).map(([id,r])=>({id,kind:'characters',...r})),gear=cat.records.filter(r=>r.kind==='equipment'&&m.equipment[r.id]).slice(0,20).map(r=>({...r,...m.equipment[r.id]}));
 const records=[...heroes,...gear],state={progress:Object.fromEntries(records.map(r=>[r.id,r.kind==='characters'?{owned:true,level:40,skills:{trigger1:7,trigger2:7,trigger3:7}}:{owned:true,instances:[{id:'copy',grade:6,target:6,subAbilities:[null,null,null]}]}])),memoryInventory:Object.fromEntries(mem.records.slice(0,12).map(r=>[r.id,[{id:'copy',subs:[]}]]))};
 const r=recommendTerritory({candidates:ownedCandidates(records,state,mem.records),state,context:{race:'悪魔',attackType:'normal',enemyElement:'火'},base:{mode:'none'}});
 assert.ok(r.score>0);assert.equal(r.teams.length,2);assert.equal(new Set(r.teams.flatMap(t=>t.gear.map(g=>g.key))).size,r.teams.flatMap(t=>t.gear).length);
});
