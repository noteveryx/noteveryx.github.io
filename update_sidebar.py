"""
自动生成 docsify _sidebar.md 并更新 README.md
扫描 docs/ 目录，按文件夹分组生成侧边栏导航
支持两层结构：docs/申论/*.md 和 docs/软考/科目/*.md
文件按日期倒序（最新在上）

重要：保留 _sidebar.md 中已有的一级栏目名称和顺序，不覆盖用户的自定义修改。
"""
import os
import re
from datetime import date

DOCS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs')
SIDEBAR_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_sidebar.md')
README_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'README.md')

# 默认一级栏目展示顺序（仅当 sidebar 文件不存在或为空时使用）
DEFAULT_ORDER = ['申论', '讲话稿', '软考', '股票推荐']

# 软考子目录显示顺序 (2026-11-23 用户要求)
# 顺序: 中级系统集成 → 高级信息系统项目管理师 → 其余按既有相对顺序依次向下
# 说明: 脚本每次都按此列表重排, 用户若要调整顺序, 改这里即可.
SOFT_EXAM_ORDER = [
    '（中级）系统集成项目管理工程师',  # 第一: 用户偏好
    '（高级）信息系统项目管理师',      # 第二: 用户指定
    '（中级）信息系统监理师',          # 其余依次向下
    '（中级）信息系统管理工程师',
    '（高级）系统分析师',
    '（高级）系统架构设计师',
    '（高级）系统规划与管理师',
]

# 兼容旧变量名 (HOME 排序与 soft_exam_sort_key 引用)
SOFT_EXAM_MIDDLE_ORDER = SOFT_EXAM_ORDER

# 侧边栏隐藏目录 (2026-10-29 用户要求)
# 这些目录的 md 文件仍然保留在磁盘上, README 的统计照常计算,
# 但不在 docsify 侧边栏导航中展示.
# 注意: 直接手动删 _sidebar.md 里的条目无效 —— 下次跑脚本会被重新扫描加回来.
HIDDEN_SIDEBAR_DIRS = {
    '（高级）网络规划设计师',
}

# 视频文案目录说明 (2026-11-23 用户要求)
# 产出目录已由 outputs/视频文案/ 迁移到 knowledge-base/docs/视频文案/,
# 与侧边栏扫描目录一致, 每日新产出的文案会自动出现在「视频文案」栏目下.
# 旧的 outputs/视频文案/ 若存在, 由 sync_video_scripts.py 做兼容同步.

def soft_exam_sort_key(name):
    """
    自定义排序键:
    - SOFT_EXAM_MIDDLE_ORDER 里的中级子目录按列表里索引升序
    - 其他子目录 (高级、初级、未来新加的) 按 natural_sort_key 排列
    返回的元组: (group, position_in_group, natural_key) - 优先级 group=0 的在前.
    """
    for i, n in enumerate(SOFT_EXAM_MIDDLE_ORDER):
        if name == n:
            return (0, i, name)
    return (1, 0, natural_sort_key(name))

# 今日新增表格的一级栏目顺序 (2026-11-23 用户指定)
# 与侧边栏全局顺序保持一致: 申论 → 讲话稿 → 电子资源 → 高性价比 →
# 寓言故事 → 视频文案 → 软考各科目 → 其他
# 未列出的栏目排在最后, 按自然序
HOME_TOP_LEVEL_ORDER = [
    '申论',
    '讲话稿',
    '电子资源',
    '高性价比',
    '寓言故事',
    '视频文案',
    '软考',
]

# 锁定菜单: 不论 _sidebar.md 如何变化, 这 3 个菜单必须存在并保持原位
#   - 首页永远是第一个 (kind=home 由 docsify 内置渲染)
#   - 电子资源永远是单链菜单 (kind=manual)
#   - 高性价比永远是带子项的目录菜单 (kind=section)
# 这 3 个即使 _sidebar.md 中丢失, 脚本也会自动重建; 反之 _sidebar.md
# 里已经有的, 顺序/位置被保留, 不会因为其他目录的增删而位移.
LOCKED_ENTRIES = [
    {'kind': 'manual', 'line': '* [电子资源](docs/电子资源.md)', 'name': '电子资源'},
    {'kind': 'section', 'title': '高性价比', 'link': 'docs/高性价比.md', 'name': '高性价比'},
]

