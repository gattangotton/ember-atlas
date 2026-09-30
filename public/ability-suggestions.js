import {EQUIPMENT_FILTERS} from './equipment-model.js';
import {abilityName} from './ability-names.js';
export function matchingAbilities(query,records){
 const q=abilityName(query).toLowerCase();if(!q)return [];
 const names=[...Object.values(EQUIPMENT_FILTERS).flat(),'威力','回復量',...records.flatMap(r=>[...(r.coreEffects||[]),...(r.mainAbilities||[]),...Object.values(r.skills||{}).flatMap(s=>[...(s.effects||[]),...(s.variants||[]).flatMap(v=>v.effects||[])])]).map(e=>e.name)];
 return [...new Set(names.map(abilityName))].filter(n=>n.toLowerCase().includes(q)).sort((a,b)=>(a.startsWith(q)?0:1)-(b.startsWith(q)?0:1)||a.length-b.length||a.localeCompare(b,'ja')).slice(0,12);
}
export function installAbilitySuggestions(records,esc){
 document.addEventListener('input',e=>{const input=e.target;if(!input.matches('[data-growth-prefix] input[name$="-name"]'))return;const row=input.closest('[data-growth-prefix]');let box=row.querySelector('.ability-suggestions');if(!box){box=document.createElement('div');box.className='ability-suggestions';box.setAttribute('aria-label','アビリティ名の候補');input.after(box);}box.innerHTML=matchingAbilities(input.value,records()).map(n=>`<button type="button" data-ability-suggestion="${esc(n)}">${esc(n)}</button>`).join('');});
 document.addEventListener('click',e=>{const b=e.target.closest('[data-ability-suggestion]');if(!b)return;const box=b.parentElement,input=box.previousElementSibling;input.value=b.dataset.abilitySuggestion;input.dispatchEvent(new Event('input',{bubbles:true}));box.innerHTML='';input.focus();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&e.target.closest('[data-growth-prefix]')){const box=e.target.closest('[data-growth-prefix]').querySelector('.ability-suggestions');if(box?.children.length){box.innerHTML='';e.preventDefault();e.stopPropagation();}}});
}
