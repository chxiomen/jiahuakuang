const requirementsNoteWithPaymentVariants=requirementsNote;
function paymentRequirementVariant(key){
  const isSingleCard=state.paymentCardType==='single';
  const isRenewingSubscription=state.paymentCardType==='subscription'&&state.paymentSubscriptionState==='renewing';
  const isCanceledSubscription=state.paymentCardType==='subscription'&&state.paymentSubscriptionState==='canceled';
  const isLifetimeMember=state.paymentCardType==='lifetime';
  if(key!=='change:c-subscription-payment'||state.paymentMemberType==='free'||(!isSingleCard&&!isRenewingSubscription&&!isCanceledSubscription&&!isLifetimeMember))return null;
  const tier=state.paymentMemberType==='svip'?'SVIP':'VIP';
  return isSingleCard
    ? `<p class="requirement-text-item">用户当前是单次卡的 ${tier} 会员状态，此部分保持线网逻辑，无任何修改。</p>`
    : isRenewingSubscription
      ? `<p class="requirement-text-item">用户当前是续费中的 ${tier} 订阅卡会员状态，此部分保持线网逻辑，无需展示套餐列表、协议文案和点击购买。</p>`
      : isCanceledSubscription
        ? `<p class="requirement-text-item">此情况等同于单次卡会员的状态</p>`
      : tier==='VIP'
        ? `<p class="requirement-text-item">用户当前是 VIP 终身会员状态，此部分保持现网逻辑，除增加 SVIP 两个连续商品外，无任何修改。</p>`
        : `<p class="requirement-text-item">用户当前是 SVIP 终身会员状态，此部分保持线网逻辑，无任何修改。</p>`;
}
function paymentRequirementVariantKey(key){
  const isSingleCard=state.paymentCardType==='single';
  const isRenewingSubscription=state.paymentCardType==='subscription'&&state.paymentSubscriptionState==='renewing';
  const isCanceledSubscription=state.paymentCardType==='subscription'&&state.paymentSubscriptionState==='canceled';
  const isLifetimeMember=state.paymentCardType==='lifetime';
  if(key!=='change:c-subscription-payment'||state.paymentMemberType==='free'||(!isSingleCard&&!isRenewingSubscription&&!isCanceledSubscription&&!isLifetimeMember))return key;
  return `${key}:${state.paymentMemberType}-${isSingleCard?'single':isRenewingSubscription?'subscription-renewing':isCanceledSubscription?'subscription-canceled':'lifetime'}`;
}
requirementsNote=function(req,key){
  const variantKey=paymentRequirementVariantKey(key);
  if(variantKey===key)return requirementsNoteWithPaymentVariants(req,key);
  const variantHtml=Object.prototype.hasOwnProperty.call(savedRequirements,variantKey)?savedRequirements[variantKey]:paymentRequirementVariant(key);
  const previous=savedRequirements[key];
  savedRequirements[key]=variantHtml;
  let html;
  try{html=requirementsNoteWithPaymentVariants(req,key)}finally{if(previous===undefined)delete savedRequirements[key];else savedRequirements[key]=previous}
  return html.replace(`data-requirement-key="${escape(key)}"`,`data-requirement-key="${escape(variantKey)}"`);
};
const stateRequirementsNoteFromDefaults=stateRequirementsNote;
function renewalPlatformSections(html,isCommon=false){
  const container=document.createElement('div');
  container.innerHTML=html;
  container.querySelectorAll('.requirement-section').forEach(section=>{
    const heading=section.querySelector('h3')?.textContent?.trim()||'';
    if(heading.startsWith('Android ')||heading==='续费开关')section.dataset.renewalPlatform='android';
    if(heading.startsWith('iOS '))section.dataset.renewalPlatform='ios';
    if(isCommon&&heading==='底部操作入口')section.querySelectorAll('li').forEach(item=>{
      const copy=item.textContent.trim();
      if(copy.startsWith('Android：'))item.dataset.renewalPlatform='android';
      if(copy.startsWith('iOS：')||copy.startsWith('点击 iOS'))item.dataset.renewalPlatform='ios';
    });
  });
  return container.innerHTML;
}
function renewalModalRequirement(){
  if(state.stateId==='active')return '';
  const annual=state.renewalProduct==='annual',tier=state.renewalTier==='svip'?'SVIP':'VIP',product=annual?'连续包年':'连续包月',price=state.renewalTier==='svip'?(annual?'¥128 / 年':'¥28 / 月'):(annual?'¥88 / 年':'¥18 / 月');
  const copy=state.stateId==='canceled'?`当前权益将于 2026年10月21日到期，重新开通即可继续使用。`:state.stateId==='expired'?'当前会员权益已失效，重新开通即可恢复。':'当前为“续费中”状态，不展示复购弹窗。';
  return `<aside class="renewal-modal-spec"><nav class="renewal-modal-selector" aria-label="复购弹窗状态、会员等级和商品切换"><div class="renewal-modal-selector-row"><button type="button" class="${state.stateId==='canceled'?'active':''}" data-renewal-modal-state="canceled">已取消但权益有效</button><button type="button" class="${state.stateId==='expired'?'active':''}" data-renewal-modal-state="expired">已到期</button></div><div class="renewal-modal-selector-row"><button type="button" class="${state.renewalTier==='vip'?'active':''}" data-renewal-modal-tier="vip">VIP</button><button type="button" class="${state.renewalTier==='svip'?'active':''}" data-renewal-modal-tier="svip">SVIP</button></div><div class="renewal-modal-selector-row"><button type="button" class="${!annual?'active':''}" data-renewal-modal-product="monthly">连续包月</button><button type="button" class="${annual?'active':''}" data-renewal-modal-product="annual">连续包年</button></div></nav><div class="renewal-modal-prototype"><article class="repurchase-modal renewal-repurchase-modal" role="dialog" aria-label="复购弹窗原型"><img class="vip-modal-crown" src="assets/payment-lifetime-crown.png" alt=""><div class="repurchase-modal-head"><div><p class="repurchase-modal-kicker">${state.stateId==='expired'?'欢迎再次回来':'让会员时光继续'}</p><h2>${state.stateId==='expired'?'重新开通会员':'恢复续费'}</h2></div><button class="repurchase-close" type="button" aria-label="关闭">×</button></div><p class="repurchase-modal-copy renewal-summary-card"><b><span>${tier} · ${product}</span><em>${price}</em></b><span>${state.stateId==='expired'?'当前会员权益已失效':'当前权益将于 2026年10月21日到期'}</span></p><div class="repurchase-modal-actions"><button class="repurchase-primary" type="button" data-renewal-modal-buy>${state.stateId==='expired'?'再次激活权益':'去延长权益'}</button></div></article></div></aside><svg class="renewal-modal-connector-svg" aria-hidden="true"><line data-renewal-modal-connector></line></svg>`;
}
stateRequirementsNote=function(req,key){
  const activeState=req.states.find(item=>item.id===state.stateId)||req.states[0];
  const stateKey=`${key}:${activeState.id}`;
  const commonKey=`${key}:common`;
  let stateHtml=savedRequirements[stateKey]||'';
  let commonHtml=savedRequirements[commonKey]||savedRequirements[key]||'';
  if(!stateHtml&&!commonHtml&&!Object.prototype.hasOwnProperty.call(savedRequirements,stateKey)&&!Object.prototype.hasOwnProperty.call(savedRequirements,commonKey))return requirementsLoadSucceeded?stateRequirementsNoteFromDefaults(req,key):missingRequirementNote();
  if(stateHtml.includes('requirement-state-content')){
    const temp=document.createElement('div');
    temp.innerHTML=stateHtml;
    stateHtml=temp.querySelector('.requirement-state-content')?.innerHTML||'';
    commonHtml=commonHtml||temp.querySelector('.requirement-common-content')?.innerHTML||'';
  }
  let stateContent=stateHtml||'<p class="requirement-state-summary">当前状态暂无已保存内容。</p>';
  if(key==='change:c-subscription-renewal'&&(activeState.id==='canceled'||activeState.id==='expired')){const renewalActionLabel=activeState.id==='expired'?'再次激活权益':'去延长权益';stateContent=stateContent.replace(/用户点击开关后，(?:跳转至付费页|触发复购弹窗；点击“重新开通”进入当前商品购买流程，点击“查看所有套餐”进入全屏付费页)/g,`用户点击开关后，触发 <span class="renewal-modal-anchor">复购弹窗</span>；点击“${renewalActionLabel}”进入当前商品付费页`)}
  if(key==='change:c-subscription-renewal')stateContent=renewalPlatformSections(stateContent);
  const commonContent=commonHtml?`<div class="requirement-common-heading">通用页面需求</div><div class="requirement-common-content">${key==='change:c-subscription-renewal'?renewalPlatformSections(commonHtml,true):commonHtml}</div>`:'';
  const renewalTabs=key==='change:c-subscription-renewal'?`<nav class="requirement-state-tabs renewal-requirement-state-tabs"><div class="renewal-state-group" aria-label="订阅平台">${[['android','Android'],['ios','iOS']].map(([id,name])=>`<button type="button" class="${(state.platform==='mini'?'android':state.platform)===id?'active':''}" data-renewal-platform="${id}">${name}</button>`).join('')}</div><i class="renewal-state-divider">｜</i><div class="renewal-state-group">${req.states.map(item=>`<button class="${item.id===activeState.id?'active':''}" data-requirement-state="${item.id}">${escape(item.name)}</button>`).join('')}</div><i class="renewal-state-divider">｜</i><div class="renewal-state-group"><button class="${state.renewalTier==='vip'?'active':''}" data-renewal-tier="vip">VIP</button><button class="${state.renewalTier==='svip'?'active':''}" data-renewal-tier="svip">SVIP</button></div></nav>`:`<nav class="requirement-state-tabs">${req.states.map(item=>`<button class="${item.id===activeState.id?'active':''}" data-requirement-state="${item.id}">${escape(item.name)}</button>`).join('')}</nav>`;
  const editor=`<div class="requirements-editor" data-requirement-key="${escape(stateKey)}" ${key==='change:c-subscription-renewal'?`data-renewal-platform="${state.platform==='mini'?'android':state.platform}"`:''}><div class="requirements-editor-toolbar"><button type="button" data-editor-action="edit">编辑</button><button type="button" data-editor-action="bold">加粗</button><button type="button" data-editor-action="highlight">高亮</button><button type="button" data-editor-action="row-highlight">高亮表格行</button><small data-editor-status>只读</small><button type="button" class="save" data-editor-action="save">保存</button></div>${renewalTabs}<article class="requirements-note requirements-editor-content" contenteditable="false"><div class="requirement-state-content">${stateContent}</div>${commonContent}</article></div>`;
  if(key==='change:c-subscription-mine'){
    const info=mineStateCatalog.find(item=>item.id===activeState.id)||mineStateInfo();
    const group=info.status==='续费中'&&info.type==='VIP';
    const primary=group?'进群':info.status==='续费中'?'终身权益':info.status==='已取消'?'恢复续费':info.status==='已过期'?'恢复权益':'开通会员';
    stateContent=stateContent.replace(/主按钮：<span class="mine-upgrade-modal-anchor">更高权益<\/span>|主按钮：更高权益[^<]*/g,group?'主按钮：进群；点击后进入交流群入口':`主按钮：${primary}；点击后直接进入付费页并自动选中对应商品，不展示中间弹窗`);
    const updatedEditor=editor.replace(`<div class="requirement-state-content">${stateHtml}</div>`,`<div class="requirement-state-content">${stateContent}</div>`);
    return `<div class="mine-requirements-layout">${updatedEditor}</div>`;
  }
  return key==='change:c-subscription-renewal'?`<div class="renewal-requirements-layout">${editor}${renewalModalRequirement()}</div>`:editor;
};
