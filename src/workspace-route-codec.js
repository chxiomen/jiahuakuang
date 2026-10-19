(function (root) {
  const encode = value => encodeURIComponent(value);
  function parse(hash) {
    if (!hash || hash === '#' || hash === '#/') return null;
    const [pathname, search = ''] = hash.replace(/^#/, '').split('?');
    const parts = pathname.split('/').filter(Boolean).map(decodeURIComponent);
    if (parts[0] !== 'versions' || !parts[1] || (parts.length !== 2 && (parts.length !== 4 || !['items', 'pages'].includes(parts[2])))) throw new Error('无法识别此工作台链接');
    return { version: parts[1], kind: parts[2] || 'outline', target: parts[3] || null, params: Object.fromEntries(new URLSearchParams(search)) };
  }
  function format({ version, kind = 'outline', target, params = {} }) {
    let result = `#/versions/${encode(version)}`;
    if (kind !== 'outline') result += `/${kind}/${encode(target)}`;
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ''));
    return result + (query.size ? '?' + query : '');
  }
  const api = { parse, format };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.WorkspaceRouteCodec = api;
})(typeof window === 'undefined' ? globalThis : window);
