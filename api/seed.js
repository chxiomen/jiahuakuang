const initialData = require('../prd-data.json');
const { writeRequirements } = require('../lib/requirements-store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
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
