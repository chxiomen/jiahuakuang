// One-time, lossless source/data split. Node's bundled parser is used only by
// this migration: node --expose-internals scripts/migrate-version-files.js
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const acorn = require('internal/deps/acorn/acorn/dist/acorn');
const { VersionedWorkspaceStore, safeName, writeJson, atomicWrite } = require('../lib/versioned-workspace-store');
const root = path.resolve(__dirname, '..');
const versionsRoot = path.join(root, 'versions');
if (fs.existsSync(path.join(versionsRoot, 'index.json'))) throw new Error('版本文件已存在，迁移不会覆盖已有版本');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const files = {};
function source(file) {
  const text = read(file);
  const ast = acorn.parse(text, { ecmaVersion: 'latest' });
  return { text, nodes: ast.body, code: node => text.slice(node.start, node.end) };
}
const prototypes = source('src/page-prototypes.js');
const ui = source('src/workspace-ui.js');
const mine = source('src/mine-flow.js');
const catalogSource = source('src/catalog.js');
const review = source('src/revision-review.js');
const workflow = source('src/revision-review-workflow.js');
const snapshot = JSON.parse(read('prd-data.json'));

const context = vm.createContext({ console, localStorage: { getItem: () => null }, document: { addEventListener() {} } });
vm.runInContext(catalogSource.text, context);
vm.runInContext('function release(id){return data.releases.find(v=>v.id===id)};function findPage(id){return data.pages.find(p=>p.id===id)};function bindTree(){};function changeNote(){};function syncWorkspaceMode(){};function renderAll(){};function renderTools(){};', context);
vm.runInContext(read('src/workspace-structure.js'), context);
vm.runInContext(read('src/version-model.js'), context);
context.payload = snapshot;
vm.runInContext('savedRequirements=payload.requirements;loadWorkspaceStructure()', context);
const data = JSON.parse(vm.runInContext('JSON.stringify(data)', context));
const mineStates = JSON.parse(vm.runInContext('JSON.stringify(mineStateCatalog)', context));
const parsedStructure = JSON.parse(snapshot.requirements['workspace:structure:v2'] || '{}');
const defaultRelease = data.releases.find(version => !version.hidden);
assert.ok(defaultRelease, '至少需要一个版本');

const fnName = node => node.type === 'FunctionDeclaration' ? node.id.name : '';
const select = (src, names) => src.nodes.filter(node => names.includes(fnName(node))).map(src.code).join('\n\n');
const payment = select(prototypes, ['paymentPlansFor', 'paymentNextDate', 'paymentHtml']);
const renewal = select(prototypes, ['renewalHtml']);
const minePage = select(prototypes, ['mineHtml']) + '\n' + select(mine, ['mineHtmlMultipleActive', 'mineHtmlByStatus']);
const screen = prototypes.nodes.find(node => fnName(node) === 'screenHtml');
const branches = screen.body.body;
const pageBranch = id => branches.filter(node => node.test && prototypes.text.slice(node.test.start, node.test.end).includes(`state.pageId==='${id}'`)).map(prototypes.code).join('\n');
const fallback = branches.find(node => node.type === 'ReturnStatement');
const sharedScreen = `function screenHtml(){const custom=window.workspacePageRenderers[state.pageId];if(custom)return custom();return ({payment:paymentHtml,renewal:renewalHtml,mine:mineHtmlByStatus,home:homeHtml,member:memberHtml})[state.pageId]?.()||customPageHtml();}`;

