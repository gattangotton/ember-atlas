import test from 'node:test';
import assert from 'node:assert/strict';
import {matchingAbilities} from '../public/ability-suggestions.js';

test('attack query includes common effects before long imported descriptions',()=>{
 const list=matchingAbilities('攻撃',[{skills:{charge:{effects:[{name:'15%減少するたびに攻撃力'}]}}}]);
 assert.equal(list[0],'攻撃力');
 assert.ok(list.includes('歩兵攻撃力'));
 assert.ok(list.length<=12);
});
test('suggestions include custom variants and canonicalize duplicate aliases',()=>{
 const records=[{coreEffects:[{name:'治癒速度'},{name:'兵士治療速度'}],skills:{active:{variants:[{effects:[{name:'独自効果'}]}]}}}];
 assert.deepEqual(matchingAbilities('独自',records),['独自効果']);
 assert.deepEqual(matchingAbilities('治療',records),['兵士治療速度']);
 assert.deepEqual(matchingAbilities(' ',records),[]);
});
