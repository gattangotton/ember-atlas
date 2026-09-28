import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../public/data/',import.meta.url),s=JSON.parse(await readFile(new URL('sheets.json',root),'utf8'));
const finite=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0?v:null;
const resources=['食料','木材','金属','エーテル'],groups=new Map();
const categories={拠点:'拠点・支援',研究所:'拠点・支援',祭壇:'拠点・支援',軍事指令所:'軍事・防衛',防衛施設:'軍事・防衛',鍛冶屋:'拠点・支援',ショップ:'拠点・支援',歩兵訓練所:'軍事・防衛',弓兵訓練所:'軍事・防衛',騎兵訓練所:'軍事・防衛',農場:'資源・保管',製材所:'資源・保管',鉄工所:'資源・保管',エーテル抽出所:'資源・保管',病院:'拠点・支援',倉庫:'資源・保管'};
for(const row of s['建設時間計算機']){
 const c=row.cells,m=typeof c.A==='string'&&c.A.match(/^(.+?)(\d+)$/);if(!m||!categories[m[1]])continue;
 const name=m[1],level=+m[2];if(!groups.has(name))groups.set(name,{id:'building-'+(groups.size+1),name,category:categories[name],levels:[]});
 const raw=['C','D','E','F'].map(k=>c[k]??null),unitUnknown=name==='研究所'&&level===31;
 const entry={level,seconds:finite(c.B),resources:raw.map(v=>unitUnknown?null:finite(v)===null?null:Math.round(v*(name==='祭壇'?1e6:1))),rawResources:raw,source:{sheet:'建設時間計算機',row:row.row},requirements:null,notes:[],differences:[]};
 if(unitUnknown)entry.notes.push('研究所Lv31の資源は原表に159.75・287.56と記載されていますが、前後の行と単位が一致しないため未確認としています。');
 if(name==='祭壇')entry.notes.push('祭壇の資源は「祭壇について」のk/M表記と照合し、計算機の数値をM単位として換算しています。');
 for(const sheet of ['建設時間一覧表①','建設時間一覧表②'])for(const r of s[sheet])for(const cols of [['A','B','C','D','E','F','G'],['L','M','N','O','P','Q','R'],['W','X','Y','Z','AA','AB','AC']]){
  if(r.cells[cols[0]]!==name||r.cells[cols[1]]!==level)continue;
  const alt=cols.slice(3).map(k=>finite(r.cells[k])===null?null:Math.round(r.cells[k]*1e6));
  const differences=alt.flatMap((v,i)=>v!==null&&entry.resources[i]!==null&&v!==entry.resources[i]?[`${resources[i]}：${v.toLocaleString('en-US')}`]:[]);
  const sec=finite(r.cells[cols[2]]);if(sec!==null&&entry.seconds!==null&&Math.abs(sec-entry.seconds)>.01)differences.push(`建設時間：${sec}秒`);
  if(differences.length)entry.differences.push({source:{sheet,row:r.row},values:differences});
 }
 if(name==='祭壇'){
  const alt=s['祭壇について'].find(r=>r.cells.A===level),match=String(alt?.cells.D).match(/^([\d.]+)([kM])$/);
  if(match){const n=Math.round(+match[1]*(match[2]==='M'?1e6:1000));if(n!==entry.resources[0])entry.differences.push({source:{sheet:'祭壇について',row:alt.row},values:[`必要資源：${n.toLocaleString('en-US')}（原表 ${alt.cells.D}）`]});}
 }
 groups.get(name).levels.push(entry);
}
const output={version:1,resourceNames:resources,sourceFile:'エバスト　データベース色々＿共有元.xlsx',policy:'資源は建設時間計算機の値を採用。空欄・ハイフン・単位不明は未確認。別表はM単位に換算して差異を表示。前提施設Lvの記載は確認できていません。',buildings:[...groups.values()]};
await writeFile(new URL('buildings.json',root),JSON.stringify(output,null,2));console.log({buildings:groups.size,levels:output.buildings.reduce((n,b)=>n+b.levels.length,0),differences:output.buildings.flatMap(b=>b.levels).filter(l=>l.differences.length).length});