# 紧跟"高性价比"之后的固定菜单 (历史机制, 2026-11-23 起由
# SIDEBAR_GLOBAL_ORDER 全局顺序表统一管理, 此处保留为空以避免两套规则冲突).
#
# 说明: 曾用于把 寓言故事 / 视频文案 锁定在高性价比之后.
# 现已并入 SIDEBAR_GLOBAL_ORDER, 全局重排会保证它们的位置正确.
LOCKED_ENTRIES_AFTER_HIGHBILITY = []

# 全局一级栏目顺序表 (2026-11-23 用户要求)
# 目标顺序: 首页 → 申论 → 讲话稿 → 电子资源 → 高性价比 → 再依次向下排列
#
# 实现方式: 每次生成侧边栏时, 按此表把所有已识别条目重新排列.
# 表中列出的一级栏目严格按此顺序; 未列出的 (软考各科目 / 示例) 保持
# 各自原有相对次序, 排在表内栏目之后, 即"再依次向下排列".
#
# 要调整顺序, 只改这个列表即可 —— 手动改 _sidebar.md 会被脚本纠正回来.
SIDEBAR_GLOBAL_ORDER = [
    '申论',
    '讲话稿',
    '电子资源',
    '高性价比',
    '寓言故事',
    '视频文案',
]

def entry_display_name(e):
    """
    取条目的一级栏目显示名, 兼容三种 kind:
      - section: 直接取 title
      - manual:  从 markdown 链接文本里取 (如 `* [电子资源](docs/电子资源.md)` -> 电子资源)
      - home:    返回 '首页'
    """
    if e.get('kind') == 'home':
        return '首页'
    if e.get('kind') == 'section':
        return e.get('title', '')
    line = e.get('line', '')
    m = re.match(r'^\*\s*\[(.+?)\]\(', line)
    return m.group(1).strip() if m else line.strip()


def reorder_global_sections(entries):
    """
    按 SIDEBAR_GLOBAL_ORDER 重排全部一级栏目 (2026-11-23 用户要求).

    规则:
      - '首页' 永远第一 (docsify 内置渲染, 保持不动)
      - SIDEBAR_GLOBAL_ORDER 中的栏目严格按表内顺序排列
      - 未在表中的栏目 (寓言故事/视频文案/软考各科目/示例 等) 保持
        它们彼此之间的原有相对次序, 整体排在表内栏目之后
        —— 即用户所说的"再依次向下排列"

    实现: 先把表内栏目按 index 排序抽出, 再把其余条目按原序抽出,
    合并后写回. 表内栏目缺失时自动跳过, 不会报错.
    """
    if len(entries) < 2:
        return

    home = [e for e in entries if e.get('kind') == 'home']
    rest = [e for e in entries if e.get('kind') != 'home']

    def sort_key(e):
        name = entry_display_name(e)
        if name in SIDEBAR_GLOBAL_ORDER:
            return (0, SIDEBAR_GLOBAL_ORDER.index(name), '')
        # 未列入的栏目: 排在后面, 用原始次序保持相对顺序
        return (1, 0, rest.index(e))

    ordered = sorted(rest, key=sort_key)
    entries[:] = home + ordered


def ensure_locked_entries(entries):
    """
    确保 LOCKED_ENTRIES 中所有菜单项都在 SIDEBAR_ENTRIES 里.
    若 _sidebar.md 已有 (parser 已识别) -> 保留原位不动.
    若缺失 (例如用户误删了 _sidebar.md 里的某行) -> 在 首页 之后自动补回, 顺序按 LOCKED_ENTRIES.
    """
    insert_at = 1 if (entries and entries[0].get('kind') == 'home') else 0
    for locked in LOCKED_ENTRIES:
        present = False
        for e in entries:
            if locked['kind'] == 'manual':
                if (e['kind'] == 'manual' and
                        locked['name'] in e.get('line', '')):
                    present = True; break
            elif locked['kind'] == 'section':
                if (e['kind'] == 'section' and
                        locked['name'] in e.get('title', '')):
                    present = True; break
        if not present:
            restored = {
                'kind': locked['kind'],
                'line': locked.get('line'),
                'title': locked.get('title'),
            }
            if 'link' in locked:
                restored['link'] = locked['link']
            entries.insert(insert_at, restored)
            insert_at += 1
            print(f'  [lock] auto-restored: {locked["name"]} ({locked["kind"]})')

