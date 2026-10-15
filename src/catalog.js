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
const data={
 pages:[
  {id:'payment',name:'付费页',group:'交易页面',pageNote:{description:'真实会员开通页，承接会员类型切换、套餐选择、AI 积分说明、微信支付和权益对比。',path:'由会员中心“立即开通 / 立即续费”及受限能力拦截入口进入。',modules:['VIP / SVIP / AI 充值切换','横向滚动套餐','会员每月赠送 AI 积分','微信支付与协议','会员权益对比']},states:[{id:'default',name:'默认态',stateNote:{rule:'默认展示 VIP 会员，选中连续包年 ¥88。页面按真实设计稿 1:1 呈现，在既有手机模型内纵向滚动。'}},{id:'single-member',name:'单次卡会员',stateNote:{rule:'当前用户已拥有 VIP 或 SVIP 单次卡，沿用线上已开通会员逻辑，只展示当前会员权益，不展示套餐列表、协议文案和点击购买入口。'}},{id:'subscription-renewing',name:'连续会员 · 续费中',stateNote:{rule:'VIP / SVIP 连续包月或连续包年且自动续费仍开启时，沿用终身 SVIP 的已开通卡片，只替换等级和商品名称，副文案为“权益生效中”。不展示套餐及购买入口。'}},{id:'lifetime-member',name:'终身会员',stateNote:{rule:'VIP 终身会员仍可正常购买 SVIP 商品，预览展示 SVIP 套餐列表；SVIP 终身会员沿用线上已开通会员逻辑，不展示套餐、协议或购买入口。'}},{id:'lifetime-svip',name:'终身 SVIP',stateNote:{rule:'终身 SVIP 已拥有最高会员权益。VIP、SVIP 两个会员 Tab 均展示已开通卡片与权益对比，不展示套餐、协议或购买按钮，不允许发起其他商品购买。'}}]},
  {id:'renewal',name:'续费管理页',group:'交易页面',pageNote:{description:'自动续费管理页，展示当前续费商品、续费时间金额、自动续费状态、服务承诺与扣费记录。',path:'用户成功购买连续商品后返回小程序时自动进入；也可从会员服务入口进入。',modules:['续费会员信息','下次续费时间、金额与开关','扣费记录与自动续费协议','服务承诺','历史扣费记录']},states:[{id:'default',name:'默认态',stateNote:{rule:'默认展示已开启自动续费的 VIP 连续包月信息与历史扣费记录。'}}]},
  {id:'mine',name:'我的',group:'个人中心',pageNote:{description:'用户个人中心，展示用户身份、会员权益、作品与收藏入口，以及设置、客服和官方渠道。',path:'点击底部导航栏“我的”进入。',modules:['用户信息与会员身份','会员权益卡片','我的作品与我的收藏','设置与服务入口','推荐加画框','底部导航']},states:[{id:'default',name:'默认态',stateNote:{rule:'展示当前用户的昵称、用户 ID 和会员状态；会员未开通时提供开通会员入口。'}}]},
 ],
 releases:[
  {id:'v7.5.6',name:'订阅套餐重开',status:'draft',goal:'',requirements:{outline:['在 **付费页** 新增 **自动续费** 的订阅项目；','将原 **微信支付委托代扣**，更新为接入 **微信虚拟支付**；','新增 **续费管理页**，以便用户追踪订阅状态；'],terminal:'仅限于 **安卓**/**鸿蒙** 系统的小程序'},changes:[{id:'c-subscription-payment',title:'付费页',tag:'修改',description:'上架 自动续费 商品',pageId:'payment',stateId:'default',annotationIds:['a-payment-tabs','a-payment-plan','a-payment-submit'],requirements:{sections:[{title:'【套餐列表】',paragraphs:['在列表中增加两个商品，价格与顺序如下：（商品id 待定）'],table:{headers:['档位','连续包年','连续包月','终身会员','12个月','3个月','1个月'],rows:[['VIP','¥88 / 年','¥18 / 月','¥198','¥88','¥68','¥18'],['SVIP','¥128 / 年','¥28 / 月','¥298','¥128','—','¥28']]}},{title:'【协议文案】',bullets:[{text:'当选中 连续商品 时，协议文案需发生以下改变：',children:['增加勾选框，默认不勾选，但必填','未填时点击购买按钮 → 触发提示弹窗','文案非写死，其中的价格、周期需跟随选中商品动态变化']},'选中单次档商品时，则维持原状']},{title:'【下次扣款日期说明】',bullets:[{text:'当选中 连续商品 时，须在商品列表下增加一句文案：',children:['下次付款日期：2026 年 6 月 21 号，可随时取消。']},'单次档商品不展示改文案',{text:'日期需跟随选中的商品、及当前日期来计算，规则如下：',children:['连续包月：首次付费日期 + 31 天。','连续包年：首次付费日期 + 372 天（12 × 31 天）。','按固定天数累加，不按月末调整。']}]},{title:'【点击购买】',bullets:['用户勾选同意，并点击购买后，进入 → 微信官方自动续费签约页',{text:'后端等待微信的购买结果通知：',children:['用户购买成功：刷新会员状态，且用户返回小程序时，需关闭付费页，自动进入续费管理页','用户购买失败：用户停留在付费页']}]},{title:'【续费状态中】',paragraphs:['指用户成功购买了连续商品，且未取消续费的状态，此状态下：'],bullets:['无入口进入到付费页，无法再进行任何购买行为','用户可在续费管理页中查看如何取消续费，取消后即可叠加购买别的商品','「我的」会员卡片需新增下次扣费日期与金额，//如图']}]}},{id:'c-subscription-renewal',title:'续费管理页',tag:'新增',description:'',pageId:'renewal',stateId:'default',annotationIds:[],requirements:{sections:[{ordered:['。。。','。。。']}]}}]}
 ],
 annotations:[
  {id:'a-payment-tabs',pageId:'payment',stateIds:['default'],platforms:['ios','android','mini'],targetId:'payment-tabs',title:'会员类型切换',displayRule:'默认展示 VIP 会员；同一页面可切换 VIP、SVIP 会员与 AI 充值。',action:'点击类型标签后刷新套餐区与权益说明，不离开当前滚动位置。',result:'保留用户已选套餐；实际套餐与价格由服务端下发。'},
  {id:'a-payment-plan',pageId:'payment',stateIds:['default'],platforms:['ios','android','mini'],targetId:'payment-plan',title:'套餐选择',displayRule:'默认选中“连续包月 ¥18”，同列展示连续包年、终身会员等套餐。',action:'点击任一套餐卡切换选中态，并同步微信支付金额。',result:'未支付前不变更会员身份；订单创建后锁定对应套餐与价格。'},
  {id:'a-payment-submit',pageId:'payment',stateIds:['default'],platforms:['ios','android','mini'],targetId:'payment-submit',title:'微信支付',displayRule:'展示当前套餐对应的微信支付金额及会员协议。',action:'点击后进入支付确认；iOS 受平台规则限制时展示联系客服说明。',result:'确认后仅模拟开通 VIP，真实业务需等待支付回调成功后刷新会员状态。'}
 ]
};
data.releases[0].changes.find(change=>change.id==='c-subscription-renewal').requirements={sections:[
 {title:'页面定位与进入方式',paragraphs:['续费管理页用于展示用户当前的连续订阅状态、下次扣费信息、历史扣费记录和取消续费指引。'],bullets:['用户成功购买连续商品后，等待支付结果通知；购买成功并返回小程序时，自动进入续费管理页。','用户也可以从会员中心或“我的”中的会员服务入口进入续费管理页。','仅连续包年、连续包月等自动续费商品进入本页面；单次购买商品不进入续费管理页。']},
 {title:'当前续费会员信息',bullets:['展示当前会员昵称。','展示会员类型和当前订阅商品，例如：VIP会员 · 连续包月。','展示用户ID，便于客服和售后查询。','页面顶部使用会员身份卡片，突出当前处于自动续费状态。']},
 {title:'下次扣费信息',bullets:['展示下次续费时间。','展示下次续费金额。','续费时间和金额必须与用户实际购买的连续商品保持一致。','连续包月：下次扣费时间为首次付费日期 + 31天。','连续包年：下次扣费时间为首次付费日期 + 372天（12×31天）。','按固定天数累加，不按月末调整。']},
 {title:'服务承诺',bullets:['展示“安全无忧”：扣费前发送扣费通知。','展示“扣费透明”：用户可以查询扣费记录。','展示“随时取消”：用户可以按照指引取消自动续费。','服务承诺仅用于说明订阅服务规则，不改变当前续费状态。']},
 {title:'扣费记录',bullets:['按时间倒序展示历史扣费记录。','每条记录展示订阅商品名称，例如：VIP连续包月。','展示本次扣费金额。','展示本次订阅对应的有效期起止时间。','扣费记录以服务端实际支付结果为准，不能仅根据客户端展示生成。']},
 {title:'取消续费',bullets:['页面需要明确告知用户：取消自动续费需要前往微信操作。','展示取消路径：微信 → 我 → 服务 → 钱包 → 支付设置 → 自动续费。','用户取消成功后，不再产生下一次自动扣费，但当前已购买的会员权益仍可使用至有效期结束。','用户取消自动续费后，可以重新进入付费页购买其他商品。']},
 {title:'续费状态展示',bullets:[{text:'正常续费中：',children:['展示当前会员身份、当前订阅商品、下次续费时间和下次续费金额。','页面明确提示当前处于自动续费状态，并提供取消续费指引。','会员中心和“我的”页面可以展示下次扣费日期与金额。','当前处于自动续费状态时，不提供重复进入付费页购买的入口。']},{text:'已取消续费但权益仍有效：',children:['展示“已取消自动续费”状态。','展示当前会员权益的到期时间。','不再展示下一次扣费时间和下一次扣费金额，或明确展示“不会再次扣费”。','用户在到期前仍可以正常使用已购买的会员权益。','用户可以重新进入付费页购买其他会员商品，新的购买结果不能覆盖当前有效权益状态。']},{text:'会员已到期：',children:['展示会员已到期状态和会员权益已结束的提示。','不展示下一次扣费信息。','提供“立即续费 / 立即开通”入口，进入付费页重新购买。']}]},
 {title:'状态变更与数据来源',bullets:['取消续费成功后，服务端更新自动续费状态，客户端返回小程序时刷新会员状态。','客户端不得仅根据用户点击取消按钮就直接判定取消成功，必须等待服务端或微信支付结果确认。','续费状态、权益到期时间、下次扣费时间和金额均以服务端数据为准。','状态发生变化后，会员中心、我的页面和续费管理页需要保持一致。']},
 {title:'使用问题与客服',bullets:['页面提供售后客服入口。','用户遇到使用体验、退款或扣费问题时，可以联系客服。','客服处理时需要能够关联用户ID、订阅商品、扣费金额和扣费时间。']},
 {title:'支付结果与异常状态',bullets:['支付成功：刷新会员状态，并在用户返回小程序时关闭付费页，自动进入续费管理页。','支付失败：用户停留在付费页，不进入续费管理页。','自动续费扣款失败：保留当前扣款结果和失败提示，并引导用户联系客服或重新购买。','续费管理页展示的信息以服务端会员状态和支付回调结果为准。']}
]};
data.releases[0].changes.push({id:'c-virtual-payment',title:'接虚拟支付',tag:'新增',description:'将微信支付委托代扣更新为微信虚拟支付',requirements:{sections:[
 {title:'需求背景与适用范围',paragraphs:['会员、数字内容等属于虚拟商品，支付链路从原微信支付委托代扣切换为微信小程序虚拟支付。','虚拟支付当前采用道具直购模式：用户主动选择商品并完成一次购买，不再沿用自动扣费或委托代扣。'],bullets:['连续包月、连续包年在展示层可继续作为商品规格，但支付侧不得创建自动续费协议。','页面需要明确告知用户：本次购买不会自动扣费，后续续费需要用户重新主动购买。']},
 {title:'支付能力开通',ordered:['由小程序团队管理员在商业化 → 虚拟支付模块申请开通。','等待平台审核通过后，才允许调用虚拟支付能力。','在正式联调前确认小程序、商户号、虚拟支付权限和测试环境均已配置完成。'],image:{src:'https://staticintl.cloudcachetci.com/cms/backend-cms/42539e3cc45911f09c26525400bf7822.png',alt:'微信虚拟支付申请开通示例',caption:'微信官方文档示例：申请开通虚拟支付'}},
 {title:'虚拟商品配置',bullets:['为每个会员商品建立唯一商品 ID，商品名称、价格、会员周期、商品图片和权益说明必须由服务端统一管理。','商品创建后提交平台审核；审核通过并发布后，客户端才可以使用该商品发起支付。','商品价格以服务端返回值为准，客户端不得自行修改价格或商品 ID。'],image:{src:'https://staticintl.cloudcachetci.com/cms/backend-cms/cd4c3c75c45c11f083155254001c06ec.png',alt:'微信虚拟支付商品配置示例',caption:'微信官方文档示例：添加虚拟商品'}},
 {title:'发货通知与基础配置',bullets:['配置接收道具发货事件通知的 HTTPS 接口，并提供测试地址。','首次保存配置时申请接口安全校验所需的证书和密钥，密钥只允许保存在服务端。','服务端校验通知来源、签名、订单号和商品 ID，通知处理必须支持幂等。','只有完成发货推送配置，系统才能接收支付后的虚拟商品发货事件。'],image:{src:'https://staticintl.cloudcachetci.com/cms/backend-cms/ccc85dbbc45511f08c0e52540044a08e.png',alt:'微信虚拟支付发货推送配置示例',caption:'微信官方文档示例：配置发货推送'}},
 {title:'支付流程',ordered:['用户在付费页选择会员商品并点击购买。','客户端向服务端申请本次支付所需的交易参数，服务端校验用户、商品、价格和订单状态。','客户端调用微信小程序虚拟支付接口拉起支付。','用户取消支付或支付失败时，不更新会员权益，订单保留可追踪的失败原因。','支付成功后不能直接把客户端结果当作最终成功，必须等待发货通知并由服务端确认订单。','发货确认成功后，再刷新会员状态、订单状态和续费管理页。']},
 {title:'会员权益与状态改造',bullets:['移除“自动续费已开启”“下次自动扣费时间”“取消自动续费”等委托代扣语义。','会员卡片展示当前会员商品、购买时间、权益到期时间和用户 ID。','续费管理页改为展示当前权益、到期时间、历史购买记录和“重新购买”入口。','用户需要续费时，进入付费页主动购买；不得在未授权情况下自动发起下一笔扣款。','支付成功但发货未确认时，展示“权益发放中”，避免重复购买造成重复订单。']},
 {title:'订单、补偿与异常处理',bullets:['订单号必须全局唯一，并记录用户 ID、商品 ID、商品快照、金额、支付状态、发货状态和权益变更记录。','支付成功但未收到发货通知时，服务端通过订单查询进行兜底，并支持安全重试。','重复通知不得重复发放权益；发货失败时记录失败原因并支持人工补发或客服处理。','客户端支付成功、服务端订单成功、权益发放成功需要分别记录，不能混为一个状态。'],image:{src:'https://staticintl.cloudcachetci.com/cms/backend-cms/55092050c47611f099d952540099c741.png',alt:'微信虚拟支付订单记录示例',caption:'微信官方文档示例：查看虚拟支付订单记录'}},
 {title:'退款与售后',bullets:['虚拟支付订单支持用户发起退款，退款状态以服务端和平台售后记录为准。','退款处理中时保留订单和权益变更记录，不直接在客户端展示为退款成功。','退款成功后按业务规则撤销或调整对应会员权益，并向用户展示处理结果。','客服处理退款、未到账、重复购买等问题时，需要关联用户 ID、订单号和商品 ID。']},
 {title:'验收标准',bullets:['测试环境能够完成申请开通、商品发布、拉起支付、支付取消、支付失败、支付成功、发货通知和订单查询。','支付成功但通知延迟、通知重复、通知丢失、服务端超时等场景均有明确状态和兜底方案。','付费页、会员卡片、续费管理页、订单记录中的支付方式和会员状态保持一致。','正式上线前完成平台审核、隐私与用户协议检查、异常监控和客服处理流程。']}
]}});
const virtualPaymentChange=data.releases[0].changes.pop();data.releases[0].changes.unshift(virtualPaymentChange);
const renewalChange=data.releases[0].changes.find(change=>change.id==='c-subscription-renewal');
renewalChange.stateId='active';
const subscriptionRelease=data.releases[0];
subscriptionRelease.requirements={sections:[
 {title:'需求大纲',table:{headers:['子层级','主要内容','优先级'],rows:[
  ['接虚拟支付','接入微信小程序虚拟支付，替换原委托代扣支付链路；以服务端最终支付结果更新订单与会员权益。','P0'],
  ['付费页','新增连续包年、连续包月商品选择，并适配订阅协议、下次扣款提示与购买流程。','P0'],
  ['续费管理页','展示当前订阅、下次扣款信息、扣费记录及取消续费指引。','P0'],
  ['我的','会员卡片新增续费中、已取消、已过期三种状态及对应操作入口。','P0'],
  ['连续会员制度','明确连续会员与其他会员间的购买、切换、权益冻结和自动续费限制。','P0'],
  ['CMS 端','补充连续商品的筛选、订单与收入统计，并区分面额与实际入账。','P0'],
  ['服务端','支持订阅签约、解约、扣费、订单记账及会员状态下发，保障各端状态一致。','P0']
 ]}}
]};
const renewalChangeIndex=subscriptionRelease.changes.findIndex(change=>change.id==='c-subscription-renewal');
subscriptionRelease.changes.splice(renewalChangeIndex+1,0,
 // PRD TBD · 我的页：订阅卡续费状态说明及页面展示。
 {id:'c-subscription-mine',title:'我的',tag:'新增',pageId:'mine',stateId:'vip-subscription-renewing',annotationIds:[],requirements:{states:[
  {id:'vip-subscription-renewing',name:'订阅卡 · 续费中',summary:'此页面改动集中在会员卡片上，新增以下三种状态。',sections:[{title:'会员卡片',bullets:['大标题：会员等级 · 商品名称','副标题：下次扣款日期：具体年月日','按钮：管理续费']}]},
  {id:'vip-subscription-canceled',name:'订阅卡 · 已取消',summary:'此页面改动集中在会员卡片上，新增以下三种状态。',sections:[{title:'会员卡片',bullets:['大标题：会员等级 · 已取消续费','副标题：权益到期日：具体年月日','按钮：重新开通']}]},
  {id:'vip-subscription-expired',name:'订阅卡 · 已过期',summary:'此页面改动集中在会员卡片上，新增以下三种状态。',sections:[{title:'会员卡片',bullets:['大标题：会员等级 · 已过期','副标题：会员权益已过期','按钮：重新开通']}]}
 ]}},
 {id:'c-repurchase-rules',title:'连续会员制度',tag:'新增',pageId:'payment',stateId:'default',annotationIds:[],requirements:{sections:[]}},
 {id:'c-subscription-cms',title:'CMS 端',tag:'新增',requirements:{sections:[
  {title:'CMS 端（',titleLink:{text:'pro.jiahk.cn:8020',href:'http://pro.jiahk.cn:8020/'},titleSuffix:'）',table:{headers:['需求名称','涉及页面','功能说明'],rows:[
   ['收入统计',{text:'financeStat/income',href:'http://pro.jiahk.cn:8020/#/financeStat/income'},'1. 套餐筛选与统计列新增「连续包年」、「连续包月」\n2. 收入拆成面额与实际入账两列'],
   ['订单明细',[{text:'financeStat/orders',href:'http://pro.jiahk.cn:8020/#/financeStat/orders'},{text:'financeStat/ordersCustomer',href:'http://pro.jiahk.cn:8020/#/financeStat/ordersCustomer'}],'1. 套餐筛选新增「连续包年」、「连续包月」\n2. 订单名称写套餐名称，区分首订 / 续费\n3. 每笔展示面额、抽成金额、实际入账'],
   ['会员订阅统计',{text:'financeStat/memberSign',href:'http://pro.jiahk.cn:8020/#/financeStat/memberSign'},'1. 套餐筛选含「连续包年」、「连续包月」'],
   ['退款明细',{text:'financeStat/refundOrders',href:'http://pro.jiahk.cn:8020/#/financeStat/refundOrders'},'1. 套餐筛选新增「连续包年」、「连续包月」'],
   ['数据报表',{text:'dataReport/dataReport',href:'http://pro.jiahk.cn:8020/#/dataReport/dataReport'},'1. 会员收入类统计项改按实际入账计\n2. 套餐维度新增「连续包年」、「连续包月」'],
   ['投放统计',{text:'launch/launchCount',href:'http://pro.jiahk.cn:8020/#/launch/launchCount'},'1. 收入类指标改按实际入账计'],
   ['投产比',{text:'launch/launchRate',href:'http://pro.jiahk.cn:8020/#/launch/launchRate'},'1. 改为实际入账 ÷ 投放消耗'],
   ['会员管理',[{text:'userStat/vipManagement',href:'http://pro.jiahk.cn:8020/#/userStat/vipManagement'},{text:'userStat/vipManagementCustomer',href:'http://pro.jiahk.cn:8020/#/userStat/vipManagementCustomer'}],'1. 关闭订阅类操作对连续包年、SVIP 连续包月同样可用']
  ]}}
 ]}},
 {id:'c-subscription-server',title:'服务端',tag:'新增',requirements:{sections:[
  {title:'服务端',table:{headers:['需求名称','功能说明'],rows:[
   ['签约与解约','1. 接入签约、解约、签约状态查询\n2. 签约结果以通知为准'],
   ['预扣费与扣款','1. 非首次扣费须 t-2 日发预扣费通知，t 日扣款，金额一致\n2. T+2 未扣成将顺延一个周期，须有重试与告警'],
   ['订阅标记下发','1. 卡接口下发订阅标记与周期，新增档位后各端自动适配'],
   ['抽成记账','1. 订单落库记录费率、抽成金额与实际入账，费率可配置'],
   ['客服信息下发','1. 客服电话与服务时间由服务端配置下发']
  ]}}
 ]}}
);
data.pages.find(page=>page.id==='renewal').states=[{id:'active',name:'续费中',stateNote:{rule:'当前处于自动续费状态，展示下次扣费时间和金额，并提供取消续费指引。'}},{id:'canceled',name:'已取消但权益有效',stateNote:{rule:'用户已取消自动续费，但当前会员权益仍未到期；展示到期时间，不再展示下一次扣费信息。'}},{id:'expired',name:'已到期',stateNote:{rule:'会员权益已结束，不展示下一次扣费信息，并提供重新开通或续费入口。'}}];
const mineStateCatalog=[{id:'free',type:'Free',card:'',status:'',name:'Free',rule:'当前用户未开通会员，不展示订阅卡类型和续费状态。'},{id:'vip-subscription-renewing',type:'VIP',card:'订阅卡',status:'续费中',name:'VIP · 连续包月 · 续费中',rule:'VIP 用户购买连续包月商品，当前自动续费已开启。会员卡展示下次扣款日期，按钮为“管理续费”。'},{id:'vip-subscription-canceled',type:'VIP',card:'订阅卡',status:'已取消',name:'VIP · 已取消续费',rule:'VIP 用户已取消连续包月的自动续费，但当前会员权益仍在有效期内。会员卡展示权益到期日，按钮为“重新开通”。'},{id:'vip-subscription-expired',type:'VIP',card:'订阅卡',status:'已过期',name:'VIP · 连续包月 · 已过期',rule:'VIP 连续包月权益已过期，不再展示下次扣款信息，并提供重新开通入口。'},{id:'vip-single-active',type:'VIP',card:'单次卡',status:'生效中',name:'VIP · 单次卡 · 生效中',rule:'VIP 用户购买单次商品，当前权益生效中；单次卡不展示续费中和已取消状态。'},{id:'vip-single-expired',type:'VIP',card:'单次卡',status:'已过期',name:'VIP · 单次卡 · 已过期',rule:'VIP 单次卡权益已过期，提供重新开通入口。'},{id:'svip-subscription-renewing',type:'SVIP',card:'订阅卡',status:'续费中',name:'SVIP · 连续包月 · 续费中',rule:'SVIP 用户购买连续包月商品，当前自动续费已开启。会员卡展示下次扣款日期，按钮为“管理续费”。'},{id:'svip-subscription-canceled',type:'SVIP',card:'订阅卡',status:'已取消',name:'SVIP · 已取消续费',rule:'SVIP 用户已取消连续包月的自动续费，但当前会员权益仍在有效期内。会员卡展示权益到期日，按钮为“重新开通”。'},{id:'svip-subscription-expired',type:'SVIP',card:'订阅卡',status:'已过期',name:'SVIP · 连续包月 · 已过期',rule:'SVIP 连续包月权益已过期，不再展示下次扣款信息，并提供重新开通入口。'},{id:'svip-single-active',type:'SVIP',card:'单次卡',status:'生效中',name:'SVIP · 单次卡 · 生效中',rule:'SVIP 用户购买单次商品，当前权益生效中；单次卡不展示续费中和已取消状态。'},{id:'svip-single-expired',type:'SVIP',card:'单次卡',status:'已过期',name:'SVIP · 单次卡 · 已过期',rule:'SVIP 单次卡权益已过期，提供重新开通入口。'}];
 mineStateCatalog.push({id:'vip-subscription-annual-renewing',type:'VIP',card:'订阅卡',product:'连续包年',status:'续费中',name:'VIP · 连续包年 · 续费中',rule:'VIP 用户购买连续包年商品，当前自动续费已开启。会员卡展示下次扣款日期，按钮为“管理续费”。'},{id:'vip-subscription-annual-canceled',type:'VIP',card:'订阅卡',product:'连续包年',status:'已取消',name:'VIP · 已取消续费',rule:'VIP 用户已取消连续包年自动续费，但当前会员权益仍在有效期内。会员卡展示权益到期日，按钮为“重新开通”。'},{id:'vip-subscription-annual-expired',type:'VIP',card:'订阅卡',product:'连续包年',status:'已过期',name:'VIP · 连续包年 · 已过期',rule:'VIP 连续包年权益已过期，不再展示下次扣款信息，并提供重新开通入口。'},{id:'svip-subscription-annual-renewing',type:'SVIP',card:'订阅卡',product:'连续包年',status:'续费中',name:'SVIP · 连续包年 · 续费中',rule:'SVIP 用户购买连续包年商品，当前自动续费已开启。会员卡展示下次扣款日期，按钮为“管理续费”。'},{id:'svip-subscription-annual-canceled',type:'SVIP',card:'订阅卡',product:'连续包年',status:'已取消',name:'SVIP · 已取消续费',rule:'SVIP 用户已取消连续包年自动续费，但当前会员权益仍在有效期内。会员卡展示权益到期日，按钮为“重新开通”。'},{id:'svip-subscription-annual-expired',type:'SVIP',card:'订阅卡',product:'连续包年',status:'已过期',name:'SVIP · 连续包年 · 已过期',rule:'SVIP 连续包年权益已过期，不再展示下次扣款信息，并提供重新开通入口。'});
 mineStateCatalog.push({id:'multi-active',type:'SVIP',card:'双会员',product:'2个会员同时生效',status:'生效中',name:'双会员 · 同时生效',multiple:true,rule:'用户同时拥有 VIP 连续包月和 SVIP 单次卡。页面汇总展示当前最高权益 SVIP，并列出两个仍在生效的会员商品；每个商品的到期时间、扣费状态和管理入口独立展示，不能互相覆盖。'});
 mineStateCatalog.forEach(item=>{if(item.type==='Free'||item.id==='multi-active')return;const group=item.status==='续费中'&&item.type==='VIP';const primary=group?'进群':item.status==='续费中'?'终身权益':item.status==='已取消'?'恢复续费':'恢复权益';item.rule+=group?'主按钮“进群”进入交流群入口。':`主按钮“${primary}”点击后直接进入付费页，并自动选中对应商品，不展示中间弹窗。`});
 data.pages.find(page=>page.id==='mine').states=mineStateCatalog.map(item=>({id:item.id,name:item.name,stateNote:{rule:item.rule}}));
 const mineChange=subscriptionRelease.changes.find(change=>change.id==='c-subscription-mine');
 mineChange.requirements.states.push({id:'multi-active',name:'双会员 · 同时生效',summary:'用户同时拥有两个仍在生效的会员商品，权益汇总展示最高等级，商品明细分别管理。',sections:[{title:'权益汇总',bullets:['会员卡片展示当前最高权益等级，例如“SVIP会员”。','明确提示“2个会员同时生效”，不得只展示其中一个商品。','多个会员的权益按服务端规则合并，不能因为刷新或切换页面覆盖任一有效权益。']},{title:'会员明细',bullets:['分别展示每个有效商品的会员等级、商品名称、权益到期时间或下次扣款日期。','连续商品展示独立的“续费管理”入口；单次商品仅展示权益有效期，不展示自动续费开关。','进入续费管理后，用户可以切换查看不同商品；关闭一个连续商品的自动续费，不影响另一个有效商品。']}]});
 function mineStateInfo(){return mineStateCatalog.find(item=>item.id===state.stateId)||mineStateCatalog[0]}
