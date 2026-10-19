/* 线上版只从 /api/requirements 读取数据；编辑按钮点击后验证密码。 */
// 仅保存在当前电脑的浏览器中；清除本站点数据后才会再次要求输入。
let editorPassword=localStorage.getItem('requirementsEditorPassword')||'';
function requirementsWriteHeaders(){return {'Content-Type':'application/json','x-editor-password':editorPassword}}
function ensureEditorAccess(onGranted){
  if(editorPassword)return true;
  if(document.querySelector('.editor-access-dialog'))return false;
  const dialog=document.createElement('dialog');
  dialog.className='editor-access-dialog';
  dialog.innerHTML='<form method="dialog"><h2>验证编辑权限</h2><label>编辑密码<input type="password" name="password" autocomplete="current-password" required></label><div class="dialog-actions"><button type="button" data-close>取消</button><button type="submit" class="save">继续</button></div></form>';
  document.body.append(dialog);
  dialog.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.querySelector('form').onsubmit=event=>{event.preventDefault();const value=dialog.querySelector('input').value;if(!value)return;editorPassword=value;localStorage.setItem('requirementsEditorPassword',value);dialog.close();if(onGranted)queueMicrotask(onGranted);else showToast('验证信息已填写，请重试刚才的操作')};
  dialog.addEventListener('close',()=>dialog.remove());
  dialog.showModal();
  return false;
}
/* 当前真实业务数据：生产接入时可替换为 API 返回的同构数据，不改变视图组件。 */

const data=workspaceBootstrap.catalog;
const platformNames={ios:'iOS',android:'Android',mini:'微信小程序'};
const state={tree:'release',pageId:'payment',stateId:'default',platform:'ios',selectedRelease:data.releases[0]?.id||null,selectedChange:null,folded:new Set(),noteMode:'release',pageNoteRequested:false,activeAnnotation:null,sheetAction:null,paymentTab:'vip',paymentPlan:'annual',paymentPlanScrollLeft:0,paymentAgreed:false,paymentRenewalDate:null,paymentMemberType:'free',paymentCardType:'single',paymentSubscriptionState:'renewing',paymentSubscriptionProduct:'annual',renewalTier:'vip',renewalProduct:'monthly',renewalMember:'vip-subscription'};
let savedRequirements={};
const $=s=>document.querySelector(s);
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
state.selectedRelease=workspaceBootstrap.activeVersion;
