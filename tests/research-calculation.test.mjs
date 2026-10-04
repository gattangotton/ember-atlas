import test from 'node:test';
import assert from 'node:assert/strict';
import {validatePlan,planResearch,applyAllianceSupport} from '../public/strategy-model.js';
import {researchResource,researchTime,researchPreparation} from '../public/research-plan-view.js';
const nodes=['a','b'].map(id=>({id,name:id,lab:1,group:'拠点①',documentedMax:2,levels:[[1000,2000,3000,4000,10000],[2000,4000,6000,8000,20000]]}));
test('Fountain adds five points to research speed; support reduces remaining time and survives restore',()=>{
 const c={targetId:'a',targetLevel:1,includeParents:false,speed:95,fountain:true,support:30,fixed:100,alchemist:true,efficiency:25};
 const r=planResearch(nodes,{}, {},c);
 assert.equal(r.totals[4],2646); // Each of 30 supports removes the 60-second minimum.
 assert.deepEqual(r.totals.slice(0,4),[800,1600,2400,3200]);
 const restored=validatePlan(JSON.parse(JSON.stringify(validatePlan(c,nodes))),nodes);
 assert.equal(restored.fountain,5);assert.equal(restored.support,30);
 assert.deepEqual(planResearch(nodes,{}, {},restored).totals,r.totals);
 assert.equal(validatePlan({targetId:'a'},nodes).support,0);
 assert.equal(validatePlan({targetId:'a'},nodes).fountain,0);
 for(const support of [-1,31,NaN,2.5])assert.throws(()=>validatePlan({...c,support},nodes));
 assert.equal(planResearch(nodes,{}, {},{...c,fixed:100000}).totals[4],0);
});
test('Route totals use the same modifiers and per-level rounding as individual estimates',()=>{
 const c={targetId:'a',targetLevel:2,includeParents:false,speed:31.2,efficiency:8.4,fountain:true,support:30};
 const a=planResearch(nodes,{a:1},{},c),b=planResearch(nodes,{a:1},{},{...c,targetId:'b',targetLevel:1});
 const route=planResearch(nodes,{a:1},{},{...c,routeTargets:[{id:'b',level:1}]});
 assert.deepEqual(route.totals,a.totals.map((n,i)=>n+b.totals[i]));
});
test('Research estimates omit fractional zeros and retain up to two decimal places',()=>{
 assert.equal(researchResource(1234567),'1.23M');assert.equal(researchResource(1250),'1.25K');
 assert.equal(researchResource(12),'12');assert.equal(researchResource(null),'未確認');
 assert.equal(researchTime(3600),'1時間');assert.equal(researchTime(90000),'1.04日');
 assert.equal(researchTime(0),'0秒');assert.equal(researchTime(null),'未確認');
});
test('Alliance help compounds remaining time and clamps at zero',()=>{
 assert.equal(applyAllianceSupport(10000,2),9801);
 assert.equal(applyAllianceSupport(6000,2),5880);
 assert.equal(applyAllianceSupport(61,1),1);
 assert.equal(applyAllianceSupport(59,1),0);
 assert.equal(applyAllianceSupport(59.2,0),60);
});

test('Fountain 2.5 percent stays distinct from five and boolean legacy records migrate safely',()=>{
 for(const fountain of [0,2.5,5,7.5]){const c={targetId:'a',targetLevel:1,includeParents:false,speed:95,fountain};const restored=validatePlan(JSON.parse(JSON.stringify(c)),nodes);assert.equal(restored.fountain,fountain);assert.equal(planResearch(nodes,{}, {},restored).totals[4],Math.ceil(10000/(1+(95+fountain)/100)));}
 assert.equal(validatePlan({targetId:'a',fountain:true},nodes).fountain,5);assert.equal(validatePlan({targetId:'a',fountain:false},nodes).fountain,0);
 for(const fountain of [-1,1,10,'5',NaN])assert.throws(()=>validatePlan({targetId:'a',fountain},nodes));
});

test('Resource item shows preparation amounts by dividing each stage by 1.1 without changing base costs',()=>{
 const base={rows:[{resources:[100,1,null,0],seconds:10},{resources:[100,1,0,0],seconds:20}],totals:[200,2,0,0,30],missing:[0,0,1,0,0]};
 const adjusted=researchPreparation(base,{resourceItem:true});
 assert.deepEqual(adjusted.totals,[182,2,0,0,30]);assert.equal(adjusted.rows[0].resources[2],null);assert.deepEqual(base.totals,[200,2,0,0,30]);assert.deepEqual(adjusted.missing,base.missing);assert.equal(researchPreparation(base,{resourceItem:false}),base);
});
