# 内容数据约定

正式环境的 `/api/requirements` 使用 Supabase，是唯一正式内容来源。

本地 `node server.js` 只读写 `prd-data.json`，用于调试编辑功能；本地改动不会访问或覆盖正式 Supabase。

需要用正式内容刷新本地时，手动执行一次单向同步：

```powershell
$env:PRODUCTION_REQUIREMENTS_URL='https://你的正式域名/api/requirements'
node scripts/pull-production-data.js
```

如果本机 Node.js 不能访问外网、但 PowerShell 可以访问，可改用：

```powershell
(Invoke-WebRequest 'https://你的正式域名/api/requirements').Content | node scripts/pull-production-data.js --stdin
```

同步脚本只发送 GET 请求，并在覆盖本地快照前创建带时间戳的备份。它不会向线上写入任何内容。

发布代码时不要调用 `/api/seed`。该接口默认禁用；即使需要人工初始化，也必须同时设置 `ALLOW_REQUIREMENTS_SEED=true` 和编辑密码。
