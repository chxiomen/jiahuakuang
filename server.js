const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const dataFile = path.join(root, 'prd-data.json');
const port = Number(process.env.PORT || 5173);

function readData() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch {
    return { requirements: {} };
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

  if (requestUrl.pathname === '/api/requirements' && req.method === 'GET') {
    return send(res, 200, readData());
  }

  if (requestUrl.pathname === '/api/requirements' && req.method === 'POST') {
    try {
      const payload = await collect(req);
      if (!payload.key || typeof payload.html !== 'string') {
        return send(res, 400, { error: 'key and html are required' });
      }
      const data = readData();
      data.requirements ||= {};
      data.requirements[payload.key] = payload.html;
      data.updatedAt = new Date().toISOString();
      fs.writeFileSync(dataFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
      return send(res, 200, { ok: true, updatedAt: data.updatedAt });
    } catch (error) {
      return send(res, 500, { error: error.message });
    }
  }

  const relativePath = requestUrl.pathname === '/' ? 'index.html' : decodeURIComponent(requestUrl.pathname.slice(1));
  const filePath = path.resolve(root, relativePath);
  if (!filePath.startsWith(`${root}${path.sep}`)) return send(res, 403, { error: 'forbidden' });

  fs.readFile(filePath, (error, content) => {
    if (error) return send(res, error.code === 'ENOENT' ? 404 : 500, { error: error.message });
    const ext = path.extname(filePath);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png' };
    send(res, 200, content, types[ext] || 'application/octet-stream');
  });
});

server.listen(port, () => {
  console.log(`加画框-mini 工作台：http://localhost:${port}`);
});