renewalChange.requirements.states=[
 {id:'active',name:'续费中',summary:'用户已成功购买连续商品，当前自动续费保持开启。',sections:[{title:'会员卡片',bullets:['展示当前会员昵称、会员类型、订阅商品和用户ID。','突出当前处于自动续费状态。']},{title:'下次扣费信息',bullets:['展示下次续费时间和下次续费金额。','提供取消续费指引。','当前状态下不提供重复进入付费页购买的入口。']}]},
 {id:'canceled',name:'已取消但权益有效',summary:'用户已取消自动续费，但当前购买的会员权益仍在有效期内。',sections:[{title:'会员卡片',bullets:['展示当前会员昵称、会员类型、订阅商品和用户ID。','展示“已取消自动续费”状态。']},{title:'权益到期信息',bullets:['展示会员权益到期时间。','不展示下一次扣费时间和金额，或明确提示“不会再次扣费”。','用户在到期前仍可正常使用会员权益。','允许用户重新进入付费页购买其他会员商品。']}]},
 {id:'expired',name:'已到期',summary:'当前会员权益已经结束，用户不再拥有有效会员身份。',sections:[{title:'会员卡片',bullets:['展示当前会员昵称、会员类型、订阅商品和用户ID。','展示会员已到期状态。']},{title:'会员状态信息',bullets:['不展示下一次扣费时间和金额。','提供“立即续费 / 立即开通”入口，进入付费页重新购买。']}]}
];
 renewalChange.requirements.states.find(item=>item.id==='expired').summary='';
 renewalChange.requirements.common=[{title:'页面入口与会员信息',bullets:['用户成功购买连续商品并收到支付成功通知后，返回小程序时自动进入续费管理页。','用户也可以从“我的”会员卡片或会员服务入口进入。','展示当前会员昵称、会员类型、订阅商品和用户ID。']},{title:'服务承诺与扣费记录',bullets:['展示安全无忧、扣费透明、随时取消等服务承诺。','按时间倒序展示历史扣费记录。','每条记录展示订阅商品、扣费金额和有效期起止时间。','扣费记录以服务端实际支付结果为准。']},{title:'取消续费与客服',bullets:['告知用户取消自动续费需要前往微信操作。','展示路径：微信 → 我 → 服务 → 钱包 → 支付设置 → 自动续费。','用户取消成功后不再产生下一次自动扣费，但当前权益可使用至到期。','页面提供售后客服入口，客服处理需要关联用户ID、订阅商品和扣费记录。']},{title:'状态同步与异常处理',bullets:['取消续费成功后，服务端更新自动续费状态，客户端返回小程序时刷新会员状态。','客户端不得仅根据点击取消就判定成功，必须等待服务端或支付结果确认。','支付成功时关闭付费页并进入续费管理页；支付失败时停留在付费页。','续费状态、权益到期时间、扣费时间和金额均以服务端数据为准。']}];
const platformNames={ios:'iOS',android:'Android',mini:'微信小程序'};
const paymentPageStates=data.pages.find(page=>page.id==='payment')?.states;
if(paymentPageStates&&!paymentPageStates.some(item=>item.id==='subscription-canceled'))paymentPageStates.splice(3,0,{id:'subscription-canceled',name:'订阅卡 · 已取消',stateNote:{rule:'VIP / SVIP 订阅卡已取消自动续费但权益仍有效，等同于单次卡会员状态，不展示套餐、协议或购买入口。'}});
const state={tree:'release',pageId:'payment',stateId:'default',platform:'ios',selectedRelease:data.releases[0]?.id||null,selectedChange:null,folded:new Set(),noteMode:'release',pageNoteRequested:false,activeAnnotation:null,sheetAction:null,paymentTab:'vip',paymentPlan:'annual',paymentPlanScrollLeft:0,paymentAgreed:false,paymentRenewalDate:null,paymentMemberType:'free',paymentCardType:'single',paymentSubscriptionState:'renewing',paymentSubscriptionProduct:'annual',renewalTier:'vip',renewalProduct:'monthly',renewalMember:'vip-subscription'};
let savedRequirements={};
const $=s=>document.querySelector(s); const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
