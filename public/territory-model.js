import {chargeSkillEffects} from './charge-model.js';
import {TERRITORY_COMBAT as DATA} from './territory-combat-data.js';
import {simulateLoadout} from './loadout-model.js';
import {memoryTypeKey} from './memory-selection.js';
import {LOOT_SLOTS} from './loot-model.js';
const round=n=>Math.round(n*1e6)/1e6;
export function heroCombat(record,data=DATA){return data.heroes[record.masterId]||Object.values(data.heroes).find(h=>h.name===record.name)||null;}
export function formationBonus(heroes,state={},data=DATA){
 const leader=heroes[0]?.record,origin=leader&&heroCombat(leader,data)?.birthplace,rows=[];let unknown=0;
 const sameWorld=(a,b)=>a!=null&&b!=null&&a!==0&&b!==0&&(a===b||data.equivalentBirthplaces.some(g=>g.includes(a)&&g.includes(b)));
 for(let i=1;i<heroes.length;i++){
  const h=heroes[i],r=h?.record;if(!r)continue;
  const slot=h.support?'support':h.slot||(i===1?'second':'third'),b=data.bonuses[slot],level=h.heroLevel??state.progress?.[r.id]?.level??0,world=heroCombat(r,data)?.birthplace;
  const matches={troop:!!leader?.troop&&leader.troop===r.troop,element:!!leader?.element&&leader.element===r.element,birthplace:sameWorld(origin,world)};
  if(!level)unknown++;if(origin==null||world==null)unknown++;
  const parts={...Object.fromEntries(Object.entries(matches).map(([k,v])=>[k,v?b[k]:0])),level:level*b.level};
  rows.push({id:r.id,name:r.name,slot,level,matches,parts,total:round(Object.values(parts).reduce((a,b)=>a+b,0))});
 }
 return {total:round(rows.reduce((a,b)=>a+b.total,0)),rows,unknown};
}
export function combatFactors(heroes,context,state={},data=DATA){
 const leader=heroes[0]?.record,bonus=formationBonus(heroes,state,data),efficiency=leader?heroCombat(leader,data)?.efficiency?.[context.troop]:null;
 const attributeApplied=['normal','counter'].includes(context.attackType),affinity=attributeApplied?data.affinities.find(a=>a.from===leader?.element&&a.to===context.enemyElement)?.monster||1:1;
 const attributeUnknown=attributeApplied&&!context.enemyElement;
 return {bonus,efficiency:efficiency??1,affinity,attributeApplied,attributeUnknown,unknown:bonus.unknown+(efficiency==null?1:0)+(attributeUnknown?1:0),factor:(1+bonus.total/100)*(efficiency??1)*affinity};
}
export function evaluateTerritoryTeam({heroes,...args},data=DATA){
 const selected=heroes.filter(h=>h?.record);
 const result=simulateLoadout({...args,heroes:selected.filter(h=>!h.support)}),factors=combatFactors(heroes,args.context,args.state,data);
 return {result,factors,index:round(result.comparisonIndex*factors.factor),unknown:result.unknown+factors.unknown};
}

// Maximum-weight matching. The team/type intermediate node prevents duplicate
// memory names within a team; physical copies are shared only when requested.
export function allocateItems(items,teams,capacity,score,{shared=false,typeKey=x=>x.key}={}){
 const graph=[[],[]],source=0,sink=1,addNode=()=>{graph.push([]);return graph.length-1;},links=[];
 const edge=(a,b,cap,cost)=>{const e={to:b,rev:graph[b].length,cap,cost};graph[a].push(e);graph[b].push({to:a,rev:graph[a].length-1,cap:0,cost:-cost});return e;};
 const teamNodes=teams.map(()=>{const n=addNode();edge(n,sink,capacity,0);return n;}),types=new Map();
 for(const item of items){const n=addNode();edge(source,n,shared?teams.length:1,0);teams.forEach((t,i)=>{const value=score(item,t,i);if(!(value>0))return;const key=i+':'+typeKey(item);if(!types.has(key)){const p=addNode();types.set(key,p);edge(p,teamNodes[i],1,0);}links.push({item,team:i,edge:edge(n,types.get(key),1,-value)});});}
 for(let flow=0;flow<teams.length*capacity;flow++){
  const dist=Array(graph.length).fill(Infinity),prev=Array(graph.length);dist[source]=0;
  for(let pass=0;pass<graph.length-1;pass++){let changed=false;for(let a=0;a<graph.length;a++)if(Number.isFinite(dist[a]))graph[a].forEach((e,j)=>{if(e.cap>0&&dist[e.to]>dist[a]+e.cost+1e-9){dist[e.to]=dist[a]+e.cost;prev[e.to]=[a,j];changed=true;}});if(!changed)break;}
  if(!prev[sink]||dist[sink]>=-1e-9)break;
  for(let n=sink;n!==source;){const [a,j]=prev[n],e=graph[a][j];e.cap--;graph[n][e.rev].cap++;n=a;}
 }
 return teams.map((_,i)=>links.filter(x=>x.team===i&&x.edge.cap===0).map(x=>x.item));
}

