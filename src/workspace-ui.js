const hoverZone=document.querySelector('.device-hover-zone');

let toolIdleTimer=null;

function clearToolIdleTimer(){if(toolIdleTimer){clearTimeout(toolIdleTimer);toolIdleTimer=null}}

function showToolsForHover(){clearToolIdleTimer();hoverZone.classList.add('tools-visible');toolIdleTimer=setTimeout(()=>{hoverZone.classList.remove('tools-visible');toolIdleTimer=null},2000)}

hoverZone.addEventListener('pointerenter',showToolsForHover);

hoverZone.addEventListener('pointerleave',()=>{clearToolIdleTimer();hoverZone.classList.remove('tools-visible')});

$('#deviceTools').addEventListener('click',event=>{if(event.target.closest('button')) clearToolIdleTimer()});

function page(){return data.pages.find(x=>x.id===state.pageId)}

function pageState(){return page().states.find(x=>x.id===state.stateId)}

function release(id){return data.releases.find(x=>x.id===id)}

function label(){return `${page().name} / ${pageState().name}`}

function platform(){return platformNames[state.platform]}

function annotation(target){return data.annotations.find(a=>a.pageId===state.pageId&&a.targetId===target&&(a.stateIds==='all'||a.stateIds.includes(state.stateId)))||data.annotations.find(a=>a.targetId===target)}

function typeName(type){return ({add:'新增',edit:'修改',remove:'删除'})[type]||''}

function changeTag(change){return change.tag||typeName(change.type)}

function changeClass(change){return change.type||({新增:'add',修改:'edit',删除:'remove'}[change.tag]||'tag')}

function inlineMarkdown(text){return escape(text).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')}

function renderTree(){ $('#treeSwitch').textContent=state.tree==='release'?'版本树':'页面树'; $('#tree').innerHTML=state.tree==='release'?releaseTree():pageTree(); bindTree() }

function releaseTree(){return `<h3 class="tree-title">版本迭代</h3>${data.releases.filter(r=>!r.hidden).map(r=>{const folded=state.folded.has(r.id),outlineActive=state.noteMode==='release'&&state.selectedRelease===r.id;return `<article class="release ${folded?'folded':''}" data-version-row="${escape(r.id)}"><div class="release-line"><button class="release-fold" data-fold-release="${r.id}" aria-label="${folded?'展开':'收起'}版本"><i class="chevron" aria-hidden="true"></i></button><button class="release-header" data-release="${r.id}" aria-expanded="${!folded}"><span><b>${escape(r.id)} · ${escape(r.name)}</b></span><em></em></button></div><div class="release-content"><button class="release-outline ${outlineActive?'active':''}" data-release-outline="${r.id}"><span><b>需求大纲</b></span></button>${r.changes.map(c=>`<button class="change-item ${state.selectedChange===c.id?'active':''}" data-change="${c.id}" data-parent-release="${r.id}"><span><b>${c.title||`${findPage(c.pageId).name} / ${findState(c.pageId,c.stateId).name}`}</b>${c.description?`<small>${c.description}</small>`:''}</span>${changeTag(c)?`<span class="change-type ${changeClass(c)}">${changeTag(c)}</span>`:''}</button>`).join('')}</div></article>`}).join('')}`}

function bindTree(){document.querySelectorAll('[data-release]').forEach(b=>b.onclick=()=>toggleReleaseFold(b.dataset.release));document.querySelectorAll('[data-fold-release]').forEach(b=>b.onclick=()=>toggleReleaseFold(b.dataset.foldRelease));document.querySelectorAll('[data-release-outline]').forEach(b=>b.onclick=()=>showReleaseNote(b.dataset.releaseOutline));document.querySelectorAll('[data-change]').forEach(b=>b.onclick=()=>selectChange(b.dataset.parentRelease,b.dataset.change));document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>selectPage(b.dataset.page,b.dataset.state||b.dataset.firstState));document.querySelectorAll('[data-nav-action]').forEach(b=>b.onclick=()=>workspaceNavigationAction(b.dataset.navAction,b.dataset.group))}

