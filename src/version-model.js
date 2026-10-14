// Version items own two independent links: a requirement document and an optional page model.
// Historical v7.5.6 keys remain readable; newly created documents are scoped to their version.
const legacyStructureLoader = loadWorkspaceStructure;
const legacyChangeNote = changeNote;
const legacyBindTree = bindTree;
const legacySyncWorkspaceMode = syncWorkspaceMode;

function currentVersionItem() {
  return release(state.selectedRelease)?.changes.find(item => item.id === state.selectedChange) || null;
}

function itemModel(item) {
  if (!item) return null;
  if (Object.prototype.hasOwnProperty.call(item, 'model')) return item.model;
  return item.pageId ? { pageId: item.pageId, stateId: item.stateId || 'default' } : null;
}

function documentKeyFor(item, releaseId) {
  return item.documentKey || (item.__workspaceCustom
    ? `document:${releaseId}:${item.id}`
    : `change:${item.id}`);
}

function serialiseVersionItem(item, releaseId) {
  return {
    id: item.id,
    title: item.title || '',
    description: item.description || '',
    tag: item.tag || '',
    type: item.type || '',
    hidden: Boolean(item.hidden),
    custom: Boolean(item.__workspaceCustom),
    requirements: item.__workspaceCustom ? clone(item.requirements || { sections: [] }) : undefined,
    hasDocument: item.hasDocument !== false,
    documentKey: documentKeyFor(item, releaseId),
    model: itemModel(item)
  };
}

workspaceStructurePayload = function () {
  return JSON.stringify({
    schemaVersion: 2,
    documentTitle: workspaceStructure.documentTitle || '需求说明',
    pages: data.pages.map(serialiseWorkspacePage),
    releases: data.releases.map(version => ({
      id: version.id,
      name: version.name,
      hidden: Boolean(version.hidden),
      custom: Boolean(version.__workspaceCustom),
      changes: version.changes.map(item => serialiseVersionItem(item, version.id))
    }))
  });
};

function applyItemRecord(item, record, versionId) {
  item.title = record.title || item.title || '未命名子项';
  item.description = record.description || '';
  item.tag = record.tag || '';
  item.type = record.type || '';
  item.hidden = Boolean(record.hidden);
  item.hasDocument = record.hasDocument !== false;
  item.documentKey = record.documentKey || documentKeyFor(item, versionId);
  item.model = record.model && findPage(record.model.pageId)
    ? { pageId: record.model.pageId, stateId: record.model.stateId || findPage(record.model.pageId).states[0]?.id || 'default' }
    : null;
  item.pageId = item.model?.pageId;
  item.stateId = item.model?.stateId;
}

loadWorkspaceStructure = function () {
  const v2 = savedRequirements['workspace:structure:v2'];
  if (!v2 && savedRequirements['workspace:structure:v1']) {
    workspaceStructureKey = 'workspace:structure:v1';
    legacyStructureLoader();
    workspaceStructureKey = 'workspace:structure:v2';
  } else if (v2) {
    legacyStructureLoader();
    try {
      const structure = JSON.parse(v2);
      for (const versionRecord of structure.releases || []) {
        const version = release(versionRecord.id);
        if (!version || !Array.isArray(versionRecord.changes)) continue;
        const known = new Map(version.changes.map(item => [item.id, item]));
        const ordered = [];
        for (const record of versionRecord.changes) {
          if (!record || typeof record.id !== 'string') continue;
          const item = known.get(record.id) || {
            id: record.id,
            __workspaceCustom: true,
            requirements: record.requirements || { sections: [] },
            annotationIds: []
          };
          applyItemRecord(item, record, version.id);
          ordered.push(item);
          known.delete(record.id);
        }
        version.changes.splice(0, version.changes.length, ...ordered, ...known.values());
      }
    } catch (error) {
      console.error('版本子项结构无法读取', error);
    }
  }
  for (const version of data.releases) {
    for (const item of version.changes) {
      item.model = itemModel(item);
      if (!v2 && item.__workspaceCustom && savedRequirements[`change:${item.id}`]) item.documentKey = `change:${item.id}`;
      item.documentKey ||= documentKeyFor(item, version.id);
      item.hasDocument ??= true;
    }
  }
};

