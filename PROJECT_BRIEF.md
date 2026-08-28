# 课表项目 · 交接说明（V12 当前状态）

> 用途：以后新开 AI 对话时，把【给 AI 的话】整段复制粘贴给助手即可，不用再从头讲解。
> 本文件是给"人"看的完整背景；【给 AI 的话】是精简版指令。

---

## 一、给 AI 的话（复制这段发给助手）

```
下面是一个已开发完成的前端静态网站项目，请基于这份说明协助我后续的修改。

【项目概况】
- 纯前端静态站（HTML+CSS+JS），无后端，数据从 js/data.json 用 fetch 加载。
- 部署在 GitHub Pages，账号 DDLZ43，仓库 -V12，分支 main，目录根即网站根。
- 本地路径 E:\桌面\课表项目V12。项目里"上传.bat"一键 add+commit+push 部署。

【页面结构】共 2 个页面：
1. index.html：课表速查助手。底部导航四个 tab（班级课表 / 个人课表 / 通讯录 / 统计）。
   - 顶部大标题"课表速查助手"+ 日期小标"2026 / 08 / 31 版"，居中、标题在上日期在下。
   - 逻辑在 js/app.js，数据通过 js/data-loader.js 注入全局 window.scheduleData / contactsData。
2. editor.html：代课管理助手。底部导航（修改 / 代课 / 通讯录 / 导出）。
   - 含可视化改课表（editor-table）、代课通知工具（js/daike.js）、教师通讯录、批量导入导出。
   - 代课面板输入教师姓名联调用 initTeacherSuggest（js/daike.js），支持中文+拼音首字母（用 window.matchName）。

【公共资源】
- css/style.css：两页共用样式（含夏月清新色调优化、字体美化、数字等宽字体）。
- js/data-loader.js：加载 js/data.json，统一注入 scheduleData/contactsData/SCHEDULE_DATA/CONTACTS_DATA，
  并提供 getAllClasses()/getAllTeachers()/getPinyinInitials()/matchName()/searchContacts() 等全局函数。
- js/data.json：唯一数据文件（scheduleData 课表 + contactsData 通讯录）。改这一个文件=全部页面同步。
- js/app.js：index.html 逻辑。 js/daike.js：editor.html 代课工具逻辑。
- lib/xlsx.full.min.js：Excel 解析库（导出用）。

【设计风格约定（保持统一）】
- 主题色：夏月晴蓝系，主色 #3FA7D4，端点 #35A0CF/#2F96C6/#2B8BBB，浅端 #6BC6EA/#5DBBE0。
- 背景：淡蓝渐变（#F2F8FC → #E9F3F8）。
- 底部导航：胶囊浮起风格——激活项用蓝渐变 + 白字 + 圆角 + 软投影；容器毛玻璃半透明。
- 字体：中文用 PingFang SC / Microsoft YaHei；数字用等宽字体（SF Pro Display / Tahoma）。
- 课表表格：桌面居中、左右留白均匀；手机端横向滚动、节次列 position:sticky 固定。
- 下拉框匹配高亮文字用 #35A0CF（蓝色），不要用红色。

【提醒】
- 我已删除了 import.html 和 admin.html 两个旧页面，目前项目只有 index.html + editor.html 两个页面，
  不要再提或新建这两个页面。
- 底部导航的大标题不要放图形/emoji 图标，保持简洁文字。
```

---

## 二、项目详情

### 这是什么
部署在 GitHub Pages 的静态站，共 2 个页面，共用同一份数据文件：

| 页面 | 文件名 | 名称 | 功能 |
|------|--------|------|------|
| 首页 | index.html | 课表速查助手 | 班级课表 / 个人课表 / 教师通讯录 / 统计数据 |
| 编辑器 | editor.html | 代课管理助手 | 可视化改课表 / 代课通知工具 / 通讯录 / 批量导入导出 |

### 网址（老师手机/电脑直接打开）
```
课表速查助手   https://ddlz43.github.io/-V12/
代课管理助手   https://ddlz43.github.io/-V12/editor.html
```

### 数据在哪改（唯一数据文件）
- 文件：`js/data.json`
- 内容：`scheduleData`（70 个班级课表）+ `contactsData`（227 位教师含电话）
- 关键：所有页面都从这一个文件读数据，改这一个 = 全部同步。用文本编辑器改后走"上传.bat"发布。

### 页面结构（底部导航）
- index.html：班级课表 | 个人课表 | 通讯录 | 统计
- editor.html：修改 | 代课 | 通讯录 | 导出

### 平时改课表怎么做
1. 打开 editor.html（代课管理助手）→「修改」面板
2. 选班级 → 点格子改课程 / 教师；下方可改教师电话
3. 点【保存并导出】下载新 data.json → 替换本地 js/data.json
4. 双击「上传.bat」一键上传 GitHub → 等 1~2 分钟 → 强刷（Ctrl+F5）

### 每学期换新课表
- 用 editor.html「导出」面板的导入/批量功能，生成新 data.json 后替换发布。
- 原教师电话会自动按姓名合并保留，不丢。

### 上传 / 发布
- 只有"改完数据要上线"才需要。双击「上传.bat」，自动 add+commit+push。
- 上传需能连 GitHub 的网络（国内不稳，可开代理或重试）。网站本身不需要代理。

### 常见问题
- 打开是旧数据/空白 → 浏览器缓存，强刷 Ctrl+F5 或加 ?v=数字 绕过缓存。
- 上传失败 → 网络问题，开代理或过会儿重试。
- 电脑上 .git 文件夹显示"只读" → 正常，Git 保护机制，别取消只读。

---

## 三、环境信息
```
GitHub 账号：DDLZ43
仓库：-V12（https://github.com/DDLZ43/-V12）
分支：main
远端：https://github.com/DDLZ43/-V12.git
本地路径：E:\桌面\课表项目V12
Git 凭据已配置（token 方式），日常双击「上传.bat」即可。
```

## 四、文件结构（项目根目录）
```
index.html          课表速查助手（首页）
editor.html         代课管理助手（编辑器）
css/style.css       样式（公共，夏月清新蓝 + 字体优化）
js/data.json        ★唯一数据文件
js/data-loader.js   加载 data.json，注入全局变量与工具函数
js/app.js           index.html 逻辑
js/daike.js         editor.html 代课工具逻辑
lib/xlsx.full.min.js Excel 解析库
上传.bat            一键上传脚本（本地用，不上 GitHub）
PROJECT_BRIEF.md    本交接说明
```

## 五、已完成的近期优化清单
- 删除 import.html / admin.html 两个旧页面（避免再次提起或新建）。
- 标题改名：index=课表速查助手、editor=代课管理助手；标题居中、日期靠下。
- 整体夏月清新色调：背景淡蓝渐变、蓝绿系统一、中文字体 + 等宽数字字体。
- 底部导航统一为"胶囊浮起"风格，两页一致，显眼且不突兀。
- 课表表格对齐：桌面居中留白均匀、手机横向滚动、节次列 sticky、容器去大边框。
- 下拉框高亮文字由红色改为蓝色 #35A0CF。
- 代课/个人课表教师输入联想支持"拼音首字母"映射（用 window.matchName / getPinyinInitials）。
