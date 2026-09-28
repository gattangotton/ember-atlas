import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {aggregateAbilities,diagnoseAbility,numericCost,planResearch,validatePlan,validateResearchSpecs,validateAbilityUser,researchSpec,abilityKey} from '../public/strategy-model.js';
const node=(id,levels=[[100,200,300,400,1000],[200,400,600,800,2000]])=>({id,name:'研究速度',group:'拠点①',lab:1,documentedMax:levels.length,levels,parents:[],source:{sheet:'test',row:1}});
const ns=[node('research-a'),node('research-b'),node('research-c')];
const sp=(requirements=[],values=[5,10])=>({ability:'研究速度',unit:'%',values,requirementsKnown:true,requirements,note:''});
test('Unacquired sources contribute zero; acquired unknowns remain explicit; only current cumulative level is summed',()=>{
 const records=[{id:'char',kind:'characters',name:'キャラ',coreEffects:[{name:'研究速度',unit:'%',values:[1,2,3,4,5,6]}]}];
 let r=aggregateAbilities({records,nodes:ns,state:{researchSpecs:{'research-a':sp()}}}).find(g=>g.name==='研究速度');assert.equal(r.total,0);assert.equal(r.unknown,0);assert.equal(r.sources.length,4);
 r=aggregateAbilities({records,nodes:ns,state:{research:{'research-a':2,'research-b':1},researchSpecs:{'research-a':sp()},progress:{char:{owned:true,skills:{}}},abilityUser:{extras:[{id:'extra-1',label:'施設',ability:'研究速度',unit:'%',kind:'施設',value:20,acquired:true}]}}}).find(g=>g.name==='研究速度');assert.equal(r.total,31);assert.equal(r.unknown,1);assert.equal(r.sources.find(s=>s.id==='research-a').value,10);
});
test('Diagnosis compares category subtotals and never declares completeness for acquired unknown values',()=>{
 const g={name:'研究速度',unit:'%',total:10,unknown:1,sources:[{kind:'研究',label:'研究A',acquired:true,value:10},{kind:'施設',label:'施設B',value:0,available:5,acquired:false}],manual:{total:15,breakdown:{研究:10,施設:5}}};assert.ok(diagnoseAbility(g).some(s=>s.includes('施設：')));assert.ok(diagnoseAbility(g).some(s=>s.includes('断定できません')));assert.ok(diagnoseAbility({...g,manual:{total:10,breakdown:{}}}).some(s=>s.includes('未確定')));
});
test('Research resource parsing preserves unknowns and normalizes workbook k/M units',()=>{assert.equal(numericCost('1.4k'),1400);assert.equal(numericCost('2.1M'),2100000);assert.equal(numericCost('1,200'),1200);assert.equal(numericCost(null),null);assert.equal(numericCost('-'),null);assert.equal(numericCost('#VALUE!'),null);assert.equal(numericCost(0),0);assert.equal(numericCost('1.2e4'),null);});
test('Plan deduplicates shared prerequisites, skips completed levels, and applies worksheet time order and stock-only item boost',()=>{
 const specs={'research-a':sp([{id:'research-b',level:2},{id:'research-c',level:1}]),'research-b':sp([{id:'research-c',level:2}]),'research-c':sp()};
 const r=planResearch(ns,{'research-b':1},specs,{targetId:'research-a',targetLevel:2,drop:10,speed:90,efficiency:25,fixed:100,alchemist:true,resourceItem:true,stock:[100,0,0,0]});assert.equal(r.rows.length,5);assert.equal(r.rows.filter(r=>r.id==='research-c').length,2);assert.equal(r.rows[0].seconds,Math.ceil(1000/2/1.1-100));assert.deepEqual(r.rows[0].resources,[80,160,240,320]);assert.equal(r.effective[0],110);assert.equal(r.totals[0],640);assert.equal(r.shortage[0],530);assert.equal(r.complete,true);
 const off=planResearch(ns,{},specs,{targetId:'research-a',targetLevel:1,includeParents:false,stock:[100,0,0,0]});assert.equal(off.totals[0],100);assert.equal(off.effective[0],100);assert.equal(off.shortage[0],0);
});
test('Unknown prerequisite chains and missing costs produce an incomplete subtotal, never a false total',()=>{
 const r=planResearch([node('research-a',[[null,0,0,0,null]])],{}, {},{targetId:'research-a',targetLevel:1});assert.equal(r.complete,false);assert.equal(r.missing[0],1);assert.equal(r.shortage[0],null);assert.equal(r.warnings.length,1);
 const done=planResearch(ns,{'research-a':2},{},{targetId:'research-a',targetLevel:1});assert.equal(done.rows.length,0);assert.equal(done.totals[4],0);
});
test('Strategy persistence rejects cycles, out-of-range effects, malformed source records and excessive droplet rates',()=>{
 assert.throws(()=>validatePlan({targetId:'research-a',drop:11},ns));assert.throws(()=>validatePlan({targetId:'research-a',targetLevel:3},ns));assert.throws(()=>validatePlan({targetId:'research-a',stock:[-1,0,0,0]},ns));
 assert.throws(()=>validateResearchSpecs({'research-a':sp([{id:'research-b',level:1}]),'research-b':sp([{id:'research-a',level:1}])},ns));assert.throws(()=>validateResearchSpecs({'research-a':sp([],[-1,2])},ns));
 const user={manual:{'研究速度|%':{total:0,breakdown:{研究:0},note:''}},extras:[{id:'extra-test',label:'施設Lv1',ability:'研究速度',kind:'施設',unit:'%',acquired:false,value:12,note:''}]};assert.deepEqual(validateAbilityUser(JSON.parse(JSON.stringify(user))),user);assert.throws(()=>validateAbilityUser({manual:{'研究速度|%':{total:-1}}}));assert.throws(()=>validateAbilityUser({extras:[{...user.extras[0],acquired:'yes'}]}));
});
test('Video reference values remain references and do not silently become personal progress or source effects',()=>{
 const evidence=JSON.parse(readFileSync(new URL('../public/data/strategy-evidence.json',import.meta.url)));assert.equal(evidence.sources.length,6);const dark=evidence.abilities.find(a=>a.name==='闇属性リーダー攻撃力');assert.equal(dark.reference.total,260);assert.deepEqual(dark.reference.breakdown,{施設:55,研究:30,コアアビリティ:175});const groups=aggregateAbilities({evidence,state:{}});assert.ok(groups.every(g=>g.total===0&&g.manual===null));assert.equal(abilityKey('闇属性'),'闇属性リーダー攻撃力|%');assert.equal(researchSpec({...ns[0],name:'食料生産'},{},evidence).unit,'');
});

test('Video tree connections resolve within their group and equivalent healing names aggregate together',()=>{
 const evidence=JSON.parse(readFileSync(new URL('../public/data/strategy-evidence.json',import.meta.url)));
 const nodes=JSON.parse(readFileSync(new URL('../public/data/mechanics.json',import.meta.url))).research;
 const by=new Map(nodes.map(n=>[n.id,n]));
 for(const [id,parents] of Object.entries(evidence.edges)){assert.ok(by.has(id));for(const parent of parents){assert.ok(by.has(parent));assert.equal(by.get(parent).group,by.get(id).group);}}
 assert.equal(abilityKey('近衛歩兵治癒速度'),abilityKey('近衛歩兵治療速度'));
 assert.equal(abilityKey('最大病院収用兵士数',''),abilityKey('最大病院収容兵士数',''));
});
