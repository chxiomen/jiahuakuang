(() => {
const revisionIosKey = 'document:v7.6.5:item-ios-subscription-rules';
const revisionPatches = [
  {
    group: '版本与范围', key: 'release:v7.5.6', label: '版本大纲：版本号与付费页摘要',
    from: '连续会员状态下，屏蔽套餐列表，仅展示权益（类似终身 SVIP 的状态）',
    to: '连续会员续费中仍展示可购买套餐；按所购商品处理原续费与权益，并区分 iOS 签约限制'
  },
  {
    group: '版本与范围', key: 'release:v7.5.6', label: '排期复核标记',
    from: '</table></div>',
    to: '</table></div><p class="requirement-text-item">版本号按 v7.6.5 修订；提测、提审和发布日期仍需与周会表排期复核。</p>'
  },
  {
    group: '会员互买', key: 'change:c-repurchase-rules', label: '5.5.1：续费中可以购买其他套餐',
    from: '<strong>禁止购买</strong><p>无法购买任何其他套餐</p><p>要切换套餐只能先取消订阅</p>',
    to: '<strong>照常购买</strong><p>同级单次卡、同级及以上永久卡、VIP 连续升级 SVIP 连续：购买成功后自动关闭原续费</p><p>VIP 连续买 SVIP 单次、SVIP 连续买 VIP 卡：原续费保持开启</p>'
  },
  {
    group: '会员互买', key: 'change:c-repurchase-rules', label: '5.5.3：连续套餐切换顺序',
    from: '<div><strong>1</strong><span>取消原连续包月</span></div><div><strong>2</strong><span>购买连续包年</span></div>',
    to: '<div><strong>1</strong><span>先支付或签约新套餐</span></div><div><strong>2</strong><span>成功后解除原协议</span></div>'
  },
  {
    group: '会员互买', key: 'change:c-repurchase-rules', label: '5.5：统一规则与异常处理',
    from: '<li><strong>续费中：</strong>禁止购买其他套餐，必须先取消自动续费。</li>',
    to: '<li><strong>续费中：</strong>照常展示并购买其他套餐；按商品组合决定是否自动关闭原续费。AI 积分充值不受会员购买规则限制。</li>'
  },
  {
    group: '会员互买', key: 'change:c-repurchase-rules', label: '5.5.3：切换成功后解旧协议',
    from: '<li><strong>连续套餐切换：</strong>先取消原协议，再购买新连续套餐，不使用固定差价。</li>',
    to: '<li><strong>连续套餐切换：</strong>先完成新套餐支付或签约，成功后解除旧协议；新套餐失败时旧协议保持有效。解约失败自动重试并告警，不使用固定差价。</li>'
  },
  {
    group: '会员互买', key: 'change:c-repurchase-rules', label: '5.5.1：购买组合明细',
    from: '<p class="membership-tech-boundary">',
    to: '<section class="requirement-section"><h3>续费中互买明细</h3><div class="requirements-table-wrap"><table class="requirements-table"><thead><tr><th>原续费状态与新购商品</th><th>原续费</th><th>权益处理</th></tr></thead><tbody><tr><td>同等级单次卡</td><td>购买成功后关闭</td><td>新购天数接在已付周期后</td></tr><tr><td>等级不低于当前的永久卡</td><td>购买成功后关闭</td><td>永久权益立即生效</td></tr><tr><td>VIP 连续升级 SVIP 连续</td><td>新签约成功后关闭 VIP 续费</td><td>SVIP 立即生效；VIP 剩余天数冻结，SVIP 结束后恢复</td></tr><tr><td>VIP 连续购买 SVIP 单次卡</td><td>保持开启</td><td>SVIP 立即生效；VIP 天数冻结，SVIP 到期后接续</td></tr><tr><td>SVIP 连续购买 VIP 卡（含永久）</td><td>保持开启</td><td>VIP 权益留存，在 SVIP 结束后生效</td></tr><tr><td>他人赠送或客服后台加会员</td><td>保持开启</td><td>直接延期</td></tr></tbody></table></div></section><p class="membership-tech-boundary">'
  },
  {
    group: '付费页与我的', key: 'change:c-subscription-payment:vip-subscription-renewing', label: '图 4：VIP 续费中付费页',
    from: '<p class="requirement-text-item">用户当前是 续费中 的状态<br>因此无法购买任何套餐</p>',
    to: '<section class="requirement-section"><h3>VIP 续费中购买其他套餐</h3><p>套餐列表照常展示可购买的卡；AI 积分充值不受限制。</p><ul class="requirement-list"><li>同等级单次卡或等级不低于 VIP 的永久卡：购买按钮上方提示「购买后自动续费将关闭，已付天数保留」；支付成功提示再次说明自动关闭与天数保留。</li><li>购买 SVIP 连续：购买按钮上方提示「升级后 VIP 连续包月将自动关闭」；签约成功提示再次说明。</li><li>VIP 连续购买 SVIP 单次卡：SVIP 立即生效，VIP 续费保持开启。</li><li>仅购买成功后解除需要关闭的旧协议；解约失败自动重试并告警。</li></ul></section>'
  },
  {
    group: '付费页与我的', key: 'change:c-subscription-payment:svip-subscription-renewing', label: '图 4：SVIP 续费中付费页',
    from: '<p class="requirement-text-item">用户当前是续费中的状态<br>因此无法购买任何套餐</p>',
    to: '<section class="requirement-section"><h3>SVIP 续费中购买其他套餐</h3><p>套餐列表照常展示可购买的卡；AI 积分充值不受限制。</p><ul class="requirement-list"><li>同等级单次卡或 SVIP 永久卡：购买按钮上方提示「购买后自动续费将关闭，已付天数保留」；支付成功提示再次说明。</li><li>购买 VIP 卡（含永久）不关闭 SVIP 续费；VIP 权益在 SVIP 结束后生效。</li><li>购买 VIP 卡支付成功提示补充「SVIP 到期后生效」。</li></ul></section>'
  },
  {
    group: '付费页与我的', key: 'change:c-subscription-payment', label: '付费页：平台与购买提示',
    from: '<section class="requirement-section"><h3>点击购买</h3>',
    to: '<section class="requirement-section"><h3>平台与购买提示</h3><ul class="requirement-list"><li>判断订阅平台以当前连续套餐的签约平台为准，不以用户当前手机系统为准。</li><li>仅在会自动关闭原续费的购买组合中，于购买按钮上方展示对应提示小字；付款成功提示再次说明处理结果，不额外弹窗。</li><li>iOS 已解约且当期未到期：连续包月、连续包年置灰并提示「当前订阅周期结束后可重新开通（具体日期）」；单次卡和永久卡照常售卖。</li><li>iOS 已签 VIP 连续的 SVIP 连续商品，升级能力未确认前暂不售卖，仍可购买 SVIP 单次卡和永久卡。</li></ul></section><section class="requirement-section"><h3>点击购买</h3>'
  },
  {
    group: '续费管理与我的', key: 'change:c-subscription-renewal:active', label: '图 5 / 图 8：iOS 续费开关',
    from: '<section class="requirement-section"><h3>续费开关</h3>',
    to: '<section class="requirement-section"><h3>iOS 签约续费管理（待确认解约能力）</h3><ul class="requirement-list"><li>按订阅签约平台分流，不按当前设备分流。</li><li>若确认平台支持服务端代解约，则沿用安卓开关和关闭确认弹窗。</li><li>若确认不支持代解约，开关改为退订引导「iPhone 设置 - Apple ID - 订阅」；提前提示「关闭后，当前周期结束前无法在小程序重新开通」。</li></ul></section><section class="requirement-section"><h3>续费开关</h3>'
  },
  {
    group: '续费管理与我的', key: 'change:c-subscription-renewal:canceled', label: '图 6 / 图 10 / 图 13：iOS 已取消当期',
    from: '<section class="requirement-section"><h3>续费开关</h3>',
    to: '<section class="requirement-section"><h3>iOS 已取消但当期有效</h3><ul class="requirement-list"><li>隐藏「恢复续费」入口，展示「当前订阅周期结束后可重新开通（具体日期）」。</li><li>当期结束前不得重新签任何连续包月或连续包年；单次卡和永久卡仍可购买。</li><li>客服说明：到期后重新开通；期间可购买单次卡，天数接在当前已付周期后。</li></ul></section><section class="requirement-section"><h3>续费开关</h3>'
  },
  {
    group: '续费管理与我的', key: 'change:c-subscription-renewal:common', label: '自动续费协议：分平台退订路径',
    from: '<section class="requirement-section"><h3>底部操作入口</h3>',
    to: '<section class="requirement-section"><h3>退订路径与协议</h3><ul class="requirement-list"><li>安卓在管理页使用已有取消续订按钮。</li><li>iOS 签约用户在管理页写明「iPhone 设置 - Apple ID - 订阅」；若无法代解约，该路径替代开关。</li><li>《会员自动续费服务协议》分别写明 iOS 与安卓退订方式。</li></ul></section><section class="requirement-section"><h3>底部操作入口</h3>'
  },
  {
    group: '续费管理与我的', key: 'change:c-subscription-mine:vip-subscription-canceled', label: '我的：iOS 恢复续费入口',
    from: '<li>主按钮：恢复续费；点击后直接进入付费页，并自动选中当前会员商品，不展示中间弹窗</li>',
    to: '<li>安卓：主按钮「恢复续费」沿用现有购买流程。</li><li>iOS 签约且当期未结束：隐藏「恢复续费」，展示「当前订阅周期结束后可重新开通（具体日期）」；到期后恢复购买入口。</li>'
  },
  {
    group: '服务端', key: 'change:c-subscription-server', label: '支付、解约与告警顺序',
    from: '<tr><td>签约与解约</td><td>1. 接入签约、解约、签约状态查询<br>2. 签约结果以通知为准</td></tr>',
    to: '<tr><td>签约与解约</td><td>1. 接入签约、解约、签约状态查询；按原订阅签约平台分流<br>2. 互买时先完成新商品支付或签约，成功后再解旧协议；失败时保留旧协议<br>3. 旧协议解约失败自动重试并告警；以平台结果通知确认最终状态<br>4. iOS 是否支持服务端代解约仍待平台确认</td></tr>'
  },
  {
    group: '会员互买', key: 'change:c-repurchase-rules:rules', label: '复购矩阵：VIP 续费中',
    from: '<tr><td class="repurchase-source-cell" rowspan="1">VIP · 连续包月 / 包年（续费中）</td><td class="repurchase-target-cell">任意会员商品</td><td><span class="rule-no">不可以</span></td><td class="repurchase-order-cell">—</td><td>需先关闭自动续费；关闭前，当前已付权益继续有效。</td></tr>',
    to: '<tr><td class="repurchase-source-cell" rowspan="4">VIP · 连续包月 / 包年（续费中）</td><td class="repurchase-target-cell">VIP 单次卡 / VIP、SVIP 永久卡</td><td><span class="rule-yes">可以</span></td><td class="repurchase-order-cell">先付款，再关闭原续费</td><td>同级单次卡天数顺延；永久权益立即生效。</td></tr><tr><td class="repurchase-target-cell">SVIP 连续</td><td><span class="rule-yes">安卓可买；iOS 待确认</span></td><td class="repurchase-order-cell">先签新，再解旧</td><td>SVIP 立即生效；VIP 剩余天数冻结并在 SVIP 结束后恢复。</td></tr><tr><td class="repurchase-target-cell">SVIP 单次卡</td><td><span class="rule-yes">可以</span></td><td class="repurchase-order-cell">原价购买；VIP 续费保持开启</td><td>SVIP 立即生效，VIP 剩余天数冻结并在 SVIP 到期后接续。</td></tr><tr><td class="repurchase-target-cell">AI 积分充值</td><td><span class="rule-yes">可以</span></td><td class="repurchase-order-cell">照常充值</td><td>不影响会员续费和权益。</td></tr>'
  },
  {
    group: '会员互买', key: 'change:c-repurchase-rules:rules', label: '复购矩阵：SVIP 续费中',
    from: '<tr><td class="repurchase-source-cell" rowspan="1">SVIP · 连续包月 / 包年（续费中）</td><td class="repurchase-target-cell">任意会员商品</td><td><span class="rule-no">不可以</span></td><td class="repurchase-order-cell">—</td><td>需先关闭自动续费；关闭前，当前已付权益继续有效。</td></tr>',
    to: '<tr><td class="repurchase-source-cell" rowspan="3">SVIP · 连续包月 / 包年（续费中）</td><td class="repurchase-target-cell">SVIP 单次卡 / SVIP 永久卡</td><td><span class="rule-yes">可以</span></td><td class="repurchase-order-cell">先付款，再关闭原续费</td><td>单次卡天数顺延；永久权益立即生效。</td></tr><tr><td class="repurchase-target-cell">VIP 卡（含永久）</td><td><span class="rule-yes">可以</span></td><td class="repurchase-order-cell">原价购买；SVIP 续费保持开启</td><td>VIP 权益留存，在 SVIP 结束后生效。</td></tr><tr><td class="repurchase-target-cell">AI 积分充值</td><td><span class="rule-yes">可以</span></td><td class="repurchase-order-cell">照常充值</td><td>不影响会员续费和权益。</td></tr>'
  }
];
const revisionIosHtml = `<section class="requirement-section"><h3>5.5.4 iOS 会员订阅差异</h3><p>平台判断依据为这份连续套餐的签约平台，不依据用户当前使用的手机系统。</p></section><section class="requirement-section"><h3>已确定：解约后的签约限制</h3><ul class="requirement-list"><li>iOS 订阅已签约并解约后，当前已付周期结束前，不再发起连续包月或连续包年签约；到期后可重新开通。暂按所有订阅商品受限处理，具体商品范围仍向微信核实。</li><li>付费页置灰连续套餐并展示可重新开通的具体日期；单次卡、永久卡照常售卖。</li><li>管理页和「我的」隐藏恢复续费入口，显示相同日期提示；到期后的复购入口保持可用。</li><li>客服建议用户到期后重新开通；期间需要续上权益，可购买天数顺延的单次卡。</li></ul></section><section class="requirement-section"><h3>待确认：iOS 代解约能力</h3><ul class="requirement-list"><li>先向微信确认服务端能否替 iOS 用户解除订阅。</li><li>若支持，自动关闭旧续费的三类购买与安卓同规则。</li><li>若不支持，这三类商品点击购买时先提示「你的连续包月由苹果自动续费，本次购买后不会自动关闭」，展示「iPhone 设置 - Apple ID - 订阅」，按钮为「继续购买 / 再想想」；支付成功再提示一次退订路径。</li><li>若不支持，管理页开关及关闭确认弹窗改为同一路径引导，并提前告知当期内不能重新开通。</li></ul></section><section class="requirement-section"><h3>待确认：iOS 升降级与切换周期</h3><ul class="requirement-list"><li>微信确认前，iOS 已签 VIP 连续用户在 SVIP 栏只售单次卡和永久卡，不售 SVIP 连续。</li><li>向微信核实 VIP 连续升 SVIP 连续的扣款与生效时间、VIP 剩余权益处理及通知；同时核实 SVIP 降 VIP、包月换包年的生效时间。</li></ul></section><section class="requirement-section"><h3>待向微信确认的问题</h3><ol class="requirement-list"><li>iOS 会员订阅能否由服务端调用接口替用户解约？</li><li>解约后需等待当期结束才能重签，是仅限同一订阅商品还是所有订阅商品？</li><li>VIP 连续能否直接签 SVIP 连续？若能，扣款、生效、剩余权益及平台通知如何处理？</li><li>SVIP 降 VIP、包月换包年分别何时生效？</li></ol></section>`;
const revisionItems = [
  { id: 'version-number', kind: 'version', group: '版本与范围', label: '版本号：v7.5.6 → v7.6.5', key: 'workspace:structure:v2', before: 'v7.5.6 · 订阅套餐重开', after: 'v7.6.5 · 订阅套餐重开', hint: '版本迭代' },
  ...revisionPatches.map((patch, index) => ({ ...patch, id: `patch-${index}`, kind: 'patch', before: patch.from, after: patch.to })),
  { id: 'ios-section', kind: 'ios', group: 'iOS 独立章节', label: '新增 5.5.4 iOS 会员订阅差异', key: revisionIosKey, before: '原需求缺少独立的 iOS 规则章节', after: revisionIosHtml, hint: '技术边界' }
];
function revisionRejected(item) { return localStorage.getItem(`revision-review:v2:${item.id}:rejected`) === '1'; }

function revisionResolvedKey(item, source) {
  return item.key === 'release:v7.5.6' && source['release:v7.6.5'] ? 'release:v7.6.5' : item.key;
}

function revisionItemStatus(item, source = savedRequirements) {
  if (revisionRejected(item)) return 'rejected';
  if (item.kind === 'version') {
    try { return JSON.parse(source['workspace:structure:v2']).releases.some(version => version.id === 'v7.6.5') ? 'applied' : 'pending'; }
    catch { return 'conflict'; }
  }
  if (item.kind === 'ios') {
    const structure = JSON.parse(source['workspace:structure:v2'] || '{}');
    const exists = structure.releases?.some(version => version.changes?.some(change => change.id === 'item-ios-subscription-rules'));
    if (source[revisionIosKey] && exists) return 'applied';
    if (source[revisionIosKey] || exists) return 'conflict';
    return 'pending';
  }
  const current = source[revisionResolvedKey(item, source)];
  if (typeof current !== 'string') return 'conflict';
  if (current.includes(item.to)) return 'applied';
  if (current.includes(item.from)) return 'pending';
  return 'conflict';
}
function membershipRevisionApplied() {
  return Boolean(savedRequirements[revisionIosKey]);
}
const paymentHtmlBeforeRevision = paymentHtml;
paymentHtml = function () {
  if (!membershipRevisionApplied()) return paymentHtmlBeforeRevision();
  const renewing = state.pageId === 'payment' && state.paymentCardType === 'subscription' && state.paymentSubscriptionState === 'renewing' && state.paymentMemberType !== 'free';
  const iosCanceled = state.pageId === 'payment' && state.paymentCardType === 'subscription' && state.paymentSubscriptionState === 'canceled' && state.paymentMemberType !== 'free' && state.subscriptionPlatform === 'ios';
  if (!renewing && !iosCanceled) return paymentHtmlBeforeRevision();
  const originalStateId = state.stateId;
  state.stateId = 'default';
  const raw = paymentHtmlBeforeRevision();
  state.stateId = originalStateId;
  const root = document.createElement('div');
  root.innerHTML = raw;
  const screen = root.querySelector('.payment');
  const list = screen.querySelector('.pay-plan-list');
  const buy = screen.querySelector('.pay-buy');
  const available = plan => {
    const recurring = plan === 'annual' || plan === 'monthly';
    if (iosCanceled) return !recurring;
    if (state.paymentTab === 'credit') return true;
    if (state.paymentMemberType === 'svip') return !recurring;
    if (state.paymentTab === 'vip') return !recurring;
    return state.subscriptionPlatform !== 'ios' || !recurring;
  };
  if (list) {
    list.querySelectorAll('[data-payment-plan]').forEach(plan => {
      if (!available(plan.dataset.paymentPlan)) {
        plan.disabled = true;
        plan.classList.add('revision-plan-disabled');
      }
    });
    if (!available(state.paymentPlan)) {
      const first = list.querySelector('[data-payment-plan]:not([disabled])');
      if (first) {
        state.paymentPlan = first.dataset.paymentPlan;
        list.querySelectorAll('[data-payment-plan]').forEach(plan => plan.classList.toggle('on', plan === first));
        const price = first.querySelector('.plan-price b')?.textContent;
        if (price) buy.textContent = `微信支付${price}元`;
      }
    }
  }
  const notice = document.createElement('p');
  notice.className = 'revision-phone-note';
  if (iosCanceled) notice.textContent = '当前订阅周期结束后可重新开通（2026年10月21日）；单次卡和永久卡可照常购买';
  else if ((state.paymentTab === state.paymentMemberType && ['life','year12','month3','month1'].includes(state.paymentPlan)) || (state.paymentMemberType === 'vip' && state.paymentTab === 'svip' && state.paymentPlan === 'life')) notice.textContent = '购买后自动续费将关闭，已付天数保留';
  else if (state.paymentMemberType === 'vip' && state.paymentTab === 'svip' && ['annual','monthly'].includes(state.paymentPlan)) notice.textContent = '升级后 VIP 连续包月将自动关闭';
  else if (state.paymentMemberType === 'svip' && state.paymentTab === 'vip') notice.textContent = 'SVIP 到期后生效';
  if (notice.textContent && buy) buy.before(notice);
  if (iosCanceled && list) list.insertAdjacentHTML('afterend', '<p class="revision-disabled-copy">连续包月、连续包年当期内暂不可重新签约</p>');
  return screen.outerHTML;
};
const renderToolsBeforeRevision = renderTools;
renderTools = function () {
  renderToolsBeforeRevision();
  if (!membershipRevisionApplied() || !['payment','renewal'].includes(state.pageId)) return;
  const row = document.querySelector('#deviceTools .tool-row');
  if (!row) return;
  row.insertAdjacentHTML('beforeend', `<div class="segment revision-platform-switch"><span>原订阅签约平台</span><button type="button" data-sign-platform="android" class="${state.subscriptionPlatform !== 'ios' ? 'on' : ''}">安卓</button><button type="button" data-sign-platform="ios" class="${state.subscriptionPlatform === 'ios' ? 'on' : ''}">iOS</button></div>`);
  row.querySelectorAll('[data-sign-platform]').forEach(button => button.onclick = () => {
    state.subscriptionPlatform = button.dataset.signPlatform;
    renderAll();
  });
};
const renderRenewalToggleBeforeRevision = renderRenewalToggle;
renderRenewalToggle = function () {
  renderRenewalToggleBeforeRevision();
  if (!membershipRevisionApplied() || state.pageId !== 'renewal' || state.subscriptionPlatform !== 'ios') return;
  const row = document.querySelector('.renewal-auto-row');
  if (!row) return;
  if (state.stateId === 'canceled') {
    row.innerHTML = '<span>当前订阅周期结束后可重新开通（2026年10月21日）</span>';
    document.querySelector('[data-repurchase-layer]')?.remove();
  } else if (state.stateId === 'active') {
    row.innerHTML = '<span>退订路径：iPhone 设置 - Apple ID - 订阅（代解约能力待确认）</span>';
  }
};
membershipRevisionApplied = function () {
  const applied = label => revisionItemStatus(revisionItems.find(item => item.label === label)) === 'applied';
  if (state.pageId === 'payment' && state.paymentSubscriptionState === 'renewing') {
    return applied(state.paymentMemberType === 'svip' ? '图 4：SVIP 续费中付费页' : '图 4：VIP 续费中付费页');
  }
  if (state.pageId === 'payment' && state.paymentSubscriptionState === 'canceled') {
    return applied('图 6 / 图 10 / 图 13：iOS 已取消当期');
  }
  if (state.pageId === 'renewal' && state.subscriptionPlatform === 'ios') {
    return applied(state.stateId === 'canceled' ? '图 6 / 图 10 / 图 13：iOS 已取消当期' : '图 5 / 图 8：iOS 续费开关');
  }
  return false;
};
})();
