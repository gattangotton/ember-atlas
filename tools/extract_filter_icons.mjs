// Usage: node tools/extract_filter_icons.mjs <ffmpeg.exe> <video.mp4>
import {mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const [ffmpeg,video]=process.argv.slice(2);
const rows=[['闇','dark',20,133,274],['風','wind',20,448,274],['光','light',20,760,506],['雷','thunder',20,760,274],['火','fire',20,916,274],['水','water',20,1073,274],['土','earth',35,916,274],['歩兵','infantry',20,1097,274],['騎兵','cavalry',20,471,506],['弓兵','archer',20,1097,506],['統率','leader',20,1254,274]];
await mkdir('public/assets/filters',{recursive:true});
for(const [name,id,time,x,y] of rows){const r=spawnSync(ffmpeg,['-loglevel','error','-ss',String(time),'-i',video,'-vf',`scale=1400:-1,crop=24:24:${x}:${y},scale=72:72`,'-frames:v','1','-y',`public/assets/filters/${id}.png`],{windowsHide:true,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);}
await writeFile('public/data/filter-icons.json',JSON.stringify(Object.fromEntries(rows.map(([name,id,time,x,y])=>[name,{path:`assets/filters/${id}.png`,source:`DPTW4024.MP4 ${time}s`,crop:{width:1400,x,y,size:24}}])),null,2));