def ensure_locked_entries_after_highbility(entries):
    """
    确保 LOCKED_ENTRIES_AFTER_HIGHBILITY 里的菜单 (如 寓言故事) 紧跟
    "高性价比" section 之后. 若 _sidebar.md 已有 (parser 已识别) -> 保留原位;
    若 _sidebar.md 中位置不正确或缺失, 把它们挪到/补到 高性价比 之后.
    """
    hb_idx = None
    for i, e in enumerate(entries):
        if e.get('kind') == 'section' and e.get('title') == '高性价比':
            hb_idx = i; break
    if hb_idx is None:
        return  # 找不到高性价比, 不处理 (ensure_locked_entries 兜底)

    # 检查并强制每个 locked_after 的位置紧跟高性价比
    for locked in LOCKED_ENTRIES_AFTER_HIGHBILITY:
        cur_idx = None
        for i, e in enumerate(entries):
            if e.get('kind') == 'section' and e.get('title') == locked['name']:
                cur_idx = i; break
        if cur_idx is None:
            # 缺失 -> 补到 高性价比 之后
            entries.insert(hb_idx + 1, {'kind': 'section', 'title': locked['name']})
            print(f'  [lock-after] auto-inserted after 高性价比: {locked["name"]}')
        elif cur_idx != hb_idx + 1:
            # 已存在但位置不对 -> 挪到高性价比之后
            item = entries.pop(cur_idx)
            entries.insert(hb_idx + 1, item)
            print(f'  [lock-after] moved to after 高性价比: {locked["name"]}')
        # 把 hb_idx 推进一个, 让下一个 locked 跟在它后面
        hb_idx += 1

def reorder_soft_exam_sections(entries):
    """
    强制软考各科目按 SOFT_EXAM_ORDER 排列 (2026-11-23 用户要求).
    顺序: 中级系统集成 → 高级信息系统项目管理师 → 其余依次向下.

    实现: 找出所有软考科目 section, 按 SOFT_EXAM_ORDER 重排后写回原位置.
    不在 SOFT_EXAM_ORDER 中的科目 (如未来新增) 排在列表末尾, 按自然序.
    硬编码排序后, 即使用户手动调整 _sidebar.md 也会被脚本纠正回来.
    """
    idxs = []
    for i, e in enumerate(entries):
        if e.get('kind') == 'section' and e.get('title') in SOFT_EXAM_ORDER:
            idxs.append(i)
    if len(idxs) < 2:
        return

    picked = [entries[i] for i in idxs]
    picked.sort(key=lambda e: SOFT_EXAM_ORDER.index(e['title']))
    for pos, i in enumerate(idxs):
        entries[i] = picked[pos]

def today_files_sort_key(item):
    """
    首页「今日新增」表格的自定义排序键.
    item = (label, name, rel), label 形如 "申论" 或 "软考-（中级）系统集成...".

    排序规则:
    1. 一级栏目按 HOME_TOP_LEVEL_ORDER 排 (与侧边栏全局顺序一致)
    2. 软考各子科目按 SOFT_EXAM_ORDER 排 (系统集成 → 信息系统项目管理师 → 其余)
    3. 未列入的栏目排在最后, 按自然序
    4. 同一栏目内按文件名升序 (自然排序)
    """
    label, name, rel = item
    if '-' in label:
        top, sub = label.split('-', 1)
    else:
        top, sub = label, ''

    top_idx = HOME_TOP_LEVEL_ORDER.index(top) if top in HOME_TOP_LEVEL_ORDER else len(HOME_TOP_LEVEL_ORDER)

    sub_idx = 100  # 默认: 其他子目录排在中级后面
    if top == '软考' and sub:
        for i, n in enumerate(SOFT_EXAM_MIDDLE_ORDER):
            if sub == n:
                sub_idx = i
                break

    return (top_idx, sub_idx, natural_sort_key(name))

def natural_sort_key(name):
    parts = re.split(r'(\d+)', name)
    return [int(p) if p.isdigit() else p.lower() for p in parts]

def scan_folder(path):
    """扫描文件夹，返回 md 文件列表（日期倒序）"""
    files = [f for f in os.listdir(path) if f.endswith('.md')]
    return sorted(files, key=natural_sort_key, reverse=True)

