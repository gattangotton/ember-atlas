// One-time, user-requested correction, independently applied in each browser.
export const NYX_RESET_KEY='ember-atlas-nyx-values-reset-v1';
export function resetNyxValues(state,id){
 if(!id||!state.overrides?.[id])return false;
 const override=state.overrides[id];
 const changed=Object.hasOwn(override,'skills')||Object.hasOwn(override,'coreEffects');
 delete override.skills;
 delete override.coreEffects;
 return changed;
}
export function migrateNyxValues(state,id,storage,save){
 if(!id||storage.getItem(NYX_RESET_KEY))return false;
 // Keep an exact recoverable snapshot before changing the local record.
 const backupKey=NYX_RESET_KEY+'-backup';
 if(!storage.getItem(backupKey))storage.setItem(backupKey,JSON.stringify({type:'ember-atlas-backup',version:1,exportedAt:new Date().toISOString(),state}));
 const changed=resetNyxValues(state,id);
 if(save()===false)throw Error('ニュクスの設定を保存できませんでした。');
 storage.setItem(NYX_RESET_KEY,'done');
 return changed;
}
