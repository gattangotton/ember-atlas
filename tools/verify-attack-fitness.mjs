import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {decodeMessagePack} from './read-messagepack.mjs';
import {TERRITORY_COMBAT} from '../public/territory-combat-data.js';
const root=process.argv[2]||'C:/Users/takah/AppData/LocalLow/SquareEnix/EmberStoria/Fdfb6zs93olkPI9L/Cache/Masters/_';
const prior=JSON.parse(fs.readFileSync('artifacts/territory-combat-audit.json'));
const importedHeroes=JSON.parse(fs.readFileSync('public/data/game-heroes.json'));
const files={},raw={};
for(const name of [...Object.keys(prior.files),'Skill']){
 const b=fs.readFileSync(root+'/'+name),sha256=createHash('sha256').update(b).digest('hex');
 const expected=prior.files[name]?.sha256||importedHeroes.files[name]?.sha256;
 files[name]={sha256,unchangedFromImport:expected?sha256===expected:null};
 raw[name]=decodeMessagePack(b);
 if(expected&&!files[name].unchangedFromImport)throw Error(name+' changed; reimport and review');
}
const rules=raw.Help.filter(h=>[3,4,7,36,61].includes(h[0])).flatMap(h=>(h[2]||[]).filter(s=>s[1]).map(s=>({source:'Help '+h[0],title:s[0],text:s[1].filter(x=>x[-1]===1).map(x=>x[0]).join('\n')}))).filter(s=>/編成ボーナス|属性相性|チャージスキル|アビリティ効果の補足|レイド部隊/.test(s.title));
const audit={verifiedAt:new Date().toISOString(),files,bonuses:TERRITORY_COMBAT.bonuses,rules,model:{scale:'100 times the existing team comparison index. Baseline = 100; not a percentage or a damage prediction.',candidates:'Replace exactly one selected slot, keeping gear/memory/base and the other slots fixed. Leader replacement recalculates leader element. Duplicate hero options disabled.',partner:'Ordered second/third combinations, plus remaining supports chosen by DeckBonus. Optional troop/element/origin match filter.',support:'Only DeckBonus: no trigger, charge or active skill contributions. Hero level taken from registered progress; unknown levels receive no guessed level bonus.',charge:'Optional existing active buff/debuff comparison: strongest same kind, outgoing plus enemy incoming capped at 200%. Power/rotation/healing/defence debuffs are displayed as source text, not converted to damage.',affinity:'World monster coefficient (FieldSetting[34]), used for normal/counter only. Charge has its own skill element (Help 7), not automatically the leader element; no guessed multiplier for charge.',auto:'Each leader compared with gear and memories optimized for that element/troop, then partners/supports selected. This is a comparison search, not a verified optimal combat simulation.'}};
fs.writeFileSync('artifacts/attack-fitness-audit.json',JSON.stringify(audit,null,2)+'\n');
console.log({verified:Object.keys(files),bonuses:audit.bonuses,ruleSources:[...new Set(rules.map(r=>r.source))]});
