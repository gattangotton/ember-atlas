import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {simulateLoadout} from '../public/loadout-model.js';
import {chargeSkillEffects} from '../public/charge-model.js';
import {raidBossFor} from '../public/raid-data.js';
import {unlockedSlots} from '../public/mechanics.js';
import {heroCombat} from '../public/territory-model.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../public/data/'+n+'.json',import.meta.url)));
const h=read('game-heroes').characters['characters-game-82'],g=read('game-masters').equipment['equipment-pc-20016'],mem=read('game-memories').records;
const hero={record:{...h,id:'characters-game-82'},levels:{charge:7,trigger1:7,trigger2:7,trigger3:7}};
test('Liam Night Demon has all game levels, enemy debuff and combat origin; anti-infantry effect does not affect monsters',()=>{
 assert.equal(h.element,'土');assert.equal(h.troop,'弓兵');assert.equal(h.skills.charge.extra,'debuff');assert.equal(h.skills.active.extra,'none');
 assert.deepEqual(h.skills.charge.effects.find(e=>e.name==='敵の被ダメージ').values,[3,6,9,12,15,18,21]);
 assert.deepEqual(h.skills.charge.effects.find(e=>e.name==='威力').values,[650,750,850,950,1050,1150,1250]);
 const c=chargeSkillEffects([hero]);assert.equal(c.bonus,21);assert.equal(c.rows.find(r=>r.name==='敵の被ダメージ').duration,2);
 assert.ok(heroCombat(hero.record));
 const result=simulateLoadout({context:{mode:'attack',battle:'fieldBoss',troop:'弓兵',element:'土',race:'超獣',attackType:'charge'},heroes:[hero],base:{mode:'none'}});
 assert.equal(result.total,189);assert.ok(!result.entries.some(e=>e.name==='対歩兵チャージスキル攻撃力'));
});
test('Chiliat gloves and the vampire memory combine exact grade and fixed values without converting seconds to percent',()=>{
 const gear={record:{...g,id:'equipment-pc-20016',kind:'equipment'},grade:6};
 assert.equal(raidBossFor(gear.record.id)?.id,'chiliat');assert.deepEqual(unlockedSlots(gear.record,6),[true,true,true]);assert.equal(g.powerGrades[5],29250);
 const vampire=mem.find(r=>r.id==='memory-78');assert.equal(vampire.paidAvailable,true);assert.ok(vampire.acquisition.every(a=>a.master.startsWith('ShopPack')));
 const r=simulateLoadout({context:{mode:'attack',battle:'fieldBoss',troop:'弓兵',element:'土',race:'精霊',attackType:'normal',chargeEffects:'active'},heroes:[hero],gear:[gear],memories:[{record:vampire}],base:{mode:'none'}});
 assert.equal(r.total,527.25);assert.equal(r.charge.factor,1.21);assert.ok(Math.abs(r.comparisonIndex-7.589725)<1e-8);
 assert.ok(!r.entries.some(e=>e.unit==='秒'||e.name.includes('スタン')));
 const loot=simulateLoadout({context:{mode:'loot',battle:'fieldBoss',race:'精霊'},gear:[gear],base:{mode:'none'}});assert.equal(loot.total,29.25);
});
test('Sports memory applies common and resource-specific gathering quantity; unconfirmed Geryon acquisition stays explicit',()=>{
 const sports=mem.find(r=>r.id==='memory-79'),geryon=mem.find(r=>r.id==='memory-10032');assert.equal(sports.paidAvailable,true);
 const value=resource=>simulateLoadout({context:{mode:'gather',objective:'amount',resource},memories:[{record:sports}],base:{mode:'none'}}).total;
 assert.equal(value('木材'),26);assert.equal(value('食料'),16);
 assert.deepEqual(geryon.acquisition,[]);assert.equal(geryon.paidAvailable,false);assert.equal(geryon.nonPaidAvailable,false);assert.equal(geryon.mainEffects.find(e=>e.name==='水属性リーダー攻撃力').value,35);
 for(const record of [sports,geryon,mem.find(r=>r.id==='memory-78')])assert.ok(fs.existsSync(new URL('../public/'+record.image,import.meta.url)));
});
