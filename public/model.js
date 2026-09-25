export const STORE_KEY='ember-atlas-v1';
export const KINDS={characters:'エンバース',equipment:'装備',abilities:'コアアビリティ'};
const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
export const normalize=s=>String(s??'').normalize('NFKC').toLocaleLowerCase('ja');
export function filterRecords(records,{kind,query='',element='',troop='',owned=false,progress={}}={}) {
 return records.filter(r=>(!kind||r.kind===kind)&&(!element||r.element===element)&&(!troop||r.troop===troop||r.slot===troop)&&(!owned||progress[r.id]?.owned)&&normalize(Object.values(r).filter(v=>typeof v==='string').join(' ')).includes(normalize(query)));
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
 result.name=result.name.trim();return result;
}
export function validateShare(v){
 if(v?.type!=='ember-atlas-progress'||v.version!==1||!v.profile||!Array.isArray(v.items)||v.items.length>5000)throw Error('育成状況ファイルの形式が違います。');
 const p=v.profile;
 if(!validId(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>60)throw Error('プレイヤー情報を確認してください。');
 const items=v.items.map(x=>{
  const max=x?.kind==='equipment'?6:100;
  if(!x||!validId(x.id)||typeof x.name!=='string'||!x.name.trim()||x.name.length>100||!Object.hasOwn(KINDS,x.kind)||typeof x.owned!=='boolean'||!Number.isInteger(x.level)||x.level<0||x.level>max||!Number.isInteger(x.target)||x.target<0||x.target>max)throw Error('育成データに不正な値があります。');
  return {id:x.id,name:x.name,kind:x.kind,owned:x.owned,level:x.level,target:x.target};
 });
 if(new Set(items.map(x=>x.id)).size!==items.length)throw Error('育成データに重複があります。');
 if(!Number.isFinite(Date.parse(v.exportedAt)))throw Error('共有日時が不正です。');
 return {type:v.type,version:1,profile:{id:p.id,name:p.name,alliance:String(p.alliance??'').slice(0,60)},exportedAt:v.exportedAt,items};
}
export function buildShare(profile,progress,records){return {type:'ember-atlas-progress',version:1,profile:{id:profile.id,name:profile.name,alliance:profile.alliance},exportedAt:new Date().toISOString(),items:records.filter(r=>progress[r.id]).map(r=>({id:r.id,name:r.name,kind:r.kind,owned:!!progress[r.id].owned,level:progress[r.id].level??0,target:progress[r.id].target??0}))};}
export function equipmentTotal(records,selections){
 const values=selections.map(s=>{const r=records.find(r=>r.id===s.id);return r?.grades?.[s.grade-1]??null;});
 return values.some(v=>v===null)?null:Math.round(values.reduce((a,b)=>a+b,0)*10)/10;
}
