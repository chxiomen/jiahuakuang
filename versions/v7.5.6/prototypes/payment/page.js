function paymentPlansFor(tab=state.paymentTab){return (tab==='svip'?[{id:'annual',name:'连续包年',price:'128',old:'298元',tag:'热门选择'},{id:'monthly',name:'连续包月',price:'28',old:'¥28'},{id:'life',name:'终身会员',price:'298',old:'30元'},{id:'year12',name:'12个月',price:'128',old:'30元'},{id:'month1',name:'1个月',price:'28',old:'30元'}]:[{id:'annual',name:'连续包年',price:'88',old:'198元',tag:'热门选择'},{id:'monthly',name:'连续包月',price:'18',old:'¥18'},{id:'life',name:'终身会员',price:'198',old:'30元'},{id:'year12',name:'12个月',price:'88',old:'30元'},{id:'month3',name:'3个月',price:'68',old:'30元'},{id:'month1',name:'1个月',price:'18',old:'30元'}])}

function paymentNextDate(planId=state.paymentPlan){if(state.paymentRenewalDate)return state.paymentRenewalDate;const days=planId==='annual'?372:31,date=new Date();date.setDate(date.getDate()+days);return `${date.getFullYear()} 年 ${date.getMonth()+1} 月 ${date.getDate()} 日`}

// PRD TBD · 续费中购买其他套餐：仅会关闭旧续费的组合在购买按钮上方提示。
function paymentPurchaseNotice(){
 if(state.paymentMemberType==='free'||state.paymentCardType!=='subscription'||state.paymentSubscriptionState!=='renewing'||state.paymentTab==='credit'||state.subscriptionPlatform==='ios')return '';
 const currentRank=state.paymentMemberType==='svip'?2:1;
 const targetRank=state.paymentTab==='svip'?2:1;
 const plan=state.paymentPlan;
 if(plan==='life'&&targetRank>=currentRank)return '购买后将自动关闭已有的续费套餐';
 if(['month1','month3','year12'].includes(plan)&&targetRank===currentRank)return '购买后将自动关闭已有的续费套餐，已付会员天数保留';
 if(['annual','monthly'].includes(plan)&&targetRank>currentRank)return '升级后原 VIP 自动续费将关闭，并停止扣款';
 return '';
}
function paymentPlanUnavailable(){return state.paymentMemberType!=='free'&&state.paymentCardType==='subscription'&&state.paymentSubscriptionState==='renewing'&&['annual','monthly'].includes(state.paymentPlan)&&(state.paymentTab==='vip'||state.paymentMemberType==='svip')}

