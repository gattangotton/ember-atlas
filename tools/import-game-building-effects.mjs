import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeMessagePack} from './read-messagepack.mjs';
import {abilityName} from '../public/ability-names.js';
const read=n=>decodeMessagePack(fs.readFileSync('.work/game-master/'+n));
const abilities=new Map(read('Ability').map(a=>[a[0],a])),buildings=read('Building');
const file='public/data/game-masters.json',game=JSON.parse(fs.readFileSync(file));
game.buildingEffects={};
const report={source:'Building / level[6] + Ability',facilities:[],files:{}};
for(const [id,b] of Object.entries(game.buildings)){
 const raw=buildings.find(x=>x[0]===b.masterId),levels=raw[12];
 const ids=[...new Set(levels.flatMap(l=>(l[6]||[]).map(e=>e[0])))].filter(id=>id!==1);
 const effects=ids.map(id=>{const a=abilities.get(id);if(!a||![0,1].includes(a[1]??0))throw Error('Unknown ability '+id);
  return {name:abilityName(a[3]),unit:a[1]===1?'%':/\(秒\)$/.test(a[3])?'秒':'',values:levels.map(l=>{const e=(l[6]||[]).find(e=>e[0]===id);return (e?.[1]??0)/(a[1]===1?100:1);})};});
 game.buildingEffects[id]=effects;
 report.facilities.push({id,masterId:b.masterId,name:raw[3],effects:ids.map((id,i)=>({id,...effects[i]}))});
}
for(const name of ['Building','Ability','FieldArtifact','Consumable'])report.files[name]={sha256:createHash('sha256').update(fs.readFileSync('.work/game-master/'+name)).digest('hex')};
report.gatherDrops=read('FieldArtifact').filter(x=>/採集速度/.test(x[1])).map(x=>({id:x[0],name:x[1],abilityId:x[9][0][0],value:x[9][0][1]/100,duration:x[9][1]}));
report.items=read('Consumable').filter(x=>/建設資源効率|研究資源効率/.test(x[3])).map(x=>({id:x[0],name:x[3],description:x[4],abilityId:x[11][0],value:x[11][1]/100}));
fs.writeFileSync(file,JSON.stringify(game,null,2)+'\n');
fs.writeFileSync('public/gather-drop-data.js','// PC FieldArtifact; source hashes: artifacts/game-building-effects-audit.json\nexport const GATHER_DROPS='+JSON.stringify(report.gatherDrops)+';\nexport const GATHER_DROP_MAX=Math.max(...GATHER_DROPS.map(d=>d.value));\n');
fs.writeFileSync('artifacts/game-building-effects-audit.json',JSON.stringify(report,null,2)+'\n');
console.log({facilities:report.facilities.length,effects:report.facilities.reduce((n,b)=>n+b.effects.length,0),gatherDrops:report.gatherDrops.length,max:Math.max(...report.gatherDrops.map(d=>d.value))});
