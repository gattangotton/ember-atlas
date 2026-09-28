import {readFileSync} from 'node:fs';
export const equipmentNameCorrections={
 '氷菓ブロード':'氷菓フロート','妖刀悪霊':'妖刀屍霊',
 'コルテロスーツ':'コルデロスーツ','コルテロブーツ':'コルデロブーツ'
};
export const equipmentNameKey=name=>(equipmentNameCorrections[name]||name).normalize('NFKC').replace(/[()（）・\s]/g,'').replace(/FFBE|シリーズ/g,'');
const videos=['20-20-28','20-22-36','20-24-01','20-25-29','20-26-55'];
const slots=['武器','頭部','身体','脚部','装飾'];
export const equipmentG1Evidence=readFileSync(new URL('./equipment-g1-sep28.txt',import.meta.url),'utf8').split(/\r?\n/).filter(s=>s&&!s.startsWith('#')).map(line=>{
 const [group,frame,name,power,effects]=line.split('|'),g=Number(group);
 return {name,slot:slots[g-1],power:Number(power),video:`ScreenRecording_09-28-2026 ${videos[g-1]}_1.MP4`,time:frame.startsWith('s')?Number(frame.slice(1))-.5:Number(frame)*3-1.5,portrait:`assets/portraits/equipment-sep28-${g}-${frame}.jpg`,mainAbilities:effects.split(',').map(s=>{const [name,value]=s.split(':');return {name,unit:'%',values:[Number(value),null,null,null,null,null],pattern:''};})};
});
