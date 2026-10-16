// Content-address existing shared images so later replacements cannot change
// a historical prototype. New page-local assets can live inside its directory.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { VersionedWorkspaceStore, writeJson, atomicWrite } = require('../lib/versioned-workspace-store');
const root = path.resolve(__dirname, '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'versions/index.json'), 'utf8'));
const store = new VersionedWorkspaceStore(path.join(root, 'versions'));
const refs = {};
for (const entry of fs.readdirSync(path.join(root, 'assets'), { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const source = path.join(root, 'assets', entry.name);
  const hash = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
  const relative = `assets/snapshots/${hash}/${entry.name}`;
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.copyFileSync(source, target); }
  refs[`assets/${entry.name}`] = '/' + relative;
}
for (const version of index.versions) {
  const directory = path.join(root, 'versions', version.directory);
  const manifestFile = path.join(directory, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  store.ensureCustomPages(manifest);
  // Never overwrite the pin belonging to an existing snapshot.
  manifest.assetRefs = { ...refs, ...(manifest.assetRefs || {}) };
  for (const file of manifest.prototype.styles) {
    const target = path.join(directory, file);
    let css = fs.readFileSync(target, 'utf8');
    for (const [source, pinned] of Object.entries(manifest.assetRefs)) {
      css = css.replaceAll(`url("${source}")`, `url("${pinned}")`).replaceAll(`url('${source}')`, `url('${pinned}')`).replaceAll(`url(${source})`, `url(${pinned})`);
    }
    atomicWrite(target, css);
  }
  writeJson(manifestFile, manifest);
}
console.log(`已为 ${index.versions.length} 个版本固定 ${Object.keys(refs).length} 个本地图片引用`);
