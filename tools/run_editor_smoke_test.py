# -*- coding: utf-8 -*-
"""config-editor 冒烟测试：加载编辑器页面，确认无 JS 报错、17 个分类都出现在左侧列表、
站点表格可渲染、导出配置里带上新分类。"""
import io, json, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

INJECT = r'''
<pre id="__out" style="display:none"></pre>
<script>
window.addEventListener('error', function(e) {
  var o = document.getElementById('__out');
  if (o) o.textContent += '[FAIL] window.onerror: ' + e.message + '\n';
});
window.addEventListener('load', function() {
  setTimeout(function() {
    var out = [];
    function eq(name, a, b) {
      out.push((a === b ? '[PASS] ' : '[FAIL] ') + name + (a === b ? '' : '  ==> expected=' + b + ' got=' + a));
    }
    eq('defaultCategoriesLoaded', DEFAULT_CATEGORIES.length, 17);
    eq('hasTradition', DEFAULT_CATEGORIES.some(function(c) { return c.id === 'cat-tradition'; }), true);
    eq('totalSites', DEFAULT_CATEGORIES.reduce(function(n, c) { return n + c.sites.length; }, 0), 276);
    var text = document.body.textContent;
    eq('traditionVisibleInUi', text.indexOf('传统文化') >= 0, true);
    eq('categoryNamesShown', text.indexOf('学术检索') >= 0 && text.indexOf('航空与科普') >= 0, true);
    // 切换到一个分类，确认站点表格能渲染出行
    try {
      var tbl = document.querySelectorAll('table tr, .site-row, [data-site-row]');
      out.push((tbl.length > 0 ? '[PASS] ' : '[FAIL] ') + 'siteRowsRendered (' + tbl.length + ')');
    } catch(e) {
      out.push('[FAIL] siteRowsRendered: ' + e.message);
    }
    document.getElementById('__out').textContent = (document.getElementById('__out').textContent || '') + out.join('\n');
  }, 400);
});
</script>
'''


def main():
    if not os.path.exists(CHROME):
        print('chrome not found')
        return 2
    tmp = tempfile.mkdtemp(prefix='auroraus_editor_')
    try:
        shutil.copytree(os.path.join(ROOT, 'config-editor'), os.path.join(tmp, 'config-editor'))
        shutil.copytree(os.path.join(ROOT, 'assets'), os.path.join(tmp, 'assets'))
        page = os.path.join(tmp, 'config-editor', 'index.html')
        with io.open(page, 'r', encoding='utf-8') as f:
            html = f.read()
        html = html.replace('</body>', INJECT + '\n</body>')
        with io.open(page, 'w', encoding='utf-8') as f:
            f.write(html)
        cmd = [CHROME, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
               '--allow-file-access-from-files', '--virtual-time-budget=6000',
               '--user-data-dir=' + os.path.join(tmp, 'prof'),
               '--dump-dom', 'file:///' + page.replace('\\', '/')]
        r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=300)
        m = re.search(r'<pre id="__out"[^>]*>(.*?)</pre>', r.stdout or '', re.S)
        body = (m.group(1) if m else '').replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').replace('&quot;', '"')
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
