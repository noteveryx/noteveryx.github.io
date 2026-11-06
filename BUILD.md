# 知识库搭建与维护说明

> 这份文档讲这个静态知识库「怎么搭起来的、用什么技术、内容是什么、每条菜单什么意思、平时怎么维护」。写给「半年后想改一个东西、但忘了当时怎么想的」的自己。

---

## 1. 项目性质

`C:\Users\42692\WorkBuddy\Claw\knowledge-base` 是一个**纯静态**个人知识库，托管在 GitHub Pages（`noteveryx/noteveryx.github.io`），无后端、无数据库、不依赖任何付费服务。开一个 `python -m http.server` 就能本地预览。

它就是**你日常积累笔记 + 资料目录**的统一入口，由一段 markdown 配合 docsify 自动渲染为网页。

---

## 2. 技术栈

| 类别 | 用了什么 | 备注 |
| --- | --- | --- |
| 静态站点引擎 | **docsify**（`assets/js/docsify.min.js`） | 客户端渲染 markdown，不需要构建步骤 |
| 主题样式 | **docsify-vue** 主题（`assets/css/vue.css`）+ `index.html` 里手写的 `<style>` 兜底 | |
| 客户端能力 | 纯 JS 插件 | docsify 钩子机制（`window.$docsify.plugins.push(fn)`） |
| 侧栏维护脚本 | **Python 3**（`update_sidebar.py`） | 没有任何第三方依赖，stdlib-only |
| 工作流自动化 | **workbuddy**（`.workbuddy/`，每天 10:30 跑脚本 + 同步到示例知识库） | workbuddy 由 Claw 项目托管 |
| 搜索引擎 | 两个**自定义** docsify 插件：<br>① `assets/js/ebook-search.js`（电子资源）<br>② `assets/js/living-better-search.js`（高性价比）<br>全站文档检索独立成页 `html/search.html`（自己建索引，不用 docsify 的 `search.min.js`） | docsify 自带的全局搜索已停用：语料 20MB → 索引 13MB，超 localStorage 10MB 配额，且每次开首页都要重抓 880 篇 |
| 数据集 | `assets/json/books.json`（24,071 条电子书，~6.8 MB）<br>`assets/json/living-better.json`（34 章元数据，~20 KB） | 仅做静态查询，不需要服务器 |

---

## 3. 目录结构

