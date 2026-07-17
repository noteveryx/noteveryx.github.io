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

## 最近执行（2026-07-16）
- 侧边栏+README 更新：276 篇，最新 2026-07-16，今日新增 9 篇
- 乐享增量同步：新增 11 篇（讲话稿1 + 申论1 + 软考9），全部导入成功
- 重要发现：（中级）信息系统监理师子文件夹在 07-03 后历史漏掉 4 篇（07-07/08/09/15），本次同步补齐
- whoami 验证：「绅士」账号，space_id 1a973c76f7c84028b822fa4b6c077d11 可见，身份匹配
- 完整导入 ID 列表见 automation memory.md（2026-07-16 条目）
