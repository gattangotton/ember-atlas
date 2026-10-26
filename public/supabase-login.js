import {cloudApi} from './cloud-api.js';
import {supabaseClient} from './supabase-provider.js';
import {registrationError} from './auth-validation.js';
const target=document.querySelector('#auth-form'),status=document.querySelector('#auth-status');
const hash=new URLSearchParams(location.hash.slice(1));
const invite=hash.get('invite')||'';
const recovering=hash.get('type')==='recovery';
let pendingEmail='',resendAfter=0,busy=false;
// Preserve Auth callbacks for the SDK; never send invite tokens to the page server.
if(invite)history.replaceState(null,'',location.pathname);
document.querySelector('.cloud-auth-card>details').innerHTML='<summary>パスワードを忘れた場合</summary><p>登録したメールアドレスへ再設定リンクを送信します。</p><button data-view="forgot">再設定メールを送る</button>';
document.querySelector('.cloud-auth-card>.hint').innerHTML='<a href="?setup">管理者として始める手順</a>';
const field=(name,label,type='text',extra='')=>`<label class="field">${label}<input name="${name}" type="${type}" ${extra} required></label>`;
const mailHelp='<details class="auth-mail-help"><summary>メールが届かない場合</summary><ol><li>入力したメールアドレスに間違いがないか確認してください。</li><li>迷惑メール・プロモーション・受信拒否設定を確認し、少し時間を置いてください。</li><li>登録確認メールは下のボタンから再送できます。パスワード再設定メールは「パスワードを忘れた場合」から送ってください。</li><li>まだ届かない場合は同盟管理者へ連絡してください。管理者側のメール送信設定や送信上限の確認が必要な場合があります。</li></ol><p>登録時のアドレスを間違えた場合は、再送先だけ変えても登録アドレスは変更されません。管理者に未確認の登録と招待の状態を確認してもらってください。パスワードを伝える必要はありません。</p><button type="button" data-view="resend">確認メールを再送する</button></details>';
function render(view){
 if(view==='setup'){
  target.innerHTML='<h2>あなたを最初の管理者にする</h2><ol><li>Supabaseでプロジェクトを作ります。</li><li>Authentication → Usersで自分のアカウントを作ります。</li><li>設置用SQLを実行し、自分のユーザーIDを管理者に指定します。</li><li>設定したメールアドレスとパスワードでログインします。</li></ol><p>この画面から管理者権限は取得できません。詳しくは設置用フォルダーの「はじめに.html」を開いてください。</p><button data-view="login">ログインへ</button>';return;
 }
 const password=field('password','自分で設定するログイン用パスワード（12〜72文字）','password','minlength="12" maxlength="72" autocomplete="new-password"');
 const confirmation=field('password_confirm','パスワード（確認用・もう一度入力）','password','minlength="12" maxlength="72" autocomplete="new-password"');
 const visibility='<label class="auth-password-toggle"><input type="checkbox" data-show-password> パスワードを表示して確認する</label>';
 let fields;
 if(view==='recover')fields=password+confirmation+visibility;
 else if(view==='forgot'||view==='resend')fields=field('email','登録したメールアドレス','email','autocomplete="email"');
 else {
  fields=field('login','メールアドレス','email','autocomplete="username"');
  if(view==='register')fields+=field('email_confirm','メールアドレス（確認用・もう一度入力）','email','autocomplete="email"')+field('name','表示名','text','maxlength="60"')+field('invite','招待コード','text','maxlength="128"')+'<p class="hint">このアプリへのログインに使う、あなた専用のパスワードを自分で決めてください。メールサービスのパスワードや、同盟共通のパスワードを入力する欄ではありません。</p>'+password+confirmation+visibility;
  else fields+=field('password','パスワード','password','autocomplete="current-password"');
 }
 const titles={login:'ログイン',register:'招待から参加',recover:'新しいパスワード',forgot:'再設定メールを送る',resend:'登録確認メールを再送する'};
 const labels={login:'ログイン',register:'入力内容を確認して登録',recover:'パスワードを変更',forgot:'送信する',resend:'確認メールを再送する'};
 target.innerHTML=`<h2>${titles[view]}</h2>${view==='resend'?'<p>登録時に入力したアドレス宛てに確認メールを再送します。メール内のリンクを開いてからログインしてください。</p>':''}<form data-supabase-auth="${view}">${fields}${view==='register'?'<p class="hint">入力の一致を確認してから登録します。メールアドレスの本人確認は、登録後に届くメールのリンクで行います。メールアドレスは他のメンバーに表示しません。</p>':''}<button type="submit" class="primary">${labels[view]}</button></form>${mailHelp}`;
 if(view==='register')target.querySelector('[name=invite]').value=invite;
 if(view==='resend')target.querySelector('[name=email]').value=pendingEmail;
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-view]');if(b&&!busy){status.textContent='';render(b.dataset.view);}});
document.addEventListener('change',e=>{if(e.target.matches('[data-show-password]'))for(const input of e.target.form.querySelectorAll('[name=password],[name=password_confirm]'))input.type=e.target.checked?'text':'password';});
document.addEventListener('submit',async e=>{
 const form=e.target;if(!form.matches('[data-supabase-auth]'))return;e.preventDefault();if(busy)return;
 const mode=form.dataset.supabaseAuth,data=Object.fromEntries(new FormData(form));
 const error=mode==='register'?registrationError(data):mode==='recover'&&data.password!==data.password_confirm?'パスワードが一致しません。同じパスワードを2回入力してください。':'';
 if(error){status.textContent=error;form.elements[error.startsWith('メール')?'email_confirm':'password_confirm'].focus();return;}
 if(mode==='resend'&&Date.now()<resendAfter){status.textContent=`再送はあと${Math.ceil((resendAfter-Date.now())/1000)}秒お待ちください。`;return;}
 const button=form.querySelector('button[type=submit]');busy=true;button.disabled=true;status.textContent='確認しています…';
 try{
  delete data.email_confirm;delete data.password_confirm;
  if(mode==='register')pendingEmail=data.login.trim();
  if(mode==='resend'){pendingEmail=data.email.trim();resendAfter=Date.now()+60000;}
  const result=await cloudApi(mode,{data});
  if(mode==='forgot')status.textContent='登録済みのアドレスの場合は再設定メールが届きます。届かない場合は「メールが届かない場合」をご確認ください。';
  else if(mode==='resend')status.textContent=`${pendingEmail} が未確認の登録アドレスで、再送対象の場合は確認メールが届きます。受信箱と迷惑メールをご確認ください。`;
  else if(mode==='register'&&result.confirmationRequired){resendAfter=Date.now()+60000;render('resend');status.textContent=`登録リクエストを受け付けました。確認メールの宛先：${pendingEmail}。届いたリンクを開いてからログインしてください。既に登録済みの場合はログインをお試しください。`;}
  else location.replace('./');
 }catch(err){status.textContent=err.message;}finally{busy=false;button.disabled=false;}
});
render(new URLSearchParams(location.search).has('setup')?'setup':recovering?'recover':invite?'register':'login');
try{
 const client=supabaseClient();
 client.auth.onAuthStateChange(event=>{if(event==='PASSWORD_RECOVERY')render('recover');});
 const {data,error}=await client.auth.getSession();if(error)throw error;
 if(data.session&&!recovering&&!invite&&!new URLSearchParams(location.search).has('setup'))location.replace('./');
}catch{status.textContent='接続設定を確認してください。まだ設定前の場合は「管理者として始める手順」をご覧ください。';}
