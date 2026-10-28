import {aggregateAbilities,researchSpec,planResearch} from './strategy-model.js';
import {calculateBuilding} from './building-calculator.js';
import {BUILDINGS} from './building-definitions.js';
import {coreEffects,coreStage,coreThresholds,unlockedSlots} from './mechanics.js';
import {effectWeight,simulateLoadout,TRIGGER_KEYS,triggerCondition} from './loadout-model.js';

const finite=Number.isFinite;
const round=n=>Math.round(n*1e6)/1e6;
const empty=()=>({effects:{},costs:{},warnings:[]});
const sum=xs=>xs.reduce((a,b)=>a+b,0);
export const SUB_REFERENCES={attack:113,loot:14.3};

// A package includes its prerequisites. Effects are endpoints per source;
// costs are individual levels. Unioning packages never pays or gains twice.
export function mergePackages(packages){
 const out=empty();
 for(const p of packages){
  for(const [key,e] of Object.entries(p.effects))if(!out.effects[key]||out.effects[key].level<e.level)out.effects[key]=e;
  Object.assign(out.costs,p.costs);out.warnings.push(...p.warnings);
 }
 out.warnings=[...new Set(out.warnings)];
 out.gain=round(sum(Object.values(out.effects).map(e=>e.gain)));
 out.totals=Array(5).fill(0);out.missing=Array(5).fill(0);
 for(const c of Object.values(out.costs))c.forEach((v,i)=>finite(v)?out.totals[i]+=v:out.missing[i]++);
 out.uncertain=out.warnings.length+sum(out.missing);
 return out;
}

