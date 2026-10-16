# -*- coding: utf-8 -*-
"""直连实测（不走代理，真实家庭宽带环境）：
对每个域名做 TCP 443 + TLS 校验 + HTTP GET，并扫描页面引用的第三方资源域名，
判断国内直连是否可用（尤其“能握手但页面打不开/加载不全”的情况）。

判据：
  1) DNS 解析失败 / TCP 超时        → 被墙（需 VPN）
  2) TLS 证书校验失败（自签名）      → 被中间人拦截，页面会报证书错误（需 VPN）
  3) 页面引用了被墙 CDN 关键资源     → 国内加载残缺（建议标 VPN）
  4) 全部通过                        → 国内可直连

用法: python tools/check_direct.py [分类id或名称关键字] [--deep]
"""
import io, os, re, socket, ssl, sys, time, concurrent.futures as cf

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# 国内被墙/高污染的第三方资源域名（命中即说明页面在国内会加载残缺）
BLOCKED_ASSETS = [
    'fonts.googleapis.com', 'fonts.gstatic.com', 'ajax.googleapis.com', 'apis.google.com',
    'www.gstatic.com', 'gstatic.com', 'googleusercontent.com', 'storage.googleapis.com',
    'cdn.jsdelivr.net', 'www.google-analytics.com', 'googletagmanager.com',
    'www.youtube.com', 'youtube.com', 'platform.twitter.com', 'connect.facebook.net',
]
BLOCKED_RE = re.compile('|'.join(re.escape(x) for x in BLOCKED_ASSETS))

UA = ('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) '
      'Chrome/124.0.0.0 Safari/537.36')
TIMEOUT = 8.0


def categories():
    html = io.open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    out = []
    for m in re.finditer(r'<section class="category-section"([^>]*)>(.*?)</section>', html, re.S):
        sid = re.search(r'id="([^"]+)"', m.group(1))
        name = re.search(r'<h2[^>]*>(.*?)</h2>', m.group(2), re.S)
        title = re.sub(r'<[^>]+>', '', name.group(1)).strip() if name else '?'
        cards = []
        for c in re.finditer(r'<a class="nav-card"([^>]*)>(.*?)</a>', m.group(2), re.S):
            href = re.search(r'href="([^"]+)"', c.group(1))
            h3 = re.search(r'<h3[^>]*>(.*?)</h3>', c.group(2), re.S)
            cards.append({
                'name': re.sub(r'<[^>]+>', '', h3.group(1)).strip() if h3 else '?',
                'url': href.group(1) if href else '',
                'vpn': 'data-vpn="1"' in c.group(1),
            })
        out.append({'id': sid.group(1) if sid else '?', 'title': title, 'cards': cards})
    return out


def fetch(dom):
    """返回 (verdict, detail)；verdict ∈ OK / BLOCKED / SUSPECT。"""
    t0 = time.time()
    try:
        infos = socket.getaddrinfo(dom, 443, proto=socket.IPPROTO_TCP)
    except Exception as e:
        return 'BLOCKED', 'DNS 解析失败: %s' % e, 0.0, ''
    ips = []
    for i in infos:
        if i[4][0] not in ips:
            ips.append(i[4][0])
    last = ''
    for ip in ips[:4]:
        try:
            raw = socket.create_connection((ip, 443), timeout=TIMEOUT)
        except Exception as e:
            last = 'TCP 超时(%s)' % ip
            continue
        try:
            ctx = ssl.create_default_context()
            ss = ctx.wrap_socket(raw, server_hostname=dom)
        except Exception as e:
            try:
                raw.close()
            except Exception:
                pass
            last = 'TLS 拦截(%s): %s' % (ip, str(e)[:60])
            continue
        req = ('GET / HTTP/1.1\r\nHost: %s\r\nUser-Agent: %s\r\nAccept: */*\r\nConnection: close\r\n\r\n'
               % (dom, UA))
        body = b''
        status = ''
        try:
            ss.settimeout(TIMEOUT)
            ss.send(req.encode())
            while len(body) < 400000:
                chunk = ss.recv(65536)
                if not chunk:
                    break
                body += chunk
        except Exception:
            pass
        finally:
            try:
                ss.close()
            except Exception:
                pass
        txt = body.decode('utf-8', 'replace')
        status = (txt.split('\r\n')[0] if txt else '(无响应)')[:40]
        low = txt.lower()
        hits = sorted(set(m.group(0) for m in re.finditer(BLOCKED_RE, low)))
        el = time.time() - t0
        if hits:
            return 'SUSPECT', '%s | %s | 引用被墙资源: %s' % (ip, status, ','.join(hits)), el, status
        return 'OK', '%s | %s | %d bytes' % (ip, status, len(body)), el, status
    return 'BLOCKED', last or '全部 IP 失败', time.time() - t0, ''


