# -*- coding: utf-8 -*-
"""在无头 Chrome 中跑 index.html 的运行时行为验证。

做法：把 index.html 复制进临时目录，在 </body> 前注入断言脚本，
用 --headless --dump-dom 抓取结果，解析 <pre id="__result"> 里的 [PASS]/[FAIL] 行。

用法: python run_ui_tests.py
"""
import io, json, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

# ---- 注入脚本：在每个用例里先按需设置 localStorage，再在 load 后跑断言 ----
INJECT = r'''
<pre id="__result" style="display:none"></pre>
<script>
(function(){
  var CASE = __CASE__;
  var out = [];
  function log(name, ok, detail) {
    out.push((ok ? '[PASS] ' : '[FAIL] ') + CASE + '::' + name + (detail && !ok ? '  ==> ' + detail : ''));
  }
  function eq(name, actual, expected) {
    log(name, actual === expected, 'expected=' + expected + ' got=' + actual);
  }
  function flush() {
    document.getElementById('__result').textContent = out.join('\n');
  }
  function sidebarIds() {
    var ids = [];
    document.querySelectorAll('#sidebar a[href^="#cat-"]').forEach(function(a) {
      ids.push(a.getAttribute('href').replace('#', ''));
    });
    return ids;
  }
  function mainIds() {
    var ids = [];
    document.querySelectorAll('.main-content .category-section').forEach(function(s) { ids.push(s.id); });
    return ids;
  }
  function ls(k) { try { return localStorage.getItem(k); } catch(e) { return null; } }

  // ---- 每个用例的前置准备 ----
  window.addEventListener('load', function() {
    try {
      if (CASE === 'wp_fresh') {
        // 全新浏览器：无任何壁纸键
        eq('wallpaperType', wallpaperType, 'default');
        eq('nav_wallpaper', ls('nav_wallpaper'), 'default');
        eq('chipDefaultOn', document.getElementById('setWpDefault').classList.contains('on'), true);
        eq('chipBingOff', document.getElementById('setWpBing').classList.contains('on'), false);
        eq('heroBgInlineCleared', (document.querySelector('.hero-bg').style.backgroundImage || ''), '');
        var rule = null;
        for (var i = 0; i < document.styleSheets.length && !rule; i++) {
          try {
            var r = document.styleSheets[i].cssRules;
            for (var j = 0; j < r.length; j++) {
              if (r[j].selectorText === '.hero-bg') { rule = r[j].style.backgroundImage; break; }
            }
          } catch(e) {}
        }
        eq('cssDefaultAsset', (rule || '').indexOf('hero_bg_light.jpg') >= 0, true);
      }
      else if (CASE === 'wp_legacy_bing') {
        eq('wallpaperType', wallpaperType, 'default');
        eq('nav_wallpaper', ls('nav_wallpaper'), 'default');
        eq('migratedFlag', ls('nav_wp_default_migrated'), '1');
      }
      else if (CASE === 'wp_migrated_bing') {
        // 已迁移过且用户明确选了 bing → 必须保持 bing
        eq('wallpaperType', wallpaperType, 'bing');
        eq('nav_wallpaper', ls('nav_wallpaper'), 'bing');
        eq('chipBingOn', document.getElementById('setWpBing').classList.contains('on'), true);
      }
      else if (CASE === 'wp_custom') {
        eq('wallpaperType', wallpaperType, 'custom');
        eq('nav_wallpaper', ls('nav_wallpaper'), 'custom');
      }
      else if (CASE === 'sort_default_fixed') {
        // 默认模式：固定顺序（点击分类不改变顺序）
        eq('catSortMode', catSortMode, 'fixed');
        eq('chipFixedOn', document.getElementById('setCatSortFixed').classList.contains('on'), true);
        eq('chipRecentOff', document.getElementById('setCatSortRecent').classList.contains('on'), false);
        var before = sidebarIds().join(',');
        ['cat-map', 'cat-tradition', 'cat-ai', 'cat-cloud'].forEach(function(id) {
          setActive(document.querySelector('#sidebar a[href="#' + id + '"]'));
        });
        eq('orderUnchanged', sidebarIds().join(','), before);
        eq('listUnlocked', document.getElementById('settingsCatOrderList').classList.contains('locked'), false);
      }
      else if (CASE === 'sort_legacy_recent_migrated') {
        // 存量用户：值仍是旧的 recent 且无迁移标记 → 一次性切到 fixed
        eq('catSortMode', catSortMode, 'fixed');
        eq('nav_cat_sort_mode', ls('nav_cat_sort_mode'), 'fixed');
        eq('migratedFlag', ls('nav_cat_sort_migrated'), '1');
      }
      else if (CASE === 'sort_recent_explicit') {
        // 用户自己选过「按使用时间排序」→ 尊重选择，不迁移
        eq('catSortMode', catSortMode, 'recent');
        eq('chipRecentOn', document.getElementById('setCatSortRecent').classList.contains('on'), true);
        var link = document.querySelector('#sidebar a[href="#cat-map"]');
        setActive(link);
        var ids = sidebarIds();
        eq('mapBumpedToFront', ids[0], 'cat-map');
        var stored = JSON.parse(ls('nav_cat_order') || '[]');
        eq('storedFirst', stored[0], 'cat-map');
        // 同一分类再次点击不应产生重复项
        setActive(link);
        var stored2 = JSON.parse(ls('nav_cat_order') || '[]');
        eq('noDuplicate', stored2.length, new Set(stored2).size);
      }
      else if (CASE === 'sort_fixed') {
        eq('catSortMode', catSortMode, 'fixed');
        eq('chipFixedOn', document.getElementById('setCatSortFixed').classList.contains('on'), true);
        eq('listUnlocked', document.getElementById('settingsCatOrderList').classList.contains('locked'), false);
        var before = sidebarIds().join(',');
        var beforeStored = ls('nav_cat_order');
        // 点 4 个不同分类，顺序必须纹丝不动
        ['cat-map','cat-tradition','cat-ai','cat-cloud'].forEach(function(id) {
          setActive(document.querySelector('#sidebar a[href="#' + id + '"]'));
        });
        eq('orderUnchanged', sidebarIds().join(','), before);
        eq('storageUnchanged', ls('nav_cat_order'), beforeStored);
        // 手动调序：把第 3 项上移
        var listIds = sidebarIds();
        var target = listIds[2];
        moveCategory(target, -1);
        eq('moveUp', sidebarIds()[1], target);
        var persisted = JSON.parse(ls('nav_cat_order') || '[]');
        eq('movePersisted', persisted[1], target);
        // 越界不动
        var first = sidebarIds()[0];
        moveCategory(first, -1);
        eq('topBound', sidebarIds()[0], first);
        // 固定模式下点击分类后手动顺序仍保持
        var kept = sidebarIds().join(',');
        setActive(document.querySelector('#sidebar a[href="#cat-learn"]'));
        eq('fixedAfterClick', sidebarIds().join(','), kept);
        // 调序列表渲染了全部分类
        var items = document.querySelectorAll('#settingsCatOrderList .cat-order-item');
        eq('listItems', items.length, sidebarIds().length);
        eq('listHasTradition', document.getElementById('settingsCatOrderList').textContent.indexOf('传统文化') >= 0, true);
      }
      else if (CASE === 'sort_switch_recent_to_fixed') {
        // 从 recent 切到 fixed：应固化「当前所见顺序」，切换后点击不再改变顺序
        eq('before', catSortMode, 'recent');
        var linkMap = document.querySelector('#sidebar a[href="#cat-map"]');
        setActive(linkMap);
        var frozen = sidebarIds().join(',');
        eq('bumpedFirst', sidebarIds()[0], 'cat-map');
        setCatSortMode('fixed');
        eq('modeNowFixed', catSortMode, 'fixed');
        eq('frozenOrder', sidebarIds().join(','), frozen);
        eq('storedMode', ls('nav_cat_sort_mode'), 'fixed');
        setActive(document.querySelector('#sidebar a[href="#cat-tool"]'));
        eq('stillFrozen', sidebarIds().join(','), frozen);
      }
      else if (CASE === 'rt_tools') {
        var html = document.getElementById('rtEdge').innerHTML;
        eq('hasWps', html.indexOf('365.kdocs.cn') >= 0, true);
        eq('hasWpsLabel', html.indexOf('在线WPS') >= 0, true);
        // 内置 WPS + 一条重复的自定义 WPS → 只应出现一次
        var count = (html.match(/365\.kdocs\.cn/g) || []).length;
        eq('wpsOnce', count, 1);
        eq('builtinCount', (html.match(/class="rt-tab"/g) || []).length, 4 + 1 + 4);
        // 微信传输必须是右侧工具栏的第一个
        var first = document.querySelector('#rtEdge .rt-tab');
        eq('wechatIsFirst', !!first && first.getAttribute('title') === '微信传输', true);
        var titles = [];
        document.querySelectorAll('#rtEdge .rt-tab').forEach(function(el) { titles.push(el.getAttribute('title')); });
        eq('orderHead', titles.slice(0, 3).join(','), '微信传输,在线WPS,计算器');
        // 悬浮窗入口排在内置工具之后
        eq('firstFloatingAfterBuiltins', titles.indexOf('待办事项') > titles.indexOf('工具箱'), true);
      }
      else if (CASE === 'tradition_cat') {
        eq('sectionExists', !!document.getElementById('cat-tradition'), true);
        eq('sidebarLink', !!document.querySelector('#sidebar a[href="#cat-tradition"]'), true);
        eq('mobileTab', !!document.querySelector('.mobile-tab[href="#cat-tradition"]'), true);
        eq('settingsChip', document.getElementById('settingsCatRow').textContent.indexOf('传统文化') >= 0, true);
        eq('cardCount', document.querySelectorAll('#cat-tradition .nav-card').length, 19);
        eq('declaredCount', document.querySelector('#cat-tradition .count').textContent, '19个站点');
        eq('iconLoads', document.querySelector('#cat-tradition .category-header img').getAttribute('src'), 'assets/icon_tradition.jpg');
        // 已按用户要求剔除有问题的站点
        var tradHtml = document.getElementById('cat-tradition').innerHTML;
        eq('noGuoxuedashi', tradHtml.indexOf('guoxuedashi') < 0, true);
        eq('noDeadChgis', tradHtml.indexOf('fas.harvard.edu') < 0, true);
        eq('hasGujiLib', tradHtml.indexOf('read.nlc.cn') >= 0, true);
        eq('hasVoiceTubeFixedInEnt', document.querySelector('#cat-entertainment a[href="https://www.voicetube.com"]') !== null, true);
      }
      else if (CASE === 'order_default_and_migration') {
        // 新默认顺序：左栏应为 综合导航/AI大模型/北航网站/地图天气/学术检索/影音娱乐/技术与交流/学习提升/学习教程…
        var EXPECT = 'cat-general,cat-ai,cat-buaa,cat-map,cat-academic,cat-entertainment,cat-tech,' +
                     'cat-learn,cat-tutorial,cat-aero,cat-translate,cat-navweb,cat-efficiency,' +
                     'cat-tool,cat-tradition,cat-mirror,cat-cloud';
        eq('sidebarOrder', sidebarIds().join(','), EXPECT);
        eq('mainOrder', mainIds().join(','), EXPECT);
        // 存量旧顺序（版本号缺失）+ 旧顺序值 → 一次性迁移为新默认顺序
        eq('migratedStored', JSON.parse(ls('nav_cat_order') || '[]').join(','), EXPECT);
        eq('versionStamped', ls('nav_cat_order_ver'), '2');
        var titles = [];
        document.querySelectorAll('#sidebar a[href^="#cat-"] span').forEach(function(s) { titles.push(s.textContent); });
        eq('firstFive', titles.slice(0, 5).join(','), '综合导航,AI大模型,北航网站,地图天气,学术检索');
        // 固定排序基准与 DOM 一致，且设置面板调序列表首项为综合导航
        var first = document.querySelector('#settingsCatOrderList .cat-order-item .cat-order-name');
        eq('listFirst', first ? first.textContent : '', '综合导航');
      }
      else if (CASE === 'settings_panel_render') {
        openSettings();
        var panel = document.querySelector('.settings-panel');
        eq('panelVisible', document.getElementById('settingsOverlay').classList.contains('visible'), true);
        var vis = function(el) { return !!(el && el.offsetParent !== null); };
        eq('recentChipVisible', vis(document.getElementById('setCatSortRecent')), true);
        eq('fixedChipVisible', vis(document.getElementById('setCatSortFixed')), true);
        eq('hintVisible', vis(document.getElementById('catSortHint')), true);
        eq('hintText', document.getElementById('catSortHint').textContent,
           '当前为固定顺序：点击分类不会改变顺序，可用下方 ↑ ↓ 手动调整。');
        var list = document.getElementById('settingsCatOrderList');
        eq('listVisible', vis(list), true);
        var rows = list.querySelectorAll('.cat-order-item');
        eq('rowCount', rows.length, sidebarIds().length);
        var r0 = rows[0];
        eq('rowHasName', r0.querySelector('.cat-order-name').textContent.length > 0, true);
        eq('rowUpDisabledOnFirst', r0.querySelectorAll('.cat-order-move')[0].disabled, true);
        var rLast = rows[rows.length - 1];
        eq('rowDownDisabledOnLast', rLast.querySelectorAll('.cat-order-move')[1].disabled, true);
        // 点最后一行 ↑ 按钮，真实走一次 onclick
        var lastId = sidebarIds()[sidebarIds().length - 1];
        var btn = rLast.querySelectorAll('.cat-order-move')[0];
        btn.disabled = false;
        btn.click();
        var ids = sidebarIds();
        eq('clickMovedUp', ids[ids.length - 2], lastId);
        eq('panelOrderMatchesSidebar', list.querySelectorAll('.cat-order-item').length, ids.length);
        // 设置面板里也应有新分类开关
        eq('catChipTradition', document.getElementById('settingsCatRow').textContent.indexOf('传统文化') >= 0, true);
      }
      else if (CASE === 'counts_visible') {
        var bad = [];
        document.querySelectorAll('.category-section').forEach(function(sec) {
          var n = sec.querySelectorAll('.nav-card').length;
          var t = (sec.querySelector('.count') || {}).textContent || '';
          if (t !== n + '个站点') bad.push(sec.id + ':' + t + '!=' + n);
        });
        eq('allCountsMatch', bad.join('|'), '');
        eq('totalCategories', mainIds().length, sidebarIds().length);
      }
    } catch (e) {
      out.push('[FAIL] ' + CASE + '::exception  ==> ' + (e && e.message ? e.message : e));
    }
    flush();
  });

  // ---- 前置：设置 localStorage 后重新加载（只重载一次）----
  var PREP = __PREP__;
  if (PREP) {
    var reloaded = sessionStorage.getItem('__preped_' + CASE) === '1';
    if (!reloaded) {
      try {
        PREP.forEach(function(item) {
          if (item[1] === null) localStorage.removeItem(item[0]);
          else localStorage.setItem(item[0], item[1]);
        });
      } catch (e) {}
      sessionStorage.setItem('__preped_' + CASE, '1');
      location.reload();
      throw new Error('__PREP_RELOAD__');
    }
  }
})();
</script>
'''

