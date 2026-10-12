import fs from 'node:fs';
import {decodeMessagePack} from './read-messagepack.mjs';
import {abilityName} from '../public/ability-names.js';
const path=process.argv[2]||'.work/game-master-2026-10-09/Ability';
const names=[...new Set(decodeMessagePack(fs.readFileSync(path)).map(r=>abilityName(r[3])).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja'));
fs.writeFileSync('public/game-ability-names.js','// Game Ability names; this dictionary is not an item-specific candidate pool.\nexport const GAME_ABILITY_NAMES='+JSON.stringify(names,null,1)+';\n');
console.log('Game ability names:',names.length);
