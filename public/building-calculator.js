import {aggregateAbilities,applyAllianceSupport} from './strategy-model.js';
import {calculationControls} from './research-plan-view.js';
import {formatBuildingResource,formatDuration} from './building-model.js';

export function validateBuildingCalculation(input={}){
 const c={useAuto:true,speed:0,efficiency:0,fixed:0,fountain:0,support:0,drop:0,blacksmith:false,resourceItem:false,...input};
 if(![c.speed,c.efficiency,c.fixed,c.drop,c.support].every(Number.isFinite)||c.speed<0||c.speed>1e5||c.efficiency<0||c.efficiency>1e5||c.fixed<0||c.fixed>1e9||c.drop<0||c.drop>10||!Number.isInteger(c.support)||c.support<0||c.support>30||![0,2.5,5,7.5].includes(c.fountain))throw Error('建設の補正値を確認してください。');
 return c;
}
export function calculateBuilding(level,input){
 const c=validateBuildingCalculation(input),valid=v=>Number.isFinite(v)&&v>=0;
 const resources=level.resources.map(v=>valid(v)?Math.ceil(Math.ceil(v/(1+c.efficiency/100))/(c.resourceItem?1.1:1)):null);
 const seconds=valid(level.seconds)?applyAllianceSupport(Math.max(0,level.seconds/(1+(c.speed+c.fountain+c.drop)/100)/(c.blacksmith?1.1:1)-c.fixed),c.support):null;
 return {resources,seconds};
}
export function createBuildingCalculator({state,records,nodes,evidence,esc,refresh}){
 let config=validateBuildingCalculation(),owner=null,preview=null;
 function panel(level){
  preview=level;
  if(owner!==state().profile.id){owner=state().profile.id;config=validateBuildingCalculation();}
  const groups=aggregateAbilities({state:state(),records:records(),nodes:nodes(),evidence:evidence()});
  const auto=['建設速度|%','建設資源効率|%','建設加速(秒)|秒'].map(key=>groups.find(g=>g.key===key)||{total:0,unknown:0});
  const c=config.useAuto?{...config,speed:auto[0].total,efficiency:auto[1].total,fixed:auto[2].total}:config;
  let r;try{r=calculateBuilding(level,c);}catch(e){return `<p role="alert">${esc(e.message)}</p>`;}
  return `<section class="building-calculator"><h3>Lv.${level.level}への建設計算</h3><form data-building-calculator>${calculationControls({...config,alchemist:config.blacksmith},auto,esc,'building').replace('name="alchemist"','name="blacksmith"')}</form><div class="building-estimate-output"><div class="estimate-status">${c.useAuto&&auto.some(g=>g.unknown)||r.resources.includes(null)||r.seconds===null?'確認済み範囲の見積もり':'登録条件での見積もり'}<span>このLvの1段階分</span></div><div class="research-estimate"><div class="estimate-time"><span>必要時間</span><strong>${formatDuration(r.seconds)}</strong></div>${['食料','木材','金属','エーテル'].map((name,i)=>`<div><span>${name}</span><strong>${formatBuildingResource(r.resources[i])}</strong></div>`).join('')}</div><p class="calc-applied">速度 ${c.speed}% ／ 資源効率 ${c.efficiency}% ／ 加速 ${c.fixed}秒<br>泉 ＋${c.fountain}% ／ 同盟支援 ${c.support}回 ／ 雫 ＋${c.drop}%${c.blacksmith?' ／ ブラックスミスあり':''}${c.resourceItem?' ／ 建設資源効率1.1倍あり':''}</p><details class="research-disclosure"><summary>基本資源・時間と計算方法</summary><p>基本時間：${formatDuration(level.seconds)}<br>${['食料','木材','金属','エーテル'].map((n,i)=>n+' '+formatBuildingResource(level.resources[i])).join(' ／ ')}</p><p>必要資源＝基本資源÷（1＋建設資源効率÷100）を切り上げ。資源効率アイテム適用時はさらに÷1.1を切り上げた用意量です。</p><p>時間＝max（0, 基本時間÷（1＋（建設速度＋泉＋雫）÷100）÷ブラックスミス倍率−建設加速秒数）。ブラックスミスありは1.1倍。同盟支援は残り時間の1%または60秒の大きい方を、選択回数分順に差し引きます。最終秒数を切り上げます。</p><p>泉や雫を拠点の記録へ含めた場合はここでは選択しないでください。支援は直ちに受ける想定です。前提施設の建設費用・時間は含みません。資源効率の除算と端数処理は研究と共通の見積もり方式です。資源表示のみ小数第2位を四捨五入します。</p></details></div></section>`;
 }
 function update(e){
  const form=e.target.closest('[data-building-calculator]');if(!form||e.type==='input'&&e.target.type!=='number')return;
  const output=document.querySelector('.building-estimate-output'),key=e.target.name;if(!Object.hasOwn(config,key))return;
  if(!form.checkValidity()){output.textContent='入力値の範囲を確認してください。';return;}
  try{config=validateBuildingCalculation({...config,[key]:e.target.type==='checkbox'?e.target.checked:Number(e.target.value)});
   const template=document.createElement('template');template.innerHTML=panel(preview);output.innerHTML=template.content.querySelector('.building-estimate-output').innerHTML;
   if(key==='useAuto')for(const name of ['speed','efficiency','fixed']){const old=form.elements[name],next=template.content.querySelector('[name="'+name+'"]');old.readOnly=next.readOnly;old.value=next.value;}
  }catch(error){output.textContent=error.message;}
 }
 document.addEventListener('input',update);
 document.addEventListener('change',update);
 document.addEventListener('submit',e=>{if(e.target.matches('[data-building-calculator]'))e.preventDefault();});
 return {panel};
}
