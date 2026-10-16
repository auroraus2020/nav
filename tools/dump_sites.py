# -*- coding: utf-8 -*-
"""导出全站分类与站点清单（含重复检测），供人工审阅。"""
import collections, io, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
h = io.open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
SEC = re.compile(r'<section class="category-section" id="([^"]+)">(.*?)</section>', re.S)
CARD = re.compile(r'<a class="nav-card"([^>]*)>\s*<div class="icon[^>]*>[^<]*</div>\s*<div class="info"><h3>(.*?)</h3>', re.S)
NAME = re.compile(r'<h2>(.*?)</h2>')

seen = collections.defaultdict(list)
out = []
for sid, body in SEC.findall(h):
    nm = NAME.search(body).group(1)
    cards = []
    for attrs, title in CARD.findall(body):
        um = re.search(r'href="([^"]+)"', attrs)
        cards.append((um.group(1) if um else '?', title.strip()))
    out.append((sid, nm, cards))
    for u, t in cards:
        seen[t].append(nm)

lines = []
lines.append('TOTAL %d sites / %d categories' % (sum(len(c[2]) for c in out), len(out)))
for sid, nm, cards in out:
    lines.append('== %s %s (%d)' % (sid, nm, len(cards)))
    lines.append('   ' + ' | '.join(t for u, t in cards))
lines.append('')
lines.append('== 同名站点（可能是重复/跨类重复）==')
for k, v in sorted(seen.items()):
    if len(v) > 1:
        lines.append('  %s -> %s' % (k, v))
lines.append('')
lines.append('== 同 URL（重复地址）==')
urls = collections.defaultdict(list)
for sid, nm, cards in out:
    for u, t in cards:
        urls[u].append('%s/%s' % (nm, t))
for u, v in sorted(urls.items()):
    if len(v) > 1:
        lines.append('  %s -> %s' % (u, v))

text = '\n'.join(lines)
io.open(os.path.join(ROOT, '_sites.txt'), 'w', encoding='utf-8', newline='\n').write(text)
print(text)
