import fs from 'node:fs';
import {decodeMessagePack} from './read-messagepack.mjs';
import {abilityName} from '../public/ability-names.js';
import {validateMechanics} from '../public/mechanics.js';
import {createHash} from 'node:crypto';
const files={};
const read=n=>{const b=fs.readFileSync('.work/game-master/'+n);files[n]={sha256:createHash('sha256').update(b).digest('hex'),bytes:b.length};return decodeMessagePack(b);};
const heroes=read('Hero'),skills=new Map(read('Skill').map(x=>[x[0],x])),active=new Map(read('HeroActiveSkillLevel').map(x=>[x[0],x])),cores=new Map(read('CoreAbility').map(x=>[x[0],x])),abilities=new Map(read('Ability').map(x=>[x[0],x]));
const catalog=JSON.parse(fs.readFileSync('public/data/catalog.json'));
const reviewed=JSON.parse(fs.readFileSync(new URL('./game-hero-map.json',import.meta.url)));
const old=catalog.records.filter(r=>r.kind==='characters');if(old.length!==Object.keys(reviewed).length||old.some(r=>!reviewed[r.id]))throw Error('Review hero mapping');
const mapping=new Map(old.map(r=>[reviewed[r.id].masterId,r]));
const chargeBuff=new Set([7,12,21,26,29,38,41,43,48,58,60,62,63,64,69,70,71,72,73,81,47,55,61,66,76]);
const chargeDebuff=new Set([2,5,9,10,17,18,19,25,27,28,32,33,36,39,40,44,51,56,57,59,67,68,75]);
const activeBuff=new Set([7,9,11,12,14,15,18,20,26,27,33,39,42,44,51,57]);
const activeDebuff=new Set([47,55,56,59,69,70,71,73,76]);
const clean=s=>String(s||'').replace(/<[^>]*>/g,'').replace(/\r/g,'');
// Numeric label extraction retains amplification, target-specific headings and
// conditional states. The complete source text stays available for every level.
function textEffects(descriptions){
 const maps=descriptions.map(text=>{let section='',amp='',counts=new Map(),out=new Map();for(const rawLine of text.split('※')[0].split('\n')){
  const line=rawLine.replace(/^([^：:\d+＋]+)([+＋]\d+(?:\.\d+)?%)$/,'$1：$2');
  const a=line.match(/増幅Lv[.．]?(\d)/);if(a)amp='増幅Lv.'+a[1]+' ';
  if(/^(?:堕天|魔獣|部隊|敵部隊|集結|.*以外).*への(?:威力|ダメージ)$/.test(line.trim())){section=line.trim()+' ';amp='';}
  const re=/([^：:\n]+)[：:]\s*([+＋\-−]?\d+(?:\.\d+)?)(%|％|秒|倍)?(?:[（(](\d+(?:\.\d+)?)秒[）)])?/g;let m;
  while((m=re.exec(line))){let label=m[1].replace(/増幅Lv[.．]?\d\s*/,'').trim();if(/対象|減衰率/.test(label))continue;label=section+amp+label;const count=counts.get(label)||0;counts.set(label,count+1);if(count)label+=' ('+(count+1)+')';out.set(label,{name:label,unit:m[3]?.replace('％','%')||'',value:Number(m[2].replace('＋','+').replace('−','-'))});if(m[4])out.set(label+' 効果時間',{name:label+' 効果時間',unit:'秒',value:Number(m[4])});}
 }return out;});
 const keys=[...new Set(maps.flatMap(m=>[...m.keys()]))];return keys.map(k=>({name:k,unit:maps.find(m=>m.has(k)).get(k).unit,values:maps.map(m=>m.get(k)?.value??null),pattern:''}));
}
function effect(id,raw){const a=abilities.get(id);if(!a||![0,1].includes(a[1]??0))throw Error('Ability '+id);return {name:abilityName(a[3]),unit:a[1]===1?'%':/\(秒\)$/.test(a[3])?'秒':'',value:raw/(a[1]===1?100:1)};}
const out={version:1,capturedAt:'2026-10-03',files,characters:{},extraRecords:[]},audit=[];
for(const h of heroes){
 const r=mapping.get(h[0])||{id:'characters-game-'+h[0],kind:'characters',name:h[2]};
 const record={masterId:h[0],name:h[2],rarity:'☆'+h[6],element:({1:'火',2:'水',3:'風',4:'土',5:'雷',7:'光',8:'闇'})[h[5]],troop:({1:'統率',2:'歩兵',3:'弓兵',4:'騎兵'})[h[4]],skills:{},skillDescriptions:{},coreEffects:[],note:'PC版ゲーム設定（2026-10-03取得）。バフ＝自分・味方の強化、デバフ＝敵への弱体。回復・状態異常解除だけの効果は別記。'};
 for(const [key,id] of [['charge',h[20][1]],['active',h[19][0]],...h[21].map((t,i)=>['trigger'+(i+1),t[1]])]){
  const s=skills.get(id),descriptions=(key==='active'?active.get(h[19][1])[2].map(l=>l[2]):(s[20]||s[13]).map(l=>l[1])).map(clean);
  if(descriptions.length!==(key==='active'?5:7))throw Error('Skill levels '+id);
  const text=descriptions.at(-1).split('※')[0],buff=(key==='charge'?chargeBuff:activeBuff).has(h[0]),debuff=(key==='charge'?chargeDebuff:activeDebuff).has(h[0]);
  let effects=textEffects(descriptions);
  // Passive effect values use structured ability IDs rather than translated labels.
  if(key.startsWith('trigger')&&s[13].every(l=>Array.isArray(l[5])&&l[5].length)){
   const effectIds=[...new Set(s[13].flatMap(l=>l[5].map(a=>a[0])))];
   effects=effectIds.map(id=>{const e=effect(id,0);return {name:e.name,unit:e.unit,values:s[13].map(l=>effect(id,l[5].find(a=>a[0]===id)?.[1]??0).value),pattern:''};});
  }
  record.skills[key]={name:s[1],target:/範囲|周囲|複数|領域/.test(text)?'multiple':/単体/.test(text)?'single':'unknown',shape:/扇形/.test(text)?'fan':/円形/.test(text)?'circle':/長方形/.test(text)?'rectangle':/単体/.test(text)?'none':'unknown',extra:key.startsWith('trigger')?'none':buff&&debuff?'both':buff?'buff':debuff?'debuff':'none',effects:effects.slice(0,20),note:'PC版 Skill '+id+'。各Lvの説明を下に収録。条件付き効果はその条件でのみ適用。'};
  if(effects.length>20)throw Error('Effect overflow '+id);
  record.skillDescriptions[key]=descriptions;record[key]=text.split('\n\n')[0];
 }
 const stages=h[33].map(c=>c[0].flatMap(x=>cores.get(x[0])?.[1]||[]).filter(a=>a[0]!==1));
 for(const id of new Set(stages.flatMap(s=>s.map(a=>a[0])))){
  let total=0;const e=effect(id,0),values=stages.map(s=>{total+=effect(id,s.find(a=>a[0]===id)?.[1]??0).value;return Math.round(total*1e6)/1e6;});while(values.length<6)values.push(null);record.coreEffects.push({name:e.name,unit:e.unit,values,pattern:''});
 }
 record.ability=record.coreEffects.map(e=>e.name).join('/');record.maximum=record.coreEffects.map(e=>e.values[stages.length-1]+e.unit).join('/');
 validateMechanics(record);out.characters[r.id]=record;
 if(!mapping.has(h[0]))out.extraRecords.push({...r,...record});
 audit.push({id:r.id,masterId:h[0],previousName:r.name,name:record.name,charge:record.skills.charge.extra,active:record.skills.active.extra,levels:Object.values(record.skillDescriptions).reduce((n,a)=>n+a.length,0)});
}
fs.writeFileSync('public/data/game-heroes.json',JSON.stringify(out,null,2)+'\n');
fs.writeFileSync('artifacts/game-hero-audit.json',JSON.stringify(audit,null,2)+'\n');console.log({heroes:audit.length,new:out.extraRecords.map(r=>r.name)});
