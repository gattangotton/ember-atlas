import fs from 'node:fs';
import {decodeMessagePack} from './read-messagepack.mjs';
const base=process.argv[2]||'C:/Users/takah/AppData/LocalLow/SquareEnix/EmberStoria/Fdfb6zs93olkPI9L/Cache/Masters/_/';
const equipment=Object.values(decodeMessagePack(fs.readFileSync(base+'/Equipment')));
const ids=[40011,40012,40013,40014,40015,291,292,293,294,295,50701,50702,50703];
const data=Object.fromEntries(ids.map(id=>{const r=equipment.find(x=>x[0]===id);if(!r||r[11].length!==6)throw Error('Missing six grades: '+id);const grades=r[11].map(g=>Object.fromEntries(g[0].map(m=>[m[0],m[1]])));const total={};for(const g of grades)for(const [id,n]of Object.entries(g))total[id]=(total[id]||0)+n;return [id,{name:r[3],grades,total}];}));
fs.writeFileSync('public/equipment-crafting-data.js','// Extracted from local Equipment master, field 11: six crafting/upgrade recipes.\nexport const craftingData='+JSON.stringify(data,null,2)+';\n');
