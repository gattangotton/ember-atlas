import {simulateLoadout} from './loadout-model.js';
import {chargeSkillEffects} from './charge-model.js';
import {formationBonus,combatFactors,evaluateTerritoryTeam} from './territory-model.js';
import {TERRITORY_COMBAT as DATA} from './territory-combat-data.js';
import {LOOT_SLOTS} from './loot-model.js';
import {memoryTypeKey} from './memory-selection.js';

export const PARTNER_MATCHES={any:'条件なし',troop:'同じ得意兵種',element:'同じ属性',both:'同じ兵種・属性',world:'同じ出身世界'};
const round=n=>Math.round(n*1e6)/1e6;
export function matchesPartner(leader,item,match='any',data=DATA){
 if(match==='any'||!leader?.record)return true;
 const row=formationBonus([leader,item],{},data).rows[0];
 return match==='both'?row.matches.troop&&row.matches.element:!!row.matches[{world:'birthplace'}[match]||match];
}
// A candidate replaces one slot while the rest of the selected loadout stays
// fixed. Supports contribute DeckBonus only, never triggers or charge skills.
export function attackFitness(args,item,slot,data=DATA){
 const heroes=[...args.heroes];heroes[slot]=item;
 const leader=heroes[0]?.record;
 const context={...args.context,element:leader?.element||''};
 const team=evaluateTerritoryTeam({...args,heroes,context},data);
 const role=slot===0?'leader':item.support?'support':slot===1?'second':'third';
 const bonus=team.factors.bonus.rows.find(r=>r.id===item.record.id);
 const main=item.support?null:simulateLoadout({heroes:[item],context:{...context,chargeEffects:'off'},state:args.state,base:{mode:'none'}});
 return {...team,score:slot!==0&&!leader?null:round(team.index*100),role,bonus,main,needsLeader:slot!==0&&!leader};
}
export function compareFitness(a,b){
 return b.fitness.score-a.fitness.score||a.fitness.unknown-b.fitness.unknown||a.label.localeCompare(b.label,'ja')||String(a.key).localeCompare(String(b.key));
}

export function recommendAttackPartners({candidates,leader,heroCount=2,supportCount=0,match='any',data=DATA,...args}){
 if(!leader?.record)throw Error('先にリーダーを選択してください。');
 if(![2,3].includes(heroCount)||![0,1,2].includes(supportCount))throw Error('編成枠を確認してください。');
 const context={...args.context,mode:'attack',element:leader.record.element};
 const pool=candidates.filter(h=>h.record.id!==leader.record.id&&matchesPartner(leader,h,match,data));
 if(pool.length<heroCount-1+supportCount)throw Error('条件に合うエンバースが不足しています。相性条件やサポート枠数を確認してください。');
 const fixed=simulateLoadout({...args,context:{...context,chargeEffects:'off'},heroes:[]});
 const contributions=new Map([leader,...pool].map(h=>[h.record.id,simulateLoadout({context:{...context,chargeEffects:'off'},heroes:[h],state:args.state,base:{mode:'none'}})]));
 const charge=new Map([leader,...pool].map(h=>[h.record.id,chargeSkillEffects([h],args.state,context)]));
 const supportRanking=supportCount?pool.map(h=>({...h,support:true})).map(h=>({h,bonus:formationBonus([leader,h],args.state,data)})).sort((a,b)=>b.bonus.total-a.bonus.total||a.bonus.unknown-b.bonus.unknown||a.h.record.id.localeCompare(b.h.record.id)):[];
 const withSupports=hs=>{
  const used=new Set(hs.map(h=>h.record.id));
  const supports=supportRanking.filter(x=>!used.has(x.h.record.id)).slice(0,supportCount).map(x=>x.h);
  return [...hs,...supports];
 };
 let best=null;
 const consider=hs=>{
  const heroes=withSupports(hs),factors=combatFactors(heroes,context,args.state,data);
  const groups=hs.map(h=>charge.get(h.record.id).groups),bonus=context.chargeEffects==='active'?Math.min(200,Math.max(...groups.map(g=>g.outgoing))+Math.max(...groups.map(g=>g.enemyIncoming))):0;
  const total=fixed.total+hs.reduce((n,h)=>n+contributions.get(h.record.id).total,0),index=(1+total/100)*factors.factor*(1+bonus/100);
  const unknown=factors.unknown+hs.reduce((n,h)=>n+contributions.get(h.record.id).unknown,0)+(context.chargeEffects==='active'?hs.reduce((n,h)=>n+charge.get(h.record.id).unknown,0):0);
  if(!best||index>best.index+1e-9||Math.abs(index-best.index)<1e-9&&unknown<best.unknown)best={heroes,index,unknown};
 };
 // Slot coefficients differ, so evaluate both orders for a three-hero party.
 for(const second of pool)if(heroCount===2)consider([leader,second]);else for(const third of pool)if(third!==second)consider([leader,second,third]);
 return {...evaluateTerritoryTeam({...args,context,heroes:best.heroes},data),heroes:best.heroes,context};
}

export function recommendAttackLoadout({candidates,heroCount=2,memoryCount=2,supportCount=0,match='any',...args}){
 let best=null;
 for(const leader of candidates.heroes){
  // Equipment and memory allocation follows the leader's element and troop.
  const context={...args.context,element:leader.record.element};
  const rank=(items,field)=>items.map(item=>({item,result:simulateLoadout({context,base:{mode:'none'},[field]:[item]})})).sort((a,b)=>b.result.total-a.result.total||a.result.unknown-b.result.unknown||String(a.item.key).localeCompare(String(b.item.key)));
  const gear=LOOT_SLOTS.flatMap(slot=>{const g=rank(candidates.gear.filter(g=>g.record.slot===slot),'gear')[0];return g?.result.total>0?[g.item]:[];});
  const seen=new Set(),memories=rank(candidates.memories,'memories').filter(x=>{const key=memoryTypeKey(x.item.record);if(x.result.total<=0||seen.has(key))return false;seen.add(key);return true;}).slice(0,memoryCount).map(x=>x.item);
  try{
   const team=recommendAttackPartners({...args,context,candidates:candidates.heroes,leader,heroCount,supportCount,match,gear,memories});
   if(!best||team.index>best.index+1e-9||Math.abs(team.index-best.index)<1e-9&&team.unknown<best.unknown)best={...team,gear,memories};
  }catch(err){if(!err.message.startsWith('条件に合うエンバースが不足'))throw err;}
 }
 if(!best)throw Error('編成に必要なエンバースが不足しています。所持記録・相性条件・枠数を確認してください。');
 return best;
}
