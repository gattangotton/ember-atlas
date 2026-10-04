import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {aggregateAbilities,abilityKey} from '../public/strategy-model.js';
import {gameAbilityOrder} from '../public/game-ability-order.js';
const evidence=JSON.parse(fs.readFileSync(new URL('../public/data/strategy-evidence.json',import.meta.url)));
test('All three base lists retain the independently recorded in-game order',()=>{
 const sorted=aggregateAbilities({evidence:{abilities:[...evidence.abilities].reverse()}});
 for(const category of ['内政','軍事','魔獣討伐'])assert.deepEqual(sorted.filter(a=>a.category===category).map(a=>a.key),evidence.abilities.filter(a=>a.category===category).map(a=>abilityKey(a.name,a.unit)));
});
test('New master abilities interleave by game order and custom abilities remain at the end',()=>{
 const rows=aggregateAbilities({evidence:{abilities:[{name:'独自の能力',unit:'%'},{name:'建設速度',unit:'%'},{name:'研究速度',unit:'%'},{name:'精鋭弓兵治療速度',unit:'%'}]}});
 assert.deepEqual(rows.map(a=>a.name),['精鋭弓兵治療速度','研究速度','建設速度','独自の能力']);
 assert.notEqual(gameAbilityOrder[abilityKey('資源保護(エーテル)','')],gameAbilityOrder[abilityKey('資源保護(エーテル)','%')]);
});
