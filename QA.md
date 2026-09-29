# Validation

## Version 0.2 — 2026-09-26

All 13 Node checks pass. The seven added checks cover every core unlock threshold, skill limits, composite core effects, raid slot rules, null/zero distinctions, probabilities, nested mechanics round trips, v2 skill/research sharing and source research values/edges. JavaScript syntax and diff whitespace checks pass.

Browser checks used the separate `http://127.0.0.1:5174` origin; test records were then cleared by restoring an empty test backup. The normal `localhost` profile was not modified.

- Current skill total 30 displays core VI and saves; targets are retained.
- Creating and switching local profiles isolates progress and restores the original profile.
- Research shows source resources/time and saves level 3.
- Equipment fixed effects, grade columns and a test sub-ability probability save correctly.
- A six-stage test pattern copies its exact values into a core effect.
- A representative full-backup fixture restores skills, goals, private notes, favorites, portrait override, research, patterns and an inactive profile.
- A v2 alliance fixture displays current/target skills and research while excluding private notes.
- Local JPEG selection loads the cropping preview under the existing content security policy. The preview was visually inspected; image saving was not exercised in this final check.
- No console errors were observed in the sharing and restore flows.

The complete browser download-and-restore cycle was not tested. Values that were not visible in the supplied source remain unknown. Research lines cover only confirmed relationships. Online authentication and automatic synchronization remain future work.

## Earlier version 0.1 checks

## Automated checks

Six checks passed using Node's test runner with process isolation disabled in the sandbox:

1. 43 source sheets, 71 characters, 54 equipment entries, 70 abilities; unique stable IDs; representative percentages and grade values agree with Excel extraction.
2. Combined search, ownership and attribute filters; width-insensitive Japanese/ASCII normalization.
3. Alliance export excludes private notes and unrelated state.
4. Alliance import rejects invalid levels, duplicate IDs, null items and reserved keys.
5. Catalog validation rejects malformed types, names and grade arrays.
6. Missing grade values are distinct from zero.

App JavaScript syntax check passed.

## Browser checks

The validation server used a separate localhost origin on port 5175 so the deliverable on port 5174 remains free of test records.

- Dashboard with actual imported counts.
- Search for ニュクス returns the two source variants; side-by-side comparison shows their distinct troops, charge skills and core abilities.
- Saved owned ニュクス with current level 20, target 60 and a private memo. Level values remain visible after reload.
- Imported a test member snapshot (level 40, target 60); alliance comparison shows both players' values.
- Added an equipment record with G1=0, G2=1.2 and empty G3–G6. Detail correctly displays 0%, 1.2%, and 未登録.
- Imported one ability record through the catalog JSON flow; it becomes searchable.
- Source search in コアアビ returns ユウナ and the separate maintenance-column mention with their correct cell positions.
- Inspected normal desktop layout and 390×844 viewport. Navigation remains usable by horizontal scrolling; cards and forms stack vertically.
- Browser console had no error entries at the end of the tested flows.

The file picker initially used a detached input element; it was corrected to attach the input while selecting a file and remove it after selection/cancel. Both sharing and catalog imports passed after correction.

## Boundaries

The prototype does not implement cloud login, real-time synchronization, or Excel formula recalculation. Backup/restore is implemented with validation and confirmation, but a complete browser download-and-restore round trip was not exercised in this session. Spreadsheet charts, embedded images and merged layout are not reproduced by the read-only cell library.

## Character filter update

15 automated tests pass, including combined starting rarity/ownership/charge/skill filters and existence of all 70 portrait and 11 filter-icon assets. Browser verified ☆5 = 57, ☆4 = 7, ☆3 = 7; single-target + buff returns 2B; maximum charge with no player data returns zero. Reset restores ☆5. Cropped icon rendering inspected and console errors absent. No player records were changed.

## Foundation and combat states update

17 automated checks pass. Added coverage for screenshot-confirmed Stella/Epre combat states, catalog round trips, reusable template validation, incompatible destinations, independent copies and malformed variant matrices. All 71 portrait assets exist.

Browser verification on the separate 127.0.0.1 origin: created an active template with three charge states and an explicit Lv5 effect; searched it; applied to Nyx; reopened the character and saw the exact effect in charge state 3; reopened its editor and confirmed all three states. A clean backup then restored the test origin (zero record overrides). Stella's second enhancement displays power 4200 only at upgrade Lv7. No changes were made to localhost player records. Icon crops and the Epre portrait were visually inspected.

## Equipment and construction follow-up — 2026-09-26
22 automated checks pass, including source reconciliation for 485 construction levels, null versus zero, altar resource conversion, unknown laboratory level-31 units, prerequisite JSON validation/cycle detection, exact equipment AND/OR filters, power compatibility and independent pattern copies. Equipment dataset contains 146 unique names; 110 have video evidence.

