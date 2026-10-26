// Matching detects typing mistakes; the email link verifies mailbox ownership.
export function registrationError(data){
 if(data.login.trim().toLowerCase()!==data.email_confirm.trim().toLowerCase())return 'メールアドレスが一致しません。2つの入力欄を確認してください。';
 if(data.password!==data.password_confirm)return 'パスワードが一致しません。同じパスワードを2回入力してください。';
 return '';
}
