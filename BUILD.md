# 知识库搭建与维护说明

> 这份文档讲这个静态知识库「怎么搭起来的、用什么技术、内容是什么、每条菜单什么意思、平时怎么维护」。写给「半年后想改一个东西、但忘了当时怎么想的」的自己。

---

## 1. 项目性质

`C:\Users\42692\WorkBuddy\Claw\knowledge-base` 是一个**纯静态**个人知识库，托管在 GitHub Pages（`noteveryx/noteveryx.github.io`），无后端、无数据库、不依赖任何付费服务。开一个 `python -m http.server` 就能本地预览。

它就是**你日常积累笔记 + 资料目录**的统一入口，由一段 markdown 配合 docsify 自动渲染为网页。

除此之外还有 **42 个不经过 docsify 的独立页面**（工具 / 视觉 / 游戏），统一从 `x.html` 进入，例如画板、翻译工具、雨夜玻璃、贪吃蛇。这些页面逐页说明见 [7.7](#77-独立页面html-与-xhtml)。

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
| 独立页面 | 原生 HTML + CSS + JS，`html/` 下 42 个页面 + `x.html` 导航 | 不经过 docsify；共享能力抽成 `assets/css/*-kit.css` + `assets/js/*-kit.js`（见 7.7.5） |
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
├── html/                      # 独立页面（42 个，静态托管，不走 docsify）—— 逐页说明见 7.7
│   ├── search.html            # 全站文档检索：自己抓 md 建索引，索引存 IndexedDB
│   ├── tool-*.html   ×13      # 工具页（工具箱骨架 toolbox.css/js）
│   ├── visual-*.html ×15      # 视觉页（全屏 canvas + 调色盘）
│   ├── game-hub.html          # 游戏中心（卡片索引）
│   └── game-*.html   ×12      # 游戏页（game-kit 骨架）
├── assets/                    # 静态资源
│   ├── css/
│   │   ├── vue.css            # docsify 主题；字体已本地化（@font-face 指向 ../fonts/）
│   │   ├── themes.css         # 独立页面 7 套主题变量（emerald/midnight/sunset/violet/ink/crimson/stone）
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
│   │   └── translate-kit.js / dock-kit.js   # 全站注入：页面翻译 / 手机端工具坞
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
| ⚡ 效率工具 | 6 | 取色器、文本工具箱、图片处理台、文本对比、番茄钟、二维码 |
| 🌌 氛围屏 | 5 | 极光、星空漫游、雨夜玻璃、雪落、实时天光 |
| 👆 交互视觉 | 5 | 波浪点阵、分形缩放、粒子引力场、文字形变、粒子文字 |
| ✨ 生成器 | 5 | 句子海报、曼陀罗、渐变配色、噪声壁纸、像素头像 |
| 🖌️ 画板 | 2 | 手写板、画板 |
| 🎮 小游戏 | 13 | 游戏中心 + 12 个游戏 |
| 🛡️ 行动突围护航社 | 1 | 独立活动页 |
| 🧭 快捷导航 | 30 | 常用外部站点直达 |

页面本身附带：**主题切换**（7 套，存 `tk_theme`）、**页面翻译**（28 种语言，存 `kb_translate_lang`）、卡片图标徽章、滚动入场动效、实时时间 + 两地天气。

手机端所有悬浮工具按钮会收进**可折叠工具坞**（右下或右上角 `⋮`），详见 7.8.2。

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

`html/` 下 **42 个页面**全部是原生 HTML，不经过 docsify，各自独立可访问。改样式 / 加按钮前，先看 7.7.5 的套件速查。

#### 7.7.1 页面总览

| 分类 | 数量 | 文件前缀 | 统一骨架 | 入口 |
| --- | --- | --- | --- | --- |
| 工具 | 13 | `tool-*.html` | `toolbox.css/js` + `theme-kit` | `x.html` → 工具 / 效率工具 |
| 视觉 | 15 | `visual-*.html` | 全屏 canvas + `palette-kit` | `x.html` → 氛围屏 / 交互视觉 / 生成器 |
| 游戏 | 12 + 中心 | `game-*.html` | `game-kit.css/js` | `x.html` → 小游戏 / `game-hub.html` |
| 检索 | 1 | `search.html` | `toolbox.css/js` | `x.html` → 工具 |
| 导航 | 1 | `x.html` | 独立样式（顶栏 + 卡片网格） | 站点根路径 |

所有独立页的 `<head>` 引用顺序固定为：`viewport` → `theme-color` → favicon → `themes.css` → 套件 CSS → **主题 boot 内联脚本** → `defer` 引各套件 JS。顺序别乱：主题 boot 必须在 CSS 之后、`theme-kit.js` 之前，否则首屏会闪一下默认色。

#### 7.7.2 工具页（13 个）

| 文件 | 标题 | 做什么 | 关键依赖 |
| --- | --- | --- | --- |
| `tool-qrcode.html` | 二维码生成 | 文本 / 链接 → 二维码，可下载 | `qrcode.js`（本地库，无外链） |
| `tool-textbox.html` | 文本工具箱 | 多子工具 tab：字数统计、大小写、去重等 | `toolbox` |
| `tool-diff.html` | 文本对比 | 两段文本逐行差异对比 | `toolbox` |
| `tool-image.html` | 图片处理台 | 压缩 / 旋转 / 水印 / 格式转换；`paint`（实时预览）+ `run`（导出）双回调 | `toolbox` |
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
| `themes.css` | 7 套主题变量（青瓷绿 / 夜航蓝 / 琥珀橙 / 藕荷紫 / 墨玉青 / 胭脂红 / 雾石灰） | 所有独立页 | `data-theme` 取 `emerald / midnight / sunset / violet / ink / crimson / stone`（**id 是 localStorage 键，换色可以、换 id 不行**）；换色或加主题要同步五处：本文件、`theme-kit.js` 的 `THEMES`（色点 + `meta`）、**15 个页面防闪脚本里的 id 数组**（漏改会导致新主题被当成非法值回落到默认）、`x.html` 内联的 7 套变量与面板色点、`tool-standby.html` 自带的 7 套 |
| `theme-kit.css/js` | 主题切换按钮 + 面板 | 工具页、生成器页 | 自动挂到页头；主题存 `localStorage['tk_theme']` |
| `toolbox.css/js` | 工具箱页骨架 | 工具页、`search.html` | `ToolBox.mount(root, {title, sub, storageKey, tabs})`；工具方法 `ToolBox.el / toast / copy` |
| `game-kit.css/js` | 游戏页骨架 | 12 个游戏 | `GameKit.create(opts)` 负责 HUD / 工具列 / D-pad / 返回 |
| `palette-kit.css/js` | 调色盘悬浮球 + 面板 | 画板、视觉页、游戏 | 触发球挂在页面自己的 `.pk` 元素里；颜色跟随主题 |
| `fs-kit.js` | 全屏按钮 | 全部独立页 | 自动避让右下角固定 UI；页面已有 `#btnFull` 时不重复挂 |
| `save-kit.js` | 保存 / 导出 | 句子收藏、部分视觉页 | canvas → 图片 / 文本导出 |
| `text-kit.css/js` + `quotes-data.js` | 句子条组件 | 粒子文字 / 海报 / 文字形变 | `TextKit.mountBar(host, {layout, limit, value, onChange})` |
| `qrcode.js` | 二维码生成 | 二维码页 | 本地实现，无外链 |
| `translate-kit.js` | 页面翻译 | **全部 42 页 + `x.html`** | 见 7.8.1 |
| `dock-kit.js` | 手机端工具坞 | **全部 42 页 + `x.html`** | 见 7.8.2 |

#### 7.7.6 新增一个页面的标准流程

1. **复制最接近的页面**：工具页抄 `tool-textbox.html`，视觉页抄 `visual-noise.html`，游戏页抄 `game-snake.html`。
2. **`<head>` 引用顺序**：`themes.css` → 套件 CSS → 主题 boot 内联脚本 → `theme-kit.js` / 套件 JS / `translate-kit.js` / `dock-kit.js`（全部 `defer`）。
3. **工具页骨架**：`<body class="tb-page">`、`<div id="tbRoot"></div>`、`ToolBox.mount(...)`，并把 `<meta name="theme-color">` 改成该页主题色。
4. **注册到导航**：在 `x.html` 加一张 `.sp-card` 卡片，并在 JS 的 `CARD_ICONS` 映射表里加 emoji 图标（不加就没有图标徽章）；游戏要另加到 `game-hub.html` 的卡片网格。
5. **同步文案里的数量**：`x.html` 搜索卡片写着「检索全部 937 篇文档」，`html/` 页面卡片写着「42 个页面」，加文档 / 加页面后记得改（本文档正文里的篇数口径也要跟着改）。
6. **新增悬浮按钮时**：要么放进页面的 `.ui.tools` 容器，要么调用 `DockKit.add(node)`，否则手机端不会被工具坞收纳（见 7.8.2）。

---

### 7.8 页面翻译与手机端工具坞

`translate-kit.js` 和 `dock-kit.js` 是**全站注入**的：42 个 `html/` 页面 + `x.html`，每个文件的 `</head>` 前都有一行 `defer` 引用。

#### 7.8.1 页面翻译 `translate-kit.js`

**实现**：封装开源 [translate.js](https://gitee.com/mail_osc/translate)，但隐藏它自带的原生下拉框，改用与站点一致的语言面板。

**加载**：三个源**并行**加载，先成功者生效（锁定实例，后续源即使到达也不影响）：

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

**踩过的坑**：

- **手机端面板必须挂到 `body`**：`x.html` 顶栏有 `backdrop-filter`，会成为 `position: fixed` 子元素的包含块 —— 面板留在顶栏里时被定位进顶栏内部，**完全看不到、点不了**。现在手机端打开面板时把它 `appendChild` 到 `body`，桌面端再放回按钮容器。
- 语言列表通过 `selectLanguageTag.customUI` 注入；`changeLanguage` 会触发重新渲染，所以 `customUI` 里**必须判断 UI 是否已存在**，只更新状态、不要重建，否则面板会重复。
- 面板根节点带 `ignore` 类，否则页面翻译时连语言名一起被翻掉。
- 切换语言**不要**手写 `localStorage['to']`，那是 translate.js 的内部键，会和页面翻译记忆打架。

#### 7.8.2 手机端工具坞 `dock-kit.js`

**触发条件**：`(max-width:600px)` 或 `(hover:none) and (pointer:coarse) and (max-width:920px)`。桌面宽度**不启用**，布局零影响。

**两种模式**：

| 场景 | 做法 |
| --- | --- |
| 有 `.gk-tools`（游戏页） | 原地折叠：在列首插一个 `⋮` 开关，全屏钮并进该列；收起时只留开关 |
| 其他页面 | 新建 `.dk` 坞（`⋮` 开关 + `.dk-items`），把 `.ui.tools` / `.pk.pk-float` / 固定 `.tools` / `#fsKitBtn` / `.tk-t` 搬进去 |
| 只有 1 个悬浮钮（工具箱页、首页） | **不建坞**，保持原样（一个按钮不值得收纳） |

**细节**：

- 被收纳节点加 `.dk-item` 类，统一解除各自的 `fixed` 定位与 `transform`（样式本身保留）。
- 移动前记录原父级 + 相邻节点，切回桌面宽度时**逆序还原**。
- 坞会检测是否压到其他 `fixed` UI，自动逐级平移避让。
- 沉浸式页面的坞带 `ui` 类，跟随页面闲置淡出。
- 默认收起；点坞外按钮或按 Esc 收起；点坞内按钮不收起（方便连着用）。
- 其他组件可注册：`DockKit.add(node)`（`translate-kit` 已调用）。

**踩过的坑**：

- 开关逻辑必须是 `setCollapsed(!isCollapsed())`：早期写成 `setCollapsed(isCollapsed())`，等于永远保持当前状态，**点了没反应**。
- 收纳进来的节点如果还带 `transform`（居中写法常见），`fixed` 子元素的包含块会跟着变，导致面板宽度塌陷 —— 所以 `.dk-item` 里统一 `transform: none !important`。

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
| 手机端工具栏按钮散落、挡住操作 | `dock-kit.js` 没生效：检查是否引入、宽度是否 ≤600px、新增悬浮钮是否放进 `.ui.tools` 或调用 `DockKit.add`（见 7.8.2） |
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
- **独立页**：`html/` 下 42 个原生页面 + `x.html` 导航，共享 12 个套件；改样式先看 7.7，加页面按 7.7.6
- **双端**：翻译（`translate-kit`）与手机工具坞（`dock-kit`）全站注入，PC 与手机共用同一套页面，靠媒体查询和运行时脚本适配

« 其他文件：README.md（docsify 首页）· _sidebar.md（侧栏）· update_sidebar.py（维护脚本）· x.html（独立页面导航） »
