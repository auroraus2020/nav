# -*- coding: utf-8 -*-
"""探测候选「地球实时卫星图」图源：DNS/TCP/TLS/TTFB/体积/内容类型/HTTP 码。
用法: python tools/probe_earth.py [url ...]
"""
import socket, ssl, sys, time, re

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'

CANDS = [
    'https://himawari8.nict.go.jp/img/D531106/latest.json',
    'https://www.jma.go.jp/bosai/himawari/',
    'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/FD/GEOCOLOR/latest.jpg',
    'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYER=VIIRS_SNPP_CorrectedReflectance_TrueColor&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=800&HEIGHT=400&FORMAT=image/jpeg&TIME=2024-06-01',
    'https://zoom.earth/',
    'https://www.windy.com/',
    'https://img.nsmc.org.cn/',
    'https://rsapp.nsmc.org.cn/',
    'https://himawari8.nict.go.jp/',
]


def probe(url, maxbytes=200000):
    m = re.match(r'(https?)://([^/]+)(/[^\s]*)?$', url)
    if not m:
        return 'BAD URL', {}
    scheme, host, path = m.group(1), m.group(2), (m.group(3) or '/')
    ip = ''
    t0 = time.time()
    try:
        infos = socket.getaddrinfo(host, 443 if scheme == 'https' else 80, proto=socket.IPPROTO_TCP)
        ip = infos[0][4][0]
    except Exception as e:
        return 'DNS FAIL %s' % e, {}
    tDns = time.time() - t0
    try:
        raw = socket.create_connection((ip, 443 if scheme == 'https' else 80), timeout=8)
    except Exception as e:
        return 'TCP FAIL %s' % e, {'ip': ip}
    tTcp = time.time() - t0
    try:
        s = ssl.create_default_context().wrap_socket(raw, server_hostname=host) if scheme == 'https' else raw
    except Exception as e:
        raw.close()
        return 'TLS FAIL %s' % str(e)[:60], {'ip': ip, 'tcp_ms': round(tTcp * 1000)}
    tTls = time.time() - t0
    try:
        s.settimeout(10)
        s.send(('GET %s HTTP/1.1\r\nHost: %s\r\nUser-Agent: %s\r\nAccept: */*\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n' % (path, host, UA)).encode())
        buf = b''
        tTtfb = None
        while len(buf) < maxbytes:
            chunk = s.recv(8192)
            if not chunk:
                break
            if tTtfb is None:
                tTtfb = time.time() - t0
            buf += chunk
    except Exception as e:
        return 'READ FAIL %s' % str(e)[:50], {'ip': ip}
    finally:
        try:
            s.close()
        except Exception:
            pass
    head, _, body = buf.partition(b'\r\n\r\n')
    lines = head.decode('latin-1', 'replace').split('\r\n')
    status = lines[0] if lines else '?'
    ctype = ''
    for ln in lines:
        if ln.lower().startswith('content-type:'):
            ctype = ln.split(':', 1)[1].strip()
    return status, {'ip': ip, 'dns_ms': round(tDns * 1000), 'tcp_ms': round(tTcp * 1000),
                    'tls_ms': round(tTls * 1000), 'ttfb_ms': round((tTtfb or 0) * 1000),
                    'bytes': len(body), 'type': ctype}


urls = sys.argv[1:] or CANDS
for u in urls:
    st, info = probe(u)
    print('%-70s %s' % (u[:70], st))
    if info:
        print('    ' + ' '.join('%s=%s' % (k, v) for k, v in info.items()))
