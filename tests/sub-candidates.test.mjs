import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validateCandidateCatalog,withCandidates,slotCandidates,resizeMemoryCopies,setMemoryUnlocked,memoryUnlocked} from '../public/sub-candidates.js';
import {candidateScore,compareCandidateScores} from '../public/candidate-score.js';
import {validateMemoryInventory,newMemoryCopy} from '../public/memory-model.js';
import {sharedMemories} from '../public/model.js';
import {validateCopies} from '../public/equipment-inventory.js';
import {simulateLoadout} from '../public/loadout-model.js';
const context={mode:'gather',resource:'食料',objective:'speed'};
const record={id:'equipment-test',kind:'equipment',name:'テスト用',raid:'no',mainAbilities:[{name:'採集速度',unit:'%',values:[10,15,20,25,30,40]}]};
const catalog=validateCandidateCatalog({'equipment-test':{source:'テスト用候補（実ゲームの定義ではない）',slots:[[{name:'食料採集速度',unit:'%',max:15},{name:'採集速度',unit:'%',max:10},{name:'木材採集速度',unit:'%',max:50}],[{name:'食料採集速度',unit:'%',max:20}],[{name:'採集速度',unit:'%',max:999}]]}});
test('候補はアイテム・枠単位で独立し、未知と空の確定リストを区別する',()=>{
 const r=withCandidates(record,catalog);assert.equal(slotCandidates(r,1).length,3);assert.equal(slotCandidates(r,2).length,1);assert.equal(slotCandidates({...record,id:'equipment-other'},1),null);
 assert.deepEqual(slotCandidates(withCandidates(record,{'equipment-test':{source:'test',slots:[[],null,null]}}),1),[]);
 assert.throws(()=>validateCandidateCatalog({'equipment-test':{source:'',slots:[[],[],[]]}}));
 assert.throws(()=>validateCandidateCatalog({'equipment-test':{source:'test',slots:[[{name:'採取速度',max:1},{name:'採集速度',max:2}],[],[]]}}),/重複/);
 assert.throws(()=>validateCandidateCatalog({'equipment-test':{source:'test',slots:[[{name:'採集速度',max:NaN}],[],[]]}}));
});
test('候補比較はメインのみ。実際のサブ効果とグレード・資源別の計算は保持する',()=>{
 const r=withCandidates(record,catalog);const item={record:r,grade:5,owned:true,subAbilities:[{name:'食料採集速度',value:3},null,null]};
 const s=candidateScore(item,'gear',context);assert.equal(s.main,30);assert.equal(s.sub,3);assert.equal(s.actual,33);assert.equal(s.cap,undefined);assert.equal(s.upper,undefined);
 assert.equal(candidateScore({...item,grade:1},'gear',context).main,10);
 assert.equal(candidateScore({...item,grade:6},'gear',context).main,40);
 assert.equal(candidateScore(item,'gear',{...context,resource:'木材'}).sub,0);
 assert.equal(simulateLoadout({context,gear:[item],base:{mode:'none'}}).total,33); // The ceiling does not enter the actual simulation.
});
test('候補プールや上限の有無に関わらずメインを比較し、未確認メインを明示する',()=>{
 const raw=candidateScore({record,grade:5,subAbilities:[]},'gear',context);assert.equal(raw.main,30);assert.equal(raw.mainUnknown,0);
 const r=withCandidates(record,{'equipment-test':{slots:[[{name:'食料採集速度',unit:'%',max:null}],[],null]}});
 assert.equal(candidateScore({record:r,grade:1,subAbilities:[]},'gear',context).main,10);
 const partial={...record,subCandidates:[{slot:1,name:'採集速度',value:4}]};assert.equal(slotCandidates(partial,1)[0].max,4);assert.equal(candidateScore({record:partial,grade:1},'gear',context).main,10);
 const missing=candidateScore({record:{...r,mainAbilities:[{name:'採集速度',unit:'%',values:[null]}]},grade:1},'gear',context);assert.equal(missing.main,0);assert.ok(missing.mainUnknown>0);
});
test('過去のグレード別上限設定は保持するがメイン比較に使わない',()=>{
 const config=validateCandidateCatalog({'equipment-test':{source:'検証用グレード表',slots:[[{name:'食料採集速度',unit:'%',max:999,gradeMax:[2,4,null,8,10,12]}],[],null]}});
 const r=withCandidates(record,config);
 assert.equal(candidateScore({record:r,grade:1},'gear',context).main,10);
 assert.equal(candidateScore({record:r,grade:5},'gear',context).main,30);
 assert.equal(candidateScore({record:r,grade:3},'gear',context).main,20);
 assert.equal(slotCandidates(r,1,6)[0].max,12);
 assert.equal(slotCandidates(r,1)[0].gradeMax.length,6);
 assert.throws(()=>validateCandidateCatalog({'equipment-test':{source:'test',slots:[[{name:'採集速度',max:null,gradeMax:[1,2]}],[],null]}}));
});
test('武具の秒やスキルLvを百分率へ加算せず、共有でも単位を保持する',()=>{
 const sub={name:'対悪魔素材倍化率',value:50,unit:'秒'},copy={id:'unit-test',grade:1,target:1,subAbilities:[sub,null,null]};
 assert.equal(validateCopies([copy],record)[0].subAbilities[0].unit,'秒');
 assert.equal(simulateLoadout({context:{mode:'loot',race:'悪魔'},gear:[{record,grade:1,subAbilities:copy.subAbilities}],base:{mode:'none'}}).total,0);
 assert.throws(()=>validateCopies([{...copy,subAbilities:[{...sub,unit:3},null,null]}],record));
});
test('メモリの解放数は個体別。個体IDと実測サブを残し、未確認を推定しない',()=>{
 const old=newMemoryCopy('old');assert.equal(memoryUnlocked(old),null);
 const next=resizeMemoryCopies([old],3,(()=>{let i=0;return()=>`new-${++i}`;})());assert.equal(next[0].id,'old');assert.equal(memoryUnlocked(next[1]),1);assert.deepEqual(next[1].subs.map(s=>s.status),['unknown','empty','empty']);assert.equal(old.unlockedSlots,undefined);
 assert.throws(()=>setMemoryUnlocked(next[1],0),/1～3/);
 next[1]=setMemoryUnlocked(next[1],2);assert.deepEqual(next[1].subs.map(s=>s.status),['unknown','unknown','empty']);next[1].subs[1]={status:'set',name:'食料採集速度',value:0,unit:'%'};
 assert.throws(()=>setMemoryUnlocked(next[1],1),/解除/);
 const inventory=validateMemoryInventory({'memory-test':next},[{id:'memory-test'}]);assert.equal(inventory['memory-test'][1].unlockedSlots,2);assert.equal(inventory['memory-test'][1].subs[1].value,0);
 assert.equal(sharedMemories(inventory)['memory-test'][1].unlockedSlots,2);
 assert.throws(()=>validateMemoryInventory({'memory-test':[{...next[1],unlockedSlots:1}]},[{id:'memory-test'}]),/一致/);
 assert.throws(()=>resizeMemoryCopies(next,201,()=>''));
 assert.equal(resizeMemoryCopies(next,1,()=>'' )[0].id,'old');
 const archived={...newMemoryCopy('closed'),unlockedSlots:0,subs:Array.from({length:3},()=>({status:'empty',name:'',unit:'%',value:null}))};
 assert.deepEqual(resizeMemoryCopies([archived],1,()=>''),[archived]);assert.equal(validateMemoryInventory({'memory-test':[archived]},[{id:'memory-test'}])['memory-test'][0].unlockedSlots,0);
});
test('同名メモリのメインは同じでも個体ごとの実測サブを反映する',()=>{
 const memory={id:'memory-test',name:'テスト用',mainEffects:[{name:'採集速度',unit:'%',value:20}],subCandidateSlots:[[{name:'食料採集速度',unit:'%',max:10}],[{name:'採集速度',unit:'%',max:15}],[{name:'食料採集量',unit:'%',max:60}]]};
 const copies=resizeMemoryCopies([],2,(()=>{let i=0;return()=>`c${++i}`;})());copies[0]=setMemoryUnlocked(copies[0],1);copies[1]=setMemoryUnlocked(copies[1],3);
 copies[0].subs[0]={status:'set',name:'食料採集速度',unit:'%',value:4};copies[1].subs[1]={status:'set',name:'採集速度',unit:'%',value:9};
 const a=candidateScore({record:memory,copy:copies[0]},'memory',context),b=candidateScore({record:memory,copy:copies[1]},'memory',context);
 assert.equal(a.main,20);assert.equal(b.main,20);assert.equal(a.sub,4);assert.equal(b.sub,9);assert.equal(a.actual,24);assert.equal(b.actual,29);
 assert.equal(candidateScore({record:memory},'memory',context).actual,20);
});
test('候補順はメインのみ。サブ・上限で逆転せず、同値は既知と名前の安定順',()=>{
 const items=[{key:'low',label:'あ',candidateScore:{main:10,actual:1000,upper:1000}},{key:'high',label:'い',candidateScore:{main:50,actual:50}},{key:'unknown',label:'あ',candidateScore:{main:50,mainUnknown:1,actual:9999}},{key:'tie',label:'う',candidateScore:{main:50,actual:100}}];
 assert.deepEqual(items.sort(compareCandidateScores).map(x=>x.key),['high','tie','unknown','low']);
});
test('ゲーム内の効果辞書は候補一覧ではなく名称の入力補助として保持する',async()=>{
 const {GAME_ABILITY_NAMES}=await import('../public/game-ability-names.js');assert.equal(GAME_ABILITY_NAMES.length,395);assert.ok(GAME_ABILITY_NAMES.includes('食料採集速度'));
 const shipped=JSON.parse(fs.readFileSync('public/data/sub-candidates.json','utf8'));assert.deepEqual(validateCandidateCatalog(shipped.records),{});assert.match(shipped.source,/応答/);
});
test('確認済み枠の登録UIはその枠の選択肢だけ。既存候補外と未知は保持する',async()=>{
 globalThis.document={addEventListener(){}};const {subPicker}=await import('../public/sub-ability-picker.js');delete globalThis.document;
 const esc=s=>String(s??'').replaceAll('<','&lt;').replaceAll('"','&quot;');
 const html=subPicker('sub-test','',esc,false,{candidates:[{name:'食料採集速度',max:15,unit:'%'}]});assert.match(html,/select name="sub-test"/);assert.ok(!html.includes('木材採集速度'));assert.ok(!html.includes('data-sub-type'));
 assert.match(subPicker('sub-test','旧名称',esc,false,{candidates:[]}),/既存登録・候補外/);
 assert.match(subPicker('sub-test','',esc,false,{candidates:null}),/候補未照合/);
 const helper=subPicker('sub-test','食料採集量',esc);assert.match(helper,/種類からアビリティを選ぶ/);
 for(const resource of ['食料','木材','金属','エーテル'])for(const effect of ['採集量','採集速度'])assert.ok(helper.includes(`data-sub-choice="${resource+effect}"`));
 assert.ok(!subPicker('closed','',esc,true).includes('data-sub-choice'));
});
