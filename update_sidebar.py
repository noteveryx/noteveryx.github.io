"""
自动生成 docsify _sidebar.md
扫描 docs/ 目录，按文件夹分组生成侧边栏导航
支持两层结构：docs/申论/*.md 和 docs/软考/科目/*.md
文件按日期倒序（最新在上）
"""
import os
import re

DOCS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs')
SIDEBAR_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '_sidebar.md')

# 一级栏目展示顺序（越小越靠前）
ORDER = ['软考', '申论', '讲话稿', '股票推荐']

def natural_sort_key(name):
    parts = re.split(r'(\d+)', name)
    return [int(p) if p.isdigit() else p.lower() for p in parts]

def scan_folder(path):
    """扫描文件夹，返回 md 文件列表（日期倒序）"""
    files = [f for f in os.listdir(path) if f.endswith('.md')]
    return sorted(files, key=natural_sort_key, reverse=True)

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
    print(f'ok: {soft_count}软考分组 + {folder_count}栏目 = {total}个一级栏目')

if __name__ == '__main__':
    generate_sidebar()
