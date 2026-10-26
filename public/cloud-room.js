import {cloudConfig} from './cloud-config.js';
import {cloudApi,apiUrl} from './cloud-api.js';
import {roomCanManage,roomCanChangeMember,chronological,ownMessage,boardMode} from './cloud-room-view.js';

export function createCloudRoom({session,esc,modal,toast,api=cloudApi}){
 let rooms=[],selected='',kind='board',parent=null,before=0,loading=false,version=0,threads=[],shownPosts=[],treeHidden=false,treeMore=false,treeLoadedOlder=false;
 const expanded=new Set();
 const active=()=>!!document.querySelector('#cloud-room');
 const current=()=>rooms.find(r=>r.id===selected);
 const status=text=>{const el=document.querySelector('#room-status');if(el)el.textContent=text;};
 const bytes=n=>`${(Number(n)/1000000).toFixed(1)} MB`;
 const link=(key,value)=>{const url=new URL('./cloud-login.html',location.href);url.hash=new URLSearchParams({[key]:value});return url.href;};
 function page(){queueMicrotask(loadRooms);return `<section id="cloud-room" data-mode="board"><div class="page-heading room-heading"><div><div class="eyebrow">OUR ALLIANCE / MEMBERS ONLY</div><div class="room-title-line"><h1>同盟ルーム</h1><span id="room-alliance-name" class="room-alliance-name"></span></div><p>作戦も、日々のひとことも。仲間だけのコミュニケーション。</p></div></div><div id="room-toolbar"></div><div id="room-status" class="room-status" role="status"></div><div id="room-content"></div><details class="panel room-join"><summary>招待コードで別の同盟に参加</summary><form class="room-admin-form" data-room-form="join"><label class="field">招待コード<input name="invite" required maxlength="128"></label><button>参加する</button></form></details>${session.user.site_admin?'<details class="panel room-join"><summary>全体管理者：同盟を追加</summary><form class="room-admin-form" data-room-form="create"><label class="field">同盟名<input name="name" required maxlength="60"></label><button>同盟を作成する</button></form></details>':''}</section>`;}
 async function loadRooms(){
  try{rooms=(await api('rooms')).rooms;if(!active())return;
   if(!rooms.some(r=>r.id===selected)){selected=rooms[0]?.id||'';parent=null;kind='board';threads=[];treeLoadedOlder=false;expanded.clear();}
   toolbar();content();await refresh();
  }catch(e){status(e.message);}
 }
 function toolbar(){
  const a=current();document.querySelector('#cloud-room').dataset.mode=boardMode(kind);
  document.querySelector('#room-alliance-name').textContent=a?.name||'';
  document.querySelector('#room-toolbar').innerHTML=`<div class="room-toolbar"><div class="room-tabs" aria-label="コミュニケーションの種類">${a?`<button class="room-tab room-tab-board" data-room-tab="board" aria-pressed="${kind!=='chat'}"><span aria-hidden="true">▤</span> 掲示板</button><button class="room-tab room-tab-chat" data-room-tab="chat" aria-pressed="${kind==='chat'}"><span aria-hidden="true">💬</span> チャット</button>`:''}</div><div class="room-tools">${rooms.length>1?`<label>同盟を切り替え <select data-room-select aria-label="同盟を選択">${rooms.map(r=>`<option value="${esc(r.id)}" ${r.id===selected?'selected':''}>${esc(r.name)}</option>`).join('')}</select></label>`:''}${roomCanManage(session.user,a)?`<button data-room-manage>${session.user.site_admin?'全体管理者':'サブ管理者'} · メンバー・招待管理</button>`:''}</div></div>${a?`<p class="room-usage ${Number(a.used_bytes)>=Number(a.quota_bytes)*.8?'warn':''}">${a.member_count} / ${a.member_limit}人 · 添付 ${bytes(a.used_bytes)} / ${bytes(a.quota_bytes)}${Number(a.used_bytes)>=Number(a.quota_bytes)*.8?' · 容量が少なくなっています':''}</p>`:'<p>参加している同盟がありません。管理者から招待コードを受け取ってください。</p>'}`;
 }
 function compose(){return `<form class="room-compose" data-room-form="post"><input type="hidden" name="client_id" value="${crypto.randomUUID()}">${kind==='board'?'<label class="field">新しい話題のタイトル<input name="title" maxlength="120" placeholder="例：今週のレイド作戦" required></label>':''}<label class="field">${kind==='chat'?'メッセージ':parent?'この話題に返信':'本文'}<textarea name="body" maxlength="4000" placeholder="${kind==='chat'?'メッセージを入力…':'仲間に伝えたいことを書いてください'}"></textarea></label><div class="room-compose-bottom"><label class="room-attachment">＋ 画像・動画<input name="file" type="file" aria-label="画像・動画を添付" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"></label><button class="primary">${kind==='chat'?'送信 ↑':parent?'返信を投稿':'話題を作成'}</button></div><div data-room-preview></div><small class="room-file-hint">画像5MB（1920px以内に縮小）・動画20MB／同盟で月5本まで</small></form>`;}
 function content(){
  version++;before=0;shownPosts=[];const root=document.querySelector('#room-content');
  if(!current()){root.innerHTML='';return;}
  const controls='<div class="room-feed-tools"><button data-room-refresh>最新を表示</button><button data-room-older>以前の投稿</button></div>';
  if(kind==='chat')root.innerHTML=`<section class="room-chat"><header class="room-chat-heading"><div><strong>${esc(current().name)}</strong><small>チャット · 表示中は約10秒ごとに更新</small></div><span class="room-live">● メンバー限定</span></header>${controls}<div id="room-posts" class="room-chat-feed" aria-label="チャットの会話"></div><button class="room-new-messages" data-room-bottom hidden>新しいメッセージ ↓</button>${compose()}</section>`;
  else root.innerHTML=`<div class="room-board-actions"><button data-room-tree-toggle aria-expanded="${!treeHidden}" aria-controls="room-tree">${treeHidden?'☰ ツリーを表示':'☰ ツリーを隠す'}</button><button data-room-new>＋ 新しい話題</button><span>掲示板 · 約30秒ごとに更新</span></div><div class="room-board-layout ${treeHidden?'tree-hidden':''}"><aside id="room-tree" class="room-tree" aria-label="掲示板の話題と返信" ${treeHidden?'hidden':''}></aside><section class="room-thread-main"><header id="room-thread-heading"></header>${controls}<div id="room-posts" class="room-board-feed" aria-label="掲示板の投稿"></div>${compose()}</section></div>`;
  renderTree();
 }
 function renderTree(){
  const tree=document.querySelector('#room-tree');if(!tree)return;
  const treeHtml=`<div class="room-tree-heading"><strong>話題のツリー</strong><span>${threads.length}件読込済み</span></div><nav><ul>${threads.map(p=>`<li><div class="room-tree-row ${Number(parent)===p.id?'selected':''}"><button class="room-tree-fold" data-tree-expand="${p.id}" aria-expanded="${expanded.has(p.id)}" aria-label="${esc(p.title||'削除された話題')}の階層を切り替え">${expanded.has(p.id)?'▾':'▸'}</button><button class="room-tree-title" data-room-thread="${p.id}" ${Number(parent)===p.id?'aria-current="true"':''}>${esc(p.title||'削除された話題')}</button></div>${expanded.has(p.id)?`<ul class="room-tree-children"><li><button data-room-thread="${p.id}">話題の本文</button></li>${Number(parent)===p.id?chronological(shownPosts).map(r=>`<li><button data-room-jump="${r.id}">${esc(r.name)}：${esc(r.body?.slice(0,24)||'添付・削除された返信')}</button></li>`).join(''):`<li><button data-room-thread="${p.id}">返信を読む</button></li>`}</ul>`:''}</li>`).join('')||'<li class="room-empty">まだ話題がありません。</li>'}</ul></nav>${treeMore?'<button data-tree-older>以前の話題を読み込む</button>':''}`;
  if(tree.roomMarkup!==treeHtml){tree.innerHTML=treeHtml;tree.roomMarkup=treeHtml;}
  const heading=document.querySelector('#room-thread-heading');const thread=threads.find(p=>p.id===Number(parent));
  const headingHtml=parent?`<p class="eyebrow">TOPIC / REPLIES</p><h2>${esc(thread?.title||'選択した話題')}</h2>`:'<p class="eyebrow">BULLETIN BOARD</p><h2>話題を選ぶ・新しく作る</h2><p>左のツリーから話題を選ぶと、本文と返信がまとまって表示されます。</p>';
  if(heading.roomMarkup!==headingHtml){heading.innerHTML=headingHtml;heading.roomMarkup=headingHtml;}
 }
 function postHtml(p){
  const file=p.file_url||(p.file_id&&cloudConfig.provider!=='supabase'?apiUrl('file',{id:p.file_id}).href:'');
  const mine=ownMessage(p,session.user),chat=kind==='chat';
  return `<article id="room-message-${p.id}" class="room-post ${chat?'chat-message '+(mine?'is-mine':'is-other'):'board-post'}"><span class="room-message-avatar" aria-hidden="true">${esc(p.name?.slice(0,1)||'？')}</span><div class="room-message-content"><small class="room-message-author">${esc(p.name)}${mine?' · あなた':''}</small><div class="room-bubble">${p.title?`<h3>${esc(p.title)}</h3>`:''}<p>${esc(p.body|| (Number(p.deleted)?'削除された投稿':''))}</p>${file?(p.mime.startsWith('image/')?`<a href="${esc(file)}" target="_blank" rel="noreferrer"><img src="${esc(file)}" alt="投稿の添付画像" loading="lazy"></a>`:`<video src="${esc(file)}" controls preload="none" playsinline></video>`):''}</div><div class="room-message-meta"><time>${new Date(Number(p.created_at)*1000).toLocaleString('ja-JP',chat?{hour:'2-digit',minute:'2-digit'}:undefined)}</time>${kind==='board'&&!Number(p.deleted)?`<button data-room-thread="${p.id}">話題を開く →</button>`:''}${p.can_delete?`<button data-room-delete="${p.id}" aria-label="${esc(p.name)}の投稿を削除">削除</button>`:''}</div></div></article>`;
 }
 async function refresh(){
  if(!active()||!selected)return;const v=version;if(loading===v+1)return;loading=v+1;
  const room=selected,mode=kind,topic=parent,pageBefore=before;
  try{
   if(mode!=='chat'){
    const board=await api('posts',{params:{alliance:room,kind:'board'}});
    if(!active()||v!==version)return;
    const freshIds=new Set(board.posts.map(p=>p.id));threads=[...board.posts,...threads.filter(p=>!freshIds.has(p.id))];if(!treeLoadedOlder)treeMore=board.posts.length===50;
   }
   const result=mode==='board'?{posts:threads.slice(0,50)}:await api('posts',{params:{alliance:room,kind:mode,...(topic?{parent:topic}:{}),...(pageBefore?{before:pageBefore}:{})}});
   if(!active()||v!==version)return;shownPosts=result.posts;
   const target=document.querySelector('#room-posts');const nearBottom=target.scrollHeight-target.scrollTop-target.clientHeight<90;
   const signaturePosts=topic?[threads.find(p=>p.id===Number(topic)),...result.posts].filter(Boolean):result.posts;
   const signature=JSON.stringify(signaturePosts.map(({file_url,...post})=>post));
   if(target.dataset.signature!==signature){
    const wasEmpty=!target.dataset.signature,oldTop=target.scrollTop;
    if(mode==='chat'){
     let day='';target.innerHTML=chronological(result.posts).map(p=>{const next=new Date(Number(p.created_at)*1000).toLocaleDateString('ja-JP');const divider=next!==day?`<div class="room-day"><span>${esc(next)}</span></div>`:'';day=next;return divider+postHtml(p);}).join('')||'<p class="room-empty">最初のひとことを送ってみましょう。</p>';
     if(!pageBefore&&(nearBottom||wasEmpty)){target.scrollTop=target.scrollHeight;document.querySelector('[data-room-bottom]').hidden=true;}else {target.scrollTop=oldTop;if(!pageBefore)document.querySelector('[data-room-bottom]').hidden=false;}
    }else{
     const root=threads.find(p=>p.id===Number(topic));target.innerHTML=(topic&&root?`<div class="room-topic-root">${postHtml(root)}</div><h3 class="room-reply-label">返信</h3>`:'')+(topic?chronological(result.posts):result.posts).map(postHtml).join('')||'<p class="room-empty">投稿はまだありません。</p>';
    }
    target.dataset.signature=signature;
   }
   target.dataset.oldest=String(Math.min(...result.posts.map(p=>p.id)));renderTree();
   const older=document.querySelector('[data-room-older]');if(older){older.hidden=mode==='board';older.disabled=result.posts.length<50;}
   status(pageBefore?'以前の投稿を表示中です。「最新を表示」で戻れます。':'');
  }catch(e){if(v!==version)return;status(e.message);if(e.status===403||e.status===401){document.querySelector('#room-posts').innerHTML='';threads=[];shownPosts=[];renderTree();}}
  finally{if(loading===v+1)loading=false;}
 }
 async function manage(){
  const a=current();if(!roomCanManage(session.user,a))return;
  try{const result=await api('members',{params:{alliance:a.id}});
   modal('メンバー・招待管理',`<h3>${esc(a.name)}</h3><form data-room-form="invite" class="room-admin-form"><label class="field">招待の使用回数<input name="max_uses" type="number" min="1" max="50" value="1" required></label><p class="hint">招待は7日間有効です。通常は1人につき1回の招待を発行してください。</p><button>招待リンクを発行</button></form><div id="room-invite-result"></div><h3>有効な招待</h3>${result.invites.map(i=>`<p>${new Date(Number(i.expires_at)*1000).toLocaleDateString('ja-JP')}まで · ${i.uses}/${i.max_uses}回 <button data-room-revoke="${esc(i.token_hash)}">無効にする</button></p>`).join('')||'<p>ありません。</p>'}<h3>メンバー</h3><div class="room-members">${result.members.map(m=>`<div><b>${esc(m.name)}</b> <small>${esc(m.login)} / ${m.site_admin?'全体管理者':m.role==='admin'?'サブ管理者':'メンバー'}</small><div class="actions">${session.user.site_admin&&!m.site_admin?`<button data-room-member="${esc(m.id)}" data-role="${m.role==='admin'?'member':'admin'}">${m.role==='admin'?'サブ管理者を解除':'この同盟のサブ管理者にする'}</button>`:''}${roomCanChangeMember(session.user,m,'remove')?`<button data-room-member="${esc(m.id)}" data-role="remove">同盟から除名</button>`:''}${session.user.site_admin&&cloudConfig.provider!=='supabase'?`<button data-room-recovery="${esc(m.id)}">パスワード再設定リンク</button>`:''}</div></div>`).join('')}</div>${cloudConfig.provider==='supabase'?'<p class="hint">パスワード再設定は本人がログイン画面からメールで行えます。1時間以上残っている未投稿の添付、削除途中の添付を片付けられます。</p><button data-room-cleanup>未完了の添付を片付ける</button>':''}${session.user.site_admin?`<form data-room-form="quota" class="room-admin-form"><label class="field">この同盟の容量上限（MB）<input name="mb" type="number" min="10" max="${cloudConfig.provider==='supabase'?800:2000}" value="${Number(a.quota_bytes)/1000000}" required></label><button>容量を変更</button></form>`:''}`,true);
  }catch(e){toast(e.message);}
 }
 document.addEventListener('change',e=>{
  if(e.target.matches('[data-room-select]')){selected=e.target.value;kind='board';parent=null;threads=[];treeLoadedOlder=false;expanded.clear();toolbar();content();refresh();}
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
    await api('post-create',{data:fd});form.reset();form.querySelector('[name=client_id]').value=crypto.randomUUID();
    const preview=form.querySelector('[data-room-preview]');if(preview.dataset.url)URL.revokeObjectURL(preview.dataset.url);preview.innerHTML='';before=0;await refresh();if(kind==='chat'){const feed=document.querySelector('#room-posts');if(feed)feed.scrollTop=feed.scrollHeight;}
    rooms=(await api('rooms')).rooms;if(active())toolbar();toast('投稿しました');
   }else if(mode==='join'){await api('join',{data:{invite:fd.get('invite').trim()}});form.reset();await loadRooms();toast('同盟に参加しました');}
   else if(mode==='create'){const result=await api('alliance-create',{data:{name:fd.get('name')}});selected=result.id;kind='board';parent=null;threads=[];treeLoadedOlder=false;expanded.clear();form.reset();await loadRooms();toast('同盟を作成しました');}
   else if(mode==='invite'){
    const result=await api('invite-create',{data:{alliance:a.id,max_uses:Number(fd.get('max_uses'))}});
    document.querySelector('#room-invite-result').innerHTML=`<p>招待する人にだけ渡してください。リンクはこの表示でのみ確認できます。</p><textarea class="room-secret" readonly aria-label="招待リンク">${esc(link('invite',result.token))}</textarea><p>招待コード：</p><textarea class="room-secret" readonly aria-label="招待コード">${esc(result.token)}</textarea>`;
   }else if(mode==='quota'){await api('alliance-update',{data:{alliance:a.id,quota_bytes:Number(fd.get('mb'))*1000000}});toast('容量を変更しました');await loadRooms();}
  }catch(err){toast(err.message);status(err.message);}finally{button.disabled=false;}
 },true);
 document.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;
  try{
   if(b.hasAttribute('data-room-tab')){kind=b.dataset.roomTab;parent=null;toolbar();content();await refresh();}
   if(b.hasAttribute('data-room-refresh')){before=0;const posts=document.querySelector('#room-posts');if(posts)delete posts.dataset.signature;await refresh();}
   if(b.hasAttribute('data-room-older')){before=Number(document.querySelector('#room-posts').dataset.oldest);await refresh();}
   if(b.hasAttribute('data-room-thread')){parent=Number(b.dataset.roomThread);expanded.add(parent);kind='reply';toolbar();content();await refresh();}
   if(b.hasAttribute('data-tree-expand')){const id=Number(b.dataset.treeExpand);if(expanded.has(id))expanded.delete(id);else expanded.add(id);renderTree();}
   if(b.hasAttribute('data-room-tree-toggle')){treeHidden=!treeHidden;document.querySelector('#room-tree').hidden=treeHidden;document.querySelector('.room-board-layout').classList.toggle('tree-hidden',treeHidden);b.setAttribute('aria-expanded',String(!treeHidden));b.textContent=treeHidden?'☰ ツリーを表示':'☰ ツリーを隠す';}
   if(b.hasAttribute('data-room-jump'))document.getElementById('room-message-'+b.dataset.roomJump)?.scrollIntoView({behavior:'smooth',block:'center'});
   if(b.hasAttribute('data-room-new')){kind='board';parent=null;toolbar();content();await refresh();document.querySelector('.room-compose input[name=title]')?.focus();}
   if(b.hasAttribute('data-room-bottom')){const feed=document.querySelector('#room-posts');feed.scrollTop=feed.scrollHeight;b.hidden=true;}
   if(b.hasAttribute('data-tree-older')){const v=version;const result=await api('posts',{params:{alliance:selected,kind:'board',before:Math.min(...threads.map(p=>p.id))}});if(v!==version)return;const ids=new Set(threads.map(p=>p.id));threads.push(...result.posts.filter(p=>!ids.has(p.id)));treeMore=result.posts.length===50;treeLoadedOlder=true;renderTree();}
   if(b.hasAttribute('data-room-back')){parent=null;kind='board';content();await refresh();}
   if(b.hasAttribute('data-room-manage'))await manage();
   if(b.hasAttribute('data-room-cleanup')){await api('files-cleanup',{data:{alliance:selected}});toast('未完了の添付を片付けました');await loadRooms();}
   if(b.hasAttribute('data-room-delete')&&confirm('この投稿と添付ファイルを削除しますか？')){await api('post-delete',{data:{post:Number(b.dataset.roomDelete)}});await refresh();rooms=(await api('rooms')).rooms;if(active())toolbar();}
   if(b.hasAttribute('data-room-revoke')){await api('invite-revoke',{data:{alliance:selected,token_hash:b.dataset.roomRevoke}});await manage();}
   if(b.hasAttribute('data-room-member')&&confirm('このメンバーの同盟内の権限を変更しますか？')){await api('member-update',{data:{alliance:selected,user:b.dataset.roomMember,role:b.dataset.role}});await manage();await loadRooms();}
   if(b.hasAttribute('data-room-recovery')){const r=await api('recovery-create',{data:{user:b.dataset.roomRecovery}});modal('パスワード再設定リンク',`<p>本人確認後、対象者にだけ渡してください。15分間有効です。</p><textarea class="room-secret" readonly>${esc(link('recover',r.token))}</textarea>`);}
  }catch(err){toast(err.message);}
 });
 let ticks=0;
 setInterval(()=>{if(!active()||document.visibilityState!=='visible'||before)return;ticks++;if(kind==='chat'||ticks%3===0)refresh();},10000);
 return {page};
}
