# 需求工作台结构

## 版本、页面和文档的独立目录

```text
index.html                         公共工作台壳
src/                               导航、路由、编辑器、通用文档组件
versions/
  index.json                       版本目录、显示版本号和旧链接别名
  <稳定版本 ID>/
    manifest.json                  本版本的子项、文档索引、页面关联和资源引用
    catalog.json                   本版本的基础配置与说明结构
    documents/
      <子项 ID>/<内容键>.html       正文、状态正文、通用说明分别保存
      outline/                     本版本需求大纲
      renderers.js                 本版本专属的需求状态视图
    prototypes/
      payment/                     付费页
        page.js                    页面布局
        interactions.js            页面交互
        page.css                   页面样式
        states.json                状态配置
        text/                      用户保存的原型文案覆盖
      renewal/                     续费管理页的对应文件
      mine/                        我的页面的对应文件
      home/、member/、custom/       其他页面和默认页面
      shared/                      此版本固定的预览壳、导航、修订适配和基础样式
assets/snapshots/<图片 SHA256>/     固定内容的图片引用，多个版本可引用同一不可变文件
```

显示版本号可以更改，目录中的稳定 ID 保持不变。例如，当前显示为 v7.6.5 的历史版本，其稳定 ID 和目录仍是 v7.5.6。`versions/index.json` 维护这层映射以及历次版本号别名。

每个版本保存独立的页面代码、交互、样式、状态和文档文件。新增版本可选择复制一个现有版本或创建空白版本。复制是文件快照，后续编辑两边互不回写；原型文案也会复制到新版本自己的数据键和文件。

原型的布局、交互和样式应修改对应版本的目录；共用目录 `src/` 用于工作台本身。图片快照文件按内容散列命名，不能直接替换；新图片可放入当前版本的页面目录，在模板中用 `WorkspaceAssets.url('prototypes/payment/assets/图片.png')` 引用。

文档与原型仍是两个独立关联。子项可以只展示文档；原型选择中的「不展示」解除关联，不删除页面或已保存内容。右键菜单、双击编辑以及编辑期间的原型交互保持原有操作方式。

## 加载和存储

`src/workspace-bootstrap.js` 先请求 `/api/workspace?version=<版本号或 ID>`，再加载所选版本的脚本与样式。切换版本会重新加载工作台，确保旧版本的全局页面函数、事件和 CSS 不会混入新版本。

`lib/versioned-workspace-store.js` 是本地存储入口。`GET /api/requirements?version=<ID>` 只聚合该版本的文件，供现有文档编辑器使用；POST 必须明确提供版本，正文和文案分别落入当前版本目录。历史内容键保留兼容，但相同键在不同版本中对应不同物理文件。目录结构键由 manifest 合成，不再依靠一个大 JSON 存放全部正文。

页面状态在 `states.json` 中读取；保存页面目录时也会同步该页面状态文件。通过弹窗新增页面时，服务会生成独立的 `page.js`、`page.css`、`states.json`，自动重新加载后即可继续编辑。

`prd-data.json` 保留为迁移前的线上数据快照，不再是迁移后本地编辑的数据源。原始文件和源码备份在忽略提交的 `migration-backups/` 中。

## 直达链接

| 地址片段 | 内容 |
| --- | --- |
| `#/versions/v7.6.5` | 版本大纲 |
| `#/versions/v7.6.5/items/c-virtual-payment` | 只有文档的子项 |
| `#/versions/v7.6.5/pages/payment?state=default` | 付费页默认态 |
| `#/versions/v7.6.5/pages/payment?state=subscription-renewing&member=svip&tab=svip` | SVIP 续费中付费页 |
| `#/versions/v7.6.5/pages/renewal?state=canceled` | 已取消续费但权益有效 |

操作页面或状态时自动更新地址，支持刷新、前进、后退；根链接恢复此浏览器上次访问的位置。页面树位置通过 `tree=page` 保留，多子项共用页面时通过 `item=<子项 ID>` 消除歧义。链接不保存编辑模式和未保存的草稿。

右上角「复制当前链接」可复制地址。版本重命名后，旧版本号继续作为别名；页面或状态不存在时显示明确错误，不会悄悄打开其他内容。

## 启动、验证与隔离

```powershell
node server.js
node --test tests/version-files.test.js
```

无需安装运行依赖。一次性迁移工具是 `node --expose-internals scripts/migrate-version-files.js`，使用 Node 自带解析器拆分旧源码并逐键验证，遇到已有版本目录会拒绝覆盖。普通开发和换电脑启动无需再运行迁移。

本地 API 只读写本地版本文件，不连接 Supabase。此快照分支仍受 `project-mode.json` 和 Vercel 跳过构建配置保护。线上导入、跨电脑同步和原有生产发布说明见 `LOCAL_DATA_WORKFLOW.md` 与 `SNAPSHOT.md`。
