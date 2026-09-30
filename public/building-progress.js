import {BUILDINGS} from './building-definitions.js';
import {abilityName} from './ability-names.js';
export {BUILDINGS};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function validateBuildingProgress(input={}){
 if(!object(input))throw Error('施設の建設状況を確認してください。');
 const out={};for(const [id,levels] of Object.entries(input)){
  const b=BUILDINGS.find(b=>b.id===id);
  if(!b||!Array.isArray(levels)||levels.length>b.limit||levels.some(n=>!Number.isInteger(n)||n<0||n>b.max))throw Error('施設の棟数・現在Lvを確認してください。');
  out[id]=[...levels];
 }return out;
}
export function validateBuildingEffects(input={}){
 if(!object(input))throw Error('施設の効果データを確認してください。');
 const out={};for(const [id,effects] of Object.entries(input)){
  const b=BUILDINGS.find(b=>b.id===id),seen=new Set();
  if(!b||!Array.isArray(effects)||effects.length>20)throw Error('施設の効果は20件以内で登録してください。');
  out[id]=effects.map(e=>{
   if(!e||typeof e.name!=='string'||!e.name.trim()||e.name.length>200||typeof e.unit!=='string'||e.unit.length>20||!Array.isArray(e.values)||e.values.length!==b.max||e.values.some(v=>v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e12)))throw Error('効果名・単位・レベル別数値を確認してください。');
   const name=abilityName(e.name),key=name+'|'+e.unit;if(seen.has(key))throw Error('同じ効果と単位が重複しています。');seen.add(key);
   return {name,unit:e.unit,values:[...e.values]};
  });
 }return out;
}
export function buildingSources(state={}){
 return BUILDINGS.flatMap(b=>(state.buildingEffects?.[b.id]||[]).flatMap((effect,i)=>
  (state.buildingProgress?.[b.id]||[]).map((level,j)=>({
   id:b.id+'-'+j+'-'+i,buildingId:b.id,type:'building',kind:'施設',label:b.name+' '+(j+1)+'棟目',
   location:`施設建設 ＞ ${b.name} ＞ ${j+1}棟目 Lv.${level}`,ability:effect.name,unit:effect.unit,level,
   acquired:level>0,value:level===0?0:effect.values[level-1]??null,available:effect.values.at(-1)
  }))));
}