releaseTree = function () {
  return `<h3 class="tree-title">版本迭代</h3>${data.releases.filter(version => !version.hidden).map(version => {
    const folded = state.folded.has(version.id);
    const outlineActive = state.noteMode === 'release' && state.selectedRelease === version.id;
    return `<article class="release ${folded ? 'folded' : ''}" data-version-row="${escape(version.id)}">
      <div class="release-line"><button class="release-fold" data-fold-release="${escape(version.id)}" aria-label="${folded ? '展开' : '收起'}版本"><i class="chevron" aria-hidden="true"></i></button><button class="release-header" data-release="${escape(version.id)}"><span><b>${escape(version.id)} · ${escape(version.name)}</b></span></button></div>
      <div class="release-content"><button class="release-outline ${outlineActive ? 'active' : ''}" data-release-outline="${escape(version.id)}"><span><b>需求大纲</b></span></button>
      ${version.changes.filter(item => !item.hidden).map(item => `<div class="version-item-row ${state.selectedChange === item.id ? 'active' : ''}"><button class="change-item ${state.selectedChange === item.id ? 'active' : ''}" data-change="${escape(item.id)}" data-parent-release="${escape(version.id)}"><span><b>${escape(item.title || '未命名子项')}</b>${item.description ? `<small>${escape(item.description)}</small>` : ''}</span></button><button class="item-settings" data-item-menu="${escape(item.id)}" data-parent-release="${escape(version.id)}" title="子项操作" aria-label="子项操作" aria-haspopup="menu">⋯</button></div>`).join('')}
      <button type="button" class="add-version-item" data-add-item="${escape(version.id)}">＋ 添加子项</button></div></article>`;
  }).join('')}<button type="button" class="add-version" data-add-version>＋ 新版本</button>`;
};

bindTree = function () {
  legacyBindTree();
  document.querySelectorAll('[data-add-item]').forEach(button => button.onclick = () => openVersionItemDialog(button.dataset.addItem));
  document.querySelectorAll('[data-item-menu]').forEach(button => button.onclick = () => openVersionItemMenu(button, button.dataset.parentRelease, button.dataset.itemMenu));
  document.querySelector('[data-add-version]')?.addEventListener('click', openNewVersionDialog);
};

function openVersionItemMenu(trigger, versionId, itemId) {
  document.querySelector('.version-item-menu')?.remove();
  const version = release(versionId);
  const item = version?.changes.find(entry => entry.id === itemId);
  if (!item) return;
  const menu = document.createElement('div');
  menu.className = 'version-item-menu';
  menu.setAttribute('role', 'menu');
  menu.innerHTML = `<button type="button" role="menuitem" data-item-action="rename">重命名</button>
    <button type="button" role="menuitem" data-item-action="model">原型选择</button>
    <button type="button" role="menuitem" class="danger" data-item-action="delete">删除</button>`;
  document.body.append(menu);
  const rect = trigger.getBoundingClientRect();
  const left = Math.max(12, Math.min(rect.right - 184, window.innerWidth - 196));
  const top = Math.min(rect.bottom + 6, window.innerHeight - 164);
  Object.assign(menu.style, { left: `${left}px`, top: `${top}px` });
  const outsideClick = event => {
    if (!menu.contains(event.target) && event.target !== trigger) close();
  };
  const close = () => {
    document.removeEventListener('pointerdown', outsideClick);
    menu.remove();
  };
  menu.querySelectorAll('[data-item-action]').forEach(button => button.onclick = () => {
    const action = button.dataset.itemAction;
    close();
    if (action === 'rename') openRenameVersionItemDialog(version, item);
    if (action === 'model') openModelSelectionDialog(version, item);
    if (action === 'delete') openDeleteVersionItemDialog(version, item);
  });
  requestAnimationFrame(() => document.addEventListener('pointerdown', outsideClick));
}

