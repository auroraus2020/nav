# -*- coding: utf-8 -*-
"""全站连通性实测：绕过系统代理直连测试每个站点域名（12 秒并发总预算）。
产出 _reach.json：domain -> true(可直连) / false(需VPN)。
注意：请确保测试时未开启全局 VPN/代理，否则结果会失真。
"""
import io, json, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
h = io.open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()

domains = set()
for m in re.finditer(r'<a class="nav-card"[^>]*href="([^"]+)"', h):
    um = re.match(r'https?://([^/]+)', m.group(1))
    if um:
        domains.add(um.group(1).lower())
# 引擎搜索端点域名
ENGINES = {
    'bing': 'cn.bing.com', 'baidu': 'www.baidu.com', 'google': 'www.google.com',
    'sogou': 'www.sogou.com', 'sogouweixin': 'weixin.sogou.com', 'sogouzhihu': 'zhihu.sogou.com',
    'yandex': 'ya.ru', 'gscholar2': 'sc.panda985.com', 'xmol': 'www.x-mol.com',
    'googlescholar': 'scholar.google.com', 'buaaebsco': 'research.ebsco.com',
    'baiduxueshu': 'xueshu.baidu.com', 'douyin': 'www.douyin.com',
    'xiaohongshu': 'www.xiaohongshu.com', 'bilibili': 'search.bilibili.com',
    'zhihu': 'www.zhihu.com', 'weibo': 's.weibo.com', 'github': 'github.com',
    'baidumap': 'map.baidu.com', 'wikihow': 'zh.wikihow.com', 'scihub': 'sci-hub.sh',
    'kiphub': 'www.kiphub.com', 'msacademic': 'cn.bing.com',
    # 本轮新增引擎
    'quora': 'www.quora.com', 'wikipedia': 'zh.wikipedia.org',
    'metaso': 'metaso.cn', 'reddit': 'www.reddit.com',
    'bingtrans': 'www.bing.com',
}
domains.update(ENGINES.values())
domains = sorted(domains)
print('待测域名 %d 个' % len(domains))

ps = '''
$ErrorActionPreference = 'SilentlyContinue'
$domains = @(%s)
$handler = New-Object System.Net.Http.HttpClientHandler
$handler.UseProxy = $false
$handler.AllowAutoRedirect = $true
$client = New-Object System.Net.Http.HttpClient($handler)
$client.Timeout = [TimeSpan]::FromSeconds(12)
$tasks = @{}
foreach ($d in $domains) {
  $tasks[$d] = $client.GetAsync("https://" + $d + "/")
}
[void][System.Threading.Tasks.Task]::WaitAll([System.Threading.Tasks.Task[]]$tasks.Values, 14000)
$result = @{}
foreach ($d in $domains) {
  $t = $tasks[$d]
  if ($t.Status -eq 'RanToCompletion') { $result[$d] = $true }
  else { $result[$d] = $false }
}
$result | ConvertTo-Json -Compress
''' % (', '.join("'%s'" % d for d in domains))

script = os.path.join(ROOT, '_reach_test.ps1')
io.open(script, 'w', encoding='utf-8-sig', newline='\n').write(ps)
r = subprocess.run(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', script],
                   capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=300)
os.remove(script)
try:
    data = json.loads(r.stdout.strip())
except Exception as e:
    print('解析失败:', e, r.stdout[:300], r.stderr[:300])
    raise SystemExit(1)

ok = sorted([d for d, v in data.items() if v])
bad = sorted([d for d, v in data.items() if not v])
io.open(os.path.join(ROOT, '_reach.json'), 'w', encoding='utf-8', newline='\n').write(
    json.dumps(data, ensure_ascii=False, indent=1))
print('可直连 %d 个；不可达(需VPN) %d 个' % (len(ok), len(bad)))
print('--- 不可达 ---')
print('  ' + '\n  '.join(bad))
