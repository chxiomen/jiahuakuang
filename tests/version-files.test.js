const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const { VersionedWorkspaceStore } = require('../lib/versioned-workspace-store');
const routes = require('../src/workspace-route-codec');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-version-test-'));
  fs.cpSync(path.join(__dirname, '../versions'), directory, { recursive: true });
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return new VersionedWorkspaceStore(directory);
}

test('legacy document keys remain addressable, including blank and historical variants', t => {
  const store = fixture(t);
  const original = JSON.parse(fs.readFileSync(path.join(__dirname, '../prd-data.json'), 'utf8')).requirements;
  const recovered = {};
  for (const record of store.index().versions) Object.assign(recovered, store.read(record.id).requirements);
  for (const key of Object.keys(original)) if (key !== 'workspace:structure:v2') assert.equal(typeof recovered[key], 'string', key);
});

test('cloning freezes independent templates, styles, documents, and model text', t => {
  const store = fixture(t);
  const source = store.resolve();
  const sourceData = store.read(source.id);
  const clone = store.createVersion({ versionNumber: 'v-isolation-test', name: '隔离测试', fromVersion: source.id });
  const key = Object.keys(sourceData.requirements).find(key => key.startsWith('change:'));
  assert.equal(store.read(clone.id).requirements[key], sourceData.requirements[key]);
  store.write(clone.id, [{ key, html: 'only the cloned document changed' }]);
  assert.equal(store.read(source.id).requirements[key], sourceData.requirements[key]);
  const modelKey = Object.keys(sourceData.requirements).find(key => key.startsWith('model-text:'));
  if (modelKey) {
    const clonedModelKey = modelKey.replace(`model-text:${source.id}:`, `model-text:${clone.id}:`);
    assert.equal(store.read(clone.id).requirements[clonedModelKey], sourceData.requirements[modelKey]);
    store.write(clone.id, [{ key: clonedModelKey, html: '{"test":"cloned copy"}' }]);
    assert.equal(store.read(source.id).requirements[modelKey], sourceData.requirements[modelKey]);
  }
  for (const file of ['prototypes/payment/page.js', 'prototypes/payment/page.css', 'documents/renderers.js']) {
    const sourceFile = path.join(store.versionPath(source.id), file);
    const cloneFile = path.join(store.versionPath(clone.id), file);
    const original = fs.readFileSync(sourceFile, 'utf8');
    assert.equal(fs.readFileSync(cloneFile, 'utf8'), original);
    fs.appendFileSync(cloneFile, '\n/* clone-only change */\n');
    assert.equal(fs.readFileSync(sourceFile, 'utf8'), original);
  }
});

test('rename keeps stable identity, old link aliases and per-version document title', t => {
  const store = fixture(t);
  const source = store.resolve();
  const clone = store.createVersion({ versionNumber: 'v-rename-test', name: '重命名', fromVersion: source.id });
  const structure = store.structure(clone.id);
  // Existing browser editors omit states for built-in pages during metadata saves.
  structure.pages = structure.pages.map(page => ({ id: page.id, name: page.name, group: page.group, hidden: page.hidden, custom: false }));
  structure.releases.find(version => version.id === clone.id).versionNumber = 'v-renamed-test';
  structure.documentTitle = '仅此版本的标题';
  const sourceTitle = store.structure(source.id).documentTitle;
  store.write(clone.id, [{ key: 'workspace:structure:v2', html: JSON.stringify(structure) }]);
  assert.equal(store.resolve('v-rename-test').id, clone.id);
  assert.equal(store.resolve('v-renamed-test').id, clone.id);
  assert.equal(store.structure(source.id).documentTitle, sourceTitle);
  assert.equal(store.structure(clone.id).documentTitle, '仅此版本的标题');
});

test('new page generates separate editable source, style and state files', t => {
  const store = fixture(t);
  const source = store.resolve();
  const clone = store.createVersion({ versionNumber: 'v-page-test', name: '页面测试', fromVersion: source.id, empty: true });
  assert.equal(store.manifest(clone.id).changes.length, 0);
  assert.equal(Object.keys(store.read(clone.id).requirements).length, 1);
  const structure = store.structure(clone.id);
  structure.pages.push({ id: 'independent-page', name: '独立页面', group: '新分组', custom: true, pageNote: { modules: [] }, states: [{ id: 'default', name: '默认态' }] });
  store.write(clone.id, [{ key: 'workspace:structure:v2', html: JSON.stringify(structure) }]);
  assert.ok(fs.existsSync(path.join(store.versionPath(clone.id), 'prototypes/independent-page/page.js')));
  assert.ok(fs.existsSync(path.join(store.versionPath(clone.id), 'prototypes/independent-page/states.json')));
  assert.equal(store.bootstrap(clone.id).catalog.pages.find(page => page.id === 'independent-page').states[0].id, 'default');
  assert.equal(store.bootstrap(source.id).catalog.pages.some(page => page.id === 'independent-page'), false);
});

