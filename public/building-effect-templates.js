import {ALTAR_ELEMENTS} from './building-definitions.js';

// Shared curves specified by the user. Missing levels remain unknown, including
// when scaling ether production; unrelated effects are left untouched.
export function applyBuildingEffectTemplates(input={}){
 const result=structuredClone(input);
 function copy(sourceId,targetId,select,rename,factor=1){
  for(const effect of input[sourceId]||[]){
   if(!select(effect.name))continue;
   const next={...effect,name:rename(effect.name),values:effect.values.map(v=>v==null?null:v*factor)};
   const target=result[targetId]??=[];
   const i=target.findIndex(e=>e.name===next.name&&e.unit===next.unit);
   if(i<0)target.push(next);else target[i]=next;
  }
 }
 for(const [key,element] of ALTAR_ELEMENTS)if(key!=='fire')copy('building-3-fire','building-3-'+key,n=>/^火属性.*攻撃力$/.test(n),n=>n.replace(/^火/,element));
 for(const [id,troop] of [['building-9','弓兵'],['building-10','騎兵']])copy('building-8',id,()=>true,n=>n.replaceAll('歩兵',troop));
 for(const [id,resource,factor] of [['building-12','木材',1],['building-13','金属',1],['building-14','エーテル',0.5]])copy('building-11',id,n=>/^食料(?:の)?生産量$/.test(n),n=>n.replace(/^食料/,resource),factor);
 return result;
}
