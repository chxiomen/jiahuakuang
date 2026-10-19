const revisionReviewEnabled = false;

const revisionReviewV2DismissKey = 'revision-review:membership-ios:20261014:v2:dismissed';

const revisionItems = [
  { id: 'version-number', kind: 'version', group: '版本与范围', label: '版本号：v7.5.6 → v7.6.5', key: 'workspace:structure:v2', before: 'v7.5.6 · 订阅套餐重开', after: 'v7.6.5 · 订阅套餐重开', hint: '版本迭代' },
  ...revisionPatches.map((patch, index) => ({ ...patch, id: `patch-${index}`, kind: 'patch', before: patch.from, after: patch.to })),
  { id: 'ios-section', kind: 'ios', group: 'iOS 独立章节', label: '新增 5.5.4 iOS 会员订阅差异', key: revisionIosKey, before: '原需求缺少独立的 iOS 规则章节', after: revisionIosHtml, hint: '技术边界' }
];

const revisionHints = {
  '5.5.3：连续套餐切换顺序': '取消原连续包月',
  '5.5：统一规则与异常处理': '续费中：',
  '5.5.3：切换成功后解旧协议': '连续套餐切换：',
  '5.5.1：购买组合明细': '技术边界',
  '排期复核标记': '需求要点',
  '图 4：VIP 续费中付费页': '用户当前是 续费中',
  '图 4：SVIP 续费中付费页': '用户当前是续费中',
  '付费页：平台与购买提示': '点击购买',
  '图 5 / 图 8：iOS 续费开关': '续费开关',
  '图 6 / 图 10 / 图 13：iOS 已取消当期': '续费开关',
  '自动续费协议：分平台退订路径': '底部操作入口',
  '我的：iOS 恢复续费入口': '主按钮：恢复续费',
  '支付、解约与告警顺序': '签约与解约',
  '复购矩阵：VIP 续费中': 'VIP · 连续包月 / 包年（续费中）',
  '复购矩阵：SVIP 续费中': 'SVIP · 连续包月 / 包年（续费中）'
};

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

function revisionCurrentRelease() { return release('v7.6.5') ? 'v7.6.5' : 'v7.5.6'; }

function revisionRoute(item) {
  if (item.kind === 'version' || item.key.startsWith('release:')) return { kind: 'release' };
  if (item.kind === 'ios') return { change: revisionItemStatus(item) === 'applied' ? 'item-ios-subscription-rules' : 'c-repurchase-rules' };
  if (item.key.startsWith('change:c-repurchase-rules')) return { change: 'c-repurchase-rules', matrix: item.key.endsWith(':rules') };
  if (item.key.startsWith('change:c-subscription-payment')) {
    const variant = item.key.split(':')[2] || '';
    return { change: 'c-subscription-payment', variant };
  }
  if (item.key.startsWith('change:c-subscription-renewal')) return { change: 'c-subscription-renewal', stateId: item.key.endsWith(':canceled') ? 'canceled' : 'active' };
  if (item.key.startsWith('change:c-subscription-mine')) return { change: 'c-subscription-mine', stateId: 'vip-subscription-canceled' };
  if (item.key.startsWith('change:c-subscription-server')) return { change: 'c-subscription-server' };
  return { change: item.key.replace(/^change:/, '') };
}

function revisionNavigate(item) {
  document.getElementById('revisionDialog')?.close();
  const route = revisionRoute(item);
  state.tree = 'release';
  state.selectedRelease = revisionCurrentRelease();
  state.activeAnnotation = null;
  if (route.kind === 'release') {
    state.selectedChange = null;
    state.noteMode = 'release';
  } else {
    state.selectedChange = route.change;
    state.noteMode = 'change';
    const change = release(state.selectedRelease)?.changes.find(entry => entry.id === route.change);
    if (change?.pageId) state.pageId = change.pageId;
    if (route.stateId) state.stateId = route.stateId;
    else if (change?.stateId) state.stateId = change.stateId;
    if (route.variant) {
      const [member, card, subscription] = route.variant.split('-');
      state.paymentMemberType = member;
      state.paymentCardType = card || 'single';
      state.paymentSubscriptionState = subscription || 'renewing';
      state.paymentTab = member;
      state.stateId = subscription === 'renewing' ? 'subscription-renewing' : 'default';
    } else if (route.change === 'c-subscription-payment') {
      state.paymentMemberType = 'free';
      state.paymentCardType = 'single';
      state.stateId = 'default';
    }
  }
  renderAll();
  const target = document.querySelector(`[data-revision-id="${item.id}"]`)
    || revisionAnchor(document.querySelector('#notes .requirements-editor-content') || document, item, revisionItemStatus(item));
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target?.classList.add('revision-focus');
  setTimeout(() => target?.classList.remove('revision-focus'), 2000);
}

