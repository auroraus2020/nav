# -*- coding: utf-8 -*-
"""列出某个分类的实际卡片与声明计数（排查用）。"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
h = io.open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
cid = sys.argv[1] if len(sys.argv) > 1 else 'cat-tradition'
b = re.search(r'<section class="category-section" id="%s">(.*?)</section>' % cid, h, re.S).group(1)
print('declared:', re.search(r'<span class="count">(\d+)', b).group(1))
names = re.findall(r'<h3>(.*?)</h3>', b)
urls = re.findall(r'<a class="nav-card" href="([^"]+)"', b)
print('cards:', len(names))
for i, n in enumerate(names):
    print('  %2d %-28s %s' % (i + 1, n, urls[i]))
