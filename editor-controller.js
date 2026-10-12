// One editing session owns the visible requirement, its title, rules, and doubts.
let editorSession = null;
let editorAbort = null;
let navigationMenu = null;

function editorContentHtml(session) {
  const copy = session.content.cloneNode(true);
  copy.querySelectorAll('[data-editor-ui]').forEach(node => node.remove());
  return copy.innerHTML;
}

function editorDirty(session = editorSession) {
  return Boolean(session?.editing && (editorContentHtml(session) !== session.snapshot.html || session.title.textContent.trim() !== session.snapshot.title));
}

function abandonEditorIfNeeded() {
  if (!editorSession?.editing) return true;
  if (editorSession.saving) return false;
  if (editorDirty() && !window.confirm('当前需求说明有未保存修改，确定放弃吗？')) return false;
  cancelRequirementEdit(true);
  return true;
}

function editorStatus(message) {
  const status = editorSession?.toolbar?.querySelector('[data-editor-status]');
  if (status) status.textContent = message;
}

function requirementHistoryState(session) {
  return { html: editorContentHtml(session), title: session.title.textContent };
}

function decorateRequirementModule(section) {
  if (!section || section.querySelector(':scope > .module-actions')) return;
  const actions = document.createElement('div');
  actions.className = 'module-actions';
  actions.dataset.editorUi = 'true';
  actions.contentEditable = 'false';
  actions.innerHTML = '<button type="button" data-module-action="insert" title="在下方添加模块" aria-label="在下方添加模块"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg></button><button type="button" data-module-action="down" title="下移模块" aria-label="下移模块"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v10m-4-4 4 4 4-4"/></svg></button><button type="button" data-module-action="delete" title="删除模块" aria-label="删除模块"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 4h10M6 4V2h4v2m2 0-.6 9H4.6L4 4m2.5 2v5m3-5v5"/></svg></button>';
  section.append(actions);
}

function handleModuleAction(event) {
  const button = event.target.closest('[data-module-action]');
  if (!button || !editorSession?.editing) return;
  event.preventDefault();
  event.stopPropagation();
  const section = button.closest('.requirement-section');
  const action = button.dataset.moduleAction;
  if (!section) return;
  if (action === 'insert') {
    const next = document.createElement('section');
    next.className = 'requirement-section';
    next.innerHTML = '<h3>新模块</h3><p>在此输入内容</p>';
    section.insertAdjacentElement('afterend', next);
    decorateRequirementModule(next);
    const heading = next.querySelector('h3');
    heading.focus();
    const range = document.createRange();
    range.selectNodeContents(heading);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  } else if (action === 'down') {
    const peer = [...section.parentElement.children].filter(node => node.matches('.requirement-section'));
    const index = peer.indexOf(section);
    if (index >= 0 && index < peer.length - 1) peer[index + 1].insertAdjacentElement('afterend', section);
  } else if (action === 'delete') {
    section.remove();
  }
  recordRequirementHistory();
}

function syncRequirementHistoryButtons(session) {
  session.toolbar.querySelector('[data-editor-undo]').disabled = session.historyIndex <= 0;
  session.toolbar.querySelector('[data-editor-redo]').disabled = session.historyIndex >= session.history.length - 1;
}

function recordRequirementHistory(session = editorSession) {
  if (!session?.editing || session.historyApplying) return;
  const next = requirementHistoryState(session);
  const current = session.history[session.historyIndex];
  if (current?.html === next.html && current?.title === next.title) return;
  session.history.splice(session.historyIndex + 1);
  session.history.push(next);
  session.historyIndex = session.history.length - 1;
  syncRequirementHistoryButtons(session);
}

function travelRequirementHistory(direction) {
  const session = editorSession;
  if (!session?.editing || session.saving) return;
  recordRequirementHistory(session);
  const nextIndex = session.historyIndex + direction;
  if (nextIndex < 0 || nextIndex >= session.history.length) return;
  session.historyApplying = true;
  session.historyIndex = nextIndex;
  const previous = session.history[nextIndex];
  session.content.innerHTML = previous.html;
  session.title.textContent = previous.title;
  session.historyObserver.takeRecords();
  session.historyApplying = false;
  session.range = null;
  session.floating.hidden = true;
  session.doubt.hidden = true;
  session.doubt.style.display = 'none';
  const focus = session.lastFocus === 'title' ? session.title : session.content;
  focus.focus();
  const range = document.createRange();
  range.selectNodeContents(focus);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  syncRequirementHistoryButtons(session);
}

