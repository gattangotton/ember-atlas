// Provider adapter. Supabase Auth owns credentials; SQL owns authorization and quotas.
export function supabaseError(error){
 if(!error)return null;
 const known={invalid_credentials:'メールアドレスまたはパスワードが違います。',email_not_confirmed:'確認メールのリンクを開いてからログインしてください。',over_email_send_rate_limit:'メールの送信上限です。時間を置くか、管理者にメール送信設定を確認してもらってください。',email_address_not_authorized:'管理者がメール送信サービスを設定する必要があります。',user_already_exists:'登録済みのメールアドレスです。ログインしてください。',weak_password:'パスワードを12文字以上で設定してください。',signup_disabled:'現在、新しいメンバーの登録は停止しています。'};
 const code=String(error.code||'');
 const message=known[code]||(code.startsWith('PT')?error.message:code==='23505'?'同じ操作が処理されています。再表示してください。':code==='23514'||code==='22P02'?'入力内容を確認してください。':/Database error saving new user/i.test(error.message||'')?'登録できませんでした。招待コードの期限・使用回数・同盟の人数上限を管理者に確認してください。':'接続または設定を確認してください。操作を完了できませんでした。');
 return Object.assign(new Error(message),{status:code.startsWith('PT')?Number(code.slice(2)):error.status||500,code});
}
export function createSupabaseAdapter({client,getIdentity=()=>'',redirectUrl,prepareFile=async f=>f}){
 const signed=new Map();
 async function unwrap(request){const {data,error}=await request;if(error)throw supabaseError(error);return data;}
 async function user(){const {session}=await unwrap(client.auth.getSession());return session?.user||null;}
 async function checkedUser(){const u=await user();if(!u||getIdentity()&&getIdentity()!==u.id)throw Object.assign(Error('ログイン期限切れ、または別のアカウントに切り替わりました。画面を開き直してください。'),{status:401});return u;}
 async function rpc(action,payload={}){const u=await checkedUser();return unwrap(client.rpc('ember_api',{action,payload:{...payload,actor:u.id}}));}
 const bucket=()=>client.storage.from('alliance-media');
 async function clean(file,path){if(!file||!path)return;await unwrap(bucket().remove([path]));await rpc('file-release',{file});signed.delete(path);}
 async function fileUrl(path){
  if(signed.get(path)?.until>Date.now())return signed.get(path).url;
  const {signedUrl}=await unwrap(bucket().createSignedUrl(path,300));signed.set(path,{url:signedUrl,until:Date.now()+240000});return signedUrl;
 }
 return async function api(action,{data,params}={}){
  if(action==='login')return unwrap(client.auth.signInWithPassword({email:data.login.trim(),password:data.password}));
  if(action==='register'){
   const r=await unwrap(client.auth.signUp({email:data.login.trim(),password:data.password,options:{emailRedirectTo:redirectUrl,data:{name:data.name.trim(),invite:data.invite.trim()}}}));
   return {confirmationRequired:!r.session};
  }
  if(action==='forgot') {await unwrap(client.auth.resetPasswordForEmail(data.email.trim(),{redirectTo:redirectUrl}));return {};}
  if(action==='recover') {await checkedUser();await unwrap(client.auth.updateUser({password:data.password}));await unwrap(client.auth.signOut({scope:'others'}));return {};}
  if(action==='setup')throw Error('管理者の設定はSupabaseの管理画面で行います。設置手順の「あなたを管理者にする」を確認してください。');
  if(action==='session'){if(!await user())return {enabled:true,user:null};return rpc('session');}
  if(action==='logout'){await unwrap(client.auth.signOut({scope:'local'}));signed.clear();return {};}
  if(action==='password'){
   const u=await checkedUser();await unwrap(client.auth.signInWithPassword({email:u.email,password:data.current_password}));
   await unwrap(client.auth.updateUser({password:data.password}));await unwrap(client.auth.signOut({scope:'others'}));return {};
  }
  if(action==='post-create'){
   const payload=Object.fromEntries(data);delete payload.file;
   const original=data.get('file');
   if(original?.size){
    const file=await prepareFile(original);
    const reservation=await rpc('file-reserve',{...payload,bytes:file.size,mime:file.type});
    if(reservation.complete)return reservation;
    // No upsert: a lost response is retried using the same reservation and post id.
    const upload=await bucket().upload(reservation.path,file,{contentType:file.type,upsert:false,cacheControl:'60'});
    if(upload.error&&!['409','Duplicate'].includes(String(upload.error.statusCode))&&!/already exists/i.test(upload.error.message||''))throw supabaseError(upload.error);
   }
   return rpc(action,payload);
  }
  if(action==='post-delete'){const result=await rpc(action,data);try{await clean(result.file,result.path);}catch{throw Error('投稿は非表示にしました。添付の削除が未完了です。管理画面の「未完了の添付を片付ける」を実行してください。');}return result;}
  if(action==='files-cleanup'){
   const {cleanup}=await rpc('members',data);for(const f of cleanup)await clean(f.id,f.path);return {};
  }
  const result=await rpc(action,data||params||{});
  if(action==='posts'){
   const paths=new Set(result.posts.map(p=>p.path).filter(Boolean));for(const path of signed.keys())if(!paths.has(path))signed.delete(path);
   await Promise.all(result.posts.map(async p=>{if(p.path)p.file_url=await fileUrl(p.path);}));
  }
  return result;
 };
}

export async function prepareAttachment(file){
 if(!['image/jpeg','image/png','image/webp','video/mp4','video/webm'].includes(file.type))throw Error('JPEG・PNG・WebP画像、MP4・WebM動画を選んでください。');
 const video=file.type.startsWith('video/');
 if(file.size>(video?20000000:5000000))throw Error(video?'動画は20MBまでです。':'画像は5MBまでです。');
 if(video)return file;
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width*bitmap.height>20000000)throw Error('画像が大きすぎます。2000万画素以下に縮小してください。');
  const scale=Math.min(1,1920/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
  return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('画像を変換できませんでした。')),'image/webp',.85));
 }finally{bitmap.close();}
}
