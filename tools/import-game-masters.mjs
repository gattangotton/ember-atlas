import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {decodeMessagePack} from './read-messagepack.mjs';
import {abilityName} from '../public/ability-names.js';
import {withBuiltinRecord} from '../public/builtin-base.js';
import {validateMechanics} from '../public/mechanics.js';
import {validateResearchSpecs} from '../public/strategy-model.js';
import {octoberEquipment} from './october-equipment.mjs';
import {isGuardianGear} from '../public/raid-data.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=path.resolve(process.argv[2]||path.join(root,'.work/game-master'));
const json=name=>JSON.parse(fs.readFileSync(path.join(root,'public/data',name+'.json')));
const hashes={};
function read(name){const bytes=fs.readFileSync(path.join(input,name));hashes[name]={sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,versionHex:fs.readFileSync(path.join(input,name+'.version')).toString('hex')};return decodeMessagePack(bytes);}
const abilities=new Map(read('Ability').map(a=>[a[0],a]));
const equipment=read('Equipment'),research=read('Research');
const mechanics=json('mechanics'),catalog=json('catalog'),base=json('builtin-base');
const source='PC版ローカルマスター（2026-10-03取得）';
const canonical=s=>abilityName(s).replace(/\s/g,'');
const equipKey=s=>s.normalize('NFKC').replace(/\s/g,'');
// Explicit spelling corrections; the last three also require matching G1 power and all effects.
const aliases={'ママの被り物(NieR)':'ママの被り物(NieRｼﾘｰｽﾞ)','星くずのローブ(SaGa)':'星くずのローブ(SaGaｼﾘｰｽﾞ)','エクスカリバー':'エクスカリバー(FFBE)','ローブオブロード':'ローブオブロード(FFBE)','フィーナの靴':'フィーナの靴(FFBE)','究防のペンダント':'究防のペンダント(FFBE)','エンバースクロー':'エンバースクロ―','コノハナノサクヤヒメ':'コノハナノサクヤビメ','コルデロマスク':'コルテロマスク','コルデロスカーフ':'コルテロスカーフ','コルデロスーツ':'コルテロスーツ','コルデロブーツ':'コルテロブーツ'};
const anchoredAliases=new Set(['コノハナノサクヤヒメ','コルデロマスク','コルデロスカーフ','コルデロスーツ','コルデロブーツ']);
function effect(id,raw){const a=abilities.get(id);if(!a||![0,1].includes(a[1]??0)||!Number.isFinite(raw))throw Error(`Unsupported ability/value ${id}`);return {name:abilityName(a[3]),unit:a[1]===1?'%':/\(秒\)$/.test(a[3])?'秒':'',value:raw/(a[1]===1?100:1)};}
// Preserve the separately audited construction costs and research prerequisites.
const previous=json('game-masters');
const out={...previous,version:1,capturedAt:'2026-10-03',equipmentReviewedAt:'2026-10-05',source,files:{...previous.files,...hashes},extraRecords:[...octoberEquipment],equipment:{},researchSpecs:{},researchMapping:{}};
const existing=[...catalog.records,...mechanics.extraRecords,...octoberEquipment].filter(r=>r.kind==='equipment');
const knownNames=new Set(existing.map(r=>{const current=withBuiltinRecord({...r,...mechanics.additions[r.id]},base);return equipKey(aliases[current.name]||current.name);}));
const slots=['武器','身体','装飾','頭部','脚部'];
for(const e of equipment)if(!knownNames.has(equipKey(e[3])))out.extraRecords.push({id:'equipment-pc-'+e[0],kind:'equipment',name:e[3],slot:slots[e[5]??0],note:e[4]||'',source:{sheet:'PC版 Equipment',row:e[0]}});
const report={equipmentMatched:0,researchMatched:0,numericResearch:0,equipmentUnmatched:[],researchUnmatched:[],nameAliases:[],unitDifferences:[],differences:[],anchors:{researchValues:0,equipmentG1Values:0}};
function compare(kind,id,label,oldValues,newValues){oldValues?.forEach((v,i)=>{if(v==null)return;if(Math.abs(v-newValues[i])>1e-8)report.differences.push({kind,id,label,level:i+1,previous:v,master:newValues[i]});else if(kind==='research')report.anchors.researchValues++;else if(i===0)report.anchors.equipmentG1Values++;});}
for(const record of [...catalog.records,...mechanics.extraRecords,...out.extraRecords].filter(r=>r.kind==='equipment')){
 const current=withBuiltinRecord({...record,...mechanics.additions[record.id]},base);
 const target=aliases[current.name]||current.name;
 const matches=equipment.filter(e=>equipKey(e[3])===equipKey(target));
 if(matches.length!==1){report.equipmentUnmatched.push({id:record.id,name:current.name,count:matches.length});continue;}
 const e=matches[0],grades=e[11];if(![5,6].includes(grades.length))throw Error('Unexpected equipment grade count');
 const ids=grades[0][2].map(a=>a[0]);
 const mainAbilities=ids.map(id=>{const values=grades.map(g=>{const rows=g[2].filter(a=>a[0]===id);if(rows.length!==1)throw Error('Missing/duplicate grade ability');return effect(id,rows[0][1]).value;});while(values.length<6)values.push(null);const {name,unit}=effect(id,0);return {name,unit,values,pattern:''};});
 if(grades.some(g=>g[2].length!==ids.length))throw Error('Grade effects changed');
 if(anchoredAliases.has(current.name)&&(current.power!==grades[0][3]||current.mainAbilities?.length!==mainAbilities.length||!current.mainAbilities.every(old=>mainAbilities.some(a=>canonical(a.name)===canonical(old.name)&&a.unit===old.unit&&a.values[0]===old.values[0]))))throw Error('Alias evidence mismatch '+current.name);
 if(current.name!==e[3])report.nameAliases.push({id:record.id,previous:current.name,master:e[3]});
 const entry={name:e[3],slot:slots[e[5]??0],power:grades[0][3],powerGrades:Array.from({length:6},(_,i)=>grades[i]?.[3]??null),mainAbilities,equipmentEvidence:`PC版ローカルマスター（2026-10-05再照合） / Equipment ID ${e[0]}。％は保存整数÷100、G1～G6の各段階の合計値。`};
 if(!entry.slot)throw Error('Unknown equipment slot '+e[0]);
 entry.raid=e[1]===4&&!isGuardianGear(record)?'yes':'no';
 entry.unlockGrades=[0,1,2].map(i=>e[12]?.[i]?.[1]??null);
 if(JSON.stringify(entry.unlockGrades)!==JSON.stringify([1,5,e[1]===4?6:null]))throw Error('Unexpected sub-slot rules '+e[0]);
 validateMechanics(entry);
 out.equipment[record.id]={...entry,masterId:e[0],abilityIds:ids};
 for(const old of current.mainAbilities||[]){const found=mainAbilities.find(a=>canonical(a.name)===canonical(old.name)&&a.unit===old.unit);if(found)compare('equipment',record.id,old.name,old.values,found.values);}
 report.equipmentMatched++;
}
const groups=['','拠点①','軍事①','討伐①','軍事②','討伐②'];
const lab=n=>n[7][0][0]?.find(c=>c[-1]===2)?.[0];
for(const node of mechanics.research){
 const group=research.find(g=>groups[g[0]]===node.group);
 const matches=group[4].filter(n=>canonical(n[1].split('\n')[0])===canonical(node.name)&&lab(n)===node.lab);
 if(matches.length!==1){report.researchUnmatched.push(node.id);continue;}
 const n=matches[0];if(n[7].length!==node.documentedMax)throw Error('Research level count differs '+node.id);
 const mapping={groupId:group[0],masterId:n[0],name:n[1].split('\n')[0],lab:lab(n)};
 out.researchMapping[node.id]=mapping;report.researchMatched++;
 const rows=n[7].map(l=>(l[2]||[]).filter(e=>e[0]&&e[0][0]!==1));
 if(rows.every(r=>r.length===0)&&/解放/.test(node.name)){mapping.kind='unlock';continue;}
 if(rows.some(r=>r.length!==1||r[0][-1]!==1))throw Error('Unsupported research effects '+node.id);
 const id=rows[0][0][0][0];if(rows.some(r=>r[0][0][0]!==id))throw Error('Research effect changed');
 const {name,unit}=effect(id,0),values=rows.map(r=>effect(id,r[0][0][1]).value);
 const spec={ability:name,unit,values,requirementsKnown:false,requirements:[],note:`${source} / Research ${group[0]}:${n[0]} / Ability ${id}。各Lvの合計値。`};
 out.researchSpecs[node.id]=spec;mapping.kind='ability';mapping.abilityId=id;report.numericResearch++;
 const previous=base.researchSpecs?.[node.id];if(previous&&canonical(previous.ability)===canonical(name)){
  if(previous.unit===unit)compare('research',node.id,name,previous.values,values);
  else report.unitDifferences.push({id:node.id,name,previousUnit:previous.unit,masterUnit:unit,previousValues:previous.values,masterValues:values});
 }
}
validateResearchSpecs(out.researchSpecs,mechanics.research);
if(report.equipmentUnmatched.length||report.researchUnmatched.length)throw Error('Unmatched records: '+JSON.stringify(report));
if(report.equipmentMatched!==equipment.length||new Set(Object.values(out.equipment).map(e=>e.masterId)).size!==equipment.length)throw Error('Equipment coverage is incomplete or duplicated');
out.summary={...previous.summary,equipment:report.equipmentMatched,research:report.researchMatched,numericResearch:report.numericResearch,unlockResearch:report.researchMatched-report.numericResearch};
fs.writeFileSync(path.join(root,'public/data/game-masters.json'),JSON.stringify(out,null,2)+'\n');
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
fs.writeFileSync(path.join(root,'artifacts/game-master-import-report.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...out.summary,anchors:report.anchors,differences:report.differences.length}));