function editorFloatingSelection() {
  const session = editorSession;
  const selection = window.getSelection();
  if (!session || !selection?.rangeCount || selection.isCollapsed || !session.content.contains(selection.anchorNode) || !session.content.contains(selection.focusNode)) return null;
  return selection.getRangeAt(0);
}

function updateFloatingToolbar() {
  const session = editorSession;
  if (!session) return;
  const range = editorFloatingSelection();
  const bar = session.floating;
  if (!range) { bar.hidden = true; return; }
  session.range = range.cloneRange();
  const node = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
  const end = range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer.parentElement : range.endContainer;
  const cell = node?.closest?.('td,th');
  const sameCell = cell && cell === end?.closest?.('td,th');
  const format = session.editing ? `<button data-float="bold">加粗</button><button data-float="italic">斜体</button><button data-float="underline">下划线</button><select data-float="font-size" aria-label="字号"><option value="">字号</option><option value="12px">小</option><option value="14px">中</option><option value="16px">大</option><option value="18px">大+</option></select><select data-float="color" aria-label="文字颜色"><option value="">颜色</option><option value="#202631">黑</option><option value="#d94b58">红</option><option value="#276cf2">蓝</option><option value="#4c9a43">绿</option></select><button data-float="highlight">高亮</button><button data-float="outdent">减少缩进</button><button data-float="indent">缩进</button>${sameCell ? '<button data-float="add-row">行＋</button><button data-float="delete-row">行－</button><button data-float="add-column">列＋</button><button data-float="delete-column">列－</button><button data-float="cell-highlight">单元格高亮</button><button data-float="row-highlight">整行高亮</button><button data-float="column-highlight">整列高亮</button>' : ''}` : '<button data-float="edit">编辑</button>';
  bar.innerHTML = `${format}<button data-float="doubt">存疑</button>`;
  bar.hidden = false;
  const rect = range.getBoundingClientRect();
  bar.style.left = `${Math.max(8, Math.min(window.innerWidth - bar.offsetWidth - 8, rect.left + rect.width / 2 - bar.offsetWidth / 2))}px`;
  bar.style.top = `${Math.max(8, rect.top - bar.offsetHeight - 8)}px`;
}

function restoreEditorSelection() {
  const range = editorSession?.range;
  if (!range) return false;
  try { const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); return true; } catch { return false; }
}

function startRequirementEdit() {
  const session = editorSession;
  if (!session || !ensureEditorAccess()) return false;
  if (session.editing) return true;
  session.content.querySelectorAll('.requirement-section').forEach(decorateRequirementModule);
  session.snapshot = { html: editorContentHtml(session), title: session.title.textContent.trim() };
  session.editing = true;
  session.history = [requirementHistoryState(session)];
  session.historyIndex = 0;
  session.lastFocus = 'content';
  syncRequirementHistoryButtons(session);
  session.editor.classList.add('is-editing');
  session.notes.classList.add('is-editing');
  session.content.contentEditable = 'true';
  session.title.contentEditable = 'true';
  session.toolbar.hidden = false;
  session.controls.hidden = true;
  editorStatus('编辑中');
  updateFloatingToolbar();
  return true;
}

function cancelRequirementEdit(force = false) {
  const session = editorSession;
  if (!session?.editing || session.saving) return false;
  if (!force && editorDirty(session) && !window.confirm('确定放弃当前需求说明的未保存修改吗？')) return false;
  session.content.innerHTML = session.snapshot.html;
  session.title.textContent = session.snapshot.title;
  session.content.contentEditable = 'false';
  session.title.contentEditable = 'false';
  session.editor.classList.remove('is-editing');
  session.notes.classList.remove('is-editing');
  session.editing = false;
  session.toolbar.hidden = true;
  session.controls.hidden = false;
  session.floating.hidden = true;
  session.doubt.hidden = true;
  editorStatus('只读');
  return true;
}

