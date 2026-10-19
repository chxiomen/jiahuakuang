const fs = require('node:fs');
const path = require('node:path');
const { withStore } = require('../lib/cloud-versioned-workspace-store');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const bootstrap = await withStore(store => store.bootstrap(req.query?.version));
    const record = bootstrap.versions.find(item => item.id === bootstrap.activeVersion);
    const bundled = path.join(process.cwd(), 'versions', record.directory);
    bootstrap.basePath = fs.existsSync(bundled)
      ? `/versions/${encodeURIComponent(record.directory)}/`
      : `/api/workspace-file?version=${encodeURIComponent(bootstrap.activeVersion)}&file=`;
    bootstrap.initialData.environment = 'production';
    bootstrap.initialData.dataSource = 'supabase-version-files';
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(bootstrap);
  } catch (error) {
    return res.status(404).json({ error: error.message });
  }
};
