// Text edits belong to a version item and a concrete page state, never to the shared page template.
const renderPhoneBeforeTextEditing = renderPhone;
let textDecorationPending = false;
let pendingModelClick = null;
let activeModelTextEdit = null;
let modelPreviewContext = null;

// Preview actions may redraw the phone or request annotation notes. Keep the
// document being edited mounted, with its draft and version selection intact.
const renderNotesBeforeModelInteraction = renderNotes;
renderNotes = function () {
  if (modelPreviewContext && editorSession?.editing) return;
  return renderNotesBeforeModelInteraction();
};

function preserveDocumentDuringModelClick(event) {
  if (!editorSession?.editing || !$('#phone').contains(event.target) || modelPreviewContext) return;
  const context = {
    selectedRelease: state.selectedRelease,
    selectedChange: state.selectedChange,
    noteMode: state.noteMode,
    activeAnnotation: state.activeAnnotation
  };
  modelPreviewContext = context;
  setTimeout(() => {
    const changed = state.selectedRelease !== context.selectedRelease || state.selectedChange !== context.selectedChange || state.noteMode !== context.noteMode;
    Object.assign(state, context);
    modelPreviewContext = null;
    if (changed) { renderTree(); syncWorkspaceMode(); }
    syncModelTextEditMode();
    scheduleModelTextDecoration();
  }, 0);
}

function canEditModelText() {
  return Boolean(editorSession?.editing && modelTextKey());
}

function syncModelTextEditMode() {
  const enabled = canEditModelText();
  $('#phone').classList.toggle('model-text-editable', enabled);
  if (!enabled && pendingModelClick) {
    clearTimeout(pendingModelClick);
    pendingModelClick = null;
  }
  if (!enabled && activeModelTextEdit) activeModelTextEdit.blur();
}

function modelTextKey() {
  const item = currentVersionItem();
  const model = itemModel(item);
  const variant = state.pageId === 'payment'
    ? [state.paymentTab, state.paymentPlan, state.paymentMemberType, state.paymentCardType, state.paymentSubscriptionState, state.paymentSubscriptionProduct].join(':')
    : state.pageId === 'renewal'
      ? [state.renewalTier, state.renewalProduct, state.renewalMember].join(':')
      : 'default';
  return state.noteMode === 'change' && model
    ? `model-text:${state.selectedRelease}:${item.id}:${state.pageId}:${state.stateId}:${variant}`
    : null;
}

function modelTextOverrides(key) {
  try {
    const parsed = JSON.parse(savedRequirements[key] || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch { return {}; }
}

function modelTextHash(value) {
  let hash = 2166136261;
  for (const char of value) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
  return (hash >>> 0).toString(36);
}

function decorateModelText() {
  const key = modelTextKey();
  syncModelTextEditMode();
  if (!key) return;
  const overrides = modelTextOverrides(key);
  for (const [area, root] of [['screen', $('#screen')], ['tabs', $('#tabBar')]]) {
    if (!root) continue;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim() || node.parentElement?.closest('[data-model-text-id],svg,script,style')) continue;
      nodes.push(node);
    }
    nodes.forEach((node, index) => {
      const id = `${area}:${index}:${modelTextHash(node.textContent.trim())}`;
      if (Object.prototype.hasOwnProperty.call(overrides, id)) node.textContent = overrides[id];
      const span = document.createElement('span');
      span.dataset.modelTextId = id;
      span.className = 'model-editable-text';
      node.replaceWith(span);
      span.append(node);
    });
  }
}

function scheduleModelTextDecoration() {
  if (textDecorationPending) return;
  textDecorationPending = true;
  queueMicrotask(() => {
    textDecorationPending = false;
    decorateModelText();
  });
}

renderPhone = function () {
  renderPhoneBeforeTextEditing();
  scheduleModelTextDecoration();
};

function modelTextAction(element) {
  return element.closest('button,a,label,[role="button"],[data-target],[data-payment-tab],[data-payment-plan],[data-tab],[data-lifetime-frame],[data-mine-active-member]');
}

// Keep caret placement and text selection native, but never deliver their
// pointer events or default button/label activation to the containing control.
for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
  document.addEventListener(type, event => {
    const editing = activeModelTextEdit;
    if (!editing) return;
    const insideText = editing.contains(event.target);
    const action = modelTextAction(editing);
    if (!insideText && !action?.contains(event.target)) return;
    if (type === 'click' || (!insideText && (type === 'pointerdown' || type === 'mousedown'))) event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
}

document.addEventListener('click', event => {
  preserveDocumentDuringModelClick(event);
  const span = event.target.closest?.('[data-model-text-id]');
  if (!span || !$('#phone').contains(span) || !canEditModelText()) return;
  const action = modelTextAction(span);
  if (!action || activeModelTextEdit) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (pendingModelClick) clearTimeout(pendingModelClick);
  pendingModelClick = setTimeout(() => {
    pendingModelClick = null;
    if (action.isConnected) action.click();
  }, 450);
}, true);

document.addEventListener('dblclick', event => {
  const span = event.target.closest?.('[data-model-text-id]');
  if (!span || !$('#phone').contains(span) || !canEditModelText()) return;
  if (activeModelTextEdit === span) {
    event.stopImmediatePropagation();
    return;
  }
  if (pendingModelClick) { clearTimeout(pendingModelClick); pendingModelClick = null; }
  event.preventDefault();
  event.stopPropagation();
  if (!ensureEditorAccess(() => { if (span.isConnected) span.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })); })) return;
  if (activeModelTextEdit && activeModelTextEdit !== span) activeModelTextEdit.blur();
  const key = modelTextKey();
  const original = span.textContent;
  activeModelTextEdit = span;
  span.contentEditable = 'plaintext-only';
  span.classList.add('is-editing');
  span.focus();
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(span);
  selection.removeAllRanges();
  selection.addRange(range);
  let finished = false;
  const finish = async save => {
    if (finished) return;
    finished = true;
    span.contentEditable = 'false';
    span.classList.remove('is-editing');
    activeModelTextEdit = null;
    const next = span.textContent.replace(/\r/g, '');
    if (!save || next === original) { span.textContent = original; return; }
    if (!key) { span.textContent = original; return; }
    const overrides = modelTextOverrides(key);
    overrides[span.dataset.modelTextId] = next;
    const html = JSON.stringify(overrides);
    try {
      const response = await fetch('/api/requirements', {
        method: 'POST', headers: requirementsWriteHeaders(), body: JSON.stringify({ key, html })
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      savedRequirements[key] = html;
      showToast('原型文案已保存');
    } catch (error) {
      span.textContent = original;
      showToast(`原型文案保存失败：${error.message}`);
    }
  };
  span.addEventListener('keydown', keyEvent => {
    keyEvent.stopPropagation();
    if (keyEvent.key === 'Escape') { keyEvent.preventDefault(); void finish(false); }
    if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) { keyEvent.preventDefault(); void finish(true); }
  }, { signal: (() => { const controller = new AbortController(); span.addEventListener('blur', () => { void finish(true); controller.abort(); }, { once: true }); return controller.signal; })() });
}, true);