CASES = [
    ('wp_fresh', [('nav_wallpaper', None), ('nav_wp_default_migrated', None)]),
    ('wp_legacy_bing', [('nav_wallpaper', 'bing'), ('nav_wp_default_migrated', None)]),
    ('wp_migrated_bing', [('nav_wallpaper', 'bing'), ('nav_wp_default_migrated', '1')]),
    ('wp_custom', [('nav_wallpaper', 'custom'), ('nav_wp_default_migrated', '1')]),
    ('sort_default_fixed', [('nav_cat_sort_mode', None), ('nav_cat_sort_migrated', None),
                            ('nav_cat_order', None), ('nav_wallpaper', 'default')]),
    ('sort_legacy_recent_migrated', [('nav_cat_sort_mode', 'recent'), ('nav_cat_sort_migrated', None),
                                     ('nav_cat_order', None), ('nav_wallpaper', 'default')]),
    ('sort_recent_explicit', [('nav_cat_sort_mode', 'recent'), ('nav_cat_sort_migrated', '1'),
                              ('nav_cat_order', None), ('nav_wallpaper', 'default')]),
    ('sort_fixed', [('nav_cat_sort_mode', 'fixed'), ('nav_cat_sort_migrated', '1'),
                    ('nav_cat_order', None), ('nav_wallpaper', 'default')]),
    ('sort_switch_recent_to_fixed', [('nav_cat_sort_mode', 'recent'), ('nav_cat_sort_migrated', '1'),
                                     ('nav_cat_order', None), ('nav_wallpaper', 'default')]),
    ('rt_tools', [('nav_wallpaper', 'default'),
                  ('nav_rt_custom_tools', json.dumps([{'icon': '📄', 'name': 'WPS在线', 'url': 'https://365.kdocs.cn', 'enabled': True}],
                                                     ensure_ascii=False))]),
    ('tradition_cat', [('nav_wallpaper', 'default')]),
    ('order_default_and_migration', [('nav_wallpaper', 'default'),
                                     ('nav_cat_order', json.dumps(['cat-cloud', 'cat-mirror', 'cat-aero'])),
                                     ('nav_cat_order_ver', None)]),
    ('settings_panel_render', [('nav_wallpaper', 'default'), ('nav_cat_sort_mode', 'fixed'), ('nav_theme', 'light')]),
    ('counts_visible', [('nav_wallpaper', 'default')]),
]


