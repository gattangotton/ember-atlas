import {validateBuildingProgress} from './building-progress.js';
import {validateMemoryInventory} from './memory-model.js';
import {validateParties} from './party-model.js';
import {abilityName} from './ability-names.js';
import {validateCopies} from './equipment-inventory.js';
import {validateMechanics,skillLevels,validateResearch} from './mechanics.js';
export const STORE_KEY='ember-atlas-v1';
export const KINDS={characters:'エンバース',equipment:'装備',abilities:'コアアビリティ'};
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
export const normalize=s=>abilityName(s).toLocaleLowerCase('ja');
export function filterRecords(records,{kind,query='',element='',troop='',owned=false,progress={}}={}) {
 return records.filter(r=>(!kind||r.kind===kind)&&(!element||r.element===element)&&(!troop||r.troop===troop||r.slot===troop)&&(!owned||progress[r.id]?.owned)&&normalize([...Object.entries(r).filter(([k,v])=>k!=='portrait'&&typeof v==='string').map(([,v])=>v),...(r.mainAbilities||[]).map(e=>e.name),...(r.coreEffects||[]).map(e=>e.name),...(r.subCandidates||[]).map(e=>e.name),...Object.values(r.skills||{}).flatMap(s=>[s.note,...(s.effects||[]).map(e=>e.name)])].join(' ')).includes(normalize(query)));
}
export function validateRecord(r){
 if(!r||typeof r!=='object'||!Object.hasOwn(KINDS,r.kind)||typeof r.name!=='string'||!r.name.trim()||r.name.length>100)throw Error('種類と100文字以内の名称が必要です。');
 const allowed=['id','kind','name','rarity','troop','element','charge','active','trigger1','trigger2','trigger3','ability','maximum','release','note','slot','effect','character'];
 const result={};
 for(const key of allowed)if(r[key]!==undefined){if(!['string','number'].includes(typeof r[key])||String(r[key]).length>4000)throw Error('項目の形式または文字数が不正です。');result[key]=String(r[key]);}
 if(result.id && !validId(result.id))throw Error('データIDの形式が不正です。');
 if(r.kind==='equipment'){
  if(!Array.isArray(r.grades)||r.grades.length!==6||r.grades.some(v=>v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<0||v>10000)))throw Error('G1～G6は0以上の数値または未登録にしてください。');
  result.grades=r.grades;
 }
 Object.assign(result,validateMechanics(r));result.name=result.name.trim();return result;
}
export function validateShare(v){
 if(v?.type!=='ember-atlas-progress'||![1,2,3].includes(v.version)||!v.profile||!Array.isArray(v.items)||v.items.length>5000)throw Error('育成状況ファイルの形式が違います。');
 const p=v.profile;
 if(!validId(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>60)throw Error('プレイヤー情報を確認してください。');
 const items=v.items.map(x=>{
  const max=x?.kind==='equipment'?6:100;
  if(!x||!validId(x.id)||typeof x.name!=='string'||!x.name.trim()||x.name.length>100||!Object.hasOwn(KINDS,x.kind)||typeof x.owned!=='boolean'||!Number.isInteger(x.level)||x.level<0||x.level>max||!Number.isInteger(x.target)||x.target<0||x.target>max)throw Error('育成データに不正な値があります。');
  return {...(x.kind==='equipment'&&x.instances!==undefined?{instances:validateCopies(x.instances)}:{}),id:x.id,name:x.name,kind:x.kind,owned:x.owned,level:x.level,target:x.target,...(x.skills?{skills:skillLevels(x.skills)}:{}),...(x.targetSkills?{targetSkills:skillLevels(x.targetSkills)}:{})};
 });
 if(new Set(items.map(x=>x.id)).size!==items.length)throw Error('育成データに重複があります。');
 if(!Number.isFinite(Date.parse(v.exportedAt)))throw Error('共有日時が不正です。');
 return {type:v.type,version:v.version,profile:{id:p.id,name:p.name,alliance:String(p.alliance??'').slice(0,60)},exportedAt:v.exportedAt,items,...(v.version>=2?{buildingProgress:validateBuildingProgress(v.buildingProgress||{}),research:validateResearch(v.research)}:{}),...(v.version===3?{memoryInventory:sharedMemories(v.memoryInventory||{}),...(v.savedParties!==undefined?{savedParties:validateParties(v.savedParties)}:{})}:{})};
}
export function buildShare(profile,progress,records,research,buildingProgress={},sharing){return {type:'ember-atlas-progress',version:sharing?3:research?2:1,profile:{id:profile.id,name:profile.name,alliance:profile.alliance},exportedAt:new Date().toISOString(),items:records.filter(r=>progress[r.id]).map(r=>({...((r.kind==='equipment'&&progress[r.id].instances!==undefined)?{instances:validateCopies(progress[r.id].instances,r)}:{}),id:r.id,name:r.name,kind:r.kind,owned:!!progress[r.id].owned,level:progress[r.id].level??0,target:progress[r.id].target??0,...(progress[r.id].skills?{skills:skillLevels(progress[r.id].skills)}:{}),...(progress[r.id].targetSkills?{targetSkills:skillLevels(progress[r.id].targetSkills)}:{})})),...(research?{buildingProgress:validateBuildingProgress(buildingProgress),research:validateResearch(research)}:{}),...(sharing?{memoryInventory:sharedMemories(sharing.memoryInventory||{}),...(sharing.savedParties!==undefined?{savedParties:validateParties(sharing.savedParties)}:{})}:{})};}
export function equipmentTotal(records,selections){
 const values=selections.map(s=>{const r=records.find(r=>r.id===s.id);return r?.grades?.[s.grade-1]??null;});
 return values.some(v=>v===null)?null:Math.round(values.reduce((a,b)=>a+b,0)*10)/10;
}

// Shared copies deliberately omit private labels and notes. Unknown catalogue IDs
// remain inspectable when another participant has newer common data.
export function sharedMemories(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(id=>!/^memory-[\w-]+$/.test(id)))throw Error('共有メモリの形式が不正です。');
 const clean=Object.fromEntries(Object.entries(input).map(([id,copies])=>{if(!Array.isArray(copies))throw Error('共有メモリの形式が不正です。');return [id,copies.map(c=>({...c,label:'',note:''}))];}));
 return validateMemoryInventory(clean,Object.keys(clean).map(id=>({id})));
}
