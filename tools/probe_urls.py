# -*- coding: utf-8 -*-
"""对给定 URL 直接发请求（跟随重定向，校验证书），输出状态与最终地址。
用法: python tools/probe_urls.py <url> [url ...]
"""
import socket, ssl, sys, re

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'


def get(url, depth=0):
    m = re.match(r'(https?)://([^/]+)(/.*)?$', url)
    if not m:
        return 'BAD URL'
    scheme, host, path = m.group(1), m.group(2), m.group(3) or '/'
    port = 443 if scheme == 'https' else 80
    try:
        raw = socket.create_connection((host, port), timeout=8)
    except Exception as e:
        return 'TCP FAIL: %s' % e
    try:
        if scheme == 'https':
            ctx = ssl.create_default_context()
            s = ctx.wrap_socket(raw, server_hostname=host)
        else:
            s = raw
    except Exception as e:
        try:
            raw.close()
        except Exception:
            pass
        return 'TLS FAIL: %s' % str(e)[:70]
    try:
        s.settimeout(8)
        s.send(('GET %s HTTP/1.1\r\nHost: %s\r\nUser-Agent: %s\r\nAccept: */*\r\nConnection: close\r\n\r\n'
                % (path, host, UA)).encode())
        data = b''
        while len(data) < 20000:
            c = s.recv(8192)
            if not c:
                break
            data += c
    except Exception as e:
        return 'READ FAIL: %s' % str(e)[:60]
    finally:
        try:
            s.close()
        except Exception:
            pass
    head = data.split(b'\r\n\r\n', 1)[0].decode('utf-8', 'replace')
    status = head.split('\r\n')[0]
    loc = ''
    for line in head.split('\r\n'):
        if line.lower().startswith('location:'):
            loc = line.split(':', 1)[1].strip()
    title = re.search(r'<title[^>]*>(.*?)</title>', data.decode('utf-8', 'replace'), re.S | re.I)
    return '%s | loc=%s | title=%s | %d bytes' % (status, loc or '-', (title.group(1).strip()[:40] if title else ''), len(data))


for u in sys.argv[1:]:
    print('%-46s %s' % (u, get(u)))