def collect_all_files():
    """递归收集所有 md 文件，返回 [(相对路径, 顶级目录, 子目录, 文件名), ...]"""
    all_files = []
    for top_item in sorted(os.listdir(DOCS_DIR), key=natural_sort_key):
        top_path = os.path.join(DOCS_DIR, top_item)
        if not os.path.isdir(top_path) or top_item.startswith('.'):
            continue
        if top_item == '软考':
            for sub_item in sorted(os.listdir(top_path), key=natural_sort_key):
                sub_path = os.path.join(top_path, sub_item)
                if os.path.isdir(sub_path) and not sub_item.startswith('.'):
                    for f in os.listdir(sub_path):
                        if f.endswith('.md'):
                            rel = f'docs/{top_item}/{sub_item}'
                            all_files.append((rel, top_item, sub_item, f))
        else:
            for f in os.listdir(top_path):
                if f.endswith('.md'):
                    rel = f'docs/{top_item}'
                    all_files.append((rel, top_item, '', f))
    return all_files

# 全局变量: 解析侧边栏时收集到的「有序条目」列表
# 每个条目是 dict, kind 字段 ∈ {'home', 'section', 'manual'}:
#   - 'home'    -> 固定顶部 `* [首页](/)`, 由 generate_sidebar 渲染
#   - 'section' -> 标题栏目录型, 用 dir_map 重新生成子项
#   - 'manual'  -> 手写单链条目 (例如 `* [电子资源](docs/电子资源.md)`), 原样保留
SIDEBAR_ENTRIES = []

DATE_PREFIX = re.compile(r'^\d{4}-\d{2}-\d{2}-')
CHAPTER_NUM_PREFIX = re.compile(r'^\d{1,3}-')

def smart_sort_files(files):
    """
    根据命名风格决定排序方向:
      - 数字前缀 (01-, 02-, ..., NOT 2026-XX-XX): 升序 -> 章节型
      - 日期前缀 (YYYY-MM-DD-): 降序 -> 文章流型
      - 其它: 默认降序
    """
    head = files[:3]
    if not head:
        return files
    if all(CHAPTER_NUM_PREFIX.match(f) and not DATE_PREFIX.match(f) for f in head):
        return sorted(files, key=natural_sort_key, reverse=False)
    return sorted(files, key=natural_sort_key, reverse=True)

def parse_existing_sidebar():
    """
    解析已有 _sidebar.md, 填充全局 SIDEBAR_ENTRIES (有序列表).

    识别规则:
      - 首页: '* [首页](/)' 或 '* 首页' -> kind='home'
      - 顶层栏目后跟随缩进子项 (`  * ...`): kind='section' (只记录标题, 子项由 generate 重新生成)
      - 顶层无子项的 `* [label](path)`: kind='manual' (原行 line 整条保留)
      - 顶层无子项的纯文本条目: 丢弃 (历史上没有用, 自动机不维护)
    """
    global SIDEBAR_ENTRIES
    SIDEBAR_ENTRIES = []

    if not os.path.exists(SIDEBAR_FILE):
        SIDEBAR_ENTRIES.append({'kind': 'home'})
        return

    raw_lines = open(SIDEBAR_FILE, 'r', encoding='utf-8').read().split('\n')
    SIDEBAR_ENTRIES.append({'kind': 'home'})

    i = 0
    while i < len(raw_lines):
        line = raw_lines[i]
        m = re.match(r'^\*\s+(.+)$', line.rstrip('\r'))
        if not m:
            i += 1
            continue
        body = m.group(1).strip()
        # 首页
        if body.startswith('[首页]') or body == '首页':
            i += 1
            continue

        # 向前看下一非空行: 仅当真是缩进子项 (`  * `) 才算 section
        j = i + 1
        while j < len(raw_lines) and raw_lines[j].strip() == '':
            j += 1
        next_is_subitem = (j < len(raw_lines) and raw_lines[j].startswith('  * '))

        if next_is_subitem:
            # 顶层栏目后跟子项, 解析 [label](path) 形式提取可选 link
            m_link = re.match(r'^\[(.+?)\]\((.+?)\)\s*$', body)
            if m_link:
                SIDEBAR_ENTRIES.append({
                    'kind': 'section',
                    'title': m_link.group(1),
                    'link': m_link.group(2),
                })
            else:
                SIDEBAR_ENTRIES.append({'kind': 'section', 'title': body})
            i = j   # 跳过子项 (后续重新生成)
        else:
            # 顶层独立条目, 只在是 [label](path) 形状时保留
            if re.match(r'^\[.+?\]\(.+?\)\s*$', body):
                SIDEBAR_ENTRIES.append({'kind': 'manual', 'line': lines_rstrip(raw_lines[i])})
            i += 1

    # 在解析完成后, 兜底补回锁定菜单 (首页 / 电子资源 / 高性价比)
    ensure_locked_entries(SIDEBAR_ENTRIES)
    # 紧跟"高性价比"之后的固定菜单 (寓言故事 / 视频文案 等)
    ensure_locked_entries_after_highbility(SIDEBAR_ENTRIES)
    # 软考科目强制按 SOFT_EXAM_ORDER 排列
    reorder_soft_exam_sections(SIDEBAR_ENTRIES)
    # 全局一级栏目重排 (首页 → 申论 → 讲话稿 → 电子资源 → 高性价比 → 其余依次向下)
    reorder_global_sections(SIDEBAR_ENTRIES)

