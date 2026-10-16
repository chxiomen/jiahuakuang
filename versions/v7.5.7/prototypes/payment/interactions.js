function syncPaymentRequirementPreview(){
  if(state.pageId!=='payment')return;
  const lifetime=state.paymentCardType==='lifetime';
  const single=state.paymentCardType==='single'&&state.paymentMemberType!=='free';
  const renewing=state.paymentCardType==='subscription'&&state.paymentSubscriptionState==='renewing';
  const canceled=state.paymentCardType==='subscription'&&state.paymentSubscriptionState==='canceled'&&state.paymentMemberType!=='free';
  const vipLifetime=lifetime&&state.paymentMemberType==='vip';
  state.stateId=vipLifetime?'default':lifetime?'lifetime-member':single?'single-member':renewing?'subscription-renewing':canceled?'subscription-canceled':'default';
  state.paymentTab=vipLifetime||state.paymentMemberType==='svip'?'svip':'vip';
  if(vipLifetime)state.paymentPlan='annual';
  if(state.paymentCardType==='subscription'&&state.paymentSubscriptionState==='canceled')state.paymentPlan=state.paymentSubscriptionProduct;
  state.paymentPlanScrollLeft=0;
  renderAll();
}

function bindPaymentRequirementStateTabs(){document.querySelectorAll('[data-payment-member]').forEach(button=>button.onclick=()=>{state.paymentMemberType=button.dataset.paymentMember;if(state.paymentMemberType==='free'){state.paymentCardType='single';state.paymentSubscriptionState='renewing'}syncPaymentRequirementPreview()});document.querySelectorAll('[data-payment-card]').forEach(button=>button.onclick=()=>{state.paymentCardType=button.dataset.paymentCard;if(state.paymentCardType!=='subscription')state.paymentSubscriptionState='renewing';syncPaymentRequirementPreview()});document.querySelectorAll('[data-payment-subscription]').forEach(button=>button.onclick=()=>{state.paymentSubscriptionState=button.dataset.paymentSubscription;syncPaymentRequirementPreview()});document.querySelectorAll('[data-payment-product]').forEach(button=>button.onclick=()=>{state.paymentSubscriptionProduct=button.dataset.paymentProduct;syncPaymentRequirementPreview()})}

function isRecurringPlan(){return state.paymentPlan==='annual'||state.paymentPlan==='monthly'}

function showPaymentAgreementSheet(){
  clearTextSelection();
  const plan=paymentPlansFor().find(item=>item.id===state.paymentPlan);
  if(!plan||!isRecurringPlan())return;
  const tier=state.paymentTab==='svip'?'SVIP':'VIP',cycleDays=state.paymentPlan==='annual'?372:31,nextDate=paymentNextDate();
  state.sheetAction='payment-agreement';
  document.querySelector('.sheet-actions')?.classList.remove('single');
  $('#sheet').classList.add('payment-agreement-sheet');
  $('#sheetTitle').textContent='';
  $('#sheetText').innerHTML=`<!-- PRD TBD · 图6 未勾选点击支付协议弹窗 -->
    <article class="agreement-document" aria-label="加画框${tier}服务协议（含自动续费协议）">
      <h3>加画框${tier}服务协议</h3>
      <p class="agreement-intro">欢迎您使用加画框${tier}服务</p>
      <h4>特别提醒：</h4>
      <p><strong>1、</strong>在您阅读并决定是否接受《加画框${tier}服务协议》（含自动续费协议），以及付费开通加画框${tier}服务之前，请仔细阅读本协议。未满14周岁的用户应在监护人陪同下阅读，并由监护人决定是否同意购买及使用。</p>
      <div class="agreement-product"><b>当前选择：${tier} · ${plan.name}</b><span>首次支付 ¥${plan.price}；此后每${cycleDays}天自动续费 ¥${plan.price}</span></div>
      <h4>一、服务与费用</h4>
      <p>您开通的是加画框${tier} ${plan.name}服务。本次支付金额为 <strong>¥${plan.price}</strong>，支付成功后获得相应会员权益。实际权益生效以支付结果和服务端确认的信息为准。</p>
      <h4>二、自动续费</h4>
      <p>开通后，服务将在每个${cycleDays}天周期结束时自动续费，每期扣费 <strong>¥${plan.price}</strong>。按固定天数计算，下次预计扣款日期为 <strong>${nextDate}</strong>；实际扣款时间和金额以签约页面及订单记录为准。</p>
      <h4>三、取消续费</h4>
      <p>您可随时在微信的自动续费管理页面关闭续费。关闭后不会再产生下一期自动扣费，已支付的当期会员权益继续使用至有效期结束。</p>
      <h4>四、问题反馈</h4>
      <p>如对协议、会员权益或扣费有疑问，请通过加画框页面内的客服入口联系我们。点击下方按钮表示您已阅读并同意本协议，继续开通当前选择的${tier} ${plan.name}服务。</p>
    </article>`;
  $('#sheetText').scrollTop=0;
  $('#confirm').textContent='已阅读并同意开通';
  $('#mask').classList.add('show');
  $('#sheet').classList.add('show');
}

function bindPaymentAgreement(){const agree=$('#screen .pay-agree');if(!agree)return;const recurring=isRecurringPlan();agree.classList.toggle('recurring-agreement',recurring);if(recurring){agree.innerHTML=`<input id="paymentAgreement" type="checkbox" ${state.paymentAgreed?'checked':''}><label for="paymentAgreement">开通会员代表接受<a>《会员服务协议（含自动续费协议）》</a>，${paymentNextDate()}到期自动续费，可随时取消</label>`;$('#paymentAgreement').onchange=e=>{state.paymentAgreed=e.target.checked}}else{agree.innerHTML='开通会员代表接受<a>《会员服务协议》</a>'}}
function bindPaymentPlanScroller(){const list=$('.pay-plan-list');if(!list)return;const restoreLeft=state.paymentPlanScrollLeft||0;requestAnimationFrame(()=>{if(list.isConnected)list.scrollLeft=restoreLeft});list.addEventListener('scroll',()=>{state.paymentPlanScrollLeft=list.scrollLeft},{passive:true});list.addEventListener('wheel',event=>{if(!event.shiftKey&&!event.deltaX)return;list.scrollLeft+=event.deltaX||event.deltaY;event.preventDefault()},{passive:false})}

function bindPaymentControls(){
document.querySelectorAll('[data-payment-tab]').forEach(b=>b.onclick=e=>{e.stopPropagation();if(state.paymentTab!==b.dataset.paymentTab)state.paymentAgreed=false;state.paymentTab=b.dataset.paymentTab;const plans=paymentPlansFor();if(!plans.some(plan=>plan.id===state.paymentPlan))state.paymentPlan=plans[0].id;state.paymentPlanScrollLeft=0;renderPhone()});
document.querySelectorAll('[data-payment-plan]').forEach(b=>b.onclick=e=>{e.stopPropagation();state.paymentPlanScrollLeft=$('.pay-plan-list')?.scrollLeft||0;if(state.paymentPlan!==b.dataset.paymentPlan)state.paymentAgreed=false;state.paymentPlan=b.dataset.paymentPlan;renderPhone()});
}
window.workspacePageBindings.payment=function(){bindPaymentControls();bindPaymentPlanScroller();bindPaymentAgreement();document.querySelector('[data-lifetime-frame]')?.addEventListener('click',()=>showToast('已返回加框页（原型模拟）'));};
