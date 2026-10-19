const WorkspaceAssets = (() => {
  const refs = workspaceBootstrap.assetRefs || {};
  function url(source) {
    const key = source.replace(/^\//, '');
    return refs[key] || (/^(?:https?:|data:|\/)/.test(source) ? source : workspaceBootstrap.basePath + source.split('/').map(encodeURIComponent).join('/'));
  }
  function html(markup) {
    for (const [source, target] of Object.entries(refs)) {
      const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      markup = markup.replace(new RegExp('(?<=["\'(=\\s])/?' + escaped + '(?=["\')\\s>])', 'g'), target);
    }
    return markup;
  }
  const originalScreenHtml = screenHtml;
  screenHtml = function () { return html(originalScreenHtml()); };
  const originalRenderNotes = renderNotes;
  renderNotes = function () {
    const result = originalRenderNotes();
    document.querySelectorAll('#notes img[src]').forEach(image => {
      const source = image.getAttribute('src').replace(/^\//, '');
      if (refs[source]) image.setAttribute('src', refs[source]);
    });
    return result;
  };
  return { url, html };
})();
