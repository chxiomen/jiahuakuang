const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const copy = value => JSON.parse(JSON.stringify(value));
const safeName = value => ['.', '..'].includes(String(value)) ? String(value).replace(/\./g, '%2E') : encodeURIComponent(String(value));
const parse = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function atomicWrite(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(temporary, content, 'utf8');
  fs.renameSync(temporary, file);
}
const writeJson = (file, value) => atomicWrite(file, `${JSON.stringify(value, null, 2)}\n`);

class VersionedWorkspaceStore {
  constructor(directory) {
    this.directory = path.resolve(directory);
    this.indexFile = path.join(this.directory, 'index.json');
  }
  get exists() { return fs.existsSync(this.indexFile); }
  index() { return parse(this.indexFile); }
  resolve(reference) {
    const versions = this.index().versions;
    if (!reference) return versions.find(version => !version.hidden);
    return versions.find(version => [version.id, version.versionNumber, ...(version.aliases || [])].some(alias => alias?.toLowerCase() === String(reference).toLowerCase()));
  }
  versionPath(id) {
    const record = this.resolve(id);
    if (!record) throw new Error('版本不存在');
    const target = path.resolve(this.directory, record.directory);
    if (!target.startsWith(this.directory + path.sep)) throw new Error('Invalid version directory');
    return target;
  }
  manifest(id) { return parse(path.join(this.versionPath(id), 'manifest.json')); }
  pages(id) {
    const directory = this.versionPath(id);
    return this.manifest(id).pages.map(page => ({ ...page, states: page.stateFile ? parse(path.join(directory, page.stateFile)) : page.states }));
  }
  structure(activeId) {
    const index = this.index();
    return {
      schemaVersion: 3,
      documentTitle: this.manifest(activeId).documentTitle || index.documentTitle,
      pages: this.pages(activeId),
      releases: index.versions.map(record => {
        const manifest = this.manifest(record.id);
        return { ...record, custom: true, changes: manifest.changes };
      })
    };
  }
  read(id) {
    const version = this.resolve(id);
    if (!version) throw new Error('版本不存在');
    const manifest = this.manifest(version.id);
    const directory = this.versionPath(version.id);
    const requirements = {};
    for (const entry of manifest.documents) {
      const file = path.resolve(directory, entry.file);
      if (!file.startsWith(directory + path.sep)) throw new Error('Invalid document path');
      requirements[entry.key] = fs.readFileSync(file, 'utf8');
    }
    requirements['workspace:structure:v2'] = JSON.stringify(this.structure(version.id));
    return { requirements, updatedAt: manifest.updatedAt || null, environment: 'local', dataSource: 'version-files', versionId: version.id };
  }
  bootstrap(reference) {
    const active = this.resolve(reference);
    if (!active || active.hidden) throw new Error('版本不存在或已删除');
    const manifest = this.manifest(active.id);
    const catalog = parse(path.join(this.versionPath(active.id), 'catalog.json'));
    const activeRelease = catalog.releases[0];
    catalog.pages = this.pages(active.id);
    catalog.mineStateCatalog = catalog.pages.find(page => page.id === 'mine')?.states.map(state => state.prototype).filter(Boolean) || catalog.mineStateCatalog || [];
    catalog.releases = this.structure(active.id).releases.map(record => {
      if (record.id !== active.id) return record;
      const configured = new Map(activeRelease.changes.map(item => [item.id, item]));
      return { ...activeRelease, ...record, changes: record.changes.map(item => ({ ...configured.get(item.id), ...item })) };
    });
    return { activeVersion: active.id, versions: this.index().versions, catalog, prototype: manifest.prototype, assetRefs: manifest.assetRefs || {}, basePath: `/versions/${encodeURIComponent(active.directory)}/`, initialData: this.read(active.id) };
  }
  documentPath(key, manifest) {
    if (key.startsWith('model-text:')) {
      const [, , itemId, pageId] = key.split(':');
      return `prototypes/${safeName(pageId)}/text/${safeName(itemId)}/${safeName(key)}.json`;
    }
    if (key.startsWith('release:')) return `documents/outline/${safeName(key)}.html`;
    const item = manifest.changes.find(item => key === item.documentKey || key.startsWith(item.documentKey + ':') || key.startsWith(`change:${item.id}`));
    return `documents/${safeName(item?.id || 'unassigned')}/${safeName(key)}.html`;
  }
  writeDocument(manifest, key, html) {
    let entry = manifest.documents.find(entry => entry.key === key);
    if (!entry) { entry = { key, file: this.documentPath(key, manifest) }; manifest.documents.push(entry); }
    const file = path.resolve(this.versionPath(manifest.id), entry.file);
    if (!file.startsWith(this.versionPath(manifest.id) + path.sep)) throw new Error('Invalid document path');
    atomicWrite(file, html);
  }
  writeStructure(activeId, structure) {
    if (!Array.isArray(structure.releases) || !Array.isArray(structure.pages)) throw new Error('无效的版本目录');
    const index = this.index();
    for (const record of structure.releases) {
      const existing = index.versions.find(version => version.id === record.id);
      if (!existing) throw new Error('请通过新版本入口创建版本');
      const number = String(record.versionNumber || record.id).trim();
      if (!/^[\w.-]+$/.test(number)) throw new Error('版本号格式不正确');
      if (index.versions.some(other => other.id !== existing.id && [other.id, other.versionNumber, ...(other.aliases || [])].some(alias => alias?.toLowerCase() === number.toLowerCase()))) throw new Error('版本号或旧链接已被其他版本使用');
    }
    for (const record of structure.releases) {
      const existing = index.versions.find(version => version.id === record.id);
      const manifest = this.manifest(existing.id);
      const number = String(record.versionNumber || record.id).trim();
      const aliases = [...new Set([...(existing.aliases || []), existing.versionNumber, existing.id])].filter(value => value && value !== number);
      Object.assign(existing, { versionNumber: number, name: record.name, hidden: Boolean(record.hidden), aliases });
      Object.assign(manifest, existing);
      if (existing.id === activeId) {
        manifest.documentTitle = structure.documentTitle || manifest.documentTitle || index.documentTitle;
        manifest.pages = copy(structure.pages).map(page => {
          const stateFile = `prototypes/${safeName(page.id)}/states.json`;
          const previous = manifest.pages.find(previous => previous.id === page.id);
          const priorStates = previous?.stateFile ? parse(path.join(this.versionPath(existing.id), previous.stateFile)) : previous?.states || [];
          const states = (page.states || priorStates).map(state => ({ ...priorStates.find(prior => prior.id === state.id), ...state }));
          writeJson(path.join(this.versionPath(existing.id), stateFile), states);
          return { ...previous, ...page, states, stateFile };
        });
        manifest.changes = copy(record.changes || []);
        this.ensureCustomPages(manifest);
      }
      writeJson(path.join(this.versionPath(existing.id), 'manifest.json'), manifest);
    }
    writeJson(this.indexFile, index);
  }
  ensureCustomPages(manifest) {
    for (const page of manifest.pages) {
      if (manifest.prototype.pages[page.id]) continue;
      const directory = `prototypes/${safeName(page.id)}`;
      const file = `${directory}/page.js`;
      const renderer = `window.workspacePageRenderers[${JSON.stringify(page.id)}] = function () { return '<article class="custom-prototype"><h1>' + escape(page().name) + '</h1><p>' + escape(pageState().name) + '</p><p>在此页面的 page.js 和 page.css 中定义原型布局与交互。</p></article>'; };\n`;
      atomicWrite(path.join(this.versionPath(manifest.id), file), renderer);
      atomicWrite(path.join(this.versionPath(manifest.id), directory, 'page.css'), '.custom-prototype{padding:24px}\n');
      manifest.prototype.pages[page.id] = { script: file, style: `${directory}/page.css`, hideTabBar: true };
      manifest.prototype.scripts.splice(0, 0, file);
      manifest.prototype.styles.push(`${directory}/page.css`);
    }
  }
  write(id, writes) {
    const active = this.resolve(id);
    if (!active) throw new Error('版本不存在');
    const structure = writes.find(item => item.key === 'workspace:structure:v2');
    if (structure) this.writeStructure(active.id, JSON.parse(structure.html));
    const manifest = this.manifest(active.id);
    for (const item of writes) {
      if (item.key !== 'workspace:structure:v2') this.writeDocument(manifest, item.key, item.html);
    }
    manifest.updatedAt = new Date().toISOString();
    writeJson(path.join(this.versionPath(active.id), 'manifest.json'), manifest);
    return manifest.updatedAt;
  }
  createVersion({ versionNumber, name, fromVersion, empty = false }) {
    if (!/^[\w.-]+$/.test(versionNumber || '') || !name?.trim()) throw new Error('请填写有效的版本号和名称');
    if (this.resolve(versionNumber)) throw new Error('版本号或旧链接已存在');
    const source = this.resolve(fromVersion);
    if (!source) throw new Error('复制来源不存在');
    const index = this.index();
    const sourceManifest = this.manifest(source.id);
    const record = { id: versionNumber, versionNumber, name: name.trim(), directory: safeName(versionNumber), aliases: [], hidden: false, custom: true };
    const target = path.join(this.directory, record.directory);
    if (fs.existsSync(target)) throw new Error('目标版本目录已存在');
    fs.mkdirSync(target, { recursive: true });
    fs.cpSync(path.join(this.versionPath(source.id), 'prototypes'), path.join(target, 'prototypes'), { recursive: true });
    fs.copyFileSync(path.join(this.versionPath(source.id), 'catalog.json'), path.join(target, 'catalog.json'));
    for (const file of sourceManifest.prototype.documentScripts || []) {
      if (file.startsWith('prototypes/')) continue;
      fs.mkdirSync(path.dirname(path.join(target, file)), { recursive: true });
      fs.copyFileSync(path.join(this.versionPath(source.id), file), path.join(target, file));
    }
    try {
      const manifest = { ...copy(sourceManifest), ...record, clonedFrom: source.id, documents: [], updatedAt: new Date().toISOString() };
      const catalog = parse(path.join(target, 'catalog.json'));
      Object.assign(catalog.releases[0], { id: record.id, name: record.name, versionNumber });
      if (empty) { manifest.changes = []; catalog.releases[0].changes = []; delete catalog.releases[0].requirements; }
      // Store the descriptor before resolving versionPath, then remove it on failure.
      index.versions.push(record);
      writeJson(this.indexFile, index);
      writeJson(path.join(target, 'catalog.json'), catalog);
      if (!empty) {
        for (const entry of sourceManifest.documents) {
          let key = entry.key;
          if (key.startsWith(`model-text:${source.id}:`)) key = key.replace(`model-text:${source.id}:`, `model-text:${record.id}:`);
          if (key === `release:${source.id}`) key = `release:${record.id}`;
          this.writeDocument(manifest, key, fs.readFileSync(path.join(this.versionPath(source.id), entry.file), 'utf8'));
        }
        const oldOutline = sourceManifest.documents.find(entry => entry.key.startsWith('release:'));
        if (oldOutline && !manifest.documents.some(entry => entry.key === `release:${record.id}`)) this.writeDocument(manifest, `release:${record.id}`, fs.readFileSync(path.join(this.versionPath(source.id), oldOutline.file), 'utf8'));
      }
      writeJson(path.join(target, 'manifest.json'), manifest);
      return record;
    } catch (error) {
      index.versions = index.versions.filter(version => version.id !== record.id);
      writeJson(this.indexFile, index);
      // Keep the failed copy recoverable, rather than recursively deleting user files.
      fs.renameSync(target, target + `.failed-${Date.now()}.backup`);
      throw error;
    }
  }
}

module.exports = { VersionedWorkspaceStore, safeName, writeJson, atomicWrite };
