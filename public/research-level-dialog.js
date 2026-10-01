import {numericCost} from './strategy-model.js';
import {researchResource,researchTime,researchNumber} from './research-plan-view.js';
export function openResearchLevels(node,spec,current,esc){
 document.getElementById('research-level-dialog')?.remove();
 const d=document.createElement('dialog');
 d.id='research-level-dialog';d.className='wide-dialog';d.setAttribute('aria-labelledby','research-level-title');
 d.innerHTML=`<div class="dialog-head"><div><h2 id="research-level-title">${esc(node.name)}：各Lvの資源・時間</h2><p class="hint">各Lvへの1回分の基本値です。短縮・資源効率の補正前。</p></div><button type="button" data-level-close aria-label="各Lvの詳細を閉じる">×</button></div><div class="table-wrap"><table class="research-estimate-table"><thead><tr><th>Lv</th><th>食料</th><th>木材</th><th>金属</th><th>エーテル</th><th>基本時間</th><th>到達時の累計効果<br>${esc(spec.ability)}</th></tr></thead><tbody>${node.levels.slice(0,node.documentedMax).map((values,i)=>`<tr class="${i<current?'research-finished-row':''}"><th>${i<current?'✓ ':''}Lv.${i+1}</th>${values.slice(0,4).map(v=>`<td>${researchResource(numericCost(v))}</td>`).join('')}<td>${researchTime(numericCost(values[4]))}</td><td>${spec.values[i]==null?'未登録':researchNumber(spec.values[i])+esc(spec.unit)}</td></tr>`).join('')}</tbody></table></div><p class="hint">K＝千、M＝百万。未確認は0と区別します。</p><div class="form-actions"><button type="button" data-level-close>研究詳細に戻る</button></div>`;
 let downOutside=false;
 const outside=e=>{const r=d.getBoundingClientRect();return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;};
 d.addEventListener('pointerdown',e=>{downOutside=e.target===d&&outside(e);});
 d.addEventListener('click',e=>{if(e.target.closest('[data-level-close]')||(e.target===d&&downOutside&&outside(e)))d.close();downOutside=false;});
 d.addEventListener('close',()=>d.remove(),{once:true});
 document.body.append(d);d.showModal();
}
