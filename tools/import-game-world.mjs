import fs from 'node:fs';
import {decodeMessagePack} from './read-messagepack.mjs';
import {createHash} from 'node:crypto';
import {numericCost} from '../public/strategy-model.js';
const read=n=>decodeMessagePack(fs.readFileSync('.work/game-master/'+n));
const load=n=>JSON.parse(fs.readFileSync('public/data/'+n+'.json'));
const game=load('game-masters'),mechanics=load('mechanics'),buildings=load('buildings');
const research=read('Research'),source=read('Building');
const resources=rows=>[1,2,4,8].map(id=>rows?.find(r=>r[0]===id)?.[1]??0);
const report={research:[],buildings:[],buildingMapping:[]};
game.researchCosts={};game.buildings={};
for(const n of mechanics.research){
 const map=game.researchMapping[n.id],master=research.find(g=>g[0]===map.groupId)[4].find(r=>r[0]===map.masterId);
 const levels=master[7].map(l=>[...resources(l[4]),l[5]??0]);game.researchCosts[n.id]=levels;
 levels.forEach((l,i)=>l.forEach((v,j)=>{if(numericCost(n.levels[i][j])!==v)report.research.push({id:n.id,level:i+1,column:j,previous:n.levels[i][j],master:v});}));
}
const aliases={'軍事指令所':'軍事司令所','祭壇':'火の祭壇'};
for(const b of buildings.buildings){
 const matches=source.filter(x=>x[3]===(aliases[b.name]||b.name));if(matches.length!==1)throw Error(b.name);
 const master=matches[0];report.buildingMapping.push({id:b.id,masterId:master[0],name:master[3]});
 const levels=master[12].map((l,i)=>({level:i+1,resources:resources(l[4]),seconds:l[7]??0,imageId:l[0],model:l[1],requirements:l[3]||[]}));
 game.buildings[b.id]={masterId:master[0],levels};
 for(const l of levels){const old=b.levels.find(x=>x.level===l.level);if(!old||JSON.stringify(old.resources)!==JSON.stringify(l.resources)||old.seconds!==l.seconds)report.buildings.push({id:b.id,level:l.level,previous:old?{resources:old.resources,seconds:old.seconds}:null,master:{resources:l.resources,seconds:l.seconds}});}
}
// Attribute altars have separate image/model references even where costs agree.
for(const [suffix,id] of Object.entries({fire:21,water:22,wind:23,earth:24,thunder:25,light:27,dark:28})){
 const b=source.find(x=>x[0]===id);game.buildings['building-3-'+suffix]={masterId:id,levels:b[12].map((l,i)=>({level:i+1,resources:resources(l[4]),seconds:l[7]??0,imageId:l[0],model:l[1],requirements:l[3]||[]}))};
}
for(const name of ['Building','Help']){const bytes=fs.readFileSync('.work/game-master/'+name);game.files[name]={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};}
fs.writeFileSync('public/data/game-masters.json',JSON.stringify(game,null,2)+'\n');
fs.writeFileSync('artifacts/game-world-audit.json',JSON.stringify(report,null,2)+'\n');
console.log({researchCellsCorrected:report.research.length,buildingLevelsCorrected:report.buildings.length});
