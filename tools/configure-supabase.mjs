import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
export function cloudConfiguration(url,key){
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url||''))throw Error('SUPABASE_URLは https://プロジェクトID.supabase.co の形式で指定してください。末尾の / は不要です。');
 if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key||''))throw Error('SUPABASE_PUBLISHABLE_KEYにはsb_publishable_で始まる公開用キーを指定してください。Secret keyやservice_roleは使用できません。');
 return `// Public connection settings. Never put a secret/service_role key here.\nexport const cloudConfig=Object.freeze(${JSON.stringify({enabled:true,provider:'supabase',supabase:{url,publishableKey:key}})});\n`;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const config=cloudConfiguration(process.env.SUPABASE_URL?.trim(),process.env.SUPABASE_PUBLISHABLE_KEY?.trim());
 await writeFile(process.argv[2]||'public/cloud-config.js',config);
 console.log('Supabaseの公開用接続設定を作成しました。');
}
