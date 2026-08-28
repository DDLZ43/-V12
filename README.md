# 白沙小学课表系统（课表 + 代课通知）

多套功能共用同一份基础数据，手机端和电脑端都能通过网址访问，部署在 GitHub Pages。

## 项目结构

```
├── index.html          课表系统（班级课表 / 教师课表 / 通讯录）
├── editor.html         课表调整（可视化改课表 + 内嵌「代课工具」面板）
├── import.html         原始课表导入（从 Excel 生成 data.json）
├── admin.html          管理后台（数据统计）
├── js/
│   ├── data.json       ★ 唯一数据文件（课表 + 通讯录），平时只改这一个
│   ├── data-loader.js  加载 data.json 并注入所有页面
│   ├── app.js          课表系统逻辑
│   └── (data.js / contacts.js 已废弃，仅供备份参考)
├── css/style.css
└── lib/xlsx.full.min.js
```

## 改数据（平时微调）

1. 打开 `js/data.json`（用 VS Code / 记事本均可）。
2. 找到要改的位置：
   - **改课表**：`scheduleData` → 班级 → 星期 → 节次 → 修改 `course`（课程）/ `teacher`（教师）。
   - **改电话**：在 `contactsData` 里找到对应名字，改 `phone`。
3. 保存 → 上传 GitHub → 部署。课表系统、课表调整、管理后台会**同时更新**。

> 班级增删、教师增删都没关系，系统会自动根据 data.json 里的内容显示，不用改代码。

## 每学期整体换课表（从 Excel 生成）

1. 打开 `import.html`（原始课表导入）。
2. 在 Excel 中选中整个课表区域（第1行星期、第2行节次、所有班级课程和教师行），复制。
3. 粘贴到文本框，点「生成 data.json」。
4. 预览确认后「下载 data.json」，用它替换 `js/data.json`。
5. 原通讯录电话会自动保留（按教师姓名合并），不会丢。

## 部署到 GitHub Pages

详见下方「首次部署说明」与「以后更新」两节。

## 首部署（第一次）

1. 在 [github.com](https://github.com) 新建一个仓库（Public）。
2. 进入仓库 → Settings → Pages → Source 选 **Deploy from a branch**，Branch 选 `main` / `(root)`，保存。
3. 打开网址：`https://你的用户名.github.io/仓库名/`

> 完整图形步骤见下文《GitHub Pages 上传步骤》。

## 以后更新（改完数据后上线）

改完 `data.json` 后，把改过的文件重新提交并推送即可，页面地址不变。

---

详见项目根目录配套说明。如需恢复旧数据备份，参考 `js/data.old_data.js` 与 `js/contacts.old.js`。