const paymentFns = ['isRecurringPlan', 'showPaymentAgreementSheet', 'bindPaymentAgreement', 'syncPaymentRequirementPreview', 'bindPaymentRequirementStateTabs'];
const renewalFns = ['positionRenewalModalConnector', 'bindRenewalModalRequirement', 'syncRenewalPreview', 'openRepurchaseModal', 'closeRepurchaseModal', 'goToRepurchasePayment', 'bindRepurchaseModal', 'bindRenewalToggle', 'renderRenewalToggle', 'showRenewalAction', 'bindRenewalFooter'];
const navigationFns = ['selectPage', 'clearTextSelection', 'closeSheet', 'confirmAction'];
const removedUi = new Set([...paymentFns, ...renewalFns, ...navigationFns, 'openAction', 'bindMineStateTabs']);
function isPrototypeWrapper(node) {
  if (node.type === 'VariableDeclaration') return node.declarations.some(decl => ['baseRenderPhone', 'showRenewalActionBase'].includes(decl.id.name));
  return node.type === 'ExpressionStatement' && node.expression.type === 'AssignmentExpression' && ['renderPhone', 'showRenewalAction'].includes(node.expression.left.name);
}
const runtime = select(prototypes, ['renderPhone']) + '\n' + ui.nodes.filter(isPrototypeWrapper).map(ui.code).join('\n') + '\n' + mine.nodes.filter(node => node.type === 'VariableDeclaration' || (node.type === 'ExpressionStatement' && node.expression.left?.name === 'renderPhone')).map(mine.code).join('\n');
const renewalWrapper = ui.nodes.filter(node => isPrototypeWrapper(node) && !ui.code(node).includes('baseRenderPhone') && !ui.code(node).startsWith('renderPhone=')).map(ui.code).join('\n');
const baseRuntime = select(prototypes, ['renderPhone']) + '\n' + ui.nodes.filter(node => isPrototypeWrapper(node) && (ui.code(node).includes('baseRenderPhone') || ui.code(node).startsWith('renderPhone='))).map(ui.code).join('\n') + '\n' + mine.nodes.filter(node => node.type === 'VariableDeclaration' || (node.type === 'ExpressionStatement' && node.expression.left?.name === 'renderPhone')).map(mine.code).join('\n');
const businessReview = review.nodes.filter(node => node.start >= review.nodes.find(node => fnName(node) === 'membershipRevisionApplied').start).map(review.code).join('\n');
const finalPredicate = workflow.nodes.filter(node => node.type === 'ExpressionStatement' && node.expression.left?.name === 'membershipRevisionApplied').map(workflow.code).join('\n');
const revisionLocals = ['revisionPatches', 'revisionIosKey', 'revisionIosHtml'];
const revisionConstants = review.nodes.filter(node => node.type === 'VariableDeclaration' && node.declarations.some(decl => revisionLocals.includes(decl.id.name))).map(review.code).join('\n') + '\n' + workflow.nodes.filter(node => node.type === 'VariableDeclaration' && node.declarations.some(decl => decl.id.name === 'revisionItems')).map(workflow.code).join('\n');
const revisionFunctions = select(workflow, ['revisionRejected', 'revisionResolvedKey', 'revisionItemStatus']);
const revisions = `(() => {\n${revisionConstants}\n${revisionFunctions}\n${businessReview}\n${finalPredicate}\n})();\n`;

// Split CSS at actual brace boundaries, retaining media/supports nesting.
function splitCss(text) {
  const buckets = { shared: '', payment: '', renewal: '', mine: '' };
  let start = 0, cursor = 0;
  while (cursor < text.length) {
    const open = text.indexOf('{', cursor);
    if (open < 0) break;
    let depth = 1, quote = '', comment = false, end = open + 1;
    for (; end < text.length && depth; end++) {
      const char = text[end], next = text[end + 1];
      if (comment) { if (char === '*' && next === '/') { comment = false; end++; } continue; }
      if (quote) { if (char === '\\') { end++; continue; } if (char === quote) quote = ''; continue; }
      if (char === '/' && next === '*') { comment = true; end++; continue; }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (char === '{') depth++;
      if (char === '}') depth--;
    }
    const header = text.slice(start, open).trim();
    const body = text.slice(open + 1, end - 1);
    if (/^@(?:media|supports|layer|container)\b/.test(header)) {
      const nested = splitCss(body);
      for (const key of Object.keys(buckets)) if (nested[key]) buckets[key] += `${header}{\n${nested[key]}}\n`;
    } else {
      const kinds = ['payment', 'renewal', 'mine'].filter(kind => kind === 'payment' ? /\.(?:pay-|payment|vip-modal)/.test(header) : new RegExp('\\.' + kind + '(?:[-\\s.:#>+~\\[,]|$)').test(header));
      buckets[kinds.length === 1 ? kinds[0] : 'shared'] += `${header}{${body}}\n`;
    }
    start = cursor = end;
  }
  return buckets;
}
const css = splitCss(read('styles/workspace.css'));
const prototypeSharedCss = css.shared;

