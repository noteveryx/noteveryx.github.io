# 知识库搭建与维护说明

> 这份文档讲这个静态知识库「怎么搭起来的、用什么技术、内容是什么、每条菜单什么意思、平时怎么维护」。写给「半年后想改一个东西、但忘了当时怎么想的」的自己。

---

## 1. 项目性质

`C:\Users\42692\WorkBuddy\Claw\knowledge-base` 是一个**纯静态**个人知识库，托管在 GitHub Pages（`noteveryx/noteveryx.github.io`），无后端、无数据库、不依赖任何付费服务。开一个 `python -m http.server` 就能本地预览。

它就是**你日常积累笔记 + 资料目录**的统一入口，由一段 markdown 配合 docsify 自动渲染为网页。

除此之外还有 **43 个不经过 docsify 的独立页面**（工具 / 视觉 / 游戏），统一从 `x.html` 进入，例如画板、翻译工具、雨夜玻璃、贪吃蛇。这些页面逐页说明见 [7.7](#77-独立页面html-与-xhtml)。

---

## 2. 技术栈

| 类别 | 用了什么 | 备注 |
| --- | --- | --- |
| 静态站点引擎 | **docsify**（`assets/js/docsify.min.js`） | 客户端渲染 markdown，不需要构建步骤 |
| 主题样式 | **docsify-vue** 主题（`assets/css/vue.css`）+ `index.html` 里手写的 `<style>` 兜底 | |
| 客户端能力 | 纯 JS 插件 | docsify 钩子机制（`window.$docsify.plugins.push(fn)`） |
| 侧栏维护脚本 | **Python 3**（`update_sidebar.py`） | 没有任何第三方依赖，stdlib-only |
| 工作流自动化 | **workbuddy**（`.workbuddy/`，每天 10:30 跑脚本 + 同步到示例知识库） | workbuddy 由 Claw 项目托管 |
| 搜索引擎 | 两个**自定义** docsify 插件：<br>① `assets/js/ebook-search.js`（电子资源）<br>② `assets/js/living-better-search.js`（高性价比）<br>全站文档检索独立成页 `html/search.html`（自己建索引，不用 docsify 的 `search.min.js`） | docsify 自带的全局搜索已停用：语料 20MB → 索引 13MB，超 localStorage 10MB 配额，且每次开首页都要重抓 900+ 篇（现 937 篇） |
| 数据集 | `assets/json/books.json`（24,071 条电子书，~6.8 MB）<br>`assets/json/living-better.json`（34 章元数据，~20 KB） | 仅做静态查询，不需要服务器 |
| 独立页面 | 原生 HTML + CSS + JS，`html/` 下 43 个页面 + `x.html` 导航 | 不经过 docsify；共享能力抽成 `assets/css/*-kit.css` + `assets/js/*-kit.js`（见 7.7.5） |
| 页面翻译 | **translate.js**（由 `assets/js/translate-kit.js` 封装） | 三源自动回退加载；Edge 直连通道，无需 API Key（见 7.8.1） |
| 移动端工具坞 | **dock-kit.js**（自研） | 手机端把散落的悬浮按钮收进一个可折叠坞，桌面端自动还原（见 7.8.2） |

---

## 3. 目录结构

```
knowledge-base/
├── index.html                 # docsify 入口；自定义 <style> + 插件 <script> 都集中在此
├── README.md                  # docsify 首页（自动维护：今日新增 + 统计 + 仓库地址 + 访问地址）
├── _sidebar.md                # 左侧导航（自动维护）
├── update_sidebar.py          # 侧栏 + README 维护脚本
├── syzw_personal_index.json   # （遗留，私人索引；当前未直接被 docsify 使用）
├── x.html                     # 独立页面导航（工具 / 氛围屏 / 生成器 / 游戏，自带主题与检索）
├── html/                      # 独立页面（43 个，静态托管，不走 docsify）—— 逐页说明见 7.7
│   ├── search.html            # 全站文档检索：自己抓 md 建索引，索引存 IndexedDB
│   ├── tool-*.html   ×14      # 工具页（工具箱骨架 toolbox.css/js）
│   ├── visual-*.html ×15      # 视觉页（全屏 canvas + 调色盘）
│   ├── game-hub.html          # 游戏中心（卡片索引）
│   └── game-*.html   ×12      # 游戏页（game-kit 骨架）
├── assets/                    # 静态资源
│   ├── css/
│   │   ├── vue.css            # docsify 主题；字体已本地化（@font-face 指向 ../fonts/）
│   │   ├── themes.css         # 独立页面 7 套主题变量（emerald/midnight/sunset/ink/violet/stone/crimson，深浅交替）
│   │   ├── theme-kit.css      # 主题切换按钮 + 面板
│   │   ├── toolbox.css        # 工具箱页骨架（页头 / tab / 卡片 / 输入 / 按钮）
│   │   ├── game-kit.css       # 游戏页骨架（HUD / 工具列 / 方向键）
│   │   ├── palette-kit.css    # 调色盘（悬浮球 + 面板）
│   │   └── text-kit.css       # 句子条组件
│   ├── js/
│   │   ├── docsify.min.js / sidebar-collapse.min.js / docsify-copy-code.min.js / zoom-image.min.js
│   │   ├── search.min.js      # （已停用，文件保留备用；不再在 index.html 引用）
│   │   ├── ebook-search.js / living-better-search.js / static-pages.js
│   │   ├── theme-kit.js / toolbox.js / game-kit.js / palette-kit.js
│   │   ├── fs-kit.js / save-kit.js / text-kit.js / quotes-data.js / qrcode.js
│   │   ├── translate-kit.js / dock-kit.js   # 全站注入：页面翻译 / 手机端工具坞
│   │   └── panel-kit.js              # 面板互斥：页面自绘浮层接入 kb:panel-open 广播
│   ├── fonts/                 # 本地 woff2（Source Sans Pro ×3 + Roboto Mono，~56 KB）
│   ├── image/                 # 图标 / logo / favicon
│   └── json/
│       ├── books.json         # 电子资源数据
│       └── living-better.json # 高性价比章节元数据
└── docs/                      # 一切 markdown 内容（每个子目录 = 一个栏目）
    ├── 电子资源.md            # 单页入口（搜索 UI 由 ebook-search.js 渲染）
    ├── 电子资源/              # 仅 books.json（无 .md，因此不会作为子项出现在侧栏）
    ├── 高性价比.md            # 单页入口（搜索 UI 由 living-better-search.js 渲染）
    ├── 高性价比/              # 34 个章节文件（01-不要早死.md ... 34-家里的常备药别吃出事.md）
    ├── 寓言故事/              # 27 个 *.md（侧栏以栏目形式列出）
    ├── 申论/                  # 92 个 *.md，按日期命名（2026-XX-XX.md）
    ├── 讲话稿/                # 95 个 *.md
    ├── 软考/                  # 686 个 *.md，7 个科目子目录（每科 94~101 篇）
    │   ├── （中级）信息系统管理工程师/
    │   ├── （中级）信息系统监理师/
    │   ├── （中级）系统集成项目管理工程师/
    │   ├── （高级）系统分析师/
    │   ├── （高级）系统架构设计师/
    │   ├── （高级）系统规划与管理师/
    │   └── （高级）信息系统项目管理师/
    └── 示例/                  # 一个使用指南 .md
```

---

## 4. 每个菜单都是干什么的

侧栏从上到下：

### 4.1 首页（`* [首页](/)`）
docsify 自带：点一下回到 `README.md`，那里有今日新增的文章列表 + 总文章数 + 最后更新日期 + 仓库地址。

### 4.2 电子资源（`* [电子资源](docs/电子资源.md)`）
单页面入口。打开后看到：
- 一个全库搜索框（24,071 本电子书，标题 / 作者 / 分类关键词）
- 「热门分类」chips，点击自动按分类筛选

搜索 UI 由 `assets/js/ebook-search.js` 在 docsify `doneEach` 钩子里渲染；数据来自 `assets/json/books.json`。本菜单**已锁定**（见第 6 节）。

### 4.3 高性价比（`高性价比` + 34 个章节子项）
单页面入口 + 34 章节目录。打开后看到：
- 搜索框（按章节标题 / 摘要关键词过滤，34 张卡片）
- 34 个章节卡片，点击进入对应章节

搜索 UI 由 `assets/js/living-better-search.js` 渲染；数据 `assets/json/living-better.json`。**章节按编号正序排列**（01, 02, ..., 34），因为这内容是「按性价比排序的人生指南」，阅读顺序有意义。本菜单**已锁定**。

### 4.4 寓言故事
寓言 / 故事类笔记，目前 27 篇，侧栏以栏目形式整体列出（无单页入口）。

### 4.5 申论
日常公考笔记，按日期命名：`docs/申论/2026-XX-XX.md`，侧栏默认**倒序排**（最新在上）。目前 92 篇。

### 4.6 讲话稿
领导讲话 / 致辞类笔记，同样按日期倒序。目前 95 篇。

### 4.7 软考
软件资格考试笔记。按级别分目录，再按具体科目分子目录：

```
软考/
├─ （中级）系统集成项目管理工程师 /    ← 第一位（用户偏好顺序）
├─ （中级）信息系统监理师 /            ← 第二位
├─ （中级）信息系统管理工程师 /        ← 第三位
├─ （高级）信息系统项目管理师 /
├─ （高级）系统分析师 /
├─ （高级）系统架构设计师 /
└─ （高级）系统规划与管理师 /
```

中级 3 个的相对顺序由 `update_sidebar.py` 顶部 `SOFT_EXAM_MIDDLE_ORDER` 常量控制，将来再考到新的中级证书（比如软件设计师）就在那里加一条。高级按字母序排，没有专门锁定。

### 4.8 示例
给新人 / 未来的自己看的一份使用指南，目前只有一个 markdown。

### 4.9 独立页面入口（`x.html`）

侧栏之外还有一整套独立页面，入口是**站点根路径的 `x.html`**（不在 docsify 侧栏里）。打开后是一页卡片导航，按区块分组：

| 区块 | 数量 | 内容 |
| --- | --- | --- |
| 🧰 工具 | 5 | 全站搜索、翻译工具、快捷复制、句子收藏、待机展示 |
| ⚡ 效率工具 | 7 | 取色器、文本工具箱、图片处理台、文本对比、番茄钟、二维码、素材库 |
| 🌌 氛围屏 | 5 | 极光、星空漫游、雨夜玻璃、雪落、实时天光 |
| 👆 交互视觉 | 5 | 波浪点阵、分形缩放、粒子引力场、文字形变、粒子文字 |
| ✨ 生成器 | 5 | 句子海报、曼陀罗、渐变配色、噪声壁纸、像素头像 |
| 🖌️ 画板 | 2 | 手写板、画板 |
| 🎮 小游戏 | 13 | 游戏中心 + 12 个游戏 |
| 🛡️ 行动突围护航社 | 1 | 独立活动页 |
| 🧭 快捷导航 | 30 | 常用外部站点直达 |

页面本身附带：**主题切换**（7 套，存 `tk_theme`）、**页面翻译**（28 种语言，存 `kb_translate_lang`）、**页面目录**（悬浮按钮 → 9 个板块一键跳转 + 回到顶部，板块锚点为 `#sec-tools`…`#sec-nav`）、卡片图标徽章、滚动入场动效、实时时间 + 两地天气。

手机端所有悬浮工具按钮会收进**可折叠工具坞**（右下角 `⋮`），页面自己的底部工具条保持在屏幕最下方，详见 7.8.2。

---

## 5. 内容是如何维护的

### 5.1 写一篇新内容

| 栏目 | 文件路径 |
| --- | --- |
| 寓言故事 | `docs/寓言故事/<名字>.md` |
| 申论 | `docs/申论/<YYYY-MM-DD>.md` |
| 讲话稿 | `docs/讲话稿/<YYYY-MM-DD>.md` |
| 软考 中级 | `docs/软考/（中级）<科目名>/<YYYY-MM-DD>.md` |
| 软考 高级 | `docs/软考/（高级）<科目名>/<YYYY-MM-DD>.md` |
| 示例 | `docs/示例/<名字>.md` |
| 高性价比章节 | `docs/高性价比/<NN-章节标题>.md` |

- **日期流栏目**（申论 / 讲话稿 / 软考）：**文件名 = 日期**，否则侧栏可能不会出现在当日「今日新增」列表里。
- **章节流**（高性价比）：**`NN-标题.md`**，必须两位数编号（`01-`, `02-`, ..., `34-`），否则 `smart_sort_files` 会按字母序而不是章节序排。
- **文章内首行可以写副标题**，但不强求。

### 5.2 写完之后会发生什么

`docs/` 下新建一个 `.md`，本身**不会**自动出现在侧栏里。侧栏是「下一次跑 `update_sidebar.py` 才生成」的。

> 所以：**写完文件后等下一次每日 10:30 自动跑**，或者**手动跑**一次 `python update_sidebar.py`。

---

## 6. 侧栏 / 首页是如何更新的

### 6.1 自动化

workbuddy (`C:\Users\42692\WorkBuddy`) 配了一条**每天 10:30 自动跑**的 cron，命令大致是：

```
cd <kb-path>
python update_sidebar.py
```

它在后台跑，先备份，再做下面三件事。日志会写到 `<kb-path>/.workbuddy/memory/<YYYY-MM-DD>.md`。

### 6.2 手动跑

```powershell
cd C:\Users\42692\WorkBuddy\Claw\knowledge-base
python update_sidebar.py
```

`update_sidebar.py` 做的事：

1. **解析** `_sidebar.md`，把它拆成 `SIDEBAR_ENTRIES`（有序的条目列表）：
   - `kind: home` ← `* [首页](/)`
   - `kind: manual` ← `* [名称](路径)` 形状的单链条目
   - `kind: section` ← 后面跟着缩进子项的栏目
2. **扫描** `docs/` 目录，构造 `dir_map`（目录 → (文件列表, 路径前缀)）：
   - 软考子目录用 `SOFT_EXAM_MIDDLE_ORDER` 常量排序（用户偏好：中级 system集 → 监 → 管）
   - 其他按 `natural_sort_key` 排
   - 文件名按 `smart_sort_files` 自动判别：数字前缀（如 `01-不要早死`）→ 升序，日期前缀（`2026-XX-XX`）→ 降序
3. **生成**新 `_sidebar.md`：
   - 按 `SIDEBAR_ENTRIES` 顺序逐块渲染（保留用户已存在的所有项原位）
   - 兜底补回 `LOCKED_ENTRIES`（首页 / 电子资源 / 高性价比）
   - 末尾追加新发现的目录（不影响已存在的项）
4. **生成** README.md 的「今日新增」表：
   - 顺序按 `HOME_TOP_LEVEL_ORDER` + `SOFT_EXAM_MIDDLE_ORDER`（与侧栏一致）

### 6.3 加新菜单 / 改菜单的常用操作

| 我想 | 操作 |
| --- | --- |
| 加一个**有 .md 文件的栏目**（如「外语笔记」） | 在 `docs/外语笔记/` 放一个 `2026-XX-XX.md`，下次跑 `update_sidebar.py` 自动出现在侧栏末尾 |
| 加一个**单页入口菜单**（如「工具箱」） | 1) 写 `docs/工具箱.md` <br>2) 在 `_sidebar.md` 顶部加一行 `* [工具箱](docs/工具箱.md)`<br>3) 想永久不被自动机搞掉，在 `update_sidebar.py` 的 `LOCKED_ENTRIES` 里也加一条 |
| 调**侧栏里某栏目的顺序** | 直接在 `_sidebar.md` 拖动，下次跑会保留你的顺序 |
| 调**今日新增表格里科目的顺序** | 改 `update_sidebar.py` 里的 `SOFT_EXAM_MIDDLE_ORDER` 或 `HOME_TOP_LEVEL_ORDER` |
| **删掉**某栏目（连目录一起删） | 直接删 `docs/<栏目名>/` 目录，下次跑 `update_sidebar.py`，侧栏会无痕消失 |
| **删掉**「电子资源」/「高性价比」 | 不能删——已锁定。你真要删，去 `update_sidebar.py` 顶部 `LOCKED_ENTRIES` 数组里删对应 entry |