def run_case(case, prep, tmpdir):
    with io.open(os.path.join(ROOT, 'index.html'), 'r', encoding='utf-8') as f:
        html = f.read()
    inject = INJECT.replace('__CASE__', json.dumps(case)).replace('__PREP__', json.dumps(prep, ensure_ascii=False))
    html = html.replace('</body>', inject + '\n</body>')
    page = os.path.join(tmpdir, 'case_%s.html' % case)
    with io.open(page, 'w', encoding='utf-8') as f:
        f.write(html)
    prof = os.path.join(tmpdir, 'prof_%s' % case)
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
           '--allow-file-access-from-files', '--virtual-time-budget=6000',
           '--user-data-dir=' + prof, '--dump-dom', 'file:///' + page.replace('\\', '/')]
    p = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=120)
    dom = p.stdout or ''
    m = re.search(r'<pre id="__result"[^>]*>(.*?)</pre>', dom, re.S)
    if not m:
        return ['[FAIL] %s::no-result  ==> chrome rc=%d stderr=%s' % (case, p.returncode, (p.stderr or '')[-400:])]
    body = m.group(1)
    body = body.replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').replace('&quot;', '"')
    lines = [l for l in body.split('\n') if l.strip()]
    return lines or ['[FAIL] %s::empty-result' % case]


def main():
    if not os.path.exists(CHROME):
        print('chrome not found: %s' % CHROME)
        return 2
    tmpdir = tempfile.mkdtemp(prefix='auroraus_ui_')
    all_lines = []
    try:
        for case, prep in CASES:
            lines = run_case(case, prep, tmpdir)
            all_lines.extend(lines)
            for l in lines:
                print(l)
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)

    fails = [l for l in all_lines if l.startswith('[FAIL]')]
    print()
    print('PASS=%d FAIL=%d' % (len(all_lines) - len(fails), len(fails)))
    with io.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ui_test_output.txt'), 'w',
                 encoding='utf-8', newline='\n') as f:
        f.write('\n'.join(all_lines) + '\n\nPASS=%d FAIL=%d\n' % (len(all_lines) - len(fails), len(fails)))
    return 1 if fails else 0


if __name__ == '__main__':
    sys.exit(main())
