// Client-side invitation gate only; not a security boundary for public code.
export const BETA_DIGEST='c8bb3eb55c96dcd5e62158ee2b2d387aec646dd3b5be3a45e7eccbf64b7e7305';
export function createBetaAccess({digest=BETA_DIGEST,storage=()=>globalThis.sessionStorage}={}){
 const key='ember-atlas-planner-beta';let granted=false;
 return {
  allowed(){if(granted)return true;try{return storage()?.getItem(key)===digest;}catch{return false;}},
  async unlock(code){
   const normalized=String(code||'').trim().toUpperCase();if(!normalized||normalized.length>100)return false;
   const bytes=await globalThis.crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalized));
   const actual=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
   if(actual!==digest)return false;granted=true;try{storage()?.setItem(key,digest);}catch{}return true;
  },
  lock(){granted=false;try{storage()?.removeItem(key);}catch{}}
 };
}
export const plannerBetaAccess=createBetaAccess();