test('routes round-trip version, item, page and state without losing identifiers', () => {
  for (const route of [
    { version: 'v7.6.5', kind: 'outline', target: null, params: {} },
    { version: 'v7.6.5', kind: 'items', target: 'item:中文 / test', params: {} },
    { version: 'v7.6.5', kind: 'pages', target: 'payment', params: { state: 'subscription-renewing', member: 'svip' } }
  ]) assert.deepEqual(routes.parse(routes.format(route)), route);
  assert.throws(() => routes.parse('#/unknown/payment'), /无法识别/);
});

test('HTML image pins handle both relative forms without rewriting external URLs', () => {
  const context = vm.createContext({
    workspaceBootstrap: { assetRefs: { 'assets/example.png': '/assets/snapshots/hash/example.png' }, basePath: '/versions/test/' },
    document: { querySelectorAll: () => [] },
    screenHtml: () => '<img src="assets/example.png"><img src="/assets/example.png"><img src="https://example.org/assets/example.png">',
    renderNotes() {}
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/workspace-assets.js'), 'utf8'), context);
  const html = vm.runInContext('screenHtml()', context);
  assert.equal(html, '<img src="/assets/snapshots/hash/example.png"><img src="/assets/snapshots/hash/example.png"><img src="https://example.org/assets/example.png">');
});

test('explicit production import updates only the selected local version and preserves its prototype', t => {
  const store = fixture(t);
  const first = store.resolve();
  const clone = store.createVersion({ versionNumber: 'v-import-unaffected', name: '保持独立', fromVersion: first.id });
  const payload = JSON.parse(fs.readFileSync(path.join(__dirname, '../prd-data.json'), 'utf8'));
  const key = Object.keys(payload.requirements).find(key => key.startsWith('change:'));
  const before = store.read(clone.id).requirements[key];
  const template = fs.readFileSync(path.join(store.versionPath(first.id), 'prototypes/payment/page.js'), 'utf8');
  payload.requirements[key] += '<p>线上导入测试</p>';
  const result = spawnSync(process.execPath, ['scripts/pull-production-data.js', '--stdin', '--version=' + first.versionNumber], { cwd: path.join(__dirname, '..'), env: { ...process.env, WORKSPACE_DIRECTORY: store.directory }, input: JSON.stringify(payload), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(store.read(first.id).requirements[key], payload.requirements[key]);
  assert.equal(store.read(clone.id).requirements[key], before);
  assert.equal(fs.readFileSync(path.join(store.versionPath(first.id), 'prototypes/payment/page.js'), 'utf8'), template);
});

test('HTTP writes require an explicit version and serve its separate snapshot files', { timeout: 15000 }, async t => {
  const store = fixture(t);
  const first = store.resolve();
  const child = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: '0', WORKSPACE_DIRECTORY: store.directory }, stdio: ['ignore','pipe','pipe'] });
  t.after(async () => { child.kill(); if (child.exitCode === null) await once(child, 'exit'); });
  const [output] = await once(child.stdout, 'data');
  const url = output.toString().match(/http:\/\/localhost:\d+/)[0];
  const bootstrapResponse = await fetch(url + '/api/workspace?version=' + first.versionNumber);
  assert.equal(bootstrapResponse.status, 200);
  const bootstrap = await bootstrapResponse.json();
  assert.equal(bootstrap.activeVersion, first.id);
  const pageResponse = await fetch(url + bootstrap.basePath + 'prototypes/payment/page.js');
  assert.equal(pageResponse.status, 200);
  assert.match(await pageResponse.text(), /function paymentHtml/);
  const rejected = await fetch(url + '/api/requirements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'test:ambiguous', html: 'must not be saved' }) });
  assert.equal(rejected.status, 400);
  assert.equal(store.read(first.id).requirements['test:ambiguous'], undefined);
  const result = await fetch(url + '/api/requirements?version=' + encodeURIComponent(first.id), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: 'test:scoped', html: 'saved only here' }) });
  assert.equal(result.status, 200);
  assert.equal(store.read(first.id).requirements['test:scoped'], 'saved only here');
});
