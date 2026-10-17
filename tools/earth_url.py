# -*- coding: utf-8 -*-
"""生成并验证「地球实况」当前时刻的原图直链（给用户复制用）。"""
import sys, time, urllib.request

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'


def subsolar(d):
    h = d.tm_hour + d.tm_min / 60.0
    lon = (12 - h) * 15.0
    while lon > 180:
        lon -= 360
    while lon < -180:
        lon += 360
    return lon


now = time.gmtime()
yday = time.gmtime(time.time() - 86400)
DAY = time.strftime('%Y-%m-%d', yday)
sub = subsolar(now)
lo, hi = sub - 90, sub + 90
if lo < -180:
    lo, hi = -180, 0
if hi > 180:
    lo, hi = 0, 180
bbox = '-60,%g,70,%g' % (round(lo, 2), round(hi, 2))

url = ('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap'
       '&LAYERS=VIIRS_SNPP_CorrectedReflectance_TrueColor&CRS=EPSG:4326&BBOX=' + bbox +
       '&WIDTH=1200&HEIGHT=867&FORMAT=image/jpeg&TIME=' + DAY)
print('UTC 现在 = %02d:%02d  →  正午经线 = %.1f°E' % (now.tm_hour, now.tm_min, sub))
print('日期(TIME) =', DAY)
print('BBOX =', bbox)
print()
print(url)
print()
t0 = time.time()
with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=45) as r:
    data = r.read()
    ct = r.headers.get('Content-Type')
    cors = r.headers.get('Access-Control-Allow-Origin')
print('验证：HTTP 200, %s, %d KB, %.1fs, CORS=%s' % (ct, len(data) // 1024, time.time() - t0, cors))
