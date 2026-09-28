import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {defaultCharacterFilters,matchesCharacter} from '../public/character-filters.js';
test('Character filters combine starting rarity, ownership, charge and individual skill states',()=>{
 const r={kind:'characters',rarity:'☆5',skills:{charge:{target:'multiple',shape:'fan',extra:'both'}}};
 const p={owned:true,skills:{charge:7,active:3,trigger1:0},targetSkills:{active:5}};
 const f=defaultCharacterFilters();assert.equal(matchesCharacter(r,p,f),true);
 assert.equal(matchesCharacter({...r,rarity:'☆4'},p,f),false);
 assert.equal(matchesCharacter({...r,rarity:'☆3'},p,{...f,rarity:'☆3'}),true);
 for(const extra of ['buff','debuff','both'])assert.equal(matchesCharacter(r,p,{...f,extra}),true);
 assert.equal(matchesCharacter(r,p,{...f,target:'single'}),false);
 assert.equal(matchesCharacter(r,p,{...f,shape:'circle'}),false);
 assert.equal(matchesCharacter(r,p,{...f,ownership:'missing'}),false);
 assert.equal(matchesCharacter(r,p,{...f,skills:{charge:'max',active:'training',trigger1:'unknown'}}),true);
 assert.equal(matchesCharacter(r,p,{...f,skills:{active:'goal'}}),true);
 assert.equal(matchesCharacter(r,p,{...f,skills:{active:'3'}}),true);
 assert.equal(matchesCharacter(r,p,{...f,skills:{active:'max'}}),false);
 assert.equal(matchesCharacter(r,{}, {...f,skills:{active:'training'}}),false);
});
test('All indexed portraits and video filter icons exist; Uranos is distinct from Note',async()=>{
 const read=async name=>JSON.parse(await readFile(new URL('../public/data/'+name,import.meta.url),'utf8'));
 const portraits=await read('portraits.json'),icons=await read('filter-icons.json'),catalog=await read('catalog.json');
 assert.equal(Object.keys(portraits).length,71);assert.equal(Object.keys(icons).length,11);
 for(const item of [...Object.values(portraits),...Object.values(icons)])await access(new URL('../public/'+item.path,import.meta.url));
 const entry=name=>portraits[catalog.records.find(r=>r.kind==='characters'&&r.name===name).id];
 assert.equal(entry('ウラノス').source,'DPTW4024.MP4 35s');assert.equal(entry('ノート').source,'DPTW4024.MP4 30s');
});
