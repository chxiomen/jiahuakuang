async function loadRequirements() {
  const response = await fetch('/api/requirements', { cache: 'no-store' });
  if (!response.ok) throw new Error('无法读取当前版本的数据');
  const payload = await response.json();
  savedRequirements = payload.requirements || {};
  requirementsLoadSucceeded = true;
}

async function startWorkspace() {
  $('#treeSwitch').onclick = () => {
    if (!abandonEditorIfNeeded()) return;
    state.tree = state.tree === 'release' ? 'page' : 'release';
    state.selectedChange = null; state.noteMode = 'page';
    state.pageNoteRequested = state.tree === 'page'; state.activeAnnotation = null;
    renderAll();
  };
  $('#fullNote').onclick = () => {
    if (!abandonEditorIfNeeded()) return;
    state.noteMode = 'page'; state.pageNoteRequested = true; state.activeAnnotation = null; state.selectedChange = null;
    renderAll();
  };
  $('#cancel').onclick = closeSheet;
  $('#agreementClose').onclick = closeSheet;
  $('#mask').onclick = closeSheet;
  $('#confirm').onclick = confirmAction;
  await loadRequirements();
  loadWorkspaceStructure();
  WorkspaceRouter.initialize();
  initRevisionReview();
  $('#copyWorkspaceLink').onclick = async () => {
    const button = $('#copyWorkspaceLink');
    try { await navigator.clipboard.writeText(location.href); button.textContent = '已复制链接'; }
    catch { button.textContent = '请复制地址栏链接'; }
    setTimeout(() => { button.textContent = '复制当前链接'; }, 1800);
  };
}
