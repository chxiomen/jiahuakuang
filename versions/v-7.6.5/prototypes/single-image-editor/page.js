// Figma 124:2243「单图加框页 - 入口优化」。
window.workspacePageRenderers['single-image-editor'] = function singleImageEditorHtml() {
  const asset = name => WorkspaceAssets.url(`prototypes/single-image-editor/assets/${name}`);
  const art = name => WorkspaceAssets.url(`prototypes/ai-preview/assets/${name}`);
  const thumbnails = ['1ec54.png', '4eb33.png', 'e4715.png', '534ce.png', '8ef9c.png'];
  const sourceImage = window.aiSingleSourceImage || 'aaa73.png';
  const scanning = state.stateId === 'scanning';
  const generating = state.stateId === 'generating';
  return `<div class="ai-editor">
    <div class="ai-editor-status"><span>10:00</span><span>▂▃▅ ▰</span></div>
    <header class="ai-editor-header"><button type="button" data-editor-back aria-label="返回首页">‹</button><span>▧</span><button type="button" data-editor-save>↓&nbsp; 保存</button></header>
    <main class="ai-editor-canvas"><img src="${art(sourceImage)}" alt="待美化的书法作品"></main>
    <div class="ai-editor-categories">${['书法','卷轴','国画','文玩','圆框','节日','油画'].map((name,index)=>`<button type="button" class="${index ? '' : 'selected'}" data-editor-category>${name}</button>`).join('')}</div>
    <div class="ai-editor-materials"><button type="button" class="ai-editor-edit" data-editor-material><img src="${asset('9ed76.svg')}" alt=""><span>编辑</span></button><div class="ai-editor-thumbnails">${thumbnails.map((name,index)=>`<button type="button" data-editor-material aria-label="素材${index+1}"><img src="${asset(name)}" alt=""></button>`).join('')}</div></div>
    <nav class="ai-editor-tools" aria-label="编辑工具"><div class="ai-editor-tools-scroll" aria-label="可横向滚动的编辑工具"><div class="ai-editor-tools-track">${[['画框','abc0a.svg'],['卡纸','eb2a3.svg'],['场景','f939b.svg'],['背景','ca342.svg'],['滤镜','5c981.svg'],['特效','7e498.svg'],['模板','c8ed6.svg'],['成品','87253.svg'],['调整','bbbec.svg'],['署名','8aef8.svg'],['印章','0a408.svg']].map(([name,icon])=>`<button type="button" data-editor-tool="${name}"><img src="${asset(icon)}" alt=""><span>${name}</span></button>`).join('')}</div></div><button class="ai-editor-beautify" type="button" data-editor-beautify><img src="${asset('7ff91.svg')}" alt=""><span>一键美化</span></button></nav>
    ${scanning ? `<div class="ai-editor-scanning" role="status" aria-label="正在分析作品"><div class="ai-editor-scan-art"><img src="${art(sourceImage)}" alt="正在分析的作品"><span class="ai-editor-scan-line" aria-hidden="true"></span><span class="ai-editor-scan-corner top-left" aria-hidden="true"></span><span class="ai-editor-scan-corner top-right" aria-hidden="true"></span><span class="ai-editor-scan-corner bottom-left" aria-hidden="true"></span><span class="ai-editor-scan-corner bottom-right" aria-hidden="true"></span></div><button class="ai-editor-scan-close" type="button" data-editor-cancel aria-label="取消分析">×</button><p>正在分析你的作品</p></div>` : ''}
    ${generating ? `<div class="ai-editor-generation-art" aria-hidden="true"><img src="${art(sourceImage)}" alt=""></div><div class="ai-editor-generating" role="status"><span class="ai-editor-spinner" aria-hidden="true"></span><strong>正在为你生成最佳 AI 效果</strong><button type="button" data-editor-cancel>取消生成</button></div>` : ''}
  </div>`;
};

let aiEditorGenerationTimer = null;
let aiEditorScanTimer = null;
window.workspacePageBindings['single-image-editor'] = function bindSingleImageEditor() {
  const screen = document.querySelector('#screen');
  screen.scrollTop = 0;
  screen.style.overflowY = 'hidden';
  if (aiEditorGenerationTimer) clearTimeout(aiEditorGenerationTimer);
  aiEditorGenerationTimer = null;
  if (aiEditorScanTimer) clearTimeout(aiEditorScanTimer);
  aiEditorScanTimer = null;
  const scanning = state.stateId === 'scanning';
  const generating = state.stateId === 'generating';
  if (scanning) {
    aiEditorScanTimer = setTimeout(() => {
      aiEditorScanTimer = null;
      if (state.pageId === 'single-image-editor' && state.stateId === 'scanning') selectPage('single-image-editor','generating');
    }, 1600);
  }
  if (generating) {
    aiEditorGenerationTimer = setTimeout(() => {
      aiEditorGenerationTimer = null;
      if (state.pageId !== 'single-image-editor' || state.stateId !== 'generating') return;
      const freeTemplates = ['5e890.png', 'b7835.png'];
      window.aiPreviewSelectedImage = freeTemplates[Math.floor(Math.random() * freeTemplates.length)];
      window.aiGeneratedTemplateResults ||= {};
      window.aiGeneratedTemplateResults[window.aiPreviewSelectedImage] = window.aiPreviewSelectedImage;
      window.aiFlowOrigin = 'single-image-editor';
      selectPage('ai-preview', 'default');
    }, 3000);
  }
  document.querySelector('[data-editor-back]').onclick = () => selectPage('home','default');
  document.querySelector('[data-editor-save]').onclick = () => showToast('保存原图 · 原型模拟');
  document.querySelector('[data-editor-beautify]').onclick = () => {
    if (!scanning && !generating) {
      window.aiGeneratedTemplateResults = {};
      selectPage('single-image-editor','scanning');
    }
  };
  document.querySelector('[data-editor-cancel]')?.addEventListener('click', () => {
    if (aiEditorScanTimer) clearTimeout(aiEditorScanTimer);
    aiEditorScanTimer = null;
    if (aiEditorGenerationTimer) clearTimeout(aiEditorGenerationTimer);
    aiEditorGenerationTimer = null;
    selectPage('single-image-editor','default');
  });
  document.querySelectorAll('[data-editor-category]').forEach(button => button.onclick = () => {
    document.querySelectorAll('[data-editor-category]').forEach(item => item.classList.remove('selected'));
    button.classList.add('selected');
  });
  document.querySelectorAll('[data-editor-tool],[data-editor-material]').forEach(button => button.onclick = () => showToast('编辑素材 · 原型模拟'));
};
