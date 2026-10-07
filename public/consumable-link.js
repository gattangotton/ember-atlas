import {newBadge} from './whats-new.js';
export function consumableEstimateButton({kind,resources,seconds,label,partial=false},esc){
 const disabled=partial||seconds==null||resources.some(v=>v==null);
 const value={kind,resources,seconds:seconds==null?null:Math.ceil(seconds),label};
 return `<div class="consumable-estimate-link"><button type="button" data-consumable-estimate="${esc(JSON.stringify(value))}" ${disabled?'disabled':''}>所持アイテムと比較 → ${newBadge()}</button><small>${disabled?'未確認の費用・効果を入力すると比較できます。':'資源・時間を目標へ転記します（既存の目標を置き換え）。'}</small></div>`;
}
