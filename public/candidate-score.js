import {simulateLoadout} from './loadout-model.js';
const sum=rows=>rows.reduce((n,e)=>n+(e.value??0),0);
export function candidateScore(item,type,context,state={}){
 const args={context:{...context,chargeEffects:'off'},base:{mode:'none'},state};
 const mainItem=type==='gear'?{...item,owned:false,subAbilities:[]}:type==='memory'?{...item,copy:undefined}:item;
 const key={gear:'gear',memory:'memories',hero:'heroes'}[type];
 const main=simulateLoadout({...args,[key]:[mainItem]}),actual=simulateLoadout({...args,[key]:[item]});
 const mainRows=main.entries,subRows=actual.entries.filter(e=>e.label.endsWith(' / サブ'));
 return {main:main.total,sub:sum(subRows),mainUnknown:main.unknown,subUnknown:Math.max(0,actual.unknown-main.unknown),mainRows,subRows,actual:actual.total};
}
export function compareCandidateScores(a,b){
 // Selection order compares main effects only. Registered sub effects remain
 // in the actual simulation, independently of this catalogue ranking.
 const x=a.candidateScore,y=b.candidateScore;
 return y.main-x.main||Number(!!x.mainUnknown)-Number(!!y.mainUnknown)||a.label.localeCompare(b.label,'ja')||String(a.key).localeCompare(String(b.key));
}
