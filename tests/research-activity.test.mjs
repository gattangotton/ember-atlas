import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateResearchActivity,researchActivity} from '../public/research-activity.js';
import {GAME_RESEARCH_ICONS} from '../public/game-research-icons.js';
import {researchIcon} from '../public/research-icons.js';
const nodes=JSON.parse(fs.readFileSync(new URL('../public/data/mechanics.json',import.meta.url))).research;
test('All 419 research panels have existing master-mapped icons, including archer training',()=>{
 assert.equal(Object.keys(GAME_RESEARCH_ICONS).length,nodes.length);
 for(const n of nodes){const icon=GAME_RESEARCH_ICONS[n.id];assert.ok(fs.existsSync(new URL('../public/'+icon.path,import.meta.url)));assert.ok(researchIcon(n.name,n.id).includes(icon.path));}
 assert.equal(GAME_RESEARCH_ICONS['research-1-53'].iconId,147);
});
test('Research activity validates and stops appearing after its target is acquired',()=>{
 const a={id:'research-1-53',targetLevel:5};assert.deepEqual(validateResearchActivity(a,nodes),a);
 assert.deepEqual(researchActivity({activeResearch:a,research:{[a.id]:4}},nodes),a);
 assert.equal(researchActivity({activeResearch:a,research:{[a.id]:5}},nodes),null);
 assert.equal(validateResearchActivity(null,nodes),null);assert.equal(researchActivity({},nodes),null);
 for(const v of [{id:'bad',targetLevel:5},{...a,targetLevel:6},{...a,targetLevel:0},{...a,targetLevel:1.5}])assert.throws(()=>validateResearchActivity(v,nodes));
});
