function rememberPageOrigin(targetPage){
  if(state.pageId===targetPage)return;
  state.pageOrigins ||= {};
  state.pageOrigins[targetPage]={pageId:state.pageId,stateId:state.stateId,platform:state.platform};
}

function returnToPageOrigin(targetPage,fallbackPage='mine',fallbackState='free'){
  const origin=state.pageOrigins?.[targetPage];
  if(origin)delete state.pageOrigins[targetPage];
  const valid=origin&&findPage(origin.pageId)?.states.some(item=>item.id===origin.stateId);
  if(valid){state.platform=origin.platform;selectPage(origin.pageId,origin.stateId);return}
  selectPage(fallbackPage,fallbackState);
}

function selectPage(pageId,stateId){if(pageId==='payment')rememberPageOrigin('payment');state.pageId=pageId;state.stateId=stateId;if(pageId==='payment'&&(stateId==='lifetime-member'||stateId==='lifetime-svip')){state.paymentMemberType=stateId==='lifetime-svip'?'svip':state.paymentMemberType==='svip'?'svip':'vip';state.paymentCardType='lifetime';state.paymentTab=state.paymentMemberType;if(stateId==='lifetime-member'&&state.paymentMemberType==='vip'){state.stateId='default';state.paymentTab='svip';state.paymentPlan='annual'}}if(pageId==='payment'&&(stateId==='single-member'||stateId==='subscription-canceled')){state.paymentMemberType=state.paymentMemberType==='svip'?'svip':'vip';state.paymentCardType=stateId==='single-member'?'single':'subscription';state.paymentSubscriptionState=stateId==='subscription-canceled'?'canceled':'renewing';state.paymentTab=state.paymentMemberType}if(pageId==='payment'&&stateId==='subscription-renewing'){state.paymentMemberType='svip';state.paymentCardType='subscription';state.paymentSubscriptionState='renewing';state.paymentSubscriptionProduct='annual';state.paymentTab='svip';state.paymentPlan='life'}state.selectedChange=null;state.noteMode='page';state.pageNoteRequested=true;state.activeAnnotation=null;renderAll()}

function clearTextSelection(){const selection=window.getSelection?.();if(selection)selection.removeAllRanges()}

function closeSheet(){clearTextSelection();document.querySelector('.sheet-actions')?.classList.remove('single');state.sheetAction=null;$('#mask').classList.remove('show');$('#sheet').classList.remove('show','payment-agreement-sheet','renewal-apple-sheet')}

function confirmAction(){if(state.sheetAction==='payment-agreement'){state.paymentAgreed=true;const checkbox=$('#paymentAgreement');if(checkbox)checkbox.checked=true;closeSheet();openAction('payment-submit');return}if(state.sheetAction==='payment-ios-existing-subscription'){state.paymentIosConfirmed=true;closeSheet();openAction('payment-submit');return}if(state.sheetAction==='renewal-cancel'){state.stateId='canceled';state.noteMode='page';state.activeAnnotation=null;showToast('已关闭自动续费')}else if(state.sheetAction==='join'&&state.platform!=='ios'){state.stateId='member';state.noteMode='page';state.activeAnnotation=null;showToast('已开通会员（原型模拟）')}else if(state.sheetAction==='payment-submit'){state.paymentIosConfirmed=false;showToast('已请求支付（原型模拟）')}else if(state.sheetAction==='core'||state.sheetAction==='entry'){showToast('操作成功（原型模拟）')}closeSheet();renderAll()}
function openAction(target){
  if(state.pageId==='payment'&&target==='payment-submit'&&(state.stateId==='lifetime-svip'||paymentPlanUnavailable()))return;
  if(target==='manage'){
    if(state.pageId==='mine')return openMineRenewal();
    if(state.pageId==='member'&&state.stateId==='member'){rememberPageOrigin('renewal');state.pageId='renewal';state.stateId='active';state.noteMode='page';state.pageNoteRequested=true;renderAll();return}
  }
  if(target==='join'&&state.pageId==='mine')return openMinePayment();
  if(target==='wechat'&&state.pageId==='mine'){showToast('进群入口待配置');return}
  if(target==='payment-submit'&&isRecurringPlan()&&!state.paymentAgreed){showPaymentAgreementSheet();return}
  if(target==='payment-submit'&&state.pageId==='payment'&&paymentIosConfirmationRequired()&&!state.paymentIosConfirmed){
    state.sheetAction='payment-ios-existing-subscription';
    $('#sheetTitle').textContent='当前已存在续订套餐';
    $('#sheetText').textContent='是否确认继续购买？旧续费请在 Apple 订阅中管理。';
    $('#confirm').textContent='确认继续购买';
    $('#cancel').textContent='取消';
    $('#mask').classList.add('show');$('#sheet').classList.add('show');return;
  }
  if(target==='join'&&state.platform!=='ios'){rememberPageOrigin('payment');state.pageId='payment';state.stateId='default';state.noteMode='page';state.activeAnnotation=null;renderAll();return}
  const a=annotation(target);if(!a)return;
  clearTextSelection();
  if(target!=='payment-submit'){state.noteMode='annotation';state.activeAnnotation=a;renderNotes()}
  state.sheetAction=target;document.querySelector('.sheet-actions')?.classList.remove('single');$('#sheetTitle').textContent=a.title;$('#sheetText').textContent=a.action;$('#confirm').textContent='确认';$('#cancel').textContent='取消';$('#mask').classList.add('show');$('#sheet').classList.add('show')
}
