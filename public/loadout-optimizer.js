import {simulateLoadout,TRIGGER_KEYS} from './loadout-model.js';
import {equipmentCopies} from './equipment-inventory.js';
import {LOOT_SLOTS} from './loot-model.js';
import {memoryTypeKey} from './memory-selection.js';
import {chargeSkillEffects} from './charge-model.js';
export function ownedCandidates(records,state,memories=[]){return {
 heroes:records.filter(r=>r.kind==='characters'&&state.progress?.[r.id]?.owned).map(record=>({record,levels:Object.fromEntries(['charge',...TRIGGER_KEYS].map(k=>[k,state.progress[record.id].skills?.[k]||0])),enabled:{},stacks:0})),
 gear:records.filter(r=>r.kind==='equipment').flatMap(record=>equipmentCopies(state.progress?.[record.id]).map(c=>({key:record.id+':'+c.id,record,grade:c.grade,subAbilities:c.subAbilities,owned:true}))),
 memories:memories.flatMap(record=>(state.memoryInventory?.[record.id]||[]).map(copy=>({key:record.id+':'+copy.id,record,copy})))
};}
// Independent additive effects allow exact maximization of the known subtotal.
// Evaluate every possible leader because leader element changes gear/base scores.
// Proc effects remain off: the optimizer does not assume a favourable trigger.
export function recommendLoadout({context,candidates,heroCount=2,memoryCount=2,...common}){
 const score=(context,part)=>simulateLoadout({context,base:{mode:'none'},...part});
 const rank=(items,context,field)=>items.map(item=>({item,result:score(context,{[field]:[item]})})).sort((a,b)=>b.result.total-a.result.total||a.result.unknown-b.result.unknown||String(a.item.key||a.item.record.id).localeCompare(String(b.item.key||b.item.record.id)));
 let best=null;
 const leaders=context.mode==='attack'?[null,...candidates.heroes]:[null];
 for(const leader of leaders){
  const ctx={...context,element:leader?.record.element||''};
  let heroes=[...(leader?[leader]:[]),...rank(candidates.heroes.filter(h=>h!==leader),ctx,'heroes').filter(x=>x.result.total>0).slice(0,heroCount-(leader?1:0)).map(x=>x.item)];
  // A leader-free candidate must not gain an element from an untested leader.
  if(context.mode==='attack'&&!leader&&heroes.length)continue;
  const gear=LOOT_SLOTS.flatMap(slot=>{const first=rank(candidates.gear.filter(g=>g.record.slot===slot),ctx,'gear')[0];return first&&first.result.total>0?[first.item]:[];});
  const seenMemories=new Set();
  const memories=rank(candidates.memories,ctx,'memories').filter(x=>{const key=memoryTypeKey(x.item.record);if(x.result.total<=0||seenMemories.has(key))return false;seenMemories.add(key);return true;}).slice(0,memoryCount).map(x=>x.item);
  if(context.mode==='attack'&&context.chargeEffects==='active'&&leader){
   const fixed=simulateLoadout({...common,context:{...ctx,chargeEffects:'off'},heroes:[],gear,memories}).total;
   const values=new Map(candidates.heroes.map(h=>[h,score(ctx,{heroes:[h]}).total]));
   const rest=candidates.heroes.filter(h=>h!==leader);let max=-Infinity,unknown=Infinity;
   const consider=hs=>{const charge=chargeSkillEffects(hs,common.state,ctx),value=(1+(fixed+hs.reduce((n,h)=>n+values.get(h),0))/100)*charge.factor;if(value>max||value===max&&charge.unknown<unknown){max=value;unknown=charge.unknown;heroes=hs;}};
   consider([leader]);for(let i=0;i<rest.length;i++){consider([leader,rest[i]]);if(heroCount===3)for(let j=i+1;j<rest.length;j++)consider([leader,rest[i],rest[j]]);}
  }
  const result=simulateLoadout({...common,context:ctx,heroes,gear,memories});
  const value=r=>context.mode==='attack'&&context.chargeEffects==='active'?r.comparisonIndex:r.total;
  if(!best||value(result)>value(best.result)||value(result)===value(best.result)&&result.unknown<best.result.unknown)best={heroes,gear,memories,result};
 }
 return best;
}
