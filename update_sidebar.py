"""
自动生成 docsify _sidebar.md 并更新 README.md
扫描 docs/ 目录，按文件夹分组生成侧边栏导航
支持两层结构：docs/申论/*.md 和 docs/软考/科目/*.md
文件按日期倒序（最新在上）
"""
import os
import re
from datetime import date

DOCS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs')
SIDEBAR_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_sidebar.md')
README_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'README.md')

# 一级栏目展示顺序（越小越靠前）
ORDER = ['软考', '申论', '讲话稿', '股票推荐']

def natural_sort_key(name):
    parts = re.split(r'(\d+)', name)
    return [int(p) if p.isdigit() else p.lower() for p in parts]

def scan_folder(path):
    """扫描文件夹，返回 md 文件列表（日期倒序）"""
    files = [f for f in os.listdir(path) if f.endswith('.md')]
    return sorted(files, key=natural_sort_key, reverse=True)

def collect_all_files():
    """递归收集所有 md 文件，返回 [(相对路径, 文件名), ...]"""
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

def update_readme(all_files):
    """更新 README.md 的统计信息和今日新增"""
    today_str = date.today().strftime('%Y-%m-%d')

    # 统计
    total = len(all_files)

    # 找最新日期
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

    # 今日新增列表
    if today_files:
        today_lines = []
        for label, name, rel in today_files:
            today_lines.append(f'| {label} | [{name}]({rel}/{name}.md) |')
        today_section = '| 栏目 | 文章 |\n|------|------|\n' + '\n'.join(today_lines)
    else:
        today_section = '今日暂无新增文章'

    # 读取原 README
    with open(README_FILE, 'r', encoding='utf-8') as fp:
        content = fp.read()

    # 替换"今日新增"部分（从 <!-- 每天新增 到 ## 统计之间的内容）
    content = re.sub(
        r'(## 今日新增\n\n).*?(\n## 统计)',
        rf'\1{today_section}\2',
        content,
        flags=re.DOTALL
    )

    # 替换统计数字
    content = re.sub(r'总文章数：\S+', f'总文章数：{total}', content)
    content = re.sub(r'最后更新：\S+', f'最后更新：{last_update}', content)

    with open(README_FILE, 'w', encoding='utf-8') as fp:
        fp.write(content)

    print(f'readme: {total}篇文章, 最新{last_update}, 今日{today_str}新增{len(today_files)}篇')

def generate_sidebar():
    sections = []

    for top_item in sorted(os.listdir(DOCS_DIR), key=natural_sort_key):
        top_path = os.path.join(DOCS_DIR, top_item)
        if not os.path.isdir(top_path) or top_item.startswith('.') or top_item.startswith('_'):
            continue

        # 软考类：两层结构，展开子目录
        if top_item == '软考':
            sub_folders = []
            for sub_item in sorted(os.listdir(top_path), key=natural_sort_key):
                sub_path = os.path.join(top_path, sub_item)
                if os.path.isdir(sub_path) and not sub_item.startswith('.'):
                    files = scan_folder(sub_path)
                    if files:
                        sub_folders.append((sub_item, files))
            if sub_folders:
                sections.append(('软考', sub_folders, True))
        else:
            files = scan_folder(top_path)
            if files:
                sections.append((top_item, [(top_item, files)], False))

    # 按自定义顺序排列
    def sort_key(sec):
        name = sec[0]
        try:
            return ORDER.index(name)
        except ValueError:
            return len(ORDER)

    sections.sort(key=sort_key)

    lines = ['* [首页](/)', '']

    for section_name, groups, is_nested in sections:
        if is_nested:
            # 软考：每个子目录一个顶级栏目
            for sub_name, files in groups:
                lines.append(f'* 软考-{sub_name}')
                for f in files:
                    name = f.replace('.md', '')
                    path = f'docs/{section_name}/{sub_name}/{f}'
                    lines.append(f'  * [{name}]({path})')
                lines.append('')
        else:
            folder_name, files = groups[0]
            lines.append(f'* {folder_name}')
            for f in files:
                name = f.replace('.md', '')
                path = f'docs/{section_name}/{f}'
                lines.append(f'  * [{name}]({path})')
            lines.append('')

    with open(SIDEBAR_FILE, 'w', encoding='utf-8') as fp:
        fp.write('\n'.join(lines))

    total = len(sections)
    soft_count = sum(len(g) for _, g, n in sections if n)
    folder_count = sum(1 for _, _, n in sections if not n)
    print(f'sidebar: {soft_count}软考分组 + {folder_count}栏目 = {total}个一级栏目')

if __name__ == '__main__':
    generate_sidebar()
    all_files = collect_all_files()
    update_readme(all_files)