function openRenameVersionItemDialog(version, item) {
  if (!ensureEditorAccess(() => openRenameVersionItemDialog(version, item)) || !abandonEditorIfNeeded()) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'version-item-dialog';
  dialog.innerHTML = `<form method="dialog" class="version-item-form"><h2>重命名子项</h2>
    <label>名称<input name="title" maxlength="100" required value="${escape(item.title || '')}"></label>
    <div class="dialog-actions"><button type="button" data-close>取消</button><button type="submit" class="save">保存</button></div></form>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  form.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  form.onsubmit = async event => {
    event.preventDefault();
    const title = form.elements.title.value.trim();
    if (!title) { showToast('请填写名称'); return; }
    const before = item.title;
    item.title = title;
    if (!await persistWorkspaceStructure()) { item.title = before; return; }
    dialog.close();
    renderAll();
  };
  dialog.showModal();
}

function openModelSelectionDialog(version, item) {
  if (!ensureEditorAccess(() => openModelSelectionDialog(version, item)) || !abandonEditorIfNeeded()) return;
  const model = itemModel(item);
  const dialog = document.createElement('dialog');
  dialog.className = 'version-item-dialog';
  dialog.innerHTML = `<form method="dialog" class="version-item-form"><h2>原型选择</h2>
    <div class="model-fields"><label>关联页面<select name="pageId"><option value="new">＋ 新建页面</option>${data.pages.filter(page => !page.hidden).map(page => `<option value="${escape(page.id)}" ${model?.pageId === page.id ? 'selected' : ''}>${escape(page.name)}</option>`).join('')}</select></label>
      <label class="new-page-field">新页面名称<input name="newPageName" maxlength="100" placeholder="输入页面名称"></label>
      <label class="new-page-field">导航分组<input name="newPageGroup" maxlength="100" value="交易页面"></label></div>
    <div class="dialog-actions">${model ? '<button type="button" class="delete-item" data-remove-model>解除原型关联</button>' : ''}<button type="button" data-close>取消</button><button type="submit" class="save">保存</button></div></form>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const pageSelect = form.elements.pageId;
  if (!model) pageSelect.value = data.pages.find(page => !page.hidden)?.id || 'new';
  const sync = () => {
    const isNew = pageSelect.value === 'new';
    dialog.querySelectorAll('.new-page-field').forEach(field => field.hidden = !isNew);
  };
  pageSelect.onchange = sync;
  form.querySelector('[data-close]').onclick = () => dialog.close();
  form.querySelector('[data-remove-model]')?.addEventListener('click', async () => {
    const before = item.model;
    item.model = null; item.pageId = undefined; item.stateId = undefined;
    if (!await persistWorkspaceStructure()) { item.model = before; item.pageId = before?.pageId; item.stateId = before?.stateId; return; }
    dialog.close();
    if (state.selectedChange === item.id) { state.noteMode = 'change'; state.selectedRelease = version.id; }
    renderAll();
  });
  dialog.addEventListener('close', () => dialog.remove());
  form.onsubmit = async event => {
    event.preventDefault();
    let pageId = pageSelect.value;
    let newPage = null;
    if (pageId === 'new') {
      const pageName = form.elements.newPageName.value.trim();
      if (!pageName) { showToast('请填写新页面名称'); return; }
      pageId = nextPageId();
      newPage = { id: pageId, name: pageName, group: form.elements.newPageGroup.value.trim() || '未分组', __workspaceCustom: true,
        pageNote: { description: '', path: '', modules: [] }, states: [{ id: 'default', name: '默认态', stateNote: { rule: '' } }] };
      data.pages.push(newPage);
    }
    const before = item.model;
    item.model = { pageId, stateId: model?.pageId === pageId ? model.stateId : (findPage(pageId)?.states[0]?.id || 'default') };
    item.pageId = item.model.pageId;
    item.stateId = item.model.stateId;
    if (!await persistWorkspaceStructure()) {
      if (newPage) data.pages.splice(data.pages.indexOf(newPage), 1);
      item.model = before; item.pageId = before?.pageId; item.stateId = before?.stateId;
      return;
    }
    dialog.close();
    state.selectedRelease = version.id;
    state.selectedChange = item.id;
    state.noteMode = 'change';
    state.pageId = item.model.pageId;
    state.stateId = item.model.stateId;
    renderAll();
  };
  sync();
  dialog.showModal();
}