const baseFiles = {
  'prototypes/payment/page.js': payment,
  'prototypes/payment/interactions.js': select(ui, paymentFns) + '\n' + select(prototypes, ['bindPaymentPlanScroller']),
  'prototypes/payment/page.css': css.payment,
  'prototypes/renewal/page.js': renewal,
  'prototypes/renewal/interactions.js': select(ui, renewalFns) + '\n' + renewalWrapper,
  'prototypes/renewal/page.css': css.renewal,
  'prototypes/mine/page.js': 'const mineStateCatalog=workspaceBootstrap.catalog.mineStateCatalog;\n' + select(catalogSource, ['mineStateInfo']) + '\n' + minePage,
  'prototypes/mine/interactions.js': select(mine, ['mineRenewalState', 'openMineRenewal', 'openMinePayment']) + '\n' + select(ui, ['bindMineStateTabs']),
  'prototypes/mine/page.css': css.mine,
  'prototypes/home/page.js': `function homeHtml(){${pageBranch('home')}}`,
  'prototypes/home/page.css': '',
  'prototypes/member/page.js': `function memberHtml(){${pageBranch('member')}}`,
  'prototypes/member/page.css': '',
  'prototypes/custom/page.js': `function customPageHtml(){${prototypes.code(fallback)}}`,
  'prototypes/shared/navigation.js': select(ui, navigationFns) + '\n' + select(mine, ['openAction']),
  'prototypes/shared/render.js': sharedScreen + '\n' + baseRuntime,
  'prototypes/shared/revisions.js': revisions,
  'prototypes/shared/page.css': prototypeSharedCss + '\n' + read('styles/revision-review.css')
};
const scripts = [
  'prototypes/payment/page.js', 'prototypes/renewal/page.js', 'prototypes/mine/page.js',
  'prototypes/home/page.js', 'prototypes/member/page.js', 'prototypes/custom/page.js',
  'prototypes/payment/interactions.js', 'prototypes/renewal/interactions.js', 'prototypes/mine/interactions.js',
  'prototypes/shared/navigation.js', 'prototypes/shared/render.js', 'prototypes/shared/revisions.js'
];
const styles = ['prototypes/shared/page.css', 'prototypes/payment/page.css', 'prototypes/renewal/page.css', 'prototypes/mine/page.css', 'prototypes/home/page.css', 'prototypes/member/page.css'];
const index = { schemaVersion: 3, documentTitle: parsedStructure.documentTitle || '需求说明', migratedAt: new Date().toISOString(), versions: [] };
for (const version of data.releases) {
  const number = version.versionNumber || version.id;
  const record = { id: version.id, versionNumber: number, name: version.name, directory: safeName(version.id), aliases: [...new Set([version.id, version.sourceId, ...(version.aliases || [])].filter(value => value && value !== number))], hidden: Boolean(version.hidden), custom: true };
  index.versions.push(record);
  const directory = `versions/${record.directory}`;
  for (const [file, content] of Object.entries(baseFiles)) files[`${directory}/${file}`] = content + '\n';
  files[`${directory}/catalog.json`] = JSON.stringify({ ...data, releases: [version], mineStateCatalog: mineStates }, null, 2) + '\n';
  const manifest = {
    schemaVersion: 3, ...record,
    pages: data.pages,
    changes: version.changes.map(item => ({ ...item, custom: Boolean(item.__workspaceCustom), hasDocument: item.hasDocument !== false, documentKey: item.documentKey || `change:${item.id}` })),
    prototype: { scripts, styles, pages: Object.fromEntries(['payment','renewal','mine','home','member'].map(pageId => [pageId, { script: `prototypes/${pageId}/page.js`, style: `prototypes/${pageId}/page.css` }])) },
    documents: [], updatedAt: snapshot.updatedAt
  };
  const owners = key => data.releases.filter(candidate => key === `release:${candidate.id}` || key.startsWith(`model-text:${candidate.id}:`) || candidate.changes.some(item => key === item.documentKey || key.startsWith(item.documentKey + ':') || key === `change:${item.id}` || key.startsWith(`change:${item.id}:`)));
  for (const [key, html] of Object.entries(snapshot.requirements)) {
    if (key === 'workspace:structure:v2') continue;
    const matches = owners(key);
    if (!(matches.some(owner => owner.id === version.id) || (!matches.length && version.id === defaultRelease.id))) continue;
    const store = new VersionedWorkspaceStore(versionsRoot);
    const file = store.documentPath(key, manifest);
    manifest.documents.push({ key, file });
    files[`${directory}/${file}`] = html;
  }
  for (const page of manifest.pages) {
    const stateFile = `prototypes/${safeName(page.id)}/states.json`;
    files[`${directory}/${stateFile}`] = JSON.stringify(page.states.map(state => ({ ...state, ...(page.id === 'mine' ? { prototype: mineStates.find(item => item.id === state.id) } : {}) })), null, 2) + '\n';
    // States remain in the manifest for compatibility with existing structure editing.
    page.stateFile = stateFile;
  }
  files[`${directory}/manifest.json`] = JSON.stringify(manifest, null, 2) + '\n';
}
files['versions/index.json'] = JSON.stringify(index, null, 2) + '\n';

