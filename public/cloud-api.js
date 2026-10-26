import {cloudConfig} from './cloud-config.js';
let csrf='',identity='';
export function setCsrf(value){csrf=value||'';}
export function setIdentity(value){identity=value||'';}
export function apiUrl(action,params={}){
 const url=new URL(cloudConfig.api,new URL('./',import.meta.url));
 url.searchParams.set('action',action);
 for(const [key,value] of Object.entries(params))url.searchParams.set(key,String(value));
 return url;
}
export async function cloudApi(action,{data,params,signal}={}){
 if(cloudConfig.provider==='supabase')return (await import('./supabase-provider.js')).supabaseApi(action,{data,params,signal},()=>identity);
 const multipart=typeof FormData!=='undefined'&&data instanceof FormData;
 const response=await fetch(apiUrl(action,params),{method:data===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',signal,
  headers:{...(identity?{'X-Ember-User':identity}:{}),...(data===undefined?{}:{'X-CSRF-Token':csrf,...(multipart?{}:{'Content-Type':'application/json'})})},body:data===undefined?undefined:multipart?data:JSON.stringify(data)});
 let result;try{result=await response.json();}catch{throw Object.assign(new Error('サーバーからの応答を読み込めません。PHP設定と広告の挿入先を確認してください。'),{status:response.status});}
 if(!response.ok)throw Object.assign(new Error(result.error||'操作を完了できませんでした。'),{status:response.status});
 return result;
}
