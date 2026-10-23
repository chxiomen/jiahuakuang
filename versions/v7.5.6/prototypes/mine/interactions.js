function mineRenewalState(info){return info.status==='续费中'?'active':info.status==='已取消'?'canceled':'expired'}

function openMineRenewal(){
  const info=mineStateInfo();
  if(info.type==='Free')return openAction('join');
  rememberPageOrigin('renewal');
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
  rememberPageOrigin('payment');
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
function bindMineStateTabs(){if(state.pageId!=='mine')return;const info=mineStateInfo();document.querySelectorAll('[data-mine-type]').forEach(button=>button.onclick=()=>{const next=button.dataset.mineType;if(next==='Free'){state.stateId='free'}else{state.stateId=next.toLowerCase()==='vip'?'vip-subscription-renewing':'svip-subscription-renewing'}state.selectedChange=null;state.noteMode='page';renderAll()});document.querySelectorAll('[data-mine-card]').forEach(button=>button.onclick=()=>{if(button.dataset.mineCard==='双会员'){state.stateId='multi-active'}else{const type=info.type.toLowerCase();state.stateId=`${type}-subscription-renewing`;if(button.dataset.mineCard==='单次卡')state.stateId=`${type}-single-active`}state.selectedChange=null;state.noteMode='page';renderAll()});document.querySelectorAll('[data-mine-status]').forEach(button=>button.onclick=()=>{if(info.id==='multi-active'){state.stateId='multi-active'}else{const type=info.type.toLowerCase(),card=info.card==='单次卡'?'single':'subscription',suffix=button.dataset.mineStatus==='续费中'?'renewing':button.dataset.mineStatus==='已取消'?'canceled':button.dataset.mineStatus==='生效中'?'active':'expired';state.stateId=`${type}-${card}-${suffix}`}state.selectedChange=null;state.noteMode='page';renderAll()})}

function bindMinePreview(){
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
window.workspacePageBindings.mine=bindMinePreview;
