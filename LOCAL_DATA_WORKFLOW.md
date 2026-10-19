# 本地与正式数据

本地 `node server.js` 只读写 `versions/`，不会连接正式数据库。正式站使用同一套版本目录结构，通过 Supabase 的 `requirements` 表保存每个版本的独立文件覆盖。仓库内 `versions/` 是初始文件；线上保存过的文件以数据库为准。原有正式正文在首次保存到新版文件键之前仍作为当前 `v7.6.5` 的内容来源，避免代码发布覆盖后续线上编辑。

需要把线上当前版本的内容复制回本地时，显式执行：

```powershell
$env:PRODUCTION_REQUIREMENTS_URL='https://jiahuakuang.vercel.app/api/requirements'
node scripts/pull-production-data.js --version=v7.6.5
```

同步只读取线上、备份本地目标版本，并且不更新其他本地版本。`prd-data.json` 是迁移前快照，不是日常编辑的数据源。

正式站的 `/api/workspace`、`/api/requirements?version=...` 和 `/api/workspace-file` 从版本目录与数据库覆盖文件合成页面。新增版本和正文修改只保存所属版本的文件键。正式写入需要 `EDITOR_PASSWORD`，服务端连接 Supabase 仍需要 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY`。`/api/seed` 默认禁用，不用于代码发布。

代码发布后，以 `/api/release` 的提交号和 `/api/workspace` 的实际响应确认 Vercel 部署，并打开版本直达链接检查页面。代码发布不会把本地 `prd-data.json` 写入数据库。
