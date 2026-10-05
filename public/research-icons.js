import {GAME_RESEARCH_ICONS} from './game-research-icons.js';
import {abilityName} from './ability-names.js';
import {RESEARCH_ICON_DATA} from './research-icon-data.js';
const canonicalIcons=Object.fromEntries(Object.entries(RESEARCH_ICON_DATA).map(([name,icon])=>[abilityName(name),icon]));
export function researchIcon(name,id){
 const item=GAME_RESEARCH_ICONS[id]||Object.values(GAME_RESEARCH_ICONS).find(x=>abilityName(x.name)===abilityName(name))||RESEARCH_ICON_DATA[name]||canonicalIcons[abilityName(name)];
 return item?`<img src="${item.path}" alt="" width="48" height="48" loading="lazy" draggable="false">`:'<span aria-hidden="true">◇</span>';
}
