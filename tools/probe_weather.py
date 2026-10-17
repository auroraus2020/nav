# -*- coding: utf-8 -*-
"""测试天气/空气质量数据源在国内的可达性与 CORS。一次性脚本。"""
import json, ssl, socket, sys, time, urllib.request

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'

URLS = [
    ('open-meteo 预报', 'https://api.open-meteo.com/v1/forecast?latitude=39.9042&longitude=116.4074'
                        '&current=temperature_2m,relative_humidity_2m,surface_pressure,weather_code,wind_speed_10m,wind_direction_10m'
                        '&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=Asia%2FShanghai&forecast_days=1'),
    ('open-meteo 空气', 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=39.9042&longitude=116.4074'
                        '&current=pm2_5,pm10,us_aqi,european_aqi&timezone=Asia%2FShanghai'),
    ('open-meteo 地理编码', 'https://geocoding-api.open-meteo.com/v1/search?name=%E5%8C%97%E4%BA%AC&count=3&language=zh'),
    ('wttr.in', 'https://wttr.in/Beijing?format=j1'),
    ('msn 天气页', 'https://www.msn.com/zh-cn/weather/overview'),
    ('msn 天气地图', 'https://www.msn.com/zh-cn/weather/maps'),
]

for name, url in URLS:
    m = url.split('/')[2]
    try:
        ip = socket.gethostbyname(m)
    except Exception as e:
        print('%-20s DNS FAIL %s' % (name, e))
        continue
    t0 = time.time()
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Origin': 'http://localhost'})
        with urllib.request.urlopen(req, timeout=25) as r:
            body = r.read(600)
            cors = r.headers.get('Access-Control-Allow-Origin')
            print('%-20s %s  %dms  CORS=%s  %s  %s' % (name, r.status, (time.time() - t0) * 1000, cors,
                                                       r.headers.get('Content-Type', '')[:28], body[:90]))
    except Exception as e:
        print('%-20s FAIL %.0fms %s' % (name, (time.time() - t0) * 1000, str(e)[:70]))
