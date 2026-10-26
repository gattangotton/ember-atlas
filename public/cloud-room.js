import {cloudConfig} from './cloud-config.js';
import {cloudApi,apiUrl} from './cloud-api.js';

export function createCloudRoom({session,esc,modal,toast}){
 let rooms=[],selected='',kind='board',parent=null,before=0,loading=false,version=0;
 const active=()=>!!document.querySelector('#cloud-room');
 const current=()=>rooms.find(r=>r.id===selected);
 const status=text=>{const el=document.querySelector('#room-status');if(el)el.textContent=text;};
 const bytes=n=>`${(Number(n)/1000000).toFixed(1)} MB`;
 const link=(key,value)=>{const url=new URL('./cloud-login.html',location.href);url.hash=new URLSearchParams({[key]:value});return url.href;};
 function page(){queueMicrotask(loadRooms);return `<section id="cloud-room"><div class="page-heading"><div><div class="eyebrow">ALLIANCE ROOM</div><h1>同盟ルーム</h1><p>招待された同盟のメンバーだけで情報を共有できます。</p></div></div><div id="room-toolbar"></div><div id="room-status" class="room-status" role="status"></div><div id="room-content"></div><details class="panel"><summary>招待コードで別の同盟に参加</summary><form class="room-admin-form" data-room-form="join"><label class="field">招待コード<input name="invite" required maxlength="128"></label><button>参加する</button></form></details>${session.user.site_admin?'<details class="panel"><summary>全体管理者：同盟を追加</summary><form class="room-admin-form" data-room-form="create"><label class="field">同盟名<input name="name" required maxlength="60"></label><button>同盟を作成する</button></form></details>':''}</section>`;}
 async function loadRooms(){
  try{rooms=(await cloudApi('rooms')).rooms;if(!active())return;
   if(!rooms.some(r=>r.id===selected))selected=rooms[0]?.id||'';
   toolbar();content();await refresh();
  }catch(e){status(e.message);}
 }
 function toolbar(){
  const a=current();document.querySelector('#room-toolbar').innerHTML=`<div class="room-toolbar"><label>同盟 <select data-room-select aria-label="同盟を選択">${rooms.map(r=>`<option value="${esc(r.id)}" ${r.id===selected?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label>${a?`<button data-room-tab="board" aria-pressed="${kind==='board'}">掲示板</button><button data-room-tab="chat" aria-pressed="${kind==='chat'}">チャット</button>${a.role==='admin'?'<button data-room-manage>メンバー・招待管理</button>':''}`:''}</div>${a?`<p class="room-usage ${Number(a.used_bytes)>=Number(a.quota_bytes)*.8?'warn':''}">添付：${bytes(a.used_bytes)} / ${bytes(a.quota_bytes)} · ${a.member_count} / ${a.member_limit}人${Number(a.used_bytes)>=Number(a.quota_bytes)*.8?' · 容量が少なくなっています':''}</p>`:'<p>参加している同盟がありません。管理者から招待コードを受け取ってください。</p>'}`;
 }
 function content(){
  version++;before=0;const root=document.querySelector('#room-content');
  if(!current()){root.innerHTML='';return;}
  root.innerHTML=`${parent?'<button data-room-back>← 掲示板に戻る</button><h2>投稿への返信</h2>':''}<p class="hint">${kind==='chat'?'表示中のみ約10秒ごとに更新します。':'掲示板は約30秒ごとに更新します。'} 画像は5MB、動画は20MBまで。動画は同盟全体で月5本までです。</p><form class="panel room-compose" data-room-form="post"><input type="hidden" name="client_id" value="${crypto.randomUUID()}">${kind==='board'?'<label class="field">タイトル<input name="title" maxlength="120" required></label>':''}<label class="field">${kind==='chat'?'メッセージ':'本文'}<textarea name="body" maxlength="4000" placeholder="同盟に共有する内容を入力"></textarea></label><label class="field">画像・動画（1件）<input name="file" type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"><small>画像は長辺1920px以内に縮小して保存します。原本は保存しません。</small></label><div data-room-preview></div><button class="primary">投稿する</button></form><div class="actions"><button data-room-refresh>最新を表示</button><button data-room-older>過去の投稿</button></div><div id="room-posts" aria-label="投稿一覧"></div>`;
 }
 function postHtml(p){
  const file=p.file_url||(p.file_id&&cloudConfig.provider!=='supabase'?apiUrl('file',{id:p.file_id}).href:'');
  return `<article class="panel room-post"><small>${esc(p.name)} · ${new Date(Number(p.created_at)*1000).toLocaleString('ja-JP')}</small>${p.title?`<h3>${esc(p.title)}</h3>`:''}<p>${esc(p.body)}</p>${file?(p.mime.startsWith('image/')?`<a href="${esc(file)}" target="_blank" rel="noreferrer"><img src="${esc(file)}" alt="投稿の添付画像" loading="lazy"></a>`:`<video src="${esc(file)}" controls preload="none" playsinline></video>`):''}<div class="actions">${kind==='board'&&!Number(p.deleted)?`<button data-room-replies="${p.id}">返信を読む・書く</button>`:''}${p.can_delete?`<button data-room-delete="${p.id}">削除</button>`:''}</div></article>`;
 }
 async function refresh(){
  if(!active()||!selected||loading)return;loading=true;const v=version;
  try{const result=await cloudApi('posts',{params:{alliance:selected,kind,...(parent?{parent}:{}),...(before?{before}:{})}});
   if(!active()||v!==version)return;
   const target=document.querySelector('#room-posts');
   const signature=JSON.stringify(result.posts.map(({file_url,...post})=>post));
   // Keep existing media nodes during polling so videos do not restart and images are not downloaded again.
   if(target.dataset.signature!==signature){target.innerHTML=result.posts.map(postHtml).join('')||'<p class="panel">投稿はまだありません。</p>';target.dataset.signature=signature;}
   target.dataset.oldest=String(Math.min(...result.posts.map(p=>p.id)));
   const older=document.querySelector('[data-room-older]');if(older)older.disabled=result.posts.length<50;
   status(before?'過去の投稿を表示中。自動更新は停止しています。':'最新の投稿を表示しています。');
  }catch(e){if(v!==version)return;status(e.message);if(e.status===403||e.status===401){const el=document.querySelector('#room-posts');if(el)el.innerHTML='';}}
  finally{loading=false;}
 }
 async function manage(){
  const a=current();if(!a)return;
  try{const result=await cloudApi('members',{params:{alliance:a.id}});
   modal('メンバー・招待管理',`<h3>${esc(a.name)}</h3><form data-room-form="invite" class="room-admin-form"><label class="field">招待の使用回数<input name="max_uses" type="number" min="1" max="50" value="1" required></label><p class="hint">招待は7日間有効です。通常は1人につき1回の招待を発行してください。</p><button>招待リンクを発行</button></form><div id="room-invite-result"></div><h3>有効な招待</h3>${result.invites.map(i=>`<p>${new Date(Number(i.expires_at)*1000).toLocaleDateString('ja-JP')}まで · ${i.uses}/${i.max_uses}回 <button data-room-revoke="${esc(i.token_hash)}">無効にする</button></p>`).join('')||'<p>ありません。</p>'}<h3>メンバー</h3><div class="room-members">${result.members.map(m=>`<div><b>${esc(m.name)}</b> <small>${esc(m.login)} / ${m.role==='admin'?'同盟管理者':'メンバー'}</small><div class="actions"><button data-room-member="${esc(m.id)}" data-role="${m.role==='admin'?'member':'admin'}">${m.role==='admin'?'一般メンバーにする':'同盟管理者にする'}</button><button data-room-member="${esc(m.id)}" data-role="remove">同盟から除名</button>${session.user.site_admin&&cloudConfig.provider!=='supabase'?`<button data-room-recovery="${esc(m.id)}">パスワード再設定リンク</button>`:''}</div></div>`).join('')}</div>${cloudConfig.provider==='supabase'?'<p class="hint">パスワード再設定は本人がログイン画面からメールで行えます。1時間以上残っている未投稿の添付、削除途中の添付を片付けられます。</p><button data-room-cleanup>未完了の添付を片付ける</button>':''}${session.user.site_admin?`<form data-room-form="quota" class="room-admin-form"><label class="field">この同盟の容量上限（MB）<input name="mb" type="number" min="10" max="${cloudConfig.provider==='supabase'?800:2000}" value="${Number(a.quota_bytes)/1000000}" required></label><button>容量を変更</button></form>`:''}`,true);
  }catch(e){toast(e.message);}
 }
 document.addEventListener('change',e=>{
  if(e.target.matches('[data-room-select]')){selected=e.target.value;kind='board';parent=null;toolbar();content();refresh();}
  if(e.target.matches('.room-compose [name=file]')){
   const f=e.target.files[0],preview=document.querySelector('[data-room-preview]');if(!preview)return;
   if(preview.dataset.url)URL.revokeObjectURL(preview.dataset.url);preview.innerHTML='';delete preview.dataset.url;
   if(!f)return;const video=f.type.startsWith('video/');
   if(f.size>(video?20000000:5000000)){toast(video?'動画は20MBまでです。':'画像は5MBまでです。');e.target.value='';return;}
   const url=URL.createObjectURL(f);preview.dataset.url=url;
   if(!video)preview.innerHTML=`<img alt="アップロード前の画像" style="max-width:100%;max-height:240px" src="${esc(url)}"><p class="hint">文字が読める画像を選んでください。保存後は投稿から確認できます。</p>`;
  }
 });
 document.addEventListener('submit',async e=>{
  const form=e.target.closest('[data-room-form]');if(!form)return;e.preventDefault();e.stopImmediatePropagation();
  const button=form.querySelector('button');button.disabled=true;
  try{const mode=form.dataset.roomForm,fd=new FormData(form),a=current();
   if(mode==='post'){
    fd.set('alliance',selected);fd.set('kind',kind);if(parent)fd.set('parent',String(parent));if(!fd.has('title'))fd.set('title','');
    const file=fd.get('file');if(file?.size>(file.type.startsWith('video/')?20000000:5000000))throw Error('ファイルの容量が上限を超えています。');
    await cloudApi('post-create',{data:fd});form.reset();form.querySelector('[name=client_id]').value=crypto.randomUUID();
    const preview=form.querySelector('[data-room-preview]');if(preview.dataset.url)URL.revokeObjectURL(preview.dataset.url);preview.innerHTML='';before=0;await refresh();
    rooms=(await cloudApi('rooms')).rooms;if(active())toolbar();toast('投稿しました');
   }else if(mode==='join'){await cloudApi('join',{data:{invite:fd.get('invite').trim()}});form.reset();await loadRooms();toast('同盟に参加しました');}
   else if(mode==='create'){const result=await cloudApi('alliance-create',{data:{name:fd.get('name')}});selected=result.id;form.reset();await loadRooms();toast('同盟を作成しました');}
   else if(mode==='invite'){
    const result=await cloudApi('invite-create',{data:{alliance:a.id,max_uses:Number(fd.get('max_uses'))}});
    document.querySelector('#room-invite-result').innerHTML=`<p>招待する人にだけ渡してください。リンクはこの表示でのみ確認できます。</p><textarea class="room-secret" readonly aria-label="招待リンク">${esc(link('invite',result.token))}</textarea><p>招待コード：</p><textarea class="room-secret" readonly aria-label="招待コード">${esc(result.token)}</textarea>`;
   }else if(mode==='quota'){await cloudApi('alliance-update',{data:{alliance:a.id,quota_bytes:Number(fd.get('mb'))*1000000}});toast('容量を変更しました');await loadRooms();}
  }catch(err){toast(err.message);status(err.message);}finally{button.disabled=false;}
 },true);
 document.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  try{
   if(b.hasAttribute('data-room-tab')){kind=b.dataset.roomTab;parent=null;toolbar();content();await refresh();}
   if(b.hasAttribute('data-room-refresh')){before=0;const posts=document.querySelector('#room-posts');if(posts)delete posts.dataset.signature;await refresh();}
   if(b.hasAttribute('data-room-older')){before=Number(document.querySelector('#room-posts').dataset.oldest);await refresh();}
   if(b.hasAttribute('data-room-replies')){parent=Number(b.dataset.roomReplies);kind='reply';content();await refresh();}
   if(b.hasAttribute('data-room-back')){parent=null;kind='board';content();await refresh();}
   if(b.hasAttribute('data-room-manage'))await manage();
   if(b.hasAttribute('data-room-cleanup')){await cloudApi('files-cleanup',{data:{alliance:selected}});toast('未完了の添付を片付けました');await loadRooms();}
   if(b.hasAttribute('data-room-delete')&&confirm('この投稿と添付ファイルを削除しますか？')){await cloudApi('post-delete',{data:{post:Number(b.dataset.roomDelete)}});await refresh();rooms=(await cloudApi('rooms')).rooms;if(active())toolbar();}
   if(b.hasAttribute('data-room-revoke')){await cloudApi('invite-revoke',{data:{alliance:selected,token_hash:b.dataset.roomRevoke}});await manage();}
   if(b.hasAttribute('data-room-member')&&confirm('このメンバーの同盟内の権限を変更しますか？')){await cloudApi('member-update',{data:{alliance:selected,user:b.dataset.roomMember,role:b.dataset.role}});await manage();await loadRooms();}
   if(b.hasAttribute('data-room-recovery')){const r=await cloudApi('recovery-create',{data:{user:b.dataset.roomRecovery}});modal('パスワード再設定リンク',`<p>本人確認後、対象者にだけ渡してください。15分間有効です。</p><textarea class="room-secret" readonly>${esc(link('recover',r.token))}</textarea>`);}
  }catch(err){toast(err.message);}
 });
 let ticks=0;
 setInterval(()=>{if(!active()||document.visibilityState!=='visible'||before)return;ticks++;if(kind==='chat'||ticks%3===0)refresh();},10000);
 return {page};
}