function requirementWrites(session) {
  const copy = session.content.cloneNode(true);
  copy.querySelectorAll('[data-editor-ui]').forEach(node => node.remove());
  const rule = copy.querySelector('[data-repurchase-rules]');
  const writes = [];
  if (rule) {
    writes.push({ key: 'change:c-repurchase-rules:rules', html: rule.innerHTML });
    rule.closest('.requirement-section')?.remove();
  }
  const key = session.editor.dataset.requirementKey;
  const state = copy.querySelector('.requirement-state-content');
  const common = copy.querySelector('.requirement-common-content');
  if (state && /:(active|canceled|expired)$/.test(key)) {
    writes.push({ key, html: state.innerHTML });
    if (common) writes.push({ key: key.replace(/:(active|canceled|expired)$/, ':common'), html: common.innerHTML });
  } else {
    writes.push({ key, html: copy.innerHTML });
  }
  if (session.title.textContent.trim() !== workspaceStructure.documentTitle) {
    const structure = JSON.parse(workspaceStructurePayload());
    structure.documentTitle = session.title.textContent.trim() || '需求说明';
    writes.push({ key: workspaceStructureKey, html: JSON.stringify(structure) });
  }
  return writes;
}

async function saveRequirementEdit() {
  const session = editorSession;
  if (!session?.editing || session.saving) return;
  session.saving = true;
  editorStatus('保存中');
  const writes = requirementWrites(session);
  try {
    const response = await fetch('/api/requirements', { method: 'POST', headers: requirementsWriteHeaders(), body: JSON.stringify({ items: writes }) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    for (const item of writes) savedRequirements[item.key] = item.html;
    workspaceStructure.documentTitle = session.title.textContent.trim() || '需求说明';
    session.snapshot = { html: editorContentHtml(session), title: session.title.textContent.trim() };
    session.saving = false;
    cancelRequirementEdit(true);
    editorStatus('已保存');
  } catch (error) {
    session.saving = false;
    editorStatus(`保存失败：${error.message}`);
    showToast('保存失败，未保存内容仍在编辑区');
  }
}

async function persistReadingDoubt() {
  const session = editorSession;
  if (!session || session.editing) return;
  const writes = requirementWrites(session);
  try {
    const response = await fetch('/api/requirements', { method: 'POST', headers: requirementsWriteHeaders(), body: JSON.stringify({ items: writes }) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    writes.forEach(item => { savedRequirements[item.key] = item.html; });
    session.snapshot.html = editorContentHtml(session);
  } catch (error) { showToast(`存疑保存失败：${error.message}`); }
}

function showDoubtPopover(marker) {
  const session = editorSession;
  if (!session) return;
  const pop = session.doubt;
  pop.innerHTML = '<div class="doubt-note-entry"><textarea aria-label="存疑备注" rows="2" placeholder="添加备注"></textarea><span class="doubt-note-actions"><button type="button" data-note-save>✓</button><button type="button" data-note-cancel>×</button></span></div><footer><button type="button" data-note-close>关闭存疑</button></footer>';
  const field = pop.querySelector('textarea');
  field.value = marker.dataset.doubtNote || '';
  pop.hidden = false;
  pop.style.display = 'block';
  const rect = marker.getBoundingClientRect();
  pop.style.left = `${Math.max(8, Math.min(window.innerWidth - pop.offsetWidth - 8, rect.left))}px`;
  pop.style.top = `${Math.max(8, Math.min(window.innerHeight - pop.offsetHeight - 8, rect.bottom + 8))}px`;
  pop.querySelector('[data-note-save]').onclick = () => { marker.dataset.doubtNote = field.value; pop.hidden = true; pop.style.display = 'none'; void persistReadingDoubt(); };
  pop.querySelector('[data-note-cancel]').onclick = () => { pop.hidden = true; pop.style.display = 'none'; };
  pop.querySelector('[data-note-close]').onclick = () => { marker.replaceWith(...marker.childNodes); pop.hidden = true; pop.style.display = 'none'; void persistReadingDoubt(); };
}

function markEditorDoubt() {
  const session = editorSession;
  if (!session || !ensureEditorAccess() || !restoreEditorSelection()) return;
  const range = editorFloatingSelection();
  if (!range) return;
  const start = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
  const end = range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer.parentElement : range.endContainer;
  const block = node => node?.closest?.('p,li,td,th,h1,h2,h3,h4,div');
  if (block(start) !== block(end)) { showToast('请在同一段文字或单元格内标记存疑'); return; }
  const marker = document.createElement('span');
  marker.className = 'doubt-mark';
  marker.title = '存疑：点击填写备注';
  marker.dataset.doubtNote = '';
  marker.append(range.extractContents());
  range.insertNode(marker);
  session.floating.hidden = true;
  showDoubtPopover(marker);
  void persistReadingDoubt();
}

function applyEditorFormat(action, value) {
  const session = editorSession;
  if (!session?.editing || !restoreEditorSelection()) return;
  const selection = window.getSelection();
  const node = selection.anchorNode?.nodeType === Node.TEXT_NODE ? selection.anchorNode.parentElement : selection.anchorNode;
  const cell = node?.closest?.('td,th');
  const table = cell?.closest('table');
  if (['bold','italic','underline','indent','outdent'].includes(action)) document.execCommand(action);
  else if (action === 'highlight') document.execCommand('hiliteColor', false, '#fff2c9');
  else if (action === 'color' && value) document.execCommand('foreColor', false, value);
  else if (action === 'font-size' && value) {
    document.execCommand('fontSize', false, '7');
    session.content.querySelectorAll('font[size="7"]').forEach(element => { element.removeAttribute('size'); element.style.fontSize = value; });
  } else if (cell && table) {
    if (action === 'cell-highlight') cell.classList.toggle('editor-cell-highlight');
    if (action === 'row-highlight') cell.closest('tr').classList.toggle('editor-row-highlight');
    if (action === 'column-highlight') {
      const layout = requirementTableGrid(table);
      const column = layout.positions.get(cell);
      new Set(layout.grid.map(row => row[column]).filter(Boolean)).forEach(target => target.classList.toggle('editor-cell-highlight'));
    }
    if (['add-row','delete-row','add-column','delete-column'].includes(action)) changeRequirementTable(action);
  }
  session.content.focus();
  updateFloatingToolbar();
}

function bindUnifiedEditor() {
  editorAbort?.abort();
  editorSession?.historyObserver?.disconnect();
  editorAbort = new AbortController();
  const editor = document.querySelector('#notes > .requirements-editor');
  const head = document.querySelector('.note-head');
  head?.querySelector('.workspace-editor-controls')?.remove();
  document.querySelectorAll('.requirements-floating-toolbar,.doubt-note-popover').forEach(node => node.remove());
  editorSession = null;
  if (!editor || !head) return;
  const content = editor.querySelector('.requirements-editor-content');
  const title = head.querySelector('h2');
  if (!content || !title) return;
  title.textContent = workspaceStructure.documentTitle || '需求说明';
  if (editor.dataset.requirementKey === 'change:c-repurchase-rules') {
    const source = document.querySelector('[data-repurchase-rule-source]');
    if (source) {
      const section = document.createElement('section');
      section.className = 'requirement-section';
      section.innerHTML = `<h3>规则说明</h3><div data-repurchase-rules>${source.querySelector('.repurchase-rules-content').innerHTML}</div>`;
      content.append(section);
      source.remove();
    }
  }
  const toolbar = editor.querySelector('.requirements-editor-toolbar');
  head.append(toolbar);
  toolbar.innerHTML = '<small data-editor-status>只读</small><button type="button" class="history-icon" data-editor-undo title="撤销 Ctrl+Z" aria-label="撤销" disabled><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M7 6 3.5 9.5 7 13M4 9.5h7a5 5 0 0 1 0 10"/></svg></button><button type="button" class="history-icon" data-editor-redo title="恢复 Ctrl+Shift+Z" aria-label="恢复" disabled><svg viewBox="0 0 20 20" aria-hidden="true"><path d="m13 6 3.5 3.5L13 13m3-3.5H9a5 5 0 0 0 0 10"/></svg></button><button type="button" data-editor-cancel>取消</button><button type="button" class="save" data-editor-save>保存</button>';
  toolbar.hidden = true;
  const controls = document.createElement('span');
  controls.className = 'workspace-editor-controls';
  controls.innerHTML = '<button type="button" class="primary-action" data-editor-start>进入编辑</button>';
  head.append(controls);
  const floating = document.createElement('div');
  floating.className = 'requirements-floating-toolbar';
  floating.hidden = true;
  const doubt = document.createElement('aside');
  doubt.className = 'doubt-note-popover';
  doubt.hidden = true;
  doubt.style.display = 'none';
  document.body.append(floating, doubt);
  editorSession = { editor, notes: document.querySelector('.notes'), content, title, toolbar, controls, floating, doubt, editing: false, saving: false, snapshot: { html: content.innerHTML, title: title.textContent.trim() }, range: null, history: [], historyIndex: -1, historyApplying: false, lastFocus: 'content' };
  const signal = editorAbort.signal;
  controls.querySelector('[data-editor-start]').onclick = startRequirementEdit;
  toolbar.querySelector('[data-editor-undo]').onclick = () => travelRequirementHistory(-1);
  toolbar.querySelector('[data-editor-redo]').onclick = () => travelRequirementHistory(1);
  toolbar.querySelector('[data-editor-cancel]').onclick = () => cancelRequirementEdit();
  toolbar.querySelector('[data-editor-save]').onclick = saveRequirementEdit;
  const session = editorSession;
  session.historyObserver = new MutationObserver(() => recordRequirementHistory(session));
  session.historyObserver.observe(content, { subtree: true, childList: true, characterData: true, attributes: true });
  session.historyObserver.observe(title, { subtree: true, childList: true, characterData: true, attributes: true });
  content.addEventListener('input', () => recordRequirementHistory(session), { signal });
  title.addEventListener('input', () => recordRequirementHistory(session), { signal });
  content.addEventListener('focusin', () => { session.lastFocus = 'content'; }, { signal });
  content.querySelectorAll('.requirement-section').forEach(decorateRequirementModule);
  content.addEventListener('click', handleModuleAction, { signal });
  title.addEventListener('focusin', () => { session.lastFocus = 'title'; }, { signal });
  document.addEventListener('keydown', event => {
    if (!session.editing || !(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'z') return;
    if (event.target.closest?.('textarea,input')) return;
    event.preventDefault();
    travelRequirementHistory(event.shiftKey ? 1 : -1);
  }, { signal });
  content.addEventListener('mouseup', updateFloatingToolbar, { signal });
  content.addEventListener('keyup', updateFloatingToolbar, { signal });
  content.addEventListener('click', event => { const marker = event.target.closest('.doubt-mark'); if (marker) showDoubtPopover(marker); }, { signal });
  floating.addEventListener('mousedown', event => { if (event.target.tagName !== 'SELECT') event.preventDefault(); }, { signal });
  floating.addEventListener('click', event => {
    const action = event.target.closest('[data-float]')?.dataset.float;
    if (!action) return;
    if (action === 'edit') startRequirementEdit();
    else if (action === 'doubt') markEditorDoubt();
    else applyEditorFormat(action);
  }, { signal });
  floating.addEventListener('change', event => { const control = event.target.closest('select[data-float]'); if (!control?.value) return; applyEditorFormat(control.dataset.float, control.value); }, { signal });
  document.addEventListener('selectionchange', updateFloatingToolbar, { signal });
  document.addEventListener('mousedown', event => { if (!doubt.contains(event.target) && !event.target.closest('.doubt-mark')) { doubt.hidden = true; doubt.style.display = 'none'; } }, { signal });
}

window.addEventListener('beforeunload', event => { if (editorDirty()) { event.preventDefault(); event.returnValue = ''; } });
document.addEventListener('click', event => {
  if (!editorSession?.editing) return;
  if (!event.target.closest('#tree,#treeSwitch,#fullNote,[data-tool-state],[data-requirement-state],[data-mine-type],[data-mine-card],[data-mine-status],[data-payment-member],[data-payment-card],[data-payment-subscription],[data-payment-tab],[data-payment-plan],[data-platform],[data-target]')) return;
  if (!abandonEditorIfNeeded()) { event.preventDefault(); event.stopImmediatePropagation(); }
}, true);

function closeNavigationMenu() {
  navigationMenu?.remove();
  navigationMenu = null;
}

function inlineNavigationName(kind, id, isNew = false) {
  const item = kind === 'page' ? data.pages.find(page => page.id === id) : data.releases.find(version => version.id === id);
  const row = document.querySelector(kind === 'page' ? `[data-page-row="${CSS.escape(id)}"]` : `[data-version-row="${CSS.escape(id)}"]`);
  const label = kind === 'page' ? row?.querySelector('.page-select span') : row?.querySelector('.release-header b');
  if (!item || !label) return;
  const input = document.createElement('input');
  input.className = 'nav-inline-name';
  input.value = isNew ? '' : item.name;
  label.replaceWith(input);
  input.focus();
  input.select();
  input.addEventListener('click', event => event.stopPropagation());
  let done = false;
  const finish = async commit => {
    if (done) return;
    done = true;
    const value = input.value.trim();
    if (commit && value) {
      const previous = item.name;
      item.name = value;
      if (!await persistWorkspaceStructure()) {
        item.name = previous;
        if (isNew) {
          const collection = kind === 'page' ? data.pages : data.releases;
          const index = collection.indexOf(item);
          if (index >= 0) collection.splice(index, 1);
        }
      }
    } else if (isNew) {
      const collection = kind === 'page' ? data.pages : data.releases;
      const index = collection.indexOf(item);
      if (index >= 0) collection.splice(index, 1);
    }
    renderTree();
    if (kind === 'page' && state.pageId === id) renderNotes();
  };
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') { event.preventDefault(); void finish(true); }
    if (event.key === 'Escape') { event.preventDefault(); void finish(false); }
  });
  input.addEventListener('blur', () => { void finish(true); });
}

async function navigationAction(kind, id, action) {
  if (!ensureEditorAccess() || !abandonEditorIfNeeded()) return;
  const collection = kind === 'page' ? data.pages : data.releases;
  const index = collection.findIndex(item => item.id === id);
  const item = collection[index];
  if (!item) return;
  if (action === 'rename') { inlineNavigationName(kind, id); return; }
  if (action === 'insert') {
    const nextId = `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const next = kind === 'page'
      ? { id: nextId, name: '新页面', group: item.group, __workspaceCustom: true, pageNote: { description: '请填写此页面的需求说明。', path: '待补充进入路径。', modules: [] }, states: [{ id: 'default', name: '默认态', stateNote: { rule: '请补充当前页面状态说明。' } }] }
      : { id: nextId, name: '新版本', changes: [], __workspaceCustom: true };
    collection.splice(index + 1, 0, next);
    renderTree();
    inlineNavigationName(kind, nextId, true);
    return;
  }
  if (action === 'delete') {
    const scope = kind === 'version' && item.changes?.length ? `该版本下有 ${item.changes.length} 个关联页面条目，删除后版本及条目将从导航中隐藏。` : '删除后将从导航中隐藏，现有数据保留。';
    if (!window.confirm(`确认删除${kind === 'page' ? '页面' : '版本'}“${item.name}”吗？\n${scope}`)) return;
    item.hidden = true;
    if (!await persistWorkspaceStructure()) { item.hidden = false; return; }
    if (kind === 'page' && state.pageId === id) {
      const fallback = data.pages.find(page => !page.hidden);
      if (fallback) { state.pageId = fallback.id; state.stateId = fallback.states[0]?.id || 'default'; }
    }
    if (kind === 'version' && state.selectedRelease === id) {
      state.selectedRelease = data.releases.find(version => !version.hidden)?.id;
      state.selectedChange = null;
      state.noteMode = 'release';
    }
    renderAll();
  }
}

document.addEventListener('contextmenu', event => {
  const page = event.target.closest('#tree [data-page-row]');
  const version = event.target.closest('#tree [data-version-row] .release-line');
  if (!page && !version) return;
  event.preventDefault();
  closeNavigationMenu();
  const kind = page ? 'page' : 'version';
  const id = page ? page.dataset.pageRow : version.closest('[data-version-row]').dataset.versionRow;
  const menu = document.createElement('div');
  menu.className = 'navigation-context-menu';
  menu.innerHTML = `<button data-nav-menu="rename">重命名</button><button data-nav-menu="insert">在下面插入新${kind === 'page' ? '页面' : '版本'}</button><button data-nav-menu="delete">删除</button>`;
  document.body.append(menu);
  navigationMenu = menu;
  menu.style.left = `${Math.max(8, Math.min(window.innerWidth - menu.offsetWidth - 8, event.clientX))}px`;
  menu.style.top = `${Math.max(8, Math.min(window.innerHeight - menu.offsetHeight - 8, event.clientY))}px`;
  menu.addEventListener('click', click => { const action = click.target.closest('[data-nav-menu]')?.dataset.navMenu; closeNavigationMenu(); if (action) void navigationAction(kind, id, action); });
});
document.addEventListener('mousedown', event => { if (navigationMenu && !navigationMenu.contains(event.target)) closeNavigationMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeNavigationMenu(); });
