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
  if (!payload || typeof payload.requirements !== 'object' || Array.isArray(payload.requirements)) {
    throw new Error('线上接口未返回 requirements 对象');
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