### 6.4 锁定菜单

```python
LOCKED_ENTRIES = [
    {'kind': 'manual',  'line':  '* [电子资源](docs/电子资源.md)', 'name': '电子资源'},
    {'kind': 'section', 'title': '高性价比',                       'name': '高性价比'},
]
```

意思是：无论 `_sidebar.md` 怎么变，下次跑脚本，**首页 + 电子资源 + 高性价比 这 3 个必须存在并保持原位**。如果 `_sidebar.md` 里缺失，脚本会自动重建并打印 `[lock] auto-restored: ...` 日志。

这是**实测过**的：把 `_sidebar.md` 删到只剩 `首页`，再跑脚本，输出里会出现「auto-restored: 电子资源」「auto-restored: 高性价比」，侧栏自动长回来。

---

## 7. 自定义插件速查

### 7.1 `assets/js/ebook-search.js`
- 路由匹配：当前 hash 含「电子资源」时初始化
- 数据：`assets/json/books.json`，fallback 路径 `../assets/json/books.json` / `/assets/json/books.json`
- 渲染：搜索框 + 状态行 + 热门分类 chips（top 30，按数量降序）+ 结果列表（卡片 100 条上限）
- 命令行：`python -m http.server 8765` 启动后访问 `/docs/电子资源.md`

### 7.2 `assets/js/living-better-search.js`
- 路由匹配：当前 hash 含「高性价比」时初始化
- 数据：`assets/json/living-better.json`
- 渲染：搜索框 + 34 张章节卡片（按编号升序）
- 命令行：同上路径 `/docs/高性价比.md`

### 7.3 `index.html` 里的 `<style>` 段
集中在 `<head>` 里这一段，主要做：
- 一级菜单**常驻加粗**（vue.css 默认不粗，只有 `.active` 才粗）
- 子级菜单**保持细体 + 13px**
- 一级 `<a>` 和 `<p>`（无链接标题）都加 `cursor: pointer !important` + `text-decoration: underline !important` on hover
- 用 `:not(:has(ul))` 排除掉「包里嵌了子项的 `<p>`」（首页那种），避免下划线继承到子项

### 7.4 `html/search.html`：全站文档检索（独立页）

**为什么不用 docsify 自带的全局搜索**：
- 语料约 20MB（现 937 篇 md），docsify 生成的搜索索引约 13MB，**超过 localStorage 的 10MB 配额**，
  索引永远存不进缓存；而插件「先写 expires 再写 index」，index 写失败后 expires 已落盘，
  下次访问插件读到 `null` 直接抛 `TypeError` —— 表现为**第二次打开首页，全局搜索彻底失效**。
- 更要命的是，为了建这个索引，每次打开首页都要抓近千篇 md（约 20MB），首页要等十几秒。
- 既然「速度第一」，就把搜索整个搬走：首页不再挂 `search.min.js`，首页零开销。

**独立页怎么工作**：
1. 读 `_sidebar.md` 拿到全站文档清单（现 937 个 md 路径）—— 侧栏本来就是全站目录，不用另建索引。
2. 并发（8 路）抓每篇 md，本地做轻量 Markdown → 纯文本转换，内存里建索引。
3. 整份索引用 `CompressionStream('gzip')` 压成**一条**记录存进 IndexedDB
   （逐篇存会有 883 次事务/反序列化，实测要 100 秒以上；压成 1 条后读写都是毫秒级）。
4. 再次打开：先读本地缓存 → **立刻可搜**，同时后台用 `If-Modified-Since` 条件请求静默同步，
   只有变了的文件才会被替换。

**实测数据（2026-11，本机 + 内存预读静态服务器，排除 Defender 实时扫描干扰；下表数字是当时 882 篇的口径，现语料已增至 937 篇，请求数与耗时同步上浮约 6%）**：

| 场景 | 结果 |
| --- | --- |
| 首页 md 请求数 | **2 个**（README.md + _sidebar.md）—— 移除全局搜索前是 **883 个** |
| 首页零外网请求 / 零 JS 报错 | ✅ |
| 搜索页首次建索引 | 882 篇 · 4.6MB 正文 · **1.9 ~ 4.2 秒**可搜 |
| 搜索页二次打开 | **285 ~ 750 ms** 可搜（走 IndexedDB），后台同步 882 个请求全部命中 **304** |
| 搜索页首轮加载页面资源 | 888 个请求（1 个 HTML + 3 个 CSS/JS + 883 个 md + 1 个 sidebar） |

**踩过的坑（改这个文件前先看）**：
- 提取标题的正则**不能**写成 `/^\s{0,3}#{1,3}\s+(.+)$/m`：`\s` 含换行，`(.+)$` 匹配失败后会**跨行回溯**，
  近千篇文档能白白吃掉 100 多秒。行首/行尾的空白一律用 `[ \t]`。
  现在 `pickTitle()` 直接按行扫、只匹配单行，不存在跨行回溯。
- **标题要优先取第一个 Markdown 标题行**（`#` / `##` / `###`）：
  有 36 篇文档第一行是「[← 回XX总目录](/docs/XX)」这种跳转链接，
  只取「首个非空行」会让搜索结果的标题变成一串链接文本，完全没法看。
  纯链接行要在 fallback 时跳过。
- Markdown → 纯文本那 12 条正则同理，行首空白都用 `[ \t]`。
- 进度条不要每篇都刷一次 DOM（重排 + 过渡动画），要节流到 ~8 次/秒。
- 抓文件一律 `cache: 'no-cache'`：默认缓存会把 883 个响应写进磁盘缓存，
  在 Windows 上逐个落盘 + 实时扫描，能把 8 秒的抓取拖成 2 分钟。
- **并发池不能让「promise 链推进」来决定进度**：早期版本用 `pool.then(next).then(next)` 串行推进，
  结果 882 篇里有 7 篇的响应没能结算，整批**永远卡在 875/882**，而且既没有超时也没有 unhandledrejection。
  现在 `runPool()` 让每个请求**独立结算 + 独立兜底**，882 篇全部拿到，3.4 秒收工。
- `window.__perf` 这种打点对象要先 `window.__perf = window.__perf || {}` 建好：
  在 `'use strict'` 下给 `undefined` 赋值属性会抛 TypeError，被 `try/catch` 吞掉后**所有打点静默失效**。

### 7.5 工具箱页面的布局规范（`assets/css/toolbox.css`）

改工具页样式前先看这一节，能少踩很多坑。

**1. 必须归一盒模型**
```css
.tb-page, .tb-page *, .tb-page *::before, .tb-page *::after { box-sizing: border-box; }
```
`.tb-ta` / `.tb-in` / `.tb-sel` 都写了 `width: 100%`，不归一时实际宽度 = 100% + 左右 padding + 左右 border，
**必然溢出容器**。实测：文本对比页并排的两个 textarea 各自溢出 26px，而列间距只有 12px ——
左边的框直接压到右边的框上，PC 和手机端都糊成一片。

**2. 输入控件字号必须 ≥ 16px（移动端）**
iOS Safari 聚焦字号小于 16px 的输入框时会**自动放大整个页面**，页面被撑大、滚动位置跳走。
`.tb-ta` / `.tb-in` / `.tb-sel` 在 `max-width: 640px` 下一律提到 16px。
（`checkbox` / `radio` / `file` 有显式尺寸，不受字号影响，不在此列。）

**3. `input[type="range"]` 要清掉 UA 的 `margin: 2px`**
Chrome 默认给 range 加了 `margin: 2px`，配合 `width: 100%` 就会横向溢出 2px。

**4. 卡片标题栏要「压得住」**
`.tb-card-title` 是 `display: flex`，加上继承来的 `line-height: 1.6`，
13.5px 的字在 21.6px 行盒里居中 —— 视觉上文字下半截紧贴下方控件的边框，看着像被「切掉一半」。
现在：`line-height: 1.4`、`margin-bottom: 16px`、`position: relative; z-index: 1`。

**5. `textarea` 要 `display: block`**
UA 默认是 `inline-block`，会带一段基线间隙，在卡片里跟标题贴得更近。

**6. 窄屏 tab 换行**
5 个子工具的 tab 在 390px 宽下横滑会把最后一个切掉一半，改成 `flex-wrap: wrap` 全部可见。

**7. 图片处理页必须把「绘制」和「编码」拆开**

`tool-image.html` 的每个子工具都走 `buildPanel()`，它约定两个回调：

```js
buildPanel(panel, {
  paint: function (state, maxEdge) { /* 纯绘制，返回 canvas，同步 */ },
  run:   function (state) { /* 绘制 + encode 成 blob + 返回结果文字 */ }
});
```

`paint` 给实时预览用（`PREVIEW_MAX = 1400`，几毫秒一次，拖滑块跟手），
`run` 只在点按钮时跑（`MAX_EDGE = 4096`，要 `toBlob`，慢）。

**踩过的坑**：原来只有 `run`，把绘制、`encode`、写预览三件事捆在一起，
结果是拖旋转滑块只有数字在变，预览必须点按钮才更新。
现在参数区用事件委托（`input` + `change`）触发 `refreshPreview()`，一个 rAF 只画一次。

注意两点：
- 字号、坐标这类**像素值必须乘 `workCanvas()` 返回的 `scale`**，否则预览小图上水印会大得离谱。
- 点按钮类的参数（如翻转按钮）不走 `input` 事件，按钮回调里要手动调 `ui.refresh()`。

**验证方式**（改完必跑）：
`layout-regress` 检测脚本扫 320/360/390/414/480/640/768/1024/1280/1920 十档宽度 × 7 套主题，
查三类问题：横向溢出、标题文字被下方元素压住（间距 < 6px）、移动端输入框字号 < 16px。
修复前 178 个问题，修复后 **0 个**。

