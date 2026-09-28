import test from 'node:test';
import assert from 'node:assert/strict';
import {traceResearchRoute,defaultRouteLevel,researchFrontier} from '../public/research-route.js';
import {planResearch,validatePlan} from '../public/strategy-model.js';
const nodes=['a','b','c','d'].map(id=>({id,name:id,group:'拠点①',documentedMax:2,levels:[[100,100,100,100,60],[200,200,200,200,120]]}));
const edges=[{from:'a',to:'b'},{from:'a',to:'c'},{from:'b',to:'d'},{from:'c',to:'d'}];
test('Intermediate route nodes default to level 5 including partially completed start nodes, capped by their maximum',()=>{
 assert.equal(defaultRouteLevel({documentedMax:5},false,2),5);
 assert.equal(defaultRouteLevel({documentedMax:1},false,0),1);
 assert.equal(defaultRouteLevel({documentedMax:5},true,2),3);
});
test('Frontier finds all started nodes in the farthest visual column within the selected tree',()=>{
 const positions=new Map([['a',{column:0}],['b',{column:1}],['c',{column:1}],['d',{column:2}]]);
 assert.deepEqual(researchFrontier(nodes,positions,{}),[]);
 assert.deepEqual(researchFrontier(nodes,positions,{a:5,b:2,c:1,d:0}),['b','c']);
 assert.deepEqual(researchFrontier(nodes.slice(0,3),positions,{b:1,d:5}),['b']);
 assert.deepEqual(researchFrontier(nodes,positions,{a:5,b:5,d:1}),['d']);
});
test('Route pauses at a branch and follows the selected branch to current progress',()=>{
 assert.equal(traceResearchRoute(nodes,edges,{a:1},'d').pending,'d');
 assert.deepEqual(traceResearchRoute(nodes,edges,{a:1},'d',{d:'c'}).path,['a','c','d']);
 assert.deepEqual(traceResearchRoute(nodes,edges,{c:1},'d',{d:'c'}).path,['c','d']);
 assert.equal(traceResearchRoute(nodes,edges,{},'d',{d:'unknown'}).pending,'d');
});
test('Route cost counts remaining levels and shared required prerequisites once, and persists chosen levels',()=>{
 const specs=Object.fromEntries(nodes.map(n=>[n.id,{values:[1,2],requirementsKnown:true,requirements:n.id==='d'?[{id:'b',level:2}]:[],ability:n.name,unit:'%'}]));
 const config={targetId:'d',targetLevel:1,routeTargets:[{id:'a',level:1},{id:'b',level:2}]};
 assert.deepEqual(validatePlan(JSON.parse(JSON.stringify(config)),nodes).routeTargets,config.routeTargets);
 const r=planResearch(nodes,{a:1,b:1},specs,config);assert.equal(r.rows.length,2);assert.equal(r.totals[0],300);assert.equal(r.totals[4],180);assert.equal(r.complete,false);
 assert.throws(()=>validatePlan({...config,routeTargets:[{id:'b',level:3}]},nodes));
 assert.throws(()=>validatePlan({...config,routeTargets:[{id:'d',level:1}]},nodes));
 assert.throws(()=>validatePlan({...config,routeTargets:[{id:'b',level:1},{id:'b',level:1}]},nodes));
});
