import {abilityName} from './ability-names.js';
import {effectKey} from './equipment-model.js';
import {coreEffects,coreThresholds} from './mechanics.js';

export const abilityFamily=name=>effectKey(name).replace(/^[火水風雷土光闇]属性リーダー攻撃力$/,'属性リーダー攻撃力').replace(/^対(?:精霊|不浄|機甲|堕天|妖魔|龍|超獣|悪魔)(攻撃力|防御効率|素材倍化率|メモリ倍化率)$/,'対種族$1');
const complete=values=>Array.isArray(values)&&values.every(v=>typeof v==='number'&&Number.isFinite(v));
const unitKey=unit=>String(unit??'%').normalize('NFKC');
export function equipmentCurves(record,name,unit,records=[],patterns=[]){
 const family=abilityFamily(name),out=[];
 const add=(label,e,power,slot)=>{if(power!==record.power||slot&&slot!==record.slot||abilityFamily(e.name)!==family||unitKey(e.unit)!==unitKey(unit)||e.values?.length!==6||!e.values.some(v=>typeof v==='number'&&Number.isFinite(v))||e.values.some(v=>v!==null&&!(typeof v==='number'&&Number.isFinite(v))))return;
  const same=out.find(p=>JSON.stringify(p.values)===JSON.stringify(e.values));if(same){same.sources.push(label);return;}
  out.push({name:label,values:[...e.values],sources:[label]});};
 add('標準登録：12000武器・属性リーダー攻撃力',{name:'属性リーダー攻撃力',unit:'%',values:[26.5,33.1,39.7,46.3,53,59.6]},12000,'武器');
 for(const p of patterns)for(const e of p.mainAbilities||[])add('保存済み：'+p.name,e,p.power,p.slot);
 for(const r of records.filter(r=>r.kind==='equipment')){for(const e of r.mainAbilities||[])add('登録装備：'+r.name,e,r.power,r.slot);
  if(r.effect&&r.grades?.length===6&&(r.mainAbilities||[]).some(e=>abilityFamily(e.name)===abilityFamily(r.effect)&&e.values[0]===r.grades[0]))add('元資料：'+r.name,{name:r.effect,unit:'%',values:r.grades},r.power,r.slot);
 }
 return out;
}
export function emberCurves(name,unit,count,records=[],patterns=[]){
 const out=[];const add=(label,e)=>{if(e.values?.length!==count||!complete(e.values)||out.some(p=>JSON.stringify(p.values)===JSON.stringify(e.values)))return;out.push({name:label,values:[...e.values]});};
 for(const p of patterns)if(p.values?.length===count)add('保存済み：'+p.name,p);
 for(const r of records.filter(r=>r.kind==='characters')){
  const effects=[...Object.values(r.skills||{}).flatMap(s=>[...(s.effects||[]),...(s.variants||[]).flatMap(v=>v.effects||[])]),...coreEffects(r).map(e=>({...e,values:e.values.slice(0,coreThresholds(r).length)}))];
  for(const e of effects)if(effectKey(abilityName(e.name))===effectKey(abilityName(name))&&unitKey(e.unit)===unitKey(unit))add(r.name+'：'+e.name,e);
 }
 return out;
}