def lines_rstrip(s):
    """去掉尾部 \\r (Windows 行尾), 保留内部字符."""
    return s.rstrip('\r')

def build_directory_map():
    """
    构建「磁盘目录 → (文件列表, 路径前缀)」的映射
    返回 dict:
      key = 目录标识（非软考用顶级目录名，软考用子目录名）
      value = (files_list, path_prefix)
    """
    dir_map = {}

    # 非软考目录
    for top_item in sorted(os.listdir(DOCS_DIR), key=natural_sort_key):
        top_path = os.path.join(DOCS_DIR, top_item)
        if not os.path.isdir(top_path) or top_item.startswith('.') or top_item == '软考':
            continue
        if top_item in HIDDEN_SIDEBAR_DIRS:
            continue
        files = scan_folder(top_path)
        if files:
            dir_map[top_item] = (files, f'docs/{top_item}')

    # 软考子目录
    ruankao_dir = os.path.join(DOCS_DIR, '软考')
    if os.path.isdir(ruankao_dir):
        for sub_item in sorted(os.listdir(ruankao_dir), key=soft_exam_sort_key):
            sub_path = os.path.join(ruankao_dir, sub_item)
            if os.path.isdir(sub_path) and not sub_item.startswith('.'):
                if sub_item in HIDDEN_SIDEBAR_DIRS:
                    continue
                files = scan_folder(sub_path)
                if files:
                    dir_map[sub_item] = (files, f'docs/软考/{sub_item}')

    return dir_map

def match_section_to_directory(section_title, dir_map):
    """
    将侧边栏栏目标题匹配到实际的磁盘目录。
    优先精确匹配，其次包含匹配。
    """
    # 1. 精确匹配
    if section_title in dir_map:
        return section_title

    # 2. 包含匹配：标题中包含某个目录名（处理带前缀的情况）
    for dir_name in dir_map:
        if dir_name in section_title:
            return dir_name

    # 3. 反向包含：目录名中包含标题（处理简称情况）
    for dir_name in dir_map:
        if section_title in dir_name:
            return dir_name

    return None