function openNewVersionDialog() {
  if (!ensureEditorAccess(openNewVersionDialog) || !abandonEditorIfNeeded()) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'version-item-dialog';
  dialog.innerHTML = `<form method="dialog" class="version-item-form"><h2>新增版本</h2>
    <label>版本号<input name="versionId" required maxlength="40" placeholder="例如 v7.5.7"></label>
    <label>版本名称<input name="versionName" required maxlength="100" placeholder="例如 会员体验优化"></label>
    <div class="dialog-actions"><button type="button" data-close>取消</button><button type="submit" class="save">创建</button></div></form>`;
  document.body.append(dialog);
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelector('form').onsubmit = async event => {
    event.preventDefault();
    const id = dialog.querySelector('[name="versionId"]').value.trim();
    const name = dialog.querySelector('[name="versionName"]').value.trim();
    if (!/^[\w.-]+$/.test(id) || !name) { showToast('版本号只支持字母、数字、点、横线和下划线'); return; }
    if (release(id)) { showToast('版本号已存在'); return; }
    const version = { id, name, changes: [], __workspaceCustom: true, status: 'draft' };
    data.releases.push(version);
    if (!await persistWorkspaceStructure()) { data.releases.splice(data.releases.indexOf(version), 1); return; }
    dialog.close();
    state.tree = 'release';
    state.selectedRelease = id;
    state.selectedChange = null;
    state.noteMode = 'release';
    renderAll();
  };
  dialog.showModal();
}

changeNote = function () {
  const item = currentVersionItem();
  if (!item) return '<div class="note-empty">请选择版本子项。</div>';
  if (item.hasDocument === false) return '<div class="note-empty">此子项未关联需求文档。可以通过子项右侧的「⋯」添加文档。</div>';
  if (!item.__workspaceCustom && item.documentKey === `change:${item.id}`) return legacyChangeNote();
  return requirementsNote(item.requirements || { sections: [] }, documentKeyFor(item, state.selectedRelease));
};

syncWorkspaceMode = function () {
  legacySyncWorkspaceMode();
  if (state.noteMode === 'change') {
    const item = currentVersionItem();
    $('#workspace').classList.toggle('doc-only', !itemModel(item));
  }
};

const renderAllBeforeVersionModel = renderAll;
renderAll = function () {
  renderAllBeforeVersionModel();
  const pill = document.querySelector('.app-header .pill');
  if (pill) pill.textContent = state.selectedRelease || '';
};

const renderToolsBeforeVersionModel = renderTools;
renderTools = function () {
  renderToolsBeforeVersionModel();
  const model = itemModel(currentVersionItem());
  if (state.noteMode !== 'change' || model?.pageId !== state.pageId) return;
  document.querySelectorAll('[data-tool-state]').forEach(button => button.onclick = () => {
    state.stateId = button.dataset.toolState;
    state.activeAnnotation = null;
    renderAll();
  });
};

