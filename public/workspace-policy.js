// This separates editing workflows. Actual login and admin entry authorization
// are enforced by server-auth.mjs. All edits remain in the current browser.
export const ADMIN_ROUTES=new Set(['admin','foundation','sources','ember-sources']);
export const ADMIN_CONTROLS=[
 '[data-admin-only]','[data-action="record-add"]','[data-action="record-edit"]','[data-action="import-catalog"]','[data-action="confirm-catalog"]','[data-action="export-catalog"]','[data-action="export-base"]',
 '[data-character-edit]','[data-foundation]','[data-growth-save]',
 '[data-domain="configure"]','[data-domain="patterns"]','[data-domain="portrait"]','[data-domain="add-pattern"]','[data-domain="crop-save"]',
 '[data-equipment="patterns"]','[data-equipment="power-edit"]','[data-equipment^="pattern-"]','[data-equipment="from-record"]','[data-equipment="apply-pattern"]',
 '[data-lab="spec"]','[data-lab="suggest-pattern"]','[data-lab="apply-pattern"]',
 '[data-building="edit"]','[data-building-effects]','[data-building-effect-add]','[data-building-effect-remove]',
 '#record-form','#character-editor-form','#mechanics-form','#patterns-form','#equipment-pattern-form','#equipment-power-form','#lab-spec-form','#building-rule-form','#building-effects-form','#foundation-form','#foundation-apply',
 '.ember-data-actions','.forge-evidence','#forge-tab-data','#forge-data','a[href="#foundation"]','a[href="#sources"]','a[href="#ember-sources"]',
];
export const adminControlsSelector=ADMIN_CONTROLS.join(',');
export function workspaceRoute(route,isAdmin){return !isAdmin&&ADMIN_ROUTES.has(route)?'data':route;}
export function installWorkspacePolicy(isAdmin,onBlocked){
 if(isAdmin)return;
 const style=document.createElement('style');style.textContent=`html[data-workspace="user"] :is(${adminControlsSelector}){display:none!important}`;document.head.append(style);
 for(const event of ['click','submit'])document.addEventListener(event,e=>{
  if(e.target instanceof Element&&e.target.closest(adminControlsSelector)){e.preventDefault();e.stopImmediatePropagation();onBlocked();}
 },true);
}
