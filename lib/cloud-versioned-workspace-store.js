const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { VersionedWorkspaceStore } = require('./versioned-workspace-store');
const { request, writeRequirements } = require('./requirements-store');

const sourceDirectory = path.resolve(process.cwd(), 'versions');
const prefix = 'workspace:file:v3:';
const fileKey = relative => prefix + encodeURIComponent(relative.replace(/\\/g, '/'));
const parse = file => JSON.parse(fs.readFileSync(file, 'utf8'));

function safeFile(root, relative) {
  if (!relative || path.isAbsolute(relative) || relative.split(/[\\/]/).includes('..')) throw new Error('Invalid workspace file path');
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) throw new Error('Invalid workspace file path');
  return file;
}

async function allRows() {
  const response = await request('requirements?select=key,html');
  return response.json();
}

async function oneRow(key) {
  const response = await request(`requirements?select=html&key=eq.${encodeURIComponent(key)}`);
  const rows = await response.json();
  return rows[0]?.html;
}

function filesIn(root) {
  const found = new Map();
  function visit(directory) {
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, item.name);
      if (item.isDirectory()) visit(file);
      else if (item.isFile()) found.set(path.relative(root, file).replace(/\\/g, '/'), fs.readFileSync(file, 'utf8'));
    }
  }
  visit(root);
  return found;
}

async function withStore(operation, writable = false) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-cloud-'));
  try {
    fs.cpSync(sourceDirectory, directory, { recursive: true });
    const rows = await allRows();
    const overlays = new Set();
    for (const row of rows) {
      if (!row.key.startsWith(prefix)) continue;
      const relative = decodeURIComponent(row.key.slice(prefix.length));
      const file = safeFile(directory, relative);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, row.html, 'utf8');
      overlays.add(relative);
    }
    const store = new VersionedWorkspaceStore(directory);
    // Until a document is first saved in the new store, the existing production
    // requirement row remains authoritative for the original active version.
    const original = store.resolve('v7.6.5');
    if (original) {
      const manifest = store.manifest(original.id);
      const legacy = new Map(rows.filter(row => !row.key.startsWith(prefix)).map(row => [row.key, row.html]));
      for (const entry of manifest.documents) {
        const relative = `${original.directory}/${entry.file}`;
        if (overlays.has(relative) || !legacy.has(entry.key)) continue;
        fs.writeFileSync(safeFile(directory, relative), legacy.get(entry.key), 'utf8');
      }
    }
    const before = writable ? filesIn(directory) : null;
    const result = await operation(store);
    if (writable) {
      const after = filesIn(directory);
      const writes = [...after].filter(([file, content]) => before.get(file) !== content).map(([file, html]) => ({ key: fileKey(file), html }));
      if (writes.length) await writeRequirements(writes);
    }
    return result;
  } finally {
    if (!directory.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(directory).startsWith('workspace-cloud-')) throw new Error('Invalid temporary workspace directory');
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

async function readFile(reference, relative) {
  const index = JSON.parse(await oneRow(fileKey('index.json')) || fs.readFileSync(path.join(sourceDirectory, 'index.json'), 'utf8'));
  const version = index.versions.find(item => [item.id, item.versionNumber, ...(item.aliases || [])].some(alias => alias?.toLowerCase() === String(reference).toLowerCase()));
  if (!version || version.hidden) throw new Error('版本不存在');
  const file = `${version.directory}/${relative}`;
  const fallback = safeFile(sourceDirectory, file);
  const overlay = await oneRow(fileKey(file));
  if (overlay !== undefined) return overlay;
  return fs.readFileSync(fallback, 'utf8');
}

module.exports = { withStore, readFile, fileKey };
