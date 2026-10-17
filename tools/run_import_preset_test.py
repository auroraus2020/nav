# -*- coding: utf-8 -*-
"""端到端验证：把 configs/default_recommended.json 真正导入一次，确认
① 不产生重复卡片 ② 壁纸被设为 default ③ 排序模式设为 fixed ④ 分类顺序为预设顺序。

做法：复制 index.html 到临时目录（同时复制 assets/configs），
在真实无头浏览器里读取同目录下的 preset JSON 文本并调用 processImportJson，
（processImportJson 结尾会 location.reload，所以用 sessionStorage 标记避免死循环，重载后再断言。）
"""
import io, json, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

INJECT = r'''
<pre id="__out" style="display:none"></pre>
<script>
(function(){
  var preset = __PRESET__;
  var FAV_PAYLOAD = JSON.stringify({favorites: ['https://www.google.com'], favClicks: {'https://www.google.com': 7}});   // processImportJson 收的是 JSON 文本
  window.addEventListener('load', function(){
    var out = [];
    var stage = sessionStorage.getItem('__import_stage') || '0';
    if (stage === '0') {
      sessionStorage.setItem('__import_stage', '1');
      window.alert = function(){};  // headless 下屏蔽导入成功弹窗
      try { processImportJson(preset); } catch(e) { out.push('[FAIL] import_throw: ' + e.message); }
      // processImportJson 内部 alert 在 headless 下无副作用；随后它会 reload
      document.getElementById('__out').textContent = out.join('\n');
      return;
    }
    if (stage === '1') {
      // 预设导入完成 → 再导入一份带「收藏网址 + 使用频次」的配置，验证导入能带走收藏
      sessionStorage.setItem('__import_stage', '2');
      window.alert = function(){};
      try { processImportJson(FAV_PAYLOAD); } catch(e) { out.push('[FAIL] favImport_throw: ' + e.message); }
      document.getElementById('__out').textContent = out.join('\n');
      return;
    }
    function eq(name, a, b) {
      out.push((a === b ? '[PASS] ' : '[FAIL] ') + name + (a === b ? '' : '  ==> expected=' + b + ' got=' + a));
    }
    function dupCheck() {
      var bad = [];
      document.querySelectorAll('.category-section').forEach(function(sec) {
        var names = [];
        sec.querySelectorAll('.nav-card h3').forEach(function(h) { names.push(h.textContent.trim()); });
        var dup = names.filter(function(n, i) { return names.indexOf(n) !== i; });
        if (dup.length) bad.push(sec.id + ':' + dup.join('/'));
      });
      return bad.join('|');
    }
    eq('noDuplicateCards', dupCheck(), '');
    eq('wallpaperDefault', localStorage.getItem('nav_wallpaper'), 'earth');
    eq('sortModeFixed', localStorage.getItem('nav_cat_sort_mode'), 'fixed');
    var order = JSON.parse(localStorage.getItem('nav_cat_order') || '[]');
    eq('orderHasTradition', order.indexOf('cat-tradition') >= 0, true);
    eq('orderHead', order.slice(0, 3).join(','), 'cat-general,cat-ai,cat-buaa');
    eq('catOrderMatchesSidebar',
       sidebarIdsJoined().replace('cat-favorites,', ''),
       order.join(','));
    eq('noCustomTradition', (localStorage.getItem('nav_custom_cats') || '').indexOf('传统文化') >= 0, false);
    eq('wpsRenderedOnce', (document.getElementById('rtEdge').innerHTML.match(/365\.kdocs\.cn/g) || []).length, 1);
    eq('traditionCards', document.querySelectorAll('#cat-tradition .nav-card').length, 19);
    // 第二轮导入带来的收藏与频次
    eq('favImported', localStorage.getItem('nav_fav'), '["https://www.google.com"]');
    eq('favClicksImported', JSON.parse(localStorage.getItem('nav_fav_clicks') || '{}')['https://www.google.com'], 7);
    eq('favCardRendered', document.querySelectorAll('#cat-favorites .nav-card').length, 1);
    function sidebarIdsJoined() {
      var ids = [];
      document.querySelectorAll('#sidebar a[href^="#cat-"]').forEach(function(a) { ids.push(a.getAttribute('href').replace('#','')); });
      return ids.join(',');
    }
    document.getElementById('__out').textContent = out.join('\n');
  });
})();
</script>
'''


def main():
    if not os.path.exists(CHROME):
        print('chrome not found')
        return 2
    with io.open(os.path.join(ROOT, 'index.html'), 'r', encoding='utf-8') as f:
        html = f.read()
    with io.open(os.path.join(ROOT, 'configs', 'default_recommended.json'), 'r', encoding='utf-8') as f:
        preset = f.read()
    html = html.replace('</body>', INJECT.replace('__PRESET__', json.dumps(preset, ensure_ascii=False)) + '\n</body>')

    tmp = tempfile.mkdtemp(prefix='auroraus_import_')
    try:
        for d in ('assets',):
            shutil.copytree(os.path.join(ROOT, d), os.path.join(tmp, d))
        page = os.path.join(tmp, 'index.html')
        with io.open(page, 'w', encoding='utf-8') as f:
            f.write(html)
        cmd = [CHROME, '--headless=new', '--disable-gpu', '--no-first-run', '--window-size=1600,1200', '--no-default-browser-check',
               '--allow-file-access-from-files', '--virtual-time-budget=30000',
               '--user-data-dir=' + os.path.join(tmp, 'prof'),
               '--dump-dom', 'file:///' + page.replace('\\', '/')]
        r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=300)
        m = re.search(r'<pre id="__out"[^>]*>(.*?)</pre>', r.stdout or '', re.S)
        body = m.group(1) if m else ''
        body = body.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').replace('&quot;', '"')
        lines = [l for l in body.split('\n') if l.strip()]
        if not lines:
            print('no output; rc=%d stderr=%s' % (r.returncode, (r.stderr or '')[-300:]))
            return 1
        for l in lines:
            print(l)
        fails = [l for l in lines if l.startswith('[FAIL]')]
        print()
        print('PASS=%d FAIL=%d' % (len(lines) - len(fails), len(fails)))
        return 1 if fails else 0
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    sys.exit(main())
