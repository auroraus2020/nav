# -*- coding: utf-8 -*-
"""调整分类默认顺序（左栏 / 正文 / 手机 Tab / 固定排序基准 / 编辑器默认数据 一起改）。

用法: python tools/set_cat_order.py
做法:
  1) 按 NEW_ORDER 物理重排 index.html 里 <main> 内的 category-section 区块（连注释）
  2) 更新 JS 常量 DEFAULT_CAT_ORDER
  3) 更新 renderSettingsCategories() 里的 cats 数组顺序
  4) 从 index.html 反向派生 config-editor/data.js
  5) 用户本地顺序的一次性迁移：给 nav_cat_order 加版本号，版本变化即套用新默认顺序
"""
import io, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'index.html')

# 用户指定：综合导航/AI大模型/北航网站/地图天气/学术检索/影音娱乐/技术与交流/学习提升/学习教程/翻译工具/…
NEW_ORDER = [
    'cat-general',       # 综合导航
    'cat-ai',            # AI大模型
    'cat-buaa',          # 北航网站
    'cat-map',           # 地图天气
    'cat-academic',      # 学术检索
    'cat-entertainment', # 影音娱乐
    'cat-tech',          # 技术与交流
    'cat-learn',         # 学习提升
    'cat-tutorial',      # 学习教程
    'cat-aero',          # 航空与科普
    'cat-translate',     # 翻译工具
    # —— 以下为用户未点名的分类，按相关性接续，可随时再调 ——
    'cat-navweb',        # 导航网站
    'cat-efficiency',    # 效率提升
    'cat-tool',          # 效率工具
    'cat-tradition',     # 传统文化
    'cat-mirror',        # 镜像网站
    'cat-cloud',         # 云服务器
]

SECTION_RE = re.compile(
    r'(?P<label>[ \t]*<!-- =+ .*? =+ -->\r?\n)?'
    r'[ \t]*<section class="category-section" id="(?P<id>[^"]+)">.*?^[ \t]*</section>\r?\n',
    re.S | re.M)


def main():
    with io.open(INDEX, 'r', encoding='utf-8', newline='') as f:
        html = f.read()

    secs = [(m.group('id'), m.start(), m.end()) for m in SECTION_RE.finditer(html)]
    ids = [s[0] for s in secs]
    print('当前顺序:', ids)
    missing = [c for c in NEW_ORDER if c not in ids]
    extra = [c for c in ids if c not in NEW_ORDER]
    if missing or extra:
        print('!! 顺序表与页面不匹配: 缺少=%s 多余=%s' % (missing, extra))
        return 1

    # 取 <main> 范围内的 section，按新顺序重排（保留各 section 之间的空行结构）
    m_main = re.search(r'<main class="main-content">', html)
    m_end = re.search(r'[ \t]*</main>', html)
    head, body, tail = html[:m_main.end()], html[m_main.end():m_end.start()], html[m_end.start():]

    order_in_body = [sid for sid in ids]
    blocks = {}
    for mm in SECTION_RE.finditer(body):
        blocks[mm.group('id')] = mm.group(0)

    rebuilt = '\n'
    for sid in NEW_ORDER:
        rebuilt += blocks[sid].rstrip('\n') + '\n\n'
    html = head + rebuilt.rstrip('\n') + '\n\n' + tail

    # DEFAULT_CAT_ORDER
    js_list = ', '.join("'%s'" % c for c in NEW_ORDER)
    lines, width = [], 0
    cur = '      '
    for i, c in enumerate(NEW_ORDER):
        piece = "'%s'," % c
        if len(cur) + len(piece) > 100:
            lines.append(cur.rstrip())
            cur = '      '
        cur += piece
    lines.append(cur.rstrip().rstrip(','))
    new_const = '    var DEFAULT_CAT_ORDER = [\n' + '\n'.join(lines) + '\n    ];'
    html, n = re.subn(r'    var DEFAULT_CAT_ORDER = \[.*?\n    \];', new_const, html, count=1, flags=re.S)
    if n != 1:
        print('!! DEFAULT_CAT_ORDER 替换失败')
        return 1

    # renderSettingsCategories 的 cats 数组顺序
    def reorder_cats(m):
        inner = m.group(1)
        entries = re.findall(r"\{id:'([^']+)',label:'([^']*)'\}", inner)
        d = dict(entries)
        parts = ["{id:'%s',label:'%s'}" % (c, d[c]) for c in NEW_ORDER if c in d]
        return 'var cats = [\n        ' + ',\n        '.join(parts) + '\n      ];'

    html, n2 = re.subn(r'var cats = \[(.*?)\];', reorder_cats, html, count=1, flags=re.S)
    if n2 != 1:
        print('!! renderSettingsCategories 替换失败')
        return 1

    with io.open(INDEX, 'w', encoding='utf-8', newline='') as f:
        f.write(html)
    print('index.html 已按新顺序重排')

    # 派生 data.js
    r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'sync_data_js.py')],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    print(r.stdout.strip().splitlines()[0] if r.stdout else r.stderr[-300:])
    return 0


if __name__ == '__main__':
    sys.exit(main())
