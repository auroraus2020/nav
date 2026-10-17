# -*- coding: utf-8 -*-
"""在无头 Chrome 中跑 index.html 的运行时行为验证。

做法：把 index.html 复制进临时目录，在 </body> 前注入断言脚本，
用 --headless --dump-dom 抓取结果，解析 <pre id="__result"> 里的 [PASS]/[FAIL] 行。

用法: python run_ui_tests.py
"""
import io, json, os, re, shutil, subprocess, sys, tempfile, threading, time
from http.server import BaseHTTPRequestHandler, HTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

# ---- 本地“挂起图片”服务：无头 Chrome 的 --virtual-time-budget 会在有未完成网络请求时暂停虚拟时间，
#      用它给 IndexedDB 的异步回调留出真实时间（否则虚拟时间瞬间跑完，IDB 回调永远排不上队）----
HOLD_MS = 700
_TINY_PNG = bytes.fromhex('89504e470d0a1a0a0000000d4948445200000001000000010806000000'
                          '1f15c4890000000d4944415478da63f8cf00000301010018dd8db00000000049454e44ae426082')


class _HoldHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/hold'):
            time.sleep(HOLD_MS / 1000.0)
            self.send_response(200)
            self.send_header('Content-Type', 'image/png')
            self.send_header('Content-Length', str(len(_TINY_PNG)))
            self.end_headers()
            self.wfile.write(_TINY_PNG)
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, *args):
        pass


