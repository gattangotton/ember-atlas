import {hasThirdSubSlot} from './raid-data.js';
// Domain rules. Unknown source values remain null, never an inferred zero.
export const SKILLS={charge:{label:'チャージ',max:7},active:{label:'アクティブ',max:5},trigger1:{label:'トリガー1',max:7},trigger2:{label:'トリガー2',max:7},trigger3:{label:'トリガー3',max:7}};
export const ROMAN=['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ'];
export const CORE_THRESHOLDS=[0,10,15,20,25,30];
export function skillLevels(v={}){const out={};for(const [k,s] of Object.entries(SKILLS)){const n=v[k]??0;if(!Number.isInteger(n)||n<0||n>s.max)throw Error(`${s.label}は0～${s.max}で入力してください。`);out[k]=n;}return out;}
export function coreThresholds(r={}){return /[34]/.test(String(r.rarity??r).normalize("NFKC"))?[10,15,20,25,30]:CORE_THRESHOLDS;}
export function coreUnlockText(r){return coreThresholds(r).map((n,i)=>ROMAN[i]+"："+(n?"合計"+n:"獲得時")).join(" ／ ");}
export function coreStage(owned,skills={},r={}){if(!owned)return 0;const total=Object.values(skillLevels(skills)).reduce((a,b)=>a+b,0);return coreThresholds(r).filter(n=>total>=n).length;}
export function series(values,length){if(!Array.isArray(values)||values.length!==length||values.some(v=>v!==null&&(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>1e7)))throw Error(`${length}段階の数値を確認してください。`);return [...values];}
export function parseSeries(text,length){const parts=text.split(/[,、]/).map(s=>s.trim());return series(parts.map(s=>s===''||s==='?'?null:Number(s)),length);}
const short=(v,max=200)=>{if(typeof v!=='string'||v.length>max)throw Error('文字数・形式を確認してください。');return v;};
export function validateMechanics(v){
 const out={};
 if(v.power!==undefined){if(v.power!==null&&(!Number.isInteger(v.power)||v.power<0||v.power>1e9))throw Error('パワーは0以上の整数です。');out.power=v.power;}
 if(v.powerGrades!==undefined){if(!Array.isArray(v.powerGrades)||v.powerGrades.length!==6||v.powerGrades.some(n=>n!==null&&(!Number.isInteger(n)||n<0||n>1e9)))throw Error('グレード別パワーは6段階の整数です。');out.powerGrades=[...v.powerGrades];}
 if(v.equipmentEvidence!==undefined)out.equipmentEvidence=short(v.equipmentEvidence,2000);
 if(v.portrait!==undefined){if(typeof v.portrait!=='string'||v.portrait.length>180000||!(/^(data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+|assets\/portraits\/[a-zA-Z0-9_-]+\.jpg)$/.test(v.portrait)||v.portrait===''))throw Error('画像は圧縮した画像データにしてください。');out.portrait=v.portrait;}
 if(v.skills!==undefined){out.skills={};for(const [k,s] of Object.entries(SKILLS)){const a=v.skills[k];if(!a)continue;if(!['unknown','single','multiple'].includes(a.target)||!['unknown','none','fan','circle','rectangle'].includes(a.shape)||!['unknown','none','buff','debuff','both'].includes(a.extra))throw Error('スキルの対象・範囲・追加効果を確認してください。');out.skills[k]={target:a.target,shape:a.shape,extra:a.extra,effects:effects(a.effects,s.max),note:short(a.note??'',1000),...(a.name!==undefined?{name:short(a.name)}:{}),...(a.stateMode!==undefined?{stateMode:short(a.stateMode,100)}:{}),...(a.stateRule!==undefined?{stateRule:short(a.stateRule,2000)}:{}),...(a.variants!==undefined?{variants:variants(a.variants,s.max)}:{})};}}
 if(v.coreEffects!==undefined)out.coreEffects=effects(v.coreEffects,6);
 if(v.mainAbilities!==undefined)out.mainAbilities=effects(v.mainAbilities,6);
 if(v.raid!==undefined){if(!['yes','no','unknown'].includes(v.raid))throw Error('レイド装備の分類が不正です。');out.raid=v.raid;}
 if(v.unlockGrades!==undefined){if(!Array.isArray(v.unlockGrades)||v.unlockGrades.length!==3||v.unlockGrades.some(n=>n!==null&&(!Number.isInteger(n)||n<1||n>6)))throw Error('解放グレードは1～6、または未確認にしてください。');out.unlockGrades=[...v.unlockGrades];}
 if(v.subCandidates!==undefined){if(!Array.isArray(v.subCandidates)||v.subCandidates.length>300)throw Error('候補は300件以内です。');out.subCandidates=v.subCandidates.map(c=>{if(![1,2,3].includes(c.slot)||c.value!==null&&(!Number.isFinite(c.value)||Math.abs(c.value)>1e7)||c.probability!==null&&(!Number.isFinite(c.probability)||c.probability<0||c.probability>100))throw Error('候補の枠・効果値・確率を確認してください。');return {slot:c.slot,name:short(c.name),value:c.value,probability:c.probability};});for(const slot of [1,2,3])if(out.subCandidates.filter(c=>c.slot===slot).reduce((a,c)=>a+(c.probability??0),0)>100.00001)throw Error('同じ枠の抽選確率の合計が100%を超えています。');}
 return out;
}
function effects(v,length){if(!Array.isArray(v)||v.length>20)throw Error('効果は20件以内です。');return v.map(e=>({name:short(e.name),unit:short(e.unit??'%',20),values:series(e.values,length),pattern:short(e.pattern??'',100)}));}
export function inferCharge(text=''){return {target:/単体/.test(text)?'single':/扇形|円形/.test(text)?'multiple':'unknown',shape:/扇形/.test(text)?'fan':/円形/.test(text)?'circle':/単体/.test(text)?'none':'unknown',extra:'unknown',effects:[],note:''};}
export function coreEffects(r){const count=coreThresholds(r).length;if(r.coreEffects)return r.coreEffects.map(e=>{const values=[...e.values];if(count===5&&values.slice(0,5).every(v=>v===null)&&values[5]!==null){values[4]=values[5];values[5]=null;}return {...e,values};});const names=String(r.ability||'未登録').split('/'),maxima=String(r.maximum||'').normalize('NFKC').split('/');return names.map((name,i)=>({name,unit:'%',values:Array.from({length:6},(_,j)=>j===count-1&&/^\d+(\.\d+)?%$/.test(maxima[i]??'')?Number(maxima[i].slice(0,-1)):null),pattern:''}));}
export function groupCore(records){const groups=new Map();for(const r of records.filter(r=>r.kind==='characters'))for(const effect of coreEffects(r)){const name=effect.name.replace('建築資源効率','建設資源効率');if(!groups.has(name))groups.set(name,[]);groups.get(name).push({character:r,effect});}return [...groups].sort(([a],[b])=>a.localeCompare(b,'ja'));}
export function unlockedSlots(r,grade){return [grade>=1,grade>=5,grade>=6&&hasThirdSubSlot(r)];}
export function validateResearch(v={}){const out={};if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length>2000)throw Error('研究記録が不正です。');for(const [id,n] of Object.entries(v)){if(!/^research-[a-z0-9-]+$/.test(id)||!Number.isInteger(n)||n<0||n>5)throw Error('研究レベルは0～5です。');out[id]=n;}return out;}
export function validatePatterns(v=[]){if(!Array.isArray(v)||v.length>100)throw Error('パターンは100件以内です。');return v.map(p=>{if(![5,6,7].includes(p.values?.length))throw Error('パターンは5・6・7段階で登録してください。');return {name:short(p.name),values:series(p.values,p.values.length)};});}

function variants(v,length){if(!Array.isArray(v)||v.length>12)throw Error('発動状態は12件以内です。');return v.map(a=>({name:short(a.name),condition:short(a.condition??'',1000),effects:effects(a.effects??[],length)}));}
