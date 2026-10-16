const http = require('http');
const fs = require('fs');
const path = require('path');
const { VersionedWorkspaceStore } = require('./lib/versioned-workspace-store');

const root = __dirname;
// 本地服务只读写本地快照，永远不连接正式 Supabase。
// 如需用正式站内容更新本地快照，请显式运行 scripts/pull-production-data.js。
const dataFile = path.resolve(root, process.env.LOCAL_REQUIREMENTS_FILE || 'prd-data.json');
const port = Number(process.env.PORT || 5173);
const workspaceDirectory = path.resolve(process.env.WORKSPACE_DIRECTORY || (dataFile === path.join(root, 'prd-data.json') ? path.join(root, 'versions') : `${dataFile}.workspace-test`));
const versionStore = new VersionedWorkspaceStore(workspaceDirectory);

function readData() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch {
    return { requirements: {}, updatedAt: null };
  }
}

function send(res, status, body, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(type.startsWith('application/json') ? JSON.stringify(body) : body);
}

function collect(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  if (requestUrl.pathname === '/api/workspace' && req.method === 'GET') {
    try {
      if (!versionStore.exists) return send(res, 503, { error: '请先迁移版本文件：node --expose-internals scripts/migrate-version-files.js' });
      return send(res, 200, versionStore.bootstrap(requestUrl.searchParams.get('version')));
    } catch (error) { return send(res, 404, { error: error.message }); }
  }
  if (requestUrl.pathname === '/api/workspace/versions' && req.method === 'POST') {
    try { return send(res, 201, { version: versionStore.createVersion(await collect(req)) }); }
    catch (error) { return send(res, 400, { error: error.message }); }
  }
  if (requestUrl.pathname === '/api/requirements' && req.method === 'GET') {
    try {
      return send(res, 200, versionStore.exists ? versionStore.read(requestUrl.searchParams.get('version')) : { ...readData(), environment: 'local', dataSource: 'local-snapshot' });
    } catch (error) { return send(res, 404, { error: error.message }); }
  }

  if (requestUrl.pathname === '/api/requirements' && req.method === 'POST') {
    try {
      const payload = await collect(req);
      const writes = Array.isArray(payload.items) ? payload.items : [{ key: payload.key, html: payload.html }];
      if (!writes.length || writes.some(item => !item || typeof item.key !== 'string' || !item.key || typeof item.html !== 'string')) {
        return send(res, 400, { error: 'key and html are required for every item' });
      }
      if (versionStore.exists) {
        if (!requestUrl.searchParams.get('version')) return send(res, 400, { error: '写入必须指定 version，避免把内容写入其他版本。请刷新工作台后重试。' });
        const updatedAt = versionStore.write(requestUrl.searchParams.get('version'), writes);
        return send(res, 200, { ok: true, updatedAt });
      }
      const data = readData();
      data.requirements ||= {};
      for (const item of writes) data.requirements[item.key] = item.html;
      data.updatedAt = new Date().toISOString();
      fs.writeFileSync(dataFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
      return send(res, 200, { ok: true, updatedAt: data.updatedAt });
    } catch (error) {
      return send(res, 500, { error: error.message });
    }
  }

  const relativePath = requestUrl.pathname === '/' ? 'index.html' : decodeURIComponent(requestUrl.pathname.slice(1));
  const staticRoot = relativePath.startsWith('versions/') ? workspaceDirectory : root;
  const filePath = path.resolve(staticRoot, relativePath.startsWith('versions/') ? relativePath.slice('versions/'.length) : relativePath);
  if (!filePath.startsWith(`${staticRoot}${path.sep}`)) return send(res, 403, { error: 'forbidden' });

  fs.readFile(filePath, (error, content) => {
    if (error) return send(res, error.code === 'ENOENT' ? 404 : 500, { error: error.message });
    const ext = path.extname(filePath);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
    send(res, 200, content, types[ext] || 'application/octet-stream');
  });
});

server.listen(port, () => {
  console.log(`加画框-mini 工作台：http://localhost:${server.address().port}`);
});
