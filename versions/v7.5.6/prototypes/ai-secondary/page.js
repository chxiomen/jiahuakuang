// Figma 22:2143、80:1027、88:1444、140:4380「单图加框页- AI 二级页面」。
let aiSecondarySelectedTemplate = 0;
const aiSecondaryTemplates = [
  ['黑檀金字牌匾', '沉稳典雅 · 适合横幅题字', '5e890.png', false],
  ['红字老木牌匾', '材质纹理 · 书法作品适用', '55415.png', true],
  ['红字老木牌匾', '材质纹理 · 书法作品适用', '59209.png', true],
  ['光影石刻', '材质纹理 · 书法作品适用', 'b7835.png', false],
  ['黑字原木雕刻', '材质纹理 · 书法作品适用', 'f8f58.png', true],
  ['红字老木牌匾', '沉稳典雅 · 适合横幅题字', '9566d.png', false]
];
window.workspacePageRenderers['ai-secondary'] = window.workspacePageRenderers['home-ai-templates'] = function aiSecondaryHtml() {
  const asset = name => WorkspaceAssets.url(`prototypes/ai-preview/assets/${name}`);
  const localAsset = name => WorkspaceAssets.url(`prototypes/ai-secondary/assets/${name}`);
  const homeAsset = name => WorkspaceAssets.url(`prototypes/home/assets/${name}`);
  const homeFlow = state.pageId === 'home-ai-templates';
  const selected = state.stateId === 'scheme2-selected';
  const opening = Boolean(window.aiSecondaryAnimateEntry);
  window.aiSecondaryAnimateEntry = false;
  if (selected && window.aiSecondaryInitialSelection) {
    const initialIndex = aiSecondaryTemplates.findIndex(([, , image]) => image === window.aiSecondaryInitialSelection);
    if (initialIndex >= 0) aiSecondarySelectedTemplate = initialIndex;
    window.aiSecondaryInitialSelection = null;
  }
  const visibleTemplates = aiSecondaryTemplates;
  const selectedImage = visibleTemplates[aiSecondarySelectedTemplate]?.[2];
  const previewImage = selected ? window.aiGeneratedTemplateResults?.[selectedImage] || selectedImage || '5e890.png' : window.aiSecondarySourceImage || '9566d.png';
  const previewAsset = previewImage === 'aaa73.png' ? WorkspaceAssets.url('prototypes/ai-preview/assets/aaa73.png') : asset(previewImage);
  return `<div class="ai-secondary is-scheme2${selected ? ' has-selection' : ''}${homeFlow ? ' is-home-flow' : ''}${opening ? ' is-opening' : ''}">
    <div class="ai-secondary-status"><span>10:00</span><span class="ai-secondary-signals"><img src="${asset('d9fc4.svg')}" alt=""><img src="${asset('54cd5.svg')}" alt=""><span class="ai-secondary-battery"></span></span></div>
    <img class="ai-secondary-menu" src="${homeAsset('6d470.svg')}" alt="">
    <button class="ai-secondary-home-back" type="button" data-secondary-close aria-label="返回">×</button>
    <div class="ai-secondary-preview"><img src="${previewAsset}" alt="${selected ? '当前选中的模板图' : '上传的书法作品'}"></div>
    <section class="ai-secondary-drawer" role="dialog" aria-label="制作 AI 效果">
      <div class="ai-secondary-scroll">
        <div class="ai-secondary-toolbar"><div class="ai-secondary-categories" aria-label="模板分类">${['精选','滤镜','展厅','茶室','商务','桌面','卷轴','家居','节日'].map((name,index)=>`<button type="button" class="${index === 0 ? 'selected' : ''}" data-secondary-category="${name}">${name}</button>`).join('')}</div><img class="ai-secondary-toolbar-divider" src="${localAsset('dffa1.svg')}" alt=""><button class="ai-secondary-toolbar-close" type="button" data-secondary-close aria-label="关闭模板列表"><img src="${localAsset('25b8e.svg')}" alt=""></button></div>
        <div class="ai-secondary-grid">${visibleTemplates.map(([name,description,image,paid],index)=>{const isSelected = selected && index === aiSecondarySelectedTemplate; const isGenerated = isSelected && Boolean(window.aiGeneratedTemplateResults?.[image]); return `<div class="ai-secondary-card${isSelected ? ' is-selected' : ''}${isGenerated ? ' is-generated' : ''}"><div class="ai-secondary-image"><button class="ai-secondary-card-select" type="button" data-secondary-card="${index}" aria-label="预览${name}${paid ? '，VIP素材' : ''}"><img src="${asset(image)}" alt="">${paid ? `<img class="ai-secondary-vip" src="${localAsset('29a79.svg')}" alt="VIP">` : ''}</button>${isSelected ? isGenerated ? `<button class="ai-secondary-retry" type="button" data-secondary-generate="${index}" aria-label="重试生成${name}"><img src="${localAsset('5a402.svg')}" alt=""></button>` : `<button class="ai-secondary-generate" type="button" data-secondary-generate="${index}">生同款</button>` : ''}</div><strong>${name}</strong></div>`}).join('')}</div>
      </div>
    </section>
    <div class="ai-secondary-generating" role="status" aria-live="polite" hidden><span class="ai-secondary-spinner" aria-hidden="true"></span><strong>AI 效果生成中</strong><span data-secondary-generating-name></span><span>预计等待 <b data-secondary-countdown>3</b>s</span><button type="button" data-secondary-cancel>取消生成</button></div>
  </div>`;
};

