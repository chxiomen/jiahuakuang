const WorkspaceRouter = (() => {
  const codec = WorkspaceRouteCodec;
  let applying = false;
  let initialized = false;
  let currentHash = '';
  let updatePending = false;
  const fields = {
    payment: { member: 'paymentMemberType', card: 'paymentCardType', subscription: 'paymentSubscriptionState', product: 'paymentSubscriptionProduct', tab: 'paymentTab', plan: 'paymentPlan', signPlatform: 'subscriptionPlatform' },
    renewal: { tier: 'renewalTier', product: 'renewalProduct', member: 'renewalMember', signPlatform: 'subscriptionPlatform' },
    mine: { member: 'renewalMember' }
  };
  function resolveVersion(reference) {
    return data.releases.find(version => [version.id, versionNumberFor(version), ...(version.aliases || [])].some(alias => alias?.toLowerCase() === reference?.toLowerCase()));
  }
  function currentRoute() {
    const version = release(state.selectedRelease) || release(workspaceBootstrap.activeVersion);
    const base = { version: versionNumberFor(version), kind: 'outline', params: {} };
    if (state.noteMode === 'release') return base;
    const selectedItem = state.noteMode === 'change' ? currentVersionItem() : null;
    const item = selectedItem && (!itemModel(selectedItem) || itemModel(selectedItem).pageId === state.pageId) ? selectedItem : null;
    const model = itemModel(item);
    if (item && !model) return { ...base, kind: 'items', target: item.id };
    base.kind = 'pages'; base.target = state.pageId;
    base.params.state = state.stateId;
    if (state.tree === 'page') base.params.tree = 'page';
    if (state.platform !== 'ios') base.params.platform = state.platform;
    if (item && version.changes.filter(candidate => !candidate.hidden && itemModel(candidate)?.pageId === state.pageId).length > 1) base.params.item = item.id;
    const defaults = state.pageId === 'payment'
      ? { member: state.stateId === 'default' ? 'free' : state.stateId === 'lifetime-svip' ? 'svip' : 'vip', card: state.stateId.startsWith('subscription-') ? 'subscription' : state.stateId.startsWith('lifetime-') ? 'lifetime' : 'single', subscription: state.stateId === 'subscription-canceled' ? 'canceled' : 'renewing', product: 'annual', tab: 'vip', plan: state.stateId === 'subscription-renewing' ? 'life' : 'annual', signPlatform: 'android' }
      : { tier: 'vip', product: 'monthly', member: 'vip-subscription', signPlatform: 'android' };
    for (const [query, field] of Object.entries(fields[state.pageId] || {})) if (state[field] !== defaults[query]) base.params[query] = state[field];
    return base;
  }
  function writeUrl(replace = false) {
    if (!initialized || applying || modelPreviewContext) return;
    const hash = codec.format(currentRoute());
    if (hash !== location.hash) history[replace ? 'replaceState' : 'pushState'](null, '', hash);
    currentHash = hash;
    localStorage.setItem('workspace:last-route:v3', hash);
  }
  function scheduleUrl() {
    if (updatePending) return;
    updatePending = true;
    setTimeout(() => { updatePending = false; writeUrl(); }, 0);
  }
  function navigateVersion(version, route = {}) {
    if (!abandonEditorIfNeeded()) return;
      const hash = codec.format({ ...route, version: versionNumberFor(version) });
    location.hash = hash;
    location.reload();
  }
  function configureState(pageId, stateId, params) {
    if (pageId === 'payment') {
      Object.assign(state, { paymentTab: 'vip', paymentPlan: 'annual', paymentMemberType: 'free', paymentCardType: 'single', paymentSubscriptionState: 'renewing', paymentSubscriptionProduct: 'annual' });
      if (stateId !== 'default') state.paymentMemberType = 'vip';
      if (stateId.startsWith('subscription-')) {
        state.paymentCardType = 'subscription'; state.paymentSubscriptionState = stateId === 'subscription-canceled' ? 'canceled' : 'renewing';
        if (stateId === 'subscription-renewing') state.paymentPlan = 'life';
      } else if (stateId.startsWith('lifetime-')) {
        state.paymentCardType = 'lifetime'; state.paymentMemberType = stateId === 'lifetime-svip' ? 'svip' : 'vip';
      }
    }
    for (const [query, field] of Object.entries(fields[pageId] || {})) if (params[query] && params[query].length < 100) state[field] = params[query];
  }
  function applyRoute(route) {
    const version = resolveVersion(route.version);
    if (!version || version.hidden) throw new Error('链接中的版本不存在或已删除');
    if (version.id !== workspaceBootstrap.activeVersion) { navigateVersion(version, route); return; }
    state.selectedRelease = version.id; state.tree = 'release'; state.folded.delete(version.id);
    state.activeAnnotation = null; state.selectedChange = null; state.pageNoteRequested = false;
    if (route.kind === 'outline') { state.noteMode = 'release'; return; }
    let item = route.kind === 'items' ? version.changes.find(item => item.id === route.target && !item.hidden) : null;
    if (route.kind === 'items' && !item) throw new Error('链接中的子项不存在或已删除');
    const pageId = route.kind === 'pages' ? route.target : itemModel(item)?.pageId;
    if (route.kind === 'pages') {
      item = route.params.item ? version.changes.find(item => item.id === route.params.item && !item.hidden && itemModel(item)?.pageId === pageId) : route.params.tree === 'page' ? null : version.changes.find(item => !item.hidden && itemModel(item)?.pageId === pageId);
      if (route.params.item && !item) throw new Error('此页面未关联链接中的子项');
    }
    if (pageId) {
      const page = findPage(pageId);
      if (!page || page.hidden) throw new Error('链接中的页面不存在或已删除');
      const wantedState = route.params.state || itemModel(item)?.stateId || page.states[0]?.id;
      const selected = page.states.find(entry => entry.id === wantedState);
      if (!selected) throw new Error('链接中的页面状态不存在');
      state.pageId = page.id; state.stateId = selected.id;
      state.platform = ['ios','android','mini'].includes(route.params.platform) ? route.params.platform : 'ios';
      configureState(page.id, selected.id, route.params);
    }
    state.selectedChange = item?.id || null;
    state.noteMode = item ? 'change' : 'page';
    state.pageNoteRequested = !item;
    if (!item) state.tree = 'page';
  }
  const originalSelectChange = selectChange;
  selectChange = function (versionId, itemId) {
    if (versionId !== workspaceBootstrap.activeVersion) {
      navigateVersion(release(versionId), { kind: 'items', target: itemId }); return;
    }
    originalSelectChange(versionId, itemId);
  };
  const originalShowRelease = showReleaseNote;
  showReleaseNote = function (versionId) {
    if (versionId !== workspaceBootstrap.activeVersion) { navigateVersion(release(versionId)); return; }
    originalShowRelease(versionId);
  };
  const originalToggleRelease = toggleReleaseFold;
  toggleReleaseFold = function (versionId) {
    if (versionId !== workspaceBootstrap.activeVersion) { navigateVersion(release(versionId)); return; }
    originalToggleRelease(versionId);
  };
  for (const name of ['renderAll', 'renderPhone', 'renderNotes']) {
    const original = window[name];
    window[name] = function (...args) { const result = original(...args); scheduleUrl(); return result; };
  }
  window.addEventListener('hashchange', () => {
    if (!initialized || location.hash === currentHash) return;
    if (!abandonEditorIfNeeded()) { history.replaceState(null, '', currentHash); return; }
    const oldState = { ...state };
    try {
      const route = codec.parse(location.hash);
      if (!route) throw new Error('链接为空');
      const version = resolveVersion(route.version);
      if (version?.id !== workspaceBootstrap.activeVersion) { location.reload(); return; }
      applying = true; applyRoute(route); renderAll(); applying = false; writeUrl(true);
    } catch (error) {
      applying = false; Object.assign(state, oldState);
      history.replaceState(null, '', currentHash); renderAll(); showToast(error.message);
    }
  });
  function initialize() {
    applying = true;
    applyRoute(workspaceInitialRoute || { version: workspaceBootstrap.activeVersion, kind: 'outline', params: {} });
    renderAll();
    initialized = true; applying = false; writeUrl(true);
  }
  return { initialize, currentRoute, writeUrl, navigateVersion };
})();
