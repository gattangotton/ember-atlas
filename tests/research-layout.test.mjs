import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {gameTreeLayout} from '../public/research-layout.js';
import {researchIcon} from '../public/research-icons.js';
import {formatResource} from '../public/building-model.js';
const nodes=JSON.parse(readFileSync(new URL('../public/data/mechanics.json',import.meta.url))).research;
test('All research nodes appear once without overlap, independently of laboratory level',()=>{
 assert.equal(nodes.length,422);
 for(let g=0;g<5;g++){
  const ns=nodes.filter(n=>n.id.startsWith(`research-${g}-`)),a=gameTreeLayout(ns,g);
  assert.equal(a.positions.size,ns.length);
  assert.deepEqual(a.positions,gameTreeLayout(ns.map(n=>({...n,lab:999})),g).positions);
  const ps=[...a.positions.values()];
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)assert.ok(Math.abs(ps[i].x-ps[j].x)>=224||Math.abs(ps[i].y-ps[j].y)>=88);
  for(const e of a.edges)assert.ok(a.positions.get(e.from).x<a.positions.get(e.to).x);
 }
 const edges=gameTreeLayout(nodes,2).edges;
 for(const from of [56,57,58])assert.ok(edges.some(e=>e.from===`research-2-${from}`&&e.to==='research-2-59'));
 assert.ok(!edges.some(e=>e.from==='research-2-91'));
});
test('Every research item and planner boost resolves to a shipped image',()=>{
 for(const name of [...nodes.map(n=>n.name),'alchemist','research-resource']){
  const path=researchIcon(name).match(/src="([^"]+)"/)?.[1];
  assert.ok(path,name);assert.ok(existsSync(new URL('../public/'+path,import.meta.url)),name);
 }
});
test('Resource display uses K and M without losing whole-resource precision',()=>{
 for(const [n,s] of [[0,'0'],[999,'999'],[1000,'1K'],[1234,'1.234K'],[999999,'999.999K'],[1000000,'1M'],[1234567,'1.234567M'],[null,'未確認']])assert.equal(formatResource(n),s);
});
