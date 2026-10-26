import {cloudConfig} from './cloud-config.js';
import {createSupabaseAdapter,prepareAttachment} from './supabase-adapter.js';
import {createClient} from './vendor/supabase-client.js';
let client,adapter;
export function supabaseClient(){
 if(!client){
  const {url,publishableKey}=cloudConfig.supabase||{};
  if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url||'')||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey||''))throw Error('Supabaseの接続設定が未完了です。日本語の設置手順に沿って公開URLとPublishable keyを設定してください。');
  client=createClient(url,publishableKey,{auth:{storageKey:'ember-supabase-'+new URL(url).hostname,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 }
 return client;
}
export function supabaseApi(action,options,getIdentity){
 if(!adapter)adapter=createSupabaseAdapter({client:supabaseClient(),getIdentity,prepareFile:prepareAttachment,redirectUrl:new URL('./cloud-login.html',location.href).href});
 return adapter(action,options);
}
