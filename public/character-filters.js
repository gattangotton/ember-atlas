import {gameImages} from './game-image-paths.js';
import {SKILLS,inferCharge} from './mechanics.js';
export const defaultCharacterFilters=()=>({rarity:'☆5',ownership:'',target:'',extra:'',shape:'',skills:{}});
export function matchesCharacter(r,p={},f=defaultCharacterFilters()){
 if(r.kind!=='characters')return true;
 if(f.rarity&&r.rarity!==f.rarity)return false;
 if(f.ownership==='owned'&&!p.owned||f.ownership==='missing'&&p.owned)return false;
 const charge=r.skills?.charge||inferCharge(r.charge);
 if(f.target&&charge.target!==f.target||f.shape&&charge.shape!==f.shape)return false;
 const extras=[charge.extra,r.skills?.active?.extra||'unknown'],hasBuff=extras.some(x=>x==='buff'||x==='both'),hasDebuff=extras.some(x=>x==='debuff'||x==='both');const extra=hasBuff&&hasDebuff?'both':hasBuff?'buff':hasDebuff?'debuff':extras.includes('unknown')?'unknown':'none';
 if(f.extra&&extra!==f.extra&&!(['buff','debuff'].includes(f.extra)&&extra==='both'))return false;
 return Object.entries(f.skills||{}).every(([k,v])=>{const n=p.skills?.[k]||0,max=SKILLS[k].max;return !v||(v==='unknown'?n===0:v==='max'?n===max:v==='training'?n>0&&n<max:v==='goal'?(p.targetSkills?.[k]||0)>n:n===Number(v));});
}
const images={'水':'water','火':'fire','風':'wind','雷':'thunder','土':'earth','光':'light','闇':'dark','歩兵':'infantry','騎兵':'cavalry','弓兵':'archer','統率':'leader'};
export function characterFilterUI(f,element,troop){
 const row=(label,key,values,selected)=>`<fieldset class="filter-row"><legend>${label}</legend><div>${values.map(([value,text])=>`<button type="button" data-character-filter="${key}" data-value="${value}" aria-pressed="${selected===value}" class="filter-chip ${selected===value?'selected':''}">${images[text]?`<img src="${gameImages.icons[images[text]]||`assets/filters/${images[text]}.png`}" alt="">`:''}<span>${text}</span></button>`).join('')}</div></fieldset>`;
 return `<section class="character-filters" aria-label="エンバースの絞り込み">${row('初期レア度','rarity',[['☆5','☆5スタート'],['☆4','☆4スタート'],['☆3','☆3スタート'],['','すべて']],f.rarity)}${row('属性','element',[['','すべて'],...['火','水','風','雷','土','光','闇'].map(x=>[x,x])],element)}${row('兵種','troop',[['','すべて'],...['歩兵','騎兵','弓兵','統率'].map(x=>[x,x])],troop)}${row('所持状況','ownership',[['','すべて'],['owned','所持'],['missing','未所持']],f.ownership)}${row('チャージ対象','target',[['','すべて'],['single','単体'],['multiple','複数'],['unknown','未確認']],f.target)}${row('範囲','shape',[['','すべて'],['fan','扇形'],['circle','円形'],['rectangle','長方形'],['none','範囲なし'],['unknown','未確認']],f.shape)}${row('チャージ・アクティブの追加効果','extra',[['','すべて'],['buff','バフ'],['debuff','デバフ'],['both','両方'],['none','なし'],['unknown','未確認']],f.extra)}<details><summary>各スキルの育成状況で絞り込む</summary><p class="hint">複数の条件はすべて満たすキャラを表示します。育成中はLv1～上限未満、未登録はLv0です。</p>${Object.entries(SKILLS).map(([k,s])=>row(s.label,'skill-'+k,[['','すべて'],['unknown','未登録'],['training','育成中'],['max','最大'],['goal','目標未達'],...Array.from({length:s.max},(_,i)=>[String(i+1),'Lv'+(i+1)])],f.skills[k]||'')).join('')}</details></section>`;
}
