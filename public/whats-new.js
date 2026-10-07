// Keep the current release's discovery markers in one place.
export const NEW_ROUTES = new Set(['consumables', 'research', 'construction']);
export function newBadge() {
 return '<span class="feature-new" aria-label="新機能"><span>NEW</span><i aria-hidden="true">✦</i></span>';
}
export function releaseHighlights() {
 return `<section class="release-highlights" aria-labelledby="latest-features"><div class="release-highlights-heading"><div>${newBadge()}<h2 id="latest-features">資源と加速を、次の目標へ。</h2></div><time datetime="2026-10-08">2026.10.08 UPDATE</time></div><div class="release-highlight-grid"><a href="#consumables"><img src="assets/game/consumable/00003.png" alt="" width="44" height="44"><div><h3>資源・加速アイテム</h3><p>4資源・5用途の加速を集計。目標との差と必要個数を逆算。</p><span>所持数を入力 →</span></div></a><a href="#consumables"><img src="assets/game/consumable/10002.png" alt="" width="44" height="44"><div><h3>選べるG3・G4資源BOX</h3><p>不足する資源へ割り当てを提案。未開封の在庫を使って試算できます。</p><span>割り当てを考える →</span></div></a><a href="#guide"><img src="assets/game/consumable/00083.png" alt="" width="44" height="44"><div><h3>研究・建設と連携</h3><p>見積もりを目標へ取り込み、今の所持品で足りるか確認。</p><span>新機能の使い方 →</span></div></a></div></section>`;
}
export function consumableGuide() {
 return `<section class="panel consumable-guide" id="guide-consumables"><div class="release-highlights-heading"><h2>${newBadge()} 資源・加速アイテムの使い方</h2><a class="button-link" href="#consumables">ツールを開く →</a></div><ol><li><b>アイテムの所持数を入力</b><p>資源・加速を切り替え、上の種類カードを選びます。個数は自動保存。資源はM（100万）、加速は日・時間で集計します。「手持ち」はアイテムを除いた現在の資源量です。</p></li><li><b>目標と不足を確認</b><p>必要資源をM単位、加速を日・時間・分・秒で入力します。加速の逆算表は、1分や5分など、それぞれのアイテムだけで賄う場合の個数です。汎用加速は各用途の比較へ含められますが、在庫は共通です。</p></li><li><b>G3・G4 BOXの使い道を試算</b><p>所持箱数を入力し「不足へ自動割り当て」を押します。提案は手動で変更でき、合計が所持数を超える割り当ては保存されません。G3は食料・木材・金属のいずれか0.5M、またはエーテル0.25M。G4はそれぞれ1M、または0.5Mです。</p><p>未割り当ての箱は資源量に加算せず、割り当ては「BOX予定」として不足へ反映します。ゲームで開封したら、箱の所持数と割り当てを減らし、獲得した資源アイテムへ記録を移してください。</p></li><li><b>研究・建設の見積もりを取り込む</b><p>研究ツリー・施設建設で条件を設定し、計算結果の「所持アイテムと比較」を押します。資源と時間の目標が置き換わり、所持数は保持されます。条件変更後は再取り込みし、BOXも必要に応じて再割り当てしてください。</p></li></ol><p class="tutorial-tip">計算では在庫を消費しません。記録はプレイヤー別にこのブラウザーへ保存され、バックアップにも含まれます。</p></section>`;
}
