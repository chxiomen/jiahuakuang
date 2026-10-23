function screenHtml(){const custom=window.workspacePageRenderers[state.pageId];if(custom)return custom();return ({payment:paymentHtml,renewal:renewalHtml,mine:mineHtmlByStatus,home:homeHtml,member:memberHtml})[state.pageId]?.()||customPageHtml();}

function renderPhone(){
  syncWorkspaceMode();
  const config=workspaceBootstrap.prototype.pages[state.pageId]||{};
  const phone=$('#phone');
  phone.className='phone '+(config.phoneClass||'');
  phone.removeAttribute('data-release');
  const item=currentVersionItem();
  if(itemModel(item)?.pageId)phone.classList.add('diff-'+itemModel(item).pageId);
  $('#screen').innerHTML=screenHtml();
  const tabs=[['home','⌂','首页'],['member','◇','会员'],['profile','◯','我的']].filter(([id])=>findPage(id)&&!findPage(id).hidden);
  $('#tabBar').innerHTML=config.hideTabBar?'':tabs.map(([id,icon,name])=>`<button class="${state.pageId===id?'on':''}" data-tab="${id}"><span>${icon}</span>${name}</button>`).join('');
  phone.querySelectorAll('[data-target]').forEach(button=>button.onclick=event=>{event.stopPropagation();openAction(button.dataset.target)});
  phone.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>selectPage(button.dataset.tab,findPage(button.dataset.tab).states[0].id));
  window.workspacePageBindings[state.pageId]?.();
}
