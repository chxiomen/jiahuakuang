// AI 功能优化首页；图形来自 Figma 首页 1:12。
function homeHtml() {
  const asset = name => WorkspaceAssets.url(`prototypes/home/assets/${name}`);
  const icon = (name, className = '') => `<img class="${className}" src="${asset(name)}" alt="">`;
  const actions = [
    ['去纸痕', '779d2.svg', 'd5092.svg', '934dc.svg'],
    ['书法抠字', 'ab4af.svg'],
    ['批量加框', '170d5.svg'],
    ['组合加框', '4cf2e.svg'],
    ['拍照扫描', 'b8ece.svg'],
    ['一键成片', 'a2a1d.svg'],
    ['制作印章', '9e7cc.svg'],
    ['墨辅书法', '097e9.svg'],
    ['画质提升', '779d2.svg', '45f51.svg'],
    ['作品合拍', '779d2.svg', '47bfd.svg']
  ];
  const actionHtml = actions.map(([label, ...images]) => `<button class="ai-home-tool" type="button" data-home-action="${label}" aria-label="${label}"><span class="ai-home-tool-icon">${images.map(name => icon(name)).join('')}</span><span>${label}</span></button>`).join('');
  return `<div class="ai-home">
    <section class="ai-home-hero" aria-label="美画匠全新现代场景">
      ${icon('42321.png', 'ai-home-hero-image')}
      <div class="ai-home-status"><span>10:00</span><span class="ai-home-signals">${icon('e6d71.svg')}${icon('d927a.svg')}${icon('e3a9b.svg')}</span></div>
      <div class="ai-home-header"><span class="ai-home-brand">${icon('9a3ac.svg')}${icon('1e368.svg', 'ai-home-vip-bg')}${icon('dcae2.svg', 'ai-home-vip-text')}</span><button class="ai-home-menu" type="button" data-home-action="更多">${icon('6d470.svg')}</button></div>
    </section>
    <main class="ai-home-content">
      <div class="ai-home-main-actions"><button class="ai-home-primary" type="button" data-home-action="选图加框">${icon('ffec6.svg')}<span>选图加框</span></button><button class="ai-home-ai" type="button" data-home-action="AI 加框">${icon('85e5d.svg')}<span>AI 加框</span></button></div>
      <div class="ai-home-tools">${actionHtml}</div>
      <section class="ai-home-featured"><h2>精选模板</h2><div class="ai-home-template-list"><button type="button" data-home-action="精选模板">${icon('2ee49.png')}</button><button type="button" data-home-action="精选模板">${icon('2ee49.png')}</button><button type="button" data-home-action="精选模板">${icon('2ee49.png')}</button></div></section>
    </main>
    <nav class="ai-home-tabs" aria-label="首页底部导航">
      <button type="button" class="active" data-home-tab="home">${icon('223b1.svg')}<span>加框</span></button>
      <button type="button" data-home-tab="templates">${icon('2b2b0.svg')}<span>模板</span></button>
      <button type="button" data-home-tab="ai"><span class="ai-home-tab-ai-icon">${icon('45bfa.svg')}${icon('68b20.svg')}${icon('7bbf9.svg')}${icon('1eea8.svg')}</span><span>AI 加框</span></button>
      <button type="button" data-home-tab="mine">${icon('a3e41.svg')}<span>我的</span></button>
    </nav>
    <div class="ai-home-upload" hidden>
      <div class="ai-home-upload-backdrop" data-home-dismiss></div>
      <section class="ai-home-upload-sheet" role="dialog" aria-modal="true" aria-labelledby="aiHomeUploadTitle">
        <div class="ai-home-upload-handle"></div>
        <button class="ai-home-upload-close" type="button" data-home-dismiss aria-label="关闭">×</button>
        <h2 id="aiHomeUploadTitle">模拟用户上传照片</h2>
        <button class="ai-home-upload-submit" type="button" data-home-upload>上传照片</button>
      </section>
    </div>
  </div>`;
}

window.workspacePageBindings.home = function bindHomePreview() {
  const screen = document.querySelector('#screen');
  screen.scrollTop = 0;
  screen.style.overflowY = 'auto';
  const upload = document.querySelector('.ai-home-upload');
  const closeUpload = () => { if (upload) upload.hidden = true; screen.style.overflowY = 'auto'; };
  document.querySelectorAll('.ai-home [data-home-action]').forEach(button => {
    button.onclick = () => {
      if (button.dataset.homeAction === 'AI 加框' && upload) {
        screen.scrollTop = 0;
        upload.hidden = false;
        screen.style.overflowY = 'hidden';
        upload.querySelector('[data-home-upload]').focus();
        return;
      }
      if (button.dataset.homeAction === '选图加框') { selectPage('single-image-editor', 'default'); return; }
      showToast(`${button.dataset.homeAction} · 原型入口`);
    };
  });
  upload?.querySelectorAll('[data-home-dismiss]').forEach(button => { button.onclick = closeUpload; });
  const submit = upload?.querySelector('[data-home-upload]');
  if (submit) submit.onclick = () => {
    closeUpload();
    window.aiFlowOrigin = 'home';
    window.aiSecondarySourceImage = 'aaa73.png';
    window.aiSecondaryReturnPage = 'home';
    window.aiSecondaryReturnState = 'default';
    window.aiPreviewSelectedImage = '9566d.png';
    window.aiGeneratedTemplateResults = {};
    window.aiSecondaryInitialSelection = null;
    window.aiSecondaryAnimateEntry = true;
    selectPage('home-ai-templates', 'scheme2');
  };
  document.querySelectorAll('.ai-home [data-home-tab]').forEach(button => {
    button.onclick = () => {
      if (button.dataset.homeTab === 'mine') selectPage('mine', findPage('mine').states[0].id);
      else if (button.dataset.homeTab === 'ai' && upload) { screen.scrollTop = 0; upload.hidden = false; screen.style.overflowY = 'hidden'; }
      else if (button.dataset.homeTab !== 'home') showToast(`${button.textContent.trim()} · 原型入口`);
    };
  });
};
