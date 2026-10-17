import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeMessagePack} from './read-messagepack.mjs';
import {abilityName} from '../public/ability-names.js';
import {validateMechanics} from '../public/mechanics.js';
const capturedAt='2026-10-17',cache=process.argv[2]||'C:/Users/takah/AppData/LocalLow/SquareEnix/EmberStoria/Fdfb6zs93olkPI9L/Cache/Masters/_';
const hash=b=>createHash('sha256').update(b).digest('hex');
const read=n=>decodeMessagePack(fs.readFileSync(cache+'/'+n));
const load=n=>JSON.parse(fs.readFileSync('public/data/'+n+'.json'));
const game=load('game-masters'),heroes=load('game-heroes'),memories=load('game-memories');
const report={capturedAt,added:{heroes:[],equipment:[],memories:[]},changedEquipment:[],files:{}};
const names=['Ability','Equipment','Research','Building','Hero','Skill','HeroActiveSkillLevel','CoreAbility','Enhancer','ShopPack','ShopItem','Shop','Event','Consumable','Piece','Announcement','DeckBonus','SoldierOperationEfficiency','HeroBirthplace','FieldSetting','MonsterOrigin','Help','TroopAbilityAggregation','EnhancerSetting','FieldArtifact'];
const backup='.work/game-master-before-'+capturedAt;fs.mkdirSync(backup,{recursive:true});
for(const n of names){
 const bytes=fs.readFileSync(cache+'/'+n),target='.work/game-master/'+n,old=fs.existsSync(target)?fs.readFileSync(target):null;
 report.files[n]={sha256:hash(bytes),changed:!old||hash(old)!==hash(bytes)};
 if(old&&!fs.existsSync(backup+'/'+n))fs.writeFileSync(backup+'/'+n,old);
 fs.writeFileSync(target,bytes);
 if(fs.existsSync(cache+'/'+n+'.version'))fs.copyFileSync(cache+'/'+n+'.version',target+'.version');
}
const existingHeroes=new Set(Object.values(heroes.characters).map(r=>r.masterId)),existingMemories=new Set(memories.records.map(r=>r.masterId));
report.added.heroes=read('Hero').filter(r=>!existingHeroes.has(r[0])).map(r=>({masterId:r[0],name:r[2]}));
report.added.memories=read('Enhancer').filter(r=>r[3]?.trim()&&!existingMemories.has(r[0])).map(r=>({masterId:r[0],name:r[3]}));
const abilities=new Map(read('Ability').map(r=>[r[0],r])),slots=['武器','身体','装飾','頭部','脚部'];
// Update the source-backed entries in place. Keep the audited research costs,
// prerequisite mappings, building curves and stable catalogue IDs intact.
for(const e of read('Equipment')){
 let id=Object.keys(game.equipment).find(id=>game.equipment[id].masterId===e[0]);
 if(!id){id='equipment-pc-'+e[0];game.extraRecords.push({id,kind:'equipment',name:e[3],slot:slots[e[5]??0],note:e[4]||'',source:{sheet:'PC版 Equipment',row:e[0]}});report.added.equipment.push({id,masterId:e[0],name:e[3]});}
 const old=game.equipment[id],grades=e[11],ids=[...new Set(grades.flatMap(g=>g[2].map(a=>a[0])))];
 const mainAbilities=ids.map(id=>{const a=abilities.get(id);if(!a||![0,1].includes(a[1]??0))throw Error('Ability '+id);return {name:abilityName(a[3]),unit:a[1]===1?'%':/\(秒\)$/.test(a[3])?'秒':'',values:Array.from({length:6},(_,i)=>{if(!grades[i])return null;const value=grades[i][2].find(a=>a[0]===id)?.[1];if(!Number.isFinite(value))throw Error('Missing grade '+e[0]);return value/(a[1]===1?100:1);}),pattern:''};});
 const unlockGrades=[0,1,2].map(i=>e[12]?.[i]?.[1]??null);
 const entry={...old,name:e[3],slot:slots[e[5]??0],power:grades[0][3],powerGrades:Array.from({length:6},(_,i)=>grades[i]?.[3]??null),mainAbilities,masterId:e[0],abilityIds:ids,unlockGrades,equipmentEvidence:`PC版ローカルマスター（${capturedAt}再照合） / Equipment ID ${e[0]}。各グレードの合計値。`};
 if(!old)entry.raid=e[1]===4?'yes':'no';
 validateMechanics(entry);
 if(old&&(JSON.stringify(old.mainAbilities)!==JSON.stringify(mainAbilities)||JSON.stringify(old.powerGrades)!==JSON.stringify(entry.powerGrades)))report.changedEquipment.push({id,name:e[3],previous:old.mainAbilities,current:mainAbilities});
 game.equipment[id]=entry;
}
game.files={...game.files,...Object.fromEntries(['Ability','Equipment','Research','Building'].map(n=>[n,{...game.files[n],sha256:report.files[n].sha256}]))};
game.capturedAt=capturedAt;game.source=`PC版ローカルマスター（${capturedAt}照合）`;game.equipmentReviewedAt=capturedAt;game.summary.equipment=Object.keys(game.equipment).length;
fs.writeFileSync('public/data/game-masters.json',JSON.stringify(game,null,2)+'\n');
fs.writeFileSync('artifacts/october-content-update-audit.json',JSON.stringify(report,null,2)+'\n');
console.log({added:report.added,changedEquipment:report.changedEquipment.map(r=>r.name),changedMasters:Object.entries(report.files).filter(([,v])=>v.changed).map(([n])=>n)});
