// Figma 22:2231 / 26:2299「单图加框页 - AI模板-生成预览」。
window.workspacePageRenderers['single-image-ai-preview'] = function singleImageAiPreviewHtml() {
  const asset = name => WorkspaceAssets.url(`prototypes/ai-preview/assets/${name}`);
  const localAsset = name => WorkspaceAssets.url(`prototypes/single-image-ai-preview/assets/${name}`);
  const homeAsset = name => WorkspaceAssets.url(`prototypes/home/assets/${name}`);
  const member = state.stateId === 'member';
  const previewImage = window.aiPreviewSelectedImage || '9566d.png';
  return `<div class="ai-preview ai-single-preview${member ? ' is-member' : ''}">
    <div class="ai-preview-status"><span>10:00</span><span class="ai-preview-signals"><img src="${asset('d9fc4.svg')}" alt=""><img src="${asset('54cd5.svg')}" alt=""><span class="ai-preview-battery"><img src="${asset('8c9e7.svg')}" alt=""></span></span></div>
    ${member ? `<button class="ai-preview-close" type="button" data-ai-single-back aria-label="关闭并返回首页"><img src="${homeAsset('675a7.svg')}" alt=""><img src="${homeAsset('32844.svg')}" alt=""></button>` : `<button class="ai-single-back" type="button" data-ai-single-back aria-label="返回模板列表"><img src="${localAsset('663ce.svg')}" alt=""></button>`}
    <img class="ai-preview-menu" src="${homeAsset('6d470.svg')}" alt="">
    <div class="ai-preview-canvas">
      <div class="ai-preview-art-frame"><img class="ai-preview-art" src="${asset(previewImage)}" alt="AI 生成的书法作品">${member ? '' : `<div class="ai-preview-watermark"><span>加画框AI生成</span><img src="${asset('c6293.png')}" alt=""></div>`}</div>
      <div class="ai-preview-result"><span class="ai-preview-result-label"><img src="${asset(member ? '4f720.svg' : '32fe3.svg')}" alt="">${member ? 'VIP专属效果，开通后即可保存' : 'AI 效果已生成，限时免费'}</span><button type="button" data-ai-single-change>更换模板&nbsp; ›</button></div>
    </div>
    <div class="ai-preview-actions"><button class="ai-preview-share" type="button" data-ai-single-share><img src="${asset('cc307.svg')}" alt="">分享</button>${member ? `<button class="ai-preview-save ai-single-member-action" type="button" data-ai-single-member><img src="${asset('8c7d5.svg')}" alt="">开通会员</button>` : `<a class="ai-preview-save" href="${asset(previewImage)}" download="加画框AI生成.png"><img src="${asset('07cd1.svg')}" alt="">保存至相册</a>`}</div>
  </div>`;
};

window.workspacePageBindings['single-image-ai-preview'] = function bindSingleImageAiPreview() {
  const screen = document.querySelector('#screen');
  screen.scrollTop = 0;
  screen.style.overflowY = 'hidden';
  const backToTemplates = () => {
    window.aiSecondarySourceImage = window.aiPreviewSelectedImage || '9566d.png';
    window.aiGeneratedTemplateResults ||= {};
    window.aiGeneratedTemplateResults[window.aiSecondarySourceImage] = window.aiSecondarySourceImage;
    window.aiSecondaryInitialSelection = window.aiSecondarySourceImage;
    window.aiSecondaryAnimateEntry = true;
    window.aiSecondaryReturnPage = 'single-image-ai-preview';
    window.aiSecondaryReturnState = state.stateId;
    selectPage('ai-secondary', 'scheme2-selected');
  };
  document.querySelector('[data-ai-single-back]').onclick = () => state.stateId === 'member' ? selectPage('home', 'default') : backToTemplates();
  document.querySelector('[data-ai-single-change]').onclick = backToTemplates;
  document.querySelector('[data-ai-single-share]').onclick = () => showToast('分享 · 原型模拟');
  const memberButton = document.querySelector('[data-ai-single-member]');
  if (memberButton) memberButton.onclick = () => selectPage('payment', 'default');
};
