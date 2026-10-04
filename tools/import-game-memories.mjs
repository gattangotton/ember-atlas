import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeMessagePack} from './read-messagepack.mjs';
import {abilityName} from '../public/ability-names.js';
import {memoryAcquisition} from './memory-acquisition.mjs';
import {memoryAnnouncementSources} from './memory-announcement-sources.mjs';
const files={};
const read=name=>{const bytes=fs.readFileSync('.work/game-master/'+name);files[name]={sha256:createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length};return decodeMessagePack(bytes);};
const source=read('Enhancer'),abilities=new Map(read('Ability').map(a=>[a[0],a]));
const acquisitionMasters={packs:read('ShopPack'),items:read('ShopItem'),shops:read('Shop'),events:read('Event'),boxes:read('Consumable')};
const pieces=read('Piece');
const announcements=read('Announcement');
const omitted=source.filter(m=>!m[3]?.trim()).map(m=>m[0]);
const records=source.filter(m=>m[3]?.trim()).map(m=>{
 const effects=(m[7]||[]).map(e=>{const a=abilities.get(e[0]);if(e[-1]!==1||!a||![0,1].includes(a[1]??0)||!Number.isFinite(e[1]))throw Error('Unsupported memory effect '+m[0]);return {abilityId:e[0],name:abilityName(a[3]),unit:a[1]===1?'%':/\(秒\)$/.test(a[3])?'秒':'',value:e[1]/(a[1]===1?100:1)};});
 const imageFile='enhancer-thumbnail-'+String(m[2]).padStart(5,'0')+'.png';
 let image='';if(fs.existsSync('.work/game-images/'+imageFile)){fs.copyFileSync('.work/game-images/'+imageFile,'public/assets/game/'+imageFile);image='assets/game/'+imageFile;}
 const acquisition=memoryAcquisition(m[0],acquisitionMasters);
 const announcement=memoryAnnouncementSources[m[0]];
 if(announcement){
  const text=JSON.stringify(announcements.find(a=>a[0]===announcement.announcement)?.[10]);
  if(!text?.includes(announcement.token)||!text.includes(m[3]+'のメモリ'))throw Error('Memory acquisition announcement mismatch '+m[0]);
  acquisition.push({type:'monster',name:announcement.name,detail:announcement.detail,master:'Announcement '+announcement.announcement});
 }
 const piece=pieces.find(p=>p[-1]===2&&p[7]===m[0]);
 const generation=piece?{fragments:piece[4],ether:piece[5]?.find(c=>c[-1]===1&&c[0]===8)?.[1]??null,source:'Piece '+piece[0]}:null;
 return {id:'memory-'+m[0],masterId:m[0],name:m[3],rarity:m[5],description:m[4]||'',mainEffects:effects,mainEffectsKnown:!!m[7]?.length,image,imageId:m[2],maxSubSlots:3,generation,acquisition,paidAvailable:acquisition.some(a=>a.type==='paid'),nonPaidAvailable:acquisition.some(a=>['event','exchange','monster'].includes(a.type)),source:'PC版 Enhancer '+m[0]+'（2026-10-03取得）'};
});
const data={version:1,capturedAt:'2026-10-03',files,records,abilityNames:[...new Set([...abilities.values()].map(a=>abilityName(a[3])).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ja'))};
fs.writeFileSync('public/data/game-memories.json',JSON.stringify(data,null,2)+'\n');
fs.writeFileSync('artifacts/game-memory-audit.json',JSON.stringify({total:source.length,imported:records.length,unnamedExcluded:omitted,mainEffectsUnconfirmed:records.filter(r=>!r.mainEffectsKnown).map(r=>({id:r.id,name:r.name})),images:records.filter(r=>r.image).length,generationCosts:records.filter(r=>r.generation).length,paidSources:records.filter(r=>r.paidAvailable).length,eventExchangeOrMonsterSources:records.filter(r=>r.nonPaidAvailable).length,acquisitionUnconfirmed:records.filter(r=>!r.acquisition.length).map(r=>({id:r.id,name:r.name})),subAbilityCandidates:'Enhancer field 8 contains empty objects; candidate values and probabilities are not inferred.'},null,2)+'\n');
console.log({imported:records.length,unnamedExcluded:omitted.length,images:records.filter(r=>r.image).length});
