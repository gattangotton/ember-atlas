import {isGuardianGear} from './raid-data.js';
// Canonical labels follow the base-ability screen. Only equivalent effects are aliases.
export function abilityName(value){
 let s=String(value??'').normalize('NFKC').trim().replace(/採取/g,'採集').replace(/倍加/g,'倍化').replace(/竜/g,'龍').replace(/建築/g,'建設').replace(/装備制作/g,'装備製作').replace(/治癒速度/g,'治療速度').replace(/収用兵士数/g,'収容兵士数');
 const aliases={'対魔獣経験値':'対魔獣獲得経験値','魔獣倍化':'対魔獣素材倍化率','龍倍化':'対龍素材倍化率','ヨルムン特攻':'対ヨルムンガンド攻撃力','治療速度効率':'兵士治療速度','治療速度':'兵士治療速度','治癒資源効率':'兵士治療資源効率','兵士治癒資源効率':'兵士治療資源効率','拠点防衛':'拠点防衛時攻撃力','集結攻撃力':'集結部隊時攻撃力','集結行軍速度':'集結部隊行軍速度','研究加速':'研究加速(秒)','建設加速':'建設加速(秒)'};
 if(/^[火水風雷土光闇]属性$/.test(s))s+='リーダー攻撃力';
 s=s.replace(/^(歩兵|弓兵|騎兵)行軍$/,'$1行軍速度').replace(/^対(魔獣|精霊|超獣|不浄|堕天|機甲|妖魔|悪魔|龍)攻撃$/,'対$1攻撃力').replace(/^(精霊|超獣|不浄|堕天|機甲|妖魔|悪魔|龍)・メモリ倍化$/,'対$1メモリ倍化率').replace(/^(食料|木材|金属|エーテル)生産$/,'$1生産量');
 return s==='最大同盟支援資源数'?'最大同盟支援要請数':aliases[s]||s;
}
export const abilityList=value=>String(value??'').split('/').map(abilityName).join('/');
export const canonicalAbilityKey=key=>{const at=key.lastIndexOf('|');return at<0?key:abilityName(key.slice(0,at))+'|'+key.slice(at+1).normalize('NFKC');};
export function normalizeAbilityRecord(record){
 const r=structuredClone(record);
 if(isGuardianGear(r)){r.raid='no';r.unlockGrades=[1,5,6];}
 if(r.name==='ゲラルデスカ'||r.character==='ゲラルデスカ'){
  const names=['近衛歩兵基礎攻撃力','近衛弓兵基礎攻撃力','近衛騎兵基礎攻撃力'];
  if(r.coreEffects?.some(e=>e.name==='T4基礎値')){const legacy=r.coreEffects.find(e=>e.name==='T4基礎値');r.coreEffects=r.coreEffects.filter(e=>e.name!=='T4基礎値');for(const name of names)if(!r.coreEffects.some(e=>e.name===name))r.coreEffects.push({name,unit:'',values:[3,6,9,15,21,27].map((v,i)=>legacy.values?.[i]??v)});}
  if(r.ability?.includes('T4基礎値')){r.ability=r.ability.replace('T4基礎値',names.join('/'));r.maximum=String(r.maximum||'').replace(/\+27/, '27/27/27');}
  if(r.kind==='abilities')r.name=r.character+' / '+r.ability;
 }

 const effects=list=>list?.map(e=>({...e,name:abilityName(e.name)}));
 for(const key of ['ability','effect'])if(typeof r[key]==='string')r[key]=abilityList(r[key]);
 for(const key of ['coreEffects','mainAbilities','subCandidates'])if(r[key])r[key]=effects(r[key]);
 if(r.skills)for(const s of Object.values(r.skills)){if(s.effects)s.effects=effects(s.effects);if(s.variants)for(const v of s.variants)if(v.effects)v.effects=effects(v.effects);}
 if(r.kind==='abilities'&&r.character&&r.ability)r.name=r.character+' / '+r.ability;
 return r;
}
// Keep source documents, free-form notes, IDs and manual reference entries intact.
export function normalizeAbilityState(state){
 for(const p of [state,...(state.accounts||[]),...(state.members||[])]){
  for(const entry of [...Object.values(p.progress||{}),...(p.items||[])]){
   for(const copy of entry.instances||[])for(const a of copy.subAbilities||[])if(a)a.name=abilityName(a.name);
   for(const a of entry.subAbilities||[])if(a)a.name=abilityName(a.name);
  }
  for(const e of p.abilityUser?.extras||[])e.ability=abilityName(e.ability);
 }
 for(const s of Object.values(state.researchSpecs||{}))s.ability=abilityName(s.ability);
 for(const p of state.equipmentPatterns||[])p.mainAbilities=normalizeAbilityRecord({mainAbilities:p.mainAbilities}).mainAbilities;
 for(const t of state.foundations||[]){const r=normalizeAbilityRecord({skills:{x:t.spec}});t.spec=r.skills.x;if(t.type==='core'){t.name=abilityList(t.name);}}
 if(state.custom)state.custom=state.custom.map(normalizeAbilityRecord);
 for(const [id,r] of Object.entries(state.overrides||{}))state.overrides[id]=normalizeAbilityRecord(r);
 return state;
}
