# -*- coding: utf-8 -*-
"""回归测试：设置项在「刷新页面」后必须原样保留，且不得被初始化流程改写。

覆盖键：主题/壁纸/排序模式/顺序/顺序版本/VPN 模式/仅显示选中分类/
        快捷工具侧别/站点覆盖/常用站点数量。
"""
import io, json, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

PREP = {
    'nav_wallpaper': 'default',
    'nav_theme': 'dark',
    'nav_cat_sort_mode': 'recent',
    'nav_cat_sort_migrated': '1',
    'nav_cat_order_ver': '2',
    'nav_cat_order': json.dumps(['cat-cloud', 'cat-tradition', 'cat-general', 'cat-ai']),
    # 预置 ver=2 + 旧顺序 → 应被一次性迁移到 v3 新默认顺序（这是设计行为）
    'nav_vpn_mode': 'off',
    'nav_only_active': '1',
    'nav_rt_sides': json.dumps({'rtb:微信传输': 'left'}, ensure_ascii=False),
    'nav_site_overrides': json.dumps({'cat-general|谷歌搜索': {'hidden': True}}, ensure_ascii=False),
    'nav_freq_count': '10',
    'nav_fav': json.dumps(['https://www.zhihu.com'], ensure_ascii=False),
    'nav_fav_clicks': json.dumps({'https://www.zhihu.com': 4}),
    'nav_engine_vpn': json.dumps({'wikipedia': True, 'google': False}, ensure_ascii=False),
}

BODY = '''<pre id="__out" style="display:none"></pre>
<script>
(function(){
  var PREP = __PREP__;
  var keys = Object.keys(PREP);
  if (sessionStorage.getItem('p') !== '1') {
    try { keys.forEach(function(k){ localStorage.setItem(k, PREP[k]); }); } catch(e){}
    sessionStorage.setItem('p','1');
    location.reload();
    return;
  }
  window.addEventListener('load', function(){
    setTimeout(function(){
      var out = [];
      function eq(name, a, b) {
        out.push((a === b ? '[PASS] ' : '[FAIL] ') + name + (a === b ? '' : '  ==> expected=' + b + ' got=' + a));
      }
      keys.forEach(function(k){
        // nav_cat_order / nav_cat_order_ver 会被默认顺序迁移（v2→v3），单独断言
        if (k === 'nav_cat_order' || k === 'nav_cat_order_ver') return;
        eq('persist_' + k, localStorage.getItem(k), PREP[k]);
      });
      eq('migratedVer', localStorage.getItem('nav_cat_order_ver'), '3');
      eq('migratedOrderHead', JSON.parse(localStorage.getItem('nav_cat_order') || '[]').slice(0, 5).join(','),
         'cat-general,cat-ai,cat-buaa,cat-academic,cat-tech');
      eq('vpnModeVarHonoursStored', vpnMode, 'off');
      eq('vpnOnHonoursOff', vpnOn, false);
      eq('hiddenSiteStillHidden', document.querySelector('#cat-general a[href="https://www.google.com"]').getAttribute('data-hidden'), '1');
      eq('onlyActiveStillOn', document.body.classList.contains('only-active'), true);
      eq('themeStillDark', document.body.classList.contains('dark'), true);
      eq('rtLeftFromStored', document.querySelectorAll('#rtEdgeLeft .rt-tab').length >= 1, true);
      // 收藏与引擎 VPN 覆盖的持久化
      eq('favRendered', document.getElementById('cat-favorites').querySelectorAll('.nav-card').length, 1);
      // 导出配置必须真的带走收藏与使用频次（帮助文档承诺）
      var exp = buildConfigData();
      eq('exportHasFavorites', (exp.favorites || []).join(','), 'https://www.zhihu.com');
      eq('exportHasFavClicks', (exp.favClicks || {})['https://www.zhihu.com'], 4);
      var wikiEng = document.querySelector('.search-engines input[value="wikipedia"]');
      eq('engineVpnHidden', wikiEng ? wikiEng.closest('.engine-option').style.display : 'missing', 'none');
      eq('googleEngineVisible', (function() {
        var el = document.querySelector('.search-engines input[value="google"]');
        return el ? el.closest('.engine-option').style.display : '';
      })(), '');   // override google=false → 即使 google 默认 VPN 也不隐藏
      document.getElementById('__out').textContent = out.join('\\n');
    }, 900);
  });
})();
</script>'''


def main():
    with io.open(os.path.join(ROOT, 'index.html'), 'r', encoding='utf-8') as f:
        html = f.read()
    html = html.replace('</body>', BODY.replace('__PREP__', json.dumps(PREP, ensure_ascii=False)) + '\n</body>')
    d = tempfile.mkdtemp(prefix='auroraus_persist_test_')
    try:
        shutil.copytree(os.path.join(ROOT, 'assets'), os.path.join(d, 'assets'))
        p = os.path.join(d, 'index.html')
        io.open(p, 'w', encoding='utf-8').write(html)
        cmd = [CHROME, '--headless=new', '--window-size=1600,1200', '--disable-gpu', '--no-first-run',
               '--allow-file-access-from-files', '--virtual-time-budget=8000',
               '--user-data-dir=' + os.path.join(d, 'prof'), '--dump-dom', 'file:///' + p.replace('\\', '/')]
        r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=200)
        m = re.search(r'<pre id="__out"[^>]*>(.*?)</pre>', r.stdout or '', re.S)
        body = (m.group(1) if m else '').replace('&quot;', '"').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        lines = [l for l in body.split('\n') if l.strip()]
        if not lines:
            print('no output; rc=%d' % r.returncode)
            return 1
        for l in lines:
            print(l)
        fails = [l for l in lines if l.startswith('[FAIL]')]
        print()
        print('PASS=%d FAIL=%d' % (len(lines) - len(fails), len(fails)))
        return 1 if fails else 0
    finally:
        shutil.rmtree(d, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
