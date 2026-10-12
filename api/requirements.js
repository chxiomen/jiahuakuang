const { readRequirements, writeRequirements } = require('../lib/requirements-store');

function send(res, status, body) {
  res.status(status).json(body);
}

function isEditor(req) {
  const password = process.env.EDITOR_PASSWORD;
  return Boolean(password) && req.headers['x-editor-password'] === password;
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') return send(res, 200, await readRequirements());
    if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
    if (!isEditor(req)) return send(res, 401, { error: 'Editor password required' });

    const { key, html, items } = req.body || {};
    const writes = Array.isArray(items) ? items : [{ key, html }];
    if (!writes.length || writes.some(item => !item || typeof item.key !== 'string' || !item.key || typeof item.html !== 'string')) {
      return send(res, 400, { error: 'key and html are required for every item' });
    }
    return send(res, 200, { ok: true, updatedAt: await writeRequirements(writes) });
  } catch (error) {
    return send(res, 500, { error: error.message });
  }
};
