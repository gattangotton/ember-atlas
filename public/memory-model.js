const text=(s,max)=>typeof s==='string'&&s.length<=max;
export function validateMemoryInventory(input={},records=[]){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length>1000)throw Error('メモリの所持記録の形式が不正です。');
 const known=new Set(records.map(r=>r.id)),ids=new Set(),result={};let count=0;
 for(const [id,copies] of Object.entries(input)){
  if(!known.has(id)||!Array.isArray(copies)||copies.length>200)throw Error('メモリの種類・個数を確認してください。');
  count+=copies.length;if(count>2000)throw Error('所持メモリは合計2,000個以内です。');
  result[id]=copies.map(c=>{
   if(!c||!text(c.id,80)||!/^[\w-]+$/.test(c.id)||ids.has(c.id)||!text(c.label,80)||!text(c.note,1000)||!Array.isArray(c.subs)||c.subs.length!==3)throw Error('メモリの個体ID・名前・メモを確認してください。');
   ids.add(c.id);
   const subs=c.subs.map(s=>{
    if(!s||!['unknown','empty','set'].includes(s.status)||!text(s.name,200)||!text(s.unit,20)||s.value!==null&&(!Number.isFinite(s.value)||Math.abs(s.value)>1e9))throw Error('サブアビリティの入力を確認してください。');
    if(s.status==='set'&&!s.name.trim())throw Error('登録するサブアビリティ名を入力してください。');
    return s.status==='set'?{status:s.status,name:s.name.trim(),unit:s.unit,value:s.value}:{status:s.status,name:'',unit:'%',value:null};
   });
   return {id:c.id,label:c.label.trim(),note:c.note,subs};
  });
 }
 return result;
}
export function newMemoryCopy(id){return {id,label:'',note:'',subs:Array.from({length:3},()=>({status:'unknown',name:'',unit:'%',value:null}))};}
export function filterMemories(records,inventory,{query='',rarity='',owned=false,acquisition=''}={}){
 const normalize=s=>String(s).normalize('NFKC').toLocaleLowerCase('ja');const q=normalize(query).trim();
 return records.filter(r=>(!rarity||r.rarity===Number(rarity))&&(!owned||inventory[r.id]?.length)&&(acquisition==='paid'?r.paidAvailable:acquisition==='nonpaid'?r.nonPaidAvailable:acquisition==='unknown'?!r.paidAvailable&&!r.nonPaidAvailable:true)&&normalize([r.name,...(r.acquisition||[]).map(a=>a.name),...r.mainEffects.map(e=>e.name),...(inventory[r.id]||[]).flatMap(c=>[c.label,...c.subs.map(s=>s.name)])].join(' ')).includes(q));
}
