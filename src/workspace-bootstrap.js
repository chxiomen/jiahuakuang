// A version's prototype code is loaded once into this document. Changing
// versions reloads the shell, giving each snapshot its own globals and CSS.
(async function bootstrapWorkspace() {
  const asset = file => file.split('/').map(encodeURIComponent).join('/');
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`无法加载 ${url}`));
      document.body.append(script);
    });
  }
  function loadStyle(url) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = url;
      link.onload = resolve;
      link.onerror = () => reject(new Error(`无法加载样式 ${url}`));
      document.head.append(link);
    });
  }
  try {
    let route = WorkspaceRouteCodec.parse(location.hash);
    if (!route && localStorage.getItem('workspace:last-route:v3')) {
      try { route = WorkspaceRouteCodec.parse(localStorage.getItem('workspace:last-route:v3')); } catch { /* ignore obsolete history */ }
    }
    const response = await fetch('/api/workspace' + (route ? '?version=' + encodeURIComponent(route.version) : ''), { cache: 'no-store' });
    if (!response.ok) throw new Error((await response.json()).error || '无法加载版本目录');
    window.workspaceBootstrap = await response.json();
    window.workspaceInitialRoute = route;
    window.workspacePageRenderers = {};
    window.workspacePageBindings = {};
    const originalFetch = window.fetch.bind(window);
    // Existing document/review editors keep their key format. The transport
    // scopes every read/write to the selected version's independent files.
    window.fetch = (resource, options) => {
      if (typeof resource === 'string') {
        const url = new URL(resource, location.href);
        if (url.origin === location.origin && url.pathname === '/api/requirements') {
          url.searchParams.set('version', workspaceBootstrap.activeVersion);
          resource = url.pathname + url.search;
        }
      }
      return originalFetch(resource, options);
    };
    await loadScript('/src/catalog.js');
    await loadScript('/src/workspace-ui.js');
    // Restore the shell before layering the version's frozen styles over it.
    await Promise.all(workspaceBootstrap.prototype.styles.map(file => loadStyle(workspaceBootstrap.basePath + asset(file))));
    await loadStyle('/styles/version-model.css');
    const loadPrototype = file => loadScript(workspaceBootstrap.basePath + asset(file));
    const renderFile = 'prototypes/shared/render.js';
    const revisionFile = 'prototypes/shared/revisions.js';
    for (const file of workspaceBootstrap.prototype.scripts.filter(file => file !== renderFile && file !== revisionFile)) await loadPrototype(file);
    await loadPrototype(renderFile);
    await loadScript('/src/requirement-renderer.js');
    await loadScript('/src/workspace-structure.js');
    await loadScript('/src/requirements-view.js');
    for (const file of workspaceBootstrap.prototype.documentScripts || []) await loadPrototype(file);
    await loadScript('/lib/markdown-it-14.1.0.min.js');
    await loadScript('/editor-controller.js');
    await loadScript('/src/version-model.js');
    await loadScript('/src/model-text-editor.js');
    await loadScript('/src/revision-review.js');
    await loadScript('/src/revision-review-workflow.js');
    await loadPrototype(revisionFile);
    await loadScript('/src/workspace-assets.js');
    await loadScript('/src/workspace-router.js');
    await loadScript('/src/workspace-start.js');
    await startWorkspace();
  } catch (error) {
    const main = document.querySelector('#workspace');
    main.replaceChildren();
    const panel = document.createElement('article');
    panel.className = 'panel workspace-load-error';
    const title = document.createElement('h2'); title.textContent = '页面暂时无法打开';
    const detail = document.createElement('p'); detail.textContent = error.message;
    const back = document.createElement('a'); back.href = '/?resetRoute=1'; back.textContent = '返回版本目录';
    back.onclick = () => localStorage.removeItem('workspace:last-route:v3');
    panel.append(title, detail, back); main.append(panel);
    console.error(error);
  }
})();
