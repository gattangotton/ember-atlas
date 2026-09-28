import {equipmentEvidence} from './equipment-evidence.mjs';
import {equipmentG1Evidence,equipmentNameKey} from './equipment-g1-sep28.mjs';
import {effectKey} from '../public/equipment-model.js';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {inferCharge,coreEffects} from '../public/mechanics.js';
const root=new URL('../public/data/',import.meta.url);
const catalog=JSON.parse(await readFile(new URL('catalog.json',root),'utf8'));
const sheets=JSON.parse(await readFile(new URL('sheets.json',root),'utf8'));
const additions={},extraRecords=[];
const addEquipment=(name,slot,source)=>{const r={id:'equipment-'+createHash('sha256').update(name).digest('hex').slice(0,14),kind:'equipment',name,slot,grades:Array(6).fill(null),effect:'',note:'',source};extraRecords.push(r);return r;};
for(const r of catalog.records.filter(r=>r.kind==='characters')) additions[r.id]={skills:{charge:inferCharge(r.charge)},coreEffects:coreEffects(r)};
const effect=(name,values,unit='%')=>({name,values,unit,pattern:''});
const last=(n,v)=>Array.from({length:n},(_,i)=>i===n-1?v:null);
const skillEvidence=[['レイン',460,'single','none','none',[effect('不浄への威力',last(7,2100),''),effect('不浄以外への威力',last(7,1400),'')]],['2B',470,'single','none','buff',[effect('威力',last(7,1400),''),effect('自分の与ダメージ（2秒）',last(7,42))]],['ガイア',510,'single','none','debuff',[effect('威力',last(7,1850),''),effect('敵の被ダメージ（2秒）',last(7,35))]],['【蒼炎】ニュクス',560,'multiple','fan','debuff',[effect('威力',last(7,1250),''),effect('敵の被ダメージ（2秒）',last(7,21))]]];
for(const [name,time,target,shape,extra,effects] of skillEvidence){const r=catalog.records.find(r=>r.kind==='characters'&&r.name.normalize('NFKC')===name.normalize('NFKC'));if(r)additions[r.id].skills.charge={target,shape,extra,effects,note:`プレイ動画 ${Math.floor(time/60)}:${String(time%60).padStart(2,'0')} の効果表示Lv.7から確認。途中レベルは未確認。`};}
// Screenshot evidence: combat states are independent of skill upgrade levels.
for(const [name,skillName,powers,rule,source] of [
 ['ステラ','ギャラクティックシュート',[1400,2800,4200],'発動回数に応じて最大2段階まで強化。解除条件は未確認。','IMG_5703.PNG'],
 ['エプレ','チョキチョキする……？',[1400,2800],'通常発動で強化状態になり、次回のチャージが強化されます。強化発動後は強化状態が解除されます。','IMG_5704.PNG / IMG_5705.PNG']
]){const r=catalog.records.find(r=>r.kind==='characters'&&r.name===name);additions[r.id].skills.charge={...inferCharge('単体'),name:skillName,stateMode:'enhancement',stateRule:rule,effects:[effect('威力',last(7,powers[0]),'')],variants:powers.map((power,i)=>({name:i?`${i}段階強化`:'通常',condition:i?'チャージ強化状態':'強化前',effects:[effect('威力',last(7,power),'')]})),note:`${source}の育成Lv7表示から確認。育成Lv1～6は未確認。`};}
// Video confirms these main abilities at G1. Legacy material bonuses stay separate.
const equipEvidence=[['セルヴァンス',90,[['対妖魔攻撃力',113],['風属性リーダー攻撃力',26.5],['対妖魔素材倍化率',7.5]]],['エレメンタルヘルム',330,[['騎兵攻撃力',56.5],['光属性リーダー攻撃力',26.5],['対施設攻撃力',37.5]]],['エレメンタルカリガ',390,[['集結部隊行軍速度',15],['集結部隊時攻撃力',52.5],['攻撃力',19]]]];
for(const [name,time,values] of equipEvidence){const r=catalog.records.find(r=>r.kind==='equipment'&&r.name===name)||addEquipment(name,name.includes('ヘルム')?'頭部':'脚部',{sheet:'プレイ動画',row:time});if(r)additions[r.id]={mainAbilities:values.map(([n,v])=>effect(n,[v,null,null,null,null,null])),note:`${r.note||''} 動画${time}秒でG1メインアビリティを確認。`,raid:'unknown'};}
// Preserve the source's abbreviated equipment notes without treating them as grade-specific data.
const equipmentNotes=[];
for(const sheet of ['レイド装備','翼・蟹・眷属装備'])for(const row of sheets[sheet])for(const cols of [['A','B','C','D'],['F','G','H','I'],['K','L','M','N']]){const name=row.cells[cols[0]],notes=cols.slice(1).map(k=>row.cells[k]).filter(v=>typeof v==='string'&&/\d/.test(v));if(typeof name==='string'&&notes.length&&!['骸','オルム'].includes(name))equipmentNotes.push({name,notes,raid:sheet==='レイド装備',source:{sheet,row:row.row}});}
// The raid sheet confirms membership, but does not identify a grade for its numeric notes.
const key=s=>s.normalize('NFKC').replace(/[()（）・\s]/g,'').replace('FFBE','');
for(const note of equipmentNotes){let r=[...catalog.records,...extraRecords].find(r=>r.kind==='equipment'&&key(r.name)===key(note.name));if(!r&&note.raid)r=addEquipment(note.name.normalize('NFKC'),'未確認',note.source);if(r&&note.raid)additions[r.id]={...additions[r.id],raid:'yes',unlockGrades:[1,null,6]};}
const sword=[...catalog.records,...extraRecords].find(r=>r.name==='エクスカリバー');
if(sword){sword.slot='武器';additions[sword.id]={...additions[sword.id],mainAbilities:[['攻撃力',75],['光属性リーダー攻撃力',53],['対宝庫攻撃力',75]].map(([name,v])=>effect(name,[null,null,null,null,v,null])),note:'プレイ動画2:30のG5レシピで確認。'};}
const sel=catalog.records.find(r=>r.name==='セルヴァンス');if(sel)additions[sel.id].mainAbilities[2].values=[...sel.grades];
// List observations: only verified names/power; numeric values retain their exact observed grade.
const equipmentKey=s=>key(s).replace(/シリーズ/g,'');
for(const e of equipmentEvidence){
 let r=[...catalog.records,...extraRecords].find(r=>r.kind==='equipment'&&equipmentKey(r.name)===equipmentKey(e.name));
 if(!r)r=addEquipment(e.name,e.slot,{sheet:'プレイ動画',row:e.time});
 const previous=additions[r.id]||{},known=previous.mainAbilities||[];
 additions[r.id]={...previous,name:e.name,slot:e.slot,power:e.power,powerGrades:[e.power,null,null,null,null,null],equipmentEvidence:`DPTW4024.MP4 ${e.time}秒：G1一覧の名称・パワー・メイン効果を確認。`,mainAbilities:e.effects.map(name=>({...effect(name,Array(6).fill(null)),...known.find(x=>effectKey(x.name)===effectKey(name)),name}))};
}
for(const [name,vals] of [['ヨルムンアーマー',[10.5,22.5,64]],['神木のネックレス',[45.5,32,45.5]]]){const r=[...catalog.records,...extraRecords].find(x=>x.name===name);additions[r.id].mainAbilities.forEach((e,i)=>e.values[0]=vals[i]);}
const exc=[...catalog.records,...extraRecords].find(r=>equipmentKey(r.name)===equipmentKey('エクスカリバー(FFBE)'));
if(exc){const a=additions[exc.id];a.powerGrades=[12000,null,null,null,24000,27000];for(const [name,g5,g6] of [['攻撃力',75,84.3],['光属性リーダー攻撃力',53,59.6],['対宝庫攻撃力',75,84.3]]){const e=a.mainAbilities.find(e=>e.name===name);e.values[4]=g5;e.values[5]=g6;}a.equipmentEvidence+=' G5：150秒、G6：290秒でパワー・数値を確認。';}
// Later G1 observations correct names without changing IDs or personal progress keys.
for(const e of equipmentG1Evidence){
 let r=[...catalog.records,...extraRecords].find(r=>r.kind==='equipment'&&equipmentNameKey(additions[r.id]?.name||r.name)===equipmentNameKey(e.name));
 if(!r)r=addEquipment(e.name,e.slot,{sheet:e.video,row:e.time});
 const previous=additions[r.id]||{},pg=[...(previous.powerGrades||Array(6).fill(null))];pg[0]=e.power;
 additions[r.id]={...previous,name:e.name,slot:e.slot,power:e.power,powerGrades:pg,portrait:e.portrait,
  mainAbilities:e.mainAbilities.map(a=>{const old=previous.mainAbilities?.find(x=>effectKey(x.name)===effectKey(a.name));return {...a,values:[a.values[0],...(old?.values?.slice(1)||Array(5).fill(null))]};}),
  equipmentEvidence:`${e.video} ${e.time}秒：画像・G1パワー・全メインアビリティ数値を確認。${previous.equipmentEvidence?' 以前の確認記録：'+previous.equipmentEvidence:''}`};
}
let portraits={};try{portraits=JSON.parse(await readFile(new URL('portraits.json',root),'utf8'));}catch{}
for(const [id,p] of Object.entries(portraits))additions[id]={...additions[id],portrait:p.path};
const research=[];
const groups=['拠点①','軍事①','討伐①','軍事②','討伐②'];
for(const [g,sheet] of groups.entries())for(const row of sheets[sheet]){const c=row.cells;if(typeof c.B!=='number'||typeof c.C!=='string')continue;research.push({id:`research-${g}-${row.row}`,group:sheet,name:c.C,lab:c.B,source:{sheet,row:row.row},levels:[['E','F','G','H','I'],['K','L','M','N','O'],['Q','R','S','T','U'],['W','X','Y','Z','AA'],['AC','AD','AE','AF','AG']].map(cols=>cols.map(k=>c[k]??null)),parents:[],linksConfirmed:false});}
for(const n of research)n.documentedMax=Math.max(1,...n.levels.map((vs,i)=>vs.some(v=>v!==null)?i+1:0));
// Visible connections at 10:30. Unseen connections deliberately stay unset.
for(const [row,parents] of [[4,[3]],[5,[3]],[6,[3]],[7,[4,5,6]],[14,[13]],[15,[13]],[16,[13]],[17,[14,15]],[18,[15,16]]]){const n=research.find(n=>n.id===`research-1-${row}`);n.parents=parents.map(r=>`research-1-${r}`);n.linksConfirmed=true;}
await writeFile(new URL('mechanics.json',root),JSON.stringify({version:1,additions,extraRecords,equipmentNotes,research,patterns:[],evidence:'元Excelと DPTW4024.MP4。空欄は未確認。'},null,2));
console.log({research:research.length,equipmentNotes:equipmentNotes.length,characters:Object.keys(additions).length});
