# -*- coding: utf-8 -*-
"""从 index.html 反向派生 config-editor/data.js 的 DEFAULT_CATEGORIES。

好处：真实站点数据只有 index.html 一份真源，data.js 由它生成，彻底避免手抄分叉。
DEFAULT_ENGINES 与 COLORS 保持 data.js 里现有的内容不变。
用法: python tools/sync_data_js.py
"""
import io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INDEX = os.path.join(ROOT, 'index.html')
DATA_JS = os.path.join(ROOT, 'config-editor', 'data.js')

SECTION_RE = re.compile(r'<section class="category-section" id="([^"]+)">(.*?)</section>', re.S)
HEAD_RE = re.compile(r'<h2>(.*?)</h2>.*?<img[^>]*\ssrc="([^"]+)"', re.S)
CARD_RE = re.compile(
    r'<a class="nav-card"(?P<attrs>[^>]*)>\s*'
    r'<div class="icon icon-(?P<color>[a-z]+)">(?P<glyph>[^<]*)</div>\s*'
    r'<div class="info"><h3>(?P<name>[^<]*)</h3><p>(?P<desc>[^<]*)</p>',
    re.S)


def main():
    with io.open(INDEX, 'r', encoding='utf-8') as f:
        html = f.read()
    with io.open(DATA_JS, 'r', encoding='utf-8') as f:
        js = f.read()

    m_eng = re.search(r'var DEFAULT_ENGINES=(\[.*?\]);\s*\n', js, re.S)
    if not m_eng:
        print('DEFAULT_ENGINES not found')
        return 1
    engines = json.loads(m_eng.group(1))

    m_col = re.search(r'var COLORS=(\[.*?\]);\s*\n', js, re.S)
    colors = json.loads(m_col.group(1)) if m_col else []

    cats = []
    for sid, body in SECTION_RE.findall(html):
        head = HEAD_RE.search(body)
        name = re.search(r'<h2>(.*?)</h2>', body).group(1) if head is None else head.group(1)
        icon = re.search(r'<img[^>]*\ssrc="([^"]+)"', body).group(1)
        sites = []
        for m_card in CARD_RE.finditer(body):
            attrs = m_card.group('attrs')
            um = re.search(r'href="([^"]+)"', attrs)
            if not um:
                continue
            site = {
                'name': m_card.group('name').strip(),
                'url': um.group(1),
                'desc': m_card.group('desc').strip(),
                'icon': m_card.group('glyph').strip(),
                'iconColor': m_card.group('color'),
            }
            if 'data-vpn="1"' in attrs:
                site['vpn'] = True
            sites.append(site)
        cats.append({'id': sid, 'name': name, 'icon': icon, 'sites': sites})

    out = (
        'var COLORS=' + json.dumps(colors, ensure_ascii=False, separators=(',', ':')) + ';\n\n'
        'var DEFAULT_CATEGORIES=' + json.dumps(cats, ensure_ascii=False, separators=(',', ':')) + ';\n\n'
        'var DEFAULT_ENGINES=' + json.dumps(engines, ensure_ascii=False, separators=(',', ':')) + ';\n'
    )
    with io.open(DATA_JS, 'w', encoding='utf-8', newline='\n') as f:
        f.write(out)
    print('synced %s from index.html' % DATA_JS)
    print('categories=%d sites=%d' % (len(cats), sum(len(c['sites']) for c in cats)))
    for c in cats:
        print('  %-18s %-8s %2d' % (c['id'], c['name'], len(c['sites'])))
    return 0


if __name__ == '__main__':
    sys.exit(main())
