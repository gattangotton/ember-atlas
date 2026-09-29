import {abilityName} from './ability-names.js';
import {validateMechanics} from './mechanics.js';
export const EQUIPMENT_SLOTS={weapon:'武器',head:'頭部',body:'身体',legs:'脚部',accessory:'装飾',unknown:'未確認'};
// Main-ability filter names transcribed from ScreenRecording_09-26-2026 16-34-57_1.MP4 (0–30 s).
export const EQUIPMENT_FILTERS={
 '防御': [...['精霊','不浄','堕天','妖魔','龍','超獣','悪魔','魔獣'].map(x=>'対'+x+'防御効率'),...['騎兵','弓兵','歩兵',''].map(x=>x+'防御効率')],
 '行軍': ['集結部隊行軍速度','騎兵行軍速度','弓兵行軍速度','歩兵行軍速度','行軍速度'],
 '対象別攻撃': ['対キザハシ攻撃力','対施設攻撃力','対宝庫攻撃力','対集結魔獣攻撃力',...['精霊','不浄','機甲','堕天','妖魔','龍','超獣','悪魔','魔獣'].map(x=>'対'+x+'攻撃力')],
 '攻撃・リーダー': ['施設防衛時攻撃力','集結部隊時攻撃力','部隊時攻撃力',...['闇','光','雷','土','風','水','火'].map(x=>x+'属性リーダー攻撃力'),'騎兵攻撃力','弓兵攻撃力','歩兵攻撃力','攻撃力'],
 '獲得・倍化': ['対魔獣獲得経験値',...['不浄','堕天','超獣'].map(x=>'対'+x+'メモリ倍化率'),...['精霊','不浄','機甲','堕天','妖魔','龍','超獣','悪魔','魔獣'].map(x=>'対'+x+'素材倍化率')],
 '採集': ['採集速度','採集量','運搬量']
};
export const effectKey=s=>abilityName(s).normalize('NFKC').replace(/倍加/g,'倍化').replace(/竜/g,'龍').replace('集結行軍速度','集結部隊行軍速度').replace('集結攻撃力','集結部隊時攻撃力').replace(/\s/g,'');
export function equipmentMatches(r,{slot='',query='',power='',abilities=[],mode='all',knownOnly=false}={}){
 if(r.kind!=='equipment'||slot&&((r.slot||'未確認')!==slot)||power&&(power==='unknown'?r.power!=null:r.power!==Number(power)))return false;
 const names=(r.mainAbilities||[]).map(e=>effectKey(e.name));
 if(knownOnly&&!names.length)return false;
 if(abilities.length&&!(mode==='any'?abilities.some(a=>names.includes(effectKey(a))):abilities.every(a=>names.includes(effectKey(a)))))return false;
 return effectKey([r.name,...names].join(' ')).includes(effectKey(query));
}
export function validateEquipmentPatterns(items=[]){
 if(!Array.isArray(items)||items.length>300)throw Error('装備パターンは300件以内です。');const ids=new Set();
 return items.map(p=>{if(!p||!Array.isArray(p.mainAbilities)||!/^ep-[a-zA-Z0-9_-]+$/.test(p.id)||ids.has(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>100||!Number.isInteger(p.power)||p.power<0||p.power>1e9)throw Error('パターンの名称・パワー・IDを確認してください。');if(p.slot!==undefined&&!Object.values(EQUIPMENT_SLOTS).includes(p.slot))throw Error('パターンの部位を確認してください。');ids.add(p.id);return {...(p.slot?{slot:p.slot}:{}),id:p.id,name:p.name,power:p.power,mainAbilities:validateMechanics({mainAbilities:p.mainAbilities}).mainAbilities};});
}
export function applyEquipmentPattern(r,p){const pattern=validateEquipmentPatterns([p])[0];if(r.kind!=='equipment'||r.power!==pattern.power)throw Error('G1パワーが同じ装備を選んでください。');return {...r,mainAbilities:structuredClone(pattern.mainAbilities)};}