export function createGoalCandidates(args,{buildings={buildings:[]}}={}){
 const {context,records=[],nodes=[],state={},evidence={},base={mode:'auto',research:true,core:true,building:true}}=args;
 const candidates=[],omitted=new Set(),groups=aggregateAbilities({records,nodes,state,evidence});
 const weight=e=>(e.unit??'%')==='%'?effectWeight(e.name??e.ability,context):0;
 const auto=names=>Object.fromEntries(names.map(([field,name])=>[field,groups.find(g=>g.key===name)?.total||0]));
 const researchConfig=auto([['speed','研究速度|%'],['efficiency','研究資源効率|%'],['fixed','研究加速(秒)|秒']]);
 const buildingConfig=auto([['speed','建設速度|%'],['efficiency','建設資源効率|%'],['fixed','建設加速(秒)|秒']]);
 const modifierUnknown=groups.some(g=>/^(研究|建設)(速度|資源効率|加速)/.test(g.name)&&g.sources.some(s=>s.acquired&&s.value==null));
 const push=(id,label,type,p)=>{const r=mergePackages([p]);if(r.gain>0)candidates.push({...r,id,label,type});};
 function gainAt(effects,current,target,label,p){
  let gain=0;const details=[];
  for(const e of effects){const w=weight(e);if(!w)continue;const a=current===0?0:e.values?.[current-1],b=e.values?.[target-1];
   if(!finite(a)||!finite(b)){p.warnings.push(label+'：効果値が一部未確認');details.push({name:e.name??e.ability,current:finite(a)?a:null,target:finite(b)?b:null,gain:null});continue;}gain+=(b-a)*w;details.push({name:e.name??e.ability,current:a,target:b,gain:round((b-a)*w)});
  }return {gain:round(gain),details};
 }
 function buildingPackage(id,index,target,p,visiting=new Set()){
  const def=BUILDINGS.find(b=>b.id===id),b=buildings.buildings?.find(b=>b.id===id),current=state.buildingProgress?.[id]?.[index]||0,key='building:'+id+':'+index;
  if(target<=current||p.effects[key]?.level>=target)return;
  if(visiting.has(key)){p.warnings.push('施設の前提条件が循環しています');return;}
  visiting.add(key);
  const label=(b?.name||def?.name||id)+' '+(index+1)+'棟目';
  p.effects[key]={level:target,...(base.mode==='auto'&&base.building?gainAt(state.buildingEffects?.[id]||[],current,target,label,p):{gain:0,details:[]}),label:label+' Lv.'+current+' → '+target};
  for(let lv=current+1;lv<=target;lv++){
   const l=b?.levels?.find(x=>x.level===lv),c=l?calculateBuilding(l,buildingConfig):{resources:[null,null,null,null],seconds:null};
   p.costs[key+':'+lv]=[...c.resources,c.seconds];
   const rule=buildings.rules?.[id+':'+lv]||state.buildingRules?.[id+':'+lv];
   if(!rule||rule.status==='unknown')p.warnings.push(label+'：前提施設が未確認');
   for(const r of rule?.requirements||[]){const levels=state.buildingProgress?.[r.buildingId]||[0],best=Math.max(...levels,0),j=Math.max(0,levels.indexOf(best));buildingPackage(r.buildingId,j,r.level,p,visiting);}
  }
  visiting.delete(key);
 }
 if(base.mode==='auto'&&base.research)for(const n of nodes){
  const spec=researchSpec(n,state.researchSpecs,evidence),current=state.research?.[n.id]||0;
  if(!weight(spec))continue;
  for(let lv=current+1;lv<=n.documentedMax;lv++){
   if(!finite(spec.values?.[lv-1])||current&&!finite(spec.values?.[current-1])){omitted.add(n.name+'：効果値未確認');continue;}
   const p=empty();
   try{
    const r=planResearch(nodes,state.research||{},state.researchSpecs||{},{...researchConfig,targetId:n.id,targetLevel:lv,includeParents:true},evidence);
    p.warnings.push(...r.warnings);
    for(const row of r.rows){
     const node=nodes.find(x=>x.id===row.id),s=researchSpec(node,state.researchSpecs,evidence),from=state.research?.[row.id]||0,key='research:'+row.id;
     p.costs[key+':'+row.level]=[...row.resources,row.seconds];
     if(!p.effects[key]||p.effects[key].level<row.level)p.effects[key]={level:row.level,...gainAt([{...s,name:s.ability}],from,row.level,node.name,p),label:node.name+' Lv.'+from+' → '+row.level};
     if(node.lab>0)buildingPackage('building-2',0,node.lab,p);
    }
    if(modifierUnknown)p.warnings.push('速度・資源効率・加速は確認済みの補正のみ');
    push('research:'+n.id+':'+lv,n.name+' Lv.'+current+' → '+lv,'研究',p);
   }catch{omitted.add(n.name+'：前提条件・費用データを確認してください');}
  }
 }
 if(base.mode==='auto'&&base.building)for(const def of BUILDINGS){
  if(!(state.buildingEffects?.[def.id]||[]).some(e=>weight(e)))continue;
  const levels=state.buildingProgress?.[def.id]||[];
  for(let j=0;j<Math.min(def.limit,levels.length+1);j++)for(let lv=(levels[j]||0)+1;lv<=def.max;lv++){
   const p=empty();buildingPackage(def.id,j,lv,p);if(modifierUnknown)p.warnings.push('速度・資源効率・加速は確認済みの補正のみ');
   push('building:'+def.id+':'+j+':'+lv,def.name+' '+(j+1)+'棟目 Lv.'+(levels[j]||0)+' → '+lv,'施設',p);
  }
 }
 if(base.mode==='auto'&&base.core)for(const r of records.filter(r=>r.kind==='characters')){
  const progress=state.progress?.[r.id]||{},current=coreStage(progress.owned,progress.skills,r),effects=coreEffects(r);
  if(!effects.some(e=>weight(e)))continue;
  for(let stage=current+1;stage<=coreThresholds(r).length;stage++){
   const p=empty(),label=r.name+' コア段階'+stage+'（'+(coreThresholds(r)[stage-1]?'スキル合計'+coreThresholds(r)[stage-1]:'獲得時')+'）';
   p.effects['core:'+r.id]={level:stage,...gainAt(effects,current,stage,label,p),label};
   p.costs['core:'+r.id]=[null,null,null,null,null];p.warnings.push('コア取得・育成費用と日数は未確認');push('core:'+r.id+':'+stage,label,'コア',p);
  }
 }
 for(const [i,h] of (args.heroes||[]).entries()){
  if(!h.record||h.support)continue;
  for(const key of TRIGGER_KEYS){const skill=h.record.skills?.[key],current=h.levels?.[key]??state.progress?.[h.record.id]?.skills?.[key]??0,condition=triggerCondition(h.record,key);
   if(!skill||!current||condition&&(condition==='loss'?!h.stacks:!h.enabled?.[key]))continue;
   for(let lv=current+1;lv<=7;lv++){
    const p=empty(),before=simulateLoadout({...args,heroes:[h],gear:[],memories:[],drops:[],base:{mode:'none'}}),after=simulateLoadout({...args,heroes:[{...h,levels:{...h.levels,[key]:lv}}],gear:[],memories:[],drops:[],base:{mode:'none'}});
    if(before.unknown||after.unknown)continue;
    const label=h.record.name+' / '+skill.name+' Lv.'+current+' → '+lv;
    p.effects['hero:'+i+':'+key]={level:lv,gain:round(after.total-before.total),label};p.costs['hero:'+i+':'+key]=[null,null,null,null,null];p.warnings.push('スキル育成費用は未確認。連動して解放されるコアは別候補');push('hero:'+i+':'+key+':'+lv,label,'スキル',p);
   }
  }
 }
 for(const [i,g] of (args.gear||[]).entries()){
  if(!g.record||!g.grade)continue;
  for(let grade=g.grade+1;grade<=6;grade++){
   const p=empty(),label=g.record.name+' G'+g.grade+' → G'+grade;
   p.effects['gear:'+i]={level:grade,...gainAt(g.record.mainAbilities||[],g.grade,grade,label,p),label};p.costs['gear:'+i]=[null,null,null,null,null];p.warnings.push('武具強化の素材・日数と、新たに解放するサブは未計算');push('gear:'+i+':'+grade,label,'武具',p);
  }
 }
 return {candidates,omitted:[...omitted],baseWarning:base.mode!=='auto'?'研究・施設・コアの提案には、拠点を「登録から集計」に切り替えてください。':''};
}

