# -*- coding: utf-8 -*-
"""用本地 HTTP 服务 + 无头 Chrome 实测首页加载：请求数 / 字节数 / DCL / load / 最慢资源。
用法: python tools/measure_load.py
"""
import http.server, io, json, os, re, socket, subprocess, sys, tempfile, threading

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

INJECT = r'''
<pre id="__perf" style="display:none">pending</pre>
<script>
(function(){
  function report(){
    var nav = (performance.getEntriesByType('navigation') || [])[0] || {};
    var res = performance.getEntriesByType('resource') || [];
    var bytes = 0, imgs = 0, slow = [];
    res.forEach(function(r){
      bytes += (r.transferSize || r.encodedBodySize || 0);
      if (/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test((r.name||'').split('?')[0])) imgs++;
      slow.push({n:(r.name||'').split('/').pop(), ms: Math.round(r.duration)});
    });
    slow.sort(function(a,b){return b.ms-a.ms;});
    var paints = {};
    (performance.getEntriesByType('paint')||[]).forEach(function(p){ paints[p.name]=Math.round(p.startTime); });
    document.getElementById('__perf').textContent = JSON.stringify({
      requests: res.length, images: imgs, transferKB: Math.round(bytes/1024),
      startToDCL: Math.round(nav.domContentLoadedEventEnd||0),
      startToLoad: Math.round(nav.loadEventEnd||0),
      FCP: paints['first-contentful-paint']||0, FP: paints['first-paint']||0,
      slow: slow.slice(0,5), cards: document.querySelectorAll('.nav-card').length
    });
  }
  if (document.readyState === 'complete') setTimeout(report, 300);
  else window.addEventListener('load', function(){ setTimeout(report, 300); });
})();
</script>
</body>'''


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, *a):
        pass


srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Handler)
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()

tmp = tempfile.mkdtemp(prefix='perf_http_')
html = io.open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read().replace('</body>', INJECT)
page = os.path.join(tmp, 'index.html')
io.open(page, 'w', encoding='utf-8', newline='\n').write(html)

# 用临时页面目录服务：把临时页放在站点根下更真实，但为不污染仓库，改为在 ROOT 下临时文件
tmppage = os.path.join(ROOT, '_perf_tmp.html')
io.open(tmppage, 'w', encoding='utf-8', newline='\n').write(html)
url = 'http://127.0.0.1:%d/_perf_tmp.html' % port

try:
    for i in range(3):
        prof = tempfile.mkdtemp(prefix='perfprof%d_' % i)
        cmd = [CHROME, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
               '--window-size=1440,900', '--virtual-time-budget=10000',
               '--user-data-dir=' + prof, '--dump-dom', url]
        p = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=180)
        m = re.search(r'<pre id="__perf"[^>]*>(.*?)</pre>', p.stdout or '', re.S)
        if not m or 'pending' in m.group(1):
            print('run %d: 没拿到数据（rc=%d）' % (i, p.returncode))
            continue
        data = json.loads(m.group(1).replace('&quot;', '"').replace('&amp;', '&'))
        print('run %d: requests=%d images=%d transferKB=%d DCL=%dms load=%dms FCP=%dms'
              % (i, data['requests'], data['images'], data['transferKB'], data['startToDCL'], data['startToLoad'], data['FCP']))
        print('        最慢资源: %s' % ', '.join('%s %dms' % (s['n'], s['ms']) for s in data['slow']))
finally:
    try:
        os.remove(tmppage)
    except OSError:
        pass
    srv.shutdown()
