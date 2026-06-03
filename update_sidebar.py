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

def parse_existing_sidebar():
    """
    解析已有 _sidebar.md，提取用户自定义的一级栏目名称和顺序。
    返回 [(显示名称, 目录路径关键词), ...]
    例如：[('申论', '申论'), ('（中级）信息系统监理师', '（中级）信息系统监理师')]
    """
    if not os.path.exists(SIDEBAR_FILE):
        return []

    sections = []
    with open(SIDEBAR_FILE, 'r', encoding='utf-8') as fp:
        for line in fp:
            line = line.rstrip('\n\r')
            # 匹配一级栏目: * 栏目名
            m = re.match(r'^\*\s+(.+)$', line)
            if m:
                title = m.group(1).strip()
                # 跳过首页
                if title.startswith('[首页]') or title == '首页':
                    continue
                # 用标题匹配实际目录（软考子目录用完整子目录名匹配）
                sections.append(title)
    return sections

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
        files = scan_folder(top_path)
        if files:
            dir_map[top_item] = (files, f'docs/{top_item}')

    # 软考子目录
    ruankao_dir = os.path.join(DOCS_DIR, '软考')
    if os.path.isdir(ruankao_dir):
        for sub_item in sorted(os.listdir(ruankao_dir), key=natural_sort_key):
            sub_path = os.path.join(ruankao_dir, sub_item)
            if os.path.isdir(sub_path) and not sub_item.startswith('.'):
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

def generate_sidebar():
    dir_map = build_directory_map()
    existing_sections = parse_existing_sidebar()

    lines = ['* [首页](/)', '']

    if existing_sections:
        # 有历史记录：沿用用户的栏目名称和顺序
        matched_dirs = set()
        for title in existing_sections:
            dir_key = match_section_to_directory(title, dir_map)
            if dir_key and dir_key in dir_map:
                files, path_prefix = dir_map[dir_key]
                matched_dirs.add(dir_key)
                lines.append(f'* {title}')
                for f in files:
                    name = f.replace('.md', '')
                    lines.append(f'  * [{name}]({path_prefix}/{f})')
                lines.append('')

        # 处理新增的目录（不在原有列表中的）
        for dir_key in dir_map:
            if dir_key not in matched_dirs:
                files, path_prefix = dir_map[dir_key]
                lines.append(f'* {dir_key}')
                for f in files:
                    name = f.replace('.md', '')
                    lines.append(f'  * [{name}]({path_prefix}/{f})')
                lines.append('')
    else:
        # 首次运行：按默认顺序
        def sort_key(name):
            try:
                return DEFAULT_ORDER.index(name.split('-')[0] if '-' in name else name)
            except ValueError:
                return len(DEFAULT_ORDER)

        sorted_dirs = sorted(dir_map.keys(), key=sort_key)

        for dir_key in sorted_dirs:
            files, path_prefix = dir_map[dir_key]
            lines.append(f'* {dir_key}')
            for f in files:
                name = f.replace('.md', '')
                lines.append(f'  * [{name}]({path_prefix}/{f})')
            lines.append('')

    with open(SIDEBAR_FILE, 'w', encoding='utf-8') as fp:
        fp.write('\n'.join(lines))

    total_sections = sum(1 for l in lines if l.startswith('* ') and not l.startswith('* ['))
    print(f'sidebar: {total_sections}个一级栏目, 保留用户自定义名称和顺序')

def update_readme(all_files):
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

    with open(README_FILE, 'w', encoding='utf-8') as fp:
        fp.write(content)

    print(f'readme: {total}篇文章, 最新{last_update}, 今日{today_str}新增{len(today_files)}篇')

if __name__ == '__main__':
    generate_sidebar()
    all_files = collect_all_files()
    update_readme(all_files)
