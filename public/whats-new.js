// Keep the current release's discovery markers in one place.
export const NEW_ROUTES = new Set(['characters', 'raids', 'consumables', 'research', 'construction', 'memories', 'equipment', 'loot', 'gather', 'attack']);
export const NEW_DURATION_MS=14*24*60*60*1000;
export const RELEASE_DATE='2026-10-17';
export const PLANNER_DATE='2026-10-28';
const releaseTime=date=>Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(date)?date+'T00:00:00+09:00':date);
export function isNew(updatedAt,now=Date.now()) {
 const start=releaseTime(updatedAt);
 return Number.isFinite(start)&&now>=start&&now<start+NEW_DURATION_MS;
}
export function newBadge(updatedAt=RELEASE_DATE,now=Date.now()) {
 return isNew(updatedAt,now)?`<span class="feature-new" data-new-expires="${releaseTime(updatedAt)+NEW_DURATION_MS}" aria-label="新機能"><span>NEW</span><i aria-hidden="true">✦</i></span>`:'';
}
export const ROUTE_UPDATES=Object.fromEntries([...NEW_ROUTES].map(route=>[route,['loot','attack'].includes(route)?PLANNER_DATE:RELEASE_DATE]));
export const routeNewBadge=(route,now=Date.now())=>ROUTE_UPDATES[route]?newBadge(ROUTE_UPDATES[route],now):'';
export const NEW_CONTENT_IDS=new Set(['characters-game-82','equipment-pc-20016','memory-78','memory-79','memory-10032']);
export const CONTENT_UPDATES=Object.fromEntries([...NEW_CONTENT_IDS].map(id=>[id,RELEASE_DATE]));
export const contentNewBadge=(id,now=Date.now())=>CONTENT_UPDATES[id]?newBadge(CONTENT_UPDATES[id],now):'';
export function removeExpiredNewBadges(root,now=Date.now()){
 for(const badge of root.querySelectorAll('[data-new-expires]'))if(Number(badge.dataset.newExpires)<=now)badge.remove();
}
export function releaseHighlights() {
 return `<section class="release-highlights" aria-labelledby="latest-features"><div class="release-highlights-heading"><div>${newBadge()}<h2 id="latest-features">新エンバース・武具・メモリのデータを更新。</h2></div><time datetime="2026-10-17">2026.10.17 UPDATE</time></div><div class="release-highlight-grid"><a href="#attack"><img src="assets/game/research/00122.png" alt="" width="44" height="44"><div><h3>種族別攻撃力に適性スコアを追加</h3><p>スキル・属性相性・編成ボーナスで候補を比較。リーダーを固定したサブ提案と、補正専用サポートも選択。</p><span>攻撃力シミュレーターへ →</span></div></a><a href="#characters"><img src="assets/game/hero-thumbnail-00082.png" alt="" width="44" height="44"><div><h3>リアム[夜魔]を追加</h3><p>全スキルLv・コア効果と土属性／弓兵の編成データを反映。チャージのデバフも攻撃評価へ。</p><span>エンバース図鑑へ →</span></div></a><a href="#memories"><img src="assets/game/consumable/10002.png" alt="" width="44" height="44"><div><h3>新しいメモリ3種を追加</h3><p>書庫の奥の吸血鬼・エンバース対抗大運動会・ゲーリュオーン。固定効果・画像・確認できた入手先を収録。</p><span>メモリ図鑑へ →</span></div></a><a href="#equipment"><img src="assets/game/consumable/00001.png" alt="" width="44" height="44"><div><h3>チリアットグローブを追加</h3><p>対精霊の攻撃力・素材倍化率・メモリ倍化率と、G1～G6の数値を収録。レイド武具一覧にも反映。</p><span>武具の所持品へ →</span></div></a></div></section>`;
}
export function consumableGuide() {
 return `<section class="panel consumable-guide" id="guide-consumables"><div class="release-highlights-heading"><h2>${newBadge()} 資源・加速アイテムの使い方</h2><a class="button-link" href="#consumables">ツールを開く →</a></div><ol><li><b>アイテムの所持数を入力</b><p>資源・加速を切り替え、上の種類カードを選びます。「入力するアイテムを選ぶ」を開き、必要なものにチェックすると個数欄が表示されます。所持数がある項目は自動で表示し、0にすると表示を解除できます。選択と個数は自動保存。資源はM（100万）、加速は日・時間で集計します。「手持ち」はアイテムを除いた現在の資源量です。</p></li><li><b>目標と不足を確認</b><p>「目標と手持ち資源」を展開して必要資源をM単位で設定。加速の目標は日・時間・分・秒で入力します。加速の個数欄の下に、合計の日・時間・分を表示します。逆算は1個あたりの時間を選ぶと、目標全体と不足分の必要個数が分かります。「全種類の比較表」を展開すると一覧も見られます。汎用加速は各用途の比較へ含められますが、在庫は共通です。</p></li><li><b>G3・G4 BOXの使い道を試算</b><p>「選べる資源獲得BOX」を展開して所持箱数を入力し「不足へ自動割り当て」を押します。提案は手動で変更でき、合計が所持数を超える割り当ては保存されません。G3は食料・木材・金属のいずれか0.5M、またはエーテル0.25M。G4はそれぞれ1M、または0.5Mです。</p><p>未割り当ての箱は資源量に加算せず、割り当ては「BOX予定」として不足へ反映します。ゲームで開封したら、箱の所持数と割り当てを減らし、獲得した資源アイテムへ記録を移してください。</p></li><li><b>研究・建設の見積もりを取り込む</b><p>研究ツリー・施設建設で条件を設定し、計算結果の「所持アイテムと比較」を押します。資源と時間の目標が置き換わり、所持数は保持されます。条件変更後は再取り込みし、BOXも必要に応じて再割り当てしてください。</p></li></ol><p class="tutorial-tip">計算では在庫を消費しません。記録はプレイヤー別にこのブラウザーへ保存され、バックアップにも含まれます。</p></section>`;
}