def generate_sidebar(dry_run=False):
    """
    生成 _sidebar.md.

    与旧版差异:
      - 把 `_sidebar.md` 解析成有序条目列表 (kind=home/section/manual), 严格保留用户手动插入的
        单链条目在原位置 (而非老版本只能追加到底部).
      - 用 smart_sort_files 自动识别章节型 (01-) vs 日期型 (2026-XX-XX-), 章节型升序, 日期型降序.
      - 新增 dry_run=True 只打印不写文件, 且显式报告 preserved/dropped 手动条目.
    """
    global SIDEBAR_ENTRIES
    dir_map = build_directory_map()
    parse_existing_sidebar()

    kb_root = os.path.dirname(os.path.abspath(SIDEBAR_FILE))
    blocks = []      # 列表的列表, 每块一段 (section 或 manual)
    matched_dirs = set()
    preserved, dropped = [], []

    def render_section_block(title, link=None):
        dir_key = match_section_to_directory(title, dir_map)
        if not dir_key or dir_key not in dir_map:
            return None
        files, path_prefix = dir_map[dir_key]
        matched_dirs.add(dir_key)
        sorted_files = smart_sort_files(files)
        head = f'* [{title}]({link})' if link else f'* {title}'
        return [head] + [
            f'  * [{f[:-3]}]({path_prefix}/{f})' for f in sorted_files
        ]

    def render_manual_block(raw_line):
        m_link = re.search(r'\(([^)]+)\)', raw_line)
        if not m_link:
            dropped.append(raw_line.strip())
            return None
        target = m_link.group(1).strip()
        if target.startswith(('http://', 'https://', 'mailto:', 'tel:')):
            preserved.append(raw_line.strip())
            return [raw_line.rstrip()]
        target_abs = os.path.normpath(os.path.join(kb_root, target))
        if os.path.exists(target_abs):
            preserved.append(raw_line.strip())
            return [raw_line.rstrip()]
        dropped.append(raw_line.strip())
        return None

    for entry in SIDEBAR_ENTRIES:
        if entry['kind'] == 'home':
            blocks.append(['* [首页](/)'])
        elif entry['kind'] == 'section':
            block = render_section_block(entry['title'], entry.get('link'))
            if block:
                blocks.append(block)
        elif entry['kind'] == 'manual':
            block = render_manual_block(entry['line'])
            if block:
                blocks.append(block)

    # 新增的目录 (原有侧边栏没匹配的) -> 顺次追加
    for dir_key in dir_map:
        if dir_key not in matched_dirs:
            files, path_prefix = dir_map[dir_key]
            sorted_files = smart_sort_files(files)
            blocks.append([f'* {dir_key}'] + [
                f'  * [{f[:-3]}]({path_prefix}/{f})' for f in sorted_files
            ])

    text = '\n\n'.join('\n'.join(b) for b in blocks) + '\n'

    if preserved:
        print(f'preserved manual link entries: {preserved}')
    if dropped:
        print(f'dropped manual link entries (target missing): {dropped}')

    if dry_run:
        print(f'[dry-run] would write {len(text)} chars to {SIDEBAR_FILE}')
        return text

    with open(SIDEBAR_FILE, 'w', encoding='utf-8') as fp:
        fp.write(text)

    total_sections = sum(
        1 for b in blocks for l in b
        if l.startswith('* ') and not l.startswith('* [')
    )
    print(f'sidebar: {total_sections}个一级栏目, 保留用户自定义名称和顺序')

def update_readme(all_files, dry_run=False):
    """更新 README.md 的统计信息和今日新增"""
    today_str = date.today().strftime('%Y-%m-%d')

    total = len(all_files)

    dates = []
    today_files = []
    for rel, top, sub, fname in all_files:
        m = re.match(r'(\d{4}-\d{2}-\d{2})', fname)
        if m:
            d = m.group(1)
            dates.append(d)
            if d == today_str:
                label = f'{top}-{sub}' if sub else top
                today_files.append((label, fname.replace('.md', ''), rel))

    last_update = max(dates) if dates else '--'

    # 今日新增按用户偏好排序: 申论 → 讲话稿 → 软考(中级 system集 → 监 → 管 + 高级)
    today_files.sort(key=today_files_sort_key)

    if today_files:
        today_lines = []
        for label, name, rel in today_files:
            today_lines.append(f'| {label} | [{name}]({rel}/{name}.md) |')
        today_section = '| 栏目 | 文章 |\n|------|------|\n' + '\n'.join(today_lines)
    else:
        today_section = '今日暂无新增文章'

    with open(README_FILE, 'r', encoding='utf-8') as fp:
        content = fp.read()

    content = re.sub(
        r'(## 今日新增\n\n).*?(\n## 统计)',
        rf'\1{today_section}\2',
        content,
        flags=re.DOTALL
    )

    content = re.sub(r'总文章数：\S+', f'总文章数：{total}', content)
    content = re.sub(r'最后更新：\S+', f'最后更新：{last_update}', content)

    if dry_run:
        print(f'[dry-run] would update README (总={total}, 最新={last_update}, 今日新增={len(today_files)})')
        return

    with open(README_FILE, 'w', encoding='utf-8') as fp:
        fp.write(content)

    print(f'readme: {total}篇文章, 最新{last_update}, 今日{today_str}新增{len(today_files)}篇')

if __name__ == '__main__':
    import sys
    dry_run = '--dry-run' in sys.argv
    if dry_run:
        print('=== sidebar (dry-run) ===')
        generate_sidebar(dry_run=True)
        print('=== readme (dry-run) ===')
        all_files = collect_all_files()
        update_readme(all_files, dry_run=True)
    else:
        generate_sidebar()
        all_files = collect_all_files()
        update_readme(all_files)
