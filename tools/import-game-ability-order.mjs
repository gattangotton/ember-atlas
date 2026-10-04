import fs from 'node:fs';
import {decodeMessagePack} from './read-messagepack.mjs';
import {abilityName} from '../public/ability-names.js';
// Descending Ability IDs match the three in-game lists in the recorded
// base-ability screen. Unit is part of the key: flat and % bonuses differ.
const order={};
for(const a of decodeMessagePack(fs.readFileSync('.work/game-master/Ability'))){
 if(![0,1].includes(a[1]??0)||!a[3])continue;
 const name=abilityName(a[3]),unit=a[1]===1?'%':/\(秒\)$/.test(name)?'秒':'';
 const key=name+'|'+unit;
 if(order[key]!==undefined&&order[key]!==a[0])throw Error('Ambiguous ability order: '+key);
 order[key]=a[0];
}
fs.writeFileSync('public/game-ability-order.js','// Generated from Ability; list direction verified against in-game video.\nexport const gameAbilityOrder='+JSON.stringify(order,null,2)+';\n');
console.log('Ability order:',Object.keys(order).length);
