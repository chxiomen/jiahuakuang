// Migration helper: keep page-specific document previews in each snapshot too.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const acorn = require('internal/deps/acorn/acorn/dist/acorn');
const { writeJson, atomicWrite } = require('../lib/versioned-workspace-store');
const root = path.resolve(__dirname, '..');
const viewFile = path.join(root, 'src/requirements-view.js');
const view = fs.readFileSync(viewFile, 'utf8');
if (view.includes('function paymentRequirementVariant(')) {
  const rendererFile = path.join(root, 'src/requirement-renderer.js');
  const renderer = fs.readFileSync(rendererFile, 'utf8');
  const ast = acorn.parse(renderer, { ecmaVersion: 'latest' });
  const specific = ast.body.filter(node => ['minePageNote', 'pageNote'].includes(node.id?.name));
  const specificCode = specific.map(node => renderer.slice(node.start, node.end)).join('\n\n') + '\n';
  const genericCode = ast.body.filter(node => !specific.includes(node)).map(node => renderer.slice(node.start, node.end)).join('\n\n') + '\n';
  const variantStart = view.indexOf('const requirementsNoteWithPaymentVariants');
  const commonView = view.slice(0, variantStart);
  const businessView = view.slice(variantStart);
  const stamp = Date.now().toString();
  for (const file of [viewFile, rendererFile]) {
    const backup = path.join(root, 'migration-backups', 'document-renderers-' + stamp, path.basename(file));
    fs.mkdirSync(path.dirname(backup), { recursive: true }); fs.copyFileSync(file, backup);
  }
  const index = JSON.parse(fs.readFileSync(path.join(root, 'versions/index.json'), 'utf8'));
  for (const record of index.versions) {
    const directory = path.join(root, 'versions', record.directory);
    const manifestFile = path.join(directory, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
    atomicWrite(path.join(directory, 'prototypes/shared/document.js'), specificCode);
    atomicWrite(path.join(directory, 'documents/renderers.js'), businessView);
    manifest.prototype.documentScripts = ['prototypes/shared/document.js', 'documents/renderers.js'];
    writeJson(manifestFile, manifest);
  }
  new vm.Script(genericCode); new vm.Script(commonView);
  atomicWrite(rendererFile, genericCode); atomicWrite(viewFile, commonView);
  console.log('页面专属的需求视图与嵌入式原型已归入各版本目录');
}
