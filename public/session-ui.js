export async function initializeSession(isAdmin){
 // GitHub Pages serves this app without the Node authentication endpoints.
 // Repository Pages use the github.io host; local Node hosting keeps its normal auth flow.
 if(location.hostname.endsWith('.github.io'))return {enabled:false,role:'admin'};
 const loginUrl='/login.html'+(isAdmin?'?role=admin':'');
 async function read(){const response=await fetch('/auth/session',{cache:'no-store'});if(!response.ok)throw Error('ログイン状態を確認できません。アプリを起動し直してください。');return response.json();}
 let session;
 try{session=await read();}catch(err){document.querySelector('#app').textContent=err.message;throw err;}
 const allowed=s=>!s.enabled||!!s.role&&(!isAdmin||s.role==='admin');
 if(!allowed(session)){location.replace(loginUrl);throw Error('Login required');}
 if(session.enabled){
  document.addEventListener('click',async e=>{if(!e.target.closest('[data-session-logout]'))return;
   try{const response=await fetch('/auth/logout',{method:'POST'});if(!response.ok)throw Error();location.replace('/login.html');}
   catch{document.querySelector('#toast').textContent='ログアウトできませんでした。接続を確認して再試行してください。';}
  });
  // Check when returning to a tab; do not keep an idle session alive with polling.
  let checking=false;
  async function check(){if(checking||document.visibilityState!=='visible')return;checking=true;try{if(!allowed(await read()))location.replace(loginUrl);}catch{/* Offline: preserve unsaved local edits. */}finally{checking=false;}}
  window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);window.addEventListener('pageshow',e=>{if(e.persisted)check();});
 }
 return session;
}
