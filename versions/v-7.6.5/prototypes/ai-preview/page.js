// Figma 21:632「AI模板-生成预览」。
window.aiPreviewImageSizes = { '9566d.png': [1000, 2000], '5e890.png': [927, 2000], '55415.png': [1656, 2000], 'b7835.png': [827, 1800], 'f8f58.png': [1200, 2400] };
window.workspacePageRenderers['ai-preview'] = function aiPreviewHtml() {
  const asset = name => WorkspaceAssets.url(`prototypes/ai-preview/assets/${name}`);
  const homeAsset = name => WorkspaceAssets.url(`prototypes/home/assets/${name}`);
  const previewImage = window.aiPreviewSelectedImage || '9566d.png';
  const member = state.stateId === 'member';
  return `<div class="ai-preview${member ? ' ai-preview-member' : ''}">
    <div class="ai-preview-status"><span>10:00</span><span class="ai-preview-signals"><img src="${asset('d9fc4.svg')}" alt=""><img src="${asset('54cd5.svg')}" alt=""><span class="ai-preview-battery"><img src="${asset('8c9e7.svg')}" alt=""></span></span></div>
    <button class="ai-preview-close" type="button" data-ai-preview-close aria-label="关闭并返回${window.aiFlowOrigin === 'single-image-editor' ? '单图加框页' : '首页'}"><img src="${homeAsset('675a7.svg')}" alt=""><img src="${homeAsset('32844.svg')}" alt=""></button>
    <img class="ai-preview-menu" src="${homeAsset('6d470.svg')}" alt="">
    <div class="ai-preview-canvas">
      <div class="ai-preview-art-frame"><img class="ai-preview-art" src="${asset(previewImage)}" alt="AI 生成的书法作品">${member ? '' : `<div class="ai-preview-watermark"><span>加画框AI生成</span><img src="${asset('c6293.png')}" alt=""></div>`}</div>
      <div class="ai-preview-result"><span class="ai-preview-result-label"><img src="${asset(member ? '4f720.svg' : '32fe3.svg')}" alt="">${member ? 'VIP专属效果，开通后即可保存' : 'AI 效果已生成，限时免费'}</span><button type="button" data-ai-preview-more>${member ? '更换模板&nbsp; ›' : '浏览更多模板&nbsp; ›'}</button></div>
    </div>
    <div class="ai-preview-actions"><button class="ai-preview-share" type="button" data-ai-preview-share><img src="${asset('cc307.svg')}" alt="">分享</button>${member ? `<button class="ai-preview-save ai-preview-member-action" type="button" data-ai-preview-member><img src="${asset('8c7d5.svg')}" alt="">开通会员</button>` : `<a class="ai-preview-save" href="${asset(previewImage)}" download="加画框AI生成.png"><img src="${asset('07cd1.svg')}" alt="">保存至相册</a>`}</div>
  </div>`;
};

window.workspacePageBindings['ai-preview'] = function bindAiPreview() {
  const screen = document.querySelector('#screen');
  screen.scrollTop = 0;
  screen.style.overflowY = 'hidden';
  document.querySelector('[data-ai-preview-close]').onclick = () => selectPage(window.aiFlowOrigin === 'single-image-editor' ? 'single-image-editor' : 'home', 'default');
  document.querySelector('[data-ai-preview-more]').onclick = () => {
    window.aiSecondarySourceImage = window.aiPreviewSelectedImage || '9566d.png';
    window.aiGeneratedTemplateResults ||= {};
    window.aiGeneratedTemplateResults[window.aiSecondarySourceImage] = window.aiSecondarySourceImage;
    window.aiSecondaryInitialSelection = window.aiSecondarySourceImage;
    window.aiSecondaryAnimateEntry = true;
    window.aiSecondaryReturnPage = 'ai-preview';
    window.aiSecondaryReturnState = state.stateId;
    selectPage(window.aiFlowOrigin === 'home' ? 'home-ai-templates' : 'ai-secondary', 'scheme2-selected');
  };
  document.querySelector('[data-ai-preview-share]').onclick = () => showToast('分享 · 原型模拟');
  const memberButton = document.querySelector('[data-ai-preview-member]');
  if (memberButton) memberButton.onclick = () => selectPage('payment', 'default');
};
