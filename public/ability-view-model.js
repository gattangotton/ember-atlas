import {abilityName} from './ability-names.js';
export const BASE_CATEGORIES=['内政','軍事','魔獣討伐'];
export const abilityDelta=g=>g.manual?.total==null?null:(Math.round((g.manual.total-g.total)*1e6)/1e6||0);
export const needsAbilityReview=g=>!!(g.unknown||g.manualConflicts?.length||Math.abs(abilityDelta(g)||0)>1e-6);
export function abilityOverview(rows,{category='内政',query='',filter='all',page=1,pageSize=20}={}){
 const normalize=s=>abilityName(String(s)).normalize('NFKC').toLocaleLowerCase('ja').replace(/\s+/g,'');
 const q=normalize(query),categoryRows=rows.filter(g=>g.category===category);
 const matches=categoryRows.filter(g=>(!q||normalize([g.name,...g.sources.map(s=>s.location)].join(' ')).includes(q))&&(filter==='review'?needsAbilityReview(g):filter==='active'?g.total!==0||g.unknown>0||g.sources.some(s=>s.acquired):true));
 const pages=Math.max(1,Math.ceil(matches.length/pageSize)),current=Math.max(1,Math.min(pages,Math.trunc(page)||1));
 return {items:matches.slice((current-1)*pageSize,current*pageSize),count:matches.length,page:current,pages,start:matches.length?(current-1)*pageSize+1:0,end:Math.min(current*pageSize,matches.length),counts:Object.fromEntries(BASE_CATEGORIES.map(c=>[c,rows.filter(g=>g.category===c).length])),active:categoryRows.filter(g=>g.sources.some(s=>s.acquired)).length,review:categoryRows.filter(needsAbilityReview).length};
}
export function groupAbilitySources(g,{includeInactive=false}={}){
 const groups=new Map();
 for(const s of g.sources){if(!includeInactive&&!s.acquired)continue;const key=s.kind||'その他';if(!groups.has(key))groups.set(key,{name:key,sources:[],total:0,unknown:0});const group=groups.get(key);group.sources.push(s);if(s.value==null)group.unknown++;else group.total+=s.value;}
 return [...groups.values()].map(g=>({...g,total:Math.round(g.total*1e6)/1e6}));
}