### 7.6 修改自定义后
**`Ctrl+Shift+R` 硬刷浏览器**绕开缓存。如果改动大，浏览器开发者工具 → Application → Clear storage → 也清一下。

---

### 7.7 独立页面（`html/` 与 `x.html`）

`html/` 下 **43 个页面**全部是原生 HTML，不经过 docsify，各自独立可访问。改样式 / 加按钮前，先看 7.7.5 的套件速查。

#### 7.7.1 页面总览

| 分类 | 数量 | 文件前缀 | 统一骨架 | 入口 |
| --- | --- | --- | --- | --- |
| 工具 | 14 | `tool-*.html` | `toolbox.css/js` + `theme-kit` | `x.html` → 工具 / 效率工具 |
| 视觉 | 15 | `visual-*.html` | 全屏 canvas + `palette-kit` | `x.html` → 氛围屏 / 交互视觉 / 生成器 |
| 游戏 | 12 + 中心 | `game-*.html` | `game-kit.css/js` | `x.html` → 小游戏 / `game-hub.html` |
| 检索 | 1 | `search.html` | `toolbox.css/js` | `x.html` → 工具 |
| 导航 | 1 | `x.html` | 独立样式（顶栏 + 卡片网格） | 站点根路径 |

所有独立页的 `<head>` 引用顺序固定为：`viewport` → `theme-color` → favicon → `themes.css` → 套件 CSS → **主题 boot 内联脚本** → `defer` 引各套件 JS（含 `nav-kit.js`）。顺序别乱：主题 boot 必须在 CSS 之后、`theme-kit.js` 之前，否则首屏会闪一下默认色。

#### 7.7.2 工具页（14 个）

| 文件 | 标题 | 做什么 | 关键依赖 |
| --- | --- | --- | --- |
| `tool-qrcode.html` | 二维码生成 | 文本 / 链接 → 二维码，可下载 | `qrcode.js`（本地库，无外链） |
| `tool-textbox.html` | 文本工具箱 | 多子工具 tab：字数统计、大小写、去重等 | `toolbox` |
| `tool-diff.html` | 文本对比 | 两段文本逐行差异对比 | `toolbox` |
| `tool-image.html` | 图片处理台 | 压缩 / 旋转 / 水印 / 格式转换 / 切圆角（应用商店图标）；`paint`（实时预览）+ `run`（导出）双回调 | `toolbox` |
| `tool-materials.html` | 素材库 | 粘贴 m3u8 / 图片链接：视频卡片播放（hls.js）、图片网格预览，列表存 localStorage | `toolbox` + `hls.min.js` |
| `tool-pomodoro.html` | 专注番茄钟 | 专注计时循环，记录存 localStorage | `toolbox` |
| `tool-eyedropper.html` | 取色器 · 对比度检测 | 屏幕取色、配色方案、WCAG 对比度 | `palette-kit` + `toolbox` |
| `tool-paint.html` | 画板 | 画笔 / 橡皮 / 填充 / 取色 / 撤销重做 | `palette-kit` + `fs-kit` |
| `tool-handwriting.html` | 手写板 | 手写 / 描红练习 | `palette-kit` + `fs-kit` |
| `tool-quote-copy.html` | 快捷复制 | 10 条常用文案一键复制 | `theme-kit` + `fs-kit` |
| `tool-quotes.html` | 句子收藏 | 句子收藏与管理，可导出 | `save-kit` |
| `tool-standby.html` | 待机展示 | 全屏时钟 / 日历 / 天气待机屏 | `theme-kit` + `fs-kit` |
| `tool-translate.html` | 翻译工具 | 自动检测源语种、28 语互译、历史 / 互换 / 自动翻译 | `toolbox` + `translate-kit` |
| `tool-delta-escort.html` | 护航社 | 独立活动页（非工具箱骨架） | `fs-kit` |

#### 7.7.3 视觉页（15 个）

| 文件 | 标题 | 做什么 |
| --- | --- | --- |
| `visual-aurora.html` | 极光 | 极光流动，可保存图片 |
| `visual-starfield.html` | 星空漫游 | 星域飞行 |
| `visual-rain.html` | 雨夜玻璃 | 雨滴 + 玻璃模糊 |
| `visual-snow.html` | 雪落 | 飘雪 |
| `visual-sky.html` | 实时天光 | 按真实时间 / 天气渲染天空 |
| `visual-wave-grid.html` | 波浪点阵 | 点阵起伏 |
| `visual-fractal.html` | 分形缩放 | 分形无限缩放 |
| `visual-constellation.html` | 粒子引力场 | 粒子连线 / 引力 |
| `visual-text-warp.html` | 文字形变 | 文字扭曲波动（`text-kit` 取词） |
| `visual-particle-text.html` | 粒子文字 | 文字拆成粒子（`text-kit`） |
| `visual-poster.html` | 句子海报 | 句子海报生成，可下载（`text-kit`） |
| `visual-mandala.html` | 曼陀罗 | 对称绘图 |
| `visual-gradient.html` | 渐变配色 | 渐变生成 / 复制 CSS |
| `visual-noise.html` | 噪声壁纸 | 程序化噪声壁纸 |
| `visual-pixel-avatar.html` | 像素头像 | 像素风头像生成 |

这些页面统一是**全屏 canvas + `body.idle` 闲置淡出 UI**：任何触摸 / 移动都会唤醒，无操作一段时间后 `.ui` 淡到 15%（触屏 45%，见 `palette-kit.css` 的 `@media (hover:none)` 规则）。调色盘统一走 `palette-kit`，保存统一走 `save-kit`。

#### 7.7.4 游戏页（12 个 + 游戏中心）

| 文件 | 标题 |
| --- | --- |
| `game-2048.html` | 2048 |
| `game-breakout.html` | 打砖块 |
| `game-flappy.html` | Flappy |
| `game-gomoku.html` | 五子棋 |
| `game-linkup.html` | 连连看 |
| `game-memory.html` | 记忆翻牌 |
| `game-minesweeper.html` | 扫雷 |
| `game-pong.html` | Pong |
| `game-slide.html` | 数字滑块 |
| `game-snake.html` | 贪吃蛇 |
| `game-tetris.html` | 俄罗斯方块 |
| `game-wordchain.html` | 中文接龙 |
| `game-hub.html` | 游戏中心（卡片索引，点进各游戏） |

`game-kit.js` 统一提供：HUD（分数 / 最高分）、右上工具列（调色盘 / 音效 / 暂停）、手机端方向键 D-pad、返回键、最高分存 localStorage。

返回键是**按来源智能跳转**的：从游戏中心点进来 → 回 `game-hub.html`；从别处进来 → 回站点首页 `../x.html`。

#### 7.7.5 共享套件速查

| 文件 | 作用 | 谁在用 | 关键 API / 约定 |
| --- | --- | --- | --- |
| `themes.css` | 7 套主题变量（青瓷绿 / 夜航蓝 / 琥珀橙 / 墨玉青 / 藕荷紫 / 石墨灰 / 胭脂红，**浅深浅深浅深浅**交替） | 所有独立页 | `data-theme` 取 `emerald / midnight / sunset / ink / violet / stone / crimson`（**id 是 localStorage 键，换色可以、换 id 不行**）；换色或加主题要同步五处：本文件、`theme-kit.js` 的 `THEMES`（色点 + `meta`）、**15 个页面防闪脚本里的 id 数组**（漏改会导致新主题被当成非法值回落到默认）、`x.html` 内联的 7 套变量与面板色点、`tool-standby.html` 自带的 7 套；**面板顺序三处必须一致**（本文件块顺序 = `THEMES` 数组顺序 = `x.html` 面板按钮顺序） |
| `theme-kit.css/js` | 主题切换按钮 + 面板 | 工具页、生成器页 | 自动挂到页头；主题存 `localStorage['tk_theme']` |
| `toolbox.css/js` | 工具箱页骨架 | 工具页、`search.html` | `ToolBox.mount(root, {title, sub, storageKey, tabs})`；工具方法 `ToolBox.el / toast / copy` |
| `game-kit.css/js` | 游戏页骨架 | 12 个游戏 | `GameKit.create(opts)` 负责 HUD / 工具列 / D-pad / 返回 |
| `palette-kit.css/js` | 调色盘悬浮球 + 面板 | 画板、视觉页、游戏 | 触发球挂在页面自己的 `.pk` 元素里；颜色跟随主题 |
| `fs-kit.js` | 全屏按钮 | 全部独立页 | 自动避让右下角固定 UI；页面已有 `#btnFull` 时不重复挂 |
| `nav-kit.js` | 返回按钮显隐 | **全部 43 个独立页** | 只有从站内页面跳进来才显示返回按钮，见 7.7.8 |
| `save-kit.js` | 保存 / 导出 | 句子收藏、部分视觉页 | canvas → 图片 / 文本导出 |
| `text-kit.css/js` + `quotes-data.js` | 句子条组件 | 粒子文字 / 海报 / 文字形变 | `TextKit.mountBar(host, {layout, limit, value, onChange})`；`collapsible: true` 时带折叠箭头且**默认收起**（`folded: false` 可改为初始展开） |
| `qrcode.js` | 二维码生成 | 二维码页 | 本地实现，无外链 |
| `hls.min.js` | m3u8 播放 | 素材库 | hls.js 1.5.13，**本地化存放**（约 413 KB），不引 CDN；Safari 能原生播 m3u8 时会优先走原生 |
| `translate-kit.js` | 页面翻译 | **全部 42 页 + `x.html`** | 见 7.8.1 |
| `dock-kit.js` | 手机端工具坞 | **全部 42 页 + `x.html`** | 见 7.8.2 |

> **按钮压在强调色上的文字色**：用 `var(--on-accent, #fff)`（屏保页是 `var(--on-brand, #fff)`），不要写死 `#fff`。
> 浅色四套的强调色够深，白字没问题；深色三套（夜航蓝 / 墨玉青 / 石墨灰）的强调色是亮色，
> 白字压在亮蓝上只有 2.5:1，会糊成一片 —— `--on-accent` 给这三套发深色字，才是「亮底 + 深字」。

**套件按钮跟随主题色**（`theme-kit` / `translate-kit` / `fs-kit`）：

三个套件的按钮和面板默认是「自包含深色玻璃风」，浅色主题页面上会显得很突兀。
现在改成：**页面自己有主题变量块时**才跟随主题色，由 JS 判断后加类
（`theme-kit` 加 `.tk-themed`，`translate-kit` 加 `.tk-t-themed`，`fs-kit` 早就有 `.fsk-themed`）。

- **判据**：遍历 `document.styleSheets`，找有没有 `selectorText` 含 `[data-theme` 且带变量的规则。
  三个套件里各有一份 `hasThemeVars()`。
- **不能只看 `html[data-theme]` 属性在不在**：`theme-kit` 自己切主题时也会写这个属性，
  无主题变量的页面照样有 → 判据恒真，所有页面都会去读 `var(--card)`。
- **不能无条件 `var(--card, 兜底)`**：`text-kit.css` 在 `:root` 里写过一套浅色
  `--card:#fff / --text:#16192b`，深色氛围屏（`visual-particle-text` / `visual-poster` /
  `visual-text-warp`）加载它之后按钮会变成白底白字。
- **变量名不统一，兜底要串起来**：卡片色 `--card`（`themes.css`）→ `--panel`（`tool-standby`）→ 兜底；
  文字 `--text`；边框 `--line`；主色 `--accent` → `--brand`；
  悬停底 `--ghost-active` → `--brand-soft`。`fs-kit` 的 `.fsk-themed` 也要补 `--panel` 兜底。
- 页面也可以自己接管：`--tk-bg` / `--tk-fg` / `--tk-line` / `--tk-panel-bg` 优先于主题变量。

#### 7.7.6 新增一个页面的标准流程

1. **复制最接近的页面**：工具页抄 `tool-textbox.html`，视觉页抄 `visual-noise.html`，游戏页抄 `game-snake.html`。
2. **`<head>` 引用顺序**：`themes.css` → 套件 CSS → 主题 boot 内联脚本 → `theme-kit.js` / 套件 JS / **`nav-kit.js`** / `translate-kit.js` / `dock-kit.js`（全部 `defer`）。
3. **工具页骨架**：`<body class="tb-page">`、`<div id="tbRoot"></div>`、`ToolBox.mount(...)`，并把 `<meta name="theme-color">` 改成该页主题色。
4. **注册到导航**：在 `x.html` 加一张 `.sp-card` 卡片，并在 JS 的 `CARD_ICONS` 映射表里加 emoji 图标（不加就没有图标徽章）；游戏要另加到 `game-hub.html` 的卡片网格。
5. **同步文案里的数量**：`x.html` 搜索卡片写着「检索全部 937 篇文档」，`html/` 页面卡片写着「43 个页面」，加文档 / 加页面后记得改（本文档正文里的篇数口径也要跟着改）。
6. **新增悬浮按钮时**：要么放进 `.ui.tools` / `.ui.side` / `.ui.palette` / `.ui.panel` 容器（这几个会被自动收纳），
   要么调用 `DockKit.add(node)`，否则手机端会一直浮在原处（见 7.8.2）。
   **底部工具条请用 `.ui.bar`** —— 它不进坞，会保持「贴底通栏 + 横向滚动」。。