// Compare three deterministic marginal-gain searches; prune redundant choices.
// This is a bounded heuristic, not a claim of global optimality.
export function recommendGoalPlans(candidates,gap){
 if(!finite(gap)||gap<0)throw Error('目標値を確認してください。');
 return ['時間優先','資源優先','追加量優先'].map(priority=>{
  let selected=[],plan=mergePackages([]);
  for(let step=0;step<100&&plan.gain+1e-6<gap;step++){
   let best;
   for(const c of candidates){if(selected.includes(c))continue;const next=mergePackages([...selected,c]),gain=round(next.gain-plan.gain);if(gain<=0)continue;
    const useful=Math.min(gain,gap-plan.gain),known=priority==='時間優先'?!next.missing[4]:priority==='資源優先'?!next.missing.slice(0,4).some(Boolean):true;
    const cost=priority==='時間優先'?next.totals[4]-plan.totals[4]:priority==='資源優先'?sum(next.totals.slice(0,4))-sum(plan.totals.slice(0,4)):1;
    const rank=[known?0:1,next.warnings.length?1:0,cost/useful,-useful,c.id];
    if(!best||compareRanks(rank,best.rank)<0)best={candidate:c,plan:next,rank};
   }
   if(!best)break;selected.push(best.candidate);plan=best.plan;
  }
  for(let i=selected.length-1;i>=0;i--){const rest=selected.filter((_,j)=>j!==i),p=mergePackages(rest);if(p.gain+1e-6>=gap){selected=rest;plan=p;}}
  return {...plan,priority,selected:selected.map(c=>c.id),remaining:round(Math.max(0,gap-plan.gain)),reached:plan.gain+1e-6>=gap};
 });
}
function compareRanks(a,b){for(let i=0;i<a.length;i++){if(a[i]<b[i])return -1;if(a[i]>b[i])return 1;}return 0;}

// Observations are references, not universal caps or guaranteed rolls.
export function subAbilityHeadroom(args){
 const rows=[],{context}=args;
 if(context.mode==='loot')for(const m of args.memories||[]){
  if(!m.record||!m.copy)continue;const e=m.copy.subs?.[2];
  const current=!e||e.status==='unknown'?null:e?.status==='set'?((e.unit??'%')==='%'?effectWeight(e.name,context)*e.value:0):0;
  rows.push({label:m.record.name+' / メモリの第3サブ枠',current,reference:14.3,headroom:finite(current)?round(Math.max(0,14.3-current)):null,note:'第3枠の解放・対象効果の抽選可否を確認。確認例14.3%との差'});
 }
 if(context.mode==='attack')for(const g of args.gear||[]){
  if(!g.record||!g.owned)continue;
  const power=g.record.powerGrades?.[0]??g.record.power;
  for(const [i,open] of unlockedSlots(g.record,g.grade).entries())if(open){const e=g.subAbilities?.[i],current=e&&finite(e.value)?((e.unit??'%')==='%'?effectWeight(e.name,context)*e.value:0):null;
   rows.push({label:g.record.name+' / サブ'+(i+1),current,reference:113,headroom:finite(current)&&g.grade===1&&power===13000?round(Math.max(0,113-current)):null,note:g.grade===1&&power===13000?'G1・13000パワーの確認例113%との差。対象種族の抽選可否は要確認':'113%はG1・13000パワーでの確認例。この装備への換算は未確認'});
  }
 }
 return rows;
}
