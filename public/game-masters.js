import {abilityName} from './ability-names.js';
import {gameBuildingRules} from './building-prerequisites.js';

// Apply shipped facts before user overrides. No ownership or progress is seeded.
export function withGameEquipment(record,data){
 const source=data.equipment?.[record.id];
 if(record.kind!=='equipment'||!source)return record;
 const {name,slot,raid,unlockGrades,power,powerGrades,mainAbilities,equipmentEvidence}=source;
 return {...record,name,slot:slot||record.slot,raid:raid??record.raid,...(unlockGrades?{unlockGrades:[...unlockGrades]}:{}),power,powerGrades:[...powerGrades],mainAbilities:structuredClone(mainAbilities),equipmentEvidence};
}

// Older saved edits often contain only G5/G6. Fill their unknown cells from the
// same master effect without replacing numeric user values (including zero).
export function gameEquipmentOverride(id,override,data){
 const source=data.equipment?.[id];if(!source)return override;
 const result={...override};
 if(override.mainAbilities)result.mainAbilities=override.mainAbilities.map(effect=>{
  const known=source.mainAbilities.find(a=>abilityName(a.name)===abilityName(effect.name)&&a.unit===effect.unit);
  return known?{...effect,values:effect.values.map((v,i)=>v??known.values[i])}:effect;
 });
 if(override.powerGrades)result.powerGrades=override.powerGrades.map((v,i)=>v??source.powerGrades[i]);
 return result;
}

// Upgrade legacy shipped research values, fill blanks, and keep independent edits.
export function seedGameResearch(state,data,legacySpecs={}){
 state.researchSpecs??={};
 for(const [id,source] of Object.entries(data.researchSpecs||{})){
  const current=state.researchSpecs[id],legacy=legacySpecs[id];
  if(!current){state.researchSpecs[id]=structuredClone(source);continue;}
  const hasValues=current.values?.some(v=>v!==null);
  const isLegacy=legacy&&abilityName(current.ability)===abilityName(legacy.ability)&&current.unit===legacy.unit&&JSON.stringify(current.values)===JSON.stringify(legacy.values);
  if(!isLegacy&&hasValues&&(abilityName(current.ability)!==source.ability||current.unit!==source.unit))continue;
  const values=source.values.map((v,i)=>isLegacy||current.values?.[i]==null?v:current.values[i]);
  state.researchSpecs[id]={...current,ability:source.ability,unit:source.unit,values,
   note:current.note?.includes(source.note)?current.note:[current.note,source.note].filter(Boolean).join('\n').slice(0,1000)};
 }
 return state;
}

export function applyGameWorld(mechanics,buildingData,data,images={}){
 buildingData.rules=gameBuildingRules(data);
 mechanics.research=mechanics.research.map(n=>data.researchCosts?.[n.id]?{...n,levels:structuredClone(data.researchCosts[n.id]),costSource:data.source}:n);
 buildingData.buildings=buildingData.buildings.map(b=>{
  const master=data.buildings?.[b.id];if(!master)return b;
  return {...b,levels:master.levels.map(l=>({...b.levels.find(x=>x.level===l.level),...l,notes:[data.source+' / Building '+master.masterId],differences:[],image:images.buildings?.[l.imageId]||''}))};
 });
 return {mechanics,buildingData};
}

// Common game facts take precedence over obsolete bundled/wiki values. User
// ownership, growth progress and memos live separately and are never changed.
export function withGameHero(record,data,override){
 const source=data.characters?.[record.id];if(!source)return record;
 const result={...record,...structuredClone(source),commonRevision:'pc-2026-10-03'};
 return override?.commonRevision===result.commonRevision?{...result,...override}:result;
}

// Verified game definitions replace obsolete manual common curves, never progress.
export function seedGameBuildingEffects(state,game){for(const [id,effects] of Object.entries(game.buildingEffects||{}))state.buildingEffects[id]=structuredClone(effects);}
