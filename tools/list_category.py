# -*- coding: utf-8 -*-
"""列出某个分类的实际卡片与声明计数（排查用）。"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
h = io.open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
cid = sys.argv[1] if len(sys.argv) > 1 else 'cat-tradition'
b = re.search(r'<section class="category-section" id="%s">(.*?)</section>' % cid, h, re.S).group(1)

CARD = re.compile(
    r'<a class="nav-card"(?P<attrs>[^>]*)>\s*'
    r'<div class="icon icon-(?P<color>[a-z]+)">(?P<glyph>[^<]*)</div>\s*'
    r'<div class="info"><h3>(?P<name>[^<]*)</h3>', re.S)

rows = []
for m in CARD.finditer(b):
    um = re.search(r'href="([^"]+)"', m.group('attrs'))
    rows.append((m.group('name').strip(), um.group(1) if um else '?',
                 'VPN' if 'data-vpn="1"' in m.group('attrs') else ''))

print('declared: %s' % re.search(r'<span class="count">(\d+)', b).group(1))
print('cards: %d' % len(rows))
for i, (n, u, v) in enumerate(rows):
    print('  %2d %-28s %-46s %s' % (i + 1, n, u, v))
