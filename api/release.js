// Vercel supplies this SHA for every Git deployment. It lets the release
// command verify that the public URL serves the commit it just pushed.
module.exports = (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ commit: process.env.VERCEL_GIT_COMMIT_SHA || null });
};
