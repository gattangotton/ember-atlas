// Equipment correspondence: supplied Excel, レイド装備. Null means no released slot
// in the checked source set, not a missing database record. Checked 2026-09-28.
export const RAID_SLOTS=['武器','頭部','身体','脚部','装飾'];
const boss=(id,name,race,gear,source,imageSource)=>({id,name,race,gear,source,imageSource,image:`assets/raids/${id}.${['malacoda','chiliat'].includes(id)?'jpg':'png'}`});
export const RAID_BOSSES=[
 boss('malacoda','マラコーダ','悪魔',['equipment-cb4f57d39f3640','equipment-2886b7dc74547d','equipment-3023dd33e6429d','equipment-7a77bc25ba4a2b','equipment-75c281c5f9a555'],'https://kamigame.jp/emberstoria/page/346296715009114641.html','https://www.jp.square-enix.com/emberstoria/'),
 boss('chiliat','チリアット','超獣',['equipment-26d3a583962f3a','equipment-9544bff66820a5','equipment-fb2a0fbd3edb2b','equipment-2156f9bf22c5bb','equipment-ee36e3e1ae5fe8'],'https://kamigame.jp/emberstoria/page/361102964208707119.html','https://www.jp.square-enix.com/emberstoria/'),
 boss('eclipse','エクリプス','堕天',[null,'equipment-3c3c7ffbe68a25','equipment-5d547244e613de','equipment-f156bd6f233c4f','equipment-8c931f0b7aca11'],'https://note.com/ootori_mineha/n/n04cb31310246','https://kamigame.jp/emberstoria/page/381409561128494771.html'),
 boss('magatsu','禍ツ神千刃','妖魔',['equipment-789c4b80c42692',null,'equipment-2b7db5e946eab6','equipment-44c11c1066f679','equipment-af02a1d6a26bc2'],'https://note.com/ootori_mineha/n/nc9b2a0d5c35e','https://kamigame.jp/emberstoria/page/395021699696874205.html'),
 boss('malboro','モルボル','不浄',['equipment-7bbdc1430f3b3a','equipment-1ff13faae2d075','equipment-fef9a5eb669661','equipment-8cc94b4c951200','equipment-7b45f3db7e746e'],'https://note.com/ootori_mineha/n/n05277a144b1f','https://kamigame.jp/emberstoria/page/372681457153379523.html'),
 boss('jormungand','ヨルムンガンド','竜',[null,'equipment-a420318a963a01','equipment-97f2b0d381cf5a','equipment-98bcfa95dbe2da','equipment-d52beef044b705'],'https://note.com/ootori_mineha/n/n2b72251abbbe','https://faranerk.hatenablog.com/entry/2026/04/20/205259'),
];
const byEquipment=new Map(RAID_BOSSES.flatMap(b=>b.gear.filter(Boolean).map(id=>[id,b])));
export const raidBossFor=id=>byEquipment.get(id)||null;
export function raidBadge(record,esc){const b=raidBossFor(record.id);return b||record.raid==='yes'?`<a class="raid-badge" href="#raids">◆ レイド武具${b?' · '+esc(b.name):''}</a>`:'';}
