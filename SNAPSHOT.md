# 在另一台电脑继续当前快照

此分支包含重构代码及 `versions/` 中按版本拆分的数据、页面原型、状态和已保存文案。`prd-data.json` 是迁移前的线上快照，日常编辑保存到 `versions/`。未保存的浏览器草稿不属于文件快照。

安装 Node.js 和 Git 后，在终端执行：

```powershell
git clone --single-branch --branch codex/workspace-snapshot-20261014 https://github.com/chxiomen/jiahuakuang.git
cd jiahuakuang
node server.js
```

打开 http://localhost:5173。无需安装 npm 依赖，无需配置 Supabase 或复制 `.env`，也无需重新迁移数据。通过这个本地服务保存时，只更新当前电脑 `versions/` 中的对应版本文件。本地编辑表单若提示密码，可以填一个自定的非空值；本地服务不会验证线上密码。

可直接打开 `http://localhost:5173/#/versions/v7.6.5/pages/payment?state=default`。浏览器地址会随页面和状态更新；「复制当前链接」便于在另一台电脑打开相同位置。若使用其他端口，相应替换地址中的端口。

`project-mode.json` 的 `localOnly: true` 禁止云端数据库读写，包括初始化接口；`vercel.json` 的忽略构建命令跳过本分支的自动部署。请通过 `node server.js` 开发，不要将本分支直接合并到线上分支或更改这些隔离设置。

在新电脑继续修改后，可把代码和数据一起保存到此分支：

```powershell
git add src styles versions assets/snapshots lib server.js index.html editor-controller.js
git commit -m "Update workspace code and local requirements snapshot"
git push origin codex/workspace-snapshot-20261014
```

另一台电脑拉取前，先保存并提交本机修改。两台电脑轮流工作时，每次开始先 `git pull --ff-only`，结束后提交并推送；若同时修改同一版本的同一份正文，仍需人工处理文件冲突。修改不同版本或页面时，文件已独立。

此架构当前通过本地 Node 服务提供版本文件 API，不能直接将本分支合并进现有生产环境。未来发布时需要为云端部署配置版本目录 API 与独立存储，再单独迁移正式内容；保持此分支的隔离设置直到完成相应工作。