#### 7.7.7 `x.html` 的滚动入场动效（顺序保证）

信息区 → 各板块卡片 → 导航分组，进入视口时**按文档顺序依次浮起**。改这段逻辑前先看三条约定：

1. **延迟按「同一批进入视口的元素在批内的次序」算，不能用全局索引取模。**
   原来写的是 `(i % 6) * 55` —— 第 7 个元素起延迟又从 0 重新开始，于是板块二的第一张卡片
   延迟反而比板块一最后几张小，视觉上就成了「第二个卡片比第一个先加载」。
   现在改成批内序号 `k * 60`，一批最多错开 12 个，超出的同时出现。
2. **IntersectionObserver 给的 `entries` 顺序不作数**，必须自己按 `__rank`（文档顺序）排一遍再播放。
3. **预隐藏由 `<head>` 的 `data-reveal` 提供**：`html[data-reveal]` 选择器把目标元素初始设为透明，
   JS 负责加 `.reveal`（过渡）、进入视口后加 `.in`（播放）、播完加 `.done`（钉住最终状态）。
   这样元素从第一帧就是透明的，不会出现「先显示 → 突然消失 → 再浮现」的闪烁。
   **降级**：无 JS、开了系统「减少动效」、或脚本报错时，脚本会移除 `data-reveal`，隐藏规则整体失效，内容天然可见（不会白屏）。

**必须保留的兜底**：`sweep()` —— 锚点跳转、刷新后浏览器恢复滚动位置、一路拉到页底时，
中间那些被「跳过」的元素从没 intersecting 过，会永远停在透明态，页底一片空白。
所以 `scroll` / `resize` 时要按位置扫一遍：元素底边已在视口上方（`bottom <= 0`）的直接补上。

**验证方式**：用 playwright 记录每个目标元素 opacity 首次 ≥ 0.9 的时间戳，
按文档序检查是否单调递增；再跳到页底，确认 52 个目标元素全部可见（`hidden` 为 0）。

#### 7.7.8 返回按钮与卡片打开方式

**返回按钮（43 个页面全覆盖）**：

| 来源 | 类名 | 说明 |
| --- | --- | --- |
| `toolbox.js` | `.tb-back` | 工具页骨架自动生成，`opts.back` 可指定 |
| `game-kit.js` | `.gk-back` | 游戏页自动生成；**从 `game-hub.html` 进来就回游戏中心**，否则回首页（靠 `document.referrer` 判断） |
| `search.html` | `.tb-back` | 页面自带 |
| 视觉页 / 手写 / 画板 | `.ui.back` / `.back` | 页面自带 |
| 句子收藏 / 快捷复制 / 待机展示 / 行动突围护航社 | `.back-btn` | 这 4 个页没有页头骨架，返回按钮是手写的 |

**新增页面时必须自带返回入口**，否则用户进得去出不来。巡检脚本要同时判三件事：
元素存在 → 可见（尺寸非 0、opacity 非 0）→ 指向 `x.html` 或 `game-hub.html`。

**返回按钮只在「从站内进来」时显示**（`assets/js/nav-kit.js`，全部 43 个独立页都要引）：

| 场景 | `document.referrer` | 返回按钮 |
| --- | --- | --- |
| 从 `x.html` 点卡片进入 | 站内 | **显示** |
| 进子页后再刷新 | 站内（referrer 保留） | **显示** |
| 从 `game-hub.html` 进游戏 | 站内 | **显示**（返回目标仍是游戏中心） |
| 直接打开 / 收藏夹 / 复制链接 | 空 | 不显示 |
| 从站外网站跳入 | 外站 | 不显示 |

判定逻辑在 `nav-kit.js`：referrer 同源且不是本页 → 给 `<html>` 加 `.no-back`，
再用 CSS 隐藏 `a.tb-back / a.gk-back / a.ui.back / a.back / a.back-btn`。
**用 CSS class 而不是 JS 直接隐藏**，因为返回按钮有一半是运行时插进来的
（`toolbox.js` 的 `.tb-back`、`game-kit.js` 的 `.gk-back`），CSS 才能无差别覆盖。

> 直接打开的页面之所以不给返回按钮：那种场景下「返回」无处可退，
> 浏览器后退键就够了，摆个死按钮反而误导。

**卡片打开方式**：`x.html` 的 42 张站内卡片（`.sp-card`）**在当前标签页打开**，
不写 `target="_blank"`；30 个快捷导航外链（`.nav-link`）保持新标签页打开。

#### 7.7.9 主题跟随与画布尺寸

**主题键统一为 `tk_theme`**：导航页 `x.html` 和 43 个独立页必须写同一个键，否则子页读不到导航页选的主题。
`x.html` 原来用的是 `kb-theme`（自己的键），现已改为 `tk_theme`；旧键会在读取时迁移一次并清除。
`x.html` 首次访问若没有记录，会按系统深浅选 `emerald` / `midnight` **并立刻落盘**，
这样从导航页进子页时两边一致。

> 哪些页面有主题机制（15 个，引 `theme-kit.css/js` + 防闪脚本）就跟随导航页；
> 视觉屏、游戏屏、画板、手写板是**固定配色**（没有 `html[data-theme]` 变量块），
> 不存在「跟随」这回事；`tool-delta-escort.html` 是另一套 5 套风格体系，独立。

`theme-kit.js` 监听了 `storage` 事件：别的标签页改了主题，当前页立刻跟上（`storage` 只在其它标签页触发，同标签页跳转由页面自己读 localStorage）。

**面板互斥（主题 / 翻译 / 调色盘）**：三个面板的按钮都 `stopPropagation`，
所以各自「点击外部收起」的那条 `document` 监听**收不到别的面板的点击** ——
翻译列表开着时点主题按钮，翻译列表不会收起。

解法是一个广播：任一面板打开时派发 `kb:panel-open`（`detail.id` = `theme` / `translate` / `palette` / `x-theme`），
其它面板收到就收起自己。已接入 `theme-kit.js`、`translate-kit.js`、`palette-kit.js` 和 `x.html` 的自绘主题面板。
**新增任何浮层面板都要接这个广播**，否则又会变成"两个面板叠在一起"。

**页面自己画的浮层：用 `panel-kit.js`**。原先只有三个 kit 之间互斥，页面自绘的浮层没接进去，
于是「点开字号面板 → 再打开调色盘 → 关掉调色盘」之后字号面板还杵在屏幕上（两块的按钮都
`stopPropagation`，彼此收不到对方的点击，各自「点外部收起」那条 `document` 监听都失效了）。

```html
<script src="../assets/js/panel-kit.js"></script>
```

```js
PanelKit.claim('ptext-type', closePanel);   // 注册：别人打开时我收起自己
PanelKit.announce('ptext-type');            // 我打开时告诉别人收起
```

- `claim` 的 id 要和 `announce` 一致；**同页多个浮层用不同 id**，这样它们之间也互斥
  （手写板的「格线」和「描红」就会互相顶掉）。
- 已接入：`visual-particle-text`（字号面板）、`tool-paint`（简笔画弹窗）、
  `tool-handwriting`（格线 / 描红）、`game-wordchain`（词库面板）、
  `tool-standby`（文字样式编辑器）、`tool-translate`（语种下拉）、`tool-delta-escort`（主题面板）。
- 注意 `claim` 注册的是**关闭函数**，不是开关函数 —— 别的面板打开时只能"收起"，不能"打开"。

**画板 / 手写板：边界就是屏幕**：`tool-paint.html`、`tool-handwriting.html` 的主画布结构是

```
.canvas-wrap（铺满视口，overflow:hidden） → .stage（舞台，100%×100%） → canvas
```

- **大小**：画布 = 屏幕大小，`.stage` 铺满可视区，旋转屏幕时跟着变。
- **不提供**：右下角拖拽把手、「移动」（平移模式）、「放大」「铺满」、双指捏合缩放、滚轮缩放 —— 一律去掉。
- 尺寸不再记 localStorage（`paint-stage-size` / `hw-stage-size` 已废弃）。
- 坐标换算就是屏幕坐标减画布左上角，1:1，没有视图变换。

**两层结构保留，但严格对齐**：

```
显示层 cv   = 屏幕上的画布
内容层 contentCv = 承载笔迹的画布（画板）/ inkCv（手写板），与显示层同尺寸 1:1
```

内容层与显示层一一对应：撤销/取色/填充/导出都用内容层，显示层只负责把内容层原样画出来。
不做缩放平移，就不存在「放大后笔迹写到内容层之外被丢掉」那个问题。

坑：

- **`.stage` 必须用 `position:relative`，不能用 `fixed`** —— Chrome 给 fixed 元素创建层叠上下文，
  舞台内部的 `z-index` 就压不过外面的工具栏（`.ui`, z-index 5）。改成 relative（不创建层叠上下文）即可。
- **`fs-kit` 的全屏按钮固定在右下角**，没有把手后不再需要让位。
- **位图像素要卡上限**：iOS Safari 单个 canvas 超过约 16.7M 像素会**直接创建失败**，
  表现同样是「画布一片空白、怎么画都不上」。两页都用 `maxSide()` 按 DPR 反推安全边长
  （`sqrt(8e6 / DPR²)`），画板 DPR≤1.5 → 上限 1885，手写板 DPR≤2 → 上限 1414。

画板的撤销快照存**画布副本**而不是 `ImageData`：ImageData 落在 JS 堆里，
内容层一大十几份快照就能把手机内存吃穿；`drawImage` 复制更快也不占 JS 堆。
手写板的格线可用区要按「舞台底边 → 工具栏顶边」算，不能再用 `window.innerHeight`；
舞台尺寸**跟着视口走**（画布就是屏幕大小，旋转屏幕时跟着变）。

> ⚠️ 站内卡片要去掉 `target="_blank"` 时，**`rel="noopener noreferrer"` 也必须一起去掉**：
> `noreferrer` 会清空 `document.referrer`，`game-kit.js` 里「从游戏中心进来就回游戏中心」
> 的判断就失效了，游戏页的返回按钮会一律指回首页。

---

### 7.8 页面翻译与手机端工具坞

`translate-kit.js` 和 `dock-kit.js` 是**全站注入**的：43 个 `html/` 页面 + `x.html`，每个文件的 `</head>` 前都有一行 `defer` 引用。

#### 7.8.1 页面翻译 `translate-kit.js`

