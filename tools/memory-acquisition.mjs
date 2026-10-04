// Reward union tag 12 identifies memory fragments; numeric IDs alone are ambiguous.
export function containsMemoryReward(value,id){
 return !!value&&typeof value==='object'&&((value[-1]===12&&value[0]===id)||Object.values(value).some(v=>containsMemoryReward(v,id)));
}
export function memoryAcquisition(id,{packs,items,shops,events,boxes}){
 const result=[],add=(type,name,master,detail)=>{if(!result.some(r=>r.type===type&&r.name===name))result.push({type,name,master,detail});};
 for(const p of packs.filter(p=>containsMemoryReward(p[4],id))){
  // Paid orb packs explicitly charge paid currency ID 2. Other packs are not classified by name.
  const paid=p[3]?.[-1]===2&&p[3]?.[0]===2;
  add(paid?'paid':'pack',p[1].normalize('NFKC'),'ShopPack '+p[0],'メモリのかけらを含むパック');
 }
 for(const e of events.filter(e=>containsMemoryReward(e,id)))add('event',e[2],'Event '+e[0],'イベント報酬のメモリのかけら');
 for(const item of items.filter(i=>containsMemoryReward(i[3],id))){
  const currency=item[4]?.[1]?.[0],matches=shops.filter(s=>s[3]?.includes(currency));
  for(const shop of matches)add('exchange',shop[1],'ShopItem '+item[0]+' / Shop '+shop[0],item[1]);
  if(!matches.length)add('exchange',item[1],'ShopItem '+item[0],'交換条件はゲーム内で確認');
 }
 for(const b of boxes.filter(b=>containsMemoryReward(b[9],id)))add('box',b[3].normalize('NFKC'),'Consumable '+b[0],b[4]);
 return result;
}