function paymentHtml(){
 const plans=paymentPlansFor();
 const activePlan=plans.find(plan=>plan.id===state.paymentPlan)||plans[0];
 const isLifetimeSvip=state.stateId==='lifetime-svip';
 const isLifetimeMember=state.stateId==='lifetime-member'||isLifetimeSvip;
 const isVipLifetime=state.paymentCardType==='lifetime'&&state.paymentMemberType==='vip';
 const isVipLifetimeTab=isVipLifetime&&state.paymentTab==='vip';
 const isSubscriptionRenewing=state.stateId==='subscription-renewing';
 const isSubscriptionCanceled=state.stateId==='subscription-canceled';
 const isSingleCardMember=state.stateId==='single-member';
 const isMemberOwned=isLifetimeMember||isSubscriptionCanceled||isSingleCardMember||isVipLifetimeTab;
 const subscriptionTier=state.paymentMemberType==='svip'?'SVIP':'VIP';
 const subscriptionProduct=state.paymentSubscriptionProduct==='annual'?'连续包年':'连续包月';
 const tabBackground={vip:'l',svip:'m',credit:'r'}[state.paymentTab];
 const rights=[
  ['权益','普通用户','VIP','SVIP'],['VIP全部权益','no','yes','yes'],['SVIP画框','no','no','yes'],['SVIP滤镜','no','no','yes'],['SVIP场景','no','no','yes'],['网页端','no','no','yes'],['自定义印章','10次/月','10次/月','300次/月'],['画质修复','no','no','yes'],['作品合拍','no','no','yes'],['商用版权证明','no','no','yes'],['SVIP矫正','no','no','yes'],['SVIP专属功能','','',''],['SVIP专属功能','no','no','持续开发']
 ];
 const icon=v=>v==='yes'?'<span class="right-yes">✓</span>':v==='no'?'<span class="right-no">×</span>':escape(v);
 const col=(index,klass='')=>`<div class="rights-col ${klass}">${rights.map((row,i)=>`<div class="rights-cell ${i===6?'rights-small':''}">${icon(row[index])}</div>`).join('')}</div>`;
 return `<!-- PRD TBD · 图4 付费页默认态：真实 DOM 复刻，banner 为原始木纹素材。 -->
 <article class="payment${isMemberOwned?' member-owned':''}${isSingleCardMember||isSubscriptionCanceled?' single-card-member':''}" aria-label="${isLifetimeMember||isVipLifetimeTab?`${subscriptionTier} 终身会员已开通`:isSubscriptionRenewing?'连续会员续费中':isSubscriptionCanceled?`${subscriptionTier} 订阅卡已取消`:isSingleCardMember?`${subscriptionTier} 单次卡已开通`:'付费页默认态'}">
   <header class="pay-head"><div class="pay-banner"><img src="assets/payment-banner.png" alt="木纹静字画"></div><div class="pay-status"><span>10:00</span><span class="pay-status-right">▮▮▮　⌁ <i class="pay-battery"></i></span></div><div class="pay-nav"><button class="pay-back" aria-label="返回"><img src="assets/payment-back.png" alt=""></button><button class="pay-support" aria-label="客服"><img src="assets/payment-support.png" alt=""></button></div><p class="pay-slogan">一键成片，让你的作品动起来</p><span class="pay-dots"><i></i></span><nav class="pay-tabs"><img class="pay-tab-bg l ${tabBackground==='l'?'on':''}" src="assets/vip-tab-left.png" alt=""><img class="pay-tab-bg m ${tabBackground==='m'?'on':''}" src="assets/vip-tab-middle.png" alt=""><img class="pay-tab-bg r ${tabBackground==='r'?'on':''}" src="assets/vip-tab-right.png" alt=""><div class="pay-tab-txt">${[['vip','VIP会员','t0'],['svip','SVIP会员','t1'],['credit','AI充值','t2']].map(([id,name,klass])=>`<button class="${klass} ${state.paymentTab===id?'on':''}" data-payment-tab="${id}">${name}</button>`).join('')}</div></nav></header>
   ${isMemberOwned?`<!-- PRD TBD · 已开通会员卡片：单次卡与已取消订阅卡沿用现网 UI 和交互；终身会员使用已开通卡片。 --><main class="pay-body">${isSingleCardMember||isSubscriptionCanceled?`<section class="single-card-placeholder" aria-label="已取消订阅卡现网逻辑说明"><span>${isSubscriptionCanceled?'此情况等同于单次卡会员的状态':'保持现网 UI 和交互<br>（eg. 补差价逻辑…）'}</span></section>`:`<section class="lifetime-card"><img class="lifetime-crown" src="assets/payment-lifetime-crown.png" alt=""><h1>${isLifetimeMember||isVipLifetimeTab?`你已经是 ${subscriptionTier} 终身会员`: `你已开通 ${subscriptionTier} ${subscriptionProduct}`}</h1><p>${isLifetimeMember||isVipLifetimeTab?`可享受所有 ${subscriptionTier} 权益`:'权益生效中'}</p><button class="lifetime-go" type="button" data-lifetime-frame>去加框</button></section>`}<h2 class="pay-title pay-rights-title">权益对比</h2><section class="pay-rights" aria-label="权益对比表">${col(0)}${col(1)}${col(2,(isSubscriptionRenewing&&subscriptionTier==='VIP')||isSubscriptionCanceled&&subscriptionTier==='VIP'||isSingleCardMember&&subscriptionTier==='VIP'||isLifetimeMember&&subscriptionTier==='VIP'||isVipLifetimeTab?'gold':'')}${col(3,isLifetimeMember&&subscriptionTier==='SVIP'?'gold':'')}</section><div class="pay-filler"></div></main>`:state.paymentTab==='credit'?`<main class="pay-body pay-credit-body"><p class="pay-credit-pending">待完善</p></main>`:`<main class="pay-body"><h1 class="pay-title">套餐选择</h1><div class="pay-plan-list" aria-label="套餐列表，可左右滑动查看更多套餐">${plans.map(p=>`<button class="pay-plan ${activePlan.id===p.id?'on':''}" data-payment-plan="${p.id}">${p.tag?`<span class="plan-tag">${p.tag}</span>`:''}<span class="plan-name">${p.name}</span><span class="plan-price"><i>¥</i><b>${p.price}</b></span><span class="plan-old">${p.old}</span></button>`).join('')}</div><section class="pay-ai-card"><span><strong>会员每月送 <i>✦</i>${state.paymentTab==='svip'?20:10} AI积分</strong><small>最多生成${state.paymentTab==='svip'?20:10}张图片</small></span><button class="pay-detail">明细 ›</button></section><!-- PRD TBD · 续费中购买提示：跟随右侧会员状态、套餐 Tab 和所选商品。 -->${paymentPurchaseNotice()?`<p class="pay-purchase-notice" role="note">${paymentPurchaseNotice()}</p>`:``}<button class="pay-buy" data-target="payment-submit" ${paymentPlanUnavailable()?`disabled aria-disabled="true"`:``}>${paymentPlanUnavailable()?`当前连续套餐不可购买`:`微信支付${activePlan.price}元`}</button><p class="pay-agree">开通即代表同意<a>《加画框付费用户协议》</a></p><h2 class="pay-title pay-rights-title">权益对比</h2><section class="pay-rights" aria-label="权益对比表">${col(0)}${col(1)}${col(2,'gold')}${col(3)}</section><div class="pay-filler"></div></main>`}
 </article>`;
}
