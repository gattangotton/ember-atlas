export function equipmentArt(record,grade,esc){
 if(!record.portrait)return '';
 const g=Math.max(1,Math.min(6,Number(grade)||1));
 return `<span class="game-equipment-art" data-grade="${g}" style="--grade-bg:url('assets/game/atlas-SmallThumbnail-base_0${g}.png')"><img src="${esc(record.portrait)}" alt="${esc(record.name)} G${g}" loading="lazy"><span class="game-grade">G${g}</span></span>`;
}
