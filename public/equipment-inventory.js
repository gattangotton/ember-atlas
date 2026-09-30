import {unlockedSlots} from './mechanics.js';

export function equipmentCopies(p={}) {
 return p.instances===undefined?(p.owned?[{id:'legacy',grade:p.level||0,target:p.target||0,subAbilities:[null,null,null]}]:[]):structuredClone(p.instances);
}
export function validateCopies(items,record){
 if(!Array.isArray(items)||items.length>100)throw Error('所持数は0～100個で登録してください。');
 const ids=new Set();return items.map(x=>{
  if(!x||typeof x.id!=='string'||!/^[\w-]{1,80}$/.test(x.id)||ids.has(x.id)||!Number.isInteger(x.grade)||x.grade<0||x.grade>6||!Number.isInteger(x.target)||x.target<0||x.target>6||!Array.isArray(x.subAbilities)||x.subAbilities.length!==3)throw Error('武具の個別記録が不正です。');
  ids.add(x.id);const slots=record?unlockedSlots(record,x.grade):[x.grade>=1,x.grade>=5,x.grade>=6];
  return {id:x.id,grade:x.grade,target:x.target,subAbilities:x.subAbilities.map((a,i)=>{
   if(a===null)return null;
   if(!slots[i])throw Error(`サブ枠${i+1}はこの強化段階では登録できません。`);
   if(typeof a?.name!=='string'||!a.name.trim()||a.name.length>200||typeof a.value!=='number'||!Number.isFinite(a.value)||Math.abs(a.value)>1e7)throw Error('サブアビリティの効果名と％を入力してください。');
   return {name:a.name.trim(),value:a.value};
  })};
 });
}
export function copyProgress(p,items,record){const instances=validateCopies(items,record);return {...p,instances,owned:instances.length>0,level:Math.max(0,...instances.map(x=>x.grade)),target:Math.max(instances.length?0:p.target||0,...instances.map(x=>x.target)),updatedAt:new Date().toISOString()};}

export function normalizeEquipmentProgress(progress,records){
 const result=structuredClone(progress||{});
 for(const [id,p] of Object.entries(result)){
  const r=records.find(r=>r.id===id);if(r?.kind!=='equipment')continue;
  // Individual copies are authoritative over stale summary flags in backups.
  const normalized=copyProgress(p,equipmentCopies(p),r);
  result[id]={...normalized,note:p.note??'',updatedAt:p.updatedAt||''};
 }
 return result;
}

// Equal G1 percentages use the same growth curve, irrespective of effect name.
export function growthUpdates(before,next,records){
 const curves=new Map(),percent=e=>String(e.unit??'%').normalize('NFKC').trim()==='%';
 for(const [i,e] of (next.mainAbilities||[]).entries()){
  if(!percent(e)||e.values[0]===null||!e.values.slice(1).some(v=>v!==null)||JSON.stringify(e)===JSON.stringify(before.mainAbilities?.[i]))continue;
  const prior=curves.get(e.values[0]);
  if(prior&&prior.some((v,j)=>v!==null&&e.values[j]!==null&&v!==e.values[j]))throw Error('同じG1％に異なる上昇値があります。数値を揃えてください。');
  curves.set(e.values[0],e.values.map((v,j)=>v??prior?.[j]??null));
 }
 return records.filter(r=>r.kind==='equipment'&&r.id!==next.id).flatMap(r=>{
  const changes=[];const mainAbilities=(r.mainAbilities||[]).map(e=>{
   const curve=percent(e)&&curves.get(e.values[0]);if(!curve)return e;
   const values=e.values.map((v,i)=>i?curve[i]??v:v);
   if(JSON.stringify(values)===JSON.stringify(e.values))return e;
   changes.push({name:e.name,before:e.values,after:values});return {...e,values};
  });return changes.length?[{record:{...r,mainAbilities},changes}]:[];
 });
}
