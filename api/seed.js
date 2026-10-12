const initialData = require('../prd-data.json');
const { writeRequirements } = require('../lib/requirements-store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // 绝不允许因一次普通发布就重置正式正文；只有显式开启时才允许人工初始化。
  if (process.env.ALLOW_REQUIREMENTS_SEED !== 'true') {
    return res.status(403).json({ error: 'Requirements seeding is disabled' });
  }
  if (!process.env.EDITOR_PASSWORD || req.headers['x-editor-password'] !== process.env.EDITOR_PASSWORD) {
    return res.status(401).json({ error: 'Editor password required' });
  }
  try {
    const requirements = Object.entries(initialData.requirements || {}).map(([key, html]) => ({ key, html }));
    const updatedAt = await writeRequirements(requirements);
    return res.status(200).json({ ok: true, count: requirements.length, updatedAt });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
