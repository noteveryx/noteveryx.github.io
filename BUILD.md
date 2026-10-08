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
| 静态站点引擎 | **docsify**（`assets/docsify.min.js`） | 客户端渲染 markdown，不需要构建步骤 |
| 主题样式 | **docsify-vue** 主题（`assets/vue.css`）+ `index.html` 里手写的 `<style>` 兜底 | |
| 客户端能力 | 纯 JS 插件 | docsify 钩子机制（`window.$docsify.plugins.push(fn)`） |
| 侧栏维护脚本 | **Python 3**（`update_sidebar.py`） | 没有任何第三方依赖，stdlib-only |
| 工作流自动化 | **workbuddy**（`.workbuddy/`，每天 10:30 跑脚本 + 同步到示例知识库） | workbuddy 由 Claw 项目托管 |
| 搜索引擎 | docsify 自带的 `search.min.js`（全局）+ 两个**自定义** docsify 插件：<br>① `assets/ebook-search.js`（电子资源）<br>② `assets/living-better-search.js`（高性价比） | |
| 数据集 | `assets/books.json`（24,071 条电子书，~6.8 MB）<br>`assets/living-better.json`（34 章元数据，~20 KB） | 仅做静态查询，不需要服务器 |

---

## 3. 目录结构

```
knowledge-base/
├── index.html                 # docsify 入口；自定义 <style> + 插件 <script> 都集中在此
├── README.md                  # docsify 首页（自动维护：今日新增 + 统计 + 仓库地址 + 访问地址）
├── _sidebar.md                # 左侧导航（自动维护）
├── update_sidebar.py          # 侧栏 + README 维护脚本
├── syzw_personal_index.json   # （遗留，私人索引；当前未直接被 docsify 使用）
├── assets/                    # docsify 静态资源
│   ├── docsify.min.js
│   ├── search.min.js
│   ├── sidebar-collapse.min.js   # 让一级菜单可点击折叠
│   ├── docsify-copy-code.min.js
│   ├── zoom-image.min.js
│   ├── vue.css
│   ├── ebook-search.js
│   ├── living-better-search.js
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

搜索 UI 由 `assets/ebook-search.js` 在 docsify `doneEach` 钩子里渲染；数据来自 `assets/books.json`。本菜单**已锁定**（见第 6 节）。

### 4.3 高性价比（`高性价比` + 34 个章节子项）
单页面入口 + 34 章节目录。打开后看到：
- 搜索框（按章节标题 / 摘要关键词过滤，34 张卡片）
- 34 个章节卡片，点击进入对应章节

搜索 UI 由 `assets/living-better-search.js` 渲染；数据 `assets/living-better.json`。**章节按编号正序排列**（01, 02, ..., 34），因为这内容是「按性价比排序的人生指南」，阅读顺序有意义。本菜单**已锁定**。

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

### 7.1 `assets/ebook-search.js`
- 路由匹配：当前 hash 含「电子资源」时初始化
- 数据：`assets/books.json`，fallback 路径 `../assets/books.json` / `/assets/books.json`
- 渲染：搜索框 + 状态行 + 热门分类 chips（top 30，按数量降序）+ 结果列表（卡片 100 条上限）
- 命令行：`python -m http.server 8765` 启动后访问 `/docs/电子资源.md`

### 7.2 `assets/living-better-search.js`
- 路由匹配：当前 hash 含「高性价比」时初始化
- 数据：`assets/living-better.json`
- 渲染：搜索框 + 34 张章节卡片（按编号升序）
- 命令行：同上路径 `/docs/高性价比.md`

### 7.3 `index.html` 里的 `<style>` 段
集中在 `<head>` 里这一段，主要做：
- 一级菜单**常驻加粗**（vue.css 默认不粗，只有 `.active` 才粗）
- 子级菜单**保持细体 + 13px**
- 一级 `<a>` 和 `<p>`（无链接标题）都加 `cursor: pointer !important` + `text-decoration: underline !important` on hover
- 用 `:not(:has(ul))` 排除掉「包里嵌了子项的 `<p>`」（首页那种），避免下划线继承到子项

### 7.4 修改自定义后
**`Ctrl+Shift+R` 硬刷浏览器**绕开缓存。如果改动大，浏览器开发者工具 → Application → Clear storage → 也清一下。

---

## 8. 故障排查

| 症状 | 原因 + 修复 |
| --- | --- |
| 侧栏里没有我刚加的栏目 | 没跑 `update_sidebar.py`；等 10:30 自动跑，或手动跑 |
| 跑完脚本后，我的某个栏目消失了 | 那个栏目**不**在锁定名单里，且它的目录被删掉了；要么把目录找回来，要么在 LOCKED_ENTRIES 里加条兜底 |
| 「今日新增」表里软考中级顺序又乱了 | `update_sidebar.py` 顶部的 `SOFT_EXAM_MIDDLE_ORDER` 被改过，恢复成 [system集, 监, 管] |
| 浏览器侧栏 hover 没效果 | 1) `Ctrl+Shift+R` 硬刷；2) 检查 `<script src="assets/living-better-search.js">` 是否被注释；3) DevTools 看 console 有没有 404 |
| hover 一级菜单子项跟着变 | 说明你的浏览器版本不支持 `:has(ul)`；改用兜底方案，给 `<p>` 的子 `<ul>` 单独写 `text-decoration: none` reset |
| 搜索「电子资源」返回空白 | 1) `assets/books.json` 是否还在；2) DevTools 看 Network 里 `assets/books.json` 是不是 200；3) 直接访问 `/assets/books.json` 看是否 JSON 合法 |
| 「高性价比」卡片 hover 整片变成手型 | 上一次会话改过 `assets/ebook-search.js`；它的卡片渲染层从 `<div>` 升级成了 `<a>`，确保手里那一份也是升级版 |
| 更新脚本报 SHA256 mismatch 或 _sidebar 被改坏 | 用 build_kb.sh 备份恢复，或从 git 看 diff |

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
