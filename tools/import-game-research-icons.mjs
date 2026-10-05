import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeMessagePack} from './read-messagepack.mjs';
const bytes=fs.readFileSync('.work/game-master/Research'),groups=decodeMessagePack(bytes);
const game=JSON.parse(fs.readFileSync('public/data/game-masters.json'));
const nodes=JSON.parse(fs.readFileSync('public/data/mechanics.json')).research,icons={};
for(const n of nodes){
 const map=game.researchMapping[n.id],raw=groups.find(g=>g[0]===map.groupId)?.[4].find(r=>r[0]===map.masterId);
 if(!raw)throw Error('Missing research '+n.id);
 const path='assets/game/research/'+String(raw[3]).padStart(5,'0')+'.png';
 if(!fs.existsSync('public/'+path))throw Error('Missing icon '+path);
 icons[n.id]={path,masterId:raw[0],iconId:raw[3],name:raw[1]};
}
fs.writeFileSync('public/game-research-icons.js','// Research field[3] maps to Research/Thumbnail.\nexport const GAME_RESEARCH_ICONS='+JSON.stringify(icons)+';\n');
fs.writeFileSync('artifacts/research-icon-mapping-audit.json',JSON.stringify({sha256:createHash('sha256').update(bytes).digest('hex'),nodes:Object.keys(icons).length,uniqueImages:new Set(Object.values(icons).map(i=>i.path)).size,icons},null,2)+'\n');
