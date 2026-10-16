# -*- coding: utf-8 -*-
"""校验四处分类顺序是否一致：DOM 正文 / DEFAULT_CAT_ORDER / 设置面板 chips / data.js。"""
import io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
h = io.open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()

dom = re.findall(r'<section class="category-section" id="([^"]+)">', h)
m = re.search(r'var DEFAULT_CAT_ORDER = \[(.*?)\];', h, re.S)
const = re.findall(r"'([^']+)'", m.group(1))
c = re.search(r'var cats = \[(.*?)\];', h, re.S)
chips = re.findall(r"id:'([^']+)'", c.group(1))
d = io.open(os.path.join(ROOT, 'config-editor', 'data.js'), encoding='utf-8').read()
mm = re.search(r'var DEFAULT_CATEGORIES=(\[.*?\]);', d, re.S)
data = [x['id'] for x in json.loads(mm.group(1))]

print('DOM  :', dom)
print('CONST:', const)
print('CHIPS:', chips)
print('DATA :', data)

bad = 0
# cat-favorites 为运行时动态置顶分类（静态 DOM 中不存在），比对时从各侧排除
strip_fav = lambda ids: [x for x in ids if x != 'cat-favorites']
for label, got in [('DEFAULT_CAT_ORDER', const), ('设置面板 chips', chips), ('data.js', data)]:
    if strip_fav(got) != strip_fav(dom):
        bad += 1
        print('!! %s 与 DOM 顺序不一致' % label)
if bad:
    sys.exit(1)
print('\n四处分类顺序完全一致（%d 个分类）' % len(dom))
