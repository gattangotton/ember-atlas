import {effectKey} from './equipment-model.js';
export const LOOT_RACES=['悪魔','超獣','堕天','妖魔','不浄','龍','精霊','機甲'];
export const LOOT_SLOTS=['武器','頭部','身体','脚部','装飾'];
export function lootEffect(name,race){const key=effectKey(name);return key===`対${race}素材倍化率`||key==='対魔獣素材倍化率';}
// Registered values take priority. The old worksheet can fill a missing grade
// only when its effect and G1 agree; it never contributes a second copy.
export function lootContribution(record,grade,race,subs=[]){
 if(!record)return {total:0,unknown:0,entries:[]};
 const entries=[];const mains=record.mainAbilities||[];
 for(const e of mains.filter(e=>lootEffect(e.name,race))){let value=e.values?.[grade-1];const fallback=value==null&&effectKey(e.name)===effectKey(record.effect)&&Number.isFinite(e.values?.[0])&&e.values[0]===record.grades?.[0]&&Number.isFinite(record.grades?.[grade-1]);if(fallback)value=record.grades[grade-1];entries.push({name:e.name+(fallback?'（元資料）':''),value:Number.isFinite(value)?value:null,source:'メイン'});}
 if(!mains.length){if(lootEffect(record.effect,race))entries.push({name:record.effect+'（元資料）',value:record.grades?.[grade-1]??null,source:'メイン'});else entries.push({name:'メイン効果未登録',value:null,source:'メイン'});}
 for(const a of subs.filter(Boolean).filter(a=>lootEffect(a.name,race)))entries.push({name:a.name,value:Number.isFinite(a.value)?a.value:null,source:'サブ'});
 return {entries,total:entries.reduce((s,e)=>s+(e.value??0),0),unknown:entries.filter(e=>e.value===null).length};
}
export function lootTotal(items,race){const rows=items.map(x=>({...x,...lootContribution(x.record,x.grade,race,x.subAbilities)}));return {rows,total:rows.reduce((n,x)=>n+x.total,0),unknown:rows.reduce((n,x)=>n+x.unknown,0)};}
