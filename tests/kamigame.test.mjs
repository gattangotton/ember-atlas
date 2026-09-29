import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {checkSourceDatabase,enrichFromSource,reusablePattern,sourceSkillSpec} from '../public/kamigame-model.js';
import {validateRecord} from '../public/model.js';
const data=JSON.parse(await readFile(new URL('../public/data/kamigame-embers.json',import.meta.url),'utf8'));
const catalog=JSON.parse(await readFile(new URL('../public/data/catalog.json',import.meta.url),'utf8'));
const mechanics=JSON.parse(await readFile(new URL('../public/data/mechanics.json',import.meta.url),'utf8'));
const sources=name=>data.characters.find(c=>c.databaseName===name);

test('All 55 listed articles map uniquely to the existing catalogue and all 350 icons are local',async()=>{
 checkSourceDatabase(data);
 assert.equal(data.characters.length,55);assert.equal(data.summary.matched,55);assert.equal(data.summary.skills,275);
 const icons=new Set();
 for(const c of data.characters){
  const r=catalog.records.find(r=>r.id===c.recordId);assert.ok(r);assert.equal(r.name,c.databaseName);
  assert.equal(Object.keys(c.skills).length,5);assert.ok([5,6].includes(c.coreRows.length));
  for(const icon of [...Object.values(c.icons),...Object.values(c.skills).map(s=>s.icon)].filter(Boolean))icons.add(icon.path);
 }
 assert.equal(icons.size,350);await Promise.all([...icons].map(p=>access(new URL('../public/'+p,import.meta.url))));
 assert.equal(sources('水着・紫津乃').name,'紫津乃[炎天]');assert.equal(sources('【蒼炎】ニュクス').name,'ニュクス[蒼炎]');
 assert.equal(data.characters.filter(c=>c.coreRows.length===5).length,16); // Retain the older five-row source layout without inventing row VI.
});
test('Skill level and amplification level remain independent; fractional and signed values retain units',()=>{
 const nyx=sources('ニュクス');
 assert.deepEqual(nyx.skills.charge.effects[0].values,[800,900,1000,1100,1200,1300,1400]);
 const active=sourceSkillSpec(nyx.skills.active,nyx.url);
 assert.equal(active.variants.length,3);assert.deepEqual(active.variants[0].effects[0].values,[1000,1250,1500,1750,2000]);
 assert.equal(active.variants[2].effects[0].values[3],7825); // Source's irregular value, never silently corrected to 7875.
 const erebos=sources('エレボス').skills.charge.effects.find(e=>e.name==='自分の被ダメージ');
 assert.equal(erebos.values[0],-4.5);assert.equal(erebos.unit,'%');
 const duration=sources('エレボス').skills.charge.effects.find(e=>e.name==='自分の被ダメージ / 持続時間');
 assert.equal(duration.unit,'秒');assert.deepEqual(duration.values,[4,4,4,4,4,4,4]);
});
test('Slash-separated damage and power fields are separate complete curves',()=>{
 const s=sources('ライラ').skills.active;
 assert.deepEqual(s.effects.find(e=>e.name==='増幅Lv.1威力').values,[1000,1250,1500,1750,2000]);
 assert.deepEqual(s.effects.find(e=>e.name==='増幅Lv.1与ダメージ').values,[-5,-6.25,-7.5,-8.75,-10]);
 assert.ok(s.effects.every(e=>!e.name.includes(':')));
 const fio=sources('フィオ').skills.active;
 assert.ok(fio.effects.some(e=>e.name.startsWith('妖魔への威力 / 増幅Lv.1')));
});
test('Observed patterns have at least two characters and every cited series supports the complete pattern',()=>{
 const byUrl=new Map(data.characters.map(c=>[c.url,c]));
 for(const p of data.patterns){
  assert.ok(new Set(p.references.map(r=>r.character)).size>=2);
  for(const r of p.references){
   const e=byUrl.get(r.sourceUrl).skills[r.skill].effects[r.effectIndex];
   assert.ok(!e.review);assert.ok(e.values.every(v=>v!==null));assert.equal(e.unit,p.unit);
   if(p.kind==='exact')assert.deepEqual(e.values,p.values);
   else for(let i=0;i<e.values.length;i++){const [a,b='1']=p.values[i].split('/').map(Number);assert.ok(Math.abs(e.values[i]/e.values[0]-a/b)<1e-10);}
  }
  if(p.kind==='exact')assert.deepEqual(reusablePattern(p).values,p.values);
  else assert.throws(()=>reusablePattern(p));
 }
});
test('Source enrichment fills empty skills, preserves verified data and explicit player overrides, and leaves core semantics intact',()=>{
 for(const r of catalog.records.filter(r=>r.kind==='characters')){
  const base={...r,...mechanics.additions[r.id]},c=data.characters.find(c=>c.recordId===r.id);
  const enriched=enrichFromSource(base,undefined,c);validateRecord(enriched);
  if(base.coreEffects)for(let i=0;i<base.coreEffects.length;i++)base.coreEffects[i].values.forEach((v,j)=>{if(v!==null)assert.equal(enriched.coreEffects[i].values[j],v);});assert.equal(enriched.portrait,base.portrait);
  assert.ok(!JSON.stringify(enriched).includes('siteEvidence'));
 }
 const c=sources('ニュクス'),r=catalog.records.find(r=>r.id===c.recordId),original={...r,...mechanics.additions[r.id]};
 const custom={skills:{charge:{name:'個人の確認値',effects:[{name:'威力',unit:'',values:[99,null,null,null,null,null,null]}]}}};
 assert.deepEqual(enrichFromSource(original,undefined,c).coreEffects[0].values,[5,10,15,25,35,45]);
 const customCore={coreEffects:[{name:'個人値',unit:'%',values:[1,2,3,4,5,6]}]};
 assert.deepEqual(enrichFromSource(original,customCore,c).coreEffects,customCore.coreEffects);
 const old=sources('エレボス'),oldBase=catalog.records.find(r=>r.id===old.recordId);
 assert.deepEqual(enrichFromSource(oldBase,undefined,old).coreEffects[0].values,[null,null,null,null,null,80]);
 assert.deepEqual(enrichFromSource(original,custom,c).skills,custom.skills);
 const verified={...original,skills:{...original.skills,charge:{...original.skills.charge,effects:[{name:'威力',unit:'',values:[88,null,null,null,null,null,null]}]}}};
 assert.equal(enrichFromSource(verified,undefined,c).skills.charge.effects[0].values[0],88);
 const ether=sources('アイテール').skills.charge;
 assert.equal(ether.effects.find(e=>e.name==='与ダメージ').values[4],null); // Ambiguous duplicate stays unknown.
});
