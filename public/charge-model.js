const finite=n=>typeof n==='number'&&Number.isFinite(n);
const round=n=>Math.round(n*1e6)/1e6;
// Help 61 confirms outgoing + enemy incoming caps at +200%, and incoming
// + enemy outgoing caps at -75%. Same-kind stacking and uptime are not verified:
// compare the strongest active effect per kind, not a sustained damage estimate.
export function chargeSkillEffects(heroes=[],state={},context={}){
 const rows=[],skills=[],groups={outgoing:0,enemyIncoming:0,incoming:0,enemyOutgoing:0};let unknown=0;
 const types={'与ダメージ':'outgoing','自分の与ダメージ':'outgoing','敵の被ダメージ':'enemyIncoming','自分の被ダメージ':'incoming','敵の与ダメージ':'enemyOutgoing'};
 for(const h of heroes){
  const r=h.record;if(!r||h.support)continue;
  const skill=r.skills?.charge,level=h.levels?.charge??state.progress?.[r.id]?.skills?.charge??0;
  if(!skill){unknown++;skills.push({hero:r.name,name:'チャージ情報未確認',level,powers:[],description:''});continue;}
  const value=e=>level>0&&finite(e?.values?.[level-1])?e.values[level-1]:null;
  const effects=skill.effects||[],description=r.skillDescriptions?.charge?.[Math.max(0,level-1)]||r.charge||'';
  const powers=effects.filter(e=>e.name.includes('威力')).map(e=>({name:e.name,value:value(e)}));
  if(!level)unknown++;
  skills.push({hero:r.name,name:skill.name,level,powers,description});
  for(const e of effects){
   if(e.unit!=='%')continue;
   const kind=types[e.name],v=value(e),duration=value(effects.find(x=>x.name===e.name+' 効果時間'));
   const valid=kind&&v!==null&&(kind==='outgoing'||kind==='enemyIncoming'?v>=0:v<=0);
   if(kind&&(v===null||duration===null)&&level)unknown++;
   rows.push({hero:r.name,skill:skill.name,level,name:e.name,value:v,duration,kind:kind||'other',applied:!!valid});
   if(valid)groups[kind]=kind==='outgoing'||kind==='enemyIncoming'?Math.max(groups[kind],v):Math.min(groups[kind],v);
  }
 }
 const bonus=Math.min(200,groups.outgoing+groups.enemyIncoming),reduction=Math.max(-75,groups.incoming+groups.enemyOutgoing);
 return {rows,skills,groups,bonus:round(bonus),reduction:round(reduction),factor:round(1+bonus/100),receivedFactor:round(1+reduction/100),unknown};
}
