# -*- coding: utf-8 -*-
"""校验 index.html：
1) 每个分类 section 的 .nav-card 数与 <span class="count"> 声明一致；
2) 用户点名站点是否出现在指定分类；
3) 同一分类内站点名/URL 是否重复。
用法: python verify_site_integrity.py [index.html]
"""
import io, os, re, sys

SECTION_RE = re.compile(r'<section class="category-section" id="([^"]+)">(.*?)</section>', re.S)
CARD_RE = re.compile(
    r'<a class="nav-card"(?P<attrs>[^>]*)>\s*'
    r'<div class="icon icon-(?P<color>[a-z]+)">(?P<glyph>[^<]*)</div>\s*'
    r'<div class="info"><h3>(?P<name>[^<]*)</h3>',
    re.S)
URL_IN_ATTRS = re.compile(r'href="([^"]+)"')
COUNT_RE = re.compile(r'<span class="count">(\d+)个站点</span>')

# 用户点名的站点 -> 期望所在分类（按 h3 文本或 URL 片段匹配）
REQUIRED = [
    ('cat-general', '谷歌搜索', 'https://www.google.com'),
    ('cat-tech', 'Quora', 'https://www.quora.com'),
    ('cat-tech', 'Reddit', 'https://www.reddit.com'),
    ('cat-tech', 'X (Twitter)', 'https://x.com'),
    ('cat-map', '谷歌地图', 'https://www.google.com/maps'),
    ('cat-map', '谷歌地球', 'https://earth.google.com/web/'),
    ('cat-map', '两步路', 'https://www.2bulu.com'),
    ('cat-efficiency', 'QQ邮箱', 'https://mail.qq.com'),
    ('cat-efficiency', '163邮箱', 'https://mail.163.com'),
    ('cat-efficiency', 'Outlook', 'https://outlook.live.com'),
    ('cat-efficiency', 'Gmail', 'https://mail.google.com'),
    ('cat-entertainment', 'YouTube', 'https://www.youtube.com'),
    ('cat-entertainment', 'TikTok', 'https://www.tiktok.com'),
    ('cat-entertainment', 'VoiceTube', 'https://www.voicetube.com'),
    ('cat-entertainment', '红果短剧', 'https://hongguoduanju.com/'),
    ('cat-entertainment', '爱壹帆', 'https://www.yfsp.tv'),
    ('cat-entertainment', 'Tubi', 'https://tubitv.com/'),
    ('cat-entertainment', 'Pluto TV', 'https://pluto.tv/'),
    ('cat-entertainment', 'The Roku Channel', 'https://therokuchannel.roku.com/'),
    ('cat-tradition', '中华古籍资源库', 'http://read.nlc.cn/thematDataSearch/toGujiIndex'),
    ('cat-tradition', '历史地图网', 'http://www.txlzp.com/ditu/'),
    ('cat-tradition', 'GeaCron 互动历史地图', 'https://geacron.com/home-zh-hans/?lang=zh-hans'),
    ('cat-tradition', '万年日历查询', 'https://wannianrili.bmcx.com/'),
    ('cat-translate', '谷歌翻译', 'https://translate.google.com'),
    ('cat-learn', '维基百科', 'https://zh.wikipedia.org'),
    ('cat-mirror', 'APKPure', 'https://apkpure.com/cn/'),
    ('cat-academic', '国家知识产权局专利检索', 'https://pss-system.cponline.cnipa.gov.cn'),
    ('cat-academic', 'WIPO PATENTSCOPE', 'https://patentscope2.wipo.int/search/zh/search.jsf'),
    ('cat-data', '国家数据', 'https://data.stats.gov.cn'),
    ('cat-learn', 'TypeWords', 'https://typewords.cc/'),
    ('cat-learn', 'LanGeek', 'https://langeek.co/en-ZH'),
    ('cat-learn', '黄油单词', 'https://waiyuka.cc/'),
    ('cat-learn', 'TED', 'https://www.ted.com'),
    ('cat-data', '世界银行开放数据', 'https://data.worldbank.org'),
    ('cat-drive', '百度网盘', 'https://pan.baidu.com'),
    ('cat-drive', '阿里云盘', 'https://www.alipan.com'),
    ('cat-drive', 'Google Drive', 'https://drive.google.com'),
]

# 「技术与交流」前排站点（必须出现在前 6 位内）
TECH_FRONT = ['Quora', 'Reddit', 'X (Twitter)']

