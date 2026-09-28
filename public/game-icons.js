export const GAME_ICONS={'水':'water','火':'fire','風':'wind','雷':'thunder','土':'earth','光':'light','闇':'dark','歩兵':'infantry','騎兵':'cavalry','弓兵':'archer','統率':'leader'};
export function gameIcon(value,escape){const id=GAME_ICONS[value];return `<span class="game-label">${id?`<img src="assets/filters/${id}.png" alt="" width="28" height="28">`:''}<span>${escape(value||'未登録')}</span></span>`;}