window.workspacePageBindings['ai-secondary'] = window.workspacePageBindings['home-ai-templates'] = function bindAiSecondary() {
  const screen = document.querySelector('#screen');
  screen.scrollTop = 0;
  screen.style.overflowY = 'hidden';
  const page = screen.querySelector('.ai-secondary');
  const homeFlow = state.pageId === 'home-ai-templates';
  const visibleTemplates = aiSecondaryTemplates;
  let generating = false;
  let generationTimer = null;
  let previousSelectedImage;
  const startGeneration = index => {
    if (generating) return;
    generating = true;
    const [name,,image,paid] = visibleTemplates[index];
    previousSelectedImage = window.aiPreviewSelectedImage;
    window.aiPreviewSelectedImage = image;
    const layer = page.querySelector('.ai-secondary-generating');
    const countdown = layer.querySelector('[data-secondary-countdown]');
    layer.querySelector('[data-secondary-generating-name]').textContent = name;
    countdown.textContent = '3';
    layer.hidden = false;
    const startedAt = Date.now();
    generationTimer = setInterval(() => {
      if (!page.isConnected || !['ai-secondary','home-ai-templates'].includes(state.pageId)) { clearInterval(generationTimer); generationTimer = null; return; }
      const remaining = Math.max(0,3000-(Date.now()-startedAt));
      countdown.textContent = String(Math.max(1,Math.ceil(remaining/1000)));
      if (remaining) return;
      clearInterval(generationTimer);
      generationTimer = null;
      window.aiGeneratedTemplateResults ||= {};
      window.aiGeneratedTemplateResults[image] = image;
      window.aiFlowOrigin = homeFlow ? 'home' : 'single-image-editor';
      window.aiSecondaryReturnPage = null;
      window.aiSecondaryReturnState = null;
      selectPage(homeFlow || paid ? 'ai-preview' : 'single-image-ai-preview', paid ? 'member' : homeFlow ? 'default' : 'free');
    },100);
  };
  page.querySelector('[data-secondary-cancel]').onclick = () => {
    if (generationTimer === null) return;
    clearInterval(generationTimer);
    generationTimer = null;
    window.aiPreviewSelectedImage = previousSelectedImage;
    page.querySelector('.ai-secondary-generating').hidden = true;
    generating = false;
  };
  const closeDrawer = () => {
    if (generating || page.classList.contains('is-closing')) return;
    page.classList.add('is-closing');
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 380;
    setTimeout(() => {
      if (page.isConnected && ['ai-secondary','home-ai-templates'].includes(state.pageId)) {
        const returnPage = window.aiSecondaryReturnPage || (homeFlow ? 'home' : 'ai-preview');
        const returnState = window.aiSecondaryReturnState || 'default';
        window.aiSecondaryReturnPage = null;
        window.aiSecondaryReturnState = null;
        selectPage(returnPage, returnState);
      }
    }, duration);
  };
  page.querySelectorAll('[data-secondary-close]').forEach(button => button.onclick = closeDrawer);
  page.onclick = event => {
    if (event.target === page || event.target === page.querySelector('.ai-secondary-preview')) closeDrawer();
  };
  page.querySelectorAll('[data-secondary-category]').forEach(button => {
    button.onclick = () => {
      page.querySelectorAll('[data-secondary-category]').forEach(item=>item.classList.remove('selected'));
      button.classList.add('selected');
    };
  });
  page.querySelectorAll('[data-secondary-card]').forEach(button => {
    button.onclick = () => {
      if (generating) return;
      const index = Number(button.dataset.secondaryCard);
      aiSecondarySelectedTemplate = index;
      selectPage(homeFlow ? 'home-ai-templates' : 'ai-secondary','scheme2-selected');
    };
  });
  page.querySelectorAll('[data-secondary-generate]').forEach(button => {
    button.onclick = () => startGeneration(Number(button.dataset.secondaryGenerate));
  });
};