Browser checks on the separate 127.0.0.1 origin confirmed:
- Equipment filter modal exposes all 60 video items. Exact attack + light-leader AND filtering gives two records; weapon subnavigation narrows to Excalibur. G6 displays power 27,000 and effects 84.3%, 59.6%, 84.3%.
- A pattern copied from Excalibur was saved, reloaded, applied to the same matching-power record, then deleted. Unknown grades remained blank. The test did not alter localhost records.
- Construction defaults to base level 25: food/wood 36,600,000, metal 54,800,000 and 70 days, with ether unknown. The facility picker, level selector, source discrepancy notice and resource cards were visually checked at the normal browser viewport.
- A clearly labeled test prerequisite was saved, survived reload, and navigated to laboratory level 24. It was then returned to unknown with its note and requirement removed. Laboratory level 31 correctly displays all resource quantities as unknown and explains the raw values.

Limitations: the supplied workbook contains no identified prerequisite-facility table. Its alternative construction tables disagree at 210 levels; these differences are exposed instead of silently merged. Equipment growth is not extrapolated from equal power alone. No production deployment or GitHub push was performed.

## Collapsible hierarchy — 2026-09-26
Character and equipment sidebar groups have separate disclosure buttons with aria-expanded/aria-controls. Parent links remain directly accessible. Open/closed preferences are stored in a dedicated browser preference key; folding does not redraw the current page. Browser checks confirmed retained search results during folding, persisted collapse after reload and navigation, and Enter-key expansion. Syntax and whitespace checks passed.

## 2026-09-27 拠点アビリティ・研究計画
- モデル検証：未獲得0／獲得済み不明の区別、現在段階のみの集計、分類別差分、前提研究の共有経路重複排除、未知費用の小計、Excel式の順序、アルケミスト÷1.1、アイテムによる所持資源のみの補正、循環・範囲外入力拒否、動画参考値の分離。
- ブラウザー：拠点一覧と研究5系統画面の表示、研究詳細のLv別費用表示、Lv5保存→完了色クラス、進捗を0に復元。運搬量Lv1で速度90＋雫10＋アルケミスト→1分50秒、食料必要180・所持100×1.1＝110・不足70を確認。
- 画面操作接続が切れたため、その後の接続線追加と表記統一の画面再確認、比較フォーム保存・アカウント切替の今回の画面検証は未実施。モデル検証と構文確認は実施。
- 実ユーザーのlocalhost保存データは検証で変更していません。検証は127.0.0.1側を使用。

## 2026-09-27 研究ツリー再構成
- 追加改修：進捗保存前後で横位置6904px・ページ縦位置351.2pxを保持することをブラウザー確認。
- 経路計画：目標「木材生産」を選択→分岐未選択では保存不可→ツリー上の「行軍速度」を選択→建設速度・行軍速度・木材生産が強調され、3段階12分・食料780。目標Lv2では4段階21分・食料1.88Kとなることを確認。個人計画の保存変更はせず、保存データの往復・重複排除・現在進捗からの差分計算は自動テストで検証。全35テスト成功。
- 5系統の全419項目について、重複・欠落・パネル重なりなし、研究所Lv変更に配置が依存しないこと、全項目の画像実体があることを自動検証。討伐の分岐合流とLv7解放の終端も検証。
- 全33テスト成功。資源のK/M境界と個数精度、既存の計算・保存検証も成功。
- ブラウザーで5系統（106/94/92/65/62項目）を切り替え、全パネルのテキスト領域で縦横のはみ出しがないことを確認。紺色のツリー、動画アイコン、接続線を目視確認。
- 検索で「最大病院」の位置へ移動。計画にアルケミスト・研究資源効率画像（128px）が読み込まれ、987.8K・2Mの資源表示を確認。今回の確認では個人の進捗・計画を保存変更していません。
- 確認画像：`.work/research-redesign/final-tree.png`。動画内で「研究中」が重なった精鋭弓兵治癒速度の元画像には、その表示の一部が残っています。未確認の前提Lvを接続線から推定して費用に算入することはありません。

## 経由Lv5と最前線ジャンプ
- 経由の初期Lv5、上限Lv1の項目、目標Lvの独立性、最右列の同順位・系統分離・未研究時を自動検証。経路関連4テスト成功。
- ブラウザーで建設速度・行軍速度の経由Lv5、木材生産の目標Lv1を確認。127.0.0.1の検証画面で最大病院収用兵士数を一時Lv1にし、横位置6584.8pxへジャンプ・金枠表示を確認後、元のLv0に戻した。未研究では横位置0へ移動。localhostの進捗は変更していない。

