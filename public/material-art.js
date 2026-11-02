// Material master field 4: material grade (independent of equipment grade).
const grades={115:1,116:2,117:3,118:4,218:1,220:2,219:3,217:4,216:3};
export function materialArt(image){const grade=grades[image];return `<span class="craft-material-art" style="background-image:url('assets/game/atlas-SmallThumbnail-base_0${grade}.png')" title="素材 G${grade}"><img src="assets/game/material-thumbnail-${String(image).padStart(5,'0')}.png" alt="" loading="lazy"><small>G${grade}</small></span>`;}