function revisionStatusLabel(status) { return ({ pending: '待确认', applied: '已应用', rejected: '已取消', conflict: '原文已变化' })[status]; }

function revisionVisibleItems() { return revisionItems.filter(item => revisionItemStatus(item) !== 'rejected'); }

function revisionUpdateLaunch() {
  const launch = document.getElementById('reviewRevisions');
  launch.hidden = revisionVisibleItems().length === 0;
}

function revisionRenderSummary() {
  let dialog = document.getElementById('revisionDialog');
  if (!dialog) { dialog = document.createElement('dialog'); dialog.id = 'revisionDialog'; dialog.className = 'revision-dialog'; document.body.append(dialog); }
  const pending = revisionItems.filter(item => revisionItemStatus(item) === 'pending').length;
  const orderedItems = revisionItems.map((item, index) => ({ item, index, status: revisionItemStatus(item) })).filter(entry => entry.status !== 'rejected');
  dialog.innerHTML = `<div class="revision-shell"><header><h2>会员互买与 iOS 需求修改</h2><button type="button" class="revision-close" data-review-close aria-label="关闭修订">×</button></header><div class="revision-scroll">${orderedItems.map(({ item, index, status }) => {
    return `<section class="revision-card" data-review-card="${item.id}"><div class="revision-card-head"><span>${revisionEscape(item.group)}</span><h3>${index + 1}. ${revisionEscape(item.label)}</h3><em class="revision-status ${status}">${revisionStatusLabel(status)}</em></div><div class="revision-comparison"><div><b>修改前</b><pre>${revisionEscape(revisionPlain(item.before))}</pre></div><div class="revision-new"><b>拟修改</b><pre>${revisionEscape(revisionPlain(item.after))}</pre></div></div><div class="revision-card-actions"><button type="button" data-review-locate="${item.id}">定位到需求</button>${status === 'pending' ? `<button type="button" class="revision-apply" data-review-apply-one="${item.id}">确认此项</button><button type="button" data-review-reject="${item.id}">取消此项</button>` : status === 'conflict' ? `<button type="button" data-review-reject="${item.id}">取消此项</button>` : ''}</div></section>`;
  }).join('')}</div><footer><span id="revisionStatus">${pending} 项待确认 · ${orderedItems.length} 项修订</span><button type="button" data-review-close>关闭</button><button type="button" class="revision-apply" data-review-apply-all ${pending ? '' : 'disabled'}>应用全部待确认项</button></footer></div>`;
  dialog.querySelectorAll('[data-review-close]').forEach(button => button.onclick = () => { localStorage.setItem(revisionReviewV2DismissKey, '1'); dialog.close(); });
  dialog.querySelectorAll('[data-review-locate]').forEach(button => button.onclick = () => revisionNavigate(revisionItems.find(item => item.id === button.dataset.reviewLocate)));
  dialog.querySelectorAll('[data-review-apply-one]').forEach(button => button.onclick = () => revisionApplyOne(revisionItems.find(item => item.id === button.dataset.reviewApplyOne)));
  dialog.querySelectorAll('[data-review-reject]').forEach(button => button.onclick = () => revisionRejectOne(revisionItems.find(item => item.id === button.dataset.reviewReject)));
  dialog.querySelector('[data-review-apply-all]').onclick = revisionApplyAll;
  return dialog;
}

openRevisionReview = function () {
  if (!revisionReviewEnabled) return;
  if (!revisionVisibleItems().length) return;
  const dialog = revisionRenderSummary();
  localStorage.removeItem(revisionReviewV2DismissKey);
  if (!dialog.open) dialog.showModal();
};

function revisionRefreshSummary() {
  const dialog = document.getElementById('revisionDialog');
  if (!dialog?.open) return;
  if (!revisionVisibleItems().length) { dialog.close(); dialog.replaceChildren(); return; }
  const previousScrollTop = dialog.querySelector('.revision-scroll')?.scrollTop || 0;
  revisionRenderSummary();
  dialog.querySelector('.revision-scroll').scrollTop = previousScrollTop;
}

