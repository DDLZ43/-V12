---
description: 本项目必须遵守的核心规则
---

# 项目核心规则

1. 一律用中文回复。
2. 不要改写 js/data.json 的数据内容（除非用户明确要求）。
3. 站点为纯静态、部署在 GitHub Pages；数据由 js/data-loader.js 注入 window.scheduleData / window.contactsData，初始化用 __whenDataReady__(fn)。
4. 需要项目详细背景（页面结构、脚本清单、data.json 结构等）时，让我读取 PROJECT_BRIEF.md、项目说明.txt 或对应源文件即可，不必预置。
5. 修改 CSS/JS 后提醒用户强刷（Ctrl+F5）清缓存看效果。

## 一、项目概况
- 纯静态网站，部署在 **GitHub Pages**（main 分支根目录发布），无后端、无构建步骤。
- 仓库：`github.com/DDLZ43/-V12`，真实网址 `https://ddlz43.github.io/-V12/`。
- 用户：白沙小学教师。目标：手机/电脑浏览器直接打开即用。

## 二、页面结构
- **index.html** 课表速查助手（班级课表 / 个人课表 / 教师通讯录 / 统计）→ 逻辑在 `js/app.js`。
- **daike.html** 代课管理助手（底部导航三 tab：代课 / 修改 / 导入）。
  - 默认进入「代课」面板（`panel-daike` 默认 active）。
  - URL 锚点：`#daike` / `#代课` 直达代课，`#edit` / `#修改` 直达修改。
  - 「修改」页含可视化改课表（`bindTableInputs` 实时写回 `scheduleData`）、教师通讯录（可改号码）。
  - 「导入」页有 `generateData()`：粘贴 Excel 课表 → 生成 data.json，自动合并旧通讯录电话。
- 底部导航固定：`.bottom-nav`（`.bnav-btn` 等分，flex:1）。

## 三、技术栈与数据流
- 纯 HTML + CSS + 原生 JS（无框架）。
- 数据统一在 `js/data.json`，由 `js/data-loader.js` 异步注入 `window.scheduleData` / `window.contactsData`。
- 数据就绪后由 `__whenDataReady__(fn)` 回调触发初始化（editor 和 daike 都用它）。
- data.json 结构：
  ```json
  {
    "scheduleData": {
      "一1": { "星期一": { "1": { "course": "语文", "teacher": "王丽君", "room": "-" } } }
    },
    "contactsData": [ { "name": "张三", "phone": "138...", "note": "" } ],
    "periods": [1,2,3,4,5,6],
    "days": ["星期一","星期二","星期三","星期四","星期五"]
  }
  ```
- 班级命名固定「汉字年级+数字班号」，如 `一1`、`二10`、`六13`（约 70 个班由一~六各若干班组成）。
- Excel 导出用 `lib/xlsx.full.min.js`（SheetJS），`XLSX.utils` 相关。

## 四、关键 JS 模块
- `js/app.js`：index 的班级课表、个人课表、通讯录搜索（`window.matchName` 支持中文/拼音首字母）、统计。
- `js/editor`（daike.html 内联）：`fillClassSelect`、`renderClassTable`、`bindTableInputs`、`renderContacts`、`switchEditorPanel`、导入逻辑 `generateData`/`downloadData`/`copyData`。
- `js/daike.js`：`initTeacherSuggest`（搜索联想）、`doQuery`、`getTeacherCourses`、勾选节次、累积池（`accumPool`）、`buildNotif`（生成通知）、`copyNotif`（一键复制）、`doExportExcel`。
- 复制兼容：`copyNotif` → `legacyCopy`（移动端 execCommand：readonly+contentEditable+setSelectionRange+定位隐藏）→ `showManualCopy`（兜底弹手动复制条）；优先用 `navigator.clipboard`。

## 五、样式要点
- 编辑器在 daike.html 内联 `<style>` 中，含桌面/移动（`@media max-width:768px`）适配。
- 底部导航 `.bottom-nav` 固定，`left:0;right:0`，desktop padding `10px 12px`，mobile `8px 8px`。
- `.editor-wrap` 左右 padding 已与底部导航对齐（desktop `12px`，mobile `8px`），使通讯录等区域与底部按钮对齐不超宽。
- 通讯录卡片 `.contact-edit-card`、网格 `.contacts-grid`；移动端输入框 `min-width:0` 防长手机号撑宽。

## 六、修改文件时的规范
1. **语言**：对话一律用中文回复。
2. **不要动数据**：`js/data.json` 是数据文件，除非明确要求，不要改写其内容。
3. **保存 data.json 的编辑器按钮会下载文件**，替换本地 `js/data.json` 后需推送到 GitHub 才上线（参考「上传.bat」）。
4. 编辑大文件（daike.html 含大量内联 CSS/JS）用精确的替换，改动后保持括号闭合完整。
5. 改 CSS/JS 后提醒用户 **强刷（Ctrl+F5）** 清缓存看效果。

## 七、上线 / 部署约定
- 更新流程：改代码 → 用 git 提交推送到 `main`（可双击「上传.bat」或提交上传）→ 等 1-2 分钟 GitHub Pages 自动重新发布。
- 真实网址对外部管理员使用；如需隐藏可建议自定义域名（CNAME）。

## 八、权限与安全（提醒项）
- editor 的「修改」「导入」目前无权限控制，任何打开页面的人都能改。若需限制普通老师只能看「代课」，需增加登录/口令权限（尚未实现）。

## 九、常见诉求备忘
- 教师常提：隐藏真实网址（可做 CNAME 自定义域名）、限制普通老师只能代课不能改数据、手机端复制/宽度兼容。
- 新学期换代：通过编辑 data.json 或「导入」工具，班级命名、6节/天结构不变。

## 十、输出风格
- 尽量简洁高效，给出可操作步骤；涉及多个改动时先说明思路再动手。
- 代码块标注语言与文件名（如 ````javascript js/daike.js` ````）。
