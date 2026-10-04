import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RAID_BOSSES,RAID_SLOTS,raidBossFor,raidBadge} from '../public/raid-data.js';
import {raidPage} from '../public/raid-ui.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../public/data/catalog.json',import.meta.url)));
const mechanics=JSON.parse(fs.readFileSync(new URL('../public/data/mechanics.json',import.meta.url)));
const records=[...catalog.records,...mechanics.extraRecords].map(r=>({...r,...mechanics.additions[r.id]}));
test('Raid correspondence resolves every equipment ID once, with the correct slot and raid classification',()=>{
 const ids=new Set();
 for(const boss of RAID_BOSSES){
  assert.equal(boss.gear.length,5);
  assert.ok(fs.existsSync(new URL('../public/'+boss.image,import.meta.url)));
  boss.gear.forEach((id,i)=>{if(!id)return;assert.ok(!ids.has(id));ids.add(id);const r=records.find(r=>r.id===id);assert.ok(r,id);assert.equal(r.slot,RAID_SLOTS[i]);assert.equal(r.raid,'yes');assert.equal(raidBossFor(id),boss);});
 }
 assert.equal(ids.size,27);
 assert.equal(raidBossFor('not-equipment'),null);
 assert.equal(raidBadge({id:'ordinary',raid:'no'},String),'');
});
test('Unreleased slots and missing database entries remain distinct; all available weapons open database details',()=>{
 const page=raidPage(records,String);
 assert.equal((page.match(/data-action="detail"/g)||[]).length,33);
 assert.equal((page.match(/<small>未実装<\/small>/g)||[]).length,3);
 const missing=raidPage(records.filter(r=>r.id!==RAID_BOSSES[0].gear[0]),String);
 assert.match(missing,/データ未登録/);
});