function revisionRejectOne(item) {
  localStorage.setItem(`revision-review:v2:${item.id}:rejected`, '1');
  revisionUpdateLaunch();
  revisionRefreshSummary();
  renderNotes();
}

async function revisionWriteOne(item, fresh) {
  const status = revisionItemStatus(item, fresh);
  if (status === 'applied') return [];
  if (status === 'conflict') throw new Error(`原文已变化：${item.label}。请先核对当前正文。`);
  if (item.kind === 'version') {
    const structure = JSON.parse(fresh['workspace:structure:v2']);
    const version = structure.releases.find(entry => entry.id === 'v7.5.6');
    version.id = 'v7.6.5';
    version.sourceId = 'v7.5.6';
    return [
      { key: 'workspace:structure:v2', html: JSON.stringify(structure) },
      { key: 'release:v7.6.5', html: fresh['release:v7.5.6'] }
    ];
  }
  if (item.kind === 'ios') {
    const structure = JSON.parse(fresh['workspace:structure:v2']);
    const version = structure.releases.find(entry => ['v7.5.6','v7.6.5'].includes(entry.id));
    version.changes.push({ id: 'item-ios-subscription-rules', title: 'iOS 订阅差异与待确认', description: '5.5.4 平台限制、退订路径及待确认问题', tag: '新增', type: '', hidden: false, custom: true, hasDocument: true, documentKey: revisionIosKey, model: null });
    return [{ key: 'workspace:structure:v2', html: JSON.stringify(structure) }, { key: revisionIosKey, html: revisionIosHtml }];
  }
  const key = revisionResolvedKey(item, fresh);
  return [{ key, html: fresh[key].replace(item.from, item.to) }];
}

async function revisionApplyOne(item, options = {}) {
  if (!ensureEditorAccess(() => revisionApplyOne(item, options))) return false;
  const statusNode = document.getElementById('revisionStatus');
  if (statusNode) statusNode.textContent = `正在保存：${item.label}`;
  try {
    const response = await fetch('/api/requirements', { cache: 'no-store' });
    if (!response.ok) throw new Error('无法读取最新需求');
    const fresh = (await response.json()).requirements || {};
    const writes = await revisionWriteOne(item, fresh);
    if (writes.length) {
      const saved = await fetch('/api/requirements', { method: 'POST', headers: requirementsWriteHeaders(), body: JSON.stringify({ items: writes }) });
      if (!saved.ok) throw new Error('保存失败，请核对编辑密码及数据服务');
      writes.forEach(entry => { savedRequirements[entry.key] = entry.html; });
      if (writes.some(entry => entry.key === 'workspace:structure:v2')) loadWorkspaceStructure();
      if (item.kind === 'version') {
        state.selectedRelease = 'v7.6.5';
        document.getElementById('currentVersion').textContent = 'v7.6.5';
      }
    }
    localStorage.removeItem(`revision-review:v2:${item.id}:rejected`);
    if (!options.deferRender) { renderAll(); revisionRefreshSummary(); }
    return true;
  } catch (error) {
    if (statusNode) statusNode.textContent = error.message;
    return false;
  }
}

async function revisionApplyAll() {
  if (!ensureEditorAccess(revisionApplyAll)) return;
  const pending = revisionItems.filter(item => revisionItemStatus(item) === 'pending');
  // Rename the version last so release-outline edits keep their existing source key.
  pending.sort((a, b) => (a.kind === 'version') - (b.kind === 'version'));
  for (const item of pending) {
    if (!await revisionApplyOne(item, { deferRender: true })) { revisionRefreshSummary(); return; }
  }
  renderAll();
  revisionRefreshSummary();
}

applyRevisionProposal = revisionApplyAll;

function revisionAnchor(root, item, status) {
  const hint = item.hint || revisionHints[item.label] || revisionPlain(status === 'applied' ? item.after : item.before).split('\n').find(Boolean)?.trim().slice(0, 24);
  const nodes = [...root.querySelectorAll('h2,h3,h4,p,li,td,th,strong,span')];
  const find = text => text && (nodes.find(node => node.textContent.trim() === text) || nodes.find(node => node.textContent.includes(text)));
  return find(hint) || (status === 'applied' ? find(revisionPlain(item.after).split('\n').find(Boolean)?.trim().slice(0, 24)) : null);
}