```
knowledge-base/
├── index.html                 # docsify 入口；自定义 <style> + 插件 <script> 都集中在此
├── README.md                  # docsify 首页（自动维护：今日新增 + 统计 + 仓库地址 + 访问地址）
├── _sidebar.md                # 左侧导航（自动维护）
├── update_sidebar.py          # 侧栏 + README 维护脚本
├── syzw_personal_index.json   # （遗留，私人索引；当前未直接被 docsify 使用）
├── x.html                     # 独立页面导航（工具 / 氛围屏速查，自带搜索框）
├── html/                      # 独立页面（静态托管，不走 docsify）
│   └── search.html            # 全站文档检索：自己抓 md 建索引，索引存 IndexedDB
├── assets/                    # docsify 静态资源
│   ├── docsify.min.js
│   ├── search.min.js             # （已停用，文件保留备用；不再在 index.html 引用）
│   ├── sidebar-collapse.min.js   # 让一级菜单可点击折叠
│   ├── docsify-copy-code.min.js
│   ├── zoom-image.min.js
│   ├── vue.css                  # 主题；字体已本地化（@font-face 指向 ../fonts/）
│   ├── ebook-search.js
│   ├── living-better-search.js
│   ├── fonts/                   # 本地 woff2（Source Sans Pro ×3 + Roboto Mono，~56 KB）
│   ├── books.json                # 电子资源数据
│   └── living-better.json        # 高性价比章节元数据
└── docs/                      # 一切 markdown 内容（每个子目录 = 一个栏目）
    ├── 电子资源.md            # 单页入口（搜索 UI 由 ebook-search.js 渲染）
    ├── 电子资源/              # 仅 books.json（无 .md，因此不会作为子项出现在侧栏）
    ├── 高性价比.md            # 单页入口（搜索 UI 由 living-better-search.js 渲染）
    ├── 高性价比/              # 34 个章节文件（01-不要早死.md ... 34-家里的常备药别吃出事.md）
    ├── 申论/                  # 67 个 *.md，按日期命名（2026-XX-XX.md）
    ├── 讲话稿/                # 69 个 *.md
    ├── 软考/                  # 二级目录结构
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

### 4.4 申论
日常公考笔记，按日期命名：`docs/申论/2026-XX-XX.md`，侧栏默认**倒序排**（最新在上）。

### 4.5 讲话稿
领导讲话 / 致辞类笔记，同样按日期倒序。

### 4.6 软考
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

### 4.7 示例
给新人 / 未来的自己看的一份使用指南，目前只有一个 markdown。

---

## 5. 内容是如何维护的

### 5.1 写一篇新内容

| 栏目 | 文件路径 |
| --- | --- |
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
- 语料约 20MB（880 篇 md），docsify 生成的搜索索引约 13MB，**超过 localStorage 的 10MB 配额**，
  索引永远存不进缓存；而插件「先写 expires 再写 index」，index 写失败后 expires 已落盘，
  下次访问插件读到 `null` 直接抛 `TypeError` —— 表现为**第二次打开首页，全局搜索彻底失效**。
- 更要命的是，为了建这个索引，每次打开首页都要抓 880 篇 md（约 20MB），首页要等十几秒。
- 既然「速度第一」，就把搜索整个搬走：首页不再挂 `search.min.js`，首页零开销。

**独立页怎么工作**：
1. 读 `_sidebar.md` 拿到全站文档清单（880 个 md 路径）—— 侧栏本来就是全站目录，不用另建索引。
2. 并发（8 路）抓每篇 md，本地做轻量 Markdown → 纯文本转换，内存里建索引。
3. 整份索引用 `CompressionStream('gzip')` 压成**一条**记录存进 IndexedDB
   （逐篇存会有 883 次事务/反序列化，实测要 100 秒以上；压成 1 条后读写都是毫秒级）。
4. 再次打开：先读本地缓存 → **立刻可搜**，同时后台用 `If-Modified-Since` 条件请求静默同步，
   只有变了的文件才会被替换。

**实测数据（2026-11，本机 + 内存预读静态服务器，排除 Defender 实时扫描干扰）**：

| 场景 | 结果 |
| --- | --- |
| 首页 md 请求数 | **2 个**（README.md + _sidebar.md）—— 移除全局搜索前是 **883 个** |
| 首页零外网请求 / 零 JS 报错 | ✅ |
| 搜索页首次建索引 | 882 篇 · 4.6MB 正文 · **1.9 ~ 4.2 秒**可搜 |
| 搜索页二次打开 | **285 ~ 750 ms** 可搜（走 IndexedDB），后台同步 882 个请求全部命中 **304** |
| 搜索页首轮加载页面资源 | 888 个请求（1 个 HTML + 3 个 CSS/JS + 883 个 md + 1 个 sidebar） |

**踩过的坑（改这个文件前先看）**：
- 提取标题的正则**不能**写成 `/^\s{0,3}#{1,3}\s+(.+)$/m`：`\s` 含换行，`(.+)$` 匹配失败后会**跨行回溯**，
  880 篇文档能白白吃掉 100 多秒。行首/行尾的空白一律用 `[ \t]`。
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

**验证方式**（改完必跑）：
`layout-regress` 检测脚本扫 320/360/390/414/480/640/768/1024/1280/1920 十档宽度 × 5 套主题，
查三类问题：横向溢出、标题文字被下方元素压住（间距 < 6px）、移动端输入框字号 < 16px。
修复前 178 个问题，修复后 **0 个**。

### 7.6 修改自定义后
**`Ctrl+Shift+R` 硬刷浏览器**绕开缓存。如果改动大，浏览器开发者工具 → Application → Clear storage → 也清一下。

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

---

## 9. 本地预览

```powershell
cd C:\Users\42692\WorkBuddy\Claw\knowledge-base
python -m http.server 8765
```

然后浏览器打开：
- `http://localhost:8765/` ← 首页
- `http://localhost:8765/#/docs/电子资源` ← 电子资源（搜索 UI）
- `http://localhost:8765/#/docs/高性价比` ← 高性价比入口
- `http://localhost:8765/#/docs/高性价比/01-不要早死` ← 具体章节

> 注意：**必须用 HTTP server 打开**，不能直接 `file://`，因为 `assets/*.json` 用 `fetch()` 拉，浏览器不允许跨协议的 `file://` 请求。

---

## 10. 一句话总结

- **搭**：docsify + 两个自定义搜索插件 + 一个 Python 维护脚本，丢 GitHub Pages 完事
- **写**：在 `docs/<栏目>/` 下放 markdown，文件名按栏目规范
- **更**：等 10:30 自动跑，或手动 `python update_sidebar.py`
- **稳**：首页 / 电子资源 / 高性价比 三个菜单已被脚本锁定，不会乱动

« 其他文件：README.md（docsify 首页）· _sidebar.md（侧栏）· update_sidebar.py（维护脚本） »
