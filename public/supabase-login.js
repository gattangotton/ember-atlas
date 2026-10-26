import {cloudApi} from './cloud-api.js';
import {supabaseClient} from './supabase-provider.js';
const target=document.querySelector('#auth-form'),status=document.querySelector('#auth-status');
const hash=new URLSearchParams(location.hash.slice(1));
const invite=hash.get('invite')||'';
const recovering=hash.get('type')==='recovery';
// Preserve Auth's callback until the SDK has consumed it. Invite tokens never go to the page server.
if(invite)history.replaceState(null,'',location.pathname);
document.querySelector('.cloud-auth-card>details').innerHTML='<summary>パスワードを忘れた場合</summary><p>登録したメールアドレスへ再設定リンクを送信します。</p><button data-view="forgot">再設定メールを送る</button>';
document.querySelector('.cloud-auth-card>.hint').innerHTML='<a href="?setup">管理者として始める手順</a>';
const field=(name,label,type='text',extra='')=>`<label class="field">${label}<input name="${name}" type="${type}" ${extra} required></label>`;
function render(view){
 if(view==='setup'){
  target.innerHTML='<h2>あなたを最初の管理者にする</h2><ol><li>Supabaseでプロジェクトを作ります。</li><li>Authentication → Usersで自分のアカウントを作ります。</li><li>設置用SQLを実行し、自分のユーザーIDを管理者に指定します。</li><li>設定したメールアドレスとパスワードでログインします。</li></ol><p>この画面から管理者権限は取得できません。詳しくは設置用フォルダーの「はじめに.html」を開いてください。</p><button data-view="login">ログインへ</button>';return;
 }
 const password=field('password','パスワード（12文字以上）','password','minlength="12" maxlength="72" autocomplete="new-password"');
 let fields=view==='recover'?password:view==='forgot'?field('email','登録したメールアドレス','email','autocomplete="email"'):field('login','メールアドレス','email','autocomplete="username"')+(view==='register'?field('name','表示名','text','maxlength="60"')+field('invite','招待コード','text','maxlength="128"')+password:field('password','パスワード','password','autocomplete="current-password"'));
 target.innerHTML=`<h2>${({login:'ログイン',register:'招待から参加',recover:'新しいパスワード',forgot:'再設定メールを送る'})[view]}</h2><form data-supabase-auth="${view}">${fields}${view==='register'?'<p class="hint">登録後、届いたメールのリンクを開いてください。アプリ内では表示名を使い、メールアドレスは他のメンバーに表示しません。</p>':''}<button class="primary">${({login:'ログイン',register:'招待を使って登録',recover:'パスワードを変更',forgot:'送信する'})[view]}</button></form>`;
 if(view==='register')target.querySelector('[name=invite]').value=invite;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b){status.textContent='';render(b.dataset.view);}});
document.addEventListener('submit',async e=>{
 const form=e.target;if(!form.matches('[data-supabase-auth]'))return;e.preventDefault();const button=form.querySelector('button');button.disabled=true;status.textContent='確認しています…';
 try{
  const mode=form.dataset.supabaseAuth;const result=await cloudApi(mode,{data:Object.fromEntries(new FormData(form))});
  if(mode==='forgot'){status.textContent='登録済みのアドレスの場合は再設定メールが届きます。届かない場合は迷惑メールと管理者のメール送信設定をご確認ください。';}
  else if(mode==='register'&&result.confirmationRequired){render('login');status.textContent='確認メールを送信しました。メールのリンクを開いてからログインしてください。';}
  else location.replace('./');
 }catch(err){status.textContent=err.message;}finally{button.disabled=false;}
});
render(new URLSearchParams(location.search).has('setup')?'setup':recovering?'recover':invite?'register':'login');
try{
 const client=supabaseClient();
 client.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')render('recover');});
 const {data,error}=await client.auth.getSession();if(error)throw error;
 if(data.session&&!recovering&&!invite&&!new URLSearchParams(location.search).has('setup'))location.replace('./');
}catch{status.textContent='接続設定を確認してください。まだ設定前の場合は「管理者として始める手順」をご覧ください。';}