class HoldServer(object):
    """开启本地挂起图片服务；hold_url() 返回可供页面引用的地址。"""
    def __init__(self):
        self.srv = HTTPServer(('127.0.0.1', 0), _HoldHandler)
        self.port = self.srv.server_address[1]
        self.thread = threading.Thread(target=self.srv.serve_forever)
        self.thread.daemon = True
        self.thread.start()

    def hold_url(self):
        return 'http://127.0.0.1:%d/hold.png' % self.port

    def stop(self):
        try:
            self.srv.shutdown()
            self.srv.server_close()
        except Exception:
            pass


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
  // includeFav=false：排除动态置顶的「收藏网址」（它有自己的置顶语义，单独在 fav 用例断言）
  function sidebarIds(includeFav) {
    var ids = [];
    document.querySelectorAll('#sidebar a[href^="#"]').forEach(function(a) {
      var h = a.getAttribute('href');
      if (h && h.length > 1) {
        var id = h.replace('#', '');
        if (!includeFav && id === 'cat-favorites') return;
        ids.push(id);
      }
    });
    return ids;
  }
  function mainIds(includeFav) {
    var ids = [];
    document.querySelectorAll('.main-content .category-section').forEach(function(s) {
      if (!includeFav && s.id === 'cat-favorites') return;
      ids.push(s.id);
    });
    return ids;
  }
  function ls(k) { try { return localStorage.getItem(k); } catch(e) { return null; } }

  // ---- 用例主体：load 后执行；壁纸/IDB 用例在解析期执行（配合挂起图片暂停虚拟时间）----
  function runCase() {
    try {
      if (CASE === 'wp_fresh') {
        // 全新浏览器：所有壁纸键都没有 → 默认就是「🌍 地球实况」
        eq('wallpaperType', wallpaperType, 'earth');
        eq('nav_wallpaper', ls('nav_wallpaper'), 'earth');
        eq('chipEarthOn', document.getElementById('setWpEarth').classList.contains('on'), true);
        eq('chipDefaultOff', document.getElementById('setWpDefault').classList.contains('on'), false);
      }
      else if (CASE === 'wp_static_default') {
        // 用户明确选了静态「默认壁纸」：不能再被地球实况覆盖
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
      else if (CASE === 'wp_earth_keep_custom') {
        // 一次性迁移只动「默认壁纸」，用户选过的自定义壁纸必须保留
        eq('wallpaperType', wallpaperType, 'custom');
        eq('nav_wallpaper', ls('nav_wallpaper'), 'custom');
        eq('earthVerWritten', ls('nav_wp_earth_ver'), '1');
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
        // 默认模式：固定顺序（点分类只在自己分组内置顶，不按使用时间持续重排）
        eq('catSortMode', catSortMode, 'fixed');
        var before = sidebarIds();
        eq('beforeFirstFive', before.slice(0, 5).join(','), 'cat-general,cat-ai,cat-buaa,cat-academic,cat-tech');
        ['cat-map', 'cat-tradition', 'cat-ai', 'cat-cloud'].forEach(function(id) {
          setActive(document.querySelector('#sidebar a[href="#' + id + '"]'));
        });
        // 固定顺序：点击分类只跳转，顺序与存储都不许变
        eq('orderUnchangedAfterClick', sidebarIds().join(','), before.join(','));
        eq('sameCount', sidebarIds().length, before.length);
        eq('mainEqSidebar', mainIds().join(','), sidebarIds().join(','));
        eq('sortUiNotInPopup', !document.getElementById('settingsCatOrderList'), true);
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
        var count0 = sidebarIds().length;
        // 点 4 个不同分类：每次点击把它提到默认组首位，但不产生/丢失分类
        ['cat-map','cat-tradition','cat-ai','cat-cloud'].forEach(function(id) {
          setActive(document.querySelector('#sidebar a[href="#' + id + '"]'));
        });
        eq('orderFrozenAfterClicks', sidebarIds()[0], 'cat-general');
        eq('noLossNoDup', sidebarIds().length, count0);
        eq('mainEqSidebar', mainIds().join(','), sidebarIds().join(','));
        // 手动调序：把第 3 项上移
        var listIds = sidebarIds();
        var target = listIds[2];
        moveCategory(target, -1);
        eq('moveUp', sidebarIds()[1], target);
        var persisted = JSON.parse(ls('nav_cat_order') || '[]');
        eq('movePersisted', persisted[persisted.indexOf(target)], target);
        eq('movePersistedIndex', persisted.indexOf(target) > 0, true);
        // 越界不动
        var first = sidebarIds()[0];
        moveCategory(first, -1);
        eq('topBound', sidebarIds()[0], first);
        eq('noOrderListInPopup', !document.getElementById('settingsCatOrderList'), true);
      }
      else if (CASE === 'sort_switch_recent_to_fixed') {
        // 从 recent 切到 fixed：应固化「当前所见顺序」
        eq('before', catSortMode, 'recent');
        var linkMap = document.querySelector('#sidebar a[href="#cat-map"]');
        setActive(linkMap);
        eq('bumpedFirst', sidebarIds()[0], 'cat-map');
        setCatSortMode('fixed');
        eq('modeNowFixed', catSortMode, 'fixed');
        var frozen = sidebarIds().join(',');
        eq('storedMode', ls('nav_cat_sort_mode'), 'fixed');
        var stored = JSON.parse(ls('nav_cat_order') || '[]');
        eq('frozenKeepsMapFirst', stored[stored.indexOf('cat-map') - 1], 'cat-favorites');
        setActive(document.querySelector('#sidebar a[href="#cat-tool"]'));
        eq('stillSameSet', sidebarIds().length, frozen.split(',').length);
        eq('mainStillEqSidebar', mainIds().join(','), sidebarIds().join(','));
      }
      else if (CASE === 'rt_tools') {
        var html = document.getElementById('rtEdge').innerHTML;
        eq('hasWps', html.indexOf('365.kdocs.cn') >= 0, true);
        eq('hasWpsLabel', html.indexOf('在线WPS') >= 0, true);
        // 内置 WPS + 一条重复的自定义 WPS → 只应出现一次
        var count = (html.match(/365\.kdocs\.cn/g) || []).length;
        eq('wpsOnce', count, 1);
        eq('builtinCount', (html.match(/class="rt-tab"/g) || []).length, 9);
        // 用户指定顺序：网页微信助手 → 在线WPS → 待办 → 番茄钟 → 单位换算 → 临时记事本 → 工具箱 → 计算器 → 临时画图
        // （天气已按需求移到首屏右上角，不再占工具条）
        var first = document.querySelector('#rtEdge .rt-tab');
        eq('wechatIsFirst', !!first && first.getAttribute('title') === '网页微信助手', true);
        var titles = [];
        document.querySelectorAll('#rtEdge .rt-tab').forEach(function(el) { titles.push(el.getAttribute('title')); });
        eq('toolbarOrder',
           titles.slice(0, 9).join(','),
           '网页微信助手,在线WPS,待办,番茄钟,单位换算,临时记事本,工具箱,计算器,临时画图');
        eq('weatherNotInToolbar', titles.indexOf('天气'), -1);
        eq('weatherInHero', !!document.getElementById('heroWeatherBtn'), true);
        eq('renamedTodos', titles.indexOf('待办事项'), -1);
      }
      else if (CASE === 'tradition_cat') {
        eq('sectionExists', !!document.getElementById('cat-tradition'), true);
        // 搜索模式默认「全搜索」，且初始化不得写盘（刷新不丢设置的既有约束）
        eq('searchModeDefaultFull', searchMode, 'full');
        eq('searchModeNotWritten', ls('nav_search_mode'), null);
        // 需 VPN 站点的显示方式默认「一直显示」
        eq('vpnModeDefaultAlways', vpnMode, 'always');
        eq('vpnOnByDefault', vpnOn, true);
        eq('vpnModeDefaultWritten', ls('nav_vpn_mode'), 'always');
        eq('vpnModeVerWritten', ls('nav_vpn_mode_ver'), '2');
        openSettings();
        eq('alwaysChipOnByDefault', document.getElementById('setVpnAlways').classList.contains('on'), true);
        closeSettings();
        // 没有收藏时，默认高亮仍是综合导航（空收藏分类不应抢焦点）
        eq('activeIsGeneralWithoutFav', (function() {
          var a = document.querySelector('.sidebar a.active');
          return a ? a.getAttribute('href') : '';
        })(), '#cat-general');
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
        // 前五项必须是用户指定的顺序
        var EXPECT5 = 'cat-general,cat-ai,cat-buaa,cat-academic,cat-tech';
        // 新默认顺序 = 页面 DOM 顺序（section 顺序即权威），并验证左右一致
        var domOrder = mainIds().join(',');
        eq('sidebarOrder', sidebarIds().join(','), domOrder);
        eq('firstFive', sidebarIds().slice(0, 5).join(','), EXPECT5);
        eq('mainFirstFive', mainIds().slice(0, 5).join(','), EXPECT5);
        // 两个新类别已加入且排在默认组末尾
        eq('hasDataCat', sidebarIds().indexOf('cat-data') >= 0, true);
        eq('hasDriveCat', sidebarIds().indexOf('cat-drive') >= 0, true);
        eq('migratedStored', JSON.parse(ls('nav_cat_order') || '[]').join(','), domOrder);
        eq('versionStamped', ls('nav_cat_order_ver'), '3');
        var titles = [];
        document.querySelectorAll('#sidebar a[href^="#"] span').forEach(function(s) {
          if (s.textContent !== '收藏网址' && s.textContent !== '⭐') titles.push(s.textContent);
        });
        eq('firstFiveNames', titles.slice(0, 5).join(','), '综合导航,AI大模型,北航网站,学术检索,技术与交流');
        // 排序 UI 已移到编辑器：弹出式设置里只保留入口
        eq('noOrderListInPopup', !document.getElementById('settingsCatOrderList'), true);
      }
      else if (CASE === 'order_three_way_invariant') {
        // 核心不变量：正文 / 侧边栏 / 手机 Tab 三处顺序必须逐项相同，且同类入口数量一致
        var side = sidebarIds();
        var tabIds = [];
        document.querySelectorAll('.mobile-tabs a[href^="#cat-"]').forEach(function(a) {
          var id = a.getAttribute('href').replace('#', '');
          if (id === 'cat-favorites') return;
          tabIds.push(id);
        });
        var main = mainIds();
        eq('mainEqSidebar', main.join(','), side.join(','));
        eq('tabsEqSidebar', tabIds.join(','), side.join(','));
        eq('sameCount', main.length, side.length);
        eq('noDuplicates', side.length, new Set(side).size);
        // 顺序必须是用户指定的前五项
        var names = [];
        document.querySelectorAll('#sidebar a[href^="#cat-"] span').forEach(function(s) {
          if (s.textContent !== '收藏网址' && s.textContent !== '⭐') names.push(s.textContent);
        });
        eq('firstFive', names.slice(0, 5).join(','), '综合导航,AI大模型,北航网站,学术检索,技术与交流');
        // 正文里每个分类标题的顺序同样一致
        var h2 = [];
        document.querySelectorAll('.main-content .category-section h2').forEach(function(t) {
          if (t.textContent !== '收藏网址') h2.push(t.textContent);
        });
        eq('h2FirstFive', h2.slice(0, 5).join(','), '综合导航,AI大模型,北航网站,学术检索,技术与交流');
        // 侧边栏里的 a 必须是 #sidebar 的直接子节点（历史上出现过被塞进标题 div 的情况）
        var direct = 0;
        for (var i = 0; i < document.getElementById('sidebar').children.length; i++) {
          var ch = document.getElementById('sidebar').children[i];
          if (ch.tagName === 'A' && (ch.getAttribute('href') || '').indexOf('#cat-') === 0 &&
              ch.getAttribute('href') !== '#cat-favorites') direct++;
        }
        eq('sidebarDirectChildren', direct, side.length);
        // 切一次分类后三处仍一致（fixed 模式下不应该变化）
        setActive(document.querySelector('#sidebar a[href="#cat-cloud"]'));
        eq('afterClickMainEqSidebar', mainIds().join(','), sidebarIds().join(','));
      }
      else if (CASE === 'order_after_bump_three_way') {
        // recent 模式下 bump 之后，三处也都要跟着变，且保持一致
        setActive(document.querySelector('#sidebar a[href="#cat-cloud"]'));
        var side = sidebarIds();
        eq('bumpedFirst', side[0], 'cat-cloud');
        eq('mainEqSidebar', mainIds().join(','), side.join(','));
        var tabIds = [];
        document.querySelectorAll('.mobile-tabs a[href^="#cat-"]').forEach(function(a) {
          var id = a.getAttribute('href').replace('#', '');
          if (id === 'cat-favorites') return;
          tabIds.push(id);
        });
        eq('tabsEqSidebar', tabIds.join(','), side.join(','));
      }
      else if (CASE === 'ext_module_smoke') {
        // 保留的功能 API 都在
        ['setVpnMode','toggleOnlyActive','scrollToTop','ixApplyCatVisibility'].forEach(function(fn) {
          eq('fn_' + fn, typeof window[fn], 'function');
        });
        // 已按用户要求删除的两个功能不应再存在
        eq('noTopbarClock', !document.getElementById('topbarClock'), true);
        eq('noTodayStrip', !document.getElementById('todayStrip'), true);
        eq('noEngineSelectWrap', !document.getElementById('engineSelectWrap'), true);
        eq('noEngineSelectFn', typeof window.setEngineStyle, 'undefined');
        eq('noEngineSelectClass', document.body.classList.contains('engine-select'), false);
        eq('engineTagsVisible', getComputedStyle(document.querySelector('.search-engines')).display, 'flex');
        // 返回顶部按钮：右下角只剩它一个（意见反馈已移进设置面板）
        eq('backToTopBtn', !!document.getElementById('ixTop'), true);
        var tr = document.getElementById('ixTop').getBoundingClientRect();
        eq('floatingOnlyBackTop', document.querySelectorAll('.ix-actions .ix-btn').length, 1);
        eq('noFloatingFeedback', !document.querySelector('.ix-actions .ix-btn[onclick*="openFeedbackModal"]'), true);
        eq('feedbackInSettings', !!document.getElementById('settingsFeedbackBtn'), true);
        eq('feedbackModalAboveSettings',
           parseInt(getComputedStyle(document.getElementById('feedbackModal')).zIndex, 10) > 200, true);
        // 与右侧工具条不重叠（工具条贴右边缘）
        var rr = document.getElementById('rtEdge').getBoundingClientRect();
        eq('noOverlapToolbar', tr.right <= rr.left, true);
        // 返回顶部按钮：初始隐藏、滚动函数可切换、样式类生效
        eq('topBtnHiddenInitially', document.getElementById('ixTop').classList.contains('show'), false);
        eq('updateBackToTopFn', typeof window.updateBackToTop, 'function');
        window.updateBackToTop();
        eq('topBtnStillHiddenAtTop', document.getElementById('ixTop').classList.contains('show'), false);
        document.getElementById('ixTop').classList.add('show');
        eq('topBtnShowClassWorks', document.getElementById('ixTop').classList.contains('show'), true);
        eq('scrollToTopFn', typeof window.scrollToTop, 'function');
        document.getElementById('ixTop').classList.remove('show');
        eq('topBtnHiddenAgain', document.getElementById('ixTop').classList.contains('show'), false);
        // VPN 三档互斥
        setVpnMode('off');
        eq('offHides', vpnOn, false);
        eq('offChip', document.getElementById('setVpnOff').classList.contains('on'), true);
        eq('alwaysChipOff', document.getElementById('setVpnAlways').classList.contains('on'), false);
        setVpnMode('always');
        eq('alwaysShows', vpnOn, true);
        eq('alwaysChip', document.getElementById('setVpnAlways').classList.contains('on'), true);
        eq('modeHint', (document.getElementById('vpnModeHint').textContent || '').length > 10, true);
        // 仅显示选中分类 + 搜索跨全类
        toggleOnlyActive();
        eq('onlyActiveOn', document.body.classList.contains('only-active'), true);
        eq('onlyOneSection', document.querySelectorAll('.category-section:not(.not-active)').length, 1);
        var si = document.getElementById('searchInput');
        si.value = '网';
        doNavSearch();
        eq('searchClearsOnlyActive', document.body.classList.contains('only-active'), false);
        eq('searchShowsManySections', document.querySelectorAll('.category-section[style*="block"]').length > 1, true);
        si.value = '';
        doNavSearch();
        eq('clearRestoresOnlyActive', document.body.classList.contains('only-active'), true);
        toggleOnlyActive();
        eq('onlyActiveOff', document.body.classList.contains('only-active'), false);
      }
      else if (CASE === 'rt_per_tool_side') {
        // 每个工具一个侧别：默认全部在右侧，左侧为空、无重复
        var rightTabs = document.querySelectorAll('#rtEdge .rt-tab');
        var leftTabs = document.querySelectorAll('#rtEdgeLeft .rt-tab');
        eq('defaultAllRight', rightTabs.length > 0 && leftTabs.length === 0, true);
        eq('rightOnClass', document.body.classList.contains('rt-right-on'), true);
        eq('leftOffClass', document.body.classList.contains('rt-left-on'), false);
        // 把两个内置工具挪到左侧 → 左侧出现、右侧减少、总量不变、无重复
        var sides = {};
        sides['rtb:网页微信助手'] = 'left';
        sides['rtb:待办'] = 'left';
        localStorage.setItem('nav_rt_sides', JSON.stringify(sides));
        renderRtEdge();
        var r2 = document.querySelectorAll('#rtEdge .rt-tab');
        var l2 = document.querySelectorAll('#rtEdgeLeft .rt-tab');
        eq('leftNowHasTabs', l2.length, 2);
        eq('rightShrunk', r2.length, rightTabs.length - 2);
        eq('totalUnchanged', r2.length + l2.length, rightTabs.length);
        eq('leftOnClass', document.body.classList.contains('rt-left-on'), true);
        // 无重复：左右标题集合不重叠，且各自内部不重复
        function titles(sel) {
          var a = [];
          document.querySelectorAll(sel + ' .rt-tab').forEach(function(el) { a.push(el.getAttribute('title')); });
          return a;
        }
        var rt = titles('#rtEdge'), lt = titles('#rtEdgeLeft');
        var dupAcross = rt.filter(function(t) { return lt.indexOf(t) >= 0; });
        eq('noOverlapAcrossSides', dupAcross.join(','), '');
        eq('noDupRight', rt.length, new Set(rt).size);
        eq('noDupLeft', lt.length, new Set(lt).size);
        eq('wechatOnLeft', lt.indexOf('网页微信助手') >= 0, true);
        eq('floatingWindowFollows', lt.indexOf('待办') >= 0, true);
        // 老键兼容：只写了旧名 rtb:微信传输 也要能读到（改名不丢用户设置）
        localStorage.setItem('nav_rt_sides', JSON.stringify({ 'rtb:微信传输': 'left' }));
        renderRtEdge();
        eq('legacyRenameCompat', titles('#rtEdgeLeft').indexOf('网页微信助手') >= 0, true);
        localStorage.setItem('nav_rt_sides', JSON.stringify(sides));
        renderRtEdge();
        // 回归：左侧工具条不得横向铺满（曾因 left+right 同时生效变成隐形全宽遮罩，
        // 导致搜索框无法输入、导航展开按钮点不动）
        var lb = document.getElementById('rtEdgeLeft').getBoundingClientRect();
        eq('leftEdgeNarrow', lb.width > 0 && lb.width <= 60, true);
        eq('leftEdgeNotFullWidth', lb.width < window.innerWidth / 2, true);
        // 把「所有」工具都挪到左侧（复现用户场景：左条足够高，会盖住搜索框/展开按钮所在的横带）
        var allSides = {};
        rtCollectTabs().forEach(function(t) { allSides[t.key] = 'left'; });
        localStorage.setItem('nav_rt_sides', JSON.stringify(allSides));
        renderRtEdge();
        var lbAll = document.getElementById('rtEdgeLeft').getBoundingClientRect();
        eq('leftEdgeStillNarrowWithAllTools', lbAll.width > 0 && lbAll.width <= 60, true);
        eq('allToolsOnLeft', document.querySelectorAll('#rtEdgeLeft .rt-tab').length, rtCollectTabs().length);
        // 左条贴左边、tab 保持 38px（几何证据，替代人工截图）
        var firstLeftTab = document.querySelector('#rtEdgeLeft .rt-tab');
        var flr = firstLeftTab.getBoundingClientRect();
        eq('leftEdgeAtLeftEdge', Math.round(lbAll.left), 0);
        eq('leftTabWidth', Math.round(flr.width), 38);
        eq('leftTabAtLeftEdge', Math.round(flr.left), 0);
        var lbl = firstLeftTab.querySelector('.rt-label');
        eq('leftLabelPointsRight', getComputedStyle(lbl).left, '44px');
        function topElementAt(el) {
          var r = el.getBoundingClientRect();
          return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        }
        var si = document.getElementById('searchInput');
        var hitInput = topElementAt(si);
        eq('searchInputClickable', hitInput === si || (hitInput && si.contains(hitInput)), true);
        var toggleBtn = document.getElementById('heroToggleBtn');
        var hitToggle = topElementAt(toggleBtn);
        eq('navToggleClickable', hitToggle === toggleBtn || (hitToggle && toggleBtn.contains(hitToggle)), true);
        // 工具条区域之外才算遮罩：左条自身宽度内点得到 tab，但页面中部内容不被挡
        var anyCard = document.querySelector('#cat-general .nav-card');
        var hitCard = topElementAt(anyCard);
        eq('cardClickable', hitCard === anyCard || (hitCard && anyCard.contains(hitCard)), true);
        // 真的还能在框里打字：聚焦后置值并输入事件
        si.focus();
        si.value = 'kerry';
        si.dispatchEvent(new Event('input'));
        eq('searchInputTypeable', si.value, 'kerry');
        si.value = '';
        si.dispatchEvent(new Event('input'));
      }
      else if (CASE === 'sort_mode_not_in_popup') {
        openSettings();
        var panelText = document.querySelector('.settings-panel').textContent;
        // 弹出式设置里不应再有排序模式的两个 chip 与调序列表
        eq('noRecentChip', !document.getElementById('setCatSortRecent'), true);
        eq('noFixedChip', !document.getElementById('setCatSortFixed'), true);
        eq('noOrderList', !document.getElementById('settingsCatOrderList'), true);
        eq('hasEditorLink', panelText.indexOf('分类排序') >= 0 && panelText.indexOf('配置编辑器') >= 0, true);
      }
      else if (CASE === 'vpn_badge_and_hide') {
        var sec = document.getElementById('cat-general');
        // 频次重排后位置会变：按名字定位，不按下标
        function cardOf(name) {
          var hit = null;
          sec.querySelectorAll('.nav-card h3').forEach(function(h) {
            if (h.textContent.trim() === name) hit = h.closest('.nav-card');
          });
          return hit;
        }
        var hiddenCard = cardOf('谷歌搜索');   // override: hidden=true
        var vpnCard = cardOf('谷歌香港');      // override: vpn=true
        // 覆盖优先级：编辑器取消 VPN 必须能覆盖默认 data-vpn（ChatGPT 默认标 VPN）
        var aiSec = document.getElementById('cat-ai');
        var unVpnCard = (function() {
          var hit = null;
          aiSec.querySelectorAll('.nav-card h3').forEach(function(h) {
            if (h.textContent.trim() === 'ChatGPT') hit = h.closest('.nav-card');
          });
          return hit;
        })();
        eq('overrideVpnNoBadge', !!unVpnCard.querySelector('.vpn-badge'), false);
        // data-vpn 属性保留（HTML 默认值），实际显隐由 override 决定——见 overrideVpnNoBadge
        eq('firstHidden', hiddenCard.getAttribute('data-hidden'), '1');
        eq('firstDisplayNone', hiddenCard.style.display, 'none');
        eq('secondVpnBadge', !!vpnCard.querySelector('.vpn-badge'), true);
        eq('badgeText', vpnCard.querySelector('.vpn-badge').textContent, 'VPN');
        eq('secondNotHidden', vpnCard.getAttribute('data-hidden'), '0');
        setVpnMode('off');
        eq('vpnHiddenInOff', vpnCard.getAttribute('data-hidden'), '1');
        eq('badgeRemovedWhenHidden', !!vpnCard.querySelector('.vpn-badge'), false);
        setVpnMode('always');
        eq('vpnBackInAlways', vpnCard.getAttribute('data-hidden'), '0');
        // 11 张里隐藏 1 张 → 计数 10
        eq('countUpdated', sec.querySelector('.count').textContent, '10个站点');
      }
      else if (CASE === 'custom_cat_first') {
        var side = sidebarIds();
        eq('firstIsCustom', side[0].indexOf('custom-') === 0, true);
        eq('customCount', side.filter(function(id) { return id.indexOf('custom-') === 0; }).length, 1);
        eq('mainEqSidebar', mainIds().join(','), side.join(','));
        var names = [];
        document.querySelectorAll('#sidebar a').forEach(function(s) {
          var h = s.getAttribute('href') || '';
          if (h.indexOf('#') === 0 && h.length > 1) names.push((s.textContent || '').trim());
        });
        eq('customNameShown', names[0], '我的科研工具');
        // 固定顺序下点击默认分类：自定义类别仍在最前，且整体顺序不变
        var beforeClick = sidebarIds().join(',');
        setActive(document.querySelector('#sidebar a[href="#cat-map"]'));
        var after = sidebarIds();
        eq('customStillFirst', after[0], 'custom-test1');
        eq('orderUnchangedInFixed', after.join(','), beforeClick);
        eq('stillMainEqSidebar', mainIds().join(','), after.join(','));
      }
      else if (CASE === 'search_autosize') {
        var ta = document.getElementById('searchInput');
        eq('isTextarea', ta.tagName, 'TEXTAREA');
        var singleH = ta.getBoundingClientRect().height;
        // 三行文本 → 高度明显增长
        ta.value = '第一行文字\n第二行文字\n第三行文字';
        ta.dispatchEvent(new Event('input'));
        var threeH = ta.getBoundingClientRect().height;
        eq('growsOnMultiline', threeH > singleH + 10, true);
        // 15 行 → 封顶 10 行（高度不再增长），出现内部滚动
        var long15 = Array.from({length: 15}, function(_, i) { return 'line' + i; }).join('\n');
        ta.value = long15;
        ta.dispatchEvent(new Event('input'));
        var maxH = ta.getBoundingClientRect().height;
        eq('cappedAt10Lines', maxH <= threeH * 3.6 && maxH >= threeH * 2.5, true);
        eq('internalScroll', ta.style.overflowY, 'auto');
        // 单行/未超行时不出现滚动条（用户反馈"单行显示上下滚动条很丑"）
        ta.value = 'hello';
        ta.dispatchEvent(new Event('input'));
        eq('singleLineNoScrollbar', ta.style.overflowY, 'hidden');
        eq('noHorizontalScrollbar', ta.style.overflowX, 'hidden');
        ta.value = long15;
        ta.dispatchEvent(new Event('input'));
        eq('backToScrollWhenOverflow', ta.style.overflowY, 'auto');
        // Shift+Enter 换行、Enter 提交后自动清空输入框
        ta.value = 'hello';
        var opened = [];
        window.open = function(u) { opened.push(u); return null; };
        document.getElementById('stickyInput').value = 'hello';   // 悬浮搜索条也应一起被清空
        ta.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', shiftKey: true, bubbles: true, cancelable: true}));
        // 合成事件不会真的插入换行，改为断言「Shift+Enter 不提交、也不 preventDefault」（原生换行才得以生效）
        var evShift = new KeyboardEvent('keydown', {key: 'Enter', shiftKey: true, bubbles: true, cancelable: true});
        ta.dispatchEvent(evShift);
        eq('shiftEnterNotPrevented', evShift.defaultPrevented, false);
        eq('shiftEnterKeepsText', ta.value.indexOf('hello') >= 0, true);
        ta.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));
        eq('enterSubmits', opened.length, 1);
        eq('enterClearsInput', ta.value, '');                     // 回车提交 → 输入框立即清空
        eq('enterClearsSticky', document.getElementById('stickyInput').value, '');
        // 点「搜索」按钮同样清空
        ta.value = 'again';
        ta.dispatchEvent(new Event('input'));
        document.querySelector('.search-box button[onclick="doSearch()"]').click();
        eq('buttonSubmits', opened.length, 2);
        eq('buttonClearsInput', ta.value, '');
        // 清空复原单行
        ta.value = '';
        ta.dispatchEvent(new Event('input'));
        eq('resetSingleLine', Math.abs(Math.round(ta.getBoundingClientRect().height) - Math.round(singleH)) <= 2, true);
      }
      else if (CASE === 'fav_only_active_default') {
        // 「仅显示选中分类」+ 有收藏 → 默认打开的就是收藏网址
        eq('onlyActiveOn', document.body.classList.contains('only-active'), true);
        var shown = [];
        document.querySelectorAll('.category-section').forEach(function(sec) {
          if (!sec.classList.contains('not-active')) shown.push(sec.id);
        });
        eq('onlyFavShown', shown.join(','), 'cat-favorites');
        eq('activeIsFav', (function() {
          var a = document.querySelector('.sidebar a.active');
          return a ? a.getAttribute('href') : '';
        })(), '#cat-favorites');
        eq('favCardsVisible', document.querySelectorAll('#cat-favorites .nav-card').length, 2);
        // 点别的分类仍能切换过去
        setActive(document.querySelector('#sidebar a[href="#cat-map"]'));
        var shown2 = [];
        document.querySelectorAll('.category-section').forEach(function(sec) {
          if (!sec.classList.contains('not-active')) shown2.push(sec.id);
        });
        eq('switchWorks', shown2.join(','), 'cat-map');
      }
      else if (CASE === 'fav_freq_order') {
        // 收藏网址按「我的使用频次」降序：github=5、知乎=3（来自旧 nav_clicks 合并）、google=0
        eq('sortedByUsage', favDomOrder().join('|'),
           'https://github.com|https://www.zhihu.com|https://www.google.com');
        // 阻断跳转，避免点击卡片时真实打开新标签
        document.addEventListener('click', function(e) {
          var t = e.target;
          if (t && t.closest && t.closest('a.nav-card')) e.preventDefault();
        }, true);
        var card = document.querySelector('#cat-favorites a.nav-card[href="https://www.google.com"]');
        eq('favCardExists', !!card, true);
        for (var ci = 0; ci < 4; ci++) {
          card.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
        }
        var clk = JSON.parse(ls('nav_fav_clicks') || '{}');
        eq('clickCounted', clk['https://www.google.com'], 4);
        setTimeout(function() {
          // 4 > 3 → 谷歌搜索越过知乎升到第二位（收藏区静默重排）
          eq('reorderedByUsage', favDomOrder().join('|'),
             'https://github.com|https://www.google.com|https://www.zhihu.com');
          var before = JSON.parse(ls('nav_fav_clicks') || '{}')['https://www.google.com'];
          var st = document.querySelector('#cat-favorites a.nav-card[href="https://www.google.com"] .fav-star');
          eq('starExists', !!st, true);
          st.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
          eq('starClickNotCounted', JSON.parse(ls('nav_fav_clicks') || '{}')['https://www.google.com'], before);
          eq('starRemovedFav', (JSON.parse(ls('nav_fav') || '[]')).indexOf('https://www.google.com'), -1);
          eq('countText', document.querySelector('#cat-favorites .count').textContent, '2个站点');
          eq('remainingOrder', favDomOrder().join('|'), 'https://github.com|https://www.zhihu.com');
          flush();
        }, 60);
        return;
      }
      else if (CASE === 'engine_defaults_vpn') {
        // 默认勾选 14 个引擎（必应/谷歌/百度/秘塔/Perplexity/Yandex/搜狗知乎/搜狗微信/Quora/Reddit/谷歌学术/微软学术/译中/译英）
        var EXPECT = 'bing,google,baidu,metaso,perplexity,yandex,sogouzhihu,sogouweixin,quora,reddit,googlescholar,msacademic,trans2zh,trans2en';
        var hiddenMap = JSON.parse(ls('nav_hidden_engines') || '{}');
        var checked = Object.keys(hiddenMap).filter(function(k) { return k !== 'custom' && hiddenMap[k] === false; });
        eq('defaultCheckedSet', checked.join(','), EXPECT);
        eq('metasoUrl', engineUrls.metaso, 'https://metaso.cn/?q=');
        eq('perplexityUrl', engineUrls.perplexity, 'https://www.perplexity.ai/search?q=');
        eq('perplexityAfterMetaso',
           document.querySelector('.search-engines input[value="metaso"]').closest('.engine-option').nextElementSibling
             .querySelector('input').value, 'perplexity');
        // 百度默认勾选、固定排第三（紧跟必应、谷歌）
        eq('baiduIsThird',
           document.querySelectorAll('.search-engines .engine-option input[type="radio"]')[2].value, 'baidu');
        eq('baiduCheckedByDefault', hiddenMap.baidu, false);
        eq('redditUrl', engineUrls.reddit, 'https://www.reddit.com/search/?q=');
        eq('hiddenMapHidesOthers', hiddenMap.sogou, true);
        function engineShown(k) {
          var el = document.querySelector('.search-engines input[value="' + k + '"]').closest('.engine-option');
          return el.style.display !== 'none';
        }
        // 没有科学上网（vpnMode=off）→ 勾选的引擎里，外网那 5 个不显示
        eq('noVpnFlag', vpnOn, false);
        eq('visibleWithoutVpn', getVisibleEngineKeys().join(','),
           'bing,baidu,metaso,yandex,sogouzhihu,sogouweixin,msacademic,trans2zh,trans2en');
        eq('foreignHiddenWithoutVpn', ['google', 'quora', 'reddit', 'googlescholar', 'perplexity'].map(engineShown).join(','),
           'false,false,false,false,false');
        eq('domesticKept', ['bing', 'metaso', 'yandex', 'msacademic', 'trans2zh', 'trans2en'].map(engineShown).join(','),
           'true,true,true,true,true,true');
        eq('baiduAlwaysVisible', engineShown('baidu'), true);
        // 有科学上网（always）→ 14 个全部显示
        setVpnMode('always');
        eq('visibleWithVpn', getVisibleEngineKeys().join(','), EXPECT);
        eq('foreignShownWithVpn', ['google', 'quora', 'reddit', 'googlescholar', 'perplexity'].map(engineShown).join(','),
           'true,true,true,true,true');
        // 切到被隐藏的引擎后，再关掉 VPN → 自动回落到仍可见的引擎
        applyEngine('google');
        saveEnginePref('google');
        setVpnMode('off');
        eq('fallbackToVisible', getVisibleEngineKeys().indexOf(getSelectedEngine()) >= 0, true);
        eq('fallbackIsBing', getSelectedEngine(), 'bing');
        setVpnMode('always');   // 还原，避免影响同进程其它断言
      }
      else if (CASE === 'search_mode_focus') {
        openSettings();
        eq('focusChipOn', document.getElementById('setSearchFocus').classList.contains('on'), true);
        eq('fullChipOff', document.getElementById('setSearchFull').classList.contains('on'), false);
        eq('hintText', (document.getElementById('searchModeHint').textContent || '').length > 15, true);
        closeSettings();
        var ta = document.getElementById('searchInput');
        var beforeHidden = document.querySelectorAll('.nav-card[style*="display: none"]').length;
        eq('startsExpanded', document.body.classList.contains('all-hidden'), false);
        // 专注模式输入：不匹配本站、不展开分类，且不擅自改变展开/收起状态
        ta.value = '谷歌';
        ta.dispatchEvent(new Event('input'));
        eq('staysExpandedWhileSearching', document.body.classList.contains('all-hidden'), false);
        eq('noCardFiltering', document.querySelectorAll('.nav-card[style*="display: none"]').length, beforeHidden);
        eq('sectionsUntouched', document.querySelectorAll('.category-section[style*="none"]').length <= 3, true);
        // 收起状态下搜索也不该被自动展开
        toggleAllContent();
        eq('manualCollapseWorks', document.body.classList.contains('all-hidden'), true);
        ta.value = '谷歌搜索';
        ta.dispatchEvent(new Event('input'));
        eq('staysCollapsedWhileSearching', document.body.classList.contains('all-hidden'), true);
        // 再手动展开，继续输入同样保持展开
        toggleAllContent();
        ta.value = '谷歌搜索引';
        ta.dispatchEvent(new Event('input'));
        eq('manualExpandKept', document.body.classList.contains('all-hidden'), false);
        // 清空 → 仍然不筛选、状态不跳变
        ta.value = '';
        ta.dispatchEvent(new Event('input'));
        eq('stateKeptAfterClear', document.body.classList.contains('all-hidden'), false);
        eq('stillNoCardFiltering', document.querySelectorAll('.nav-card[style*="display: none"]').length, beforeHidden);
        // 切到全搜索 → 又恢复即时筛选
        setSearchMode('full');
        eq('modePersisted', ls('nav_search_mode'), 'full');
        eq('fullChipOn', document.getElementById('setSearchFull').classList.contains('on'), true);
        eq('exportHasSearchMode', (buildConfigData().settings || {}).searchMode, 'full');
        ta.value = 'zzz不存在的站点关键字';
        ta.dispatchEvent(new Event('input'));
        eq('fullModeFiltersAgain', document.querySelectorAll('.nav-card[style*="display: none"]').length > 0, true);
        ta.value = '';
        ta.dispatchEvent(new Event('input'));
        setSearchMode('focus');
        eq('focusPersisted', ls('nav_search_mode'), 'focus');
        eq('exportSearchModeFocus', (buildConfigData().settings || {}).searchMode, 'focus');
      }
      else if (CASE === 'vpn_quick_and_adv') {
        // ---- Yandex 换成 yandex.tr ----
        eq('yandexEngineUrl', engineUrls.yandex, 'https://yandex.tr/search/?text=');
        eq('yandexCardUrl', document.querySelector('#cat-general a.nav-card[href="https://yandex.tr"]') !== null, true);
        // ---- 需 VPN 快捷开关在 hero 右上角（与主题切换并排，不压搜索框） ----
        var row = document.getElementById('vpnQuickRow');
        var showBtn = document.getElementById('vpnQuickShow');
        var hideBtn = document.getElementById('vpnQuickHide');
        eq('quickRowExists', !!row, true);
        eq('quickRowVisible', row.getBoundingClientRect().height > 0, true);
        var sr = document.getElementById('searchInput').getBoundingClientRect();
        var rr = row.getBoundingClientRect();
        var heroR = document.querySelector('.hero').getBoundingClientRect();
        var themeR = document.querySelector('.theme-toggle').getBoundingClientRect();
        eq('quickAboveSearchBox', rr.bottom <= sr.top + 1, true);
        eq('quickInTopRight', rr.right <= themeR.left + 1 && rr.right > heroR.left + heroR.width * 0.6, true);
        eq('quickSameRowAsTheme', Math.abs((rr.top + rr.height / 2) - (themeR.top + themeR.height / 2)) <= 6, true);
        eq('quickRowNotInHeroContent', row.closest('.hero-content'), null);
        eq('quickShowOnByDefault', showBtn.classList.contains('on'), true);
        hideBtn.click();
        eq('hideSetsOff', vpnMode, 'off');
        eq('hideFlag', vpnOn, false);
        eq('hideChipOn', hideBtn.classList.contains('on'), true);
        eq('showChipOff', showBtn.classList.contains('on'), false);
        eq('enginesShrinkNow', getVisibleEngineKeys().indexOf('google') < 0, true);
        eq('domesticEngineKept', getVisibleEngineKeys().indexOf('bing') >= 0, true);
        eq('vpnCardHiddenNow', document.querySelector('#cat-general a[href="https://www.google.com"]').getAttribute('data-hidden'), '1');
        showBtn.click();
        eq('showSetsAlways', vpnMode, 'always');
        eq('showChipOnAgain', showBtn.classList.contains('on'), true);
        eq('enginesBackNow', getVisibleEngineKeys().indexOf('google') >= 0, true);
        eq('vpnCardShownNow', document.querySelector('#cat-general a[href="https://www.google.com"]').getAttribute('data-hidden'), '0');
        // ---- 高级搜索（百度式浮层；只对 必应/百度/谷歌/Yandex 生效） ----
        var raw = '中文搜索';
        eq('advOffByDefault', buildSearchUrl('bing', raw), engineUrls.bing + encodeURIComponent(raw));
        toggleSearchAdv();
        saveSearchAdvField('all', 'a，b;c、d e');
        saveSearchAdvField('any', 'arxiv，google;谷歌');
        saveSearchAdvField('none', '广告，推广;垃圾');
        var qSep = buildSearchQuery(raw, loadSearchAdv(), 'bing');
        eq('sepAllWords', qSep.indexOf('a b c d e') >= 0, true);
        eq('sepAnyOr', qSep.indexOf('(arxiv OR google OR 谷歌)') >= 0, true);
        eq('sepNone', qSep.indexOf('-广告 -推广 -垃圾') >= 0, true);
        setAdvPos('title');
        var qTitle = buildSearchQuery(raw, loadSearchAdv(), 'bing');
        eq('titlePerWord', qTitle.indexOf('intitle:a intitle:b') >= 0, true);
        eq('titleInOrGroup', qTitle.indexOf('(intitle:arxiv OR intitle:google OR intitle:谷歌)') >= 0, true);
        eq('titleYandexVariant', buildSearchQuery(raw, loadSearchAdv(), 'yandex').indexOf('title:arxiv') >= 0, true);
        setAdvPos('url');
        eq('urlPerWord', buildSearchQuery(raw, loadSearchAdv(), 'bing').indexOf('inurl:a') >= 0, true);
        setAdvPos('any');
        saveSearchAdvField('all', '人工智能 检索');
        saveSearchAdvField('any', 'arxiv 谷歌');
        saveSearchAdvField('none', '广告，推广');
        saveSearchAdvField('site', 'https://zhihu.com/people/x');
        setAdvFiletype('pdf');
        setAdvTime('week');
        setAdvPages('20');
        var lh = JSON.parse(ls('nav_search_adv') || '{}');
        eq('advSaved', lh.on === true && lh.filetype === 'pdf' && lh.time === 'week' && lh.pages === '20', true);
        var b = buildSearchUrl('bing', raw);
        eq('advAllWords', b.indexOf(encodeURIComponent('人工智能 检索')) >= 0, true);
        eq('advAnyOr', b.indexOf(encodeURIComponent('(arxiv OR 谷歌)')) >= 0, true);
        eq('advNoneExcluded', b.indexOf('%20-%E5%B9%BF%E5%91%8A') >= 0, true);
        eq('advSiteTrimmed', b.indexOf('site%3Azhihu.com') >= 0, true);
        eq('advFiletype', b.indexOf('filetype%3Apdf') >= 0, true);
        eq('advBingCount', b.indexOf('&count=20') >= 0, true);
        eq('advBingTime', b.indexOf(encodeURIComponent('filterui:age-lt10080')) >= 0, true);
        eq('advBingTimeNoPlus', b.indexOf('%2Bfilterui') < 0, true);
        var g = buildSearchUrl('google', raw);
        eq('advGoogleNum', g.indexOf('&num=20') >= 0, true);
        eq('advGoogleTime', g.indexOf('&tbs=qdr:w') >= 0, true);
        eq('advGoogleFiletype', g.indexOf('filetype%3Apdf') >= 0, true);
        var bd = buildSearchUrl('baidu', raw);
        eq('advBaiduRn', bd.indexOf('&rn=20') >= 0, true);
        eq('advBaiduTime', bd.indexOf('gpc=') >= 0 && bd.indexOf('stftype') >= 0, true);
        var yd = buildSearchUrl('yandex', raw);
        eq('advYandexMime', yd.indexOf('mime%3Apdf') >= 0, true);
        eq('advYandexNoFiletype', yd.indexOf('filetype%3A') < 0, true);
        eq('advYandexDateOperator', yd.indexOf('date%3A') >= 0, true);
        eq('advYandexNoCount', yd.indexOf('count=') < 0 && yd.indexOf('num=') < 0, true);
        eq('advYandexNoreask', yd.indexOf('&noreask=1') >= 0, true);
        ['sogou', 'metaso', 'trans2zh', 'zhihu'].forEach(function(eng) {
          eq('advGated_' + eng, buildSearchUrl(eng, raw), engineUrls[eng] + encodeURIComponent(raw));
        });
        toggleAdvOption('exact');
        eq('advExactQuoted', buildSearchUrl('bing', raw).indexOf('%22') >= 0, true);
        saveSearchAdvField('from', '2025-01-01');
        saveSearchAdvField('to', '2025-01-31');
        eq('advGoogleCustomRange', buildSearchUrl('google', raw).indexOf('cdr%3A1') >= 0, true);
        eq('advBaiduCustomRange', buildSearchUrl('baidu', raw).indexOf('gpc=') >= 0, true);
        eq('advYandexCustomDate', buildSearchUrl('yandex', raw).indexOf(encodeURIComponent('date:20250101..20250131')) >= 0, true);
        clearAdvDates();
        eq('advDatesCleared', (JSON.parse(ls('nav_search_adv') || '{}')).from, '');
        // 浮层：搜索框旁独立弹出，不在设置窗口；图标明暗跟随启用
        var panel = document.getElementById('advPanel');
        eq('advPanelNotInSettings', !document.getElementById('settingsOverlay').contains(panel), true);
        eq('advPanelClosedByDefault', panel.classList.contains('open'), false);
        openSettings();
        eq('settingsHasNoAdvSection', !document.querySelector('.settings-panel #setAdvToggle'), true);
        closeSettings();
        document.getElementById('advBtn').click();
        eq('advPanelOpens', panel.classList.contains('open'), true);
        var pr = panel.getBoundingClientRect();
        var boxR = document.querySelector('.search-box').getBoundingClientRect();
        eq('advPanelBelowSearchBox', Math.abs(pr.top - (boxR.bottom + 8)) <= 2, true);
        eq('advPanelWithinViewport', pr.left >= 0 && pr.right <= window.innerWidth + 1, true);
        eq('advPanelNotTooWide', pr.width <= 621, true);
        eq('advPanelTwoColumns', getComputedStyle(document.querySelector('.adv-panel .adv-grid')).gridTemplateColumns.split(' ').length >= 2, true);
        var advBtnEl = document.getElementById('advBtn');
        advBtnEl.style.transition = 'none';
        var onStyle = getComputedStyle(advBtnEl);
        eq('advBtnMarkedOn', advBtnEl.classList.contains('on'), true);
        eq('advBtnOpacityOn', Number(onStyle.opacity), 1);
        eq('advBtnSolidWhenOn', onStyle.backgroundImage.indexOf('gradient') >= 0, true);
        eq('uiToggleOn', document.getElementById('setAdvToggle').classList.contains('on'), true);
        eq('uiExactOn', document.getElementById('setAdvExact').classList.contains('on'), true);
        eq('uiSiteValue', document.getElementById('advSiteInput').value, 'https://zhihu.com/people/x');
        eq('uiAllValue', document.getElementById('advAllInput').value, '人工智能 检索');
        var pdfChip = null, weekChip = null, pageChip = null;
        document.querySelectorAll('[data-advft]').forEach(function(el) { if (el.getAttribute('data-advft') === 'pdf') pdfChip = el; });
        document.querySelectorAll('[data-advtime]').forEach(function(el) { if (el.getAttribute('data-advtime') === 'week') weekChip = el; });
        document.querySelectorAll('[data-advpages]').forEach(function(el) { if (el.getAttribute('data-advpages') === '20') pageChip = el; });
        eq('uiPdfOn', !!(pdfChip && pdfChip.classList.contains('on')), true);
        eq('uiWeekOn', !!(weekChip && weekChip.classList.contains('on')), true);
        eq('uiPagesOn', !!(pageChip && pageChip.classList.contains('on')), true);
        document.getElementById('advBtn').click();
        eq('advPanelToggles', panel.classList.contains('open'), false);
        eq('exportAdv', (buildConfigData().settings || {}).searchAdv.on, true);
        // 关掉高级搜索 → 图标变淡
        toggleSearchAdv();
        eq('advOffPlain', buildSearchUrl('google', raw), engineUrls.google + encodeURIComponent(raw));
        eq('advBtnOff', advBtnEl.classList.contains('on'), false);
        var offStyle = getComputedStyle(advBtnEl);
        eq('advBtnDimWhenOff', Number(offStyle.opacity) < 0.7, true);
        eq('advBtnNoFillWhenOff', offStyle.backgroundImage.indexOf('gradient') < 0, true);
        // ---- 常用站点在内容区顶部 ----
        var fs = document.getElementById('frequentSection');
        eq('freqInMainContent', !!fs.closest('.main-content'), true);
        eq('freqNotInHero', fs.closest('.hero'), null);
        eq('freqBeforeCategories', !!(fs.nextElementSibling && fs.nextElementSibling.classList.contains('category-section')), true);
      }
      else if (CASE === 'unit_conv_common') {
        function labels(cat) { return convData[cat].map(function(u) { return u.label; }).join('|'); }
        eq('hasMu', labels('area').indexOf('亩') >= 0, true);
        eq('hasHectare', labels('area').indexOf('公顷') >= 0, true);
        eq('hasLiter', labels('volume').indexOf('升') >= 0, true);
        eq('hasDou', labels('volume').indexOf('斗') >= 0, true);
        eq('hasHp', labels('power').indexOf('马力') >= 0, true);
        eq('hasJin', labels('mass').indexOf('斤') >= 0, true);
        eq('hasLi', labels('length').indexOf('里') >= 0, true);
        eq('hasChi', labels('length').indexOf('尺') >= 0, true);
        function factorOf(cat, kw) {
          var u = convData[cat].filter(function(x) { return x.label.indexOf(kw) >= 0; })[0];
          return u ? u.factor : null;
        }
        eq('muFactor', Math.round(factorOf('area', '亩') * 10000) / 10000, 666.6667);
        eq('jinFactor', factorOf('mass', '斤'), 0.5);
        eq('liFactor', factorOf('length', '里'), 500);
        eq('douFactor', factorOf('volume', '斗'), 10);
        eq('hpFactor', Math.round(factorOf('power', '机械马力')), 746);
        eq('psFactor', Math.round(factorOf('power', '公制马力')), 735);
        openConvWindow();
        convSwitchCat('area');
        convCat = 'area';
        convInitUnits();
        var muIdx = convData.area.map(function(u) { return u.label; }).indexOf('亩');
        document.getElementById('convUnit').value = String(muIdx);
        document.getElementById('convInput').value = '1';
        convCalc();
        // 结果里 m² 那一行应是 666.67 左右
        var muRow = null;
        document.querySelectorAll('#convResults .conv-result-item').forEach(function(it) {
          var lb = it.querySelector('.conv-result-label');
          if (lb && lb.textContent.indexOf('平方米') >= 0) muRow = it.querySelector('.conv-result-value');
        });
        var muVal = muRow ? parseFloat(String(muRow.textContent).replace(/[^\d.]/g, '')) : NaN;
        eq('oneMuIs666m2', Math.abs(muVal - 666.6667) < 0.01, true);
        closeConvWindow();
      }
      else if (CASE === 'earth_wallpaper') {
        eq('chipExists', !!document.getElementById('setWpEarth'), true);
        eq('typeFromStorage', wallpaperType, 'earth');
        var day = earthDay();
        // 「一定要最新」：首选今天，而不是昨天
        eq('dayIsToday', day, (function() {
          var d = new Date();
          var m = d.getUTCMonth() + 1, dd = d.getUTCDate();
          return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dd < 10 ? '0' : '') + dd;
        })());
        eq('candidatesStartWithToday',
           earthCandidates()[0].day === day && earthCandidates().length === 9, true);
        eq('candidatesCoverThreeDays',
           earthCandidates().map(function(c) { return c.day; }).filter(function(v, i, a) { return a.indexOf(v) === i; }).length, 3);
        eq('layersOrderHasModisTerra', EARTH_LAYERS[0].indexOf('MODIS_Terra') === 0, true);
        eq('layersIncludeSnpp', EARTH_LAYERS.join(',').indexOf('VIIRS_SNPP_CorrectedReflectance_TrueColor') >= 0, true);
        var u = earthUrlFor(day, undefined, EARTH_LAYERS[0]);
        eq('urlHost', u.indexOf('https://gibs.earthdata.nasa.gov/') === 0, true);
        eq('urlLayer', u.indexOf('MODIS_Terra_CorrectedReflectance_TrueColor') >= 0, true);
        eq('subsolarAtNoonUtc', Math.round(earthSubsolarLon(new Date('2026-10-17T12:00:00Z'))), 0);
        eq('subsolarAt06Utc', Math.round(earthSubsolarLon(new Date('2026-10-17T06:00:00Z'))), 90);
        eq('bboxNoonUtc', earthBboxNow(new Date('2026-10-17T12:00:00Z')), '-60,-75,70,75');
        eq('bboxClampWest', earthBboxNow(new Date('2026-10-17T00:00:00Z')), '-60,30,70,180');
        eq('bboxClampEast', earthBboxNow(new Date('2026-10-17T23:00:00Z')), '-60,-180,70,-30');
        var bb = (u.match(/BBOX=([\d.,-]+)/) || [])[1].split(',').map(Number);
        eq('bboxLatMin', bb[0], -60);
        eq('bboxLatMax', bb[2], 70);
        eq('bboxLonSpan', Math.round(bb[3] - bb[1]), 150);
        eq('bboxSpanAbove120', (bb[3] - bb[1]) >= 120, true);
        var nowLon = earthSubsolarLon();
        eq('bboxCentredOnNoon', Math.abs(((bb[1] + bb[3]) / 2) - nowLon) < 0.01 || bb[1] === -180 || bb[3] === 180, true);
        eq('urlSize', u.indexOf('WIDTH=1200&HEIGHT=1040') >= 0, true);
        eq('urlDate', u.indexOf('TIME=' + day) >= 0, true);
        eq('bucketFn', earthBucket(new Date('2026-10-17T13:59:00Z')), 13);
        eq('bucketSameHour', earthBucket(new Date('2026-10-17T13:01:00Z')) === earthBucket(new Date('2026-10-17T13:58:00Z')), true);
        // 空白图判定函数存在（GIBS 未出炉的日期会返回整张纯黑）
        eq('usableCheckerFn', typeof earthImageUsable, 'function');
        // 主源已换成气象局 FY-4B 中国区域真彩云图（15 分钟一帧）
        eq('fy4XmlHost', FY4_XML.indexOf('img.nsmc.org.cn/CLOUDIMAGE/FY4B/') > 0, true);
        var fy4Items = fy4Parse('<imagelist><image time="2026-10-17 09:30 (UTC)" url="//img.nsmc.org.cn/a/FY4B_china_20261017093000.JPG"/><image time="2026-10-17 09:30 (UTC)" url="//img.nsmc.org.cn/a/FY4B_china_20261017093000.JPG-thumb.JPG"/></imagelist>');
        eq('fy4ParseSkipsThumb', fy4Items.length, 1);
        eq('fy4ParseTime', fy4Items[0].time, '2026-10-17 09:30 (UTC)');
        eq('fy4AbsUrlFromProtocolRelative', fy4Items[0].url,
           'https://img.nsmc.org.cn/a/FY4B_china_20261017093000.JPG');
        eq('fy4ThumbUrl', fy4ThumbOf('https://x/FY4B_china_20261017093000.JPG'),
           'https://x/FY4B_china_20261017093000.JPG-thumb.JPG');
        eq('fy4SlotUrl', fy4UrlForSlot(new Date(Date.UTC(2026, 9, 17, 9, 31, 0))),
           'https://img.nsmc.org.cn/CLOUDIMAGE/FY4B/AGRI/GCLR/SEC/china/2026/20261017/FY4B_china_20261017093000.JPG');
        eq('fy4SlotFloorsTo15min', fy4UrlForSlot(new Date(Date.UTC(2026, 9, 17, 9, 14, 0))).indexOf('20261017090000') > 0, true);
        openSettings();
        eq('chipOn', document.getElementById('setWpEarth').classList.contains('on'), true);
        eq('hintMentionsChina', (document.getElementById('wpStatusHint').textContent || '').indexOf('中国') >= 0, true);
        closeSettings();
        var fake = { ver: EARTH_VER, day: day, bucket: earthBucket(),
                     dataUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDs0NDT/wAALCAABAAEBAREA/8QAFAABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AmAA=',
                     ts: Date.now() };
        idbSet('nav_earth_cache', fake).then(function() {
          earthWallpaperUrl = '';
          return idbGet('nav_earth_cache');
        }).then(function(v) {
          eq('cacheRoundTrip', !!(v && v.day === day && v.ver === EARTH_VER && String(v.dataUrl).indexOf('data:image') === 0), true);
          earthWallpaperUrl = v.dataUrl;
          applyHeroBg();
          var bg = document.querySelector('.hero-bg');
          eq('heroApplied', (bg.style.backgroundImage || '').indexOf('data:image') >= 0, true);
          eq('heroPosition', bg.style.backgroundPosition, 'center center');
          // 完整显示：底层模糊铺满 + 上层 contain 完整图
          // 铺满整个首屏：cover 按比例放大、不留白也不变形；折叠时首屏满屏，展开后回到常高
          eq('noBlurLayer', getComputedStyle(bg).filter, 'none');
          eq('heroSizeCover', getComputedStyle(bg).backgroundSize, 'cover');
          eq('noHeroBgFull', !document.getElementById('heroBgFull'), true);
          var heroEl = document.querySelector('.hero');
          var expandedH = heroEl.getBoundingClientRect().height;
          eq('heroNotFullScreenWhenExpanded', expandedH < window.innerHeight - 2, true);
          document.body.classList.add('all-hidden');
          var collapsedH = heroEl.getBoundingClientRect().height;
          document.body.classList.remove('all-hidden');
          eq('heroFullScreenWhenCollapsed', collapsedH >= window.innerHeight - 2, true);
          // 展开导航按钮必须真的能把导航展开（autofold 默认下点一下立刻可见）
          eq('toggleBtnExists', !!document.getElementById('heroToggleBtn'), true);
          setNavFold('autofold');            // 折叠（allHidden=true，与 body 类同步）
          eq('collapsedBeforeToggle', document.body.classList.contains('all-hidden'), true);
          toggleAllContent();                // 真点一下「展开导航」
          eq('toggleExpands', document.body.classList.contains('all-hidden'), false);
          eq('wrapperVisible', getComputedStyle(document.querySelector('.page-wrapper')).display, 'flex');
          eq('heroBackToNormal', document.querySelector('.hero').getBoundingClientRect().height < window.innerHeight - 2, true);
          // 地球实况要"看得清"：背景几乎不透明（浅色 0.98 / 深色 0.94）
          eq('heroOpacityLight', bg.style.opacity, '0.98');
          setWallpaper('default');
          eq('switchToDefault', wallpaperType, 'default');
          setWallpaper('earth');
          eq('switchBackEarth', wallpaperType, 'earth');
          eq('persisted', ls('nav_wallpaper'), 'earth');
          flush();
        }).catch(function(e) {
          out.push('[FAIL] earthCache: ' + e.message);
          flush();
        });
        return;
      }
      else if (CASE === 'hero_clock_credit_todo') {
        // 右上角时钟：日期 / 周几 / 时间都在且格式正确
        var d = new Date();
        var pad = function(n) { return (n < 10 ? '0' : '') + n; };
        eq('clockDateShown', document.getElementById('hcDate').textContent,
           pad(d.getMonth() + 1) + '月' + pad(d.getDate()) + '日');
        eq('clockWeekShown', document.getElementById('hcWeek').textContent.indexOf('周') === 0, true);
        eq('clockTimeShown', /^\d{2}:\d{2}:\d{2}$/.test(document.getElementById('hcTime').textContent), true);
        // 两行布局：第一行「需 VPN + 主题」，第二行「时钟 + 天气」（用户指定）
        var cR = document.getElementById('heroClock').getBoundingClientRect();
        var tR = document.querySelector('.theme-toggle').getBoundingClientRect();
        var heroR = document.querySelector('.hero').getBoundingClientRect();
        var qR = document.getElementById('vpnQuickRow').getBoundingClientRect();
        var wR = document.getElementById('heroWeatherBtn').getBoundingClientRect();
        eq('clockInTopRight', cR.right > heroR.left + heroR.width * 0.5 && cR.top < heroR.top + 140, true);
        eq('twoCornerRows', document.querySelectorAll('#heroCorner .hc-row').length, 2);
        eq('clockBelowVpn', cR.top >= qR.bottom - 1, true);
        eq('clockRowNoOverlap', cR.right <= wR.left + 1 && cR.top >= qR.bottom - 1, true);
        eq('weatherUnderTheme', Math.abs(wR.right - tR.right) < 2 && wR.top >= tR.bottom - 1, true);
        eq('cornerFlexContainer', !!document.getElementById('heroCorner') &&
           getComputedStyle(document.getElementById('heroCorner')).display === 'flex', true);
        eq('cornerColumnDirection',
           getComputedStyle(document.getElementById('heroCorner')).flexDirection, 'column');
        // 不越出 hero 右边界、不压左上角齿轮
        var cornerR = document.getElementById('heroCorner').getBoundingClientRect();
        eq('cornerFitsHero', cornerR.left >= heroR.left && cornerR.right <= heroR.right + 1, true);
        eq('cornerClearOfSettings',
           cornerR.left >= document.querySelector('.settings-btn').getBoundingClientRect().right, true);
        eq('clockHeightSane', cR.height >= 20 && cR.height <= 44, true);
        eq('weatherBtnNotSmall', wR.width >= 36 && wR.height >= 36, true);
        // 图源说明（浅淡小字）存在且可点击跳转 zoom.earth
        var credit = document.getElementById('earthCredit');
        eq('creditExists', !!credit, true);
        eq('creditHasNasaOrZoom', /NASA|Zoom/.test(credit.textContent), true);
        eq('creditClickable', credit.getAttribute('onclick') === 'openEarthSource()', true);
        // 时钟字号必须够大（用户要求"再大一点"）：>= 13px（0.86rem @16px ≈ 13.76px）
        eq('clockFontBigEnough',
           parseFloat(getComputedStyle(document.getElementById('heroClock')).fontSize) >= 13, true);
        // 点图源一律打开 zoom.earth/maps/satellite（用户指定 URL）
        var openedUrl = null;
        var origOpen = window.open;
        window.open = function(u) { openedUrl = u; };
        openEarthSource();
        window.open = origOpen;
        eq('creditOpensZoomEarthSite', openedUrl, 'https://zoom.earth/maps/satellite/');
        // 待办：未完成时工具条有红色数字徽标 + 顶部提醒条
        eq('todoBadgeCount', (function() {
          var tab = null;
          document.querySelectorAll('.rt-edge .rt-tab').forEach(function(t) {
            if (t.getAttribute('title') && t.getAttribute('title').indexOf('待办') === 0) tab = t;
          });
          var b = tab && tab.querySelector('.rt-badge');
          return b ? b.textContent : 'none';
        })(), '2');
        eq('todoPulseClass', (function() {
          var tab = null;
          document.querySelectorAll('.rt-edge .rt-tab').forEach(function(t) {
            if (t.getAttribute('title') && t.getAttribute('title').indexOf('待办') === 0) tab = t;
          });
          return !!(tab && tab.classList.contains('rt-has-todo'));
        })(), true);
        eq('todoAlertShown', document.getElementById('todoAlert').classList.contains('show'), true);
        // 全部完成 → 徽标和提醒条都消失
        todoItems.forEach(function(t) { t.completed = true; });
        saveTodoItems();
        renderTodoList();
        eq('todoBadgeGoneWhenDone', document.querySelectorAll('.rt-edge .rt-badge').length, 0);
        eq('todoAlertGoneWhenDone', document.getElementById('todoAlert').classList.contains('show'), false);
        // 天气工具：已从右侧工具条移到首屏右上角（主题切换正下方）
        eq('weatherNotInBar', (function() {
          var hit = false;
          document.querySelectorAll('.rt-edge .rt-tab').forEach(function(t) {
            if (t.getAttribute('title') === '天气') hit = true;
          });
          return hit;
        })(), false);
        eq('weatherBtnInHeroCorner', !!document.getElementById('heroWeatherBtn') &&
           !!document.getElementById('heroWeatherBtn').closest('#heroCorner'), true);
        var wbR = document.getElementById('heroWeatherBtn').getBoundingClientRect();
        var tglR = document.querySelector('.theme-toggle').getBoundingClientRect();
        eq('weatherUnderTheme', Math.abs(wbR.right - tglR.right) < 2 && wbR.top >= tglR.bottom - 1, true);
        toggleWeatherWindow();
        eq('weatherWindowOpens', document.getElementById('weatherWindow').classList.contains('visible'), true);
        eq('weatherBtnOnState', document.getElementById('heroWeatherBtn').classList.contains('on'), true);
        eq('weatherMsnMapBtn', !!document.querySelector('.weather-foot button[onclick*="maps"]'), true);
        eq('weatherLocDefault', weatherLoc.name, '北京');
        closeWeatherWindow();
        eq('weatherWindowCloses', document.getElementById('weatherWindow').classList.contains('visible'), false);
        eq('weatherBtnOffState', document.getElementById('heroWeatherBtn').classList.contains('on'), false);
        // 卫星平面图已按用户要求删除：不再有 zoom 壁纸 / iframe / heroLive / live map 相关元素与函数
        eq('noZoomChip', !document.getElementById('setWpZoom'), true);
        eq('noZoomIframe', !document.getElementById('heroEmbedFrame'), true);
        eq('noHeroLive', !document.getElementById('heroLive'), true);
        eq('noLiveMapFns', typeof window.liveMapBbox === 'undefined' && typeof window.syncLiveWallpaper === 'undefined', true);
        eq('noLiveMapClass', document.body.classList.contains('wp-zoom'), false);
        // 地球实况只有一个中国区域源（不再有「实时卫星图」壁纸、也不再有两个取景子模式）
        eq('noFy4Chip', !document.getElementById('setWpFy4'), true);
        eq('noScopeRow', !document.getElementById('earthScopeRow'), true);
        eq('noScopeFns', typeof window.setEarthScope, 'undefined');
        eq('beijingTimeConvert', beijingTimeText('2026-10-17 09:30 (UTC)'), '2026-10-17 17:30（北京时间）');
        eq('beijingStampConvert', beijingTimeOfStamp(Date.UTC(2026, 9, 17, 9, 30)), '2026-10-17 17:30（北京时间）');
        // 中国区域取的就是该产品自己的清单与文件
        eq('regionXmlIsChinaProduct',
           FY4_XML === 'https://img.nsmc.org.cn/CLOUDIMAGE/FY4B/AGRI/GCLR/SEC/xml/FY4B-china-72h.xml', true);
        eq('regionSlotIsChinaPath',
           fy4UrlForSlot(new Date(Date.UTC(2026, 9, 17, 9, 45, 0))).indexOf('/GCLR/SEC/china/') > 0, true);
        eq('regionThumbSuffix', fy4ThumbOf('https://x/FY4B_china_20261017094500.JPG').indexOf('-thumb.JPG') > 0, true);
        // 这些辅助函数少一个都会让 fetchFy4Image 抛错、静默退回 NASA（曾真出过这个 bug）
        ['fy4AbsUrl', 'fy4Parse', 'fy4ThumbOf', 'fy4UrlForSlot', 'fy4LoadList', 'fy4FetchRegion',
         'fy4SlotStamp', 'fy4DayOf', 'fetchFy4Image', 'refreshEarthWallpaper'].forEach(function(fn) {
          eq('fy4fn_' + fn, typeof window[fn], 'function');
        });
        eq('fy4DayOfWorks', fy4DayOf('2026-10-17 09:45 (UTC)'), '2026-10-17');
        eq('fy4DayOfEmpty', fy4DayOf(''), '');
        setWallpaper('earth');
        eq('earthCreditMentionsChina', /中国区域真彩/.test(document.getElementById('earthCredit').textContent), true);
      }
      else if (CASE === 'fold_default_autofold') {
        // 默认折叠模式 = 「刷新后自动折叠」：全新浏览器载入即折叠
        eq('defaultModeAutofold', navFoldMode, 'autofold');
        eq('loadsCollapsed', document.body.classList.contains('all-hidden'), true);
        eq('autoChipOn', document.getElementById('setNavAuto').classList.contains('on'), true);
        eq('showChipOff', document.getElementById('setNavShow').classList.contains('on'), false);
        eq('hideChipOff', document.getElementById('setNavHide').classList.contains('on'), false);
        eq('wrapperHidden', getComputedStyle(document.querySelector('.page-wrapper')).display, 'none');
        // 手动展开后仍保持 autofold 模式（下次刷新会再折叠）
        setNavFold('show');
        eq('manualExpand', document.body.classList.contains('all-hidden'), false);
        eq('modeUnchangedByManualExpand', navFoldMode, 'show');
        setNavFold('autofold');
        eq('modeBackToAuto', ls('nav_fold_mode'), 'autofold');
        eq('collapsedAgain', document.body.classList.contains('all-hidden'), true);
      }
      else if (CASE === 'round_ui_polish') {
        // ① 「刷新后自动折叠」：载入即折叠，但手动展开不改变模式
        eq('autofoldOnLoad', document.body.classList.contains('all-hidden'), true);
        eq('autofoldChipOn', document.getElementById('setNavAuto').classList.contains('on'), true);
        eq('autofoldShowChipOff', document.getElementById('setNavShow').classList.contains('on'), false);
        setNavFold('show');
        eq('manualExpandWorks', document.body.classList.contains('all-hidden'), false);
        eq('modePersistedShow', ls('nav_fold_mode'), 'show');
        setNavFold('autofold');
        eq('backToAutofold', document.body.classList.contains('all-hidden'), true);
        eq('modePersistedAuto', ls('nav_fold_mode'), 'autofold');

        // ② 关注地 = 用户手动设置（不被 IP 定位覆盖）
        eq('userLocKept', weatherLoc.name, '上海');
        eq('locIsUser', weatherLocIsUser(), true);
        eq('geoNotOverridden', Math.abs(weatherLoc.lat - 31.2304) < 0.01, true);

        // ③ 天气窗口要素：能见度 / 过敏 / 穿衣 / 紫外线，全部来自固定 fixture，不依赖网络
        renderWeather({
          ts: Date.now(),
          forecast: {
            current: { weather_code: 61, temperature_2m: 12.4, apparent_temperature: 10.2,
                       relative_humidity_2m: 80, surface_pressure: 1005, visibility: 2800,
                       wind_speed_10m: 9, wind_direction_10m: 315 },
            daily: { temperature_2m_max: [16], temperature_2m_min: [9],
                     sunrise: ['2026-10-17T06:26'], sunset: ['2026-10-17T17:32'],
                     uv_index_max: [3], precipitation_probability_max: [70] }
          },
          air: { current: { us_aqi: 80, pm2_5: 20, grass_pollen: null } }
        });
        var wtext = document.getElementById('weatherBody').textContent;
        eq('hasVisibility', wtext.indexOf('能见度') >= 0 && wtext.indexOf('2.8 km') >= 0, true);
        eq('hasClothing', wtext.indexOf('穿衣建议') >= 0 && /外套|毛衣|短袖|羽绒/.test(wtext), true);
        eq('hasAllergyHiddenWhenNoData', wtext.indexOf('过敏') < 0, true);
        eq('airSectionTitleOnly', wtext.indexOf('空气质量') >= 0 && wtext.indexOf('空气与过敏') < 0, true);
        eq('hasUv', wtext.indexOf('紫外线') >= 0, true);
        eq('hasPrecipProb', wtext.indexOf('70%') >= 0, true);
        // 首屏按钮自动变成该天气的图标（第一份 fixture 是 61 = 小雨 🌦️）
        eq('heroIconFollowsWeather', document.getElementById('heroWeatherBtn').textContent, '🌦️');
        // 有花粉数据时才出现「过敏」这一行（欧洲区）
        renderWeather({
          ts: Date.now(),
          forecast: { current: { weather_code: 0, temperature_2m: 20, apparent_temperature: 20,
                                 relative_humidity_2m: 50, surface_pressure: 1010, visibility: 20000,
                                 wind_speed_10m: 5, wind_direction_10m: 90 },
                      daily: { temperature_2m_max: [24], temperature_2m_min: [15],
                               sunrise: ['2026-10-17T06:20'], sunset: ['2026-10-17T17:40'],
                               uv_index_max: [5], precipitation_probability_max: [10] } },
          air: { current: { us_aqi: 30, pm2_5: 8, grass_pollen: 60, birch_pollen: 3 } }
        });
        var wtext2 = document.getElementById('weatherBody').textContent;
        eq('allergyShownWhenData', wtext2.indexOf('过敏（花粉）') >= 0, true);
        eq('allergySourceListed', wtext2.indexOf('禾本科 60 粒/m³') >= 0, true);
        eq('allergyTitleMerged', wtext2.indexOf('空气与过敏') >= 0, true);
        // 第二份 fixture 是晴天（0）→ 按钮图标同步变成 ☀️
        eq('heroIconUpdates', document.getElementById('heroWeatherBtn').textContent, '☀️');

        // ④ 单位换算辅助函数
        eq('visKm', visText(2800), '2.8 km');
        eq('visBigKm', visText(15000), '15 km');
        eq('visMeters', visText(500), '500 m');
        eq('clothHot', clothingAdvice(30).base.indexOf('短袖') >= 0, true);
        eq('clothColdExtra', clothingAdvice(2, 8, 80, 9).extra.length >= 2, true);
        eq('pollenHigh', pollenInfo({ current: { grass_pollen: 60 } }).level, '高');
        eq('pollenUnknown', pollenInfo({ current: { grass_pollen: null } }).known, false);

        // ⑤ MSN 跳转地址（旧的 /weather/overview 会 404 → 太容易看到源码）
        var urls = [];
        var origOpen = window.open;
        window.open = function(u) { urls.push(u); };
        openMsnWeather('overview');
        openMsnWeather('maps');
        window.open = origOpen;
        eq('msnForecastUrl', urls[0].indexOf('/zh-cn/weather/forecast/in-') >= 0, true);
        eq('msnNoOverview404', urls[0].indexOf('/overview') < 0, true);
        eq('msnMapsUrl', urls[1].indexOf('/zh-cn/weather/maps?loc=') >= 0, true);

        // ⑥ 快捷工具：只有 <600px 才隐藏；搜索框宽度比原来宽但不夸张
        var hiddenRule = '', tinyRule = '';
        for (var si = 0; si < document.styleSheets.length; si++) {
          var rules;
          try { rules = document.styleSheets[si].cssRules; } catch(e) { continue; }
          for (var ri = 0; ri < rules.length; ri++) {
            var r = rules[ri];
            if (r.type !== 4 || !r.conditionText) continue;   // 4 = CSSMediaRule
            if (r.cssText.indexOf('.rt-edge') < 0) continue;
            if (r.conditionText.indexOf('599px') >= 0) hiddenRule = r.cssText;
            if (r.conditionText.indexOf('1023px') >= 0) tinyRule = r.cssText;
          }
        }
        eq('toolbarHidesBelow600', hiddenRule.indexOf('.rt-edge') >= 0 && hiddenRule.indexOf('599px') >= 0, true);
        eq('toolbarNotHiddenAt1023', tinyRule, '');
        var sw = document.querySelector('.search-box').getBoundingClientRect().width;
        eq('searchWiderThanDefault', sw > 700, true);
        eq('searchNotTooWide', sw < 900, true);

        // ⑦ 右上角是「玻璃面板 + 两行」
        var corner = document.getElementById('heroCorner');
        eq('cornerPanelRounded', parseInt(getComputedStyle(corner).borderTopLeftRadius, 10) >= 10, true);
        eq('cornerTwoRows', corner.querySelectorAll('.hc-row').length, 2);
        eq('weatherIconBigger',
           parseFloat(getComputedStyle(document.getElementById('heroWeatherBtn')).fontSize) >
           parseFloat(getComputedStyle(document.querySelector('.theme-toggle')).fontSize), true);
      }
      else if (CASE === 'engine_modifier_switch') {
        // 单独按 Ctrl → 下一个可用引擎；单独按 Alt → 上一个可用引擎（按显示顺序循环）
        function key(type, k, mods) {
          var o = {key: k, bubbles: true, cancelable: true};
          if (mods) Object.keys(mods).forEach(function(m) { o[m] = mods[m]; });
          document.dispatchEvent(new KeyboardEvent(type, o));
        }
        var keys = getVisibleEngineKeys();
        eq('enginesAtLeastTwo', keys.length >= 2, true);
        applyEngine(keys[0]);
        saveEnginePref(keys[0]);
        eq('startAtFirst', getSelectedEngine(), keys[0]);
        // Ctrl 单独按 → 前进 1
        key('keydown', 'Control');
        key('keyup', 'Control');
        eq('ctrlNext', getSelectedEngine(), keys[1]);
        eq('ctrlPersisted', ls('nav_engine'), keys[1]);
        // Alt 单独按 → 后退 1（回到第一个）
        key('keydown', 'Alt');
        key('keyup', 'Alt');
        eq('altPrev', getSelectedEngine(), keys[0]);
        // Alt 在第一个上继续后退 → 回到末尾（循环）
        key('keydown', 'Alt');
        key('keyup', 'Alt');
        eq('altWraps', getSelectedEngine(), keys[keys.length - 1]);
        // 组合键不触发切换：Ctrl+K
        key('keydown', 'Control');
        key('keydown', 'k', {ctrlKey: true});
        key('keyup', 'k', {ctrlKey: true});
        key('keyup', 'Control');
        eq('ctrlKNoSwitch', getSelectedEngine(), keys[keys.length - 1]);
        // 组合键不触发切换：Alt+S（焦点到搜索框）
        key('keydown', 'Alt');
        key('keydown', 's', {altKey: true});
        key('keyup', 's', {altKey: true});
        key('keyup', 'Alt');
        eq('altSNoSwitch', getSelectedEngine(), keys[keys.length - 1]);
        eq('altSFocusesInput', document.activeElement, document.getElementById('searchInput'));
        // 开关失焦时清标记，不会残留误触发
        key('keydown', 'Control');
        window.dispatchEvent(new Event('blur'));
        key('keyup', 'Control');
        eq('blurClearsFlag', getSelectedEngine(), keys[keys.length - 1]);
      }
      else if (CASE === 'wallpaper_idb') {
        // 模拟「已选本地壁纸」的会话，然后验证 保存 → 清内存（模拟重启）→ 从 IDB 恢复 的闭环
        wallpaperType = 'local'; useBingWallpaper = false; applyHeroBg();
        eq('wpTypeLocal', wallpaperType, 'local');
        var tiny = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        saveLocalWallpaper(tiny).then(function() {
          return idbGet('nav_local_wp');
        }).then(function(v) {
          eq('savedToIdb', !!v, true);
          localWallpaperDataUrl = null;                 // 模拟重启后内存清空
          return restoreLocalWallpaperAsync();
        }).then(function() {
          eq('restoredFromIdb', !!localWallpaperDataUrl, true);
          eq('heroBgApplied', (document.querySelector('.hero-bg').style.backgroundImage || '').indexOf('data:image') >= 0, true);
          eq('localStorageMirror', !!ls('nav_local_wp'), true);   // 小图冗余进 localStorage 加速首屏
          flush();
        }).catch(function(e) {
          out.push('[FAIL] idbChain: ' + e.message);
          flush();
        });
        return;                                          // 异步用例，flush 由回调触发
      }
      else if (CASE === 'fav_feature') {
        // 展开状态下默认「打开」收藏网址（有收藏时）
        eq('defaultActiveIsFav', (function() {
          var a = document.querySelector('.sidebar a.active');
          return a ? a.getAttribute('href') : '';
        })(), '#cat-favorites');
        eq('defaultActiveMobileTab', (function() {
          var a = document.querySelector('.mobile-tab.active');
          return a ? a.getAttribute('href') : '';
        })(), '#cat-favorites');
        // 预置收藏：谷歌搜索 + 知乎
        var favSec = document.getElementById('cat-favorites');
        eq('favSectionExists', !!favSec, true);
        eq('favCardCount', favSec.querySelectorAll('.nav-card').length, 2);
        // 置顶：sidebar 与 main 的第一项都是收藏网址（includeFav=true）
        eq('sidebarFavFirst', sidebarIds(true)[0], 'cat-favorites');
        eq('mainFavFirst', mainIds(true)[0], 'cat-favorites');
        eq('mainEqSidebar', mainIds(true).join(','), sidebarIds(true).join(','));
        // 原分类卡片上的星标为点亮态
        var g = document.querySelector('#cat-general .nav-card[href="https://www.google.com"] .fav-star');
        eq('starOnOriginal', !!g && g.classList.contains('on'), true);
        // 收藏夹内的克隆卡也有星标
        var gc = favSec.querySelector('.nav-card[href="https://www.google.com"] .fav-star');
        eq('starOnClone', !!gc && gc.classList.contains('on'), true);
        // 取消收藏（点收藏夹里的星）→ 收藏夹剩 1 张、原卡星标熄灭
        toggleFav(null, 'https://www.google.com');
        eq('afterUnfavCount', document.getElementById('cat-favorites').querySelectorAll('.nav-card').length, 1);
        eq('starOffOriginal', document.querySelector('#cat-general .nav-card[href="https://www.google.com"] .fav-star').classList.contains('on'), false);
        // 再收藏 → 恢复 2 张
        toggleFav(null, 'https://www.google.com');
        eq('afterRefavCount', document.getElementById('cat-favorites').querySelectorAll('.nav-card').length, 2);
        eq('persisted', JSON.parse(ls('nav_fav') || '[]').length, 2);
        // 星标与 VPN 徽章不重叠（徽章在星标左侧）
        var star = favSec.querySelector('.nav-card .fav-star');
        var badge = favSec.querySelector('.nav-card .vpn-badge');
        if (star && badge) {
          var sr = star.getBoundingClientRect(), br = badge.getBoundingClientRect();
          eq('starBadgeNoOverlap', sr.left >= br.right - 1, true);
        } else {
          out.push('[PASS] starBadgeNoOverlap (无 VPN 卡可比对，跳过几何检查)');
        }
        // 设置面板可开关
        openSettings();
        var chips = document.getElementById('settingsCatRow').textContent;
        eq('settingsHasFavChip', chips.indexOf('收藏网址') >= 0, true);
        closeSettings();
      }
      else if (CASE === 'settings_panel_render') {
        openSettings();
        var panel = document.querySelector('.settings-panel');
        eq('panelVisible', document.getElementById('settingsOverlay').classList.contains('visible'), true);
        var vis = function(el) { return !!(el && el.offsetParent !== null); };
        // 「搜索引擎显示」必须列出搜索框下的每一个引擎（曾漏掉 metaso/perplexity/reddit）
        var engRow = document.getElementById('settingsEngineRow');
        var missing = ALL_ENGINE_IDS.filter(function(id) {
          return !engRow.querySelector('.settings-chip[onclick*="' + id + '"]');
        });
        eq('settingsListsAllEngines', missing.join(','), '');
        eq('settingsChipCount', engRow.querySelectorAll('.settings-chip').length, ALL_ENGINE_IDS.length + 1);
        eq('settingsHasMetaso', !!engRow.querySelector('.settings-chip[onclick*="metaso"]'), true);
        eq('settingsHasPerplexity', !!engRow.querySelector('.settings-chip[onclick*="perplexity"]'), true);
        eq('settingsHasReddit', !!engRow.querySelector('.settings-chip[onclick*="reddit"]'), true);
        // 排序 UI 已下线，改为编辑器入口
        eq('noSortChips', !document.getElementById('setCatSortFixed') && !document.getElementById('setCatSortRecent'), true);
        eq('editorEntryVisible', vis(document.querySelector('.settings-panel .settings-action-btn[onclick*="catorder"]')), true);
        // 删除两个功能后仍应保留的设置区块
        ['setVpnAlways', 'setVpnOff', 'setOnlyActiveToggle'].forEach(function(id) {
          eq('visible_' + id, vis(document.getElementById(id)), true);
        });
        // 已删除的设置区块不应存在
        ['setTodayOn', 'setEngineStyleTags', 'setEngineStyleSelect', 'setRtSideLeft'].forEach(function(id) {
          eq('gone_' + id, !document.getElementById(id), true);
        });
        // 弹出式设置居中显示
        var ov = getComputedStyle(document.getElementById('settingsOverlay'));
        eq('overlayCentered', ov.alignItems, 'center');
        eq('overlayColumn', ov.flexDirection, 'column');
        eq('overlayCoversViewport', ov.width, window.innerWidth + 'px');
        var pr = document.querySelector('.settings-panel').getBoundingClientRect();
        eq('panelHorizontallyCentered', Math.abs((pr.left + pr.right) / 2 - window.innerWidth / 2) < 2, true);
        eq('bodyScrollLocked', document.body.classList.contains('modal-open'), true);
        eq('panelWithinViewport', pr.top >= 0 && pr.bottom <= window.innerHeight + 1, true);
        closeSettings();
        eq('bodyScrollRestored', document.body.classList.contains('modal-open'), false);
        openSettings();
        eq('overlayJustify', ov.justifyContent, 'center');
        // 紧凑度：面板高度不要过长（超出视口时内部可滚动）
        var panelH = document.querySelector('.settings-panel').getBoundingClientRect().height;
        eq('panelNotTooTall', panelH <= window.innerHeight * 0.95, true);
        eq('panelHeightInfo', '', '');
        eq('panelScrollable', getComputedStyle(document.querySelector('.settings-panel')).overflowY, 'auto');
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
        // 结构不变量：每张卡片必须是 .card-grid 的直接子元素（防止再出现"卡片游离在 grid 外"的布局塌陷）
        var outside = [];
        document.querySelectorAll('.category-section .nav-card').forEach(function(card) {
          if (!card.parentElement || card.parentElement.className.indexOf('card-grid') < 0) {
            outside.push((card.closest('.category-section') || {}).id + '/' + (card.querySelector('h3') || {}).textContent);
          }
        });
        eq('allCardsInsideGrid', outside.join('|'), '');
        // grid 必须真的在按多列布局（第一行至少 2 张卡片）
        var g = document.querySelector('#cat-ai .card-grid');
        var cs = getComputedStyle(g);
        eq('gridDisplay', cs.display, 'grid');
        var cols = String(cs.gridTemplateColumns).split(' ').filter(function(x) { return x && x !== 'none'; }).length;
        eq('gridColumns', cols >= 2, true);
      }
    } catch (e) {
      out.push('[FAIL] ' + CASE + '::exception  ==> ' + (e && e.message ? e.message : e) +
               (e && e.stack ? ' || ' + String(e.stack).split('\n').slice(1, 3).join(' <- ') : ''));
    }
    flush();
  }

  // 解析期即发起一个「挂起图片」请求：虚拟时间会在该请求未完成时暂停，
  // 从而给 IndexedDB 等真实异步回调留出时间（仅壁纸用例需要）。
  var HOLD_URL = __HOLD__;
  function holdVirtualTime() {
    if (!HOLD_URL) return;
    try {
      var im = new Image();
      im.src = HOLD_URL + '?t=' + Math.random();
      window.__holdImg = im;                 // 保持引用，避免被回收
    } catch (e) {}
  }
  if (CASE === 'wallpaper_idb') holdVirtualTime();

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
      if (CASE === 'wallpaper_idb') {
        // 壁纸用例：先把 dataURL 写进 IndexedDB，oncomplete 后再 reload
        var tinyPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        try {
          idbOpen().then(function(db) {
            return new Promise(function(res) {
              var tx = db.transaction('kv', 'readwrite');
              tx.objectStore('kv').put(tinyPng, 'nav_local_wp');
              tx.oncomplete = function() { res(); };
              tx.onerror = function() { res(); };
            });
          }).then(function() { location.reload(); });
        } catch (e) { location.reload(); }
        throw new Error('__PREP_RELOAD__');
      }
      location.reload();
      throw new Error('__PREP_RELOAD__');
    }
  }

  // 壁纸/IDB 用例：前置完成后的这次解析里直接跑断言（此时挂起图片仍在等，虚拟时间被暂停）
  // 其余用例仍等 load 完成后再断言（需要布局几何信息）
  if (CASE === 'wallpaper_idb') runCase();
  else window.addEventListener('load', runCase);
})();
</script>
'''

CASES = [
    ('wp_fresh', [('nav_wallpaper', None), ('nav_wp_default_migrated', None), ('nav_wp_earth_ver', None)]),
    ('wp_static_default', [('nav_wallpaper', 'default'), ('nav_wp_default_migrated', '1'), ('nav_wp_earth_ver', '1')]),
    ('wp_earth_keep_custom', [('nav_wallpaper', 'custom'), ('nav_wp_default_migrated', '1'), ('nav_wp_earth_ver', None)]),
    ('wp_legacy_bing', [('nav_wallpaper', 'bing'), ('nav_wp_default_migrated', None), ('nav_wp_earth_ver', '1')]),
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
    ('order_three_way_invariant', [('nav_wallpaper', 'default'), ('nav_cat_sort_mode', 'fixed'),
                                   ('nav_cat_sort_migrated', '1'),
                                   ('nav_cat_order', json.dumps(['cat-cloud', 'cat-mirror'])),
                                   ('nav_cat_order_ver', '2')]),
    ('order_after_bump_three_way', [('nav_wallpaper', 'default'), ('nav_cat_sort_mode', 'recent'),
                                    ('nav_cat_sort_migrated', '1'),
                                    ('nav_cat_order', None), ('nav_cat_order_ver', '2')]),
    ('fav_feature', [('nav_wallpaper', 'default'),
                     ('nav_fav', json.dumps(['https://www.google.com', 'https://www.zhihu.com'], ensure_ascii=False))]),
    ('search_autosize', [('nav_wallpaper', 'default')]),
    ('search_mode_focus', [('nav_wallpaper', 'default'), ('nav_search_mode', 'focus'),
                           ('nav_all_hidden', '0'), ('nav_only_active', '0')]),
    ('fav_only_active_default', [('nav_wallpaper', 'default'), ('nav_only_active', '1'),
                                 ('nav_fav', json.dumps(['https://www.google.com', 'https://www.zhihu.com'],
                                                        ensure_ascii=False))]),
    ('fav_freq_order', [('nav_wallpaper', 'default'), ('nav_vpn_mode', 'always'), ('nav_vpn_mode_migrated', '1'),
                        ('nav_fav', json.dumps(['https://www.google.com', 'https://www.zhihu.com',
                                                'https://github.com'], ensure_ascii=False)),
                        ('nav_fav_clicks', json.dumps({'https://github.com': 5}, ensure_ascii=False)),
                        ('nav_clicks', json.dumps({'_hrefs': {'知乎': 'https://www.zhihu.com'}, '知乎': 3},
                                                  ensure_ascii=False))]),
    ('settings_panel_render', [('nav_wallpaper', 'default'), ('nav_cat_sort_mode', 'fixed'), ('nav_theme', 'light')]),
    ('ext_module_smoke', [('nav_wallpaper', 'default')]),
    ('fold_default_autofold', [('nav_wallpaper', 'default')]),
    ('round_ui_polish', [('nav_wallpaper', 'default'), ('nav_fold_mode', 'autofold'), ('nav_all_hidden', '0'),
                          ('nav_weather_loc', json.dumps({'name': '上海', 'lat': 31.2304, 'lon': 121.4737}, ensure_ascii=False)),
                          ('nav_weather_loc_src', 'user'), ('nav_weather_geo', None)]),
    ('sort_mode_not_in_popup', [('nav_wallpaper', 'default')]),
    ('rt_per_tool_side', [('nav_wallpaper', 'default'), ('nav_rt_sides', None)]),
    ('vpn_badge_and_hide', [('nav_wallpaper', 'default'),
                            ('nav_site_overrides', json.dumps({
                                'cat-general|谷歌搜索': {'hidden': True},
                                'cat-general|谷歌香港': {'vpn': True},
                                'cat-ai|ChatGPT': {'vpn': False}}, ensure_ascii=False))]),
    ('custom_cat_first', [('nav_wallpaper', 'default'),
                          ('nav_custom_cats', json.dumps([{
                              'id': 'custom-test1', 'name': '我的科研工具', 'icon': '',
                              'sites': [{'name': '测试站点', 'url': 'https://example.com',
                                         'desc': '测试用', 'icon': 'T', 'iconColor': 'blue'}]}],
                              ensure_ascii=False))]),
    ('counts_visible', [('nav_wallpaper', 'default')]),
    ('wallpaper_idb', [('nav_wallpaper', 'local')]),
    ('engine_modifier_switch', [('nav_wallpaper', 'default'), ('nav_engine', 'bing'),
                                ('nav_vpn_mode', 'off'), ('nav_vpn_mode_migrated', '1')]),
    ('engine_defaults_vpn', [('nav_wallpaper', 'default'), ('nav_engine', 'bing'),
                             ('nav_hidden_engines', None), ('nav_engines_ver', None),
                             ('nav_vpn_mode', 'off'), ('nav_vpn_mode_migrated', '1')]),
    ('vpn_quick_and_adv', [('nav_wallpaper', 'default'), ('nav_vpn_mode', 'always'),
                           ('nav_vpn_mode_migrated', '1'), ('nav_vpn_mode_ver', '2'),
                           ('nav_search_adv', None)]),
    ('unit_conv_common', [('nav_wallpaper', 'default')]),
    ('earth_wallpaper', [('nav_wallpaper', 'earth'), ('nav_wp_default_migrated', '1')]),
    ('hero_clock_credit_todo', [('nav_wallpaper', 'default'), ('nav_wp_earth_ver', '1'),
                                ('nav_todo_items', json.dumps([
                                    {'id': 't1', 'text': '写周报', 'completed': False, 'priority': 'high'},
                                    {'id': 't2', 'text': '看论文', 'completed': False, 'priority': 'mid'}
                                ], ensure_ascii=False))]),
]


def run_case(case, prep, tmpdir, hold_url=''):
    with io.open(os.path.join(ROOT, 'index.html'), 'r', encoding='utf-8') as f:
        html = f.read()
    # 导航折叠的默认模式现在是「刷新后自动折叠」→ 页面载入即折叠，会隐藏整块导航。
    # 绝大多数用例要测的是导航本身，所以默认先把折叠模式设成展开；需要测折叠的用例自己覆盖。
    if case != 'fold_default_autofold':
        prep = [('nav_fold_mode', 'show'), ('nav_all_hidden', '0')] + list(prep or [])
    inject = INJECT.replace('__CASE__', json.dumps(case)).replace('__PREP__', json.dumps(prep, ensure_ascii=False))
    inject = inject.replace('__HOLD__', json.dumps(hold_url if case == 'wallpaper_idb' else ''))
    html = html.replace('</body>', inject + '\n</body>')
    page = os.path.join(tmpdir, 'case_%s.html' % case)
    with io.open(page, 'w', encoding='utf-8') as f:
        f.write(html)
    prof = os.path.join(tmpdir, 'prof_%s' % case)
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--no-first-run', '--window-size=1600,1200', '--no-default-browser-check',
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
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if not os.path.exists(CHROME):
        print('chrome not found: %s' % CHROME)
        return 2
    tmpdir = tempfile.mkdtemp(prefix='auroraus_ui_')
    all_lines = []
    hold = HoldServer()
    try:
        for case, prep in CASES:
            lines = run_case(case, prep, tmpdir, hold.hold_url())
            all_lines.extend(lines)
            for l in lines:
                print(l)
    finally:
        hold.stop()
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
