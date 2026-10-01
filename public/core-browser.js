import {compareCoreNames,coreFamily} from './core-order.js';
import {abilityName} from './ability-names.js';
import {abilityCategory} from './strategy-model.js';
import {groupCore,coreStage,coreThresholds,ROMAN} from './mechanics.js';
import {gameIcon} from './game-icons.js';

export function createCoreBrowser({records,state,esc,portrait,val}){
 let tab='内政',query='';
 const selected=new Set(),tabs=['内政','軍事','魔獣討伐'];
 const groups=()=>groupCore(records()).sort(([a],[b])=>compareCoreNames(a,b));
 function results(){
  const q=abilityName(query).toLowerCase();
  const shown=groups().filter(([name])=>abilityCategory(name)===tab&&(!selected.size||selected.has(name))).map(([name,rows])=>[name,rows.filter(({character})=>(name+' '+character.name).normalize('NFKC').toLowerCase().includes(q))]).filter(([,rows])=>rows.length);
  return `<p class="hint" role="status">${shown.length}種類を表示 · 色付きの数値は現在の解放段階</p>${shown.length?shown.map(([name,rows])=>`<section class="panel core-group"><div class="panel-head"><h2><small class="core-family">${esc(coreFamily(name))}</small>${esc(name)}</h2><span class="badge">${rows.length}人</span></div>${[6,5].map(count=>{
   const subset=rows.filter(({character})=>coreThresholds(character).length===count);if(!subset.length)return '';
   const thresholds=coreThresholds(subset[0].character);
   return `<div class="table-wrap"><table class="core-values"><caption>${count===6?'☆5スタート':'☆3・☆4スタート'}</caption><thead><tr><th scope="col">エンバース</th>${thresholds.map((n,i)=>`<th scope="col">${ROMAN[i]} <small>（${n?'合計'+n:'獲得時'}）</small></th>`).join('')}<th scope="col">登録</th></tr></thead><tbody>${subset.map(({character:r,effect:e})=>{
    const p=state().progress[r.id]||{},stage=coreStage(p.owned,p.skills,r);
    return `<tr><th scope="row"><button class="core-character core-character-link" data-action="detail" data-id="${esc(r.id)}" aria-label="${esc(r.name)}の詳細を開く">${portrait(r)}<span>${esc(r.name)}<small>${esc(r.rarity)} ${gameIcon(r.element,esc)} ${gameIcon(r.troop,esc)}</small></span><span aria-hidden="true">›</span></button></th>${thresholds.map((_,i)=>`<td class="${stage===i+1?'current-core':''}">${e.values[i]==null?'—':val(e.values[i])+esc(e.unit)}</td>`).join('')}<td><button data-domain="configure" data-id="${esc(r.id)}">設定</button></td></tr>`;
   }).join('')}</tbody></table></div>`;
  }).join('')}</section>`).join(''):'<div class="empty-state">該当するアビリティはありません。選択や検索条件を変更してください。</div>'}`;
 }
 function controls(){const names=groups().filter(([name])=>abilityCategory(name)===tab).map(([name])=>name);return `<div class="actions"><strong>表示するアビリティ</strong><button type="button" data-core-clear>選択を解除</button><span class="hint">未選択はすべて表示 · 複数選択できます</span></div><div class="core-choices">${names.map(name=>`<label class="core-choice"><input type="checkbox" data-core-choice="${esc(name)}" ${selected.has(name)?'checked':''}><span>${esc(name)}</span></label>`).join('')}</div>`;}
 function page(){return `<div class="page-heading"><div><div class="eyebrow">CORE ABILITIES</div><h1>効果から探すコアアビリティ</h1><p class="subtitle">分類と効果を選び、エンバースの段階別の数値を比較。</p></div><button data-domain="patterns">上昇パターンを管理</button></div><div class="strategy-tabs" role="tablist" aria-label="コアアビリティの分類">${tabs.map(t=>`<button role="tab" data-core-tab="${t}" aria-selected="${tab===t}" class="${tab===t?'primary':''}">${t}</button>`).join('')}</div><section class="panel core-filter"><div id="core-options">${controls()}</div><label class="field">効果・エンバース名で検索<input id="core-search" value="${esc(query)}" placeholder="研究速度、歩兵、ニュクスなど"></label></section><p class="hint">見出しの合計値は解放に必要なスキル合計です。「—」は未確認。エンバースを選択すると詳細を開きます。</p><div id="core-groups" role="tabpanel">${results()}</div>`;}
 const refresh=()=>{const root=document.querySelector('#core-groups');if(root)root.innerHTML=results();};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-core-tab],[data-core-clear]');if(!b)return;if(b.hasAttribute('data-core-tab')){tab=b.dataset.coreTab;selected.clear();document.querySelectorAll('[data-core-tab]').forEach(el=>{el.setAttribute('aria-selected',String(el===b));el.classList.toggle('primary',el===b);});}else selected.clear();document.querySelector('#core-options').innerHTML=controls();refresh();});
 document.addEventListener('change',e=>{if(!e.target.matches('[data-core-choice]'))return;const name=e.target.dataset.coreChoice;e.target.checked?selected.add(name):selected.delete(name);refresh();});
 document.addEventListener('input',e=>{if(e.target.id==='core-search'){query=e.target.value;refresh();}});
 document.addEventListener('keydown',e=>{if(!e.target.matches('[data-core-tab]')||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const items=[...document.querySelectorAll('[data-core-tab]')],i=items.indexOf(e.target),n=e.key==='Home'?0:e.key==='End'?items.length-1:(i+(e.key==='ArrowRight'?1:-1)+items.length)%items.length;items[n].click();items[n].focus();});
 return {page};
}
