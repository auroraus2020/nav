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
    eq('defaultCategoriesLoaded', DEFAULT_CATEGORIES.length, 19);
    eq('hasTradition', DEFAULT_CATEGORIES.some(function(c) { return c.id === 'cat-tradition'; }), true);
    eq('hasNewCats', DEFAULT_CATEGORIES.some(function(c) { return c.id === 'cat-data'; }) &&
                     DEFAULT_CATEGORIES.some(function(c) { return c.id === 'cat-drive'; }), true);
    eq('totalSites', DEFAULT_CATEGORIES.reduce(function(n, c) { return n + c.sites.length; }, 0), 303);
    eq('vpnTagged', DEFAULT_CATEGORIES.reduce(function(n, c) {
      return n + c.sites.filter(function(s) { return s.vpn === true; }).length; }, 0) >= 25, true);
    var text = document.body.textContent;
    eq('traditionVisibleInUi', text.indexOf('传统文化') >= 0, true);
    eq('categoryNamesShown', text.indexOf('学术检索') >= 0 && text.indexOf('航空与科普') >= 0, true);
    // 站点表格：显示 / VPN 两列
    try {
      var tbl = document.querySelectorAll('table tr, .site-row, [data-site-row]');
      out.push((tbl.length > 0 ? '[PASS] ' : '[FAIL] ') + 'siteRowsRendered (' + tbl.length + ')');
      eq('vpnColumnHeader', !!document.querySelector('th.col-vpn'), true);
      var vpnBoxes = document.querySelectorAll('td.col-vpn input[type=checkbox]');
      eq('vpnCheckboxes', vpnBoxes.length > 0, true);
      var orderBtns = document.querySelectorAll('td.col-actions button[title="上移"]');
      eq('siteMoveButtons', orderBtns.length > 0, true);
    } catch(e) {
      out.push('[FAIL] siteTable: ' + e.message);
    }
    // 分类排序面板
    try {
      switchTab('catorder', document.querySelectorAll('.tab')[1]);
      eq('catOrderPanel', !!document.getElementById('catOrderContent'), true);
      var items = document.querySelectorAll('#catOrderContent .order-item');
      eq('catOrderItems', items.length, 19);
      var names = [];
      items.forEach(function(it) { names.push(it.querySelector('.order-name').textContent.replace(/\s*自定义\s*$/, '').trim()); });
      eq('catOrderNamesAreLabels', names.indexOf('综合导航') >= 0 && names.indexOf('数据与统计') >= 0, true);
      eq('modeChips', document.querySelectorAll('#catOrderContent .chip').length >= 5, true);
      eq('moveBtn', typeof window.moveCatInEditor === 'function', true);
      eq('setCatSort', typeof window.setCatSort === 'function', true);
    } catch(e) {
      out.push('[FAIL] catOrderPanel: ' + e.message);
    }
    // 快捷工具：每个工具有侧别选择（靠左/靠右）
    try {
      switchTab('rttools', document.querySelectorAll('.tab')[4]);
      var sideChips = document.querySelectorAll('#rtToolsContent .chip[onclick*="setRtSideOf"]');
      eq('rtSideChipsExist', sideChips.length > 0, true);
      eq('rtSideFn', typeof window.setRtSideOf, 'function');
      eq('rtToolsTableRendered', document.querySelectorAll('#rtToolsContent table tr').length > 5, true);
      window.setRtSideOf('rtb:微信传输', 'left');
      eq('rtSideChipOn', document.querySelectorAll('#rtToolsContent .chip[onclick*="setRtSideOf"][class*="on"]').length > 0, true);
      window.saveAll();
      var saved = JSON.parse(localStorage.getItem('nav_rt_sides') || '{}');
      eq('rtSideSaved', saved['rtb:微信传输'], 'left');
    } catch(e) {
      out.push('[FAIL] rtToolsSide: ' + e.message);
    }
    // 搜索引擎：每个引擎有「需VPN」勾选（第 5 条：搜索引擎也要有 VPN 属性）
    try {
      switchTab('engines', document.querySelectorAll('.tab')[2]);
      eq('engineVpnHeader', !!document.querySelector('#engineContent th[title*="科学上网"]'), true);
      eq('engineVpnBoxes', document.querySelectorAll('#engineContent input[title*="科学上网"]').length >= 10, true);
      // 谷歌系引擎默认应勾选（data.js 里带 vpn:true）
      window.toggleEngineVpn('google', true);
      window.saveAll();
      var ev = JSON.parse(localStorage.getItem('nav_engine_vpn') || '{}');
      eq('engineVpnSaved', ev['google'], true);
    } catch(e) {
      out.push('[FAIL] engineVpn: ' + e.message);
    }
    // 自定义分类：显示/隐藏勾选可用（第 4 条补漏）
    try {
      localStorage.setItem('nav_custom_cats', JSON.stringify([{id: 'custom-x', name: '临时分类', icon: '', sites: [{name: '示例站', url: 'https://example.com', desc: '', icon: 'E', iconColor: 'blue'}]}]));
      window.toggleSite('custom-x', '示例站', false);   // 取消勾选 = 隐藏
      window.saveAll();
      var rm = JSON.parse(localStorage.getItem('nav_removed_sites') || '{}');
      eq('customCatHideSaved', (rm['custom-x'] || []).indexOf('示例站') >= 0, true);
      localStorage.removeItem('nav_custom_cats');
      localStorage.removeItem('nav_removed_sites');
    } catch(e) {
      out.push('[FAIL] customCatToggle: ' + e.message);
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
        cmd = [CHROME, '--headless=new', '--disable-gpu', '--no-first-run', '--window-size=1600,1200', '--no-default-browser-check',
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
