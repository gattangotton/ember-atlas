import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeMessagePack} from './read-messagepack.mjs';
import {RAID_BOSSES} from '../public/raid-data.js';
import {abilityName} from '../public/ability-names.js';
const files={};
const read=name=>{const bytes=fs.readFileSync('.work/game-master/'+name);files[name]={sha256:createHash('sha256').update(bytes).digest('hex')};return decodeMessagePack(bytes);};
const abilities=new Map(read('Ability').map(x=>[x[0],x]));
const drops=read('FieldArtifact').filter(x=>/攻撃力|素材倍化/.test(x[1])).map(x=>{
 const raw=x[9]?.[0],a=abilities.get(raw?.[0]);
 if(!a||a[1]!==1||!Number.isFinite(raw[1]))throw Error('Unverified drop '+x[0]);
 return {id:String(x[0]),name:x[1],ability:abilityName(a[3]),abilityId:a[0],value:raw[1]/100,duration:x[9][1],source:'FieldArtifact '+x[0]+' / Ability '+a[0]};
});
const origins=read('MonsterOrigin'),raceNames={21:'悪魔',22:'超獣',23:'龍',24:'妖魔',25:'堕天',26:'機甲',27:'不浄',28:'精霊'};
const bosses=RAID_BOSSES.map(b=>{const rows=origins.filter(x=>x[1]===b.name&&x[0]<10000),races=[...new Set(rows.map(x=>raceNames[x[4]]))];if(races.length!==1||!races[0])throw Error('Boss race '+b.name);return {id:b.id,name:b.name,race:races[0],image:b.image,masterIds:rows.map(x=>x[0]),source:'MonsterOrigin '+rows.map(x=>x[0]).join(', ')};});
const help=read('Help'),rules=[];
for(const [id,sections] of [[3,['補正値と特効ボーナス']],[21,['種族','フィールドボス']],[51,['贖罪の雫']],[61,['アビリティ','アビリティ効果の補足']],[62,['コアアビリティ']],[123,['レイドAPと勝利報酬の獲得','ミッション報酬']]]){
 const h=help.find(x=>x[0]===id);for(const s of h?.[2]||[])if(sections.includes(s[0]))rules.push({source:'Help '+id,title:s[0],text:(s[1]||[]).filter(x=>x[-1]===1).map(x=>x[0]).join('\n')});
}
const aggregation=read('TroopAbilityAggregation').filter(x=>[1,12,101,111,121].includes(x[0])).map(x=>({id:x[0],name:x[1],abilities:x[3].map(id=>({id,name:abilityName(abilities.get(id)?.[3]||'未確認')}))}));
const enhancer=read('EnhancerSetting'),research=read('Research');
const thirdMemory=research.flatMap(g=>(g[4]||[]).map(n=>({group:g[0],node:n}))).find(x=>x.node[1]==='メモリスロット解放');
const masters=JSON.parse(fs.readFileSync('public/data/game-masters.json'));
const memoryResearchId=Object.entries(masters.researchMapping).find(([,m])=>m.groupId===thirdMemory.group&&m.masterId===thirdMemory.node[0])?.[0];
if(!memoryResearchId||enhancer[7][0]!==2)throw Error('Memory slot mapping');
const out={version:1,capturedAt:'2026-10-04',files,drops,bosses,aggregation,memorySlots:{base:2,max:3,researchId:memoryResearchId,source:'EnhancerSetting 7 / Research '+thirdMemory.node[0]},rules};
fs.writeFileSync('public/data/game-simulation.json',JSON.stringify(out,null,2)+'\n');
console.log({drops:drops.length,bosses:bosses.length,memoryResearchId,rules:rules.length});
