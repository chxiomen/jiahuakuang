/* 我的页会员卡交互：卡片/管理入口进入续费管理，主按钮进入付费流程。 */
function mineRenewalState(info){return info.status==='续费中'?'active':info.status==='已取消'?'canceled':'expired'}
function openMineRenewal(){
  const info=mineStateInfo();
  if(info.type==='Free')return openAction('join');
  state.pageId='renewal';
  const selectedMultipleMember=info.id==='multi-active'&&state.renewalMember==='svip-single';
  state.stateId=info.id==='multi-active'?'active':mineRenewalState(info);
  state.renewalTier=selectedMultipleMember?'svip':info.type==='SVIP'?'svip':'vip';
  state.renewalProduct=info.product==='连续包年'?'annual':'monthly';
  state.noteMode='page';
  state.pageNoteRequested=true;
  state.activeAnnotation=null;
  renderAll();
}
function openMinePayment(){
  const info=mineStateInfo();
  const isUpgrade=info.status==='续费中';
  const isSingle=info.card==='单次卡';
  state.pageId='payment';
  state.stateId='default';
  state.paymentTab=isUpgrade||info.type==='SVIP'?'svip':'vip';
  state.paymentPlan=isUpgrade?(info.type==='VIP'?(info.product==='连续包年'?'annual':'monthly'):'life'):(isSingle?'month1':info.product==='连续包年'?'annual':'monthly');
  state.paymentMemberType=state.paymentTab;
  state.paymentCardType=isSingle?'single':'subscription';
  state.paymentRenewalDate=null;
  state.paymentPlanScrollLeft=0;
  state.paymentAgreed=false;
  state.noteMode='page';
  state.pageNoteRequested=true;
  state.activeAnnotation=null;
  renderAll();
}
function openAction(target){
  if(state.pageId==='payment'&&['lifetime-svip','subscription-renewing'].includes(state.stateId)&&target==='payment-submit')return;
  if(target==='manage'){
    if(state.pageId==='mine')return openMineRenewal();
    if(state.pageId==='member'&&state.stateId==='member'){state.pageId='renewal';state.stateId='active';state.noteMode='page';state.pageNoteRequested=true;renderAll();return}
  }
  if(target==='join'&&state.pageId==='mine')return openMinePayment();
  if(target==='wechat'&&state.pageId==='mine'){showToast('进群入口待配置');return}
  if(target==='payment-submit'&&isRecurringPlan()&&!state.paymentAgreed){showPaymentAgreementSheet();return}
  if(target==='join'&&state.platform!=='ios'){state.pageId='payment';state.stateId='default';state.noteMode='page';state.activeAnnotation=null;renderAll();return}
  const a=annotation(target);if(!a)return;
  clearTextSelection();
  if(target!=='payment-submit'){state.noteMode='annotation';state.activeAnnotation=a;renderNotes()}
  state.sheetAction=target;document.querySelector('.sheet-actions')?.classList.remove('single');$('#sheetTitle').textContent=a.title;$('#sheetText').textContent=a.action;$('#confirm').textContent='确认';$('#cancel').textContent='取消';$('#mask').classList.add('show');$('#sheet').classList.add('show')
}
function mineHtmlMultipleActive(){return `<!-- 两个有效会员共存：汇总最高权益，明细按商品拆分。 --><article class="mine-screen" aria-label="我的页面，两个会员同时生效"><header class="mine-status"><b>3:51</b><span>☾　▮▮▮　⌁　▭</span></header><div class="mine-title"><h1>我的</h1><div class="mine-more">•••　│　◉</div></div><section class="mine-user"><div class="mine-avatar">●</div><strong>加画框用户</strong><b class="mine-vip-badge">SVIP</b><span>ID: 6787677</span></section><section class="mine-vip-card multi-active" data-target="manage" role="button" tabindex="0" aria-label="查看两个同时生效的会员"><div class="mine-card-copy"><h2><span class="mine-card-tier">SVIP会员</span><span class="mine-card-plan-title"> · 2个会员同时生效</span></h2><p>当前最高权益：SVIP</p></div><div class="mine-card-actions"><button class="mine-card-primary" data-target="manage">查看会员明细</button></div></section><section class="mine-active-members" aria-label="生效中的会员明细"><header class="mine-active-members-head"><b>生效中的会员（2）</b><span>权益按最高等级生效</span></header><article class="mine-active-member"><div><strong>VIP会员 · 连续包月</strong><p>续费中 · 下次扣款：2026年10月21日</p></div><button type="button" data-mine-active-member="vip-subscription">管理</button></article><article class="mine-active-member"><div><strong>SVIP会员 · 单次卡</strong><p>生效中 · 权益有效至：2026年12月21日</p></div><button type="button" data-mine-active-member="svip-single">查看</button></article></section><section class="mine-menu-group mine-two"><button class="mine-row" data-target="works"><i class="mine-icon works"></i><b>我的作品</b><span>0个作品</span><em>›</em></button><button class="mine-row" data-target="favorites"><i class="mine-icon heart">♡</i><b>我的收藏</b><span>0个收藏</span><em>›</em></button></section><section class="mine-menu-group mine-four"><button class="mine-row" data-target="settings"><i class="mine-icon">⚙</i><b>设置</b><span>账户管理</span><em>›</em></button><button class="mine-row" data-target="desktop"><i class="mine-icon desktop"></i><b>电脑版</b><span>www.jiahk.cn</span><em>›</em></button><button class="mine-row" data-target="wechat"><i class="mine-icon">◉</i><b>官方微信</b><span>进交流群</span><em>›</em></button><button class="mine-row" data-target="service"><i class="mine-icon headset">♧</i><b>在线客服</b><span>10:00-20:00</span><em>›</em></button></section><button class="mine-recommend" data-target="recommend"><i class="mine-icon">♧</i><b>推荐加画框</b><em>›</em></button></article>`}
function mineHtmlByStatus(){
  const info=mineStateInfo();
  if(info.id==='multi-active')return mineHtmlMultipleActive();
  if(info.type==='Free')return mineHtml();
  const product=info.product||(info.card==='单次卡'?'单次商品':'连续包月');
  const statusClass=info.status==='已取消'?'status-canceled':info.status==='已过期'?'status-expired':'status-renewing';
  const status=info.status==='续费中'?'续费中':info.status==='已取消'?'已取消自动续费':'已过期';
  const subtitle=info.status==='续费中'?'下次扣款日期：2026年10月21日':info.status==='已取消'?'权益有效至：2026年10月21日':'会员权益已过期';
  const footnote=info.status==='续费中'?'可随时取消自动续费':info.status==='已取消'?'当前权益仍可使用，到期后不会再扣费':'重新购买后即可恢复会员权益';
  const group=info.status==='续费中'&&info.type==='VIP';
  const primary=group?'进群':info.status==='续费中'?'终身权益':info.status==='已取消'?'恢复续费':'恢复权益';
  return `<!-- 会员卡片/管理入口进入续费管理；VIP 续费中的主按钮进入交流群入口，其他主按钮进入付费页。 --><article class="mine-screen" aria-label="我的页面"><header class="mine-status"><b>3:51</b><span>☾　▮▮▮　⌁　▭</span></header><div class="mine-title"><h1>我的</h1><div class="mine-more">•••　│　◉</div></div><section class="mine-user"><div class="mine-avatar">●</div><strong>加画框用户</strong><b class="mine-vip-badge">${info.type}</b><span>ID: 6787677</span></section><section class="mine-vip-card ${statusClass}" data-target="manage" role="button" tabindex="0" aria-label="查看${info.type}会员${status}"><div class="mine-card-copy"><div class="mine-card-head"><span class="mine-card-status">${status}</span><span class="mine-card-plan">${product}</span></div><h2>${info.type}会员</h2><p>${subtitle}</p><small class="mine-card-footnote">${footnote}</small></div><div class="mine-card-actions"><button class="mine-card-primary" data-target="${group?'wechat':'join'}">${primary}</button><button class="mine-card-secondary" data-target="manage">续费管理 <span>›</span></button></div></section><section class="mine-menu-group mine-two"><button class="mine-row" data-target="works"><i class="mine-icon works"></i><b>我的作品</b><span>0个作品</span><em>›</em></button><button class="mine-row" data-target="favorites"><i class="mine-icon heart">♡</i><b>我的收藏</b><span>0个收藏</span><em>›</em></button></section><section class="mine-menu-group mine-four"><button class="mine-row" data-target="settings"><i class="mine-icon">⚙</i><b>设置</b><span>账户管理</span><em>›</em></button><button class="mine-row" data-target="desktop"><i class="mine-icon desktop"></i><b>电脑版</b><span>www.jiahk.cn</span><em>›</em></button><button class="mine-row" data-target="wechat"><i class="mine-icon">◉</i><b>官方微信</b><span>进交流群</span><em>›</em></button><button class="mine-row" data-target="service"><i class="mine-icon headset">♧</i><b>在线客服</b><span>10:00-20:00</span><em>›</em></button></section><button class="mine-recommend" data-target="recommend"><i class="mine-icon">♧</i><b>推荐加画框</b><em>›</em></button></article>`;
}
const renderPhoneWithMineActions=renderPhone;
renderPhone=function(){
  renderPhoneWithMineActions();
  if(state.pageId==='mine'){
    const info=mineStateInfo(),card=document.querySelector('.mine-vip-card'),title=card?.querySelector('h2');
    if(title&&info.type!=='Free'&&info.id!=='multi-active'){
      const product=info.product||(info.card==='单次卡'?'单次商品':'连续包月');
      title.textContent='';
      const tier=document.createElement('span');tier.className='mine-card-tier';tier.textContent=`${info.type}会员`;
      const plan=document.createElement('span');plan.className='mine-card-plan-title';plan.textContent=` · ${product}`;
      title.append(tier,plan);
    }
    const copy=card?.querySelector('.mine-card-copy'),date=copy?.querySelector('p'),manage=card?.querySelector('.mine-card-secondary');
    if(copy&&date&&manage){
      const row=document.createElement('div');row.className='mine-card-detail-row';
      date.replaceWith(row);row.append(date,manage);
    }
  }
  document.querySelectorAll('[data-target]').forEach(button=>button.onclick=event=>{event.stopPropagation();openAction(button.dataset.target)});
  document.querySelectorAll('[data-mine-active-member]').forEach(button=>button.onclick=event=>{event.stopPropagation();state.renewalMember=button.dataset.mineActiveMember;openMineRenewal()});
}

$('#treeSwitch').onclick=()=>{state.tree=state.tree==='release'?'page':'release';state.selectedChange=null;state.noteMode='page';state.pageNoteRequested=state.tree==='page';state.activeAnnotation=null;renderAll()};$('#fullNote').onclick=()=>{state.noteMode='page';state.pageNoteRequested=true;state.activeAnnotation=null;state.selectedChange=null;renderAll()};$('#cancel').onclick=closeSheet;$('#agreementClose').onclick=closeSheet;$('#mask').onclick=closeSheet;$('#confirm').onclick=confirmAction;
document.addEventListener('DOMContentLoaded',()=>loadRequirements().catch(error=>{savedRequirements={};requirementsLoadError=error?.message||'无法读取需求数据'}).finally(()=>{loadWorkspaceStructure();renderAll();initRevisionReview()}));
// 线上唯一数据源：Vercel API 读取 Supabase；不再维护离线 JS 数据副本。
async function loadRequirements(){const response=await fetch('/api/requirements',{cache:'no-store'});if(!response.ok)throw new Error('无法读取线上需求数据');const payload=await response.json();savedRequirements=payload.requirements||{};requirementsLoadSucceeded=true}
