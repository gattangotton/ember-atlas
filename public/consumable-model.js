import {CONSUMABLES,RESOURCE_BOXES} from './consumable-data.js';
export const RESOURCE_KINDS={food:'食料',wood:'木材',metal:'金属',ether:'エーテル'};
export const SPEED_KINDS={building:'建設',research:'研究',training:'訓練',healing:'治療',universal:'汎用'};
export const MAX_ITEM_COUNT=1000000;
const integer=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
export function validateConsumableStock(input={}){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('消費アイテムの記録が不正です。');
 const map=(value,keys,max)=>{if(value!=null&&(typeof value!=='object'||Array.isArray(value)))throw Error('消費アイテムの数値を確認してください。');const out={};for(const [k,v] of Object.entries(value||{})){if(!keys.includes(k)||!integer(v,max))throw Error('消費アイテムの数値を確認してください。');out[k]=v;}return out;};
 const counts=map(input.counts,CONSUMABLES.map(i=>i.id),MAX_ITEM_COUNT),loose=map(input.loose,Object.keys(RESOURCE_KINDS),1e15),resources=map(input.resources,Object.keys(RESOURCE_KINDS),1e15),seconds=map(input.seconds,Object.keys(SPEED_KINDS),1e12);
 const kind=input.kind??'building';if(!Object.hasOwn(SPEED_KINDS,kind))throw Error('加速の用途を確認してください。');
 if(input.includeUniversal!==undefined&&typeof input.includeUniversal!=='boolean')throw Error('汎用加速の設定が不正です。');
 let source=null;if(input.source!=null){const s=input.source;if(!['research','building'].includes(s.kind)||typeof s.label!=='string'||s.label.length>240||typeof s.at!=='string'||!Number.isFinite(Date.parse(s.at)))throw Error('見積もりの参照元が不正です。');source={kind:s.kind,label:s.label,at:s.at};}
 const boxes={};if(input.boxes!=null&&(typeof input.boxes!=='object'||Array.isArray(input.boxes)))throw Error('BOXの記録が不正です。');
 for(const [id,b] of Object.entries(input.boxes||{})){
  if(!RESOURCE_BOXES.some(x=>x.id===id)||!b||!integer(b.count,MAX_ITEM_COUNT))throw Error('BOXの所持数を確認してください。');
  const allocations=map(b.allocations,Object.keys(RESOURCE_KINDS),MAX_ITEM_COUNT);
  if(Object.values(allocations).reduce((a,b)=>a+b,0)>b.count)throw Error('BOXの割り当て合計は所持数以内にしてください。');
  boxes[id]={count:b.count,allocations};
 }
 const selected=input.selectedItems??[];
 if(!Array.isArray(selected)||selected.length>CONSUMABLES.length||selected.some(id=>typeof id!=='string'||!CONSUMABLES.some(i=>i.id===id)))throw Error('表示するアイテムを確認してください。');
 // Existing stock stays visible through migration and cannot be hidden by stale preferences.
 const selectedItems=[...new Set([...selected,...Object.keys(counts).filter(id=>counts[id]>0)])];
 return {counts,loose,resources,seconds,kind,includeUniversal:input.includeUniversal??true,source,boxes,selectedItems};
}
export function consumableTotals(input={}){
 const s=validateConsumableStock(input),resources=Object.fromEntries(Object.keys(RESOURCE_KINDS).map(k=>[k,s.loose[k]||0])),seconds=Object.fromEntries(Object.keys(SPEED_KINDS).map(k=>[k,0]));
 for(const item of CONSUMABLES)(item.type==='resource'?resources:seconds)[item.kind]+=item.value*(s.counts[item.id]||0);
 return {resources,seconds};
}
export function consumableBalance(input={}){
 const s=validateConsumableStock(input),totals=consumableTotals(s),target=s.seconds[s.kind]||0,own=totals.seconds[s.kind],universal=s.kind!=='universal'&&s.includeUniversal?totals.seconds.universal:0,available=own+universal;
 const planned=boxResourceTotals(s);
 return {resources:Object.fromEntries(Object.keys(RESOURCE_KINDS).map(k=>[k,{target:s.resources[k]||0,available:totals.resources[k],planned:planned[k],afterBoxes:totals.resources[k]+planned[k],shortfall:Math.max(0,(s.resources[k]||0)-totals.resources[k]-planned[k])}])),speed:{target,own,universal,available,shortfall:Math.max(0,target-available),surplus:Math.max(0,available-target)}};
}
export function boxResourceTotals(input={}){
 const s=validateConsumableStock(input),out=Object.fromEntries(Object.keys(RESOURCE_KINDS).map(k=>[k,0]));
 for(const box of RESOURCE_BOXES)for(const c of box.choices)out[c.kind]+=(s.boxes[box.id]?.allocations[c.kind]||0)*c.value;
 return out;
}
// Deterministic suggestion, not an optimal allocation guarantee: fill whole
// deficits with large boxes first, then cover residuals with smaller boxes.
export function allocateResourceBoxes(input={}){
 const s=validateConsumableStock(input),totals=consumableTotals(s),deficits=Object.fromEntries(Object.keys(RESOURCE_KINDS).map(k=>[k,Math.max(0,(s.resources[k]||0)-totals.resources[k])]));
 const boxes=Object.fromEntries(RESOURCE_BOXES.map(b=>[b.id,{count:s.boxes[b.id]?.count||0,allocations:{}}]));
 const order=[...RESOURCE_BOXES].sort((a,b)=>b.grade-a.grade);
 for(const roundUp of [false,true])for(const box of roundUp?[...order].reverse():order){
  let left=boxes[box.id].count-Object.values(boxes[box.id].allocations).reduce((a,b)=>a+b,0);
  const choices=[...box.choices].sort((a,b)=>deficits[b.kind]/b.value-deficits[a.kind]/a.value);
  for(const c of choices){const count=Math.min(left,roundUp?Math.ceil(deficits[c.kind]/c.value):Math.floor(deficits[c.kind]/c.value));if(!count)continue;boxes[box.id].allocations[c.kind]=(boxes[box.id].allocations[c.kind]||0)+count;left-=count;deficits[c.kind]=Math.max(0,deficits[c.kind]-count*c.value);}
 }
 return validateConsumableStock({...s,boxes});
}
// Each row is an alternative using only that duration, not a combined recipe.
export function reverseSpeedups(input={}){
 const s=validateConsumableStock(input),b=consumableBalance(s).speed;
 const durations=[...new Set(CONSUMABLES.filter(i=>i.type==='speed'&&(i.kind===s.kind||s.kind!=='universal'&&s.includeUniversal&&i.kind==='universal')).map(i=>i.value))].sort((a,b)=>a-b);
 return durations.map(seconds=>({seconds,forTarget:Math.ceil(b.target/seconds),forShortfall:Math.ceil(b.shortfall/seconds),excess:Math.ceil(b.target/seconds)*seconds-b.target}));
}
export function importConsumableEstimate(input,estimate,at=new Date().toISOString()){
 const s=validateConsumableStock(input);
 if(!estimate||!['research','building'].includes(estimate.kind)||!Array.isArray(estimate.resources)||estimate.resources.length!==4||!estimate.resources.every(v=>integer(v,1e15))||!integer(estimate.seconds,1e12)||typeof estimate.label!=='string'||estimate.label.length>240)throw Error('未確認の資源・時間があるため取り込めません。');
 return validateConsumableStock({...s,resources:Object.fromEntries(Object.keys(RESOURCE_KINDS).map((k,i)=>[k,estimate.resources[i]])),seconds:{...s.seconds,[estimate.kind]:estimate.seconds},kind:estimate.kind,source:{kind:estimate.kind,label:estimate.label,at}});
}
