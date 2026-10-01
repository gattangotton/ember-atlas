import {abilityName} from './ability-names.js';
const families=[['建設',/建設/],['研究',/研究/],['生産',/生産/],['採集',/採集/],['運搬・資源保護',/運搬|資源保護/],['兵士の訓練・治療',/訓練|治療|病院/],['属性リーダー',/属性リーダー/],['兵種',/歩兵|弓兵|騎兵/],['戦闘・防衛',/攻撃|防御|防衛|反撃|スキル/],['行軍・部隊',/行軍|部隊/]];
const effects=['攻撃力','防御力','素材倍化率','メモリ倍化率','獲得経験値','速度','資源効率','量'];
export function coreFamily(name){const n=abilityName(name);if(/^対/.test(n))return '討伐：'+(effects.find(e=>n.endsWith(e))||'その他');return families.find(([,re])=>re.test(n))?.[0]||'その他';}
export function compareCoreNames(a,b){const x=coreFamily(a),y=coreFamily(b);const order=[...families.map(([label])=>label),...effects.map(e=>'討伐：'+e),'討伐：その他','その他'];const rank=n=>{const i=order.indexOf(n);return i<0?999:i;};
 const variants=['火','水','風','雷','土','光','闇','歩兵','弓兵','騎兵','食料','木材','金属','エーテル'];
 const variant=n=>{const i=variants.findIndex(v=>n.startsWith(v));return i<0?99:i;};
 return rank(x)-rank(y)||variant(a)-variant(b)||abilityName(a).localeCompare(abilityName(b),'ja');
}
