export function gameBuildingRules(game){
 const mapping=new Map(Object.entries(game.buildings||{}).map(([id,b])=>[b.masterId,id])),rules={};
 for(const [id,b] of Object.entries(game.buildings||{}))for(const l of b.levels){
  const rows=l.requirements;
  if(!Array.isArray(rows)||rows.some(r=>r[-1]!==1||!mapping.has(r[0])||!Number.isInteger(r[1])||r[1]<1))continue;
  const requirements=rows.map(r=>({buildingId:mapping.get(r[0]),level:r[1]}));
  rules[id+':'+l.level]={status:requirements.length?'known':'none',requirements,note:'PC版 Building / '+b.masterId+' / Lv.'+l.level};
 }
 return rules;
}
export function prerequisiteStatus(requirement,progress={}){const current=Math.max(0,...(progress[requirement.buildingId]||[]));return {current,met:current>=requirement.level};}
