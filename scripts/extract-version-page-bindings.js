// Migration helper: put all page-specific event bindings beside that page.
const fs = require('node:fs');
const path = require('node:path');
const acorn = require('internal/deps/acorn/acorn/dist/acorn');
const { atomicWrite, writeJson } = require('../lib/versioned-workspace-store');
const root = path.resolve(__dirname, '..');
const index = JSON.parse(fs.readFileSync(path.join(root, 'versions/index.json'), 'utf8'));
for (const record of index.versions) {
  const directory = path.join(root, 'versions', record.directory);
  const file = path.join(directory, 'prototypes/shared/render.js');
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes('renderPhoneWithMineActions')) continue;
  const ast = acorn.parse(source, { ecmaVersion: 'latest' });
  const originalPhone = ast.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'renderPhone');
  const paymentBindings = originalPhone.body.body.filter(node => {
    const code = source.slice(node.start, node.end);
    return code.includes("'[data-payment-tab]'") || code.includes("'[data-payment-plan]'");
  }).map(node => source.slice(node.start, node.end)).join('\n');
  const mineWrapper = ast.body.filter(node => node.type === 'ExpressionStatement' && node.expression.left?.name === 'renderPhone').at(-1).expression.right;
  const mineBindings = mineWrapper.body.body.slice(1).map(node => source.slice(node.start, node.end)).join('\n');
  const paymentFile = path.join(directory, 'prototypes/payment/interactions.js');
  atomicWrite(paymentFile, fs.readFileSync(paymentFile, 'utf8') + `\nfunction bindPaymentControls(){\n${paymentBindings}\n}\nwindow.workspacePageBindings.payment=function(){bindPaymentControls();bindPaymentPlanScroller();bindPaymentAgreement();document.querySelector('[data-lifetime-frame]')?.addEventListener('click',()=>showToast('已返回加框页（原型模拟）'));};\n`);
  const mineFile = path.join(directory, 'prototypes/mine/interactions.js');
  atomicWrite(mineFile, fs.readFileSync(mineFile, 'utf8') + `\nfunction bindMinePreview(){\n${mineBindings}\n}\nwindow.workspacePageBindings.mine=bindMinePreview;\n`);
  const renewalFile = path.join(directory, 'prototypes/renewal/interactions.js');
  atomicWrite(renewalFile, fs.readFileSync(renewalFile, 'utf8') + '\nwindow.workspacePageBindings.renewal=bindRepurchaseModal;\n');
  const screen = ast.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'screenHtml');
  const shared = source.slice(screen.start, screen.end) + `

function renderPhone(){
  syncWorkspaceMode();
  const config=workspaceBootstrap.prototype.pages[state.pageId]||{};
  const phone=$('#phone');
  phone.className='phone '+(config.phoneClass||'');
  phone.removeAttribute('data-release');
  const item=currentVersionItem();
  if(itemModel(item)?.pageId)phone.classList.add('diff-'+itemModel(item).pageId);
  $('#screen').innerHTML=screenHtml();
  const tabs=[['home','⌂','首页'],['member','◇','会员'],['profile','◯','我的']].filter(([id])=>findPage(id)&&!findPage(id).hidden);
  $('#tabBar').innerHTML=config.hideTabBar?'':tabs.map(([id,icon,name])=>\x60<button class="\x24{state.pageId===id?'on':''}" data-tab="\x24{id}"><span>\x24{icon}</span>\x24{name}</button>\x60).join('');
  phone.querySelectorAll('[data-target]').forEach(button=>button.onclick=event=>{event.stopPropagation();openAction(button.dataset.target)});
  phone.querySelectorAll('[data-tab]').forEach(button=>button.onclick=()=>selectPage(button.dataset.tab,findPage(button.dataset.tab).states[0].id));
  window.workspacePageBindings[state.pageId]?.();
}
`;
  atomicWrite(file, shared);
  const manifestFile = path.join(directory, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  Object.assign(manifest.prototype.pages.payment, { hideTabBar: true, phoneClass: 'payment-screen' });
  Object.assign(manifest.prototype.pages.renewal, { hideTabBar: true, phoneClass: 'renewal-screen' });
  Object.assign(manifest.prototype.pages.mine, { hideTabBar: true, phoneClass: 'mine-phone' });
  writeJson(manifestFile, manifest);
}
console.log('各页面的按钮交互已移入对应页面目录');
