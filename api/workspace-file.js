const path = require('node:path');
const { readFile } = require('../lib/cloud-versioned-workspace-store');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const file = String(req.query?.file || '');
    const content = await readFile(req.query?.version, file);
    const type = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.html': 'text/html' }[path.extname(file)] || 'text/plain';
    res.setHeader('Content-Type', `${type}; charset=utf-8`);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(content);
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
};
