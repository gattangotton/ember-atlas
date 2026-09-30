import test from 'node:test';
import assert from 'node:assert/strict';
import {quickResearchLevel,researchPatternCandidates} from '../public/research-patterns.js';
test('Quick completion caps at five or documented max and never lowers progress',()=>{
 assert.equal(quickResearchLevel(0,10),5);assert.equal(quickResearchLevel(3,3),3);assert.equal(quickResearchLevel(8,10),8);assert.equal(quickResearchLevel(1,3),3);
});
test('Research suggestions rank matches, deduplicate curves, retain partial curves and exclude mismatched units',()=>{
 const node={id:'target',name:'食料採集速度',group:'拠点①',lab:10,documentedMax:3};
 const nodes=[node,...['same','family','duplicate','unknown','units'].map(id=>({...node,id,name:id}))];
 const make=(ability,values,unit='%')=>({ability,unit,values});
 const specs={same:make('食料採集速度',[1,2,3]),family:make('木材採集速度',[2,4,6]),duplicate:make('金属採集速度',[2,4,6]),unknown:make('食料採集速度',[1,null,3]),units:make('食料採集速度',[1,2,3],'秒')};
 const result=researchPatternCandidates(node,make('食料採集速度',[1,null,null]),nodes,specs,{});
 assert.equal(result.length,3);assert.deepEqual(result[0].values,[1,2,3]);assert.equal(result[0].conflicts,0);assert.equal(result[2].conflicts,1);assert.equal(result[2].sources.length,2);
 assert.equal(result[0].sources[0].id,'same');
});
