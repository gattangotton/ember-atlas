import {effectKey} from './equipment-model.js';
import {aggregateAbilities} from './strategy-model.js';
import {lootContribution} from './loot-model.js';
import {unlockedSlots} from './mechanics.js';
import {gatherKind} from './gather-model.js';

export const TRIGGER_KEYS=['trigger1','trigger2','trigger3'];
export const SOURCE_LABELS={equipment:'武具',hero:'エンバース',memory:'メモリ',research:'研究',core:'コア',building:'施設',extra:'その他の拠点効果',manual:'記録した拠点合計',drop:'雫'};
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const round=n=>Math.round(n*1e6)/1e6;
export function effectWeight(name,context){
 if(context.mode==='gather')return gatherKind(name,context.resource)===(context.objective==='speed'?'速度':'量')?1:0;
 const n=effectKey(name),race=effectKey(context.race),mode=context.mode||'loot',battle=context.battle||'field';
 const suffix=mode==='loot'?'素材倍化率':'攻撃力';
 if(n===`対${race}${suffix}`||n===`対魔獣${suffix}`)return 1;
 if(n===`対集結魔獣${suffix}`)return battle==='rally'?1:0;
 if(n===`対大型魔獣${suffix}`)return ['rally','raid'].includes(battle)?1:0;
 if(n===`対レイド魔獣${suffix}`)return battle==='raid'?1:0;
 if(n===`対フィールドボス${suffix}`)return battle==='fieldBoss'?1:0;
 if(mode==='loot')return 0;
 if(n==='攻撃力'||n==='部隊時攻撃力')return 1;
 if(n==='集結部隊時攻撃力')return battle==='rally'?1:0;
 for(const troop of ['歩兵','弓兵','騎兵']){
  const share=(context.troops?.[troop]??(context.troop===troop?100:0))/100;
  if(n===troop+'攻撃力')return share;
  if(n===troop+'単兵種編成時攻撃力')return share===1?1:0;
 }
 if(n===`${context.element}属性リーダー攻撃力`&&context.element)return 1;
 const action={normal:['通常攻撃攻撃力','通常攻撃時攻撃力'],counter:['反撃攻撃力'],charge:['チャージスキル攻撃力'],active:['アクティブスキル攻撃力']}[context.attackType]||[];
 return action.includes(n)&&(context.attackType!=='active'||battle==='raid')?1:0;
}
export function lootExpectation(percent){const p=Math.max(0,percent),minimum=1+Math.floor(p/100),chance=round(p%100);return {minimum,maximum:minimum+(chance>0?1:0),chance,expected:round(1+p/100)};}
export function triggerCondition(record,key){
 const text=(record.skillDescriptions?.[key]?.[0]||record.skills?.[key]?.note||'').split('※')[0];
 if(/15[％%]減少/.test(text))return 'loss';
 if(/攻撃時に\d+[％%]の確率/.test(text))return 'proc';
 if(/2部隊以上/.test(text))return 'multiple';
 return '';
}
export function memorySlotCount(state,data){return (state.research?.[data?.memorySlots?.researchId]||0)>0?3:2;}

