import {applyBuildingEffectTemplates} from './building-effect-templates.js';
// Only common game definitions are seeded. Player progress and notes are never seeded.
export function seedBaseDefinitions(state,base){
 for(const key of ['researchSpecs','buildingEffects','buildingRules'])state[key]={...structuredClone(base[key]||{}),...(state[key]||{})};
 for(const key of ['patterns','equipmentPatterns','foundations']){const existing=state[key]||[];const identity=x=>x.id||JSON.stringify([x.name,x.values]);state[key]=[...structuredClone((base[key]||[]).filter(x=>!existing.some(y=>identity(y)===identity(x)))),...existing];}
 state.buildingEffects=applyBuildingEffectTemplates(state.buildingEffects);
 return state;
}
export function withBuiltinRecord(record,base){const seed=base.records?.[record.id];if(!seed)return record;const result={...record,...structuredClone(seed),skills:{...record.skills}};
 for(const [key,s] of Object.entries(seed.skills||{}))if(!record.skills?.[key]?.effects?.length)result.skills[key]=structuredClone(s);
 if(seed.mainAbilities)result.mainAbilities=seed.mainAbilities.map(e=>{const current=record.mainAbilities?.find(x=>x.name===e.name&&x.unit===e.unit);if(!current)return structuredClone(e);return {...current,values:current.values.map((v,i)=>v??(current.values[0]===e.values[0]?e.values[i]:null))};});
 return result;}