**实现**：封装开源 [translate.js](https://gitee.com/mail_osc/translate)，但隐藏它自带的原生下拉框，改用与站点一致的语言面板。

**加载**：三个源**串行**加载（一次只注入一个 `<script>`），报错或 10 秒超时才换下一个；成功后锁定实例：

1. `https://res.zvo.cn/translate/translate.js`（官方 CDN）
2. `https://cdn.jsdelivr.net/gh/xnx3/translate@4.0.0/translate.js/translate.min.js`（jsDelivr 镜像）
3. `https://gitee.com/mail_osc/translate/raw/master/translate.js`（Gitee 源）

**按钮位置**：自动识别宿主 —— 工具箱页并入 `.tb-head`、`x.html` 并入 `.topbar-inner`、游戏页并入 `.gk-tools`、其余页面悬浮在屏幕左侧中部（手机端交给工具坞收纳）。

**记忆**：选择存 `localStorage['kb_translate_lang']`（translate.js 自己也存一份 `to`），跨页面保持；切回「简体中文」会先 `reset()` 还原原文，再走一遍完整还原流程。

**通道**：首选 `client.edge`（浏览器直连 Edge 翻译接口，不经第三方服务器）；7 秒无响应自动切 `translate.service`（官方服务）重试一次。

**约定**：

- 页面**自己**要实现翻译交互时（如 `tool-translate.html`），在引入脚本前设 `window.__TK_NO_PAGE_UI__ = true`，再用 `TranslateKit.ready(function (t) { ... })` 拿实例 —— 此时不会注入页面翻译按钮。
- 只翻某个元素：`t.to = 目标语种; t.execute([节点])`；连续翻同一节点前先 `t.node.delete(节点)`，否则会被判定「内容没变」而不发请求。
- 译入中文（本地语种）需要额外设 `t.language.translateLocal = true`。
- **页面自己的动态文案要自己拼，别指望翻译器**：`tool-standby.html` 的时钟日期每秒 `textContent` 重写一次，
  翻译器翻完下一 tick 就被覆盖回中文 —— 英文下永远显示「2026年11月23日 周一」。
  正确做法：读 `TranslateKit.current()` 判断语种，由页面自己按语种拼文本；
  并且**只在文本真的变了时才写**（跨天或切语言才重写），否则译文会被反复冲掉。
  日历标题、月份名同理（翻译器要等远程资源加载，切换瞬间还是中文）。

**踩过的坑**：

- **固定宽度 + `white-space: nowrap` 在英文下必炸**：日历格子里的农历/节气小字
  （"Beginning of Winter"、"Twelfth-fourth"）一行放不下，nowrap 会溢出格子、盖住相邻日期的数字，
  表现就是「日期没展示全」。要允许换行（`white-space: normal` + `overflow-wrap: anywhere`）；
  另外英文下没必要显示农历日（"十二月初四" → "Twelfth-fourth" 又长又没意义），只在初一显示农历月名。
- **手机端面板必须挂到 `body`**：`x.html` 顶栏有 `backdrop-filter`，会成为 `position: fixed` 子元素的包含块 —— 面板留在顶栏里时被定位进顶栏内部，**完全看不到、点不了**。现在手机端打开面板时把它 `appendChild` 到 `body`，桌面端再放回按钮容器。
- **桌面端也必须挂到 `body`**（不只是手机端）：游戏页的语言钮并入 `.gk-tools`，
  而 `.gk-tools` 是 `position: fixed` + `z-index` → **它是一个层叠上下文**，
  面板留在列里就压不过同层的开始/暂停遮罩 `.gk-overlay`，
  表现是「点翻译钮没反应、列表不见了」（`elementFromPoint` 命中的是 `.gk-overlay`）。
  挂到 `body` 后用 `fixed` + 按钮的实际坐标定位，层级和位置都对了。
- **面板要往按钮空旷的一侧展开**：按钮在页头右边（inline 模式）→ 面板向左展开；
  按钮在屏幕左边（float 悬浮模式）→ 面板向右展开。方向选反面板就跑到屏幕外，列表仍然看不到。
  判据用 `r.left` 与 `innerWidth - r.right` 比大小，窗口变化时重算（`resize` 监听）。
- **统一尺寸的规则要作用在按钮上，不能作用在容器上**：`.tk-t-round` 是容器（包着按钮和面板），
  把它固定成 44px 会让 38px 的按钮在容器里不居中；正确写法是 `.tk-t-round .tk-t-btn`。
- **面板的垂直位置必须夹在视口内**：悬浮钮在屏幕左侧垂直居中（`top: 50%`），
  面板若按「按钮下方」排（`top = 按钮底 + 8`），440 高的面板会从屏幕中间一直伸到屏幕外，
  底部的语言根本够不着 —— 表现就是「列表看不完整」（22 个页面同时中招）。
  正确做法：**悬浮模式的面板与按钮垂直居中**（`top = 按钮中线 - 面板高/2`），
  再统一 `clamp` 到视口内（`top + 面板高 ≤ 视口高 - 8`，`top ≥ 8`）。
  量高度前要先 `panel.hidden = false`，否则 `offsetHeight` 是 0。
- **语言钮全站统一 44×44 圆形**：原来 PC 的页头是 109×32 胶囊、手机坞里是 44 圆钮，
  同一个按钮两端尺寸不一样。现在 `.tk-t-btn` 基础样式就是 44×44 圆形，
  语言名改用 `title` / `aria-label` 提示，`.tk-t-cur` / `.tk-t-caret` 一律隐藏。
- **一个容器里有多个控件时，不能整个收进工具坞**：画板页的 `.ui.side` 里是
  「近期颜色 + 调色球」两个控件，整体收进坞就叠成 44×86，
  高度和旁边 44×44 的圆钮不一致、左边缘还外凸 —— 竖列歪了。
  正确做法：`splitUnits()` 把容器拆成一个个控件单元，一个控件占一个格子。
  拆开后原来的 `.ui.tools > .btn` 这类子选择器就失效了（不再是容器的子元素），
  要靠拆分时打的 `.dk-ico` 标记类把尺寸钉回 44。
- **复位规则的选择器必须带上下文前缀**：`.dk-item{right:auto!important}` 和
  `.ui.tools{right:18px!important}` 特异性相同（都是 0,1,0），**写在前面会输** ——
  元素带着 `right:18px` / `left:-18px` 进坞，整列横向错开 18px。
  写成 `.dk .dk-item`（0,2,0）才稳。
  ⚠️ 游戏页是**原地折叠**（没有 `.dk`，工具列是 `.gk-tools`），
  复位规则还得再带一个 `.gk-tools` 前缀，否则全屏钮进了列却仍是 `position:fixed`，
  脱离竖列停在屏幕底部。
- **文字按钮不能压成 44×44 方块**：待机页顶部的「全屏 / 编辑」是文字按钮，
  塞进 44 方形会把字挤没。这种裸 `.tools` 工具条**不进坞**，留在原位；
  拆分时用「含中文标签 → 算文字按钮」来区分，只给图标钮打 `.dk-ico`。
- **dock-kit 可能比其它 kit 先执行**：那时主题/语言/全屏都还没挂上，`collect()` 返回空，
  于是走「没有别的东西可收」的兜底分支，把裸 `.tools` 收进坞。
  所以兜底分支必须按控件类型判断，不能无条件收。
- **宽屏下「悬浮件要贴内容右缘」**：PC 端页面内容常常是居中的一窄栏
  （工具箱页 `.tb-wrap` max-width 1080、句子收藏 `.wrap` 760），
  而主题钮 / 全屏钮按「视口右边缘」定位 → 悬在屏幕最右上角，
  离内容区空出好几百像素，看着就是「自己单独飘在右上角」。
  做法：右侧悬浮件的 `right` 改成走变量 `--kb-float-right`，
  JS 量出内容容器右缘后写进 `:root`，按钮和面板一起挪。
  - 找内容右缘：遍历 body 子树，**排除宽度 ≥ 视口宽 90% 的元素**
    （满宽壳 `#tbRoot`、画布页的 canvas），剩下的取**最大右边缘**。
    ⚠️ 排除只是「不计入」，**不能中断递归** —— 一旦 `continue` 掉递归，
      `.tb-wrap` 永远访问不到，工具箱页的主题钮就贴不上去。
    ⚠️ 别用「右边缘出现次数最多的众数」：句子收藏是左右两栏，
      众数会落在内层卡片列上，按钮就跑到两栏中间的缝里。
  - 位置：按钮左边缘 = 内容右缘 + 12（按钮 44 宽）。
    算出的间距比默认 18px 还小 → 保持贴屏幕边（沉浸式画布页就是这样）。
  - ⚠️ **dock-kit 的 `setup()` 只在窄屏执行**（`if (MQ.matches)`，宽屏不建坞），
    这条对齐逻辑恰恰是宽屏才用得上的 —— 必须放在**无条件路径**上（IIFE 末尾），
    塞进 `setup()` 等于没写。
  - ⚠️ 写 `documentElement.style` 会触发 MutationObserver → 必须去重
    （值没变就不写），否则「改 → 观察 → 改」无限循环。
- **PC 端三个全局钮必须归位到页头右侧一行**：原来主题钮固定在内容区外侧右上角、
  语言钮在页头里（工具箱页）或浮在屏幕左侧（其它页）、全屏钮固定在右下角 ——
  一个在天上一个在地下，PC 下看着很乱。
  统一规则：**页面有页头（`.tb-head` / `.topbar-inner` / `header`）时，
  主题 → 语言 → 全屏 三个钮一起进页头右侧**，一行、同一直线、44×44；
  没有页头的沉浸式页（画布、游戏）保持角上悬浮。
  - 实现：`dock-kit` 里建一个 `.hd-tools` 容器（`position:absolute;right:0;top:0;bottom:0;
    display:flex;align-items:center;gap:8px`）插到页头末尾，按钮搬进去，
    用 `.hd-tools .tk-btn{position:static!important}` 取消各自的固定定位。
    页头要加 `position:relative` 当定位上下文。
  - ⚠️ 顺序不能靠「谁先 append」碰运气：每次按 主题→语言→全屏 重排，
    但**重排前先比对，顺序没变就别动 DOM** —— 动了会触发 MutationObserver，
    观察器再回调进来就是死循环。
  - ⚠️ 游戏页有 `.gk-tools`（自己的右上工具列），要排除，不要去动它。
  - ⚠️ 窄屏要把按钮**搬回 body**，让窄屏的工具坞接管（记录 `data-hd-moved` 标记）。
  - **主题面板要跟着按钮走**：面板原来靠 CSS 固定（`top:58/right:12`），
    按钮进页头后面板还钉在屏幕右上就和按钮分家了 →
    `theme-kit` 里改成 JS 定位（面板顶边 = 按钮底边 + 8，右缘对齐按钮右缘）。
    ⚠️ **`theme-kit.js` 里没有 `doc` 别名**（它用的是 `document`），
    写 `doc.documentElement` 会直接抛 `doc is not defined`。
  - ⚠️ **面板不能放进 dock-kit 的 `!important` 规则里**：
    那条规则用 `right:calc(var(--kb-float-right)...)` 且带 `!important`，
    会压过 theme-kit 设的 inline style，面板又跑到内容右缘外侧去了。
    面板定位只能由 theme-kit 的 inline style 说话。
- **页面自带的 fixed 工具条要让位，不能写死像素**：
  待机页的 `.tools`（「全屏 / 编辑」）原来写的是 `right:60px`（"给主题按钮让位"），
  但主题钮的右边距是跟着内容右缘动态算的（`--kb-float-right`），
  一旦它挪动，写死的 60px 就会把「编辑」压住 —— 实测重叠 2×32。
  正确写法：`right:calc(var(--kb-float-right, 18px) + 104px)`
  （104 = 语言钮 44 + 间距 8 + 主题钮 44 + 间距 8）。
  顺带：工具条要 `height:44px; align-items:center`，
  文字胶囊钮才会和 44 圆钮落在**同一条水平中线**上。
- **沉浸式页的语言钮要跟主题钮成对**：
  语言钮原本浮在**屏幕左侧中部**、主题钮在右上角，一个在左一个在右。
  现在 `alignLangFloat()` 把 float 模式语言钮排到主题钮**左边**，
  两个圆钮在右上角并排，和有页头的页面观感一致。
  ⚠️ 没主题钮的页面（画布页）保持左侧中部不动 —— 画布工具放左边本来就合理。
  ⚠️ 写 inline style 定位要去重（`lastLang`），
  否则「写 style → MutationObserver → 再写」死循环。
- **翻译面板的定位要分两种情况**：悬浮钮在屏幕左侧 → 面板与按钮垂直居中
  （440 高的面板从屏幕中间往下排会伸出屏幕）；在右上角 → 面板在按钮下方。
- **翻译面板挂在 body 下，跟随主题的规则要用「自身匹配」**：
  面板为了做手机端底部抽屉、脱离游戏工具列，一直是 `document.body.appendChild` ——
  它**不在** `.tk-t`（按钮的 wrap）里面。
  于是 `.tk-t-themed .tk-t-panel` 这种后代选择器根本匹配不到它：
  面板背景用基础样式里的深色兜底值 `rgba(16,20,28,.97)`，
  而面板里的文字走 `var(--text)` 跟着主题变 ——
  **浅色主题下就成了「深底 + 深字」，整块看不清**（待机页 emerald 实测）。
  修法跟 theme-kit 一样（`.tk-panel.tk-themed` 就是这么写的）：
  给面板自身加 `.tk-themed` 类，并补一组 `.tk-t-panel.tk-themed …` 规则。
  ⚠️ 只加类不补规则没用 —— 后代选择器不认自身。
- **页头钮组（.hd-tools）用 absolute，必须自己避让**：
  absolute 不占位，页头行里本来靠右的控件（游戏中心的调色盘按钮 `.pk`）
  不会给它让位 → 全屏钮直接盖在调色盘上。
  做法：`pickRow()` 找出页头里那层 flex 行（页头根自己是 flex 就是它；
  页头根是 block、里面另有 flex 行就找那一行），
  再量出该行里**贴着右缘**的控件（标题块那种撑不到右缘的不算），
  把钮组的 `right` 改成「控件左边缘 − 8」。
  ⚠️ **不能把 .hd-tools 改成 static 参与排版**：
  它的插入点是页头根（`header`），而有些页面的页头根是 block
  （句子收藏页 `header > .brand` 才是 flex 行）——
  static 的块级容器会直接把页头撑高、并触发 MutationObserver 死循环
  （表现是 `DOMContentLoaded` 永远不来）。
  ⚠️ 避让量必须用**实测坐标**，不能推盒模型（各页 padding/border 不同）。
- **钮组的垂直位置要对齐页头内容行**：
  `.hd-tools` 原本 `top:0;bottom:0`（占满整个 header），
  而 header 的 `padding-bottom` 会让「整个 header 的中心」比内容行中心低小半格 ——
  返回键 38 高、圆钮 44 高，两个中心不在一条线上，看着就是没对齐。
  改成 `top` 由 JS 按内容行中心算（`headerFit()`），高度固定 44。
  ⚠️ **算中心必须用「内容区」**：页头本身就是那一行时，
    `getBoundingClientRect()` 含 padding → 中心被拉低。
    要按 `(top + borderTop + paddingTop + bottom - borderBottom - paddingBottom) / 2` 算。
  ⚠️ 有些页面的 header 里有多块内容（标题行 + 副标题 + 联系块），
    按整个 header 算中心会落到中间那块上 —— 要按 `pickRow()` 找到的**那一行**算。
  ⚠️ 避让时**只避让真正的控件**（button / a / .pk）：
    标题块（`.htitle`）会 `flex:1` 撑满，右缘正好贴着行右缘，
    把它当成「右对齐控件」→ 钮组被推到页面中间。

## 全站按钮的统一规则（2026-11-24）

**四个全局钮**：主题 🎨 / 语言 🌐 / 全屏 ⛶ / 调色盘 🎨。
顺序全站永远一样：**主题 → 语言 → 全屏 → 调色盘**，尺寸一律 44×44。

| 页面类型 | 落点 | 容器 |
| --- | --- | --- |
| 游戏页 | 右上角竖列 | `.gk-tools` |
| 有页头的页面 | 页头右侧横排 | `.hd-tools` |
| 无页头的沉浸式页（视觉页/画板/待机） | 右上角竖列 | `.kb-col`（dock-kit 建） |
| 窄屏（< 900px） | 全部收进右下角程序坞 | `.dk-items` |

- **只有一处能编排这四个钮**：`alignGlobalTools()`。
  ⚠️ 以前 `collect()`（收进坞）和 `alignHeaderTools()`（搬回页头）**两边都在抢**：
  坞每 300ms 收一次、布局器再搬一次，最后落在谁手里全看时序 ——
  这才是「按钮位置乱」的根因。现在 PC 端 `collect()` 直接返回空列表。
- ⚠️ **`setup()` 只在窄屏跑**（`MQ` 是 `max-width:900px`），宽屏走的是
  IIFE 末尾那条无条件路径。把编排只写在 `setup()` 里 → 宽屏永远没人管。
  编排必须挂在**无条件路径**上。
- ⚠️ **其它 kit 的按钮是异步生成的**：theme-kit / translate-kit / palette-kit
  都在自己的 defer 里初始化，首帧往往还没有这些按钮。
  只编排一次会漏 → 宽屏要补几次（`setTimeout` + 短周期 `setInterval`）。
- ⚠️ **写 class / style 前先比值**：`classList.toggle()` 每次都会写 DOM 属性
  （哪怕值没变），写属性会触发 MutationObserver → 观察器回调再进来 →
  死循环（表现是页面 `DOMContentLoaded` 永远不来）。
  `classList.add` / `toggle` / `remove` 都要先 `contains()` 判断。
- **页面自己的工具组也要并进同一列**（`.ui.tools` / `.ui.side` / `.ui.palette`），
  否则页面上会有两条并排的竖列，上下两个钮对不齐。
  搬空后给容器加 `.kb-empty` 隐藏。
- **调色盘钮**：palette-kit 把触发器放在页面给的 `.pk` 壳里，
  壳的位置是各页面自己定的 → 散落在屏幕各处。
  统一做法：搬 `.pk-trigger` 本身，壳空了加 `.kb-empty` 隐藏。
- **语言面板的配色**：面板挂在 body 下（手机端要变底部抽屉），
  没有 `.tk-t-themed` 祖先 → 后代选择器匹配不到 →
  背景用深色兜底、文字却跟着主题变 → 浅色主题下「深底深字」。
  修法两条：① 给面板自身加 `.tk-themed` 并补 `.tk-t-panel.tk-themed …` 规则；
  ② 页面**没有主题系统**时（视觉页）用 `detectLight()` 判页面底色，
  浅色就加 `.tk-t-light` 用浅色面板。
- **画板初始黑屏**：`getContext('2d', { alpha: false })` 的 canvas
  初始像素是**不透明黑**，改尺寸会重置成黑。
  `resize()` 末尾必须补一次 `render()` 铺纸色，否则画板一打开就是一整块黑。

## 性能：别在小地方花大钱（2026-11-24）

- **全屏 `backdrop-filter: blur()` 是性能杀手**：
  游戏页的开始/暂停遮罩（`.gk-overlay`）是 `inset: 0` 的整屏层，
  带 `blur(8px)` 时**每帧都要重新采样整块画面** ——
  实测把 60fps 直接压到 12fps（83ms/帧），而且遮罩一出现整页就「卡住」，
  看着像按钮点不动。去掉 blur、把背景加深到 `rgba(4,6,12,.86)` 后立刻回到 60fps。
  ⚠️ 小面积（44px 的按钮、面板）用毛玻璃没问题，**整屏层不要用**。
- **DOM 观察器里不能直接跑重活**：
  `watchLayout()` 盯的是整个 body 的 `class/style/hidden`，
  回调里若同步调 `alignGlobalTools()`（内部多次 `querySelector` + `getBoundingClientRect`，
  每次都是强制重排），有动画的页面几乎每帧触发 → 主线程占满 → 页面卡死。
  正确做法：`scheduleAlignGlobal(150)` 防抖 + 函数内防重入 + 结果签名短路
  （容器和四个钮的父节点没变就直接返回，不量不写）。
- **别用短周期 `setInterval` 兜底**：原来每 300ms 跑 8~10 次编排，
  纯属拿性能换正确性。异步生成的按钮交给防抖后的观察器补即可，
  顶多再 `setTimeout` 补两三次。
- **写 style/class 前先比重**：属性写入会触发 MutationObserver，
  值没变也写就会绕成死循环（页面 `DOMContentLoaded` 永不触发）。
- **拼 CSS 字符串时括号要数清**：dock-kit 的样式是一个大字符串 `join('')`，
  少一个 `}` 会把**后面所有规则**吞进上一个 `@`/选择器里静默失效 ——
  表现是「某些规则看起来完全没生效」（这次是 `.kb-col` 那一整段全废，
  导致主题钮还停在 fixed 位置压住语言钮、按钮点不动）。
  改完这类字符串后，建议直接打印 `style[data-dock-kit]` 的 `textContent` 核对一遍。
- **游戏页也要有主题按钮**：13 个游戏页（游戏中心 + 12 个小游戏）原本只加载
  nav/fs/translate/dock 四个 kit，**没有 theme-kit**，所以右上角没有 🎨。
  做法：
  - 新建 `assets/css/game-theme.css`：7 套主题的**深色变体**（id 沿用 theme-kit 的
    emerald/midnight/sunset/ink/violet/stone/crimson，这样同一个 localStorage 键
    `tk_theme` 全站通用）。⚠️ 只能全用深色：游戏页是沉浸式画布，
    浅色主题会把整块画布刷白。
    这套变量里同时给 `--card/--text/--line/--accent`，
    theme-kit 检测到页面有 `[data-theme]` 规则就会给按钮加 `.tk-themed` 用上它们。
  - 每个游戏页加：`theme-kit.css` + `game-theme.css` 的 link、
    防闪脚本（默认 `midnight`）、`theme-kit.js`。
    ⚠️ 防闪脚本要在**所有样式表之后**、正文渲染之前。
  - `game-kit.css` 的 body 背景改成 `var(--gk-bg, #05070e)`。
- **游戏页的全局钮并进右上角那列工具**：`.gk-tools` 竖列里排
  返回 → 主题 → 语言 → 全屏 → 游戏自己的控件（调色球 / 暂停）。
  ⚠️ **插入锚点必须一次定死**：曾经用「第一个非折叠钮」当锚点，
  一插进去锚点自己就变了 —— 返回键插到前面后它成了第一个，
  主题又被插到它前面，返回键又被插回去……
  两边来回搬同一个元素，MutationObserver 一直触发，**页面直接卡死**
  （表现为 `DOMContentLoaded` 永远不来，Playwright goto 超时 30 秒）。
  正确做法：先算出目标序列，再找「序列之外」的元素当锚点，锚点不再随插入变化。
  ⚠️ 死循环排查小技巧：CDP `Profiler` 采样显示主线程 **idle** 时，
    不是 CPU 死循环，而是事件循环里的 MutationObserver 反复触发。
- **游戏页的返回键要钉成 44**：游戏页自己的 `.gk-back` 是 38 宽，
  收进列后比旁边的钮窄 → 居中后左边缘差几像素，看着就是「竖列没对齐」。
- **测 translate-kit 不能等真 CDN**：`translate-kit` 的按钮是 translate.js 回调
  `selectLanguageTag.customUI` 时才建的，本地没网就永远挂不上，看起来像「按钮没了」。
  测的时候用 `page.route()` 把远程 translate.js 换成一个 stub（要有 `version`、
  `language.getCurrent/setLocal`、`changeLanguage`、`execute`、`reset`、`service.use`），
  再由 stub 主动调一次 `customUI([...])` 就能把按钮和面板逼出来。
  ⚠️ route 的匹配串别写成 `**/*translate*.js*` —— 会把 `translate-kit.js` 自己也换掉。
- **上游 translate.js 的语言表本身是坏的**：`language.json` 里有一批语言名后面误加了 `Name`
  （`punjabi → "ਪੰਜਾਬੀName"`、`indonesian → "IndonesiaName"`、`telugu / kannada / marathi /
  nepali / pashto / icelandic / khmer` 同病），还有拼错的（`tamil → "தாமில்"`、
  `persian → "Persian"`、`thai → "คนไทย"`）。直接用它显示，列表里就是「ਪੰਜਾਬੀName」这种。
  对策：**本地维护 `META` 表**（id → [国旗, 正确语言名]，覆盖上游全部语言），
  再加一层 `cleanName()` 兜底把结尾的 `Name` 去掉。
  ⚠️ 上游语言表会变（换 id、加语言），改 `META` 时要对着
  `translate.min.js` 里的 `language:{json:[...]}` 核对一遍。
- **语言名不要用 `nowrap` + `text-overflow: ellipsis`**：面板只有 216px 宽，
  `ភាសា ខ្មែរ`、`ᐃᓄᒃᑎᑐᑦ`、`Te Reo Māori` 这类名字会被省略号截断 —— 那就是「选项看不完整」。
  要允许换行（`white-space: normal` + `overflow-wrap: anywhere`）。
- **列表有 70 多项，当前语言往往在中间**：打开面板看不见自己现在用哪个语言。
  `openPanel()` 里加 `revealCurrent()`：当前项不在可视区时把它滚到中间（已经看得见就不动）。
- 语言列表通过 `selectLanguageTag.customUI` 注入；`changeLanguage` 会触发重新渲染，所以 `customUI` 里**必须判断 UI 是否已存在**，只更新状态、不要重建，否则面板会重复。
- 面板根节点带 `ignore` 类，否则页面翻译时连语言名一起被翻掉。
- 切换语言**不要**手写 `localStorage['to']`，那是 translate.js 的内部键，会和页面翻译记忆打架。
- **多源不能并行注入**：两个源同时加载成功时，translate.js 自己会抛「重复加载」异常把控制台刷红。
  必须串行；且**换源之前要先检查 `window.translate && window.translate.version`** ——
  超时被摘掉的慢源稍后仍然会执行完，不检查就会出现「摘掉一个、注入下一个、两个都生效」。
  `SOURCE_TIMEOUT` 也因此定在 10 秒（早先 7 秒太短，只是慢不是挂的源经常被误判）。

#### 7.8.2 手机端工具坞 `dock-kit.js`

**触发条件**：`(max-width:600px)` 或 `(hover:none) and (pointer:coarse) and (max-width:920px)`。桌面宽度**不启用**，布局零影响。

**坞里统一放这几样**（从上到下）：**返回 · 主题 · 语言 · 全屏 · 页面自己的工具条（保存/下载在里头）**。

**两种模式**：

| 场景 | 做法 |
| --- | --- |
| 有 `.gk-tools`（游戏页） | 原地折叠：在列首插一个 `⋮` 开关，全屏钮、返回键 `.gk-back` 并进该列；收起时只留开关 |
| 其他页面 | 新建 `.dk` 坞（`⋮` 开关 + `.dk-items`），把返回/主题/语言/全屏/工具条搬进去 |

**各页面按钮的来源（选择器五花八门，全靠这一层统一）**：

| 坞里的东西 | 来源 | 说明 |
| --- | --- | --- |
| 返回 | `a.gk-back` / `a.ui.back` / `a.back-btn` / `a.back` / `a.tb-back` | 全站 5 种写法；**克隆**一个统一的圆形钮进坞，原按钮窄屏隐藏 |
| 主题 | `button.tk-btn` + `div.tk-panel` | theme-kit 的按钮与面板是两个**独立的 fixed 节点**，必须一起搬，否则面板会跑回屏幕右上角对不上按钮 |
| 语言 | `div.tk-t`（float 悬浮钮、inline 页头钮都收） | translate-kit 改成无条件调 `DockKit.add(wrap)`，宽屏时 `add()` 直接忽略 |
| 全屏 | `#fsKitBtn` | fs-kit 注入；自带全屏钮的 3 个页面（aurora/starfield/standby）没有这个 id |
| 下载/保存 | 留在底部工具条 `.ui.bar` 里，**工具条本身不进坞**；进坞的是 `.ui.tools` / `.ui.side` / `.ui.palette` / `.ui.panel` / `.pk.pk-float` / 固定 `.tools` | **静态表单里的下载按钮不动**（`visual-gradient/poster/pixel-avatar`、toolbox 面板里的「下载 PNG」）—— 那是页面主流程，抽走就丢了上下文 |

**细节**：

- **坞固定在右下角**（`dk-bottom`）。早期按「第一个被收纳工具的原位置」判上/下，工具挂在页头时坞就跑到右上角，
  用户反馈「程序坞位置不对」。现在除游戏页原地折叠外，一律右下角。
- **坞钮外观统一成「跟主题走的卡片式圆钮」**：44×44、右边距 18px，和 `x.html` 的悬浮目录钮、
  全屏钮落在同一条竖线上（三者中心 x 相同）。颜色用 `var(--card)` / `var(--line)` / `var(--text-2)`
  / `var(--shadow)`，主题一换整坞一起变；**无主题变量的画布页**（氛围屏 / 画板 / 手写板）自动回落到原来的
  深色玻璃 `rgba(14,16,26,.66)`，否则白底白钮看不见。游戏页右上角 `.gk-tools` 工具列**不在统一范围内**，
  保持 38px 紧凑，不挤占画面。
- **展开后按钮紧挨着开关往下排**，间距 8px，整列靠右对齐（`align-items:flex-end`）。
- **`.ui.bar` 工具条不进坞**（`__dkRank` 里没有它）：它本身就是「贴底通栏 + 横向滚动」
  （`left:50%` + `translateX(-50%)` + `max-width:calc(100vw - 20px)` + `overflow-x:auto`）。
  收进坞后会被压成坞里的一行，示例 / 描红 / 撤销 / 保存全被挤到屏幕外，用户点不到就以为「按钮坏了」。
  坞改为避让它，停在它正上方。
- 坞内顺序用 `__dkRank` 固定：返回(0) → 主题(1) → 语言(2) → 全屏(3) → 调色盘(5)。
  异步补进来的节点按 rank 插回正确位置，否则会把竖排按钮割断。
- 被收纳节点加 `.dk-item` 类，统一解除各自的 `fixed` 定位与 `transform`（样式本身保留）。
  `.dk-item` 用 `position: relative` 而不是 `static`：主题/语言面板是绝对定位的，要相对按钮展开。
- 移动前记录原父级 + 相邻节点，切回桌面宽度时**逆序还原**。
- **按钮多到一屏放不下时**：坞按剩余空间限高（`max-height`，随避让位置动态重算），
  展开的按钮列（`.dk-items`）**自己上下滑动**，滑到底能看全所有按钮。
  注意 `.dk-items > *` 必须写 `flex:0 0 auto` —— flex 默认 `shrink=1`，
  不加的话空间不够时按钮会被压成扁片，而不是出现滚动条；
  同理 `.dk > .dk-toggle` 也要 `flex:0 0 auto`，否则开关会被压成椭圆（44×38）。
  按钮列**不要加 padding**：加了之后按钮列右边缘比开关左移 2px，两者就不在同一条竖线上了。
  滚动条**不显示**（`scrollbar-width:none` + `::-webkit-scrollbar{display:none}`），只是手势区。
- 坞会检测是否压到其他 `fixed` UI，自动逐级平移避让。
  **但避让结果是「算一次」的**，页面自己的固定 UI 一变（句子条展开/收起、面板开合）就必须重算 ——
  坞只会往上躲，不会自己下来，典型的表现是「文本框都收起了，程序坞还顶在屏幕中间」。
  现在用 `MutationObserver` 盯着 `body` 的 class/style/结构变化（120ms 防抖）自动重算，坞自己的改动除外。
- 沉浸式页面的坞带 `ui` 类，跟随页面闲置淡出；点开关时顺手清掉 `body.idle`，否则工具条是半透明的。
- 默认收起；点坞外按钮或按 Esc 收起；点坞内按钮不收起（方便连着用）。
- 其他组件可注册：`DockKit.add(node)`（`translate-kit` 已调用）。
- 有些节点是别的脚本异步生成的（主题按钮、工具箱页头、语言钮），首帧可能还没出来 → 启动后再扫几轮补进坞。
- **右侧悬浮件统一竖线**：全站右侧那些竖排的悬浮件，右边缘必须落在**同一条竖线上**，
  不然看着就是「按钮没对齐」。原来各家各写各的右距：
  全屏钮 `fsk-kit` 18px、调色球 `palette-kit` 14px、主题钮 `theme-kit` 12px（面板也是 12px）、
  游戏工具列 `game-kit` 14px、页面自带的 `.ui.tools/.ui.side/.ui.palette` 又是 10~14px 不等。
  现在由 `dock-kit.js` 统一成 `calc(18px + env(safe-area-inset-right))`，
  覆盖 `.fsk-btn / .tk-btn / .tk-panel / .pk-float / .gk-tools / .gk-dpad / .ui.tools / .ui.side / .ui.palette / .ui.clock`，
  与工具坞 `.dk`（18px）、悬浮目录钮一致。
  **这条规则桌面端也必须生效** —— 桌面端不建坞，但右侧浮层照样要对齐，
  所以 `injectStyle()` 改成**无条件注入**（模块加载即注入，`setup()` 里再调一次是幂等的）。
- **右侧悬浮圆钮统一 44px**：右边缘齐了还不够，**尺寸也得一样**，否则圆心差 3px，一样看着没对齐。
  原来各 kit 各订各的：全屏 44、主题 38、调色球 38（手机 42）、保存/下载 38、游戏工具钮 38、
  页面自己写的 `.btn` / `.tool-btn` 也是 38。44 是全站标准（全屏钮、导航页目录钮、工具坞圆钮都是 44），
  统一后同一列的圆钮才真的齐。

**踩过的坑**：

- 开关逻辑必须是 `setCollapsed(!isCollapsed())`：早期写成 `setCollapsed(isCollapsed())`，等于永远保持当前状态，**点了没反应**。
- 收纳进来的节点如果还带 `transform`（居中写法常见），`fixed` 子元素的包含块会跟着变，导致面板宽度塌陷 —— 所以 `.dk-item` 里统一 `transform: none !important`。
- **避让检测必须排除「坞自己」的节点**：坞里的主题面板 / 语言面板在手机上被改成 `position:fixed` 底部抽屉，
  不排除的话坞会判定「和自己重叠」，每轮上移 52px（最多 6 轮），最后停在屏幕正中间，
  底部工具条也跟着飘到半空 —— 这是「工具栏跑到屏幕中央」的根因。
  面板打开时坞被它盖住是正常的（同属一套 UI，面板 z-index 更高），关掉面板坞就回原位。
- **但要区分「坞内」和「坞外」**：页面自己的 fixed 浮层（没进坞的 `.ui.bar`、`.ui.hint`、画布上的浮层）
  仍是要避让的对象，不能一刀切 `document.body 全跳过`。
- **展开动画期间量不准**：`.dk-items` 的入场动画带 `transform`，会让 `fixed` 子元素的包含块变成它自己，
  这时测出来的位置是错的（坞会一路顶到屏幕中间）。要等动画结束（约 280ms）再测一次。
- **返回键要跟着 `nav-kit` 的 `no-back` 走**：直接打开页面（referrer 不同源）时 nav-kit 会给 `<html>` 加
  `no-back` 隐藏返回键；坞里克隆的按钮不受那条 CSS 管，得自己判断，否则直接进页面也会冒出个退不掉的返回。
- 语言按钮 inline 模式带 `margin-left: auto`，进坞后会被推到边上，进坞要复位。
- **统一 `right` 之后坞内反而错开了**：`.dk-item` 把进坞的节点改成 `position: relative`，
  而 `relative + right: 18px` 等于「相对原位置右移 18px」，整列按钮横向错开 18px。
  复位要写成 `.dk-item { right: auto !important; }` —— 不能只写 `.dk .xxx`：
  **游戏页的工具列是 `.gk-tools`（不是 `.dk`）**，全屏钮被收进它以后同样带着 `.dk-item`，
  漏掉的话游戏页手机上那一列会整体偏 18px。
  这条复位规则还必须**排在统一 `right` 规则之后** —— 同等特异性下后写的赢。
  主题 / 语言面板是底部抽屉，`right` 保持 10px（写在复位之后）。
- **HTML 内联 style 压得住 CSS 规则**：`visual-constellation` 的 burstBtn 把尺寸写在
  `style="width:38px;height:38px"` 上，内联 style 优先级高于普通 CSS 规则，
  统一尺寸的规则写多少遍都不生效 —— 要么给规则加 `!important`，要么直接改源头的内联 style。
- **各 kit 的样式注入有先后**：`translate-kit` 是后注入的，同等优先级会被它的 38px 顶回去，
  语言钮 `.tk-t-round` 必须用 `!important` 才压得住。
- **页面自己的特例会被全局规则压掉**：`tool-handwriting.html` 让全屏钮右移 64px 避开拖拽把手，
  它和全局规则都是 `!important`、选择器同级 → 按加载顺序全局规则会赢，让位失效。
  把特例的选择器写成 `body .fsk-btn`（多一级、特异性更高）才保得住。

#### 7.8.3 素材库与 m3u8 播放 `tool-materials.html`

**结构**：`ToolBox.mount` 两个 tab（视频素材 / 图片素材），列表存 `localStorage['tb_materials']`。

**内置素材**：页面里写死了一批素材（12 张图 + 1 条视频，来自 `basic_app` 的「我的素材」页），
放在两个 tab 各自的「内置素材」卡片里，**只读展示，不进 localStorage**，
和用户自己粘的列表分开；图片区有「全部加入我的素材」按钮，可以一键收进自己的列表。

**踩过的坑（内置素材这批）**：
- 那条视频地址原本是 `http://`，站点是 https 部署 → **浏览器会按混合内容直接拦掉**，
  页面里统一改成 `https://`（同域名支持 https，实测 200 / video/mpeg4）。
  凡是写死在页面里的远程资源，都要检查协议，别从老项目里直接抄 http 链接。
- 图片 / 视频能显示是因为 `<img>` / `<video>` 不需要 CORS；
  但**下载走 fetch 会被源站挡掉**（这个 OSS 没有 `Access-Control-Allow-Origin`），
  所以 `downloadRemote()` 失败时要退回「新窗口打开」并给出提示。
- OSS 上的文件名是一串哈希（uuid），当标题没意义 → `nameOf()` 遇到纯数字或长哈希一律换成「图片 N」。

**m3u8 播放**：
- `hls.js` **本地化**放在 `assets/js/hls.min.js`（约 413 KB），不引 CDN —— 外链库挂了就整页播放不了。
- Safari 原生能播 m3u8（`canPlayType('application/vnd.apple.mpegurl')`），优先走原生；
  其余浏览器用 hls.js，Safari 走原生时不会白白加载一份 413 KB 的库。
- **能不能播取决于源站**：跨域的 m3u8 需要源站返回 `Access-Control-Allow-Origin`，
  不给就是「网络错误」，页面里已把这类失败翻译成「多半是源站跨域（CORS）不允许」，
  并保留「新窗口打开」兜底。
- 播放器**按需挂载**：卡片先显示 ▶ 按钮，点一下才 `loadSource` + `attachMedia`，
  避免一屏十几个流同时拉。

**踩过的坑**：
- **添加链接不要整表重建**。重建会把正在播放的那张卡片换掉（播放中断），
  现在用「增量追加」：`addUrls()` 返回本次新增的条目，只 append 新卡片；
  顺带 `destroyHls()` 改成只销毁「media 已不在 DOM 里」的实例，不再一刀切。
- **无扩展名的链接判不出类型**（如 `https://cdn/xxx/240/240`、带签名参数的地址），
  按扩展名猜会把图片塞进视频列表。所以添加框带一个「类型」下拉：自动 / 视频 / 图片。
- 图片网格用 `loading="lazy"`，图片在视口外时 `naturalWidth` 是 0 —— 这是懒加载的正常表现，不是加载失败。

---

### 7.9 全站体积、移动端与可访问性约定

一次性做过的清理，新页面照这个来。

**`books.json` 保持原来的对象数组格式，不要再改结构**（当前 6.80 MB）：

曾经试过「表头 + 二维数组 + meta」的紧凑格式（能把 6.80 MB 压到 2.07 MB），
在本地验证一切正常，但**上线后搜书直接不可用**，已回滚。原因：

`books.json` 和 `ebook-search.js` 是**两个独立的缓存单元**（CDN、浏览器各缓各的）。
只要其中一方还是旧版，格式就对不上：

- 旧 JS + 新 JSON → `ALL_BOOKS = {meta, cols, rows}`，`ALL_BOOKS.length` 是 `undefined`，
  搜索循环一次都不执行 → 永远「没有找到相关书籍」；
- 新 JS + 旧 JSON → 能兼容，但反之不行。

而静态托管（GitHub Pages / 各种 CDN）刷新缓存是**异步、不可控**的，无法保证两者同时生效。
数据格式要和代码**原子地一起更新**，在纯静态站里做不到。

所以：**要减体积就动传输层，别动数据结构** —— 让托管开启 gzip/brotli
（实测 864 KB / 425 KB），或者按分类分片懒加载。

顺带：`docs/电子资源.md` 里没有 `<div id="ebook-categories">` 容器，
而 `renderCategories()` 找的正是这个 id，所以**分类芯片一直不显示**（`if (!box) return;`）。
要恢复分类筛选，需要在那个 Markdown 里补上这个容器。

**移动端视口高度**：整屏页写 `min-height:100vh;min-height:100dvh;`（两行都要，
前一行给老浏览器兜底）。只写 `100vh` 在 iOS Safari 地址栏收放时会裁掉底部。

**刘海屏安全区**：引用 `toolbox.css` 的页面已统一处理（`padding-bottom: calc(48px + env(safe-area-inset-bottom))`），
**不要**再按"页面里有没有 `env(safe-area-inset)`"判断是否漏配。
自己写布局的页面（`x.html`、画板/手写板、氛围屏）要自己补，尤其是 `position:fixed; bottom:…` 的浮层。

**焦点可见性**：页面里用了 `outline:none` 的，必须补一条键盘兜底，否则键盘用户看不到焦点：

```css
button:focus-visible,a:focus-visible,input:focus-visible,[tabindex]:focus-visible{
  outline:2px solid currentColor;outline-offset:2px;
}
```

**`<meta name="description">`**：43 个独立页都有，新页面照抄一句。

**文件名/日期别用 `toISOString().slice(0,10)`**：那是 UTC，中国时区 0:00–8:00 会得到前一天
（番茄钟的「今天」统计曾因此跨日错乱）。要本地日期就用：

```js
new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10)
```

**放在后台就别跑定时器**：`setInterval` 刷时钟/动画的，配一个 `visibilitychange` 停表（`visual-sky`、`x.html` 是范例）。

**两件"看着重复但不要动"的事**：

- **`.back{}` 返回键样式在 18 个页面各写一份** —— 它们分成 4 类完全不同的设计：深色氛围屏（半透明深底+白边）、
  浅色工具页（白底+blur）、跟随主题变量的（`var(--card)`/`var(--line)`，且**在工具栏里 flex 排列、不带 fixed 定位**）、
  game-hub 专属（38px 圆角方钮）。统一注入会破坏其中一类，且独立页的设计原则是"单文件自包含、可单独复制"，
  不引入外部 CSS。
- **保存逻辑 9 个页面各写各的** —— `save-kit.js` 是为"氛围屏壁纸"设计的（自带圆形按钮、尺寸选择菜单、toast），
  与这些页面已成型 UI 不匹配；强行 `mountButton` 会出现两个保存按钮。画板/手写板还有"纸色合成 / 透明底"语义。
  只有新页面直接上 `SaveKit`，老页面保持原样。

---

## 8. 故障排查

| 症状 | 原因 + 修复 |
| --- | --- |
| 侧栏里没有我刚加的栏目 | 没跑 `update_sidebar.py`；等 10:30 自动跑，或手动跑 |
| 跑完脚本后，我的某个栏目消失了 | 那个栏目**不**在锁定名单里，且它的目录被删掉了；要么把目录找回来，要么在 LOCKED_ENTRIES 里加条兜底 |
| 「今日新增」表里软考中级顺序又乱了 | `update_sidebar.py` 顶部的 `SOFT_EXAM_MIDDLE_ORDER` 被改过，恢复成 [system集, 监, 管] |
| 浏览器侧栏 hover 没效果 | 1) `Ctrl+Shift+R` 硬刷；2) 检查 `<script src="assets/js/living-better-search.js">` 是否被注释；3) DevTools 看 console 有没有 404 |
| hover 一级菜单子项跟着变 | 说明你的浏览器版本不支持 `:has(ul)`；改用兜底方案，给 `<p>` 的子 `<ul>` 单独写 `text-decoration: none` reset |
| 搜索「电子资源」返回空白 | 1) `assets/json/books.json` 是否还在；2) DevTools 看 Network 里 `assets/json/books.json` 是不是 200；3) 直接访问 `/assets/json/books.json` 看是否 JSON 合法 |
| 「高性价比」卡片 hover 整片变成手型 | 上一次会话改过 `assets/js/ebook-search.js`；它的卡片渲染层从 `<div>` 升级成了 `<a>`，确保手里那一份也是升级版 |
| 更新脚本报 SHA256 mismatch 或 _sidebar 被改坏 | 用 build_kb.sh 备份恢复，或从 git 看 diff |
| 全站搜索页一直卡在「正在建立索引 x / 882…」 | 检查 `html/search.html` 里有没有把行首空白写成 `\s`（含换行会跨行回溯，见 7.4）；或 `_sidebar.md` 是否正常返回 |
| 全站搜索页打不开、报 404 | 确认文件在 `html/search.html`（不是 `docs/` 下），且 `x.html` 里的链接是 `html/search.html` |
| 搜索页搜不到某篇新文档 | 该文档还没进 `_sidebar.md`；跑一次 `update_sidebar.py`，或在搜索页点「重建索引」 |
| 首页首屏卡住、字体没出来 | 检查 `assets/css/vue.css` 顶部的 `@font-face` 是否指向 `../fonts/*.woff2`，且 `assets/fonts/` 里的文件在不在 |
| 搜索结果标题显示成「[← 回XX总目录](/docs/XX)」 | `pickTitle()` 没优先取 Markdown 标题行，退化成了「首个非空行」（见 7.4 的坑列表） |
| 搜索页二次打开变成全量重建、慢到十几秒 | 上一次的 IndexedDB 写入没完成就被关页了；或点过「重建索引」把缓存清了。等写入完成再关页，或直接重开 |
| 工具页里输入框压到旁边的框 / 超出卡片边框 | `box-sizing` 没归一，见 7.5 第 1 条（`.tb-page` 作用域内加一条全局 `border-box`） |
| 手机上点输入框整个页面被放大 | 输入框字号 < 16px，iOS Safari 会自动放大整页，见 7.5 第 2 条 |
| 手机上 tab 栏最后一个被切掉一半 | 窄屏改 `flex-wrap: wrap`，见 7.5 第 6 条 |
| 卡片标题看起来被下面的输入框「切掉半行」 | 标题是 flex + `line-height: 1.6`，字在行盒里居中；见 7.5 第 4 条 |
| 取色器「配色方案」的色块全是黑的 | `rgb2hsl()` 返回的 s/l 是 0~100（要显示 `hsl(50%,50%)`），但 `harmony()` 是照抄 `palette-kit.js` 的 **0~1** 逻辑，被 `Math.min(1,…)` 截断后又送进按 0~100 换算的 `hsl2rgb()`（内部除以 100）→ 饱和度 0.01、亮度 0.0088 → 全渲染成 `#020202`。**同一套颜色转换只能有一套单位约定** |
| 取色器里点色块复制「没反应」，要点两次 | 色块渲染用了 `sw.innerHTML = ''` 重建 DOM。改主色后失焦触发 `change → draw() → 重建`，鼠标按下时是旧元素、抬起时是新元素，`click` 根本不触发。**列表类 DOM 要就地更新，不要每次重建** |
| 图片处理页拖参数预览不更新，必须点按钮 | 绘制和编码捆在一个 `run` 里了，见 7.5 第 7 条（拆成 `paint` + `run`） |
| 搜索框里的图标偏下、没垂直居中 | 图标用 `top:50%` 定位，参照物却是「输入框 + 下方提示行」的整个容器。要给输入框单独包一层 `position:relative` 的定位容器 |
| 某页没有翻译按钮 | 1) 网络能否访问 `res.zvo.cn` / `cdn.jsdelivr.net`；2) console 有没有 `[translate-kit] 组件加载失败`；3) 该页 `</head>` 前是否有 `translate-kit.js`；4) 是否设了 `window.__TK_NO_PAGE_UI__`（翻译工具页就是故意不显示） |
| 手机端点翻译按钮看不到面板 / 选不了语言 | 面板被带 `backdrop-filter` / `transform` 的祖先困住了。`translate-kit` 已在手机端把面板挂到 `body`（见 7.8.1）；若新页面自己搬过容器要检查 |
| 手机端工具栏按钮散落、挡住操作 | `dock-kit.js` 没生效：检查是否引入、宽度是否 ≤600px、新增悬浮钮是否放进 `.ui.tools` / `.ui.side` / `.ui.palette` / `.ui.panel` 或调用 `DockKit.add`（见 7.8.2） |
| 手机端工具条 / 坞飘到屏幕中央 | `overlapsFixed()` 没排除坞自己的节点：坞里的主题 / 语言面板是 `position:fixed`，坞会判定「和自己重叠」而每轮上移 52px，最后停在屏幕中间。确认 `if (dock.contains(x)) continue;` 还在 |
| 手机端工具条上的「示例 / 描红 / 保存」点不到 | 工具条被收进坞了：`.ui.bar` 必须留在页面原位（贴底通栏 + 横向滚动），`collect()` 里不要收集它 |
| 手机端点 `⋮` 展开没反应 | 开关逻辑写反了（应为 `setCollapsed(!isCollapsed())`），见 7.8.2 的坑 |
| 手机收起工具坞后又自动变回原样 | 页面在移动端期间重建过 DOM（如重渲染 `.tools`），坞的还原记录失效；刷新页面即可 |
| 某页翻译成外语后，所有页面都变外语 | 这是**跨页面记忆**的设计（`kb_translate_lang`）。清除：DevTools → Application → Local Storage 删 `kb_translate_lang` 和 `to` |
| 翻译工具页中文译中文没反应 | 有意为之：大段中文 + 目标中文时直接原样返回，避免无意义请求；换个目标语种即可 |
| 翻译工具页一直显示「组件加载中…」 | `TranslateKit.ready` 没回调：说明三源都没加载成功，检查网络或 console 报错；也可临时把 `translate-kit.js` 顶部 `SOURCES` 里能访问的那条挪到第一位 |