## 2026-09-28 武具G1・スキルMAX
- 5動画の抽出フレームを目視転記。1秒ごとの追加照合で短い選択表示も確認し、計189点の画像とG1パラメータを収録。切り出し画像一覧を目視確認し、通知が重なる箇所は別フレームまたは通知より下の範囲を使用。
- 全38テスト成功。189点の部位別件数、名称の重複なし、全G1数値と単位、画像パスの保存往復と実在、旧ID維持、既存G5・G6値の保持を検証。画面ファイルの構文確認も成功。
- ブラウザーで画像付き装備カード、G1パワー、各メイン効果を確認。127.0.0.1側に以前の編集値があるエクスカリバーは上書き設定が優先されることも確認。
- MAX目標のみで現在0のまま目標7/5/7/7/7、現在MAX後に現在7/5/7/7/7、所持チェック時に合計33・コアⅥを確認。保存せずキャンセルし個人記録は変更していない。
- 確認画像：`.work/equipment-sep28-result.png`、`.work/skill-max-result.png`。

## 2026-09-28 エンバースのコンパクト化
- エンバース専用カードを追加。属性色ラインと所持枠、5スキルの現在Lv・MAX表示、コア段階、比較・お気に入りをコンパクトに表示。
- 詳細を育成／スキル・コア／基礎データ・資料の3タブへ整理。重複した基本項目一覧を除去し、育成フォームを詳細に統合。タブ移動でも未保存入力を保持し、ヘッダーとスキル表示は入力に追従。
- 既存38テスト成功、変更した3画面ファイルの構文確認成功。ブラウザーで目標を変えず現在MAX、タブ往復の値維持、保存・再表示・一覧への所持枠とコアⅥ反映、左右キーでのタブ移動、基礎データリンクでダイアログが閉じることを確認。
- 390px幅でダイアログの横はみ出しなし（clientWidth=scrollWidth=322px）。検証後に画面幅を復元。127.0.0.1のニュクスを一時的に所持/MAXで保存し、終了時に未所持・現在/目標全0に戻した。localhostの個人記録は変更していない。
- 確認画像：`.work/ember-cards-redesign.png`、`.work/ember-detail-redesign.png`。画像の所持/MAXは動作確認用。

## レイド武具対応表（2026-09-29）
- 6体・27武具、5部位を照合。未実装3部位とデータ欠損を区別。出典リンクを併記。
- 全40テスト成功。ブラウザーで画像の読み込み、装備詳細の開閉、レイド表示からの一覧移動を確認。
- 幅390pxでページ自体の横はみ出しなし。対応表内で横スクロール可能。個人の登録値は変更しない。
- 名称未定の機甲ボスは登場確認が取れず収録待ちと明記。

## 装備詳細・素材倍加率シミュレーター
- Tactical Utility に8種族・5部位の試算を追加。所持品の個別Gとサブ、比較元との差分、判明値による組み合わせ選択に対応。
- メモリ倍加率を除外し、魔獣共通と対象種族を加算。未確認値は小計と区別。元資料補完は効果名とG1値が一致する場合のみ。
- 装備詳細は性能／所持品／基礎データに整理。旧素材倍加率の独立項目と入力欄を除去。
- 特性タブからサブ効果を選択し数値を手入力。G変更時の入力保持、G5解放、キャンセルをブラウザーで確認（試験値は未保存）。
- 全54テスト成功。最終整理後は関連8テストと構文を再確認。幅390pxの横はみ出しなし。所持品モードの条件切り替えと装備詳細表示を確認。


## 2026-09-30 アビリティ別成長パターン
- 装備詳細・パワー設定・メイン設定の入力を、アビリティ選択→成長曲線選択→段階値確認に統一。G1パワー、部位、効果系統、単位で候補を限定。
- 12000武器の属性リーダー攻撃力を標準登録。元資料の全6段階が揃いG1の一致する素材倍化率も候補化。未確認の段階は推計しない。
- 個別効果のパターン保存とバックアップ検証で部位を保持。別装備への開始％だけによる一括波及は廃止。
- エンバース詳細・基礎データも同じ入力UI。既知の同名・同単位・同段階数の効果と保存済みパターンを選択可能。
- ブラウザー：セルヴァンスの属性効果に26.5/33.1/39.7/46.3/53/59.6を反映、パワー11000で候補対象外、12000で再表示。ダイアログ幅1033pxと内容幅1033pxで横はみ出しなし。既存進捗・装備データは検証では保存していない。
- パターン一覧35分類を確認。ノアレスのチャージ詳細で威力・与ダメージ・持続時間の候補を確認。コンソールエラーなし。


## 2026-09-30 拠点アビリティを基準にした名称統一
- ability-names.jsに名称変換を集約。属性の略称、建築/建設、治癒/治療、倍加/倍化、竜/龍、行軍/行軍速度、経験値の略称を同一の効果として扱う。
- 表示用カタログ、保存済みのカスタムデータ、個人サブアビリティ、他プレイヤーの記録、共通パターンと基礎データに適用。元資料の原文、自由記述、ID、数値は維持。
- 旧表記の手動比較値を名称照合で復元。新旧の記録が異なる場合は原記録を保持し、確認対象として表示。施設防衛/拠点防衛など意味の異なる名称は統合しない。
- 研究名を統一した後も全419研究項目のアイコン対応を維持。旧名称での検索をコア・装備・研究・拠点・基礎データに反映。
