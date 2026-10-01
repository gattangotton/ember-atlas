import test from 'node:test';
import assert from 'node:assert/strict';
import {applyBuildingEffectTemplates} from '../public/building-effect-templates.js';
import {validateBuildingEffects,buildingSources} from '../public/building-progress.js';
test('Facility curves adapt elements, troops and resources without converting unknowns into zero',()=>{
 const e=(name,max,unit='%')=>({name,unit,values:Array.from({length:max},(_,i)=>i===2?null:i*10)});
 const input={'building-3-fire':[e('火属性リーダー攻撃力',20)],'building-8':[e('歩兵攻撃力',31),e('兵士訓練速度',31)],'building-11':[e('食料生産量',31,'')],'building-12':[e('資源保護量',31)]};
 const original=structuredClone(input),result=applyBuildingEffectTemplates(input);validateBuildingEffects(result);
 assert.deepEqual(input,original);
 assert.equal(result['building-3-water'][0].name,'水属性リーダー攻撃力');assert.deepEqual(result['building-3-dark'][0].values,input['building-3-fire'][0].values);
 assert.equal(result['building-9'][0].name,'弓兵攻撃力');assert.deepEqual(result['building-10'][1].values,input['building-8'][1].values);
 assert.equal(result['building-12'].length,2);assert.equal(result['building-13'][0].values[3],30);
 assert.equal(result['building-14'][0].values[3],15);assert.equal(result['building-14'][0].values[2],null);assert.equal(result['building-14'][0].values[0],0);
 assert.deepEqual(applyBuildingEffectTemplates(result),result);
 assert.equal(buildingSources({buildingEffects:result,buildingProgress:{'building-14':[4,4]}}).reduce((s,e)=>s+e.value,0),30);
 assert.deepEqual(applyBuildingEffectTemplates({}),{});
});
