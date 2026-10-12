const baseUrl = () => (process.env.SUPABASE_URL || '').replace(/\/$/, '');

function config() {
  const url = baseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase environment variables are not configured');
  return { url, key };
}

async function request(path, options = {}) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      ...(key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` }),
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`Supabase request failed (${response.status})`);
  return response;
}

async function readRequirements() {
  const response = await request('requirements?select=key,html,updated_at');
  const rows = await response.json();
  return {
    requirements: Object.fromEntries(rows.map(({ key, html }) => [key, html])),
    updatedAt: rows.reduce((latest, row) => latest && latest > row.updated_at ? latest : row.updated_at, null)
  };
}

async function writeRequirements(items) {
  const now = new Date().toISOString();
  await request('requirements?on_conflict=key', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify(items.map(({ key, html }) => ({ key, html, updated_at: now })))
  });
  return now;
}

module.exports = { readRequirements, writeRequirements };
