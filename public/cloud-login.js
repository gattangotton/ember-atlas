import {cloudConfig} from './cloud-config.js';
import {cloudApi} from './cloud-api.js';
if(cloudConfig.provider==='supabase'){
 await import('./supabase-login.js');
}else{
const target=document.querySelector('#auth-form'),status=document.querySelector('#auth-status');
const fragment=new URLSearchParams(location.hash.slice(1));
let invite=fragment.get('invite')||'',recovery=fragment.get('recover')||'';
// Invite/recovery tokens are never sent in a page URL or referrer.
if(location.hash)history.replaceState(null,'',location.pathname+location.search);
const field=(name,label,type='text',extra='')=>`<label class="field">${label}<input name="${name}" type="${type}" ${extra} required></label>`;
function render(view){
 const password=field('password','パスワード（12文字以上）','password','minlength="12" maxlength="72" autocomplete="new-password"');
 let fields;
 if(view==='recover')fields=field('token','再設定コード')+password;
 else if(view==='setup')fields=field('setup_key','設置時に設定した初期設定キー','password')+field('alliance_name','最初の同盟名','text','maxlength="60"')+field('login','管理者のログインID','text','autocomplete="username"')+field('name','表示名','text','maxlength="60"')+password;
 else fields=field('login','ログインID','text','autocomplete="username"')+(view==='register'?field('name','表示名','text','maxlength="60"')+field('invite','招待コード')+password:field('password','パスワード','password','autocomplete="current-password"'));
 target.innerHTML=`<h2>${({login:'ログイン',register:'招待から参加',setup:'最初の管理者登録',recover:'パスワード再設定'})[view]}</h2><form data-auth="${view}">${fields}<button class="primary">${view==='login'?'ログイン':'登録する'}</button></form>`;
 if(view==='register')target.querySelector('[name=invite]').value=invite;
 if(view==='recover')target.querySelector('[name=token]').value=recovery;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b)render(b.dataset.view);});
document.addEventListener('submit',async e=>{
 if(!e.target.matches('[data-auth]'))return;e.preventDefault();
 if(!cloudConfig.enabled){status.textContent='この公開先ではサーバー保存が有効になっていません。XREA用パッケージを設置してください。';return;}
 const form=e.target,button=form.querySelector('button');button.disabled=true;status.textContent='確認しています…';
 try{const mode=form.dataset.auth;await cloudApi(mode,{data:Object.fromEntries(new FormData(form))});
  if(mode==='setup'||mode==='recover'){status.textContent='登録できました。ログインしてください。';render('login');}
  else location.replace('./');
 }catch(err){status.textContent=err.message;}finally{button.disabled=false;}
});
render(recovery?'recover':invite?'register':new URLSearchParams(location.search).has('setup')?'setup':'login');
}