# 已确认失效 / 用户要求移除的地址，禁止再出现在页面上
FORBIDDEN = [
    'tw.voicetube.com',          # 应改用 www.voicetube.com
    'fas.harvard.edu',           # CHGIS 旧地址 404
    'guoxuedashi',               # 用户反馈该站有问题，已移除
]

# 新增分类必须登记的 5 处
TRADITION_REGISTRATIONS = [
    ('main-section', r'<section class="category-section" id="cat-tradition">'),
    ('sidebar-link', r'<a[^>]+href="#cat-tradition"'),
    ('mobile-tab', r'<a class="mobile-tab"[^>]+href="#cat-tradition"'),
    ('settings-render', r"\{id:'cat-tradition'"),
    ('export-allcatids', r"'cat-tradition'"),
    ('help-doc', None),  # help/index.html 里单独查
]


def main():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target = sys.argv[1] if len(sys.argv) > 1 else os.path.join(root, 'index.html')
    with io.open(target, 'r', encoding='utf-8') as f:
        html = f.read()

    fails = []
    sections = {}
    for sid, body in SECTION_RE.findall(html):
        cards = []
        for m_card in CARD_RE.finditer(body):
            um = URL_IN_ATTRS.search(m_card.group('attrs'))
            cards.append(((um.group(1) if um else ''), m_card.group('name').strip()))
        declared = COUNT_RE.search(body)
        declared = int(declared.group(1)) if declared else None
        sections[sid] = cards
        if declared != len(cards):
            fails.append('计数不一致 %s: 声明=%s 实际=%d' % (sid, declared, len(cards)))
        names = [c[1] for c in cards]
        dup = sorted({n for n in names if names.count(n) > 1})
        if dup:
            fails.append('重名卡片 %s: %s' % (sid, dup))
        urls = [c[0] for c in cards]
        dupu = sorted({u for u in urls if urls.count(u) > 1})
        if dupu:
            fails.append('重复URL %s: %s' % (sid, dupu))

    print('== 分类站点数 ==')
    for sid in sections:
        print('  %-18s %d' % (sid, len(sections[sid])))
    print('  合计 %d 个站点 / %d 个分类' % (sum(len(v) for v in sections.values()), len(sections)))

    print('== 点名站点 ==')
    for cat, name, url in REQUIRED:
        cards = sections.get(cat, [])
        hit = [c for c in cards if c[1] == name and c[0] == url]
        if hit:
            print('  OK   %-18s %s -> %s' % (cat, name, url))
        else:
            near = [c for c in cards if c[1] == name]
            fails.append('缺失 %s 中的 %s(%s)%s' % (cat, name, url, (' 期望URL=%s 实际=%s' % (url, near[0][0])) if near else ''))
            print('  FAIL %-18s %s -> %s' % (cat, name, url))

    print('== 技术与交流前排 ==')
    tech = [c[1] for c in sections.get('cat-tech', [])]
    for i, name in enumerate(TECH_FRONT):
        pos = tech.index(name) if name in tech else -1
        ok = 0 <= pos <= 5          # 必须出现在前 6 位
        print('  %s  第%d位 %s' % ('OK  ' if ok else 'FAIL', pos + 1, name))
        if not ok:
            fails.append('cat-tech 排序: %s 应在默认组前 6 位内，实际第%d位' % (name, pos + 1))

    print('== 已移除/失效地址不得出现 ==')
    for bad in FORBIDDEN:
        ok = bad not in html
        print('  %s  %s' % ('OK  ' if ok else 'FAIL', bad))
        if not ok:
            fails.append('页面仍包含应移除的地址: %s' % bad)

    print('== cat-tradition 登记 ==')
    for label, pat in TRADITION_REGISTRATIONS:
        if pat is None:
            hp = os.path.join(root, 'help', 'index.html')
            with io.open(hp, 'r', encoding='utf-8') as f:
                ok = 'cat-tradition' in f.read()
        else:
            ok = re.search(pat, html) is not None
        print('  %s  %s' % ('OK  ' if ok else 'FAIL', label))
        if not ok:
            fails.append('cat-tradition 未登记: %s' % label)

    print()
    if fails:
        print('!! %d 项未通过:' % len(fails))
        for x in fails:
            print('   - ' + x)
        sys.exit(1)
    print('全部校验通过')


if __name__ == '__main__':
    main()
