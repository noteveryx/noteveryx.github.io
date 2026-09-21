# 知识库自动化任务长期记忆

## 每日维护知识库侧边栏（automation-1779846467008）
- 触发频率：每天 10:30
- 工作目录：C:\Users\42692\WorkBuddy\Claw\knowledge-base
- 执行内容：跑 update_sidebar.py 更新本地 _sidebar.md 和 README.md，然后将 docs/ 下三个文件夹（讲话稿/申论/软考）增量同步到乐享「示例知识库」对应目录
- 禁止操作：git commit/push

## 乐享 MCP 连接持续问题（最近 2 次执行均为 disconnected）
- 2026-07-07、2026-07-08 两次执行均因 lexiang connector disconnected 导致 mcp__lexiang__* 工具不可用
- 工具尝试路径：ToolSearch by query → DeferExecuteTool by name → ListMcpResources（只列出 connector-proxy）
- 本地侧边栏和 README 仍正常更新
- 恢复方式待定：需在 connector 中心 Trust 乐享 connector 后刷新会话

## 乐享文件夹映射
- space_id: 1a973c76f7c84028b822fa4b6c077d11
- 讲话稿 parent: 2a1e2f3ca1794603b64c309823f5f083
- 申论 parent: 34eb972336e44f94b21c690b395a8f24
- 软考 parent: ea3a2482c4974111b2f3c781add23e6e（含 7 个子科目文件夹）

## entry_import_content 参数（先前使用经验）
- 必须传 space_id
- 文档名参数：`name`（不是 `title`）
- content 为本地 .md 文件完整内容
- content_type: "markdown"
- 已新增导入成功的文件 ID 记录在 automation memory.md

## update_sidebar.py 特性
- 保留 _sidebar.md 中已有的一级栏目顺序和名称
- 文件按日期倒序（最新在上）
- 软考目录有 7 个子科目文件夹会被识别为子分组
- README 统计：总文章数、最后更新日期、今日新增

## 最近执行（2026-09-16）
- 侧边栏+README 更新：569 篇，最新 2026-09-16，今日新增 9 篇
- 乐享增量同步：本地有而乐版无共 20 篇全部导入成功（讲话稿1+申论1+软考18）
- entry_list_children schema 不允许 space_id 参数（必须通过 whoami+space_describe_space 验证身份）
- entry_import_content 的 content 字段对超长且包含大量重复字眼的字符串敏感，需精简内容或避免重复模式
- 完整导入 ID 列表见 automation memory.md

## 最近执行（2026-08-29）
- 侧边栏+README 更新：502 篇，最新 2026-08-29，今日新增 9 篇
- 乐享增量同步：本地有而乐享无共 2 篇（软考信管师 08-29 + 系统集成项管师 08-28 补传），全部导入成功
- 系统集成项目管理工程师昨日同步时本地最新为 08-26，本次补传 08-28；信息系统项目管理师本地已新增 08-29 篇
- whoami 验证：「绅士」账号 id=94351d28...，space_describe_space 确认目标 space（实际名 Not_Every）owned_by=当前账号，身份匹配
- 完整导入 ID 列表见 automation memory.md（2026-08-29 条目）

## 最近执行（2026-08-28）
- 侧边栏+README 更新：498 篇，最新 2026-08-28，今日新增 6 篇
- 乐享增量同步：本地有而乐享无共 7 篇（讲话稿1 + 申论1 + 软考5），全部导入成功
- 软考 7 个子目录中 5 个新增 2026-08-28（信息系统监理师/信管师/系统架构设计师/系统规划师/信管项管项管师），另 2 个（系统分析师/系统集成项目管理工程师）本地最新为 2026-08-26 无新增
- whoami 验证：「绅士」账号，space_id 1a973c76... 可见，身份匹配
- 完整导入 ID 列表见 automation memory.md（2026-08-28 条目）

## 最近执行（2026-08-26）
- 侧边栏+README 更新：492 篇，最新 2026-08-26，今日新增 9 篇
- 乐享增量同步：本地有而乐享无共 9 篇（讲话稿1 + 申论1 + 软考7），全部导入成功（均传 space_id）
- 本次仅同步 2026-08-26（昨日 08-25 已同步过）
- whoami 验证：「绅士」账号，space_id 1a973c76f7c84028b822fa4b6c077d11 可见，身份匹配
- 完整导入 ID 列表见 automation memory.md（2026-08-26 条目）

## 最近执行（2026-08-05）
- 侧边栏+README 更新：380 篇，最新 2026-08-05，今日新增 9 篇
- 乐享增量同步：新增 26 篇（讲话稿3 + 申论3 + 软考20），全部导入成功
- 软考 7 个子科目中 6 个新增 3 篇（08-03/04/05），信息系统监理师本地无 08-03 仅新增 2 篇
- whoami 验证：「绅士」账号，space_id 1a973c76f7c84028b822fa4b6c077d11 可见，身份匹配
- 完整导入 ID 列表见 automation memory.md（2026-08-05 条目）
- 历史观察：07-06、07-07、07-08 连续 3 天 lexiang MCP disconnected 失败，导致乐享同步中断；近期连接已稳定

## 最近执行（2026-07-28）
- 侧边栏+README 更新：328 篇，最新 2026-07-28，今日新增 8 篇
- 乐享增量同步：新增 9 篇（讲话稿1 + 申论1 + 软考7），全部导入成功
- 重要发现：系统集成项目管理工程师本地最新为 07-24（不是 07-28），本次同步补传 07-24 历史漏掉篇
- whoami 验证：「绅士」账号，space_id 1a973c76f7c84028b822fa4b6c077d11 可见，身份匹配
- 完整导入 ID 列表见 automation memory.md（2026-07-28 条目）
