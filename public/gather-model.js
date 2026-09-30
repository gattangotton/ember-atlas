import {GATHER_REFERENCE as REF} from './gather-reference.js';
import {abilityName} from './ability-names.js';
export const RESOURCES=['食料','木材','金属','エーテル'];
export const GATHER_SLOTS=['武器','頭部','身体','脚部','装飾'];
const key=n=>abilityName(n).replaceAll('の','');
const gearName=n=>n.replace(/\([^)]*\)|（[^）]*）/g,'');
export function gatherReferenceGear(records){return Object.entries(REF.equipment).filter(([name])=>!records.some(r=>r.kind==='equipment'&&gearName(r.name)===name)).map(([name,effects],i)=>({id:'gather-reference-'+i,kind:'equipment',name,slot:effects[0].slot,referenceOnly:true,mainAbilities:effects}));}
export function gatherKind(name,resource){const n=key(name);return ['速度','量'].find(k=>n==='採集'+k||n===resource+'採集'+k)||null;}
export function gatherCharacter(r){return REF.characters.find(x=>x.name===r?.name);}
export function gatherGearEffects(r){
 const reference=REF.equipment[gearName(r?.name||'')]||[];
 const effects=(r?.mainAbilities||[]).filter(e=>/採集/.test(e.name)).map(e=>({...e,values:[...e.values]}));
 for(const e of reference){const found=effects.find(x=>key(x.name)===key(e.name));if(!found)effects.push({...e,source:'Excel '+e.row+'行'});else if(found.values[0]===e.values[0])found.values=found.values.map((v,i)=>v??e.values[i]);}
 return effects;
}
export function gatherTriggerEffects(r,levels,resource){
 const ref=gatherCharacter(r),entries=[];
 for(const slot of ['trigger1','trigger2','trigger3']){
  const level=Number(levels[slot]||0);if(!level)continue;
  const effects=r.skills?.[slot]?.effects||[],relevant=effects.filter(e=>gatherKind(e.name,resource));
  for(const e of relevant)entries.push({label:r.name+' / '+slot.replace('trigger','トリガー')+' Lv.'+level,name:e.name,kind:gatherKind(e.name,resource),value:e.unit.normalize('NFKC')==='%'?e.values[level-1]??null:null});
  // Worksheet values apply only when the skill has no registered gathering effects.
  if(!effects.some(e=>/採集/.test(e.name))&&ref&&slot!=='trigger3'){
   const kind=slot==='trigger1'?'速度':'量',v=(kind==='速度'?ref.speed:ref.amount)[level-1];
   if(kind==='量'&&ref.amount.every(n=>n===0))continue;
   entries.push({label:r.name+' / トリガー'+slot.at(-1)+' Lv.'+level+'（Excel）',name:'採集'+kind,kind,value:v==null?null:kind==='速度'&&resource!==ref.resource?v/2:v});
  }
 }
 return entries;
}
export function gatherBase(groups,resource){return groups.flatMap(g=>{
 const kind=gatherKind(g.name,resource);if(!kind||g.unit.normalize('NFKC')!=='%')return [];
 return g.sources.filter(s=>['研究','コアアビリティ','施設'].includes(s.kind)&&s.acquired).map(s=>({label:s.kind+' / '+s.label,name:g.name,kind,value:s.value}));
});}
export function calculateGather({resource,level,speed=0,amount=0,droplet=0,item=false}){
 if(!RESOURCES.includes(resource)||![4,5,6,7].includes(level)||![speed,amount,droplet].every(Number.isFinite)||speed<0||amount<0||droplet<0||droplet>10)throw Error('入力値の範囲を確認してください。');
 const hours=REF.hours[level-4],baseAmount=REF.amounts[resource][level-4];
 const multiplier=(1+speed/100)*(item?1.5:1)/(1-droplet/100);
 const seconds=hours*3600/multiplier,quantity=baseAmount*(1+amount/100);
 return {seconds,quantity,multiplier,efficiency:(multiplier-1)*100,quantityEfficiency:amount,perHour:quantity/(seconds/3600),baseAmount,baseHours:hours};
}
