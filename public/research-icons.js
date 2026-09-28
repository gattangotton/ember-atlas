import {RESEARCH_ICON_DATA} from './research-icon-data.js';
export function researchIcon(name){
 const canonical=name.replace('装備制作','装備製作').replace('治療速度','治癒速度').replace('収容兵士数','収用兵士数');
 const item=RESEARCH_ICON_DATA[name]||RESEARCH_ICON_DATA[canonical];
 return item?`<img src="${item.path}" alt="" width="48" height="48" loading="lazy" draggable="false">`:'<span aria-hidden="true">◇</span>';
}