const dataNode = catalogSource.nodes.find(node => node.type === 'VariableDeclaration' && node.declarations.some(decl => decl.id.name === 'data'));
const auth = catalogSource.text.slice(0, dataNode.start);
const catalogTail = catalogSource.nodes.filter(node => node.type === 'VariableDeclaration' && node.declarations.some(decl => ['platformNames', 'state', 'savedRequirements', '$', 'escape'].includes(decl.id.name))).map(catalogSource.code).join('\n');
files['src/catalog.js'] = auth + '\nconst data=workspaceBootstrap.catalog;\n' + catalogTail + '\nstate.selectedRelease=workspaceBootstrap.activeVersion;\n';
files['src/workspace-ui.js'] = ui.nodes.filter(node => !removedUi.has(fnName(node)) && !isPrototypeWrapper(node)).map(ui.code).join('\n\n') + '\n';
files['src/revision-review.js'] = review.nodes.filter(node => node.start < review.nodes.find(node => fnName(node) === 'membershipRevisionApplied').start).map(review.code).join('\n\n') + '\n';
files['src/revision-review-workflow.js'] = workflow.nodes.filter(node => !(node.type === 'ExpressionStatement' && node.expression.left?.name === 'membershipRevisionApplied')).map(workflow.code).join('\n\n') + '\n';
// Keep shell CSS shared. Each snapshot loads an independent copy, so even later
// changes to generic phone primitives cannot silently restyle an older version.
files['styles/workspace.css'] = css.shared;

for (const [file, text] of Object.entries(files)) if (file.endsWith('.js')) new vm.Script(text, { filename: file });
const migrated = new Map();
for (const record of index.versions) {
  const manifest = JSON.parse(files[`versions/${record.directory}/manifest.json`]);
  for (const entry of manifest.documents) migrated.set(entry.key, files[`versions/${record.directory}/${entry.file}`]);
}
for (const [key, value] of Object.entries(snapshot.requirements)) if (key !== 'workspace:structure:v2') assert.equal(migrated.get(key), value, `迁移内容不一致: ${key}`);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
for (const file of [...Object.keys(files).filter(file => fs.existsSync(path.join(root, file))), 'src/page-prototypes.js', 'src/mine-flow.js', 'prd-data.json']) {
  const backup = path.join(root, 'migration-backups', stamp, file);
  fs.mkdirSync(path.dirname(backup), { recursive: true });
  fs.copyFileSync(path.join(root, file), backup);
}
for (const [file, content] of Object.entries(files)) atomicWrite(path.join(root, file), content);
// The two combined prototype files have been copied into each version above.
fs.unlinkSync(path.join(root, 'src/page-prototypes.js'));
fs.unlinkSync(path.join(root, 'src/mine-flow.js'));
console.log(`已拆分 ${index.versions.length} 个版本、${migrated.size} 个内容键；原始源码及数据备份：migration-backups/${stamp}`);
require('./extract-version-doc-renderers');
require('./extract-version-page-bindings');
require('./pin-workspace-assets');
