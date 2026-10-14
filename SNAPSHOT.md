# 在另一台电脑继续当前快照

此分支包含当前重构代码和当前 `prd-data.json`，其中包括需求正文、版本树、页面关联和已保存的原型文案。未点击保存的浏览器编辑内容不属于快照。

安装 Node.js 和 Git 后，在终端执行：

```powershell
git clone --single-branch --branch codex/workspace-snapshot-20261014 https://github.com/chxiomen/jiahuakuang.git
cd jiahuakuang
node server.js
```

打开 http://localhost:5173。无需安装 npm 依赖，无需配置 Supabase 或复制 `.env`。通过这个本地服务保存时，只更新当前电脑项目里的 `prd-data.json`。本地编辑表单若提示密码，可以填一个自定的非空值；本地服务不会验证线上密码。

`project-mode.json` 的 `localOnly: true` 禁止云端数据库读写，包括初始化接口；`vercel.json` 的忽略构建命令跳过本分支的自动部署。请通过 `node server.js` 开发，不要将本分支直接合并到线上分支或更改这些隔离设置。

在新电脑继续修改后，可把代码和数据一起保存到此分支：

```powershell
git add src styles index.html editor-controller.js prd-data.json
git commit -m "Update workspace code and local requirements snapshot"
git push origin codex/workspace-snapshot-20261014
```

另一台电脑拉取前，先保存并提交本机修改。两台电脑轮流工作时，每次开始先 `git pull --ff-only`，结束后提交并推送；若两台电脑同时修改数据，Git 不会自动保证业务内容正确合并，需要人工核对 `prd-data.json`。

如果未来要发布重构代码，应单独提取代码改动，保留线上环境的数据配置，并排除本地快照数据和本分支的隔离设置。
