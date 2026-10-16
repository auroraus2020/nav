# -*- coding: utf-8 -*-
"""校验 index.html 与 config-editor/data.js 的默认分类/站点是否一致（防两份数据分叉）。
用法: python verify_config_sync.py
"""
import io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECTION_RE = re.compile(r'<section class="category-section" id="([^"]+)">(.*?)</section>', re.S)
CARD_RE = re.compile(
    r'<a class="nav-card"(?P<attrs>[^>]*)>\s*'
    r'<div class="icon icon-(?P<color>[a-z]+)">(?P<glyph>[^<]*)</div>\s*'
    r'<div class="info"><h3>(?P<name>[^<]*)</h3>',
    re.S)
URL_IN_ATTRS = re.compile(r'href="([^"]+)"')
NAME_RE = re.compile(r'<h2>(.*?)</h2>')
ICON_RE = re.compile(r'<img src="([^"]+)"')


def main():
    with io.open(os.path.join(ROOT, 'index.html'), 'r', encoding='utf-8') as f:
        html = f.read()
    with io.open(os.path.join(ROOT, 'config-editor', 'data.js'), 'r', encoding='utf-8') as f:
        js = f.read()
    m = re.search(r'var DEFAULT_CATEGORIES=(\[.*?\]);\s*\n', js, re.S)
    if not m:
        print('DEFAULT_CATEGORIES not found in data.js')
        return 1
    cats = json.loads(m.group(1))

    html_cats = []
    for sid, body in SECTION_RE.findall(html):
        sites = []
        for m_card in CARD_RE.finditer(body):
            um = URL_IN_ATTRS.search(m_card.group('attrs'))
            sites.append((m_card.group('name').strip(), um.group(1) if um else ''))
        html_cats.append({
            'id': sid,
            'name': NAME_RE.search(body).group(1),
            'icon': ICON_RE.search(body).group(1),
            'sites': sites,
        })

    fails = []
    if [c['id'] for c in cats] != [c['id'] for c in html_cats]:
        fails.append('分类顺序不一致:\n  data.js = %s\n  html    = %s' % (
            [c['id'] for c in cats], [c['id'] for c in html_cats]))

    dmap = {c['id']: c for c in cats}
    for hc in html_cats:
        dc = dmap.get(hc['id'])
        if dc is None:
            fails.append('data.js 缺少分类 %s' % hc['id'])
            continue
        if dc['name'] != hc['name']:
            fails.append('%s 名称不一致: %s vs %s' % (hc['id'], dc['name'], hc['name']))
        if dc.get('icon') != hc['icon']:
            fails.append('%s 图标不一致: %s vs %s' % (hc['id'], dc.get('icon'), hc['icon']))
        ds = [(s['name'], s['url']) for s in dc['sites']]
        if ds != hc['sites']:
            only_d = [x for x in ds if x not in hc['sites']]
            only_h = [x for x in hc['sites'] if x not in ds]
            fails.append('%s 站点不一致: 仅data.js=%s 仅html=%s' % (hc['id'], only_d, only_h))

    if fails:
        print('!! %d 项不一致' % len(fails))
        for x in fails:
            print('  - ' + x)
        return 1
    print('index.html 与 config-editor/data.js 完全一致：%d 分类 / %d 站点'
          % (len(html_cats), sum(len(c['sites']) for c in html_cats)))
    return 0


if __name__ == '__main__':
    sys.exit(main())
