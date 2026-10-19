const { withStore } = require('../lib/cloud-versioned-workspace-store');

function send(res, status, body) {
  res.status(status).json(body);
}

function isEditor(req) {
  const password = process.env.EDITOR_PASSWORD;
  return Boolean(password) && req.headers['x-editor-password'] === password;
}

module.exports = async (req, res) => {
  try {
    const version = req.query?.version;
    if (req.method === 'GET') {
      const data = await withStore(store => store.read(version));
      return send(res, 200, { ...data, environment: 'production', dataSource: 'supabase-version-files' });
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    if (!isEditor(req)) return send(res, 401, { error: 'Editor password required' });

    const { key, html, items } = req.body || {};
    const writes = Array.isArray(items) ? items : [{ key, html }];
    if (!writes.length || writes.some(item => !item || typeof item.key !== 'string' || !item.key || typeof item.html !== 'string')) {
      return send(res, 400, { error: 'key and html are required for every item' });
    }
    if (!version) return send(res, 400, { error: '写入必须指定 version' });
    const updatedAt = await withStore(store => store.write(version, writes), true);
    return send(res, 200, { ok: true, updatedAt });
  } catch (error) {
    return send(res, 500, { error: error.message });
  }
};
