import {abilityName} from './ability-names.js';
import {abilityCategory,researchSpec,RESEARCH_GROUPS} from './strategy-model.js';
export const quickResearchLevel=(current,max)=>Math.max(current,Math.min(5,max));
const family=n=>abilityName(n).replace(/食料|木材|金属|エーテル/g,'資源').replace(/歩兵|弓兵|騎兵/g,'兵種').replace(/火|水|風|雷|土|光|闇/g,'属性').replaceAll('の','');
export function researchPatternCandidates(node,draft,nodes,specs,evidence){
 const found=new Map(),name=abilityName(draft.ability),unit=String(draft.unit).normalize('NFKC');
 for(const other of nodes){if(other.id===node.id)continue;const s=researchSpec(other,specs,evidence);
  if(String(s.unit).normalize('NFKC')!==unit||s.values.length!==node.documentedMax||!s.values.some(v=>Number.isFinite(v)&&v>=0))continue;
  const exact=abilityName(s.ability)===name,sameFamily=family(s.ability)===family(name),sameCategory=abilityCategory(s.ability)===abilityCategory(name);
  if(!sameCategory&&!sameFamily&&!exact)continue;
  const known=(draft.values||[]).map((v,i)=>[v,i]).filter(([v])=>v!==null&&v!==undefined&&v!=='');
  const conflicts=known.filter(([v,i])=>s.values[i]!==null&&Number(v)!==s.values[i]).length;
  const reasons=[exact?'同じアビリティ':sameFamily?'資源・兵種・属性違いの同系効果':'同じ分類',...(other.group===node.group?['同じ研究系統']:[]),...(known.length&&!conflicts&&known.every(([,i])=>s.values[i]!=null)?['入力済みの値と一致']:[])];
  const score=(exact?100:sameFamily?70:20)+(other.group===node.group?10:0)+(known.length&&!conflicts&&known.every(([,i])=>s.values[i]!=null)?30:0)-conflicts*15;
  const source={id:other.id,label:`${RESEARCH_GROUPS[other.group]} / ${other.name} / 研究所Lv.${other.lab}`,registered:!!specs?.[other.id]};
  const key=JSON.stringify(s.values);const old=found.get(key);
  if(old){old.sources.push(source);if(score>old.score)Object.assign(old,{score,reasons});}
  else found.set(key,{values:[...s.values],knownCount:s.values.filter(v=>v!=null).length,unit,score,reasons,conflicts,sources:[source]});
 }
 return [...found.values()].sort((a,b)=>b.score-a.score||b.knownCount-a.knownCount||b.sources.length-a.sources.length).slice(0,6);
}
