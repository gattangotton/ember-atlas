import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sortMemories,carouselView} from '../public/memory-carousel.js';
import {SEA_KINGDOM_GEAR} from '../public/raid-data.js';
import {normalizeAbilityRecord} from '../public/ability-names.js';
import {unlockedSlots} from '../public/mechanics.js';
import {validateCopies} from '../public/equipment-inventory.js';
const game=JSON.parse(fs.readFileSync(new URL('../public/data/game-masters.json',import.meta.url)));
test('Sea Kingdom equipment remains special and its third owned sub slot opens only at G6',()=>{
 assert.equal(SEA_KINGDOM_GEAR.length,5);
 for(const id of SEA_KINGDOM_GEAR){const r=normalizeAbilityRecord({id,kind:'equipment',...game.equipment[id]});assert.equal(r.raid,'no');assert.deepEqual(r.unlockGrades,[1,5,6]);assert.deepEqual(unlockedSlots(r,5),[true,true,false]);assert.deepEqual(unlockedSlots(r,6),[true,true,true]);const copy={id:'sea',grade:6,target:6,subAbilities:[null,null,{name:'攻撃力',value:5}]};assert.doesNotThrow(()=>validateCopies([copy],r));assert.throws(()=>validateCopies([{...copy,grade:5}],r));}
});
test('Release sorting keeps unknown dates last in both directions and does not mutate filtered input',()=>{
 const rows=[{id:'unknown',masterId:1},{id:'new',masterId:3,releaseDate:'2026-11-01'},{id:'old',masterId:2,releaseDate:'2025-01-01'}];
 assert.deepEqual(sortMemories(rows,'asc').map(r=>r.id),['old','new','unknown']);assert.deepEqual(sortMemories(rows,'desc').map(r=>r.id),['new','old','unknown']);assert.equal(rows[0].id,'unknown');assert.match(carouselView([],String),/一致するメモリがありません/);
});
test('November military research includes source values, prerequisites and costs for all seven additions',()=>{
 const added=Object.entries(game.researchMapping).filter(([,r])=>r.groupId===4&&r.masterId>=311&&r.masterId<=317);assert.equal(added.length,7);for(const [id] of added){assert.equal(game.researchCosts[id].length,5);assert.equal(game.researchSpecs[id].values.length,5);assert.ok(game.researchSpecs[id].requirements.length);}
});
