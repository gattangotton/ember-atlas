import {simulateLoadout,effectWeight} from './loadout-model.js';
import {slotCandidates,candidateOpenSlots} from './sub-candidates.js';
const sum=rows=>rows.reduce((n,e)=>n+(e.value??0),0);
export function candidateScore(item,type,context,state={}){
 const args={context:{...context,chargeEffects:'off'},base:{mode:'none'},state};
 const mainItem=type==='gear'?{...item,owned:false,subAbilities:[]}:type==='memory'?{...item,copy:undefined}:item;
 const key={gear:'gear',memory:'memories',hero:'heroes'}[type];
 const main=simulateLoadout({...args,[key]:[mainItem]}),actual=simulateLoadout({...args,[key]:[item]});
 const mainRows=main.entries,subRows=actual.entries.filter(e=>e.label.endsWith(' / サブ'));
 const caps=[];let unknown=0;
 if(type!=='hero')for(const [i,open] of candidateOpenSlots(item.record,item).entries()){
  if(open===false)continue;
  const pool=slotCandidates(item.record,i+1,type==='gear'?item.grade:undefined);
  if(open===null||pool===null||!item.record.subCandidateSlots){unknown++;caps.push({slot:i+1,name:open===null?'解放数未確認':'全候補・上限未確認',value:null});continue;}
  const applicable=pool.filter(c=>c.unit==='%'&&effectWeight(c.name,context));
  if(applicable.some(c=>c.max===null)){unknown++;caps.push({slot:i+1,name:'候補上限未確認',value:null});continue;}
  const best=applicable.map(c=>({slot:i+1,name:c.name,value:c.max*effectWeight(c.name,context)})).sort((a,b)=>b.value-a.value)[0];
  caps.push(best||{slot:i+1,name:'対象への効果なし',value:0});
 }
 const mainTotal=main.total,cap=sum(caps),sub=sum(subRows);
 return {main:mainTotal,sub,cap,upper:unknown||main.unknown?null:mainTotal+cap,unknown,mainUnknown:main.unknown,mainRows,subRows,caps,actual:actual.total};
}
export function compareCandidateScores(a,b){
 // Missing ceilings use only the observed subtotal, never an invented zero cap.
 const x=a.candidateScore,y=b.candidateScore;
 return (y.upper??y.actual)-(x.upper??x.actual)||Number(x.upper===null)-Number(y.upper===null)||y.actual-x.actual||a.label.localeCompare(b.label,'ja')||String(a.key).localeCompare(String(b.key));
}
