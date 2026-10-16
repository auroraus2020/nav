# -*- coding: utf-8 -*-
"""渲染实测 + 网络错误抓取：判断站点是否真的能在国内直连打开。
用法: python tools/check_render2.py <url> [url ...]
"""
import os, re, subprocess, sys, tempfile

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
BUDGET = int(os.environ.get('RENDER_BUDGET', '30000'))

for url in sys.argv[1:]:
    prof = tempfile.mkdtemp(prefix='render2_')
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
           '--enable-logging=stderr', '--v=0', '--window-size=1440,900',
           '--virtual-time-budget=%d' % BUDGET, '--user-data-dir=' + prof, '--dump-dom', url]
    try:
        p = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=120)
    except subprocess.TimeoutExpired:
        print('%-36s HARD-TIMEOUT' % url)
        continue
    dom = p.stdout or ''
    errtxt = p.stderr or ''
    errs = sorted(set(re.findall(r'(net::ERR_[A-Z_]+)', errtxt)))
    hosts = sorted(set(re.findall(r'(?:URL|url)[= ]"?(https?://[^"\s)]+)', errtxt)))[:6]
    title = re.search(r'<title[^>]*>(.*?)</title>', dom, re.S)
    body = re.search(r'<body[^>]*>(.*?)</body>', dom, re.S)
    btxt = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', body.group(1))).strip() if body else ''
    print('%-36s dom=%-8d text=%-7d title=%s' % (url, len(dom), len(btxt),
                                                 (title.group(1).strip()[:44] if title else '')))
    if errs:
        print('    net-errors: %s' % ','.join(errs))
    if hosts:
        print('    urls: %s' % ' '.join(hosts))
