# 需求工作台结构

## 代码位置

| 文件 | 职责 |
| --- | --- |
| `index.html` | 工作台骨架和脚本加载顺序 |
| `styles/workspace.css` | 原有工作台、原型和需求样式 |
| `styles/version-model.css` | 版本子项、关联表单和原型文案编辑样式 |
| `src/catalog.js` | 内置页面、状态、首个版本的基础配置及编辑权限入口 |
| `src/page-prototypes.js` | 页面原型的 HTML、原型状态和手机预览 |
| `src/workspace-ui.js` | 导航、工具栏、页面交互和工作台布局 |
| `src/requirement-renderer.js` | 通用需求说明、表格、分区、状态和版本说明渲染 |
| `editor-controller.js` | 需求正文编辑、格式工具、撤销重做与保存 |
| `src/workspace-structure.js` | 页面目录和需求编辑辅助逻辑 |
| `src/version-model.js` | 版本、子项、文档与页面原型的关系及编辑表单 |
| `src/model-text-editor.js` | 原型文案双击编辑和按版本保存 |
| `src/requirements-view.js`、`src/mine-flow.js` | 历史需求状态和会员流程的兼容逻辑 |

当前脚本使用浏览器原生 JavaScript，按 `index.html` 中的顺序加载，无需打包。旧流程仍有少量共享状态；新增功能应优先放进对应文件，避免继续扩大 `workspace-ui.js`。

## 数据关系

```text
版本 release
  └─ 子项 item
       ├─ 需求文档 documentKey（可选）
       └─ 页面原型 model（可选）
            ├─ pageId → 页面目录中的页面
            └─ stateId → 该页面的状态
```

页面是可复用的页面身份。需求文档和原型是版本子项的两个独立关联；移除一个关联不会删除另一个。原型文案修改保存在当前版本子项和当前原型状态下，不直接改动页面模板或其他版本。

数据仍通过 `/api/requirements` 读写。`workspace:structure:v2` 保存目录和关联关系。旧的 `workspace:structure:v1` 仅在没有 v2 时读取；首次保存新结构后写入 v2。历史需求键 `change:<id>` 保持可读，新子项使用 `document:<versionId>:<itemId>`。原型文案使用 `model-text:<versionId>:<itemId>:<pageId>:<stateId>:<variant>`。这些键都存放在现有 requirements 数据源中。

## 日常操作

1. 点击版本树底部的「＋ 新版本」，填写版本号和名称。
   右键版本标题选择「重命名」，可同时修改版本号和名称。显示版本号单独保存在 `versionNumber` 中，内部 `id` 及正文、原型文案的数据键保持稳定。
2. 在目标版本下点击「＋ 添加子项」，选择需求文档、页面原型或两者。选择原型时可关联已有页面，也可新建页面；进入原型后再用预览工具栏切换页面状态。
3. 鼠标右键点击子项打开操作菜单：可重命名、选择原型、删除子项。原型选择中的「不展示」解除该子项的原型关联；解除关联和删除子项都不会级联删除页面或已保存的内容。键盘可用 Shift+F10 打开菜单。
4. 打开带原型的版本子项，先点击右侧「进入编辑」，再快速双击手机预览中的文案即可编辑；Enter 保存，Esc 取消，Shift+Enter 换行。退出需求编辑后，原型同时恢复只读，单击和双击均遵循原型正常交互，不拦截点击或触发文案编辑。
5. 需求正文使用右侧「进入编辑」操作，和原型文案分别保存。

编辑期间，原型按钮仍可单击交互，双击文案进入文本编辑。原型内部切换或弹窗请求不会替换当前需求编辑器，未保存正文和版本选择保持在当前文档；切换左侧目录仍走原有的未保存内容检查。

本地 `node server.js` 继续只读写 `prd-data.json`；正式环境仍使用 Supabase。详见 `LOCAL_DATA_WORKFLOW.md`。
