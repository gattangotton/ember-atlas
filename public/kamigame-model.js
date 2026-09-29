import {SKILLS,validateMechanics,coreEffects} from './mechanics.js';

const coreAliases={'対魔獣獲得経験値':'対魔獣経験値','対魔獣素材倍化率':'魔獣倍加','建設速度':'建築速度','建設資源効率':'建築資源効率','兵士治療資源効率':'治癒資源効率','兵士治療速度':'治癒速度効率'};
const coreName=name=>coreAliases[name]||name.replace(/属性リーダー攻撃力$/,'属性');
export function sourceCoreEffects(base,source){
 const existing=coreEffects(base),rows=source?.coreRows||[];
 // Five-row articles use different unlock thresholds; never shift them into six stages.
 if(rows.length!==6||rows.some((r,i)=>r.stage!==['I','II','III','IV','V','VI'][i]||r.requiredTotal!==['初期','10','15','20','25','30'][i]))return existing;
 return existing.map(effect=>{
  let sum=0;const values=[];
  for(const row of rows){const matches=row.effects.filter(e=>coreName(e.name)===coreName(effect.name)&&e.unit===effect.unit);
   if(matches.length!==1||!Number.isFinite(matches[0].value))return effect;
   sum=Math.round((sum+matches[0].value)*1e8)/1e8;values.push(sum);
  }
  // Independent workbook maximum anchors the additive interpretation. Conflicts remain untouched.
  if(effect.values[5]===null||Math.abs(sum-effect.values[5])>1e-7||effect.values.some((v,i)=>v!==null&&Math.abs(v-values[i])>1e-7))return effect;
  return {...effect,values};
 });
}

export function sourceSkillSpec(source,url){
 const effects=[],states=new Map();
 for(const e of source.effects){
  const copy={name:e.name,unit:e.unit,values:[...e.values],pattern:''};
  const match=e.name.match(/^増幅Lv\.(\d+)(.*)$/);
  if(match){const name='増幅Lv.'+match[1];if(!states.has(name))states.set(name,{name,condition:'アクティブ発動時の増幅段階',effects:[]});copy.name=match[2]||'威力';states.get(name).effects.push(copy);}
  else effects.push(copy);
 }
 return {name:source.name,target:source.target,shape:source.shape,extra:source.extra||'unknown',effects,
  note:`神ゲー攻略の掲載値（更新停止サイト）。出典：${url}${source.effects.some(e=>e.review)?' ／ 増分に不規則な値あり。掲載値を保持。':''}`,
  ...(states.size?{stateMode:'charge',stateRule:'育成Lvと増幅Lvは別の軸です。',variants:[...states.values()]}:{})};
}

export function enrichFromSource(base,override,source){
 if(!source)return {...base,...override};
 const skills={...base.skills};
 for(const [key,s] of Object.entries(source.skills)){
  const current=skills[key];
  // Preserve previously populated, independently verified skill tables.
  if(!current?.effects?.length&&!current?.variants?.length)skills[key]=sourceSkillSpec(s,source.url);
 }
 const r={...base,...validateMechanics({skills,coreEffects:sourceCoreEffects(base,source)}),...override};
 // Evidence is a shipped reference, not part of player saves or catalogue edits.
 Object.defineProperty(r,'siteEvidence',{value:source,enumerable:false});
 return r;
}

export function reusablePattern(pattern){
 if(pattern.kind!=='exact'||![5,7].includes(pattern.levelCount)||pattern.values.some(v=>typeof v!=='number'||!Number.isFinite(v)))throw Error('数値一致のスキルパターンを選んでください。');
 return {name:`神ゲー ${pattern.id.slice(-12)} · ${pattern.levelCount}段階${pattern.unit?' '+pattern.unit:''}`,values:[...pattern.values]};
}

export function checkSourceDatabase(data){
 if(data?.version!==1||!Array.isArray(data.characters)||!Array.isArray(data.patterns))throw Error('攻略サイト資料の形式が違います。');
 const urls=new Set(),ids=new Set();
 for(const c of data.characters){
  if(!/^https:\/\/kamigame\.jp\/emberstoria\/page\/\d+\.html$/.test(c.url)||urls.has(c.url)||c.recordId&&ids.has(c.recordId))throw Error('資料URLまたは対応IDが不正です。');
  urls.add(c.url);if(c.recordId)ids.add(c.recordId);
  for(const [key,s] of Object.entries(c.skills)){
   if(!SKILLS[key]||s.effects.some(e=>e.values.length!==SKILLS[key].max))throw Error('資料のスキル段階数が不正です。');
   validateMechanics({skills:{[key]:sourceSkillSpec(s,c.url)}});
  }
  for(const icon of [...Object.values(c.icons),...Object.values(c.skills).map(s=>s.icon)].filter(Boolean)){
   if(!/^assets\/kamigame\/[a-f0-9]{20}\.(?:png|jpg|webp)$/.test(icon.path))throw Error('資料アイコンの保存先が不正です。');
  }
 }
 return data;
}