function revisionInlineHtml(item, status) {
  return `<div class="revision-inline" data-editor-ui="true" data-revision-id="${item.id}"><div class="revision-inline-head"><b>${revisionEscape(item.label)}</b><span class="revision-status ${status}">${revisionStatusLabel(status)}</span></div><div class="revision-inline-comparison"><div><small>原文</small><p>${revisionEscape(revisionPlain(item.before))}</p></div><div class="revision-inline-new"><small>拟修改</small><p>${revisionEscape(revisionPlain(item.after))}</p></div></div><div class="revision-inline-actions">${status === 'pending' ? `<button type="button" class="revision-apply" data-inline-apply="${item.id}">确认此项</button><button type="button" data-inline-reject="${item.id}">取消此项</button>` : ''}<button type="button" data-inline-summary>查看修订总览</button></div></div>`;
}

function revisionInsertInline(root, item) {
  const status = revisionItemStatus(item);
  if (status === 'conflict' || status === 'rejected') return;
  const anchor = revisionAnchor(root, item, status);
  const node = document.createElement('div');
  node.innerHTML = revisionInlineHtml(item, status);
  const widget = node.firstElementChild;
  if (!anchor) { root.append(widget); return; }
  anchor.classList.add('revision-target');
  const row = anchor.closest('tr');
  if (row) {
    const newRow = document.createElement('tr');
    newRow.className = 'revision-table-row';
    const cell = document.createElement('td');
    cell.colSpan = row.closest('table')?.rows[0]?.cells.length || row.cells.length;
    cell.append(widget);
    newRow.append(cell);
    row.after(newRow);
  } else if (anchor.closest('li')) anchor.closest('li').append(widget);
  else if (anchor.closest('.membership-state-card')) anchor.closest('.membership-state-card').append(widget);
  else anchor.after(widget);
}

function revisionRenderInline() {
  if (!revisionReviewEnabled) return;
  if (!revisionProposal || !['release','change'].includes(state.noteMode)) return;
  const editor = document.querySelector('#notes .requirements-editor-content');
  if (!editor || editor.isContentEditable) return;
  const visibleKey = state.noteMode === 'release' ? `release:${state.selectedRelease}` : document.querySelector('#notes .requirements-editor')?.dataset.requirementKey;
  const currentChange = state.selectedChange;
  const relevant = revisionItems.filter(item => {
    if (item.kind === 'version') return state.noteMode === 'release';
    if (item.kind === 'ios') return ['c-repurchase-rules','item-ios-subscription-rules'].includes(currentChange);
    if (item.key.endsWith(':rules')) return false;
    return revisionResolvedKey(item, savedRequirements) === visibleKey || (item.key === 'change:c-subscription-renewal:common' && currentChange === 'c-subscription-renewal');
  });
  if (!relevant.length) return;
  relevant.forEach(item => {
    revisionInsertInline(editor, item);
  });
  editor.querySelectorAll('[data-inline-apply]').forEach(button => button.onclick = () => revisionApplyOne(revisionItems.find(item => item.id === button.dataset.inlineApply)));
  editor.querySelectorAll('[data-inline-reject]').forEach(button => button.onclick = () => revisionRejectOne(revisionItems.find(item => item.id === button.dataset.inlineReject)));
  editor.querySelectorAll('[data-inline-summary]').forEach(button => button.onclick = openRevisionReview);
}

const renderNotesBeforeRevisionWorkflow = renderNotes;

renderNotes = function () { renderNotesBeforeRevisionWorkflow(); revisionRenderInline(); };

initRevisionReview = function () {
  if (!revisionReviewEnabled) {
    revisionProposal = null;
    document.getElementById('reviewRevisions').hidden = true;
    document.getElementById('revisionDialog')?.close();
    return;
  }
  if (!requirementsLoadSucceeded) return;
  revisionProposal = { items: revisionItems };
  const launch = document.getElementById('reviewRevisions');
  revisionUpdateLaunch();
  launch.onclick = openRevisionReview;
  if (revisionItemStatus(revisionItems[0]) === 'applied') {
    document.getElementById('currentVersion').textContent = 'v7.6.5';
    if (state.selectedRelease === 'v7.5.6') state.selectedRelease = 'v7.6.5';
  }
  renderAll();
  if (!launch.hidden && !localStorage.getItem(revisionReviewV2DismissKey)) openRevisionReview();
};
