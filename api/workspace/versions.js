const { withStore } = require('../../lib/cloud-versioned-workspace-store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.EDITOR_PASSWORD || req.headers['x-editor-password'] !== process.env.EDITOR_PASSWORD) return res.status(401).json({ error: 'Editor password required' });
  try {
    const version = await withStore(store => store.createVersion(req.body || {}), true);
    return res.status(201).json({ version });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};
