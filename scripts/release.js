#!/usr/bin/env node
// One command for a checked release. Run from a clean production main checkout.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const publish = args.includes('--publish');
const option = name => {
  const entry = args.find(arg => arg.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : null;
};
const unknown = args.filter(arg => arg !== '--publish' && !/^--(url|data-keys|local-file)=/.test(arg));
if (unknown.length) throw new Error(`未知参数：${unknown.join(', ')}`);
const baseUrl = (option('--url') || process.env.PRODUCTION_URL || 'https://jiahuakuang.vercel.app').replace(/\/$/, '');
const selectedKeys = option('--data-keys')?.split(',').map(key => key.trim()).filter(Boolean) || [];
const localFile = path.resolve(root, option('--local-file') || process.env.LOCAL_REQUIREMENTS_FILE || 'prd-data.json');
const reportRoot = path.join(root, 'release-reports');
const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + process.pid;
const outputDir = path.join(reportRoot, runId);
const initialStatus = publish ? '未执行' : '未执行（只读计划）';
const report = {
  runId, mode: publish ? 'publish' : 'plan', url: baseUrl,
  startedAt: new Date().toISOString(), branch: null, commit: null,
  checks: [], dataDiff: null, backup: null,
  status: { codeOnline: initialStatus, dataOnline: initialStatus, localSynced: initialStatus },
  error: null
};

function git(...command) {
  return execFileSync('git', command, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function check(name, passed, detail) {
  report.checks.push({ name, passed, detail });
  return passed;
}
function validRequirements(payload, label) {
  if (!payload || !payload.requirements || typeof payload.requirements !== 'object' || Array.isArray(payload.requirements) ||
      Object.entries(payload.requirements).some(([key, value]) => !key || typeof value !== 'string')) {
    throw new Error(`${label}没有有效的 requirements 键值数据`);
  }
  return payload.requirements;
}
async function getJson(endpoint) {
  const response = await fetch(`${baseUrl}${endpoint}`, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`${endpoint} 返回 HTTP ${response.status}`);
  return response.json();
}
function compare(local, production) {
  const localOnly = Object.keys(local).filter(key => !(key in production)).sort();
  const onlineOnly = Object.keys(production).filter(key => !(key in local)).sort();
  const changed = Object.keys(local).filter(key => key in production && local[key] !== production[key]).sort();
  return { localCount: Object.keys(local).length, onlineCount: Object.keys(production).length, localOnly, onlineOnly, changed };
}
function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
function syncLocal(production) {
  const current = JSON.parse(fs.readFileSync(localFile, 'utf8'));
  const before = validRequirements(current, '本地快照');
  if (!compare(before, production.requirements).changed.length &&
      !compare(before, production.requirements).localOnly.length &&
      !compare(before, production.requirements).onlineOnly.length) return '已一致，无需写入';
  const localBackup = path.join(outputDir, 'local-before.json');
  fs.copyFileSync(localFile, localBackup);
  const next = {
    requirements: production.requirements,
    updatedAt: production.updatedAt || null,
    source: 'production-snapshot',
    pulledAt: new Date().toISOString()
  };
  const temporary = `${localFile}.${runId}.tmp`;
  writeJson(temporary, next);
  fs.renameSync(temporary, localFile);
  const saved = validRequirements(JSON.parse(fs.readFileSync(localFile, 'utf8')), '同步后本地快照');
  const difference = compare(saved, production.requirements);
  if (difference.changed.length || difference.localOnly.length || difference.onlineOnly.length) throw new Error('本地回读校验失败');
  return `已同步 ${Object.keys(saved).length} 条；原本地快照：${localBackup}`;
}
function saveReport() {
  fs.mkdirSync(outputDir, { recursive: true });
  report.finishedAt = new Date().toISOString();
  writeJson(path.join(outputDir, 'report.json'), report);
  const diff = report.dataDiff || { localOnly: [], onlineOnly: [], changed: [] };
  const lines = [
    `# 发布报告 ${runId}`, '',
    `- 模式：${report.mode === 'publish' ? '发布' : '只读计划'}`,
    `- 正式站：${report.url}`,
    `- 分支／提交：${report.branch || '未知'} / ${report.commit || '未知'}`,
    `- 代码已上线：${report.status.codeOnline}`,
    `- 数据已上线：${report.status.dataOnline}`,
    `- 本地已同步：${report.status.localSynced}`,
    `- 正式数据备份：${report.backup || '未创建'}`,
    '', '## 发布前检查', '',
    ...report.checks.map(item => `- ${item.passed ? '通过' : '未通过'}：${item.name} — ${item.detail}`),
    '', '## 本地与正式数据差异', '',
    `- 本地独有（${diff.localOnly.length}）：${diff.localOnly.join('、') || '无'}`,
    `- 正式站独有（${diff.onlineOnly.length}）：${diff.onlineOnly.join('、') || '无'}`,
    `- 同键不同内容（${diff.changed.length}）：${diff.changed.join('、') || '无'}`,
    '', `- 本次指定发布的数据键：${selectedKeys.join('、') || '无，正式站数据为准'}`,
    ...(report.error ? ['', `## 错误`, '', report.error] : []), ''
  ];
  fs.writeFileSync(path.join(outputDir, 'report.md'), lines.join('\n'), 'utf8');
  console.log(`发布报告：${path.join(outputDir, 'report.md')}`);
}
async function waitForCommit(sha) {
  const deadline = Date.now() + 180000;
  let last = '尚未响应';
  while (Date.now() < deadline) {
    try {
      const release = await getJson(`/api/release?t=${Date.now()}`);
      last = release.commit || '部署尚未提供提交号';
      if (release.commit === sha) return;
    } catch (error) { last = error.message; }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  throw new Error(`代码已推送，但正式站未在 3 分钟内返回目标提交 ${sha}；最后状态：${last}`);
}
async function run() {
  const parsedUrl = new URL(baseUrl);
  if (parsedUrl.protocol !== 'https:') throw new Error('正式站 URL 必须是 HTTPS');
  if (new Set(selectedKeys).size !== selectedKeys.length) throw new Error('--data-keys 有重复键');
  report.branch = git('branch', '--show-current');
  report.commit = git('rev-parse', 'HEAD');
  const projectModeFile = path.join(root, 'project-mode.json');
  const projectMode = fs.existsSync(projectModeFile) ? JSON.parse(fs.readFileSync(projectModeFile, 'utf8')) : { localOnly: false };
  check('生产分支', report.branch === 'main', `当前：${report.branch}`);
  check('云端模式', projectMode.localOnly === false, `localOnly=${projectMode.localOnly}`);
  const status = git('status', '--porcelain');
  check('工作区干净', !status, status ? '存在未提交文件，发布前需先处理' : '无未提交文件');
  const localPayload = JSON.parse(fs.readFileSync(localFile, 'utf8'));
  const local = validRequirements(localPayload, '本地快照');
  const beforePayload = await getJson('/api/requirements');
  const online = validRequirements(beforePayload, '正式站');
  check('正式数据源', beforePayload.environment !== 'local' && beforePayload.dataSource !== 'local-snapshot', '已读取正式站需求接口');
  report.dataDiff = compare(local, online);
  check('指定数据键在本地存在', selectedKeys.every(key => key in local), selectedKeys.filter(key => !(key in local)).join('、') || '通过');
  check('数据写入凭据', !selectedKeys.length || Boolean(process.env.EDITOR_PASSWORD), selectedKeys.length ? (process.env.EDITOR_PASSWORD ? '已提供' : '指定了数据键但缺少 EDITOR_PASSWORD') : '无需写入正式数据');
  console.log(`差异：本地独有 ${report.dataDiff.localOnly.length}，正式站独有 ${report.dataDiff.onlineOnly.length}，内容不同 ${report.dataDiff.changed.length}`);
  if (!publish) {
    console.log(`发布检查：${report.checks.filter(item => !item.passed).length} 项阻断`);
    return;
  }
  if (report.checks.some(item => !item.passed)) throw new Error('发布前检查未通过；请查看报告');
  // Read the remote tip without changing local refs. A push still enforces fast-forward.
  const remote = git('ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0];
  check('远端 main 可读取', /^[0-9a-f]{40}$/.test(remote), remote || '未返回提交');
  if (remote !== report.commit) {
    const isAncestor = (() => { try { execFileSync('git', ['merge-base', '--is-ancestor', remote, report.commit], { cwd: root, stdio: 'ignore' }); return true; } catch { return false; } })();
    check('可快进推送', isAncestor, isAncestor ? `${remote} → ${report.commit}` : '远端提交不在本地历史中');
  }
  if (report.checks.some(item => !item.passed)) throw new Error('Git 检查未通过；请查看报告');
  fs.mkdirSync(outputDir, { recursive: true });
  const backup = path.join(outputDir, 'production-before.json');
  writeJson(backup, beforePayload);
  report.backup = backup;
  console.log(`正式数据已备份：${backup}`);
  if (remote !== report.commit) git('push', 'origin', 'HEAD:refs/heads/main');
  const pushed = git('ls-remote', 'origin', 'refs/heads/main').split(/\s+/)[0];
  if (pushed !== report.commit) throw new Error('远端 main 未指向本次提交');
  report.status.codeOnline = '已推送 GitHub，等待正式站验证';
  await waitForCommit(report.commit);
  report.status.codeOnline = `已验证正式站提交 ${report.commit}`;
  let afterPayload = await getJson('/api/requirements');
  validRequirements(afterPayload, '部署后正式站');
  if (selectedKeys.length) {
    const changedOnline = selectedKeys.filter(key => online[key] !== afterPayload.requirements[key]);
    if (changedOnline.length) throw new Error(`正式数据在发布期间发生变化，已停止写入：${changedOnline.join('、')}`);
    const writes = selectedKeys.filter(key => local[key] !== online[key]).map(key => ({ key, html: local[key] }));
    if (writes.length) {
      const password = process.env.EDITOR_PASSWORD;
      if (!password) throw new Error('缺少 EDITOR_PASSWORD；代码已上线，数据尚未写入');
      const response = await fetch(`${baseUrl}/api/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-editor-password': password },
        body: JSON.stringify({ items: writes }),
        signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) throw new Error(`正式数据写入失败：HTTP ${response.status}`);
      afterPayload = await getJson('/api/requirements');
      validRequirements(afterPayload, '数据写入后正式站');
      const failed = writes.filter(item => afterPayload.requirements[item.key] !== item.html);
      if (failed.length) throw new Error(`正式数据回读不一致：${failed.map(item => item.key).join('、')}`);
    }
    report.status.dataOnline = `已验证 ${selectedKeys.length} 个指定键（写入 ${writes.length} 个）`;
  } else {
    report.status.dataOnline = `正式站数据保持为准，已回读 ${Object.keys(afterPayload.requirements).length} 条`;
  }
  report.status.localSynced = syncLocal(afterPayload);
}

run().catch(error => {
  report.error = error.message;
  console.error(`发布流程失败：${error.message}`);
  process.exitCode = 1;
}).finally(saveReport);
