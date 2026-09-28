// Extract only portrait rectangles from the supplied video, excluding Lv and chat overlays.
// Usage: node tools/extract_portraits.mjs <ffmpeg.exe> <video.mp4>
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const [ffmpeg,video]=process.argv.slice(2);if(!ffmpeg||!video)throw Error('ffmpeg と元動画のパスを指定してください。');
const root=new URL('../public/',import.meta.url),out=new URL('assets/portraits/',root);await mkdir(out,{recursive:true});
const {records}=JSON.parse(await readFile(new URL('data/catalog.json',root),'utf8'));
const batches=[{time:480,width:1400,size:122,x:119,step:156,y:[97,328],names:[['レイン',null,'【蒼炎】ニュクス','ガイア','ステラ','魔人・フィーナ','フィーナ','エルフリーデ'],['ヘーメラー','2B','ゲラルデスカ','ギュスターヴ','ロウ','ティーダ','[爽涼]サクヤ',null]]},{time:30,width:1000,size:83,x:72,step:112,y:[72,236],names:[[null,'サクヤ','ジタン',null,'[情夏]エプレ','アレフ','ジュード','ヴァルト'],['ブリュンヒルド','ウラノス','ビビ','ユウナ','ダリューシュ','イヴァール','エリアノン','メリケ']]},{time:570,width:1000,size:83,x:23,step:112,y:[72,236],names:[[null,null,null,null,'ヘラネア','フィオ','ライラ','アリアディス','アイテール'],[null,null,null,null,'水着・ウルファ','カイネ','ニュクス','シグルド','ケイオス']]}];
batches.push(
 {time:20,width:1400,size:120,x:136,step:156,y:[100,332],names:[[null,null,null,null,null,null,'サバナ','ノアレス'],['紫津乃',null,null,null,null,null,'シーピー',null]]},
 {time:30,width:1000,size:83,x:72,step:112,y:[72,236],names:[[null,null,null,'水着・紫津乃'],[null,'ノート']]},
 {time:35,width:1400,size:120,x:136,step:156,y:[100,332],names:[[null,null,null,'ウラノス','朱天残夜','マエル','ライガ','アレクシア'],[null,null,null,'叢雲昏葉','ウルファ','白幽姫','リアム','ビランディ']]},
 {time:40,width:1400,size:120,x:64,step:156,y:[100,332],names:[[null,null,null,null,'シャオレイ','エーリカ'],[null,null,null,null,'ジニー']]},
 {time:50,width:1400,size:120,x:115,step:156,y:[100,332],names:[[null,'シーリーン','暁','チモシー','グウィン','アイーシャ','葉 早雲','ニャマ'],['カリーム','キエルガン','エレボス','美鈴','エイル','カーラ','コンドウィン']]}
);
let previous={};try{previous=JSON.parse(await readFile(new URL('data/portraits.json',root),'utf8'));}catch{}
const portraits=Object.fromEntries(Object.entries(previous).filter(([,p])=>!p.source.startsWith('DPTW4024.MP4')));
for(const batch of batches){const crops=batch.names.flatMap((row,j)=>row.map((name,i)=>({name,x:batch.x+i*batch.step,y:batch.y[j]}))).filter(c=>c.name).map(c=>({...c,record:records.find(r=>r.kind==='characters'&&r.name===c.name)}));if(crops.some(c=>!c.record))throw Error('画像と名称の対応を確認してください。');const filters=`[0:v]scale=${batch.width}:-1,split=${crops.length}${crops.map((_,i)=>`[p${i}]`).join('')};`+crops.map((c,i)=>`[p${i}]crop=${batch.size}:${batch.size}:${c.x}:${c.y},scale=256:256[o${i}]`).join(';');const args=['-loglevel','error','-ss',String(batch.time),'-i',video,'-filter_complex',filters];crops.forEach((c,i)=>{args.push('-map',`[o${i}]`,'-frames:v','1','-y',fileURLToPath(new URL(c.record.id+'.jpg',out)));portraits[c.record.id]={path:'assets/portraits/'+c.record.id+'.jpg',source:`DPTW4024.MP4 ${batch.time}s`,crop:{width:batch.width,x:c.x,y:c.y,size:batch.size}};});const result=spawnSync(ffmpeg,args,{windowsHide:true,encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);}
await writeFile(new URL('data/portraits.json',root),JSON.stringify(portraits,null,2));console.log(`Extracted ${Object.keys(portraits).length} portraits`);