function openVersionItemDialog(versionId, itemId = null) {
  if (!ensureEditorAccess(() => openVersionItemDialog(versionId, itemId)) || !abandonEditorIfNeeded()) return;
  const version = release(versionId);
  const item = version?.changes.find(entry => entry.id === itemId);
  if (!version) return;
  const model = itemModel(item);
  const dialog = document.createElement('dialog');
  dialog.className = 'version-item-dialog';
  dialog.innerHTML = `<form method="dialog" class="version-item-form">
    <h2>${item ? '编辑版本子项' : '添加版本子项'}</h2>
    <label>名称<input name="title" maxlength="100" required value="${escape(item?.title || '')}"></label>
    <label class="check-row"><input name="hasDocument" type="checkbox" ${item?.hasDocument === false ? '' : 'checked'}> 需求文档</label>
    <label class="check-row"><input name="hasModel" type="checkbox" ${model ? 'checked' : ''}> 页面原型</label>
    <div class="model-fields"><label>关联页面<select name="pageId"><option value="new">＋ 新建页面</option>${data.pages.filter(page => !page.hidden).map(page => `<option value="${escape(page.id)}" ${model?.pageId === page.id ? 'selected' : ''}>${escape(page.name)}</option>`).join('')}</select></label>
      <label class="new-page-field">新页面名称<input name="newPageName" maxlength="100" placeholder="输入页面名称"></label>
      <label class="new-page-field">导航分组<input name="newPageGroup" maxlength="100" value="交易页面"></label></div>
    <div class="dialog-actions">${item ? '<button type="button" class="delete-item" data-delete-item>删除子项</button>' : ''}<button type="button" data-close>取消</button><button type="submit" class="save">保存</button></div>
  </form>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const pageSelect = form.elements.pageId;
  if (!model) pageSelect.value = data.pages.find(page => !page.hidden)?.id || 'new';
  const sync = () => {
    const hasModel = form.elements.hasModel.checked;
    dialog.querySelector('.model-fields').hidden = !hasModel;
    const isNew = pageSelect.value === 'new';
    dialog.querySelectorAll('.new-page-field').forEach(field => field.hidden = !isNew);
  };
  form.elements.hasModel.onchange = sync;
  pageSelect.onchange = sync;
  form.querySelector('[data-close]').onclick = () => dialog.close();
  form.querySelector('[data-delete-item]')?.addEventListener('click', () => {
    dialog.close();
    openDeleteVersionItemDialog(version, item);
  });
  dialog.addEventListener('close', () => dialog.remove());
  form.onsubmit = async event => {
    event.preventDefault();
    const title = form.elements.title.value.trim();
    const hasDocument = form.elements.hasDocument.checked;
    const hasModel = form.elements.hasModel.checked;
    if (!title || (!hasDocument && !hasModel)) { showToast('请填写名称，并至少选择文档或原型'); return; }
    let pageId = pageSelect.value;
    let newPage = null;
    if (hasModel && pageId === 'new') {
      const pageName = form.elements.newPageName.value.trim();
      if (!pageName) { showToast('请填写新页面名称'); return; }
      pageId = nextPageId();
      newPage = { id: pageId, name: pageName, group: form.elements.newPageGroup.value.trim() || '未分组', __workspaceCustom: true,
        pageNote: { description: '', path: '', modules: [] }, states: [{ id: 'default', name: '默认态', stateNote: { rule: '' } }] };
      data.pages.push(newPage);
    }
    const target = item || { id: `item-${crypto.randomUUID()}`, __workspaceCustom: true, requirements: { sections: [] }, annotationIds: [] };
    const before = item ? { title: item.title, hasDocument: item.hasDocument, model: item.model, pageId: item.pageId, stateId: item.stateId } : null;
    target.title = title;
    target.hasDocument = hasDocument;
    target.documentKey ||= `document:${version.id}:${target.id}`;
    target.model = hasModel ? { pageId, stateId: model?.pageId === pageId ? model.stateId : (findPage(pageId)?.states[0]?.id || 'default') } : null;
    target.pageId = target.model?.pageId;
    target.stateId = target.model?.stateId;
    if (!item) version.changes.push(target);
    if (!await persistWorkspaceStructure()) {
      if (newPage) data.pages.splice(data.pages.indexOf(newPage), 1);
      if (!item) version.changes.splice(version.changes.indexOf(target), 1);
      else Object.assign(item, before);
      return;
    }
    dialog.close();
    state.tree = 'release';
    state.selectedRelease = version.id;
    state.selectedChange = target.id;
    state.noteMode = 'change';
    if (target.model) { state.pageId = target.model.pageId; state.stateId = target.model.stateId; }
    renderAll();
  };
  sync();
  dialog.showModal();
};

function openDeleteVersionItemDialog(version, item) {
  if (!item || !ensureEditorAccess(() => openDeleteVersionItemDialog(version, item))) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'version-item-dialog';
  dialog.innerHTML = `<form method="dialog" class="version-item-form"><h2>删除子项</h2>
    <p>确定从 ${escape(version.id)} 中删除「${escape(item.title || '未命名子项')}」？关联页面及已保存的内容不会被删除。</p>
    <div class="dialog-actions"><button type="button" data-close>取消</button><button type="submit" class="delete-item">删除子项</button></div></form>`;
  document.body.append(dialog);
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.addEventListener('close', () => dialog.remove());
  dialog.querySelector('form').onsubmit = async event => {
    event.preventDefault();
    const index = version.changes.indexOf(item);
    if (index < 0) { dialog.close(); return; }
    if (item.__workspaceCustom) version.changes.splice(index, 1);
    else item.hidden = true;
    if (!await persistWorkspaceStructure()) {
      if (item.__workspaceCustom) version.changes.splice(index, 0, item);
      else item.hidden = false;
      return;
    }
    dialog.close();
    if (state.selectedRelease === version.id && state.selectedChange === item.id) {
      state.selectedChange = null;
      state.noteMode = 'release';
      state.activeAnnotation = null;
    }
    renderAll();
  };
  dialog.showModal();
}
