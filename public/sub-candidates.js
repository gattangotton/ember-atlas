import {abilityName} from './ability-names.js';
import {unlockedSlots} from './mechanics.js';

// Complete slot lists are facts; an absent list is unknown, not an empty pool.
export function validateCandidateCatalog(input={},records){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length>1000)throw Error('候補設定の形式が不正です。');
 const out={};
 for(const [id,v] of Object.entries(input)){
  if(!/^(equipment|memory)-[\w-]+$/.test(id)||records&&!records.some(r=>r.id===id)||!v||typeof v.source!=='string'||!v.source.trim()||v.source.length>1000||!Array.isArray(v.slots)||v.slots.length!==3)throw Error('候補の対象・確認資料・3枠の設定を確認してください。');
  out[id]={source:v.source.trim(),slots:v.slots.map(list=>{
   if(list===null)return null;
   if(!Array.isArray(list)||list.length>100)throw Error('各枠の候補は100種類以内です。');
   const names=new Set();return list.map(c=>{
    if(!c||typeof c.name!=='string'||!c.name.trim()||c.name.length>200||typeof (c.unit??'%')!=='string'||(c.unit??'%').length>20||c.max!==null&&(!Number.isFinite(c.max)||Math.abs(c.max)>1e9))throw Error('候補名・単位・上限値を確認してください。');
    const name=abilityName(c.name);if(names.has(name))throw Error('同じ枠の候補名が重複しています。');names.add(name);
    if(c.gradeMax!==undefined&&(!Array.isArray(c.gradeMax)||c.gradeMax.length!==6||c.gradeMax.some(n=>n!==null&&(!Number.isFinite(n)||Math.abs(n)>1e9))))throw Error('武具のグレード別上限はG1～G6の6値で設定してください。');
    return {name,unit:c.unit??'%',max:c.max,...(c.gradeMax?{gradeMax:[...c.gradeMax]}:{})};
   });
  })};
 }
 return out;
}
export function withCandidates(record,catalog={}){
 const v=catalog[record.id];return v?{...record,subCandidateSlots:v.slots,subCandidateSource:v.source}:record;
}
export function slotCandidates(record,slot,grade){
 const allowed=c=>!(record.kind==='equipment'||record.id?.startsWith('equipment-'))||!abilityName(c.name).includes('素材倍化率');
 if(record.subCandidateSlots){const list=record.subCandidateSlots[slot-1]?.filter(allowed)??null;return list&&grade!==undefined?list.map(c=>({...c,max:c.gradeMax?(c.gradeMax[grade-1]??null):c.max})):list;}
 // Honour previous per-item settings for choices, but do not infer that a
 // partially entered lottery table establishes the maximum (see scorer).
 const rows=(record.subCandidates||[]).filter(c=>c.slot===slot&&allowed(c));
 if(rows.length){const groups=new Map();for(const c of rows){const name=abilityName(c.name),prior=groups.get(name);groups.set(name,{name,unit:c.unit||'%',max:c.value===null||prior?.max===null?null:Math.max(prior?.max??-Infinity,c.value)});}return [...groups.values()];}
 return null;
}
export function memoryUnlocked(copy){
 if(Number.isInteger(copy?.unlockedSlots))return copy.unlockedSlots;
 if(!copy)return 3;
 if(copy.subs?.every(s=>s.status==='empty'))return 0;
 if(copy.subs?.some(s=>s.status==='unknown'))return null;
 return Math.max(0,...(copy.subs||[]).map((s,i)=>s.status==='set'?i+1:0));
}
export function candidateOpenSlots(record,item){
 if(record.kind==='equipment')return unlockedSlots(record,item.grade);
 const n=memoryUnlocked(item.copy);return [0,1,2].map(i=>n===null?null:i<n);
}
export function resizeMemoryCopies(copies,count,makeId){
 if(!Number.isInteger(count)||count<0||count>200)throw Error('所持数は0～200個にしてください。');
 const next=structuredClone(copies.slice(0,count));while(next.length<count)next.push({id:makeId(),label:'',note:'',unlockedSlots:1,subs:Array.from({length:3},(_,i)=>({status:i===0?'unknown':'empty',name:'',unit:'%',value:null}))});return next;
}
export function setMemoryUnlocked(copy,count){
 if(!Number.isInteger(count)||count<1||count>3)throw Error('解放枠は1～3にしてください。');
 if(copy.subs.some((s,i)=>i>=count&&s.status==='set'))throw Error('枠を閉じる前に、その枠の登録を解除してください。');
 return {...copy,unlockedSlots:count,subs:copy.subs.map((s,i)=>i>=count?{status:'empty',name:'',unit:'%',value:null}:s.status==='empty'?{...s,status:'unknown'}:s)};
}
