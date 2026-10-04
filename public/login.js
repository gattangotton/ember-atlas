const form=document.querySelector('#login-form'),error=document.querySelector('#login-error');
const requestedRole=new URLSearchParams(location.search).get('role');
if(requestedRole==='admin')form.elements.role.value='admin';
form.addEventListener('submit',async e=>{
 e.preventDefault();error.textContent='';const button=form.querySelector('button');button.disabled=true;button.textContent='確認しています…';
 try{
  const response=await fetch('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:form.elements.role.value,password:form.elements.password.value})});
  const result=await response.json();if(!response.ok)throw Error(result.error||'ログインできませんでした。');
  form.elements.password.value='';location.replace(result.role==='admin'?'/admin.html#admin':'/#home');
 }catch(err){error.textContent=err.message==='Failed to fetch'?'接続できませんでした。もう一度お試しください。':err.message;form.elements.password.value='';form.elements.password.focus();}
 finally{button.disabled=false;button.textContent='ログイン';}
});
try{const response=await fetch('/auth/session',{cache:'no-store'});if(!response.ok)throw Error();const session=await response.json();if(!session.enabled){form.hidden=true;document.querySelector('#local-note').hidden=false;}}catch{error.textContent='接続できませんでした。ページを再読み込みしてください。';}