function toggleReleaseFold(id){state.folded.has(id)?state.folded.delete(id):state.folded.add(id);renderTree()}

function selectChange(releaseId,changeId){const c=release(releaseId).changes.find(x=>x.id===changeId);state.selectedRelease=releaseId;state.selectedChange=changeId;if(c.pageId&&c.stateId){state.pageId=c.pageId;state.stateId=c.stateId}if(c.pageId==='payment')state.paymentPlanScrollLeft=0;state.noteMode='change';state.activeAnnotation=null;if(changeId==='c-subscription-payment'&&c.pageId==='payment'){syncPaymentRequirementPreview();return}renderAll()}

const renderToolsDefault=renderTools;

renderTools=function(){if(state.pageId!=='mine'){renderToolsDefault();return}$('#deviceTools').innerHTML=`<div class="crumb">${label()}</div><div class="tool-row"><div class="segment">${Object.entries(platformNames).map(([id,name])=>`<button class="${state.platform===id?'on':''}" data-platform="${id}">${name}</button>`).join('')}</div></div>`;document.querySelectorAll('[data-platform]').forEach(b=>b.onclick=()=>{state.platform=b.dataset.platform;renderAll()})}

function findPage(id){return data.pages.find(p=>p.id===id)}

function findState(pageId,id){return findPage(pageId).states.find(s=>s.id===id)}

function renderTools(){const states=page().states;const platforms=state.pageId==='renewal'?[['android','Android'],['ios','iOS']]:Object.entries(platformNames);hoverZone.classList.toggle('renewal-tools-visible',state.pageId==='renewal');$('#deviceTools').innerHTML=`<div class="crumb">${label()}</div><div class="tool-row"><div class="segment">${platforms.map(([id,name])=>`<button class="${(state.pageId==='renewal'&&state.platform==='mini'?id==='android':state.platform===id)?'on':''}" data-platform="${id}">${name}</button>`).join('')}</div><div class="segment">${states.map(s=>`<button class="${state.stateId===s.id?'on':''}" data-tool-state="${s.id}">${s.name}</button>`).join('')}</div></div>`;document.querySelectorAll('[data-platform]').forEach(b=>b.onclick=()=>{closeSheet();state.platform=b.dataset.platform;renderAll()});document.querySelectorAll('[data-tool-state]').forEach(b=>b.onclick=()=>selectPage(state.pageId,b.dataset.toolState))}

function cleanupEditorHeader(){const notes=$('.notes');const head=$('.note-head');head?.querySelectorAll('.requirements-editor-toolbar').forEach(toolbar=>toolbar.remove());notes?.classList.remove('is-editing')}

function bindRequirementStateTabs(){const currentChange=release(state.selectedRelease)?.changes.find(change=>change.id===state.selectedChange),requirements=currentChange?.requirements;if(!requirements?.states)return;const editor=$('.requirements-editor');const article=editor?.querySelector('.requirements-editor-content');const current=requirements.states.find(item=>item.id===state.stateId);if(article&&current?.summary&&!article.querySelector('.requirement-state-summary'))article.insertAdjacentHTML('afterbegin',`<div class="requirement-state-summary">${escape(current.summary)}</div>`);document.querySelectorAll('[data-requirement-state]').forEach(button=>button.onclick=()=>{state.pageId=currentChange.pageId;state.stateId=button.dataset.requirementState;state.selectedChange=currentChange.id;state.noteMode='change';state.activeAnnotation=null;renderAll()});if(currentChange.id==='c-subscription-renewal'){document.querySelectorAll('.renewal-requirement-state-tabs button[data-renewal-platform]').forEach(button=>button.onclick=()=>{closeSheet();state.platform=button.dataset.renewalPlatform;state.pageId=currentChange.pageId;state.selectedChange=currentChange.id;state.noteMode='change';state.activeAnnotation=null;renderAll()});document.querySelectorAll('[data-renewal-tier]').forEach(button=>button.onclick=()=>{state.renewalTier=button.dataset.renewalTier;state.pageId=currentChange.pageId;state.selectedChange=currentChange.id;state.noteMode='change';state.activeAnnotation=null;renderAll()})}}