export function recommendTerritory({candidates,context,state={},teamCount=2,heroCount=2,memoryCount=2,supportCount=0,shared=false,troop='auto',data=DATA,heroes:unusedHeroes,gear:unusedGear,memories:unusedMemories,...common}){
 if(![2,3].includes(teamCount)||![2,3].includes(heroCount)||![2,3].includes(memoryCount)||![0,1,2].includes(supportCount))throw Error('部隊数・編成枠を確認してください。');
 const heroes=candidates.heroes;if(heroes.length<teamCount*heroCount)throw Error(`${teamCount}部隊には最低${teamCount*heroCount}人の所持エンバースが必要です。`);
 if(heroes.length<teamCount*(heroCount+supportCount))throw Error('サポートを含めた所持エンバースが不足しています。');
 const cache=new Map(),baseCache=new Map();
 const chargeGroups=context.chargeEffects==='active'?new Map(heroes.map(h=>[h.record.id,chargeSkillEffects([h],state,context).groups])):null;
 const chargeFactor=hs=>{if(!chargeGroups)return 1;let own=0,enemy=0;for(const h of hs){if(h.support)continue;const g=chargeGroups.get(h.record.id);own=Math.max(own,g?.outgoing||0);enemy=Math.max(enemy,g?.enemyIncoming||0);}return 1+Math.min(200,own+enemy)/100;};
 const ctxFor=(leader,t)=>({...context,mode:'attack',battle:'fieldBoss',troop:t,element:leader.record.element});
 const key=c=>c.troop+'/'+c.element;
 const contribution=(item,c,field)=>{const k=key(c)+'/'+field+'/'+(item.key||item.record.id);if(!cache.has(k))cache.set(k,simulateLoadout({context:c,base:{mode:'none'},[field]:[item]}));return cache.get(k);};
 const baseFor=c=>{if(!baseCache.has(key(c)))baseCache.set(key(c),simulateLoadout({...common,state,context:c}));return baseCache.get(key(c));};
 const pool=[];
 for(const leader of heroes)for(const t of troop==='auto'?['歩兵','弓兵','騎兵']:[troop]){
  const c=ctxFor(leader,t),base=baseFor(c),gear=LOOT_SLOTS.reduce((n,s)=>n+Math.max(0,...candidates.gear.filter(x=>x.record.slot===s).map(x=>contribution(x,c,'gear').total)),0);
  const seen=new Set(),memory=[...candidates.memories].sort((a,b)=>contribution(b,c,'memories').total-contribution(a,c,'memories').total).filter(x=>{const k=memoryTypeKey(x.record);if(seen.has(k))return false;seen.add(k);return true;}).slice(0,memoryCount).reduce((n,x)=>n+Math.max(0,contribution(x,c,'memories').total),0);
  for(const second of heroes.filter(h=>h!==leader)){
   const thirds=heroCount===2?[null]:heroes.filter(h=>h!==leader&&h!==second).map(h=>({h,value:(1+(base.total+gear+memory+[leader,second,h].reduce((n,x)=>n+contribution(x,c,'heroes').total,0))/100)*combatFactors([leader,second,h],c,state,data).factor*chargeFactor([leader,second,h])})).sort((a,b)=>b.value-a.value).slice(0,3).map(x=>x.h);
   for(const third of thirds){const hs=[leader,second,...(third?[third]:[])],f=combatFactors(hs,c,state,data),attack=base.total+hs.reduce((n,h)=>n+contribution(h,c,'heroes').total,0),upper=(1+(attack+gear+memory)/100)*f.factor*chargeFactor(hs);pool.push({heroes:hs,context:c,upper,ids:hs.map(h=>h.record.id)});}
  }
 }
 pool.sort((a,b)=>b.upper-a.upper||a.ids.join().localeCompare(b.ids.join()));
 // Keep leader diversity in addition to the strongest independent candidates.
 const seenLeaders=new Set(),shortlist=pool.filter((p,i)=>{const k=p.ids[0]+'/'+p.context.troop;const take=i<120||!seenLeaders.has(k);seenLeaders.add(k);return take;});
 let beam=[{teams:[],used:new Set(),score:0}];
 for(let i=0;i<teamCount;i++){
  const next=[],seen=new Set();for(const b of beam)for(const p of shortlist){if(p.ids.some(id=>b.used.has(id)))continue;const teams=[...b.teams,p],signature=teams.map(t=>t.ids.join('/')+t.context.troop).sort().join('|');if(seen.has(signature))continue;seen.add(signature);next.push({teams,used:new Set([...b.used,...p.ids]),score:b.score+p.upper});}next.sort((a,b)=>b.score-a.score);beam=next.slice(0,80);
 }
 if(!beam.length){
  // A diverse fallback guarantees a valid result even if the shortlist contains
  // one exceptionally strong hero in every high-scoring team.
  const used=new Set(),teams=[];for(let i=0;i<teamCount;i++){
   let p=pool.find(p=>!p.ids.some(id=>used.has(id)));
   if(!p){const remaining=heroes.filter(h=>!used.has(h.record.id)),hs=remaining.slice(0,heroCount);if(hs.length<heroCount)break;const c=ctxFor(hs[0],troop==='auto'?(hs[0].record.troop==='統率'?'歩兵':hs[0].record.troop):troop);p={heroes:hs,context:c,ids:hs.map(h=>h.record.id),upper:(1+baseFor(c).total/100+hs.reduce((n,h)=>n+contribution(h,c,'heroes').total,0)/100)*combatFactors(hs,c,state,data).factor};}
   teams.push(p);p.ids.forEach(id=>used.add(id));
  }if(teams.length===teamCount)beam=[{teams,used}];
 }
 let best=null;
 for(const b of beam.slice(0,40)){
  const teams=b.teams.map(t=>({...t,heroes:[...t.heroes],gear:[],memories:[]}));
  if(supportCount){const remaining=heroes.filter(h=>!b.used.has(h.record.id)),assigned=allocateItems(remaining.map(h=>({...h,key:h.record.id})),teams,supportCount,(h,t)=>{const old=combatFactors(t.heroes,t.context,state,data).factor,now=combatFactors([...t.heroes,{...h,support:true}],t.context,state,data).factor;return t.upper*(now/old-1);});teams.forEach((t,i)=>t.heroes.push(...assigned[i].map(h=>({...h,support:true}))));}
  const factors=teams.map(t=>combatFactors(t.heroes,t.context,state,data).factor*chargeFactor(t.heroes));
  for(const slot of LOOT_SLOTS){const assigned=allocateItems(candidates.gear.filter(g=>g.record.slot===slot),teams,1,(g,t,i)=>contribution(g,t.context,'gear').total*factors[i],{shared});teams.forEach((t,i)=>t.gear.push(...assigned[i]));}
  const memories=allocateItems(candidates.memories,teams,memoryCount,(m,t,i)=>contribution(m,t.context,'memories').total*factors[i],{shared,typeKey:m=>memoryTypeKey(m.record)});teams.forEach((t,i)=>{t.memories=memories[i];Object.assign(t,evaluateTerritoryTeam({...common,state,context:t.context,heroes:t.heroes,gear:t.gear,memories:t.memories},data));});
  const score=teams.reduce((n,t)=>n+t.index,0),unknown=teams.reduce((n,t)=>n+t.unknown,0);
  if(!best||score>best.score+1e-9||Math.abs(score-best.score)<1e-9&&unknown<best.unknown)best={teams,score:round(score),unknown};
 }
 if(!best)throw Error('重複しない編成候補が見つかりませんでした。');
 return {...best,searched:pool.length,finalists:Math.min(40,beam.length),approximate:true,shared};
}
