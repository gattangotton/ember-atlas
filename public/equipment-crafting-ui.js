import {materialArt} from './material-art.js';
import {craftingData} from './equipment-crafting-data.js';
const materialIds={115:40001,116:40002,117:40003,118:40004,218:10071,220:10072,219:10073,217:10074,216:50163};
const sources={
 sea:[['選べる海中王国素材BOX','ワールドアリーナショップ','2,000pt／箱・月5箱'],['選べる海中王国素材BOX','ロイヤルコインショップ','2,000枚／箱・月20箱'],['選べる海中王国素材BOX','エンバースメダル(虹)ショップ','200枚／箱・月10箱'],['選べる海中王国素材BOX','海中王国素材オーブパック','課金パック。内容・購入上限はゲーム内で確認'],['布・珊瑚・貝殻・宝珠','選べる海中王国素材BOXを開封','1箱につき布8／珊瑚4／貝殻2／宝珠1のいずれか']],
 behemoth:[['爪・尻尾・角・触角','ゾーンⅠ～Ⅲ・集結魔獣ベヒーモス討伐','2026/11/1～11/30 23:59 JST。ドロップ報酬'],['ベヒーモス素材BOX','入手先未確認','BOX自体の獲得経路は確認でき次第追加']],
 blueprint:[['FF13コラボコイン','スペシャルクエスト対象の魔獣討伐','基本：通常10枚／集結50枚。コア効果等で増加'],['設計図・運命を乗り越える剣閃','専用ショップでコインと交換','ショップ：2026/12/7 23:59 JSTまで']]
};
export function craftingTables(series,esc){
 const mats=series.materials.map(([image,name])=>({image,name,id:materialIds[image]}));
 const head=mats.map(m=>`<th scope="col">${materialArt(m.image)}${esc(m.name)}</th>`).join('');
 const cells=g=>mats.map(m=>`<td>${g[m.id]?g[m.id].toLocaleString('ja-JP'):'—'}</td>`).join('');
 const boxCount=g=>mats.reduce((sum,m)=>sum+Math.ceil((g[m.id]||0)/({40001:8,40002:4,40003:2,40004:1}[m.id]||1)),0);
 return `<h3>素材・BOXの入手先</h3><div class="craft-table-wrap"><table class="craft-table"><thead><tr><th>素材・BOX</th><th>入手先</th><th>条件・期間</th></tr></thead><tbody>${sources[series.key].map(row=>`<tr>${row.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><h3>武具1個をG6まで育てる新素材の合計</h3><p class="hint">未製作→G1の製作分と、G2～G6の強化分を合算。既存素材・エーテルは含みません。「—」は使用なし。</p><div class="craft-table-wrap"><table class="craft-table craft-costs"><thead><tr><th scope="col">武具</th>${head}${series.key==='sea'?'<th scope="col">選べるBOX換算</th>':''}</tr></thead><tbody>${series.ids.map(id=>{const r=craftingData[id];return `<tr><th scope="row">${esc(r.name)}</th>${cells(r.total)}${series.key==='sea'?`<td>${boxCount(r.total)}箱</td>`:''}</tr>`;}).join('')}</tbody></table></div>${series.key==='sea'?'<p class="hint">BOX換算は所持素材0個から、素材ごとに必要箱数を切り上げて合計。余った素材は他の武具に使えます。</p>':''}<details class="craft-grade-breakdown"><summary>G1～G6の段階別内訳を見る</summary>${series.ids.map(id=>{const r=craftingData[id];return `<h4>${esc(r.name)}</h4><div class="craft-table-wrap"><table class="craft-table craft-costs"><thead><tr><th>段階</th>${head}</tr></thead><tbody>${r.grades.map((g,i)=>`<tr><th scope="row">${i===0?'G1製作':`G${i}→G${i+1}`}</th>${cells(g)}</tr>`).join('')}</tbody></table></div>`;}).join('')}</details>`;
}
