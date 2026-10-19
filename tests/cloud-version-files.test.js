const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { once } = require('node:events');
const { withStore, readFile, fileKey } = require('../lib/cloud-versioned-workspace-store');

test('cloud versions preserve production text and isolate saved copies', async () => {
  const rows = new Map([['change:c-subscription-renewal:active', '<p>线上更新的正文</p>']]);
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== '/rest/v1/requirements') { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET') {
      const match = url.searchParams.get('key');
      const selected = match?.startsWith('eq.') ? [[match.slice(3), rows.get(match.slice(3))]].filter(([, html]) => html !== undefined) : [...rows];
      res.end(JSON.stringify(selected.map(([key, html]) => ({ key, html }))));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      for (const item of JSON.parse(body)) rows.set(item.key, item.html);
      res.end('[]');
      return;
    }
    res.writeHead(405).end();
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const priorUrl = process.env.SUPABASE_URL;
  const priorKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_URL = `http://127.0.0.1:${server.address().port}`;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_test';
  try {
    const original = await withStore(store => store.read('v7.6.5'));
    assert.equal(original.requirements['change:c-subscription-renewal:active'], '<p>线上更新的正文</p>');
    const created = await withStore(store => store.createVersion({ versionNumber: 'v7.6.6', name: '云端副本', fromVersion: 'v7.6.5' }), true);
    assert.equal(created.id, 'v7.6.6');
    assert.ok(rows.has(fileKey('index.json')));
    assert.match(await readFile('v7.6.6', 'prototypes/payment/page.js'), /payment/);
    await withStore(store => store.write('v7.6.6', [{ key: 'change:c-subscription-renewal:active', html: '<p>副本独立修改</p>' }]), true);
    const copy = await withStore(store => store.read('v7.6.6'));
    const unchanged = await withStore(store => store.read('v7.6.5'));
    assert.equal(copy.requirements['change:c-subscription-renewal:active'], '<p>副本独立修改</p>');
    assert.equal(unchanged.requirements['change:c-subscription-renewal:active'], '<p>线上更新的正文</p>');
  } finally {
    if (priorUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = priorUrl;
    if (priorKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = priorKey;
    server.close();
  }
});
