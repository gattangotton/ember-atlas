import {GATHER_DROP_MAX} from './gather-drop-data.js';
import {LOOT_SLOTS,LOOT_RACES} from './loot-model.js';
export const PARTY_MODES={loot:'素材倍化',attack:'種族別攻撃力',gather:'採集'};
const text=(s,n=160)=>typeof s==='string'&&s.length<=n;
const id=s=>text(s,80)&&/^[\w-]+$/.test(s)&&!['__proto__','prototype','constructor'].includes(s);
const number=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
export function validatePartySettings(v){
 if(!v||typeof v!=='object'||!['field','fieldBoss','raid','rally'].includes(v.battle)||!LOOT_RACES.includes(v.race)||!number(v.grade,1,6)||!Number.isInteger(v.grade)||!text(v.boss,80)||!['hero','gear','memory'].includes(v.tab)||!['歩兵','弓兵','騎兵'].includes(v.troop)||!['all','normal','counter','charge','active'].includes(v.attackType))throw Error('編成の計算条件が不正です。');
 const list=(xs)=>{if(!Array.isArray(xs)||xs.length!==3||xs.some(x=>!text(x)))throw Error('編成の選択が不正です。');return [...xs];};
 const heroes=list(v.heroes),memories=list(v.memories);if(new Set(heroes.filter(Boolean)).size!==heroes.filter(Boolean).length||v.owned&&new Set(memories.filter(Boolean)).size!==memories.filter(Boolean).length)throw Error('同じエンバース・メモリ個体が重複しています。');
 const gear={};for(const slot of LOOT_SLOTS){if(v.gear?.[slot]!==undefined){if(!text(v.gear[slot]))throw Error('武具の選択が不正です。');gear[slot]=v.gear[slot];}}
 const heroSettings={};for(const hero of heroes.filter(Boolean)){if(!id(hero))throw Error('エンバースIDが不正です。');const s=v.heroSettings?.[hero]||{},levels={},enabled={};for(const key of ['trigger1','trigger2','trigger3']){const lv=s.levels?.[key]??0;if(!Number.isInteger(lv)||!number(lv,0,7))throw Error('スキルLvが不正です。');levels[key]=lv;enabled[key]=s.enabled?.[key]===true;}if(!Number.isInteger(s.stacks??0)||!number(s.stacks??0,0,6))throw Error('発動回数が不正です。');heroSettings[hero]={levels,enabled,stacks:s.stacks||0};}
 const drops={};for(const [key,value] of Object.entries(v.drops||{})){if(!/^\d+$/.test(key)||!text(value,80))throw Error('雫の選択が不正です。');drops[key]=value;}if(Object.keys(drops).length>50)throw Error('雫の件数が不正です。');
 if(!['auto','manual','none'].includes(v.base?.mode))throw Error('拠点の設定が不正です。');
 const resource=v.resource??'食料',resourceLevel=v.resourceLevel??6,droplet=v.droplet??0,objective=v.objective??'amount';
 if(!['食料','木材','金属','エーテル'].includes(resource)||![4,5,6,7].includes(resourceLevel)||!number(droplet,0,GATHER_DROP_MAX)||!['speed','amount'].includes(objective))throw Error('採集の設定が不正です。');
 return {battle:v.battle,race:v.race,grade:v.grade,boss:v.boss,tab:v.tab,troop:v.troop,attackType:v.attackType,owned:v.owned===true,heroes,memories,gear,heroSettings,drops,thirdHero:v.thirdHero===true,thirdMemory:v.thirdMemory===true,base:{mode:v.base.mode,...Object.fromEntries(['research','core','building','extra'].map(k=>[k,v.base[k]===true]))},resource,resourceLevel,droplet,objective,gatherItem:v.gatherItem===true};
}
export function validateParties(input=[]){if(!Array.isArray(input)||input.length>100)throw Error('保存編成は100件以内です。');const seen=new Set();return input.map(p=>{if(!p||!id(p.id)||seen.has(p.id)||!Object.hasOwn(PARTY_MODES,p.mode)||!text(p.name,80)||!p.name.trim()||!Number.isFinite(Date.parse(p.updatedAt)))throw Error('保存編成の形式が不正です。');seen.add(p.id);const result=p.result||{};if(!number(result.total,-1e9,1e9)||!Number.isInteger(result.unknown)||!number(result.unknown,0,10000))throw Error('保存した計算結果が不正です。');return {id:p.id,name:p.name.trim(),mode:p.mode,updatedAt:p.updatedAt,settings:validatePartySettings(p.settings),result:{total:result.total,unknown:result.unknown}};});}