---

## 9. 本地预览

```powershell
cd C:\Users\42692\WorkBuddy\Claw\knowledge-base
python -m http.server 8765
```

然后浏览器打开：

**docsify 部分**
- `http://localhost:8765/` ← 首页
- `http://localhost:8765/#/docs/电子资源` ← 电子资源（搜索 UI）
- `http://localhost:8765/#/docs/高性价比` ← 高性价比入口
- `http://localhost:8765/#/docs/高性价比/01-不要早死` ← 具体章节

**独立页面部分**（`html/` 与 `x.html`）
- `http://localhost:8765/x.html` ← 独立页面导航，推荐从这里进
- `http://localhost:8765/html/tool-translate.html` ← 翻译工具
- `http://localhost:8765/html/game-hub.html` ← 游戏中心
- `http://localhost:8765/html/visual-rain.html` ← 雨夜玻璃
- `http://localhost:8765/html/search.html` ← 全站文档检索

> 独立页面同样**必须走 HTTP**：`translate-kit` 的远程组件、`search.html` 的 IndexedDB 索引、`books.json` 的 `fetch` 在 `file://` 下都会被浏览器拦掉。

> 注意：**必须用 HTTP server 打开**，不能直接 `file://`，因为 `assets/*.json` 用 `fetch()` 拉，浏览器不允许跨协议的 `file://` 请求。

---

## 10. 一句话总结

- **搭**：docsify + 两个自定义搜索插件 + 一个 Python 维护脚本，丢 GitHub Pages 完事
- **写**：在 `docs/<栏目>/` 下放 markdown，文件名按栏目规范
- **更**：等 10:30 自动跑，或手动 `python update_sidebar.py`
- **稳**：首页 / 电子资源 / 高性价比 三个菜单已被脚本锁定，不会乱动
- **独立页**：`html/` 下 43 个原生页面 + `x.html` 导航，共享 12 个套件；改样式先看 7.7，加页面按 7.7.6
- **双端**：翻译（`translate-kit`）与手机工具坞（`dock-kit`）全站注入，PC 与手机共用同一套页面，靠媒体查询和运行时脚本适配

« 其他文件：README.md（docsify 首页）· _sidebar.md（侧栏）· update_sidebar.py（维护脚本）· x.html（独立页面导航） »