def asset_detail(dom):
    """抓首页 HTML，列出引用被墙资源的具体标签（区分功能性脚本/样式 与 字体统计）。"""
    try:
        info = socket.getaddrinfo(dom, 443, proto=socket.IPPROTO_TCP)[0][4][0]
        raw = socket.create_connection((info, 443), timeout=TIMEOUT)
        ctx = ssl.create_default_context()
        ss = ctx.wrap_socket(raw, server_hostname=dom)
        ss.settimeout(TIMEOUT)
        ss.send(('GET / HTTP/1.1\r\nHost: %s\r\nUser-Agent: %s\r\nAccept: text/html,*/*\r\nConnection: close\r\n\r\n'
                 % (dom, UA)).encode())
        body = b''
        while len(body) < 600000:
            c = ss.recv(65536)
            if not c:
                break
            body += c
        ss.close()
    except Exception as e:
        return [('ERR', str(e)[:80])]
    txt = body.decode('utf-8', 'replace')
    found = []
    for m in re.finditer(r'<script[^>]+src=["\']([^"\']+)["\']', txt, re.I):
        u = m.group(1)
        if BLOCKED_RE.search(u.lower()):
            found.append(('script', u[:110]))
    for m in re.finditer(r'<link[^>]+href=["\']([^"\']+)["\']', txt, re.I):
        u = m.group(1)
        if BLOCKED_RE.search(u.lower()):
            found.append(('link', u[:110]))
    for m in re.finditer(r'["\'](https?://[^"\']*(?:googleusercontent|jsdelivr|gstatic|googleapis|youtube)[^"\']*)["\']', txt, re.I):
        u = m.group(1)
        if not any(u in f[1] for f in found):
            found.append(('ref', u[:110]))
    return found


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    flags = [a for a in sys.argv[1:] if a.startswith('--')]
    kw = args[0] if args else None
    secs = categories()
    sel = [s for s in secs if not kw or kw in s['id'] or kw in s['title']]
    targets = []
    for s in sel:
        for c in s['cards']:
            d = re.match(r'https?://([^/]+)', c['url'])
            if d:
                targets.append((s['title'], c['name'], d.group(1).lower(), c['vpn']))
    doms = sorted(set(t[2] for t in targets))
    if '--assets' in flags:
        for dom in doms:
            rows = asset_detail(dom)
            if not rows:
                continue
            print('== %s' % dom)
            for kind, u in rows:
                print('   %-7s %s' % (kind, u))
        return
    print('分类: %s；卡片 %d 张；域名 %d 个' % (','.join(s['title'] for s in sel), len(targets), len(doms)))
    res = {}
    with cf.ThreadPoolExecutor(max_workers=10) as ex:
        for dom, (verdict, detail, el, status) in zip(doms, ex.map(fetch, doms)):
            res[dom] = (verdict, detail)
    print()
    for title, name, dom, vpn in targets:
        verdict, detail = res[dom]
        print('  %-8s %-3s %-32s %s' % (verdict, 'VPN' if vpn else '-', dom, detail[:120]))
    print()
    print('== 直连不 OK（候选需 VPN 标记）==')
    any_bad = False
    for title, name, dom, vpn in targets:
        verdict, detail = res[dom]
        if verdict != 'OK':
            any_bad = True
            print('  [%s] %s / %s  当前标记=%s  %s  %s'
                  % (title, name, dom, 'VPN' if vpn else '无', verdict, detail[:100]))
    if not any_bad:
        print('  （无）')


if __name__ == '__main__':
    main()
