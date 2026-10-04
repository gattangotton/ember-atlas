import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {containsMemoryReward,memoryAcquisition} from '../tools/memory-acquisition.mjs';
import {filterMemories} from '../public/memory-model.js';
const data=JSON.parse(fs.readFileSync(new URL('../public/data/game-memories.json',import.meta.url)));
test('Memory sources follow typed rewards, distinguish paid currency and deduplicate repeated event sources',()=>{
 const reward={0:77,1:100,'-1':12};
 assert.equal(containsMemoryReward({0:77,'-1':4},77),false);assert.equal(containsMemoryReward({a:[reward]},77),true);
 const rows=memoryAcquisition(77,{packs:[{0:1,1:'課金',3:{0:2,'-1':2},4:reward},{0:2,1:'無料扱いを推測しないパック',3:{0:99,'-1':2},4:reward}],items:[],shops:[],events:[{0:3,2:'イベント',36:[reward]},{0:4,2:'イベント',36:[reward]}],boxes:[]});
 assert.deepEqual(rows.map(r=>r.type),['paid','pack','event']);
});
test('Published memory database includes native art, generation costs and independently verified acquisition routes',()=>{
 for(const r of data.records){assert.ok(r.image);assert.ok(fs.existsSync(new URL('../public/'+r.image,import.meta.url)));assert.ok(r.generation.fragments>0);assert.ok(r.generation.ether>0);}
 const halloween=data.records.find(r=>r.masterId===77);assert.equal(halloween.paidAvailable,true);assert.equal(halloween.nonPaidAvailable,false);assert.equal(halloween.generation.fragments,100);assert.ok(halloween.acquisition.some(a=>a.master==='ShopPack 13921'));
 const event=data.records.find(r=>r.masterId===80);assert.equal(event.paidAvailable,false);assert.ok(event.acquisition.some(a=>a.name==='パンプキンレリック'));
 assert.equal(filterMemories(data.records,{},{acquisition:'paid'}).length,43);
 assert.equal(filterMemories(data.records,{},{acquisition:'nonpaid',query:'フロートアイ'}).length,1);
 assert.equal(filterMemories(data.records,{},{acquisition:'unknown',query:'骸'}).length,1);
});
