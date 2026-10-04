import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {applyGameWorld,withGameHero} from '../public/game-masters.js';
import {validateRecord} from '../public/model.js';
import {validateMechanics} from '../public/mechanics.js';
import {matchesCharacter,defaultCharacterFilters} from '../public/character-filters.js';
import {expandAltarBuildings} from '../public/building-definitions.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../public/data/'+n+'.json',import.meta.url)));
const heroes=read('game-heroes'),game=read('game-masters'),images=read('game-images');
const hero=id=>Object.entries(heroes.characters).find(([,r])=>r.masterId===id);
test('All 72 heroes have five complete skill descriptions, valid numeric tables and cumulative cores',()=>{
 assert.equal(Object.keys(heroes.characters).length,72);assert.equal(heroes.extraRecords.length,1);
 for(const [id,r] of Object.entries(heroes.characters)){
  validateRecord({id,kind:'characters',...r,portrait:images.heroes[id]});
  for(const [k,n] of Object.entries({charge:7,active:5,trigger1:7,trigger2:7,trigger3:7})){assert.equal(r.skillDescriptions[k].length,n);assert.ok(r.skillDescriptions[k].every(t=>t.length>0));assert.ok(r.skills[k].effects.length);}
  assert.ok(r.coreEffects.length);assert.ok(r.coreEffects.every(e=>e.values.length===6));
 }
 assert.deepEqual(hero(2)[1].coreEffects[0].values,[10,20,30,50,70,90]);
 assert.equal(hero(81)[1].skills.charge.effects.find(e=>e.name==='威力').values.at(-1),1850);
 assert.equal(hero(81)[1].skills.active.effects.find(e=>e.name==='増幅Lv.3 威力').values.at(-1),12600);
 assert.equal(hero(41)[1].coreEffects.find(e=>e.name==='研究加速(秒)').unit,'秒');
});
test('Self buffs and enemy debuffs remain distinct across both skill types',()=>{
 assert.equal(hero(2)[1].skills.charge.extra,'debuff');
 assert.equal(hero(81)[1].skills.charge.extra,'buff');
 assert.equal(hero(47)[1].skills.active.extra,'debuff');
 assert.equal(hero(8)[1].skills.active.extra,'none'); // recovery/cleanse is separately described
 assert.equal(matchesCharacter({kind:'characters',...hero(27)[1]}, {}, {...defaultCharacterFilters(),extra:'both'}),true);
 assert.equal(matchesCharacter({kind:'characters',...hero(81)[1]}, {}, {...defaultCharacterFilters(),extra:'debuff'}),false);
});
test('Game common values replace obsolete edits; edits after this revision remain editable',()=>{
 const [id,source]=hero(81),old={id,name:'old',skills:{},coreEffects:[]};
 assert.equal(withGameHero(old,heroes,old).name,source.name);
 const edit={id,name:'manual',commonRevision:'pc-2026-10-03'};
 assert.equal(withGameHero(old,heroes,edit).name,'manual');
 assert.equal(validateMechanics(edit).commonRevision,edit.commonRevision);
});
test('Research and all facility levels receive exact master costs; appearance changes follow master levels',()=>{
 const mechanics=read('mechanics'),b=read('buildings');b.buildings=expandAltarBuildings(b.buildings);applyGameWorld(mechanics,b,game,images);
 assert.equal(mechanics.research.length,419);
 assert.deepEqual(mechanics.research.find(n=>n.id==='research-0-4').levels[4].slice(0,4),[2800,1400,1400,1400]);
 const castle=b.buildings.find(x=>x.id==='building-1');assert.equal(castle.levels[0].seconds,2);assert.deepEqual(castle.levels[0].resources,[1000,1000,1500,0]);
 assert.notEqual(castle.levels[0].image,castle.levels[5].image);
 for(const n of mechanics.research)assert.ok(n.levels.every(l=>l.every(v=>Number.isFinite(v)&&v>=0)));
 for(const building of b.buildings)for(const l of building.levels){assert.ok(l.resources.every(v=>Number.isFinite(v)&&v>=0));assert.ok(l.image);}
});
test('Every published native texture exists and all requested asset groups are complete',()=>{
 assert.equal(Object.keys(images.equipment).length,207);assert.equal(Object.keys(images.heroes).length,72);assert.equal(Object.keys(images.raids).length,6);assert.equal(Object.keys(images.icons).length,11);assert.equal(images.missing.length,0);
 for(const group of ['equipment','heroes','raids','icons','buildings'])for(const p of Object.values(images[group]))assert.ok(fs.existsSync(new URL('../public/'+p,import.meta.url)),p);
});
