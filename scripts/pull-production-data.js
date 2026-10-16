/*
 * 显式将正式站正文复制为本地调试快照。
 * 只做“线上 -> 本地”，不向正式站发送任何写请求。
 *
 * PowerShell 示例：
 *   $env:PRODUCTION_REQUIREMENTS_URL='https://你的正式域名/api/requirements'
 *   node scripts/pull-production-data.js
 */
const fs = require('fs');
const path = require('path');
const { VersionedWorkspaceStore } = require('../lib/versioned-workspace-store');

const source = process.env.PRODUCTION_REQUIREMENTS_URL;
const useStdin = process.argv.includes('--stdin');
if (!source && !useStdin) {
  console.error('请设置 PRODUCTION_REQUIREMENTS_URL，例如：https://example.com/api/requirements');
  process.exitCode = 1;
  return;
}

let url;
if (!useStdin) {
  try {
    url = new URL(source);
    if (!/^https?:$/.test(url.protocol)) throw new Error('协议必须为 http 或 https');
  } catch (error) {
    console.error(`线上接口地址无效：${error.message}`);
    process.exitCode = 1;
    return;
  }
}

const target = path.resolve(__dirname, '..', process.env.LOCAL_REQUIREMENTS_FILE || 'prd-data.json');
const versionReference = process.argv.find(arg => arg.startsWith('--version='))?.slice('--version='.length);
const versionStore = new VersionedWorkspaceStore(process.env.WORKSPACE_DIRECTORY || (target === path.resolve(__dirname, '..', 'prd-data.json') ? path.join(__dirname, '..', 'versions') : `${target}.workspace-test`));
if (versionStore.exists && !versionReference) {
  console.error('当前数据已按版本拆分，请指定导入目标，例如 --version=v7.6.5。不会覆盖其他本地版本。');
  process.exitCode = 1;
  return;
}

async function pull() {
  let payload;
  if (useStdin) {
    const chunks=[];
    for await (const chunk of process.stdin) chunks.push(chunk);
    payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } else {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`线上接口返回 ${response.status}`);
    payload = await response.json();
  }
  if (!payload || !payload.requirements || typeof payload.requirements !== 'object' || Array.isArray(payload.requirements) || Object.values(payload.requirements).some(value => typeof value !== 'string')) {
    throw new Error('线上接口未返回 requirements 对象');
  }

  if (versionStore.exists) {
    const destination = versionStore.resolve(versionReference);
    if (!destination) throw new Error('导入目标版本不存在');
    const remote = JSON.parse(payload.requirements['workspace:structure:v2'] || '{}');
    const identities = [destination.id, destination.versionNumber, ...(destination.aliases || [])];
    const remoteVersion = remote.releases?.find(version => identities.includes(version.id) || identities.includes(version.versionNumber));
    if (!remoteVersion) throw new Error('线上数据不包含目标版本，已停止导入');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backup = path.join(process.env.WORKSPACE_DIRECTORY ? versionStore.directory : path.join(__dirname, '..'), process.env.WORKSPACE_DIRECTORY ? '.import-backups' : 'migration-backups', `pull-${stamp}`);
    fs.mkdirSync(backup, { recursive: true });
    fs.copyFileSync(versionStore.indexFile, path.join(backup, 'index.json'));
    fs.cpSync(versionStore.versionPath(destination.id), path.join(backup, destination.directory), { recursive: true });
    const structure = versionStore.structure(destination.id);
    structure.documentTitle = remote.documentTitle || structure.documentTitle;
    structure.pages = remote.pages || structure.pages;
    structure.releases.find(version => version.id === destination.id).changes = remoteVersion.changes;
    const remoteIds = [remoteVersion.id, remoteVersion.sourceId, remoteVersion.versionNumber].filter(Boolean);
    const belongs = key => remoteIds.some(id => key === `release:${id}` || key.startsWith(`model-text:${id}:`)) || remoteVersion.changes.some(item => {
      const base = item.documentKey || `change:${item.id}`;
      return key === base || key.startsWith(base + ':') || key === `change:${item.id}` || key.startsWith(`change:${item.id}:`);
    });
    const writes = Object.entries(payload.requirements).filter(([key]) => belongs(key)).map(([key, html]) => ({ key, html }));
    versionStore.write(destination.id, [{ key: 'workspace:structure:v2', html: JSON.stringify(structure) }, ...writes]);
    console.log(`已将 ${writes.length} 条线上内容导入 ${destination.versionNumber}；该版本原数据备份：${backup}`);
    return;
  }

  if (fs.existsSync(target)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backup = `${target}.${stamp}.backup`;
    fs.copyFileSync(target, backup);
    console.log(`已创建本地备份：${backup}`);
  }

  const snapshot = {
    requirements: payload.requirements,
    updatedAt: payload.updatedAt || new Date().toISOString(),
    source: 'production-snapshot',
    pulledAt: new Date().toISOString()
  };
  fs.writeFileSync(target, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`已将 ${Object.keys(snapshot.requirements).length} 条正式内容复制到本地快照。`);
}

pull().catch(error => {
  console.error(`同步失败：${error.message}`);
  process.exitCode = 1;
});