function renderNotes(){const showingPageNote=state.noteMode==='page'&&(state.tree==='page'||state.pageNoteRequested);const html=state.noteMode==='release'?releaseNote(state.selectedRelease):state.noteMode==='change'?changeNote():state.noteMode==='annotation'?annotationNote(state.activeAnnotation):showingPageNote?pageNote():'<div class="note-empty">请选择版本下的需求大纲或页面条目查看需求。</div>';$('.note-head h2').textContent=showingPageNote?'页面说明':'需求说明';$('#fullNote').hidden=state.tree==='release';$('#notes').innerHTML=html;cleanupEditorHeader();bindRequirementStateTabs();bindPaymentRequirementStateTabs();bindMineStateTabs();bindRenewalModalRequirement();bindUnifiedEditor();$('#returnNote')?.addEventListener('click',()=>{state.noteMode='page';state.pageNoteRequested=true;state.activeAnnotation=null;renderNotes()})}

function syncWorkspaceMode(){const workspace=$('#workspace');const docOnly=['c-virtual-payment','c-subscription-cms','c-subscription-server','c-repurchase-rules'].includes(state.selectedChange),showPaymentCalculator=state.noteMode==='change'&&state.selectedChange==='c-subscription-payment';workspace.classList.toggle('doc-only',docOnly);workspace.classList.toggle('payment-calculator-mode',showPaymentCalculator);workspace.classList.toggle('payment-preview-mode',state.pageId==='payment'&&state.selectedChange==='c-subscription-payment');state.noteMode==='release'?workspace.classList.add('release-note-mode'):workspace.classList.remove('release-note-mode')}

function showReleaseNote(id){state.noteMode='release';state.activeAnnotation=null;state.selectedRelease=id;state.selectedChange=null;renderAll()}

function showToast(text){const t=$('#toast');t.textContent=text;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1600)}

function normalizeRenewalCommonRequirements(){const commonKey='change:c-subscription-renewal:common';const legacyKey='change:c-subscription-renewal';if(!savedRequirements[commonKey]&&!savedRequirements[legacyKey])return;const common=document.createElement('div');common.innerHTML=savedRequirements[commonKey]||savedRequirements[legacyKey];common.querySelectorAll('.requirement-section').forEach(section=>{const title=section.querySelector('h3')?.textContent?.trim();if(title==='会员卡片'||title==='下次扣费信息'||title==='状态说明'||title==='底部操作入口'||title==='客服信息')section.remove()});common.insertAdjacentHTML('beforeend','<section class="requirement-section"><h3>客服信息</h3><ul class="requirement-list"><li>在“服务承诺”卡片下方靠左展示客服电话：18****1234，服务时间：09:00 - 22:00。</li></ul></section><section class="requirement-section"><h3>底部操作入口</h3><ul class="requirement-list"><li>页面底部固定悬浮展示一个文本按钮：自动续费协议。</li><li>点击后，从底部拉起弹窗展示自动续费协议内容。</li></ul></section>');const html=common.innerHTML;if(savedRequirements[commonKey]!==html){savedRequirements[commonKey]=html;fetch('/api/requirements',{method:'POST',headers:requirementsWriteHeaders(),body:JSON.stringify({key:commonKey,html})}).catch(()=>{})}}

function normalizeEmptyExpiredState(){const key='change:c-subscription-renewal:expired';if(Object.prototype.hasOwnProperty.call(savedRequirements,key)&&savedRequirements[key]==='')savedRequirements[key]='<!--empty-state-->'}
