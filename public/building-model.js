export const formatResource=v=>v===null||v===undefined?'未確認':Math.abs(v)>=1e6?(v/1e6).toLocaleString('en-US',{maximumFractionDigits:6,useGrouping:false})+'M':Math.abs(v)>=1e3?(v/1e3).toLocaleString('en-US',{maximumFractionDigits:3,useGrouping:false})+'K':v.toLocaleString('en-US',{maximumFractionDigits:3});
export function formatDuration(seconds){if(seconds===null||seconds===undefined)return '未確認';let n=Math.round(seconds);const days=Math.floor(n/86400);n%=86400;const hours=Math.floor(n/3600);n%=3600;const minutes=Math.floor(n/60);n%=60;return [[days,'日'],[hours,'時間'],[minutes,'分'],[n,'秒']].filter(([v])=>v).map(([v,u])=>v+u).join(' ')||'0秒';}
export function validateBuildingRules(input={},buildings=[]){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length>1000)throw Error('施設条件の形式が違います。');
 const result={},byId=new Map(buildings.map(b=>[b.id,b]));
 for(const [key,value] of Object.entries(input)){
  const match=key.match(/^(building-\d+):(\d+)$/),b=match&&byId.get(match[1]),lv=match&&+match[2];
  if(!b?.levels.some(l=>l.level===lv)||!value||!['unknown','known','none'].includes(value.status)||!Array.isArray(value.requirements)||value.requirements.length>30||typeof value.note!=='string'||value.note.length>1500)throw Error('施設・レベル・前提条件を確認してください。');
  const seen=new Set(),requirements=value.requirements.map(r=>{const target=byId.get(r.buildingId);if(!target?.levels.some(l=>l.level===r.level)||seen.has(r.buildingId)||(r.buildingId===b.id&&r.level>=lv))throw Error('前提施設のレベルや重複を確認してください。');seen.add(r.buildingId);return {buildingId:r.buildingId,level:r.level};});
  if(value.status==='known'&&!requirements.length||value.status!=='known'&&requirements.length)throw Error('前提条件の確認状態と施設の登録内容を一致させてください。');
  result[key]={status:value.status,requirements,note:value.note};
 }
 const visiting=new Set(),done=new Set();function visit(key){if(visiting.has(key))throw Error('施設の前提条件が循環しています。');if(done.has(key))return;visiting.add(key);for(const r of result[key]?.requirements||[])visit(r.buildingId+':'+r.level);visiting.delete(key);done.add(key);}Object.keys(result).forEach(visit);
 return result;
}
