import fs from 'node:fs';let p,s;
p='public/research-plan-view.js';s=fs.readFileSync(p,'utf8');
const extraStart=s.indexOf('<div class="calc-extra">'),extraEnd=s.indexOf('</div><p class="hint">所持資源',extraStart);const extra=s.slice(extraStart+24,extraEnd); // use explicit substring below
const extras=s.slice(s.indexOf('<label class="field">雫',extraStart),extraEnd);
const nestStart=s.indexOf('<details class="research-disclosure"><summary>追加補正・所持資源'),nestEnd=s.indexOf('</details></details></div>`;',nestStart);
s=s.slice(0,nestStart)+s.slice(nestEnd+10); // retain outer disclosure closing
s=s.replace('</select></label></div><details class="research-disclosure"><summary>研究速度', '</select></label>'+extras+'</div><details class="research-disclosure"><summary>研究速度');
const stockStart=s.indexOf('<details class="research-disclosure"><summary>所持資源と不足量'),stockEnd=s.indexOf('<details class="research-disclosure"><summary>研究ごとの資源・時間',stockStart);s=s.slice(0,stockStart)+s.slice(stockEnd);
s=s.replace('partial=!r.complete||unknown','partial=r.missing.some(Boolean)||unknown');s=s.replace('所持量は資源効率アイテム選択時のみ×1.1。不足量は最低0。','');s=s.replace('未確認の前提・費用は総額に含められません。','未確認の費用は小計に含めません。表示した研究・Lvのみを計算します。');
fs.writeFileSync(p,s);
p='public/research-route-ui.js';s=fs.readFileSync(p,'utf8').replace('includeParents:true','includeParents:false').replace('登録済みの前提研究も含めた見積もりです。','選択した研究・Lvの残り分を計算します。');fs.writeFileSync(p,s);
