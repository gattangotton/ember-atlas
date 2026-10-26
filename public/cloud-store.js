// Optimistic revisions prevent whole-record overwrites across devices/tabs.
export function createCloudStore({api,userId,storage,onStatus=()=>{},onRemote=()=>{},delay=800}){
 const key='ember-cloud-pending-v1:'+userId;
 let revision=0,pending=null,busy=false,blocked=false,timer,changed=false;
 const status=(text,kind='')=>onStatus({text,kind,pending:!!pending,blocked});
 const persist=()=>{if(pending)storage.setItem(key,JSON.stringify({revision,state:pending}));else storage.removeItem(key);};
 async function load(fallback){
  const remote=await api('record');revision=remote.revision;
  const saved=storage.getItem(key);
  if(saved){let v;try{v=JSON.parse(saved);}catch{throw Error('この端末の未送信記録を読み込めません。端末データを消さずに管理者へご相談ください。');}
   pending=v.state;
   if(v.revision!==revision){blocked=true;status('別の端末と更新が競合しています。内容を確認してください。','conflict');return pending;}
   status('未送信の記録を保存しています…');timer=setTimeout(flush,delay);return pending;
  }
  status(remote.state?'サーバーに保存済み':'変更するとサーバーに保存されます');return remote.state||fallback;
 }
 function assertWritable(){if(blocked)throw Error('別の端末と競合しています。「保存状況」から確認してください。');}
 function queue(state){
  assertWritable();const previous=pending;pending=structuredClone(state);
  try{persist();}catch(e){pending=previous;throw Error('未送信の記録を端末に保管できません。空き容量を確認してください。');}
  changed=true;status('保存待ち…');clearTimeout(timer);if(!busy)timer=setTimeout(flush,delay);
 }
 async function flush(){
  clearTimeout(timer);if(busy||blocked||!pending)return;
  busy=true;changed=false;const snapshot=pending;status('サーバーに保存中…');
  try{const result=await api('record-save',{data:{revision,state:snapshot}});revision=result.revision;
   if(!changed)pending=null;persist();status(pending?'保存待ち…':'サーバーに保存済み');
  }catch(e){
   if(e.status===409){blocked=true;status('別の端末と更新が競合しています。内容を確認してください。','conflict');}
   else status(e.status===401?'ログイン期限切れです。未送信記録はこの端末に保管しています。':e.message||'通信待ち・未送信記録はこの端末に保管しています。','error');
  }finally{busy=false;if(pending&&!blocked)timer=setTimeout(flush,changed?delay:15000);}
 }
 async function checkRemote(){
  if(pending||busy||blocked)return;
  try{const result=await api('record');if(pending||busy||blocked)return;
   if(result.revision!==revision){blocked=true;status('別の端末で更新されました。保存状況から読み直してください。','conflict');onRemote(result);}
  }catch{/* Only visible UI actions should interrupt the user. */}
 }
 function dispose(){clearTimeout(timer);}
 return {load,queue,flush,checkRemote,assertWritable,dispose,get pending(){return !!pending;},get blocked(){return blocked;},
  exportPending:()=>pending?structuredClone(pending):null,
  async useServer(){if(busy)throw Error('保存が終わるまでお待ちください。');const result=await api('record');storage.removeItem(key);pending=null;blocked=false;revision=result.revision;status('サーバーの記録を読み込みました');return result.state;},
 };
}
