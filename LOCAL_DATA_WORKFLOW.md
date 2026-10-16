# 内容数据约定

当前 `codex/workspace-snapshot-20261014` 分支用于跨电脑继续本地快照，包含代码及当前数据。启动步骤、同步方式和线上隔离设置见 [SNAPSHOT.md](SNAPSHOT.md)。

正式环境的 `/api/requirements` 使用 Supabase，是唯一正式内容来源。

本地 `node server.js` 已改为只读写 `versions/` 中的独立版本文件，正文、页面原型、状态和文案按版本保存。`prd-data.json` 保留为迁移前快照，本地改动不会访问或覆盖正式 Supabase。

需要用正式内容刷新本地时，手动执行一次单向同步：

```powershell
$env:PRODUCTION_REQUIREMENTS_URL='https://你的正式域名/api/requirements'
node scripts/pull-production-data.js --version=v7.6.5
```

如果本机 Node.js 不能访问外网、但 PowerShell 可以访问，可改用：

```powershell
(Invoke-WebRequest 'https://你的正式域名/api/requirements').Content | node scripts/pull-production-data.js --stdin --version=v7.6.5
```

同步脚本只发送 GET 请求，并在更新指定版本前，把该版本目录和索引备份到 `migration-backups/pull-<时间>/`。它只导入线上存在的对应版本，不覆盖其他本地版本，也不会替换固定的原型代码和样式。已迁移项目不提供 `--version` 时会拒绝导入，避免目标不明确。它不会向线上写入任何内容。

以下生产发布流程针对原有生产 `main`，不适用于当前按版本拆分的本地快照架构；当前分支的本地隔离开关会阻止发布。

发布代码时不要调用 `/api/seed`。该接口默认禁用；即使需要人工初始化，也必须同时设置 `ALLOW_REQUIREMENTS_SEED=true` 和编辑密码。

## 一条命令发布与报告

在**生产 `main` 分支的干净工作区**运行。快照分支的 `localOnly: true` 会被发布命令拒绝，不能直接发布。

```powershell
# 先看发布计划：检查分支、工作区及正式数据差异，只读，不发布
node scripts/release.js

# 发布已提交代码；正式 Supabase 数据保持为准，并同步回本地快照
node scripts/release.js --publish
```

命令默认使用 `https://jiahuakuang.vercel.app`。可通过 `--url=https://你的正式域名` 或 `PRODUCTION_URL` 指定其他正式站。每次运行会在被 Git 忽略的 `release-reports/<时间>/` 生成 `report.md` 和 `report.json`，列出代码已上线、数据已上线、本地已同步三个独立状态，以及差异键、检查结果和失败原因。

发布时先保存 `production-before.json` 正式数据备份，再快进推送当前提交到 GitHub `main`。正式站 `/api/release` 必须返回本次提交号，命令才认定代码已上线；最多等待 3 分钟。随后回读正式数据，并在需要时备份旧的本地 `prd-data.json` 到 `local-before.json`、同步正式内容、回读核对。发布中途失败也会保留报告和已完成步骤的状态。

Vercel 项目需启用自动暴露系统环境变量，让 `/api/release` 可以读取 `VERCEL_GIT_COMMIT_SHA`；没有提交号时，命令会把代码状态报告为未验证，不会继续写正式数据。

只有明确要把某些**本地需求键**发布到正式站时，才指定键名：

```powershell
$env:EDITOR_PASSWORD='你的编辑密码'
node scripts/release.js --publish --data-keys=change:example,document:example
```

这会只写指定且与线上不同的键，不删除线上其他内容；写入前核对这些键在发布期间没有被别人修改，写入后回读验证，然后以正式站最终内容刷新本地。密码只从环境变量读取，不进入命令参数或报告。**不要**用 `--data-keys` 发布整份旧快照。

正式数据写入与代码部署是两个独立步骤；如果后一步失败，报告会如实显示部分完成状态，不能把它当作完整发布。备份和报告应保留到确认发布完成后。
