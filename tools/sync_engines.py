# -*- coding: utf-8 -*-
"""从 index.html 反向派生 config-editor/data.js 的 DEFAULT_ENGINES。

真源只有 index.html 一处：引擎顺序取搜索框下 .engine-option 的 DOM 顺序，
URL 取 engineUrls，VPN 标记取 VPN_ENGINES，名称/标签来自标签文本 + 名称表。
用法: python tools/sync_engines.py
"""
import io, json, os, re, sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

NAMES = {
    'bing': '必应', 'baidu': '百度', 'google': '谷歌', 'metaso': '秘塔AI', 'perplexity': 'Perplexity',
    'sogou': '搜狗', 'sogouweixin': '搜狗微信', 'sogouzhihu': '搜狗知乎', 'yandex': 'Yandex',
    'gscholar2': '谷歌学术②', 'xmol': 'XMOL', 'googlescholar': '谷歌学术', 'buaaebsco': '北航外文',
    'baiduxueshu': '百度学术', 'douyin': '抖音', 'xiaohongshu': '小红书', 'bilibili': '哔哩哔哩',
    'zhihu': '知乎', 'weibo': '微博', 'github': 'GitHub', 'baidumap': '百度地图', 'wikihow': 'WikiHow',
    'scihub': 'Sci-Hub', 'kiphub': 'KipHub', 'msacademic': '微软学术', 'quora': 'Quora',
    'reddit': 'Reddit', 'wikipedia': '维基百科', 'trans2en': '译英', 'trans2zh': '译中',
}


def main():
    html = io.open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    path = os.path.join(ROOT, 'config-editor', 'data.js')
    js = io.open(path, encoding='utf-8').read()

    urls_src = re.search(r'var engineUrls = \{(.*?)\n    \};', html, re.S).group(1)
    urls = {m.group(1): m.group(2) for m in re.finditer(r"(\w+):\s*'([^']*)'", urls_src)}

    order, labels = [], {}
    for m in re.finditer(r'<label class="engine-option[^"]*"><input type="radio" name="engine" value="(\w+)"[^>]*>([^<]*)</label>', html):
        order.append(m.group(1))
        labels[m.group(1)] = m.group(2).strip()

    vpn = set(re.findall(r'(\w+):\s*1', re.search(r'var VPN_ENGINES = \{([^}]*)\}', html).group(1)))

    engines = []
    for eid in order:
        e = {'id': eid, 'name': NAMES.get(eid, eid), 'url': urls.get(eid, ''), 'label': labels.get(eid, eid)}
        if eid in vpn:
            e['vpn'] = True
        engines.append(e)
    engines.append({'id': 'custom', 'name': '自定义', 'url': urls['custom'], 'label': '⚙️自定义'})

    js = re.sub(r'var DEFAULT_ENGINES=\[.*?\];',
                'var DEFAULT_ENGINES=' + json.dumps(engines, ensure_ascii=False, separators=(',', ':')) + ';',
                js, count=1, flags=re.S)
    io.open(path, 'w', encoding='utf-8', newline='\n').write(js)
    print('DEFAULT_ENGINES 已同步：%d 个（VPN: %s）' % (len(engines), ','.join(sorted(vpn))))
    print('顺序：' + ','.join(e['id'] for e in engines))
    return 0


if __name__ == '__main__':
    sys.exit(main())