// This is an ability-bonus calculator, not a battle damage model. Core effects
// belong to the whole base, never to a second contribution from selected heroes.
export function simulateLoadout({context,gear=[],heroes=[],memories=[],drops=[],records=[],nodes=[],state={},evidence={},base={mode:'auto',research:true,core:true,building:true,extra:true}}){
 const entries=[],notices=[],ignored=[];
 const add=(name,value,source,label,unit='%',extra={})=>{
  const weight=effectWeight(name,context);if(!weight||unit!=='%')return;
  entries.push({name,source,label,value:finite(value)?round(value*weight):null,raw:finite(value)?value:null,weight,...extra});
 };
 const unknown=(source,label,name)=>entries.push({name,source,label,value:null,raw:null,weight:1});
 for(const item of gear){
  const r=item.record;if(!r)continue;
  if(context.mode==='loot'){
   // Preserve the reviewed legacy fallback, but also match battle-type effects.
   const selected=lootContribution(r,item.grade,context.race,item.subAbilities).entries;
   for(const e of selected)add(e.name.replace('（元資料）',''),e.value,'equipment',r.name+' / '+e.source);
   for(const e of r.mainAbilities||[])if(!selected.some(x=>effectKey(x.name.replace('（元資料）',''))===effectKey(e.name)))add(e.name,e.values?.[item.grade-1],'equipment',r.name+' / メイン',e.unit);
   for(const e of item.subAbilities||[])if(e&&!selected.some(x=>x.source==='サブ'&&effectKey(x.name)===effectKey(e.name)))add(e.name,e.value,'equipment',r.name+' / サブ');
   if(selected.some(e=>e.name==='メイン効果未登録'))unknown('equipment',r.name,'メイン効果未登録');
  }else{
   if(!r.mainAbilities?.length)unknown('equipment',r.name,'メイン効果未登録');
   for(const e of r.mainAbilities||[])add(e.name,e.values?.[item.grade-1],'equipment',r.name+' / メイン',e.unit);
   for(const e of item.subAbilities||[])if(e)add(e.name,e.value,'equipment',r.name+' / サブ');
  }
  if(item.owned)unlockedSlots(r,item.grade).forEach((open,i)=>{if(open&&!item.subAbilities?.[i])unknown('equipment',r.name,`サブ${i+1}未確認`);});
 }
 const seenHeroes=new Set();
 for(const h of heroes){
  if(!h.record)continue;if(seenHeroes.has(h.record.id))throw Error('同じエンバースは重複して編成できません。');seenHeroes.add(h.record.id);
  for(const key of TRIGGER_KEYS){
   const skill=h.record.skills?.[key];if(!skill){unknown('hero',h.record.name,'トリガー情報未確認');continue;}
   const condition=triggerCondition(h.record,key),level=h.levels?.[key]??state.progress?.[h.record.id]?.skills?.[key]??0;
   const count=condition==='loss'?Math.max(0,Math.min(6,h.stacks||0)):1;
   if(condition&&((condition==='loss'&&!count)||(condition!=='loss'&&!h.enabled?.[key]))){if(context.mode==='attack')ignored.push(h.record.name+' / '+skill.name+'：条件未発動');continue;}
   for(const e of skill.effects||[]){const name=condition==='loss'&&/15[％%]減少するたびに攻撃力/.test(e.name)?'攻撃力':e.name;const v=level>0?e.values?.[level-1]:null;add(name,finite(v)?v*count:null,'hero',h.record.name+' / '+skill.name+(level?' Lv.'+level:' Lv未確認'),e.unit);}
  }
 }
 const seenMemories=new Set();
 for(const m of memories){
  if(!m.record)continue;const key=m.record.id+':'+(m.copy?.id||'catalog');
  if(m.copy&&seenMemories.has(key))throw Error('同じメモリ個体は重複して編成できません。');seenMemories.add(key);
  if(m.record.mainEffectsKnown===false)unknown('memory',m.record.name,'固定効果未確認');
  for(const e of m.record.mainEffects||[])add(e.name,e.value,'memory',m.record.name+' / 固定',e.unit);
  for(const [i,e] of (m.copy?.subs||[]).entries()){
   if(e.status==='unknown')unknown('memory',m.record.name,`サブ${i+1}未確認`);
   else if(e.status==='set')add(e.name,e.value,'memory',m.record.name+' / サブ',e.unit);
  }
 }
 if(base.mode!=='none')for(const g of aggregateAbilities({records,nodes,state,evidence})){
  if(!effectWeight(g.name,context)||g.unit!=='%')continue;
  if(base.mode==='manual'){
   // A recorded total replaces all automatic sources for this ability.
   if(g.manual?.total!=null)add(g.name,g.manual.total,'manual',g.name+'（拠点で記録した合計）');
   else unknown('manual',g.name,'拠点合計未入力：'+g.name);
   continue;
  }
  for(const s of g.sources){if(!s.acquired)continue;
   const type=s.type==='extra'?'extra':s.type==='core'?'core':s.type==='research'?'research':'building';
   if(!base[type])continue;
   // Gear and transient item entries are selected separately in the loadout.
   if(type==='extra'&&['装備','アイテム'].includes(s.kind)){ignored.push(s.label+'：装備・アイテムの手動加算は除外');continue;}
   if(type==='extra'&&context.battle==='raid'&&s.kind==='称号'){ignored.push(s.label+'：レイドでは称号を除外');continue;}
   add(g.name,s.value,type,s.label,g.unit);
  }
 }
 const seenDrops=new Set();
 for(const d of drops){if(!d)continue;if(seenDrops.has(d.ability))throw Error('同じ効果の雫は1種類を選択してください。');seenDrops.add(d.ability);
  if(context.battle==='raid'){ignored.push(d.name+'：レイドでは無効');continue;}add(d.ability,d.value,'drop',d.name);
 }
 if(base.mode==='manual')notices.push('記録した拠点合計で研究・コア・施設を置き換えています。編成や雫を含まない拠点値を使ってください。');
 const rows=Object.entries(SOURCE_LABELS).map(([source,label])=>{const es=entries.filter(e=>e.source===source);return {source,label,entries:es,total:round(es.reduce((n,e)=>n+(e.value??0),0)),unknown:es.filter(e=>e.value===null).length};});
 const total=round(rows.reduce((n,r)=>n+r.total,0)),unknownCount=rows.reduce((n,r)=>n+r.unknown,0);
 return {entries,rows,total,unknown:unknownCount,notices,ignored,expectation:context.mode==='loot'?lootExpectation(total):null};
}
