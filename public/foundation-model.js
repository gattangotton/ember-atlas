import {validateMechanics,coreEffects,inferCharge} from './mechanics.js';
export const FOUNDATION_TYPES={charge:'チャージ',active:'アクティブ',trigger:'トリガー',core:'コアアビリティ'};
export const foundationSlot=t=>t==='trigger'?'trigger1':t;
export function validateFoundation(input=[]){
 if(!Array.isArray(input)||input.length>1000)throw Error('基礎データは1000件以内です。');
 const seen=new Set();return input.map(x=>{
  if(!x||!/^base-[a-zA-Z0-9_-]+$/.test(x.id)||seen.has(x.id)||!Object.hasOwn(FOUNDATION_TYPES,x.type)||typeof x.name!=='string'||!x.name.trim()||x.name.length>200||typeof (x.note??'')!=='string'||(x.note??'').length>2000)throw Error('基礎データのID・分類・名称・補足を確認してください。');seen.add(x.id);
  const spec=x.type==='core'?{effects:validateMechanics({coreEffects:x.spec?.effects}).coreEffects}:validateMechanics({skills:{[foundationSlot(x.type)]:x.spec}}).skills[foundationSlot(x.type)];
  if(!spec||(x.type==='core'&&!Array.isArray(spec.effects)))throw Error('スキル内容がありません。');
  return {id:x.id,type:x.type,name:x.name.trim(),note:x.note??'',spec};
 });
}
export function seedFoundations(records){
 const seen=new Set(),out=[];
 for(const r of records.filter(r=>r.kind==='characters')){
  for(const [slot,type] of [['charge','charge'],['active','active'],['trigger1','trigger'],['trigger2','trigger'],['trigger3','trigger'],['core','core']]){
   const text=slot==='core'?r.ability:r[slot];if(!text)continue;
   const spec=slot==='core'?{effects:coreEffects(r)}:structuredClone(r.skills?.[slot]||{...inferCharge(slot==='charge'?text:''),note:text});
   const key=JSON.stringify([type,text,spec]);if(seen.has(key))continue;seen.add(key);
   out.push({id:`base-${r.id}-${slot}`,type,name:(spec.name||text).slice(0,200),note:`元データ：${r.name}。未確認の段階値は空欄です。`,spec});
  }
 }
 return validateFoundation(out);
}
export function applyFoundation(record,template,slot){
 const t=validateFoundation([template])[0],r=structuredClone(record);
 if(r.kind!=='characters')throw Error('エンバースを選んでください。');
 if(t.type==='core'){r.coreEffects=structuredClone(t.spec.effects);r.ability=r.coreEffects.map(e=>e.name).join('/');r.maximum=r.coreEffects.map(e=>e.values[5]===null?'未確認':e.values[5]+e.unit).join('/');}
 else {if(t.type==='trigger'?!['trigger1','trigger2','trigger3'].includes(slot):slot!==t.type)throw Error('適用先のスキル分類が違います。');r.skills={...r.skills,[slot]:structuredClone(t.spec)};r[slot]=t.spec.name||t.name;}
 return r;
}
