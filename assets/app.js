/* AuroraUs 导航页主脚本（由 index.html 拆分而来，2026-10-25）
   外置原因：主脚本原来在内联 276KB，位于文档末尾 —— 文档从源站 3KB/s 滴流时，
   脚本要等整篇 489KB 到齐才执行，页面要等 30s 才能交互。
   现在用 defer 在 <head> 里并行下载（走边缘缓存快路径），解析完立即执行。
   改动后必须跑：python tools/sync_asset_versions.py（更新 ?v= 版本号） */

    var engineUrls = {
      bing: 'https://cn.bing.com/search?q=',
      baidu: 'https://www.baidu.com/s?wd=',
      google: 'https://www.google.com/search?q=',
      metaso: 'https://metaso.cn/?q=',
      perplexity: 'https://www.perplexity.ai/search?q=',
      sogou: 'https://www.sogou.com/web?query=',
      sogouweixin: 'https://weixin.sogou.com/weixin?type=2&query=',
      sogouzhihu: 'https://zhihu.sogou.com/zhihu?query=',
      yandex: 'https://yandex.tr/search/?text=',
      gscholar2: 'https://sc.panda985.com/scholar?hl=zh-cn&q=',
      xmol: 'https://www.x-mol.com/paper/search/q?option=',
      googlescholar: 'https://scholar.google.com/scholar?hl=zh-CN&q=',
      buaaebsco: 'https://research.ebsco.com/c/hmesay/search/results?q=',
      baiduxueshu: 'https://xueshu.baidu.com/s?wd=',
      douyin: 'https://www.douyin.com/search/',
      xiaohongshu: 'https://www.xiaohongshu.com/search_result?keyword=',
      bilibili: 'https://search.bilibili.com/all?keyword=',
      zhihu: 'https://www.zhihu.com/search?type=content&q=',
      weibo: 'https://s.weibo.com/weibo?q=',
      github: 'https://github.com/search?q=',
      baidumap: 'https://map.baidu.com/search/@0,0,12z?querytype=s&wd=',
      wikihow: 'https://zh.wikihow.com/wikiHowTo?search=',
      scihub: 'https://sci-hub.sh/search?q=',
      kiphub: 'https://www.kiphub.com/search?wd=',
      quora: 'https://www.quora.com/search?q=',
      reddit: 'https://www.reddit.com/search/?q=',
      wikipedia: 'https://zh.wikipedia.org/w/index.php?search=',
      trans2en: 'https://www.bing.com/translator/?from=zh-Hans&to=en&text=',
      trans2zh: 'https://www.bing.com/translator/?from=en&to=zh-Hans&text=',
      msacademic: 'https://cn.bing.com/academic/search?q=',
      custom: 'https://cn.bing.com/search?q='
    };

    // 全部搜索引擎 id（顺序 = 搜索框下的显示顺序；新增引擎时同步这里与下方 .engine-option 标签）
    var ALL_ENGINE_IDS = ['bing','google','baidu','metaso','perplexity','yandex','sogouzhihu','sogouweixin','quora','reddit','googlescholar','msacademic','trans2zh','trans2en','sogou','gscholar2','xmol','buaaebsco','baiduxueshu','douyin','xiaohongshu','bilibili','zhihu','weibo','github','baidumap','wikihow','scihub','kiphub','wikipedia'];
    // 默认「勾选显示」的引擎（其余默认隐藏）；默认值只在此处定义一次
    var DEFAULT_VISIBLE_ENGINES = ['bing','google','baidu','metaso','perplexity','yandex','sogouzhihu','sogouweixin','quora','reddit','googlescholar','msacademic','trans2zh','trans2en'];
    var ENGINES_DEFAULTS_VER = '3';
    function defaultHiddenEngines() {
      var m = {};
      ALL_ENGINE_IDS.forEach(function(k) { m[k] = DEFAULT_VISIBLE_ENGINES.indexOf(k) < 0; });
      m['custom'] = false;
      return m;
    }
    var enginePlaceholders = {
      bing: '输入关键词，必应搜索...',
      baidu: '输入关键词，百度搜索...',
      google: '输入关键词，谷歌搜索...',
      metaso: '输入问题，秘塔AI搜索...',
      perplexity: '输入问题，Perplexity搜索...',
      sogou: '输入关键词，搜狗搜索...',
      sogouweixin: '输入关键词，搜狗微信搜索...',
      sogouzhihu: '输入关键词，搜狗知乎搜索...',
      yandex: '输入关键词，Yandex搜索...',
      gscholar2: '输入关键词，谷歌学术镜像②...',
      xmol: '输入关键词，XMOL学术搜索...',
      googlescholar: '输入关键词，谷歌学术搜索...',
      buaaebsco: '输入关键词，北航外文检索...',
      baiduxueshu: '输入关键词，百度学术搜索...',
      douyin: '输入关键词，抖音搜索...',
      xiaohongshu: '输入关键词，小红书搜索...',
      bilibili: '输入关键词，B站搜索...',
      zhihu: '输入关键词，知乎搜索...',
      weibo: '输入关键词，微博搜索...',
      github: '输入关键词，GitHub搜索...',
      baidumap: '输入关键词，百度地图搜索...',
      wikihow: '输入关键词，WikiHow搜索...',
      scihub: '输入关键词，Sci-Hub搜索...',
      kiphub: '输入关键词，KipHub搜索...',
      quora: '输入关键词，Quora搜索...',
      reddit: '输入关键词，Reddit搜索...',
      wikipedia: '输入关键词，维基百科搜索...',
      trans2en: '输入中文句子，翻译成英文...',
      trans2zh: '输入英文句子，翻译成中文...',
      msacademic: '输入关键词，微软学术搜索...',
      custom: '输入关键词，自定义搜索...'
    };

    function getSelectedEngine() {
      var el = document.querySelector('input[name="engine"]:checked');
      return el ? el.value : 'bing';
    }

    function doSearch() {
      var input = document.getElementById('searchInput');
      var query = input.value.trim();
      if (!query) return;
      window.open(buildSearchUrl(getSelectedEngine(), query), '_blank');
      // 默认保留输入框里的关键词（用户要求）；设置 → 搜索模式 → 可切成「搜索后清空输入」
      if (!searchKeepInput) clearSearchInput();
    }

    // ---------- 高级搜索（参考百度高级搜索；只对 必应/百度/谷歌/ Yandex 生效） ----------
    var ADV_KEY = 'nav_search_adv';
    var ADV_ENGINES = { bing: 1, baidu: 1, google: 1, yandex: 1 };
    var ADV_TIME_PARAMS = {
      day:   { g: 'd', bing: 1440,   bd: 1 },
      week:  { g: 'w', bing: 10080,  bd: 7 },
      month: { g: 'm', bing: 43200,  bd: 30 },
      year:  { g: 'y', bing: 525600, bd: 365 }
    };
    function advDefaults() {
      return { on: false, exact: false, all: '', any: '', none: '', site: '',
               pos: 'any', filetype: '', time: '', from: '', to: '', pages: '' };
    }
    function loadSearchAdv() {
      var d = advDefaults();
      var raw = {};
      try { raw = JSON.parse(ixLS(ADV_KEY) || '{}') || {}; } catch(e) { raw = {}; }
      Object.keys(d).forEach(function(k) { if (raw[k] !== undefined) d[k] = raw[k]; });
      // 一次性迁移：高级搜索默认「不启用」（保留用户填过的条件，只把开关关掉）
      if (ixLS('nav_search_adv_ver') !== '2') {
        d.on = false;
        ixSet('nav_search_adv_ver', '2');
        var save = JSON.parse(JSON.stringify(d));
        ixSet(ADV_KEY, JSON.stringify(save));
      }
      d.on = !!d.on;
      d.exact = !!d.exact;
      ['all', 'any', 'none', 'site', 'filetype', 'time', 'from', 'to', 'pages'].forEach(function(k) {
        d[k] = String(d[k] == null ? '' : d[k]);
      });
      if (['any', 'title', 'url'].indexOf(d.pos) < 0) d.pos = 'any';
      return d;
    }
    function saveSearchAdv(adv) { ixSet(ADV_KEY, JSON.stringify(adv)); }
    function advEngineOk(engine) { return !!ADV_ENGINES[engine]; }
    function advDateStamp(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : ''; }
    // 关键词分隔符：空格 / 英文逗号句号 / 中文逗号句号顿号 都算
    function advSplitWords(s) {
      return String(s || '').split(/[\s,，;；、]+/).filter(function(w) { return !!w; });
    }
    function advPad2(n) { return (n < 10 ? '0' : '') + n; }
    function advDayStamp(d) { return '' + d.getFullYear() + advPad2(d.getMonth() + 1) + advPad2(d.getDate()); }

    // 按各引擎的语法拼关键词：位置前缀逐词套用（Bing/Google 不认 intitle:(A OR B) 这种写法）
    function advKeywordExpr(adv, engine) {
      var pre = '';
      if (adv.pos === 'title') pre = (engine === 'yandex' ? 'title:' : 'intitle:');
      else if (adv.pos === 'url') pre = (engine === 'yandex' ? 'url:' : 'inurl:');
      var out = [];
      var allWords = advSplitWords(adv.all);
      var anyWords = advSplitWords(adv.any);
      if (allWords.length) {
        if (adv.exact) out.push(pre + '"' + allWords.join(' ') + '"');
        else allWords.forEach(function(w) { out.push(pre + w); });
      }
      if (anyWords.length) {
        var ors = anyWords.map(function(w) { return pre + w; });
        out.push(ors.length > 1 ? '(' + ors.join(' OR ') + ')' : ors[0]);
      }
      return out;
    }

    // 各引擎的文件类型语法：Yandex 用 mime:，其余 filetype:
    function advFiletypeToken(adv, engine) {
      if (!adv.filetype) return '';
      return (engine === 'yandex' ? 'mime:' : 'filetype:') + adv.filetype;
    }

    // Yandex 不支持时间 URL 参数，但支持 date:YYYYMMDD..YYYYMMDD 操作符
    function advYandexDateToken(adv) {
      var from = advDateStamp(adv.from), to = advDateStamp(adv.to);
      if (from && to) return 'date:' + from.replace(/-/g, '') + '..' + to.replace(/-/g, '');
      var t = adv.time && ADV_TIME_PARAMS[adv.time];
      if (!t) return '';
      var end = new Date();
      var start = new Date(end.getTime() - t.bd * 86400000);
      return 'date:' + advDayStamp(start) + '..' + advDayStamp(end);
    }

    // 把高级表单拼成完整关键词（生成搜索框里的 q 值）
    function buildSearchQuery(rawQuery, adv, engine) {
      adv = adv || loadSearchAdv();
      engine = engine || 'bing';
      if (!adv.on) return rawQuery;
      var parts = advKeywordExpr(adv, engine);
      advSplitWords(adv.none).forEach(function(w) { parts.push('-' + w); });
      if (adv.site) {
        var host = String(adv.site).replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/\s+/g, '');
        if (host) parts.push('site:' + host);
      }
      var ft = advFiletypeToken(adv, engine);
      if (ft) parts.push(ft);
      if (engine === 'yandex') {
        var yd = advYandexDateToken(adv);
        if (yd) parts.push(yd);
      }
      var q = String(rawQuery || '').trim();
      if (parts.length) q = q ? (q + ' ' + parts.join(' ')) : parts.join(' ');
      return q;
    }

    // 组装最终搜索 URL；高级搜索只作用于 ADV_ENGINES 里的四个引擎
    function buildSearchUrl(engine, rawQuery) {
      var adv = loadSearchAdv();
      var use = adv.on && advEngineOk(engine);
      var q = use ? buildSearchQuery(rawQuery, adv, engine) : rawQuery;
      var encoded = encodeURIComponent(q);
      var prefix = engineUrls[engine];
      var url;
      if (engine === 'custom' || typeof prefix !== 'string') {
        url = String(prefix || engineUrls['custom']).replace(/%s/g, encoded);
      } else if (String(prefix).indexOf('%s') >= 0) {
        url = String(prefix).replace(/%s/g, encoded);
      } else {
        url = prefix + encoded;
      }
      if (use) {
        var pages = parseInt(adv.pages, 10);
        var t = adv.time && ADV_TIME_PARAMS[adv.time];
        var from = advDateStamp(adv.from);
        var to = advDateStamp(adv.to);
        var custom = !!(from && to);
        if (engine === 'google') {
          if (pages > 0) url += '&num=' + pages;
          if (custom) {
            url += '&tbs=' + encodeURIComponent('cdr:1,cd_min:' + from.replace(/-/g, '/') + ',cd_max:' + to.replace(/-/g, '/'));
          } else if (t) {
            url += '&tbs=qdr:' + t.g;
          }
        } else if (engine === 'bing') {
          if (pages > 0) url += '&count=' + pages;
          // 必应的日期过滤：单条过滤器不需要前导 +（原样 + 会被解码成空格，反而不生效）
          if (t && !custom) url += '&qft=' + encodeURIComponent('filterui:age-lt' + t.bing);
        } else if (engine === 'baidu') {
          if (pages > 0) url += '&rn=' + pages;
          if (custom) {
            var s = Math.floor(new Date(from + 'T00:00:00').getTime() / 1000);
            var e2 = Math.floor(new Date(to + 'T23:59:59').getTime() / 1000);
            if (!isNaN(s) && !isNaN(e2)) url += '&gpc=' + encodeURIComponent('stf=' + s + ',' + e2 + '|stftype=2');
          } else if (t) {
            var end = Math.floor(Date.now() / 1000);
            url += '&gpc=' + encodeURIComponent('stf=' + (end - t.bd * 86400) + ',' + end + '|stftype=2');
          }
        } else if (engine === 'yandex') {
          url += '&noreask=1';
        }
      }
      return url;
    }

    function applySearchAdvUi() {
      var adv = loadSearchAdv();
      var tg = document.getElementById('setAdvToggle');
      if (tg) tg.classList.toggle('on', adv.on);
      var ex = document.getElementById('setAdvExact');
      if (ex) ex.classList.toggle('on', adv.exact);
      var map = { advAllInput: 'all', advAnyInput: 'any', advNoneInput: 'none',
                  advSiteInput: 'site', advFromInput: 'from', advToInput: 'to' };
      Object.keys(map).forEach(function(id) {
        var el = document.getElementById(id);
        if (el && el.value !== adv[map[id]]) el.value = adv[map[id]];
      });
      document.querySelectorAll('[data-advpos]').forEach(function(el) {
        el.classList.toggle('on', (el.getAttribute('data-advpos') || 'any') === adv.pos);
      });
      document.querySelectorAll('[data-advft]').forEach(function(el) {
        el.classList.toggle('on', (el.getAttribute('data-advft') || '') === adv.filetype);
      });
      document.querySelectorAll('[data-advtime]').forEach(function(el) {
        el.classList.toggle('on', (el.getAttribute('data-advtime') || '') === adv.time);
      });
      document.querySelectorAll('[data-advpages]').forEach(function(el) {
        el.classList.toggle('on', (el.getAttribute('data-advpages') || '') === adv.pages);
      });
      var btn = document.getElementById('advBtn');
      if (btn) {
        var bits = [];
        if (adv.all) bits.push('全部词');
        if (adv.any) bits.push('任一词');
        if (adv.none) bits.push('排除');
        if (adv.site) bits.push('站内');
        if (adv.filetype) bits.push(adv.filetype.toUpperCase());
        if (adv.time) bits.push('时间');
        if (adv.from && adv.to) bits.push('自定义时段');
        if (adv.pos === 'title') bits.push('标题');
        if (adv.pos === 'url') bits.push('网址');
        if (adv.pages) bits.push(adv.pages + '条/页');
        // 图标颜色只跟随「是否启用」：未启用=淡灰，启用=实心强调色
        btn.classList.toggle('on', !!adv.on);
        btn.title = adv.on
          ? ('高级搜索已启用' + (bits.length ? '：' + bits.join(' / ') : '（还没有设置具体条件）') + '（仅对 必应/百度/谷歌/Yandex 生效）')
          : '高级搜索：含/不含关键词、位置、站内、格式、时间、每页条数';
      }
      var hint = document.getElementById('advHint');
      if (hint) {
        hint.textContent = adv.on
          ? '已启用（仅 必应 / 百度 / 谷歌 / Yandex 生效）：关键词按标准语法拼进查询；时间与每页条数走各引擎参数——谷歌 num/tbs、必应 count/qft、百度 rn/gpc；Yandex 只应用关键词、位置与站内条件。'
          : '启用后按百度高级搜索的思路生效：含/不含关键词、关键词位置、站内、文档格式、时间范围、每页条数。只对 必应 / 百度 / 谷歌 / Yandex 生效，其他引擎不受影响。';
      }
    }

    // 高级搜索浮层：贴在搜索框下方（fixed 定位，不受 hero overflow 裁切）
    function positionAdvPanel() {
      var panel = document.getElementById('advPanel');
      var box = document.querySelector('.search-box');
      if (!panel || !box) return;
      var r = box.getBoundingClientRect();
      var w = Math.min(620, Math.max(300, window.innerWidth - 24));
      panel.style.width = w + 'px';
      var top = Math.round(r.bottom + 8);
      panel.style.maxHeight = Math.max(240, window.innerHeight - top - 16) + 'px';
      panel.style.top = top + 'px';
      var left = Math.round(r.left + (r.width - w) / 2);
      left = Math.max(12, Math.min(left, window.innerWidth - w - 12));
      panel.style.left = left + 'px';
    }
    function toggleAdvPanel(e) {
      if (e && e.stopPropagation) e.stopPropagation();
      var panel = document.getElementById('advPanel');
      if (!panel) return;
      if (panel.classList.contains('open')) { closeAdvPanel(); return; }
      applySearchAdvUi();
      positionAdvPanel();
      panel.classList.add('open');
    }
    function closeAdvPanel() {
      var panel = document.getElementById('advPanel');
      if (panel) panel.classList.remove('open');
    }
    window.toggleAdvPanel = toggleAdvPanel;
    window.closeAdvPanel = closeAdvPanel;
    document.addEventListener('click', function(e) {
      var panel = document.getElementById('advPanel');
      if (!panel || !panel.classList.contains('open')) return;
      var t = e.target;
      if (panel.contains(t)) return;
      if (t && t.closest && t.closest('#advBtn')) return;
      closeAdvPanel();
    });
    window.addEventListener('resize', function() {
      var panel = document.getElementById('advPanel');
      if (panel && panel.classList.contains('open')) positionAdvPanel();
    });
    window.addEventListener('scroll', function() {
      var panel = document.getElementById('advPanel');
      if (panel && panel.classList.contains('open')) closeAdvPanel();
    }, { passive: true });

    function toggleSearchAdv() {
      var adv = loadSearchAdv();
      adv.on = !adv.on;
      saveSearchAdv(adv);
      applySearchAdvUi();
    }
    function toggleAdvOption(k) {
      var adv = loadSearchAdv();
      adv[k] = !adv[k];
      saveSearchAdv(adv);
      applySearchAdvUi();
    }
    function setAdvFiletype(v) {
      var adv = loadSearchAdv();
      adv.filetype = v || '';
      saveSearchAdv(adv);
      applySearchAdvUi();
    }
    function setAdvTime(v) {
      var adv = loadSearchAdv();
      adv.time = v || '';
      saveSearchAdv(adv);
      applySearchAdvUi();
    }
    function setAdvPos(v) {
      var adv = loadSearchAdv();
      adv.pos = ['any', 'title', 'url'].indexOf(v) >= 0 ? v : 'any';
      saveSearchAdv(adv);
      applySearchAdvUi();
    }
    function setAdvPages(v) {
      var adv = loadSearchAdv();
      adv.pages = v || '';
      saveSearchAdv(adv);
      applySearchAdvUi();
    }
    function clearAdvDates() {
      var adv = loadSearchAdv();
      adv.from = '';
      adv.to = '';
      saveSearchAdv(adv);
      applySearchAdvUi();
    }
    function saveSearchAdvField(k, val) {
      var adv = loadSearchAdv();
      adv[k] = String(val || '').trim();
      saveSearchAdv(adv);
    }
    window.toggleSearchAdv = toggleSearchAdv;
    window.buildSearchUrl = buildSearchUrl;
    window.setAdvPos = setAdvPos;
    window.setAdvPages = setAdvPages;
    window.clearAdvDates = clearAdvDates;

    var allHidden = false;
    // 导航折叠模式：show（展开）/ hide（折叠）/ autofold（平时可展开，但每次刷新自动折叠；默认）
    var navFoldMode = 'autofold';

    var customEngineName = '';
    var customEngineUrl = '';

    function loadCustomEngine() {
      try {
        var saved = JSON.parse(localStorage.getItem('nav_custom_engine') || '{}');
        customEngineName = saved.name || '';
        customEngineUrl = saved.url || '';
        if (customEngineUrl) {
          engineUrls['custom'] = customEngineUrl;
          enginePlaceholders['custom'] = '输入关键词，' + customEngineName + '...';
          updateCustomBtnLabel();
          document.getElementById('engineRadioCustom').value = 'custom';
        }
      } catch(e) {}
    }

    function updateCustomBtnLabel() {
      var btn = document.getElementById('engineCustomBtn');
      if (btn && customEngineName) {
        btn.textContent = '⚙️' + customEngineName;
      }
    }

    function openEngineModal(e) {
      e.stopPropagation();
      if (customEngineUrl) {
        document.getElementById('engNameInput').value = customEngineName;
        document.getElementById('engUrlInput').value = customEngineUrl;
        document.getElementById('engDeleteBtn').style.display = '';
      } else {
        document.getElementById('engNameInput').value = '';
        document.getElementById('engUrlInput').value = 'https://cn.bing.com/search?q=%s';
        document.getElementById('engDeleteBtn').style.display = 'none';
      }
      document.getElementById('engineModal').classList.add('visible');
      document.getElementById('engNameInput').focus();
    }

    function closeEngineModal() {
      document.getElementById('engineModal').classList.remove('visible');
    }

    function saveCustomEngine() {
      var name = document.getElementById('engNameInput').value.trim();
      var url = document.getElementById('engUrlInput').value.trim();
      if (!url) return;
      if (!url.includes('%s')) {
        url = url.replace(/([?&]q=|[?&]query=|[?&]wd=|[?&]text=|[?&]search=)/, function(m) { return m + '%s'; });
        if (!url.includes('%s')) url += '%s';
      }
      customEngineName = name || url.replace(/https?:\/\//, '').split('/')[0];
      customEngineUrl = url;
      engineUrls['custom'] = url;
      enginePlaceholders['custom'] = '输入关键词，' + customEngineName + '...';
      var radio = document.getElementById('engineRadioCustom');
      radio.value = 'custom';
      radio.checked = true;
      updateCustomBtnLabel();
      document.getElementById('engineCustomBtn').classList.add('active');
      document.querySelectorAll('.engine-option:not(.engine-custom-btn)').forEach(function(l) { l.classList.remove('active'); });
      document.getElementById('searchInput').placeholder = enginePlaceholders['custom'];
      saveEnginePref('custom');
      updateStickyEngineLabel();
      document.getElementById('searchInput').focus();
      try { localStorage.setItem('nav_custom_engine', JSON.stringify({name: customEngineName, url: customEngineUrl})); } catch(e) {}
      closeEngineModal();
    }

    function deleteCustomEngine() {
      customEngineName = '';
      customEngineUrl = '';
      delete engineUrls['custom'];
      engineUrls['custom'] = 'https://cn.bing.com/search?q=';
      enginePlaceholders['custom'] = '输入关键词，自定义搜索...';
      document.getElementById('engineCustomBtn').textContent = '⚙️自定义';
      document.getElementById('engineCustomBtn').classList.remove('active');
      document.getElementById('engineRadioCustom').value = '';
      if (getSelectedEngine() === 'custom') {
        applyEngine('bing');
        saveEnginePref('bing');
        updateStickyEngineLabel();
      }
      try {
        localStorage.removeItem('nav_custom_engine');
        var pref = localStorage.getItem('nav_engine');
        if (pref === 'custom') localStorage.setItem('nav_engine', 'bing');
      } catch(e) {}
      closeEngineModal();
    }

    loadCustomEngine();

    // ---------- 清爽模式（Ctrl + 空格）与 Ctrl + Win 展开/收起导航 ----------
    var cleanUi = false;          // 只在本次会话内有效：刷新即恢复正常（不会把人锁在清爽模式里）
    function showModeToast(msg) {
      var t = document.getElementById('modeToast');
      if (!t) {
        t = document.createElement('div');
        t.id = 'modeToast';
        t.className = 'mode-toast';
        document.body.appendChild(t);
      }
      t.textContent = msg;
      t.classList.add('show');
      if (t.__hideTimer) clearTimeout(t.__hideTimer);
      t.__hideTimer = setTimeout(function() { t.classList.remove('show'); }, 1600);
    }
    // 清爽模式：用户要求「刷新后也要维持」，所以落盘 nav_clean_ui（'1' 开 / '0' 关）。
    // 启动时静默套用（不弹提示）；只有主动按 Ctrl + 空格 切换时才提示。
    var CLEAN_UI_KEY = 'nav_clean_ui';
    function loadCleanUi() {
      var on = false;
      try { on = localStorage.getItem(CLEAN_UI_KEY) === '1'; } catch(e) {}
      cleanUi = on;
      document.body.classList.toggle('clean-ui', on);
      if (on) {
        // 刷新后仍然清爽，但给一次 1.6 秒的提示，免得忘了怎么退出来
        setTimeout(function() { showModeToast('🧼 清爽模式（已保留）· 按 Ctrl + 空格 恢复'); }, 400);
      }
      return on;
    }
    function setCleanUi(on, silent) {
      cleanUi = !!on;
      document.body.classList.toggle('clean-ui', cleanUi);
      try { localStorage.setItem(CLEAN_UI_KEY, cleanUi ? '1' : '0'); } catch(e) {}
      // 设置面板里的两个 chip 就地回显（不整块重刷）
      var cOn = document.getElementById('setCleanOn');
      var cOff = document.getElementById('setCleanOff');
      if (cOn) cOn.classList.toggle('on', cleanUi);
      if (cOff) cOff.classList.toggle('on', !cleanUi);
      if (silent) return;
      showModeToast(cleanUi
        ? '🧼 清爽模式：已隐藏快捷工具、时间/天气、主题与设置（Ctrl + 空格 恢复，刷新后保持）'
        : '↩️ 已恢复：快捷工具 / 时间天气 / 主题 / 设置（刷新后保持）');
    }
    function toggleCleanUi() { setCleanUi(!cleanUi); }
    window.setCleanUi = setCleanUi;
    window.toggleCleanUi = toggleCleanUi;
    window.loadCleanUi = loadCleanUi;
    loadCleanUi();

    var ctrlWinHeld = false;
    document.addEventListener('keydown', function(e) {
      var isModKey = (e.key === 'Control' || e.key === 'Meta' || e.key === 'OS' ||
                      e.code === 'ControlLeft' || e.code === 'ControlRight' ||
                      e.code === 'MetaLeft' || e.code === 'MetaRight');
      // ① Ctrl + 空格：清爽模式开关（隐藏快捷工具 + 右上角时间/天气/主题 + 设置按钮，再按恢复）
      if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        toggleCleanUi();
        return;
      }
      // ② Ctrl + Win：展开 / 收起导航（只认「按下的是 Ctrl 或 Win 本身」，避免 Ctrl+Win+方向键这类系统组合误触）
      if (e.ctrlKey && e.metaKey && !e.altKey && !e.shiftKey && isModKey) {
        e.preventDefault();
        if (!ctrlWinHeld) {
          ctrlWinHeld = true;
          toggleAllContent();
          showModeToast(allHidden ? '📕 已收起导航（Ctrl + Win 展开）' : '📖 已展开导航（Ctrl + Win 收起）');
        }
      }
    }, true);
    document.addEventListener('keyup', function(e) {
      if (e.key === 'Control' || e.key === 'Meta' || e.key === 'OS') ctrlWinHeld = false;
    }, true);
    window.addEventListener('blur', function() { ctrlWinHeld = false; });

    function toggleAllContent() {
      allHidden = !allHidden;
      if (allHidden) {
        document.body.classList.add('all-hidden');
      } else {
        document.body.classList.remove('all-hidden');
      }
      updateToggleUi();
      try { localStorage.setItem('nav_all_hidden', allHidden ? '1' : '0'); } catch(e) {}
    }

    function updateToggleUi() {
      var btn = document.getElementById('heroToggleBtn');
      if (!btn) return;
      var icon = btn.querySelector('.toggle-icon');
      if (allHidden) {
        if (icon) icon.textContent = '▼';
        btn.innerHTML = '<span class="toggle-icon">▼</span> 展开导航';
      } else {
        if (icon) icon.textContent = '▲';
        btn.innerHTML = '<span class="toggle-icon">▲</span> 收起导航';
      }
    }

    // ---------- 搜索模式：全搜索（默认）/ 专注搜索 ----------
    var searchMode = 'full';
    function loadSearchMode() {
      var v = null;
      try { v = localStorage.getItem('nav_search_mode'); } catch(e) {}
      searchMode = (v === 'focus') ? 'focus' : 'full';
    }
    function searchModeHintText() {
      return searchMode === 'focus'
        ? '专注搜索：搜索框只负责联网搜索——输入时不会匹配本站网站、也不会自动展开下方分类；导航的展开/收起状态保持你现在的样子（不替你收起，也不替你展开）。'
        : '全搜索（默认）：输入关键词时同时筛选本页网站、自动展开匹配的分类；回车或点「搜索」再用所选引擎联网搜索。';
    }
    // ---------- 搜索提交后是否清空输入框（用户要求：默认「保留」，并在设置里可切换） ----------
    var searchKeepInput = true;
    function loadSearchKeep() {
      try { searchKeepInput = localStorage.getItem('nav_search_keep') !== '0'; }
      catch(e) { searchKeepInput = true; }
    }
    function searchKeepHintText() {
      return searchKeepInput
        ? '保留（默认）：回车或点「搜索」后，关键词仍留在输入框里，方便改词再搜、或对比不同引擎的结果。'
        : '清空：每次搜索后输入框清空并重新聚焦，适合「搜完立刻换下一个词」的习惯。';
    }
    function applySearchKeepUi() {
      var on = document.getElementById('setSearchKeepOn');
      var off = document.getElementById('setSearchKeepOff');
      if (on) on.classList.toggle('on', !!searchKeepInput);
      if (off) off.classList.toggle('on', !searchKeepInput);
      var hint = document.getElementById('searchKeepHint');
      if (hint) hint.textContent = searchKeepHintText();
    }
    function setSearchKeep(keep, el) {
      searchKeepInput = !!keep;
      ixSet('nav_search_keep', searchKeepInput ? '1' : '0');
      applySearchKeepUi();
    }
    window.setSearchKeep = setSearchKeep;
    loadSearchKeep();

    function applySearchModeUi() {
      var f = document.getElementById('setSearchFocus');
      var u = document.getElementById('setSearchFull');
      if (f) f.classList.toggle('on', searchMode === 'focus');
      if (u) u.classList.toggle('on', searchMode === 'full');
      var hint = document.getElementById('searchModeHint');
      if (hint) hint.textContent = searchModeHintText();
    }
    // 退出「全搜索」留下的筛选状态，把卡片显隐交还给站点/VPN/仅显示选中分类规则
    function exitNavFilter() {
      document.querySelectorAll('.nav-card').forEach(function(c) { c.style.display = ''; });
      document.querySelectorAll('.category-section').forEach(function(s) {
        s.style.display = hiddenCategories[s.id] ? 'none' : '';
      });
      ixSearching = false;
      if (typeof applySiteVisibility === 'function') applySiteVisibility();
      if (typeof applyOnlyActive === 'function') applyOnlyActive();
    }
    // 专注模式：只清搜索框自身样式；不筛选、不展开、也不改动导航的展开/收起状态
    // （用户当前是展开就保持展开，是收起就保持收起——搜索不该替你改）
    function handleFocusSearchInput(sb) {
      if (sb) sb.classList.remove('expanded', 'tall', 'multiline');
      if (typeof autosizeSearch === 'function') autosizeSearch();
    }
    function setSearchMode(mode, el) {
      searchMode = (mode === 'focus') ? 'focus' : 'full';
      try { localStorage.setItem('nav_search_mode', searchMode); } catch(e) {}
      applySearchModeUi();
      var input = document.getElementById('searchInput');
      var val = (input && input.value || '').trim();
      if (searchMode === 'focus') {
        exitNavFilter();                        // 清掉「全搜索」留下的筛选态，折叠状态保持原样
        handleFocusSearchInput(document.querySelector('.search-box'));
      } else if (val) {
        var hasMatch = doNavSearch();
        if (hasMatch) document.body.classList.remove('all-hidden');
      }
    }
    window.setSearchMode = setSearchMode;
    window.applySearchModeUi = applySearchModeUi;
    loadSearchMode();

    var catCollapsePrefs = {};
    function loadCatPrefs() {
      try {
        var ver = localStorage.getItem('nav_catpref_ver');
        if (ver !== '2') {
          localStorage.removeItem('nav_cat_collapse');
          localStorage.setItem('nav_catpref_ver', '2');
          catCollapsePrefs = {};
          return;
        }
        catCollapsePrefs = JSON.parse(localStorage.getItem('nav_cat_collapse') || '{}');
      } catch(e) { catCollapsePrefs = {}; }
    }

    function saveCatPrefs() {
      try { localStorage.setItem('nav_cat_collapse', JSON.stringify(catCollapsePrefs)); } catch(e) {}
    }

    function applyCatStates(isMobile) {
      var allIds = [];
      document.querySelectorAll('.category-section').forEach(function(sec) { allIds.push(sec.id); });
      allIds.forEach(function(id) {
        var sec = document.getElementById(id);
        if (!sec) return;
        var saved = catCollapsePrefs[id];
        if (saved === undefined) {
          if (isMobile) { sec.classList.add('collapsed'); } else { sec.classList.remove('collapsed'); }
        } else {
          if (saved) { sec.classList.add('collapsed'); } else { sec.classList.remove('collapsed'); }
        }
      });
    }

    loadCatPrefs();

    var catOrder = [];

    // 分类固定排序基准（与页面 DOM 顺序一致；新增分类请同时更新此处与 renderSettingsCategories）
    var DEFAULT_CAT_ORDER = [
      'cat-general','cat-ai','cat-buaa','cat-academic','cat-tech','cat-map','cat-tool',
      'cat-translate','cat-learn','cat-entertainment','cat-efficiency','cat-drive','cat-data',
      'cat-tutorial','cat-aero','cat-tradition','cat-navweb','cat-mirror','cat-cloud'
    ];

    // 'recent' = 按使用时间由新到旧自动排序；'fixed' = 固定顺序，不随点击变化
    // 默认 fixed：位置固定、可手动排布（见 loadCatSortMode / setCatSortMode）
    var catSortMode = 'fixed';

    // 默认分类顺序的版本号：调 DEFAULT_CAT_ORDER 时 +1，
    // 存量浏览器里保存的旧顺序会被一次性替换为新默认顺序（用户之后的手动调整仍会保留）。
    var CAT_ORDER_VER = '3';

    function loadCatOrder() {
      try {
        var ver = parseInt(localStorage.getItem('nav_cat_order_ver') || '0', 10) || 0;
        catOrder = JSON.parse(localStorage.getItem('nav_cat_order') || '[]');
        if (ver < parseInt(CAT_ORDER_VER, 10)) {
          // 默认顺序换代：一次性套用新默认顺序（用户其后在设置里的手动调整会带版本号，不再被覆盖）
          catOrder = DEFAULT_CAT_ORDER.slice();
          localStorage.setItem('nav_cat_order', JSON.stringify(catOrder));
          localStorage.setItem('nav_cat_order_ver', CAT_ORDER_VER);
        }
      } catch(e) { catOrder = DEFAULT_CAT_ORDER.slice(); }
    }

    function saveCatOrder() {
      try {
        localStorage.setItem('nav_cat_order', JSON.stringify(catOrder));
        localStorage.setItem('nav_cat_order_ver', CAT_ORDER_VER);
      } catch(e) {}
    }

    function isCustomCat(id) { return id.indexOf('custom-') === 0; }

    // 补齐后的完整顺序：自定义类别一律排在默认类别之前（各自保持相对顺序）
    function getFullCatOrderToday() {
      var ids = [];
      document.querySelectorAll('.category-section').forEach(function(sec) { ids.push(sec.id); });
      var out = [];
      catOrder.forEach(function(id) { if (ids.indexOf(id) >= 0 && out.indexOf(id) === -1) out.push(id); });
      ids.forEach(function(id) {
        if (out.indexOf(id) === -1) {
          var pos = DEFAULT_CAT_ORDER.indexOf(id);
          if (pos === -1) { out.push(id); return; }
          var insertAt = out.length;
          for (var i = 0; i < out.length; i++) {
            var p = DEFAULT_CAT_ORDER.indexOf(out[i]);
            if (p > pos) { insertAt = i; break; }
          }
          out.splice(insertAt, 0, id);
        }
      });
      // 稳定分区：收藏网址最前 > 自定义 > 默认（favorites 先剔出，避免重复）
      out = out.filter(function(id) { return id !== 'cat-favorites'; });
      var customs = out.filter(isCustomCat);
      var defaults = out.filter(function(id) { return !isCustomCat(id); });
      var favFirst = ['cat-favorites'].concat(customs, defaults);
      return document.getElementById('cat-favorites') ? favFirst : out;
    }

    function loadCatSortMode() {
      // 默认「固定顺序」；只有用户自己选过的模式才长期保留。
      // 存量用户：之前没得选、一直是被自动 bump 改顺序的（值='recent' 且无迁移标记）→ 一次性切到 fixed。
      try {
        var raw = localStorage.getItem('nav_cat_sort_mode');
        var migrated = localStorage.getItem('nav_cat_sort_migrated') === '1';
        if (raw === 'recent' && !migrated) {
          catSortMode = 'fixed';
          localStorage.setItem('nav_cat_sort_mode', 'fixed');
        } else if (raw === 'recent' || raw === 'fixed') {
          catSortMode = raw;
        } else {
          catSortMode = 'fixed';
        }
        localStorage.setItem('nav_cat_sort_migrated', '1');
      } catch(e) { catSortMode = 'fixed'; }
    }

    function saveCatSortMode() {
      try { localStorage.setItem('nav_cat_sort_mode', catSortMode); } catch(e) {}
    }

    function setCatSortMode(mode, el) {
      catSortMode = (mode === 'fixed') ? 'fixed' : 'recent';
      saveCatSortMode();
      if (catSortMode === 'fixed') {
        // 固化当前顺序（含新增分类补齐），此后点击分类不再改变顺序
        catOrder = getFullCatOrderToday();
        saveCatOrder();
        applyCatOrder();
      }
      applyCatOrderLockUi();
      if (typeof refreshSettingsUi === 'function') refreshSettingsUi();
    }

    function moveCategory(id, delta) {
      if (catSortMode !== 'fixed') return;
      catOrder = getFullCatOrderToday();
      var i = catOrder.indexOf(id);
      if (i < 0) return;
      var j = i + delta;
      if (j < 0 || j >= catOrder.length) return;
      catOrder.splice(i, 1);
      catOrder.splice(j, 0, id);
      saveCatOrder();
      applyCatOrder();
      renderSettingsCatOrder();
      applyCatOrderLockUi();
    }

    function applyCatOrderLockUi() {
      // 排序 UI 已移到配置编辑器；这里只在元素仍存在时同步（兼容旧版残留）
      var recentChip = document.getElementById('setCatSortRecent');
      var fixedChip = document.getElementById('setCatSortFixed');
      if (recentChip) recentChip.classList.toggle('on', catSortMode === 'recent');
      if (fixedChip) fixedChip.classList.toggle('on', catSortMode === 'fixed');
      var hint = document.getElementById('catSortHint');
      if (hint) {
        hint.textContent = (catSortMode === 'fixed')
          ? '当前为固定顺序：点击分类不会改变顺序，可用下方 ↑ ↓ 手动调整。'
          : '当前按使用时间排序：每次点击某个分类，它会自动跳到最前面。切到「固定顺序」即可手动排布。';
      }
      var list = document.getElementById('settingsCatOrderList');
      if (list) list.classList.toggle('locked', catSortMode !== 'fixed');
    }

    function renderSettingsCatOrder() {
      var list = document.getElementById('settingsCatOrderList');
      if (!list) return;   // 设置面板已不再承载排序 UI（改到编辑器）
      var order = getFullCatOrderToday();
      var labelOf = {};
      document.querySelectorAll('.sidebar a[href^="#cat-"]').forEach(function(a) {
        var id = a.getAttribute('href').replace('#', '');
        var sp = a.querySelector('span');
        labelOf[id] = sp ? sp.textContent : id;
      });
      var h = '';
      order.forEach(function(id, i) {
        h += '<div class="cat-order-item">' +
             '<span class="cat-order-idx">' + (i + 1) + '</span>' +
             '<span class="cat-order-name">' + (labelOf[id] || id) + '</span>' +
             '<button class="cat-order-move" onclick="moveCategory(\'' + id + '\',-1)" title="上移"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
             '<button class="cat-order-move" onclick="moveCategory(\'' + id + '\',1)" title="下移"' + (i === order.length - 1 ? ' disabled' : '') + '>↓</button>' +
             '</div>';
      });
      if (catSortMode !== 'fixed') {
        h += '<div class="cat-order-lock-hint">切到「固定顺序」后可点击 ↑ ↓ 调整</div>';
      }
      list.innerHTML = h;
    }

    function applyCatOrder() {
      var main = document.querySelector('.main-content');
      if (!main) return;
      // 固定模式下以「补齐后的完整顺序」为准，避免新分类或历史遗留顺序错位
      var order = getFullCatOrderToday();
      var sections = main.querySelectorAll('.category-section');
      var map = {};
      sections.forEach(function(sec) { map[sec.id] = sec; });
      order.forEach(function(id) {
        if (map[id]) {
          main.appendChild(map[id]);
          delete map[id];
        }
      });
      var remaining = Object.keys(map).filter(function(id) {
        return order.indexOf(id) === -1;
      });
      remaining.forEach(function(id) { main.appendChild(map[id]); });
      // Reorder sidebar links
      var sidebar = document.getElementById('sidebar');
      if (sidebar) {
        var sLinks = sidebar.querySelectorAll('a[href^="#cat-"]');
        var sMap = {};
        sLinks.forEach(function(a) { sMap[a.getAttribute('href').replace('#','')] = a; });
        order.forEach(function(id) {
          if (sMap[id]) { sidebar.appendChild(sMap[id]); delete sMap[id]; }
        });
        Object.keys(sMap).forEach(function(id) { sidebar.appendChild(sMap[id]); });
      }
      // Reorder mobile tabs
      var mTabs = document.querySelector('.mobile-tabs');
      if (mTabs) {
        var mList = mTabs.querySelectorAll('a[href^="#cat-"]');
        var mMap = {};
        mList.forEach(function(a) { mMap[a.getAttribute('href').replace('#','')] = a; });
        order.forEach(function(id) {
          if (mMap[id]) { mTabs.appendChild(mMap[id]); delete mMap[id]; }
        });
        Object.keys(mMap).forEach(function(id) { mTabs.appendChild(mMap[id]); });
      }
      if (typeof window.ixApplyCatVisibility === 'function') window.ixApplyCatVisibility();
    }

    function bumpCategory(id) {
      // 「固定顺序」模式下点击分类**完全不动顺序**（只跳转）；
      // 「按使用时间排序」模式下才把被点的分类提到自己分组的最前。
      if (catSortMode === 'fixed') return;
      catOrder = getFullCatOrderToday();
      catOrder = catOrder.filter(function(x) { return x !== id; });
      var isCustom = id.indexOf('custom-') === 0;
      if (isCustom) {
        catOrder.unshift(id);                       // 自定义组内：置顶（仍在整表最前）
      } else {
        var insertAt = catOrder.length;             // 默认组内：插到第一个默认类别之前
        for (var i = 0; i < catOrder.length; i++) {
          if (catOrder[i].indexOf('custom-') !== 0) { insertAt = i; break; }
        }
        catOrder.splice(insertAt, 0, id);
      }
      saveCatOrder();
      applyCatOrder();
      applyCatStates(window.innerWidth <= 1023);
    }

    loadCatOrder();
    loadCatSortMode();

    var freqVisible = true;
    var freqCount = 6;
    var hiddenEngines = {};
    var hiddenCategories = {};

    function loadSettings() {
      try { freqVisible = localStorage.getItem('nav_freq_visible') !== '0'; } catch(e) {}
      try { var c = parseInt(localStorage.getItem('nav_freq_count')); if (c >= 1 && c <= 12) freqCount = c; } catch(e) {}
      try {
        var rawEngines = JSON.parse(localStorage.getItem('nav_hidden_engines') || '{}');
        hiddenEngines = {};
        for (var k in rawEngines) { if (rawEngines.hasOwnProperty(k)) hiddenEngines[k] = rawEngines[k]; }
        if (localStorage.getItem('nav_engines_ver') !== ENGINES_DEFAULTS_VER) {
          // 一次性迁移：默认只勾选这 12 个引擎（必应/谷歌/秘塔/Yandex/搜狗知乎/搜狗微信/Quora/Reddit/谷歌学术/微软学术/译中/译英）
          hiddenEngines = defaultHiddenEngines();
          localStorage.setItem('nav_hidden_engines', JSON.stringify(hiddenEngines));
          localStorage.setItem('nav_engines_ver', ENGINES_DEFAULTS_VER);
        } else {
          ALL_ENGINE_IDS.forEach(function(k) { if (!(k in rawEngines)) hiddenEngines[k] = true; });
        }
      } catch(e) { hiddenEngines = {}; }
      try { hiddenCategories = JSON.parse(localStorage.getItem('nav_hidden_cats') || '{}'); } catch(e) { hiddenCategories = {}; }
    }

    loadSettings();

    (function() {
      try { navFoldMode = localStorage.getItem('nav_fold_mode') || ''; } catch(e) { navFoldMode = ''; }
      if (navFoldMode !== 'show' && navFoldMode !== 'hide' && navFoldMode !== 'autofold') {
        // 没有模式键（新访客 / 老版本）→ 默认「刷新后自动折叠」（用户指定）
        navFoldMode = 'autofold';
      }
      try {
        // 「刷新后自动折叠」= 每次载入都强制折叠；hide 也折叠；show 才沿用上次状态
        allHidden = (navFoldMode === 'hide' || navFoldMode === 'autofold') ? true
                  : (localStorage.getItem('nav_all_hidden') === '1');
      } catch(e) { allHidden = false; }
      if (allHidden) {
        document.body.classList.add('all-hidden');
      } else {
        document.body.classList.remove('all-hidden');
      }
      updateToggleUi();
      var showChip = document.getElementById('setNavShow');
      var hideChip = document.getElementById('setNavHide');
      var autoChip = document.getElementById('setNavAuto');
      if (showChip) showChip.classList.toggle('on', navFoldMode === 'show');
      if (hideChip) hideChip.classList.toggle('on', navFoldMode === 'hide');
      if (autoChip) autoChip.classList.toggle('on', navFoldMode === 'autofold');
      applyCatOrder();
      applyCatStates(window.innerWidth <= 1023);
    })();

    window.addEventListener('resize', function() {
      applyCatStates(window.innerWidth <= 1023);
    });

    function toggleCategory(header) {
      var section = header.closest('.category-section');
      section.classList.toggle('collapsed');
      var id = section.id;
      catCollapsePrefs[id] = section.classList.contains('collapsed');
      saveCatPrefs();
    }

    function clearSearchInput() {
      var input = document.getElementById('searchInput');
      if (input && input.tagName === 'TEXTAREA') {
        input.style.height = '';
        input.style.overflowY = 'hidden';
      }
      input.value = '';
      input.focus();
      input.dispatchEvent(new Event('input'));
      document.getElementById('stickyInput').value = '';
    }

    var ixSearching = false;

    function doNavSearch() {
      var query = document.getElementById('searchInput').value.toLowerCase().trim();
      var anyMatch = false;
      if (!query) {
        // 退出搜索：把卡片显隐交还给站点/VPN 规则，并恢复「仅显示选中分类」
        ixSearching = false;
        if (typeof siteOv !== 'undefined' && typeof applySiteVisibility === 'function') applySiteVisibility();
        document.querySelectorAll('.category-section').forEach(function(sec) { sec.style.display = ''; });
        if (typeof applyOnlyActive === 'function') applyOnlyActive();
        return anyMatch;
      }
      // 搜索时必须跨全部分类展示匹配结果，因此临时撤掉「仅显示选中分类」
      ixSearching = true;
      document.body.classList.remove('only-active');
      var cards = document.querySelectorAll('.nav-card');
      var firstMatch = null;
      cards.forEach(function(card) {
        if (card.getAttribute('data-hidden') === '1') { card.style.display = 'none'; return; }
        var text = card.textContent.toLowerCase();
        var section = card.closest('.category-section');
        if (text.includes(query)) {
          card.style.display = 'flex';
          if (!hiddenCategories[section.id]) section.style.display = 'block';
          if (!firstMatch) firstMatch = card;
          anyMatch = true;
        } else {
          card.style.display = 'none';
        }
      });
      document.querySelectorAll('.category-section').forEach(function(sec) {
        var visible = sec.querySelectorAll('.nav-card:not([data-hidden="1"])[style*="flex"]').length;
        if (visible === 0) sec.style.display = 'none';
      });
      if (firstMatch) firstMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return anyMatch;
    }

    function setActive(el) {
      document.querySelectorAll('.sidebar a').forEach(function(a) { a.classList.remove('active'); });
      document.querySelectorAll('.mobile-tab').forEach(function(a) { a.classList.remove('active'); });
      var href = el.getAttribute('href');
      var id = href.replace('#', '');
      document.querySelectorAll('.sidebar a, .mobile-tab').forEach(function(a) {
        if (a.getAttribute('href') === href) a.classList.add('active');
      });
      bumpCategory(id);
      markActiveSection(id);
      var section = document.getElementById(id);
      if (section) {
        section.classList.remove('collapsed');
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    function saveEnginePref(engine) {
      try { localStorage.setItem('nav_engine', engine); } catch(e) {}
    }

    function loadEnginePref() {
      try { return localStorage.getItem('nav_engine') || 'bing'; } catch(e) { return 'bing'; }
    }

    function applyEngine(engine) {
      var radio = document.querySelector('input[name="engine"][value="' + engine + '"]');
      if (!radio) return;
      radio.checked = true;
      document.querySelectorAll('.engine-option').forEach(function(l) { l.classList.remove('active'); });
      var label = radio.closest('.engine-option');
      if (label) { label.classList.add('active'); }
      if (engine === 'custom') {
        document.getElementById('engineCustomBtn').classList.add('active');
      }
      document.getElementById('searchInput').placeholder = enginePlaceholders[engine] || enginePlaceholders.bing;
    }

    document.querySelectorAll('.engine-option').forEach(function(label) {
      label.addEventListener('click', function() {
        var radio = this.querySelector('input[type="radio"]');
        if (!radio) return;
        radio.checked = true;
        document.querySelectorAll('.engine-option').forEach(function(l) { l.classList.remove('active'); });
        this.classList.add('active');
        document.getElementById('searchInput').placeholder = enginePlaceholders[radio.value];
        saveEnginePref(radio.value);
        updateStickyEngineLabel();
      });
    });

    (function() {
      var saved = loadEnginePref();
      if (saved !== 'bing') applyEngine(saved);
    })();

    document.getElementById('searchInput').addEventListener('input', function() {
      var sb = document.querySelector('.search-box');
      // 专注搜索只在「导航收起」时生效。一旦导航是展开的（用户这时的目的是挑网站），
      // 输入就直接走全检索：跨全部分类过滤卡片，不会因为选了专注搜索就"展开了却搜不到"。
      if (searchMode === 'focus' && document.body.classList.contains('all-hidden')) {
        handleFocusSearchInput(sb);
        return;
      }
      if (!this.value.trim()) {
        // 退出搜索：把卡片显隐交还给「站点/VPN 规则」并恢复「仅显示选中分类」，
        // 同时复位 ixSearching（否则只显示一类的状态会永久失效——这是用户 2026-10-17 报的 bug）
        if (typeof exitNavFilter === 'function') {
          exitNavFilter();
        } else {
          document.querySelectorAll('.nav-card').forEach(function(c) { c.style.display = ''; });
          document.querySelectorAll('.category-section').forEach(function(s) {
            s.style.display = hiddenCategories[s.id] ? 'none' : '';
          });
        }
        if (allHidden) document.body.classList.add('all-hidden');
        sb.classList.remove('expanded', 'tall', 'multiline');
      } else {
        var hasMatch = doNavSearch();
        if (hasMatch) {
          document.body.classList.remove('all-hidden');
        } else {
          if (allHidden) document.body.classList.add('all-hidden');
        }
        var len = this.value.length;
        var lines = this.value.split('\n').length;
        sb.classList.remove('expanded', 'tall', 'multiline');
        if (len > 50 || lines > 1) {
          sb.classList.add('multiline');
        } else if (len > 30) {
          sb.classList.add('expanded', 'tall');
        } else if (len > 25) {
          sb.classList.add('expanded');
        }
      }
      if (typeof autosizeSearch === 'function') autosizeSearch();
    });

    // textarea：Enter 提交（阻止换行），Shift+Enter 换行
    document.getElementById('searchInput').addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        doSearch();
      }
    });

    // 高度自适应：内容多少行就多高，最多 10 行，超出内部滚动
    var IX_MAX_LINES = 10;
    function autosizeSearch() {
      var ta = document.getElementById('searchInput');
      if (!ta) return;
      ta.style.height = 'auto';
      var cs = getComputedStyle(ta);
      var line = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4 || 22;
      var padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
      var maxH = line * IX_MAX_LINES + padV;
      var h = Math.min(ta.scrollHeight, maxH);
      ta.style.height = h + 'px';
      // 只有真的超过 10 行才出现滚动条；单行/未超出时一律隐藏（上下滚动条很难看）
      var needScroll = ta.scrollHeight > maxH + 1;
      ta.style.overflowY = needScroll ? 'auto' : 'hidden';
      ta.style.overflowX = 'hidden';
      // 单行时把高度钉回基准高度，避免 1px 往返导致滚动条闪一下
      if (!needScroll && h <= line + padV + 1) ta.style.height = '';
    }
    window.autosizeSearch = autosizeSearch;

    // 滚动高亮左侧分类：每帧最多算一次，而且高亮没变就不碰 DOM。
    // （旧版每个 scroll 事件都跑一遍 19 个 getBoundingClientRect，等于每帧强制同步布局一次，长页面滚动会掉帧）
    var scrollTickPending = 0;
    var activeSectionId = '';
    function updateActiveOnScroll() {
      if (scrollTickPending) return;
      scrollTickPending = 1;
      var raf = window.requestAnimationFrame || function(f) { return setTimeout(f, 16); };
      raf(function() {
        scrollTickPending = 0;
        var sections = document.querySelectorAll('.category-section');
        var current = '';
        for (var i = 0; i < sections.length; i++) {
          if (sections[i].getBoundingClientRect().top <= 120) current = sections[i].id;
        }
        if (!current || current === activeSectionId) return;
        activeSectionId = current;
        document.querySelectorAll('.sidebar a, .mobile-tab').forEach(function(a) {
          a.classList.toggle('active', a.getAttribute('href') === '#' + current);
        });
      });
    }
    window.addEventListener('scroll', updateActiveOnScroll, { passive: true });

    function toggleTheme() {
      var isDark = document.body.classList.toggle('dark');
      var btn = document.querySelector('.theme-toggle');
      if (btn) btn.textContent = isDark ? '☀️' : '🌙';
      updateHeroBg();
      try { localStorage.setItem('nav_theme', isDark ? 'dark' : 'light'); } catch(e) {}
    }

    var wallpaperType = 'default';
    var useBingWallpaper = true;
    var bingWallpaperUrl = '';
    var customWallpaperUrl = '';
    /* 本地壁纸：Blob 存 IndexedDB，渲染只用 object URL。
       绝不把多 MB 的 base64 塞进 CSSOM / localStorage —— 那是「选了本地图就卡死」的根因：
       7~27MB 的 data URL 每次刷新都要解析一遍，还把 localStorage 5MB 配额吃光，导致后续所有设置写入变慢甚至失败。 */
    var LOCAL_WP_KEY = 'nav_local_wp_blob';          // IndexedDB 键（Blob）
    var LOCAL_WP_LEGACY_KEY = 'nav_local_wp';        // 旧版：base64 字符串（LS + IDB 都可能存过）
    var LOCAL_WP_MAX_EDGE = 2560;                    // 处理后最长边
    var LOCAL_WP_TARGET_BYTES = 1200 * 1024;         // 处理后目标体积
    var LOCAL_WP_MAX_RAW = 40 * 1024 * 1024;         // 原始文件上限，超过直接拒收（避免解码卡死）
    var localWallpaperUrl = '';                      // 渲染用 object URL
    var localWallpaperBytes = 0;                     // 处理后体积

    var landscapePool = ['assets/wp_01.jpg','assets/wp_02.jpg','assets/wp_03.jpg','assets/wp_04.jpg','assets/wp_05.jpg','assets/wp_06.jpg','assets/wp_07.jpg','assets/wp_08.jpg','assets/wp_09.jpg','assets/wp_10.jpg','assets/wp_11.jpg','assets/wp_12.jpg'];
    var wpScanDone = false;
    // 壁纸清单（assets/wallpapers.js，由 tools/gen_wallpapers.py 生成）
    var WP_MANIFEST = (window.__AURORAUS_WALLPAPERS && window.__AURORAUS_WALLPAPERS.files) || null;

    function scanWpAssets(callback) {
      // 有清单就直接用：不再 new Image() 逐张探测（旧逻辑首次访问要白白下载 20+ 张壁纸 ≈ 8MB）
      if (WP_MANIFEST && WP_MANIFEST.length) {
        landscapePool = WP_MANIFEST.slice(0);
        try {
          localStorage.setItem('nav_wp_max', String(landscapePool.length));
          localStorage.setItem('nav_wp_pool', JSON.stringify(landscapePool));
          localStorage.setItem('nav_wp_last_scan', new Date().toDateString());
        } catch(e) {}
        wpScanDone = true;
        callback();
        return;
      }
      var lastScan = localStorage.getItem('nav_wp_last_scan') || '';
      if (lastScan === new Date().toDateString() && wpScanDone) { callback(); return; }
      var known = parseInt(localStorage.getItem('nav_wp_max') || '12');
      if (lastScan === new Date().toDateString()) {
        landscapePool = [];
        try {
          var cachedPool = JSON.parse(localStorage.getItem('nav_wp_pool') || '[]');
          if (cachedPool.length) {
              landscapePool = cachedPool;
            } else {
            for (var i = 1; i <= known; i++) {
              var num = i < 10 ? '0' + i : '' + i;
              landscapePool.push('assets/wp_' + num + '.jpg');
            }
          }
        } catch(e) {
          for (var i = 1; i <= known; i++) {
            var num = i < 10 ? '0' + i : '' + i;
            landscapePool.push('assets/wp_' + num + '.jpg');
          }
        }
        wpScanDone = true;
        callback();
        return;
      }
      var start = known + 1;
      var foundNew = false;

      function testNext(idx) {
        if (idx > 999) {
          try { localStorage.setItem('nav_wp_last_scan', new Date().toDateString()); } catch(e) {}
          try { localStorage.setItem('nav_wp_max', String(landscapePool.length)); } catch(e) {}
          try { localStorage.setItem('nav_wp_pool', JSON.stringify(landscapePool)); } catch(e) {}
          wpScanDone = true;
          callback();
          return;
        }
        var num = idx < 10 ? '0' + idx : '' + idx;
        var imgJpg = new Image();
        imgJpg.onload = function() {
          landscapePool.push('assets/wp_' + this._num + '.jpg');
          foundNew = true;
          testNext(parseInt(this._num.replace(/^0+/,'')) + 1);
        };
        imgJpg.onerror = function() {
          var gifImg = new Image();
          gifImg._num = this._num;
          gifImg.onload = function() {
            landscapePool.push('assets/wp_' + this._num + '.gif');
            foundNew = true;
            testNext(parseInt(this._num.replace(/^0+/,'')) + 1);
          };
          gifImg.onerror = function() {
            try { localStorage.setItem('nav_wp_last_scan', new Date().toDateString()); } catch(e) {}
            try { localStorage.setItem('nav_wp_max', String(landscapePool.length)); } catch(e) {}
            try { localStorage.setItem('nav_wp_pool', JSON.stringify(landscapePool)); } catch(e) {}
            wpScanDone = true;
            callback();
          };
          gifImg.src = 'assets/wp_' + this._num + '.gif';
        };
        imgJpg._num = num;
        imgJpg.src = 'assets/wp_' + num + '.jpg';
      }
      testNext(start);
    }

    function pickLandscape() {
      var today = new Date().toDateString();
      try {
        var lastDate = localStorage.getItem('nav_landscape_date');
        var lastIdx = parseInt(localStorage.getItem('nav_landscape_idx'));
        if (lastDate === today && lastIdx >= 0 && lastIdx < landscapePool.length) {
          return landscapePool[lastIdx];
        }
      } catch(e) {}
      var idx = Math.floor(Math.random() * landscapePool.length);
      try {
        localStorage.setItem('nav_landscape_date', today);
        localStorage.setItem('nav_landscape_idx', String(idx));
      } catch(e) {}
      return landscapePool[idx];
    }

    function fetchBingWallpaper() {
      scanWpAssets(function() {
        var url = pickLandscape();
        if (url !== bingWallpaperUrl) {
          bingWallpaperUrl = url;
          try { localStorage.setItem('nav_bing_wp_url', url); } catch(e) {}
          if (useBingWallpaper) applyHeroBg();
        }
      });
    }

    function randomPickWp() {
      // 有清单就按清单随机（不用再猜 wp_NN.jpg 是否存在，gif 也能正常选到）
      var pool = (landscapePool && landscapePool.length) ? landscapePool : null;
      var max = pool ? pool.length : (parseInt(localStorage.getItem('nav_wp_max')) || landscapePool.length || 12);
      var tries = 0;
      function applyPicked(url, idx) {
        bingWallpaperUrl = url;
        try {
          localStorage.setItem('nav_landscape_date', new Date().toDateString());
          localStorage.setItem('nav_landscape_idx', String(idx));
          localStorage.setItem('nav_bing_wp_url', url);
        } catch(e) {}
        updateHeroBg();
      }
      function tryPick() {
        if (tries++ > 50) { showMsg('未找到可用壁纸', true); return; }
        var idx = Math.floor(Math.random() * max);
        var num = (idx + 1) < 10 ? '0' + (idx + 1) : '' + (idx + 1);
        if (pool) {
          var url = pool[idx];
          var img = new Image();
          img.onload = function() { applyPicked(url, idx); };
          img.onerror = function() {
            // 清单里的文件被删了：跳过，别浪费一轮下载
            landscapePool.splice(idx, 1);
            if (!landscapePool.length) { showMsg('未找到可用壁纸', true); return; }
            max = landscapePool.length;
            tryPick();
          };
          img.src = url;
          return;
        }
        var img2 = new Image();
        img2.onload = function() { applyPicked(this.src, idx); };
        img2.onerror = function() {
          var gifImg = new Image();
          gifImg.onload = function() { applyPicked(this.src, idx); };
          gifImg.onerror = function() { tryPick(); };
          gifImg.src = 'assets/wp_' + num + '.gif';
        };
        img2.src = 'assets/wp_' + num + '.jpg';
      }
      tryPick();
    }

    /* 背景图换 URL 就要重新解码，成本远高于普通样式；所以做「值没变就不写」的守卫。
       key 用 '' 表示回落到 CSS 里的默认图，'none' 表示明确不要图。 */
    function setHeroBgImage(bg, key, cssValue) {
      if (bg.__heroBgKey === key) return;
      bg.__heroBgKey = key;
      bg.style.backgroundImage = cssValue;
    }
    function setHeroBgOpacity(bg, val) {
      var s = (val === null || val === undefined) ? '' : String(val);
      if (bg.__heroBgOp === s) return;
      bg.__heroBgOp = s;
      bg.style.opacity = s;
    }
    // 壁纸是「好看但不急」的东西：等首屏（搜索框 + 卡片）先画出来再贴图，核心内容不被大图拖慢
    var heroBgPending = 0;
    function scheduleHeroBgApply() {
      if (heroBgPending) return;
      heroBgPending = 1;
      var run = function() { heroBgPending = 0; try { updateHeroBg(); } catch(e) {} };
      var raf = window.requestAnimationFrame || function(f) { return setTimeout(f, 16); };
      raf(function() { setTimeout(run, 0); });
    }

    function updateHeroBg() {
      var bg = document.querySelector('.hero-bg');
      if (!bg) return;
      var isDark = document.body.classList.contains('dark');
      var bgUrl = '', opacity = null, noImage = false;
      if (wallpaperType === 'earth' && earthWallpaperUrl) {
        // 地球实况：一张图铺满整个首屏（cover 按比例放大、裁掉溢出，既不留白也不变形）
        bgUrl = earthWallpaperUrl;
        bg.style.backgroundSize = 'cover';
        bg.style.backgroundPosition = 'center center';
        opacity = isDark ? 0.94 : 0.98;
      } else if (wallpaperType === 'local' && localWallpaperUrl) {
        bgUrl = localWallpaperUrl;
        opacity = isDark ? 0.35 : 0.60;
      } else if (wallpaperType === 'custom' && customWallpaperUrl) {
        bgUrl = customWallpaperUrl;
        opacity = isDark ? 0.35 : 0.60;
      } else if (useBingWallpaper && bingWallpaperUrl) {
        bgUrl = bingWallpaperUrl;
        opacity = isDark ? 0.35 : 0.60;
      } else if (useBingWallpaper) {
        noImage = true;
        opacity = 0;
      }
      // 默认壁纸：清掉内联样式，回落到 CSS 里的 assets/hero_bg_light.jpg
      if (noImage) setHeroBgImage(bg, 'none', 'none');
      else if (bgUrl) setHeroBgImage(bg, bgUrl, 'url("' + bgUrl + '")');
      else setHeroBgImage(bg, '', '');
      setHeroBgOpacity(bg, opacity);
      // 图源说明只在「地球实况」真正生效时出现
      if (typeof syncEarthClass === 'function') syncEarthClass();
    }

    function applyHeroBg() {
      updateHeroBg();
    }

    // ---------- 🌍 地球实况壁纸：NASA GIBS 真实色卫星图，跟随「地球正午」取景 ----------
    var EARTH_KEY = 'nav_earth_cache';
    var EARTH_VER = '10';                     // 改取景/尺寸/选图/缓存格式后递增，旧缓存自动作废（10=壁纸改存 Blob）
    // 纬度固定 -60..70（南极圈外到北冰洋边）；经度跟随正午经线跨 150°：
    // 实测 180° 时右边缘有约 9% 的黑带，收到 150° 后≈1%，且仍比 120° 宽得多。
    var EARTH_LAT_MIN = -60, EARTH_LAT_MAX = 70, EARTH_LON_SPAN = 150;
    var EARTH_W = 1200, EARTH_H = 1040;       // 150°×130° 的真实比例
    var earthWallpaperUrl = '';
    var earthPickedDay = '';
    var earthPickedLayer = '';
    // 主源：国家卫星气象中心（NSMC）「风云四号B 中国区域云图（真彩合成）」
    // 产品页 id=FY4B_AGRI_IMG_REGI_GCLR_GLL，图片每 15 分钟一帧、取最新那一帧
    var FY4_XML = 'https://img.nsmc.org.cn/CLOUDIMAGE/FY4B/AGRI/GCLR/SEC/xml/FY4B-china-72h.xml';
    var fy4Time = '';
    var fy4FetchedAt = 0;
    var fy4PickedTime = '';
    var fy4ListCache = null;      // {ts, items:[{time,url}]} 内存缓存 5 分钟
    function pad2(n) { return (n < 10 ? '0' : '') + n; }
    // 从 XML 里取最新的「全尺寸 + 缩略图」：XML 里同一时刻有两条，-thumb.JPG 结尾的是小图
    // 注意 XML 里的 URL 是协议相对（//img.nsmc.org.cn/...），在 file:// 页面下会解析失败，必须补全
    function fy4AbsUrl(url) {
      if (!url) return '';
      if (url.indexOf('//') === 0) return 'https:' + url;
      if (url.indexOf('http') === 0) return url;
      return 'https://img.nsmc.org.cn' + (url.charAt(0) === '/' ? '' : '/') + url;
    }
    function fy4Parse(xmlText) {
      var out = [];
      var re = /<image\s+time="([^"]+)"[^>]*url="([^"]+)"/g;
      var m;
      while ((m = re.exec(xmlText || ''))) {
        var url = m[2];
        if (/-thumb\.JPG$/i.test(url)) continue;
        out.push({ time: m[1], url: fy4AbsUrl(url) });
      }
      return out;
    }
    function fy4ThumbOf(url) {
      return url && /\.JPG$/i.test(url) ? url + '-thumb.JPG' : url;
    }
    // 兜底：URL 有规律 …/china/YYYY/YYYYMMDD/FY4B_china_YYYYMMDDHHMMSS.JPG
    function fy4UrlForSlot(d) {
      var t = new Date(d.getTime());
      t.setUTCMinutes(Math.floor(t.getUTCMinutes() / 15) * 15, 0, 0);
      var day = '' + t.getUTCFullYear() + pad2(t.getUTCMonth() + 1) + pad2(t.getUTCDate());
      var stamp = day + pad2(t.getUTCHours()) + pad2(t.getUTCMinutes()) + '00';
      return 'https://img.nsmc.org.cn/CLOUDIMAGE/FY4B/AGRI/GCLR/SEC/china/' +
             t.getUTCFullYear() + '/' + day + '/FY4B_china_' + stamp + '.JPG';
    }
    function fy4LoadList() {
      if (fy4ListCache && (Date.now() - fy4ListCache.ts) < 5 * 60 * 1000 && fy4ListCache.items.length) {
        return Promise.resolve(fy4ListCache.items);
      }
      return fetchT(FY4_XML, { mode: 'cors', cache: 'no-store' }, 6000)
        .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
        .then(function(txt) {
          var items = fy4Parse(txt);
          if (!items.length) throw new Error('empty-list');
          fy4ListCache = { ts: Date.now(), items: items };
          return items;
        });
    }
    // 北京时间显示（用户要求：右下角备注用北京时间，不是 UTC）
    function beijingTimeText(timeText) {
      var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(timeText || '');
      if (!m) return '';
      var utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
      var d = new Date(utc + 8 * 3600 * 1000);
      return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()) +
             ' ' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + '（北京时间）';
    }
    // 时间戳 → 北京时间文本（全圆盘那张拿不到 Last-Modified，只能记"抓取于"）
    function beijingTimeOfStamp(ts) {
      if (!ts) return '';
      var d = new Date(Number(ts) + 8 * 3600 * 1000);
      return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()) +
             ' ' + pad2(d.getUTCHours()) + ':' + pad2(d.getUTCMinutes()) + '（北京时间）';
    }
    // 拉最新一帧中国区域云图（缩略图 1719×1080，约 880KB，CORS 允许，可落 IndexedDB）
    function fy4FetchRegion() {
      return fy4LoadList().then(function(items) {
        var cands = items.slice(0, 3).map(function(it) { return { url: fy4ThumbOf(it.url), time: it.time }; });
        // 列表抽风时用「现在往前 30 分钟」的规律 URL 兜底
        for (var n = 0; n < 2; n++) {
          var d = new Date(Date.now() - (30 + n * 15) * 60000);
          cands.push({ url: fy4ThumbOf(fy4UrlForSlot(d)), time: '' });
        }
        function tryAt(i) {
          if (i >= cands.length) return Promise.reject(new Error('fy4-empty'));
          var c = cands[i];
          return fetchT(c.url, { mode: 'cors', cache: 'force-cache' }, 12000)
            .then(function(r) {
              if (!r.ok) throw new Error('HTTP ' + r.status);
              return r.blob().then(function(b) { return { blob: b, time: c.time || '', lm: r.headers.get('Last-Modified') }; });
            })
            .then(function(res) {
              return blobToDataUrl(res.blob).then(function(dataUrl) {
                return earthImageUsable(dataUrl).then(function(ok) {
                  if (!ok) throw new Error('blank');
                  return { blob: res.blob, dataUrl: dataUrl, time: res.time, lastMod: res.lm || '' };
                });
              });
            })
            .catch(function() { return tryAt(i + 1); });
        }
        return tryAt(0);
      });
    }
    function fy4SlotStamp(d) {
      var t = new Date(d.getTime());
      t.setUTCMinutes(Math.floor(t.getUTCMinutes() / 15) * 15, 0, 0);
      return '' + t.getUTCFullYear() + pad2(t.getUTCMonth() + 1) + pad2(t.getUTCDate()) +
             pad2(t.getUTCHours()) + pad2(t.getUTCMinutes());
    }
    function fy4DayOf(timeText) {
      var m = /^(\d{4}-\d{2}-\d{2})/.exec(timeText || '');
      return m ? m[1] : '';
    }
    // 地球实况（中国区域）
    // 渲染统一走 object URL（壁纸图 800KB+，做成 base64 会让 CSS 字符串膨胀 33% 且每次刷新重解析）
    var earthObjUrl = '';
    function setEarthUrl(url) {
      // 同上：不 revoke 正在使用的 object URL，避免换帧瞬间破图
      earthObjUrl = (url && url.indexOf('blob:') === 0) ? url : '';
      earthWallpaperUrl = url || '';
    }
    function fetchFy4Image() {
      return fy4FetchRegion().then(function(res) {
        setEarthUrl(URL.createObjectURL(res.blob));
        fy4PickedTime = res.time || res.lastMod || '';
        earthPickedDay = fy4DayOf(res.time);
        earthPickedLayer = 'FY4B_AGRI_REGI_GCLR';
        try {
          idbSet(EARTH_KEY, { ver: EARTH_VER, kind: 'fy4', time: fy4PickedTime, day: earthPickedDay,
                              bucket: earthBucket(), blob: res.blob, ts: Date.now() });
        } catch(e) {}
        if (wallpaperType === 'earth') scheduleHeroBgApply();
        return earthWallpaperUrl;
      });
    }
    // 「一定要最新」：GIBS 各产品的当日镶嵌出炉时间不同（实测 SNPP 当天常还是全黑，
    // 而 MODIS Terra / NOAA-20 当天已经有了），所以按「今天优先 + 多图层兜底」逐个试。
    var EARTH_LAYERS = [
      'MODIS_Terra_CorrectedReflectance_TrueColor',
      'VIIRS_NOAA20_CorrectedReflectance_TrueColor',
      'VIIRS_SNPP_CorrectedReflectance_TrueColor'
    ];
    function earthDayOffset(n) {
      var d = new Date(Date.now() - (n || 0) * 86400000);
      var m = d.getUTCMonth() + 1, day = d.getUTCDate();
      return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
    }
    function earthDay() { return earthDayOffset(0); }        // 首选「今天」
    // 候选顺序：今天 × 3 图层 → 昨天 × 1 图层。
    // 只留 4 个：兜底是「锦上添花」，弱网时 9 个候选 × 12s 超时能把网络拖两分钟。
    function earthCandidates() {
      var list = [];
      for (var i = 0; i < EARTH_LAYERS.length; i++) {
        list.push({ day: earthDayOffset(0), layer: EARTH_LAYERS[i], age: 0 });
      }
      list.push({ day: earthDayOffset(1), layer: EARTH_LAYERS[0], age: 1 });
      return list;
    }
    // 太阳直射点经度：UTC 12 点时在 0°（格林尼治），每小时西移 15°
    function earthSubsolarLon(d) {
      var t = d || new Date();
      var utcH = t.getUTCHours() + t.getUTCMinutes() / 60 + t.getUTCSeconds() / 3600;
      var lon = (12 - utcH) * 15;
      while (lon > 180) lon -= 360;
      while (lon < -180) lon += 360;
      return lon;
    }
    // 以正午经线为中心取景；越过 ±180 时整体平移（不缩窄）
    function earthBboxNow(d) {
      var lon = earthSubsolarLon(d);
      var lo = lon - EARTH_LON_SPAN / 2, hi = lon + EARTH_LON_SPAN / 2;
      if (lo < -180) { lo = -180; hi = -180 + EARTH_LON_SPAN; }
      if (hi > 180) { lo = 180 - EARTH_LON_SPAN; hi = 180; }
      return EARTH_LAT_MIN + ',' + Math.round(lo * 100) / 100 + ',' + EARTH_LAT_MAX + ',' + Math.round(hi * 100) / 100;
    }
    function earthUrlFor(day, d, layer) {
      return 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap'
        + '&LAYERS=' + (layer || EARTH_LAYERS[0]) + '&CRS=EPSG:4326&BBOX=' + earthBboxNow(d)
        + '&WIDTH=' + EARTH_W + '&HEIGHT=' + EARTH_H + '&FORMAT=image/jpeg&TIME=' + day;
    }
    // 缓存按「天 + 整点小时」做键：一小时内的多次打开都用同一张缓存图，只有跨到下一个整点才拉新图
    function earthBucket(d) {
      var t = d || new Date();
      return t.getUTCHours();
    }
    // 图源浅淡说明：风云四号B + 北京时间
    function updateEarthCredit() {
      var el = document.getElementById('earthCredit');
      if (!el) return;
      var bj = beijingTimeText(fy4PickedTime) || ('更新于 ' + beijingTimeOfStamp(Date.now()));
      el.textContent = '🌍 图源 国家卫星气象中心（风云四号B 中国区域真彩云图）· ' + bj +
        ' · 点击去 Zoom Earth 看实时卫星图';
      el.title = '点击打开 zoom.earth/maps/satellite 实时卫星图';
    }
    // 地球实况背景时给 body 打标记（决定两层背景、模糊铺底与取景）
    function syncEarthClass() {
      document.body.classList.toggle('wp-earth', wallpaperType === 'earth' && !!earthWallpaperUrl);
      updateEarthCredit();
    }
    // 点图源说明 → 打开 Zoom Earth 的实时卫星图（用户指定：https://zoom.earth/maps/satellite/）
    function openEarthSource() {
      window.open(ZOOM_EARTH_SITE, '_blank', 'noopener');
    }
    // Zoom Earth 实时卫星图网址（图源说明点一下就去这里）
    var ZOOM_EARTH_SITE = 'https://zoom.earth/maps/satellite/';
    // ---------- 右上角时钟：日期 / 周几 / 本地时间（纯本地，零网络；只在值真变了才写 DOM）----------
    var WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    var clockLastText = { date: '', week: '', time: '' };
    function tickHeroClock() {
      if (document.hidden) return;                    // 标签页不可见就别烧 CPU
      var d = new Date();
      var month = d.getMonth() + 1, day = d.getDate();
      var dateEl = document.getElementById('hcDate');
      var weekEl = document.getElementById('hcWeek');
      var timeEl = document.getElementById('hcTime');
      if (dateEl) {
        var ds = (month < 10 ? '0' : '') + month + '月' + (day < 10 ? '0' : '') + day + '日';
        if (ds !== clockLastText.date) { clockLastText.date = ds; dateEl.textContent = ds; }
      }
      if (weekEl) {
        var ws = WEEK_CN[d.getDay()];
        if (ws !== clockLastText.week) { clockLastText.week = ws; weekEl.textContent = ws; }
      }
      if (timeEl) {
        var hh = d.getHours(), mi = d.getMinutes(), ss = d.getSeconds();
        var ts = (hh < 10 ? '0' : '') + hh + ':' + (mi < 10 ? '0' : '') + mi + ':' + (ss < 10 ? '0' : '') + ss;
        if (ts !== clockLastText.time) { clockLastText.time = ts; timeEl.textContent = ts; }
      }
    }
    tickHeroClock();
    setInterval(tickHeroClock, 1000);
    // 切回标签页时立即补一次，不用等下一秒
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) tickHeroClock();
    });
    function blobToDataUrl(blob) {
      return new Promise(function(res, rej) {
        var fr = new FileReader();
        fr.onload = function() { res(fr.result); };
        fr.onerror = function() { rej(fr.error); };
        fr.readAsDataURL(blob);
      });
    }
    // 判断一张图是不是「有效影像」：GIBS 对还没出全的日期会返回整张全黑（约 1KB 的纯黑 JPEG），
    // 这里画到 64×64 小画布上量亮度与纯黑占比（图片来自 fetch 的 blob → dataURL，画布不会被污染）
    function earthImageUsable(dataUrl) {
      return new Promise(function(resolve) {
        var img = new Image();
        img.onload = function() {
          try {
            var c = document.createElement('canvas');
            c.width = 64; c.height = 64;
            var ctx = c.getContext('2d');
            ctx.drawImage(img, 0, 0, 64, 64);
            var px = ctx.getImageData(0, 0, 64, 64).data;
            var sum = 0, dark = 0, n = 64 * 64;
            for (var i = 0; i < px.length; i += 4) {
              var v = (px[i] + px[i + 1] + px[i + 2]) / 3;
              sum += v;
              if (v < 8) dark++;
            }
            var mean = sum / n;
            resolve(mean >= 12 && dark / n <= 0.8);
          } catch(e) {
            resolve(true);        // 读不到像素就不拦（宁可显示，也别空白）
          }
        };
        img.onerror = function() { resolve(false); };
        img.src = dataUrl;
      });
    }
    // 从候选（今天→昨天→前天，每层三个产品）里挑第一张「有内容」的图（气象局取不到时的兜底）
    function fetchEarthImage(forceDay) {
      var bucket = earthBucket();
      var candidates = forceDay
        ? [{ day: forceDay, layer: EARTH_LAYERS[0], age: 0 }].concat(earthCandidates())
        : earthCandidates();
      function tryAt(i) {
        if (i >= candidates.length) return Promise.reject(new Error('no-usable-image'));
        var cand = candidates[i];
        var url = earthUrlFor(cand.day, undefined, cand.layer);
        return fetchT(url, { mode: 'cors', cache: 'force-cache' }, 12000)
          .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
          .then(function(blob) {
            return blobToDataUrl(blob).then(function(dataUrl) {
              return earthImageUsable(dataUrl).then(function(ok) {
                if (!ok) throw new Error('blank');
                setEarthUrl(URL.createObjectURL(blob));
                earthPickedDay = cand.day;
                earthPickedLayer = cand.layer;
                try {
                  idbSet(EARTH_KEY, { ver: EARTH_VER, day: cand.day, bucket: bucket,
                                      layer: cand.layer, blob: blob, ts: Date.now() });
                } catch(e) {}
                if (wallpaperType === 'earth') scheduleHeroBgApply();
                return earthWallpaperUrl;
              });
            });
          })
          .catch(function() { return tryAt(i + 1); });
      }
      return tryAt(0).catch(function() {
        // 全部拿不到：退回直接引用 URL（浏览器 HTTP 缓存同样能加速），失败则保持原壁纸
        if (!earthWallpaperUrl) {
          var url = earthUrlFor(earthDay(), undefined, EARTH_LAYERS[0]);
          earthWallpaperUrl = url;
          if (wallpaperType === 'earth') applyHeroBg();
        }
        return '';
      });
    }
    // 取最新一帧：优先气象局 FY-4B（15 分钟级），失败再退 NASA GIBS 当日真彩
    // 整条链路的总超时：超过就不再等（各请求自身也有超时，这里防「串行叠加」）
    var EARTH_TOTAL_TIMEOUT = 25000;
    var earthGiveUpUntil = 0;
    function withDeadline(promise, ms) {
      return new Promise(function(resolve, reject) {
        var done = false;
        var timer = setTimeout(function() { if (!done) { done = true; reject(new Error('earth-timeout')); } }, ms);
        promise.then(function(v) { if (!done) { done = true; clearTimeout(timer); resolve(v); } },
                     function(e) { if (!done) { done = true; clearTimeout(timer); reject(e); } });
      });
    }
    function refreshEarthWallpaper() {
      if (earthGiveUpUntil && Date.now() < earthGiveUpUntil) {
        return Promise.resolve('');          // 刚失败过：10 分钟内不再刷网络
      }
      return withDeadline(fetchFy4Image().catch(function(err) {
        // 注意：这里一旦静默退回 NASA，看起来就像"图源不对"，所以留一条显眼的日志
        if (window.console && console.warn) console.warn('[earth] FY-4B 取图失败，退回 NASA GIBS：', err && err.message);
        return fetchEarthImage(earthDay());
      }), EARTH_TOTAL_TIMEOUT).catch(function(err) {
        earthGiveUpUntil = Date.now() + 10 * 60 * 1000;
        if (window.console && console.warn) console.warn('[earth] 取图整体失败，10 分钟内不再重试：', err && err.message);
        return '';
      });
    }
    // 启动：先读 IndexedDB 缓存秒开；
    // 缓存超过 10 分钟（FY-4B 是 15 分钟一帧）就静默换成更新的一帧
    function initEarthWallpaper() {
      var bucket = earthBucket();
      var afterCache = function(cached) {
        // 新缓存存 Blob；旧缓存是 base64 dataUrl（ver 不匹配就自动作废，这里只做兼容兜底）
        if (cached && cached.ver === EARTH_VER && (cached.blob instanceof Blob || cached.dataUrl)) {
          if (cached.blob instanceof Blob) setEarthUrl(URL.createObjectURL(cached.blob));
          else setEarthUrl(cached.dataUrl);
          earthPickedDay = cached.day || '';
          earthPickedLayer = cached.layer || '';
          fy4PickedTime = cached.time || '';
          if (wallpaperType === 'earth') scheduleHeroBgApply();
          var fresh = cached.ts && (Date.now() - cached.ts) < 10 * 60 * 1000;
          if (fresh && cached.bucket === bucket) return;      // 10 分钟内 → 直接用缓存
        }
        refreshEarthWallpaper();
      };
      try {
        idbGet(EARTH_KEY).then(afterCache).catch(refreshEarthWallpaper);
      } catch(e) { refreshEarthWallpaper(); }
      // 页面长时间开着：每 5 分钟对一次表，换最新一帧（跨整点或超过 10 分钟都会刷新）
      if (window.__earthTimer) { clearInterval(window.__earthTimer); }
      window.__earthTimer = setInterval(function() {
        if (wallpaperType !== 'earth') return;
        idbGet(EARTH_KEY).then(function(c) {
          var stale = !c || c.ver !== EARTH_VER || !c.ts || (Date.now() - c.ts) > 10 * 60 * 1000 ||
                      c.bucket !== earthBucket();
          if (stale) refreshEarthWallpaper();
        }).catch(function() {});
      }, 5 * 60 * 1000);
    }
    window.initEarthWallpaper = initEarthWallpaper;

    function initWallpaper() {
      // 默认壁纸 = 「默认壁纸」（静态 hero_bg_light.jpg）。用户 2026-10-17 定稿：
      // 新访客与「之前被自动迁到地球实况」的老访客都回到默认壁纸；五种壁纸选项全保留，想用卫星图点一下即可。
      var WP_VER = '36';                       // 默认值换代版本号（只做一次性迁移）
      var KNOWN = { 'default': 1, 'earth': 1, 'bing': 1, 'custom': 1, 'local': 1 };
      var saved = null;
      try { saved = localStorage.getItem('nav_wallpaper'); } catch(e) {}
      try {
        // 旧代号迁移：zoom（已删除的卫星平面图）/ fy4（已并入地球实况）→ earth
        if (saved === 'zoom' || saved === 'fy4') {
          saved = 'earth';
          try { localStorage.setItem('nav_wallpaper', 'earth'); } catch(e) {}
        }
        try { localStorage.removeItem('nav_earth_scope'); } catch(e) {}
        // 一次性换代：把「没有键」和「被自动写成 earth」的都恢复成默认壁纸。
        // 之后用户在设置里改的任何选择（含重新选地球实况）都会保留，因为版本号已经写好了。
        if (localStorage.getItem('nav_wp_ver') !== WP_VER) {
          if (!saved || saved === 'earth' || !KNOWN[saved]) {
            saved = 'default';
            try { localStorage.setItem('nav_wallpaper', 'default'); } catch(e) {}
          }
          try { localStorage.setItem('nav_wp_ver', WP_VER); } catch(e) {}
        }
        // 老规则保留：旧的默认值 bing（用户没主动改过）→ 默认壁纸
        var migrated = localStorage.getItem('nav_wp_default_migrated') === '1';
        if (saved === 'bing' && !migrated) saved = 'default';
        if (!KNOWN[saved]) saved = 'default';
        wallpaperType = saved;
        useBingWallpaper = (saved === 'bing');
        try { localStorage.setItem('nav_wallpaper', saved); } catch(e) {}   // 保证键里永远是实际生效的值
        // 老键保留写一次，便于旧版本回退时也能读到同一个选择
        try { localStorage.setItem('nav_wp_default_migrated', '1'); } catch(e) {}
        try { localStorage.setItem('nav_wp_earth_ver', '1'); } catch(e) {}
      } catch(e) {
        wallpaperType = 'default';
        useBingWallpaper = false;
      }
      try {
        var cached = localStorage.getItem('nav_bing_wp_url');
        if (cached) { bingWallpaperUrl = cached; }
      } catch(e) {}
      try {
        var cwp = localStorage.getItem('nav_custom_wp');
        if (cwp) { customWallpaperUrl = cwp; }
      } catch(e) {}
      // 本地壁纸不再同步从 localStorage 读（旧版把几 MB 的 base64 存在那儿，每次刷新都要解析一遍）
      // 统一走 IndexedDB 的 Blob + object URL：异步恢复，并等首屏画完再贴图
      if (typeof restoreLocalWallpaperAsync === 'function') {
        try { restoreLocalWallpaperAsync(); } catch(e) {}
      }
      applyHeroBg();
      if (wallpaperType === 'bing') fetchBingWallpaper();
      if (wallpaperType === 'earth') runWhenIdle(initEarthWallpaper, 400);   // 卫星图不着急，别跟首屏抢网络
      if (wallpaperType === 'fy4') initFy4Wallpaper();
    }

    initWallpaper();

    var desktopOnlyEngines = ['google','perplexity','sogouweixin','sogouzhihu','gscholar2','xmol','googlescholar','reddit','buaaebsco','baiduxueshu','douyin','xiaohongshu','bilibili','zhihu','weibo','github','baidumap','wikihow','scihub','kiphub','msacademic'];

    function hiddenEnginesSetter(val, hidden) {
      hiddenEngines[val] = hidden;
      try { localStorage.setItem('nav_hidden_engines', JSON.stringify(hiddenEngines)); } catch(e) {}
      applySettings();
    }

    function applySettings() {
      document.querySelectorAll('.search-engines .engine-option').forEach(function(el) {
        var radio = el.querySelector('input[type="radio"]');
        var val;
        if (radio) {
          val = radio.value;
        } else if (el.classList.contains('engine-custom-btn')) {
          val = 'custom';
        } else {
          return;
        }
        if (hiddenEngines[val] === true) {
          el.style.display = 'none';
          if (desktopOnlyEngines.indexOf(val) >= 0) el.classList.add('desktop-only');
        } else if (hiddenEngines[val] === false) {
          el.classList.remove('desktop-only');
          el.style.display = '';
        } else {
          if (desktopOnlyEngines.indexOf(val) >= 0) { el.classList.add('desktop-only'); el.style.display = ''; }
          else { el.style.display = ''; }
        }
      });
      var freqSec = document.getElementById('frequentSection');
      if (freqSec) {
        if (freqVisible) { freqSec.classList.add('visible'); }
        else { freqSec.classList.remove('visible'); }
      }
      document.querySelectorAll('.category-section').forEach(function(sec) {
        sec.style.display = hiddenCategories[sec.id] ? 'none' : '';
      });
      document.querySelectorAll('.sidebar a').forEach(function(a) {
        var href = a.getAttribute('href');
        if (!href || href === '#') return;
        var id = href.replace('#', '');
        a.style.display = hiddenCategories[id] ? 'none' : '';
      });
      document.querySelectorAll('.mobile-tab').forEach(function(a) {
        var href = a.getAttribute('href');
        if (!href || href === '#') return;
        var id = href.replace('#', '');
        a.style.display = hiddenCategories[id] ? 'none' : '';
      });
    }

    function openSettings() {
      document.getElementById('settingsOverlay').classList.add('visible');
      // 锁住页面滚动：既避免背景跟着滚，也让遮罩层占满视口宽度（面板才能真正居中）
      document.body.classList.add('modal-open');
      refreshSettingsUi();
    }

    function closeSettings() {
      document.getElementById('settingsOverlay').classList.remove('visible');
      document.body.classList.remove('modal-open');
    }

    // --- Custom Right-Edge Tools ---
    // 右侧快捷工具固定顺序（用户指定，从上到下）：
    // 网页微信助手 → 在线WPS → 待办 → 番茄钟 → 单位换算 → 临时记事本 → 工具箱 → 计算器 → 临时画图
    // 天气已按用户要求移到首屏右上角（🌤️，在 🌙 主题切换正下方）
    var rtBuiltins = [
      { icon: '💬', name: '网页微信助手', url: 'https://filehelper.weixin.qq.com/', enabled: true },
      { icon: '📄', name: '在线WPS', url: 'https://365.kdocs.cn', enabled: true },
      { icon: '📋', name: '待办', action: 'toggleTodoWindow()', enabled: true },
      { icon: '🍅', name: '番茄钟', action: 'togglePomoWindow()', enabled: true },
      { icon: '📐', name: '单位换算', action: 'toggleConvWindow()', enabled: true },
      { icon: '📝', name: '临时记事本', action: 'toggleNoteWindow()', enabled: true },
      { icon: '🧰', name: '工具箱', url: 'https://txttool.cn/', enabled: true },
      { icon: '🔢', name: '计算器', url: 'https://www.desmos.com/scientific?lang=zh-CN', enabled: true },
      { icon: '✏️', name: '临时画图', url: 'https://app.diagrams.net/', enabled: true }
    ];
    // 旧名称 → 新名称（保留老用户已存的左右侧别设置与自定义顺序）
    var RT_RENAMES = { '微信传输': '网页微信助手', '待办事项': '待办', '记事本': '临时记事本', '画图': '临时画图' };

    function loadRtCustom() {
      try { return JSON.parse(localStorage.getItem('nav_rt_custom_tools') || '[]'); } catch(e) { return []; }
    }
    function saveRtCustom(list) {
      try { localStorage.setItem('nav_rt_custom_tools', JSON.stringify(list)); } catch(e) {}
    }
    function rtAddCustom() {
      // moved to config-editor
    }
    function rtResetCustom() {
      // moved to config-editor
    }

    function renderRtCustomList() {
      // moved to config-editor
    }
    function rtCustChange(idx) {
      // moved to config-editor
    }
    function rtCustToggle(idx, el) {
      // moved to config-editor
    }
    function rtCustDel(idx) {
      // moved to config-editor
    }

    // 每个工具一个侧别：'right'（默认）/ 'left'；内置键用 rtb:<名称>，自定义键用 rtc:<id>
    function rtSideMap() {
      try { return JSON.parse(localStorage.getItem('nav_rt_sides') || '{}') || {}; } catch(e) { return {}; }
    }
    // 兼容改名：老键 rtb:微信传输 / rtb:待办事项 / rtb:记事本 / rtb:画图 仍能读到侧别设置
    function rtSideOf(entry) {
      var m = rtSideMap();
      var v = m[entry.key];
      if (v === undefined && entry.name) {
        for (var oldName in RT_RENAMES) {
          if (RT_RENAMES[oldName] === entry.name) {
            var ov = m['rtb:' + oldName];
            if (ov !== undefined) { v = ov; break; }
          }
        }
      }
      return v === 'left' ? 'left' : 'right';
    }
    function rtCollectTabs() {
      var custom = loadRtCustom();
      var list = [];
      var seenUrls = {};
      rtBuiltins.forEach(function(t) {
        if (!t.enabled) return;
        if (t.url) seenUrls[t.url] = true;
        list.push({ key: 'rtb:' + t.name, icon: t.icon, name: t.name, url: t.url, action: t.action });
      });
      custom.forEach(function(t, i) {
        if (t.enabled === false) return;
        if (seenUrls[t.url]) return;
        seenUrls[t.url] = true;
        list.push({ key: 'rtc:' + (t.id || t.name || i), icon: t.icon || '🔗',
                    name: t.name || '自定义', url: t.url });
      });
      return list;
    }
    function rtTabHtml(t) {
      var oc = t.action ? t.action : ("rtGo('" + String(t.url || '').replace(/'/g, "\\'") + "')");
      return '<div class="rt-tab" data-tool="' + String(t.name).replace(/"/g, '&quot;') + '" onclick="' + oc +
             '" title="' + String(t.name).replace(/"/g, '&quot;') + '">' +
             t.icon + '<span class="rt-label">' + t.name + '</span></div>';
    }
    function renderRtEdge() {
      var edge = document.getElementById('rtEdge');
      var edgeL = document.getElementById('rtEdgeLeft');
      var enabled = true;
      try { enabled = localStorage.getItem('nav_rt_enabled') !== '0'; } catch(e) {}
      var left = '', right = '';
      if (enabled) {
        rtCollectTabs().forEach(function(t) {
          if (rtSideOf(t) === 'left') left += rtTabHtml(t);
          else right += rtTabHtml(t);
        });
      }
      // 工具图标写进内层 .rt-tabs：内层负责「高度封顶 + 滚动」，外层只负责贴边居中定位。
      // 这样工具再多，第一条也永远在右上角时钟区下方，不会和日期/天气叠在一起。
      var tabsR = document.getElementById('rtEdgeTabs');
      var tabsL = document.getElementById('rtEdgeLeftTabs');
      if (tabsR) tabsR.innerHTML = right; else if (edge) edge.innerHTML = right;
      if (tabsL) tabsL.innerHTML = left; else if (edgeL) edgeL.innerHTML = left;
      document.body.classList.toggle('rt-left-on', !!left);
      document.body.classList.toggle('rt-right-on', !!right);
      applyTodoBadge();
      var hint = document.getElementById('rtSideHint');
      if (hint) {
        hint.textContent = '每个工具可以单独选择显示在左侧或右侧（在配置编辑器的「🔗 快捷工具」里逐项设置）。同一工具只会出现在一侧，不会重复。';
      }
    }
    // 未完成待办在工具条上的醒目标记（全部完成 / 没有待办时不显示）
    function activeTodoCount() {
      try {
        var items = JSON.parse(localStorage.getItem('nav_todo_items') || '[]') || [];
        return items.filter(function(t) { return t && !t.completed; }).length;
      } catch(e) { return 0; }
    }
    function applyTodoBadge() {
      var n = activeTodoCount();
      document.querySelectorAll('.rt-edge .rt-tab').forEach(function(tab) {
        var isTodo = tab.getAttribute('data-tool') === '待办';   // 用 data-tool 判断，避免被改过的 title 影响
        var old = tab.querySelector('.rt-badge');
        if (!isTodo) { if (old) old.remove(); tab.classList.remove('rt-has-todo'); return; }
        tab.classList.toggle('rt-has-todo', n > 0);
        if (n > 0) {
          if (!old) {
            old = document.createElement('span');
            old.className = 'rt-badge';
            tab.appendChild(old);
          }
          old.textContent = n > 99 ? '99+' : String(n);
          tab.setAttribute('title', '待办（还有 ' + n + ' 项未完成）');
        } else {
          if (old) old.remove();
          tab.setAttribute('title', '待办');
        }
      });
    }
    window.applyTodoBadge = applyTodoBadge;

    function rtToggleGlobal(val, el) {
      // moved to config-editor
    }

    function rtGo(url) {
      window.open(url, '_blank', 'noopener');
    }

    function refreshSettingsUi() {
      // 全部走空值保护：设置面板的部分区块可能被删改，不能因为单个元素缺失中断整个刷新
      var $ = function(id) { return document.getElementById(id); };
      var on = function(id, cond) { var el = $(id); if (el) el.classList.toggle('on', !!cond); };
      var show = function(id, cond) { var el = $(id); if (el) el.style.display = cond ? '' : 'none'; };

      on('setWpBing', wallpaperType === 'bing');
      on('setWpDefault', wallpaperType === 'default');
      on('setWpCustom', wallpaperType === 'custom');
      on('setWpLocal', wallpaperType === 'local');
      on('setWpEarth', wallpaperType === 'earth');
      var wpHintEl = $('wpStatusHint');
      if (wpHintEl) wpHintEl.textContent = wallpaperHintText(wallpaperType);
      show('randomWpBtn', wallpaperType === 'bing');
      show('customWpInput', wallpaperType === 'custom');
      var localInput = $('localWpInput');
      if (localInput && localInput.nextElementSibling) {
        localInput.nextElementSibling.style.display = (wallpaperType === 'local') ? '' : 'none';
      }
      var cw = $('customWpInput');
      if (cw && wallpaperType === 'custom') cw.value = customWallpaperUrl;
      try {
        var wpc = $('wpExportCheckbox');
        if (wpc) wpc.checked = localStorage.getItem('nav_wp_export') === '1';
      } catch(e) {}
      show('wpExportRow', wallpaperType === 'local');
      var isDark = document.body.classList.contains('dark');
      on('setThemeLight', !isDark);
      on('setThemeDark', isDark);
      on('setNavShow', navFoldMode === 'show');
      on('setNavHide', navFoldMode === 'hide');
      on('setNavAuto', navFoldMode === 'autofold');
      applySearchModeUi();      // 搜索模式 chip + 说明文案
      applySearchKeepUi();      // 搜索后是否清空输入框
      applySearchAdvUi();       // 高级搜索 chip/输入框回显
      refreshCfgUrlUi();        // 「更新已保存的网络配置 / 忘记地址」按钮回显
      on('setCleanOn', cleanUi);
      on('setCleanOff', !cleanUi);
      var ft = $('setFreqToggle');
      if (ft) ft.classList.toggle('on', freqVisible);
      var fc = $('setFreqCount');
      if (fc) fc.value = freqCount;
      renderSettingsEngines();
      renderSettingsCategories();
      renderSettingsCatOrder();
      applyCatOrderLockUi();
      refreshExtSettingsUi();
    }

    function renderSettingsEngines() {
      var row = document.getElementById('settingsEngineRow');
      if (!row) return;
      // 引擎清单直接按搜索框下的实际引擎生成（标签也从那里取），新增引擎不会再漏进设置面板
      var engines = ALL_ENGINE_IDS.concat(['custom']).map(function(id) {
        var box = document.querySelector('.search-engines .engine-option input[value="' + id + '"]');
        var host = box ? box.closest('.engine-option') : (id === 'custom' ? document.getElementById('engineCustomBtn') : null);
        var label = host ? (host.textContent || '').trim() : id;
        return { val: id, label: label || id };
      });
      try {
        var customEngines = JSON.parse(localStorage.getItem('nav_custom_engines') || '{}');
        Object.keys(customEngines).forEach(function(k) {
          engines.push({val:k, label: customEngines[k].label || ('🔍 ' + customEngines[k].name)});
        });
      } catch(e) {}
      row.innerHTML = engines.map(function(e) {
        var on = !hiddenEngines[e.val];
        return '<span class="settings-chip' + (on ? ' on' : '') + '" onclick="toggleEngine(\'' + e.val + '\',this)">' + e.label + '</span>';
      }).join('');
    }

    function renderSettingsCategories() {
      var row = document.getElementById('settingsCatRow');
      var cats = [
        {id:'cat-favorites',label:'⭐ 收藏网址'},{id:'cat-general',label:'综合导航'},
        {id:'cat-ai',label:'AI大模型'},
        {id:'cat-buaa',label:'北航网站'},
        {id:'cat-academic',label:'学术检索'},
        {id:'cat-tech',label:'技术与交流'},
        {id:'cat-map',label:'地图天气'},
        {id:'cat-tool',label:'效率工具'},
        {id:'cat-translate',label:'翻译工具'},
        {id:'cat-learn',label:'学习提升'},
        {id:'cat-entertainment',label:'影音娱乐'},
        {id:'cat-efficiency',label:'效率提升'},
        {id:'cat-drive',label:'cat-drive'},
        {id:'cat-data',label:'数据与统计'},
        {id:'cat-tutorial',label:'学习教程'},
        {id:'cat-aero',label:'航空与科普'},
        {id:'cat-tradition',label:'传统文化'},
        {id:'cat-navweb',label:'导航网站'},
        {id:'cat-mirror',label:'镜像网站'},
        {id:'cat-cloud',label:'cat-cloud'}
      ];
      try {
        var customCats = JSON.parse(localStorage.getItem('nav_custom_cats') || '[]');
        customCats.forEach(function(c) { cats.push({id:c.id, label:c.name}); });
      } catch(e) {}
      row.innerHTML = cats.map(function(c) {
        var on = !hiddenCategories[c.id];
        return '<span class="settings-chip' + (on ? ' on' : '') + '" onclick="toggleCategoryVis(\'' + c.id + '\',this)">' + c.label + '</span>';
      }).join('');
    }

    function toggleEngine(val, el) {
      if (hiddenEngines[val]) { hiddenEngines[val] = false; el.classList.add('on'); }
      else { hiddenEngines[val] = true; el.classList.remove('on'); }
      try { localStorage.setItem('nav_hidden_engines', JSON.stringify(hiddenEngines)); } catch(e) {}
      applySettings();
    }

    function toggleCategoryVis(id, el) {
      if (hiddenCategories[id]) { delete hiddenCategories[id]; el.classList.add('on'); }
      else { hiddenCategories[id] = true; el.classList.remove('on'); }
      try { localStorage.setItem('nav_hidden_cats', JSON.stringify(hiddenCategories)); } catch(e) {}
      applySettings();
    }

    function wallpaperHintText(type) {
      if (type === 'default') return '<strong>默认壁纸</strong>（当前默认）：导航页自带的静态背景 <code>assets/hero_bg_light.jpg</code>，<strong>不联网、最快</strong>。想要真实卫星云图，点旁边的「🌍 地球实况」。';
      if (type === 'local') return '本地图片仅存在本机浏览器存储中，导出配置时会留空';
      if (type === 'custom') return '请输入网络图片URL，支持JPG/PNG/GIF';
      if (type === 'earth') return '地球实况：国家卫星气象中心 <strong>风云四号B「中国区域真彩云图」</strong>，<strong>每 15 分钟一帧</strong>、每次打开都取最新那帧；缩略图 1719×1080 约 880KB，本地缓存 10 分钟；取不到时退回 NASA 当日真彩。右下角显示北京时间的观测时刻。';
      if (type === 'fy4') return '实时卫星图：<strong>风云四号B 全圆盘云图（真彩合成）</strong>——整个地球一颗球（1374×1489，约 400KB，官网实时刷新）；与「🌍 地球实况」的中国区域云图不重复。<strong>整张图完整显示</strong>（用 contain，不裁切），空白处由同一张图放大模糊铺底；右下角显示北京时间。';
      if (type === 'bing') return '在线风景壁纸从必应每日图库随机取一张，可点「换一张」';
      return '网络图片URL用于导入/导出配置；本地图片仅存在本机浏览器中';
    }
    function setWallpaper(type, el) {
      wallpaperType = type;
      useBingWallpaper = (type === 'bing');
      document.getElementById('setWpBing').classList.toggle('on', type === 'bing');
      document.getElementById('setWpDefault').classList.toggle('on', type === 'default');
      document.getElementById('setWpCustom').classList.toggle('on', type === 'custom');
      document.getElementById('setWpLocal').classList.toggle('on', type === 'local');
      var elEarth = document.getElementById('setWpEarth');
      if (elEarth) elEarth.classList.toggle('on', type === 'earth');
      document.getElementById('customWpInput').style.display = (type === 'custom') ? '' : 'none';
      document.getElementById('localWpInput').nextElementSibling.style.display = (type === 'local') ? '' : 'none';
      document.getElementById('wpExportRow').style.display = (type === 'local') ? '' : 'none';
      document.getElementById('randomWpBtn').style.display = (type === 'bing') ? '' : 'none';
      document.getElementById('wpStatusHint').textContent = wallpaperHintText(type);
      applyHeroBg();
      if (type === 'bing' && !bingWallpaperUrl) { fetchBingWallpaper(); }
      if (type === 'earth' && !earthWallpaperUrl) { initEarthWallpaper(); }
      try { localStorage.setItem('nav_wallpaper', type); } catch(e) {}
    }

    function saveCustomWp() {
      var url = document.getElementById('customWpInput').value.trim();
      if (url) {
        customWallpaperUrl = url;
        try { localStorage.setItem('nav_custom_wp', url); } catch(e) {}
      } else {
        customWallpaperUrl = '';
        try { localStorage.removeItem('nav_custom_wp'); } catch(e) {}
      }
    }

    // 选本地图片：直接把 File 交给存储层 —— 不再 FileReader → 十几 MB 的 base64 字符串，
    // 也不再把它写进 CSSOM / localStorage；解码缩放走异步编码，先让提示上屏再干活。
    function handleLocalWp(e) {
      var file = e.target && e.target.files && e.target.files[0];
      if (e.target) { try { e.target.value = ''; } catch(err) {} }
      if (!file) return;
      var hint = document.getElementById('wpStatusHint');
      if (file.size > LOCAL_WP_MAX_RAW) {
        if (hint) hint.textContent = '⚠️ 图片太大（约 ' + Math.round(file.size / 1048576) + 'MB），请选 40MB 以内的图片';
        return;
      }
      if (wallpaperType !== 'local') {
        wallpaperType = 'local';
        useBingWallpaper = false;
        ['setWpBing', 'setWpDefault', 'setWpCustom', 'setWpEarth', 'setWpLocal'].forEach(function(id) {
          var el = document.getElementById(id);
          if (el) el.classList.toggle('on', id === 'setWpLocal');
        });
        var ci = document.getElementById('customWpInput');
        if (ci) ci.style.display = 'none';
        var li = document.getElementById('localWpInput');
        if (li && li.nextElementSibling) li.nextElementSibling.style.display = '';
        var wr = document.getElementById('wpExportRow');
        if (wr) wr.style.display = '';
        try { localStorage.setItem('nav_wallpaper', 'local'); } catch(err) {}
      }
      if (hint) hint.textContent = '正在处理图片…（原始 ' + Math.round(file.size / 1024) + 'KB）';
      setTimeout(function() {          // 让提示先画出来，再做解码/缩放，避免"点完像卡住"
        saveLocalWallpaper(file, function(err, blob) {
          var h = document.getElementById('wpStatusHint');
          if (!h) return;
          h.textContent = err
            ? '⚠️ 保存失败：' + (err.message || '浏览器存储空间不足') + '（刷新后可能丢失）'
            : '✅ 已启用本地壁纸：' + file.name + '（处理后 ' + Math.round(blob.size / 1024) + 'KB，重启浏览器仍生效）';
        });
      }, 30);
    }

    function handleImportFile(e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(ev) {
        processImportJson(ev.target.result);
      };
      reader.readAsText(file, 'UTF-8');
      e.target.value = '';
    }

    // ===== 记住「配置文件的网络地址」：导出后可一键记住，下次一键更新，也可随时忘掉/替换 =====
    var CFG_URL_KEY = 'nav_cfg_url';
    var CFG_URL_AT_KEY = 'nav_cfg_url_at';

    function getSavedCfgUrl() {
      try {
        var u = localStorage.getItem(CFG_URL_KEY) || '';
        return /^https?:\/\//.test(u) ? u : '';
      } catch(e) { return ''; }
    }
    function savedCfgUrlAt() {
      try { return parseInt(localStorage.getItem(CFG_URL_AT_KEY) || '0', 10) || 0; } catch(e) { return 0; }
    }
    function setSavedCfgUrl(url) {
      url = String(url || '').trim();
      if (!/^https?:\/\//.test(url)) return false;
      try {
        localStorage.setItem(CFG_URL_KEY, url);
        localStorage.setItem(CFG_URL_AT_KEY, String(Date.now()));
      } catch(e) { return false; }
      refreshCfgUrlUi();
      return true;
    }
    function forgetSavedCfgUrl(skipConfirm) {
      if (!getSavedCfgUrl()) { refreshCfgUrlUi(); return; }
      if (!skipConfirm && !confirm('只是忘掉这个网络地址（本机配置不会变），之后想用再点「🌐 导入网络文件」重新填即可。\n\n确定忘记吗？')) return;
      try {
        localStorage.removeItem(CFG_URL_KEY);
        localStorage.removeItem(CFG_URL_AT_KEY);
      } catch(e) {}
      refreshCfgUrlUi();
    }
    // 设置面板里的「更新 / 忘记」按钮与地址回显
    function refreshCfgUrlUi() {
      var url = getSavedCfgUrl();
      var row = document.getElementById('cfgUrlRow');
      var hint = document.getElementById('cfgUrlHint');
      var text = document.getElementById('cfgUrlText');
      var btnUp = document.getElementById('cfgUrlUpdateBtn');
      var btnDel = document.getElementById('cfgUrlForgetBtn');
      if (row) row.style.display = url ? '' : 'none';
      if (hint) hint.style.display = url ? '' : 'none';
      if (btnUp) btnUp.style.display = url ? '' : 'none';
      if (btnDel) btnDel.style.display = url ? '' : 'none';
      if (text) text.textContent = url || '';
      if (url) {
        var at = savedCfgUrlAt();
        var when = '';
        try {
          if (at) {
            var d = new Date(at);
            when = '（' + d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) +
                   ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ' 记录）';
          }
        } catch(e) {}
        var titleEl = document.getElementById('cfgUrlWhen');
        if (titleEl) titleEl.textContent = when;
      }
    }
    // 统一的网络抓取（带超时）：成功回调 cb(null, text)，失败 cb(msg)
    function fetchCfgText(url, cb) {
      try {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.timeout = 15000;
        xhr.onload = function() {
          if (xhr.status >= 200 && xhr.status < 300) cb(null, xhr.responseText);
          else cb('获取网络文件失败：HTTP ' + xhr.status);
        };
        xhr.onerror = function() { cb('网络请求失败，请检查网址是否正确、是否允许跨域访问'); };
        xhr.ontimeout = function() { cb('请求超时，请检查网络连接'); };
        xhr.send();
      } catch(err) {
        cb('请求发送失败：' + (err && err.message));
      }
    }

    function importFromUrl() {
      var saved = getSavedCfgUrl();
      var url = prompt('请输入JSON配置文件的网络地址（URL）：', saved || '');
      if (!url || !url.trim()) return;
      url = url.trim();
      if (!/^https?:\/\//.test(url)) { alert('请输入以 http:// 或 https:// 开头的合法网址'); return; }
      fetchCfgText(url, function(err, text) {
        if (err) { alert(err); return; }
        if (url !== saved && confirm('配置已抓到。是否记住这个网络地址？\n记下之后，「📥 导入/导出」里会多一个「🔄 更新已保存的网络配置」，以后一个按钮就能同步最新配置。')) {
          setSavedCfgUrl(url);
        }
        processImportJson(text);
      });
    }

    // 一键更新：重新读取已保存地址上的配置并覆盖本机设置（覆盖前先确认）
    function updateSavedCfg() {
      var url = getSavedCfgUrl();
      if (!url) { refreshCfgUrlUi(); alert('还没有保存网络地址。先导出配置，或点「🌐 导入网络文件」填一次地址。'); return; }
      if (!confirm('将从以下地址重新读取配置并覆盖本机设置：\n' + url + '\n\n确定更新吗？')) return;
      var hint = document.getElementById('cfgUrlHint');
      if (hint) hint.textContent = '正在读取 ' + url + ' …';
      fetchCfgText(url, function(err, text) {
        refreshCfgUrlUi();
        if (err) { alert(err + '\n\n（地址仍然记着，稍后可以再点一次「🔄 更新已保存的网络配置」）'); return; }
        processImportJson(text);
      });
    }

    // 导出成功后的「要不要记住这份配置的网络地址」
    function askRememberCfgUrlAfterExport() {
      var cur = getSavedCfgUrl();
      if (!confirm('配置文件已下载到本机。\n\n如果你已经（或准备）把它上传到某个网络地址（GitHub Raw / Gitee / 自己的服务器 / 云盘直链），可以现在把这个地址记下来 —— 以后在「📥 导入/导出」里点「🔄 更新已保存的网络配置」就能一键同步。\n\n现在记录地址吗？')) return;
      var url = prompt('请输入这份配置文件所在的网络地址（URL）：', cur || '');
      if (!url || !url.trim()) return;
      url = url.trim();
      if (!/^https?:\/\//.test(url)) { alert('请输入以 http:// 或 https:// 开头的合法网址（地址没有被记录）'); return; }
      if (setSavedCfgUrl(url)) alert('已记住这个地址：\n' + url + '\n\n以后在「📥 导入/导出」里点「🔄 更新已保存的网络配置」即可一键读取最新配置。');
    }

    function processImportJson(raw) {
      try {
        var data = JSON.parse(raw);
        if (!data || typeof data !== 'object') { alert('JSON格式不正确'); return; }
        var res = applyConfigData(data);
        if (!res.ok) { alert('配置内容不完整，未做任何修改'); return; }
        alert('导入成功！共 ' + res.msgs.join('、') + '。页面将刷新以应用配置。');
        location.reload();
      } catch(err) {
        alert('JSON解析失败：' + err.message);
      }
    }

    // 只应用配置数据（不弹窗、不刷新）：本地导入 / 网络导入 / 「更新已保存的网络配置」共用同一套规则，
    // 也让 UI 自检可以直接调用它验证「导出→导入」是否完整往返。
    function applyConfigData(data) {
      if (!data || typeof data !== 'object') return { ok: false, msgs: [] };
      try {
        var customCats = [];
        if (data.categories && Array.isArray(data.categories)) {
            data.categories.forEach(function(cat) {
              if (cat.id && cat.name) {
                customCats.push({
                  id: cat.id,
                  name: cat.name,
                  icon: cat.icon || '',
                  sites: (cat.sites || []).map(function(s) {
                    return {
                      name: s.name || '',
                      url: s.url || '',
                      desc: s.desc || '',
                      icon: s.icon || s.name.charAt(0),
                      iconColor: s.iconColor || 'blue'
                    };
                  })
                });
              }
            });
          }
          var customEngines = {};
          if (data.engines && Array.isArray(data.engines)) {
            data.engines.forEach(function(eng) {
              if (eng.id && eng.url) {
                customEngines[eng.id] = {
                  name: eng.name || eng.id,
                  url: eng.url,
                  label: eng.label || ('🔍 ' + (eng.name || eng.id)),
                  placeholder: eng.placeholder || ('输入关键词，' + (eng.name || eng.id) + '搜索...')
                };
              }
            });
          }
          localStorage.setItem('nav_custom_cats', JSON.stringify(customCats));
          localStorage.setItem('nav_custom_engines', JSON.stringify(customEngines));

          var addSites = data.addSites;
          if (addSites && typeof addSites === 'object') {
            try {
              var existingAdded = JSON.parse(localStorage.getItem('nav_added_sites') || '{}');
              Object.keys(addSites).forEach(function(catId) {
                if (!existingAdded[catId]) existingAdded[catId] = [];
                var newSites = addSites[catId];
                if (Array.isArray(newSites)) {
                  newSites.forEach(function(s) {
                    var exists = existingAdded[catId].some(function(x) { return x.name === s.name; });
                    if (!exists) existingAdded[catId].push(s);
                  });
                }
              });
              localStorage.setItem('nav_added_sites', JSON.stringify(existingAdded));
            } catch(e) {}
          }

          var removeSites = data.removeSites;
          if (removeSites && typeof removeSites === 'object') {
            try {
              var existingRemoved = JSON.parse(localStorage.getItem('nav_removed_sites') || '{}');
              Object.keys(removeSites).forEach(function(catId) {
                if (!existingRemoved[catId]) existingRemoved[catId] = [];
                var names = removeSites[catId];
                if (Array.isArray(names)) {
                  names.forEach(function(name) {
                    if (existingRemoved[catId].indexOf(name) < 0) existingRemoved[catId].push(name);
                  });
                }
              });
              localStorage.setItem('nav_removed_sites', JSON.stringify(existingRemoved));
            } catch(e) {}
          }

          // 收藏网址 + 使用频次（随配置一起迁移）
          if (Array.isArray(data.favorites)) {
            try { localStorage.setItem('nav_fav', JSON.stringify(data.favorites)); } catch(e) {}
          }
          if (data.favClicks && typeof data.favClicks === 'object') {
            try { localStorage.setItem('nav_fav_clicks', JSON.stringify(data.favClicks)); } catch(e) {}
          }

          if (typeof data._base64Wallpaper === 'string' && data._base64Wallpaper.length > 100) {
            // 导入的壁纸同样是 Blob 入库，绝不再落回 localStorage
            if (typeof saveLocalWallpaper === 'function') {
              try { saveLocalWallpaper(data._base64Wallpaper); } catch(e) {}
            }
          }
          var settings = data.settings;
          if (settings && typeof settings === 'object') {
            if (typeof settings.rtEnabled === 'boolean') {
              try { localStorage.setItem('nav_rt_enabled', settings.rtEnabled ? '1' : '0'); } catch(e) {}
            }
            if (settings.vpnMode === 'auto' || settings.vpnMode === 'off' || settings.vpnMode === 'always') {
              localStorage.setItem('nav_vpn_mode', settings.vpnMode);
              localStorage.setItem('nav_vpn_mode_migrated', '1');   // 导入视为显式选择，不再参与默认值迁移
              localStorage.setItem('nav_vpn_mode_ver', VPN_MODE_VER);
            }
            if (typeof settings.onlyActive === 'boolean') {
              localStorage.setItem('nav_only_active', settings.onlyActive ? '1' : '0');
            }
            if (settings.theme && (settings.theme === 'light' || settings.theme === 'dark')) {
              localStorage.setItem('nav_theme', settings.theme);
            }
            if (settings.wallpaper && (settings.wallpaper === 'default' || settings.wallpaper === 'earth' || settings.wallpaper === 'bing' || settings.wallpaper === 'custom' || settings.wallpaper === 'local')) {
              localStorage.setItem('nav_wallpaper', settings.wallpaper);
              // 导入视为「用户显式选择」：写好换代标记，否则地球实况会被默认壁纸的一次性迁移改回去
              try {
                localStorage.setItem('nav_wp_ver', '36');
                localStorage.setItem('nav_wp_default_migrated', '1');
              } catch(e) {}
            }
            if (typeof settings.customWallpaper === 'string' && settings.customWallpaper.length > 0) {
              localStorage.setItem('nav_custom_wp', settings.customWallpaper);
            }
            if (typeof settings.freqVisible === 'boolean') {
              localStorage.setItem('nav_freq_visible', settings.freqVisible ? '1' : '0');
            }
            if (typeof settings.freqCount === 'number' && settings.freqCount >= 1 && settings.freqCount <= 12) {
              localStorage.setItem('nav_freq_count', String(settings.freqCount));
            }
            if (typeof settings.navFold === 'string' && (settings.navFold === 'show' || settings.navFold === 'hide' || settings.navFold === 'autofold')) {
              localStorage.setItem('nav_fold_mode', settings.navFold);
              localStorage.setItem('nav_all_hidden', settings.navFold === 'show' ? '0' : '1');
            }
            if (settings.hiddenCategories && typeof settings.hiddenCategories === 'object') {
              localStorage.setItem('nav_hidden_cats', JSON.stringify(settings.hiddenCategories));
            }
            if (settings.hiddenEngines && typeof settings.hiddenEngines === 'object') {
              localStorage.setItem('nav_hidden_engines', JSON.stringify(settings.hiddenEngines));
            }
            if (settings.catOrder && Array.isArray(settings.catOrder)) {
              localStorage.setItem('nav_cat_order', JSON.stringify(settings.catOrder));
            }
            if (settings.catSortMode === 'fixed' || settings.catSortMode === 'recent') {
              localStorage.setItem('nav_cat_sort_mode', settings.catSortMode);
            }
            if (typeof settings.searchKeep === 'boolean') {
              try { localStorage.setItem('nav_search_keep', settings.searchKeep ? '1' : '0'); } catch(e) {}
            }
            if (settings.searchMode === 'focus' || settings.searchMode === 'full') {
              localStorage.setItem('nav_search_mode', settings.searchMode);
            }
            if (settings.searchAdv && typeof settings.searchAdv === 'object') {
              var advIn = { on: false, exact: false, site: '', exclude: '', filetype: '', time: '' };
              Object.keys(advIn).forEach(function(k) {
                if (settings.searchAdv[k] !== undefined) advIn[k] = settings.searchAdv[k];
              });
              try { localStorage.setItem('nav_search_adv', JSON.stringify(advIn)); } catch(e) {}
            }
          }
          // —— 浏览器侧配置：换浏览器/换电脑时必须能完整带走（快捷工具左/右侧别、侧边栏、分类折叠、当前引擎、浮窗位置…）——
          var msgParts = [];
          var ui = data.ui;
          var uiCount = 0;
          if (ui && typeof ui === 'object') {
            if (ui.rtSides && typeof ui.rtSides === 'object') {
              var sidesIn = {};
              Object.keys(ui.rtSides).forEach(function(k) {
                if (typeof k === 'string' && k.length <= 60) {
                  sidesIn[k] = ui.rtSides[k] === 'left' ? 'left' : 'right';
                }
              });
              try { localStorage.setItem('nav_rt_sides', JSON.stringify(sidesIn)); } catch(e) {}
              if (Object.keys(sidesIn).length) uiCount++;
            }
            if (ui.sidebar === 'collapsed' || ui.sidebar === 'expanded') {
              try { localStorage.setItem('nav_sidebar', ui.sidebar); } catch(e) {}
              uiCount++;
            }
            if (ui.catCollapse && typeof ui.catCollapse === 'object') {
              var ccIn = {};
              Object.keys(ui.catCollapse).forEach(function(k) {
                if (typeof k === 'string' && k.length <= 60 && ui.catCollapse[k]) ccIn[k] = true;
              });
              try { localStorage.setItem('nav_cat_collapse', JSON.stringify(ccIn)); } catch(e) {}
              uiCount++;
            }
            if (typeof ui.engine === 'string' && /^[a-z0-9_-]{1,32}$/i.test(ui.engine)) {
              try { localStorage.setItem('nav_engine', ui.engine); } catch(e) {}
              uiCount++;
            }
            if (typeof ui.wpExport === 'boolean') {
              try { localStorage.setItem('nav_wp_export', ui.wpExport ? '1' : '0'); } catch(e) {}
              uiCount++;
            }
            if (typeof ui.cleanUi === 'boolean') {
              // 清爽模式也随配置搬：导入后刷新即生效（不走 setCleanUi，避免加载期弹提示）
              try { localStorage.setItem('nav_clean_ui', ui.cleanUi ? '1' : '0'); } catch(e) {}
              uiCount++;
            }
            if (Array.isArray(ui.wpPool)) {
              var poolIn = ui.wpPool.filter(function(u) { return typeof u === 'string' && u.length <= 500; }).slice(0, 80);
              if (poolIn.length) { try { localStorage.setItem('nav_wp_pool', JSON.stringify(poolIn)); } catch(e) {} uiCount++; }
            }
            if (ui.pos && typeof ui.pos === 'object') {
              Object.keys(ui.pos).forEach(function(k) {
                if (['todo', 'note', 'pomo', 'conv', 'weather'].indexOf(k) < 0) return;
                var v = ui.pos[k];
                if (typeof v === 'string' && v.length <= 400) {
                  try { localStorage.setItem('nav_' + k + '_pos', v); } catch(e) {}
                  uiCount++;
                }
              });
            }
            // 记住的「配置网络地址」也随配置迁移：新电脑导入后同样能一键更新
            if (typeof ui.configUrl === 'string' && /^https?:\/\//.test(ui.configUrl) && ui.configUrl.length <= 2048) {
              try {
                localStorage.setItem('nav_cfg_url', ui.configUrl);
                localStorage.setItem('nav_cfg_url_at', String(Date.now()));
                refreshCfgUrlUi();
              } catch(e) {}
              uiCount++;
            }
          }
          // —— 悬浮窗里的内容（待办 / 记事本 / 番茄钟统计）：「换电脑不想丢」的数据也一起搬 ——
          var content = (data.content && typeof data.content === 'object') ? data.content : {};
          // 兼容配置编辑器导出的扁平字段（todoItems / noteContent / pomoStats 直接写在顶层）
          var contentTodos = Array.isArray(content.todoItems) ? content.todoItems
                            : (Array.isArray(data.todoItems) ? data.todoItems : null);
          var contentNote = (typeof content.note === 'string') ? content.note
                           : ((typeof data.noteContent === 'string') ? data.noteContent : null);
          var contentPomo = (content.pomoStats && typeof content.pomoStats === 'object') ? content.pomoStats
                          : ((data.pomoStats && typeof data.pomoStats === 'object') ? data.pomoStats : null);
          if (contentTodos) {
            try { localStorage.setItem('nav_todo_items', JSON.stringify(contentTodos)); } catch(e) {}
          }
          if (contentNote !== null) {
            try { localStorage.setItem('nav_note_content', contentNote); } catch(e) {}
          }
          if (contentPomo) {
            try { localStorage.setItem('nav_pomo_stats', JSON.stringify(contentPomo)); } catch(e) {}
          }
          if (uiCount) msgParts.push('浏览器侧设置 ' + uiCount + ' 项');
          if (data.rtTools && Array.isArray(data.rtTools)) {
            saveRtCustom(data.rtTools);
            msgParts.push(data.rtTools.length + ' 个快捷工具');
          }
          msgParts.push(customCats.length + ' 个分类');
          msgParts.push(Object.keys(customEngines).length + ' 个搜索引擎');
          if (addSites) { var c = 0; Object.keys(addSites).forEach(function(k) { c += addSites[k].length; }); if (c) msgParts.push('添加 ' + c + ' 个站点到已有分类'); }
          if (removeSites) { var c = 0; Object.keys(removeSites).forEach(function(k) { c += removeSites[k].length; }); if (c) msgParts.push('移除 ' + c + ' 个站点'); }
          if (settings) msgParts.push('设置项已应用');
          return { ok: true, msgs: msgParts };
        } catch(err) {
          return { ok: false, msgs: [], error: (err && err.message) || '解析失败' };
        }
      }

      function restoreDefaults() {
        if (!confirm('确定要恢复默认导航吗？这将清除所有自定义导入的分类、导航和搜索引擎，且无法撤销。')) return;
        var keys = ['nav_custom_cats', 'nav_custom_engines', 'nav_hidden_engines', 'nav_hidden_cats', 'nav_freq_visible', 'nav_freq_count', 'nav_wallpaper', 'nav_wp_default_migrated', 'nav_custom_wp', 'nav_bing_wp_url', 'nav_theme', 'nav_landscape_date', 'nav_landscape_idx', 'nav_wp_last_scan', 'nav_wp_max', 'nav_added_sites', 'nav_removed_sites', 'nav_wp_export', 'nav_local_wp', 'nav_all_hidden', 'nav_fold_mode', 'nav_fy4_cache', 'nav_live_scope', 'nav_live_map_cache', 'nav_earth_scope', 'nav_cat_order', 'nav_cat_order_ver', 'nav_cat_sort_mode', 'nav_cat_sort_migrated', 'nav_search_mode', 'nav_search_keep', 'nav_search_adv', 'nav_vpn_mode_ver', 'nav_notepad', 'nav_notepad_imgs', 'nav_rt_custom_tools', 'nav_rt_enabled', 'nav_rt_sides', 'nav_sidebar', 'nav_cat_collapse', 'nav_cfg_url', 'nav_cfg_url_at', 'nav_clean_ui', 'nav_fav', 'nav_fav_clicks'];
      keys.forEach(function(k) { try { localStorage.removeItem(k); } catch(e) {} });
      // 大对象在 IndexedDB 里，也要一起清（否则"恢复默认"后本地壁纸/卫星缓存还在）
      try {
        idbDel(LOCAL_WP_KEY);
        idbDel(LOCAL_WP_LEGACY_KEY);
        idbDel(EARTH_KEY);
        localWpSetUrl('');
      } catch(e) {}
      alert('已清除所有自定义数据，页面将刷新恢复到默认状态。');
      location.reload();
    }

    function exportConfig() {
      buildConfigDataAsync().then(function(data) {
        var json = JSON.stringify(data, null, 2);
        var blob = new Blob([json], {type: 'application/json'});
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        var fname = 'auroraus_config_' + new Date().toISOString().slice(0,10) + '.json';
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('配置导出成功！已下载 ' + fname);
        // 用户要求：导出成功后问一下「要不要把这个配置的网络地址记下来」，记下就能一键更新
        askRememberCfgUrlAfterExport();
      });
      return true;
    }

    // 只负责组装导出数据（与下载动作分离，便于自检与测试）
    function buildConfigData() {
      var data = {};
      try {
        var addedSites = JSON.parse(localStorage.getItem('nav_added_sites') || '{}');
        if (Object.keys(addedSites).length) data.addSites = addedSites;
      } catch(e) {}
      try {
        var removedSites = JSON.parse(localStorage.getItem('nav_removed_sites') || '{}');
        if (Object.keys(removedSites).length) data.removeSites = removedSites;
      } catch(e) {}
      try {
        var cats = JSON.parse(localStorage.getItem('nav_custom_cats') || '[]');
        if (cats.length) data.categories = cats;
      } catch(e) {}
      try {
        var engs = JSON.parse(localStorage.getItem('nav_custom_engines') || '{}');
        var engArr = Object.keys(engs).map(function(k) { return {id:k, name:engs[k].name, url:engs[k].url, label:engs[k].label}; });
        if (engArr.length) data.engines = engArr;
      } catch(e) {}
      var settings = {};
      try { var rtE = localStorage.getItem('nav_rt_enabled'); settings.rtEnabled = rtE !== '0'; } catch(e) {}
      try { var theme = localStorage.getItem('nav_theme'); if (theme) settings.theme = theme; } catch(e) {}
      try { var wp = localStorage.getItem('nav_wallpaper'); if (wp) settings.wallpaper = wp; } catch(e) {}
      try { var cwp = localStorage.getItem('nav_custom_wp'); if (cwp) settings.customWallpaper = cwp; } catch(e) {}
      try { var fv = localStorage.getItem('nav_freq_visible'); if (fv !== null) settings.freqVisible = fv !== '0'; } catch(e) {}
      try { var fc = parseInt(localStorage.getItem('nav_freq_count')); if (fc) settings.freqCount = fc; } catch(e) {}
      try {
        var nfm = localStorage.getItem('nav_fold_mode');
        var nf = localStorage.getItem('nav_all_hidden');
        settings.navFold = (nfm === 'hide' || nfm === 'autofold' || nfm === 'show') ? nfm : (nf === '1' ? 'hide' : 'show');
      } catch(e) {}
      try {
        var co = localStorage.getItem('nav_cat_order');
        if (co) settings.catOrder = JSON.parse(co);
      } catch(e) {}
      try {
        var csm = localStorage.getItem('nav_cat_sort_mode');
        settings.catSortMode = (csm === 'fixed') ? 'fixed' : 'recent';
      } catch(e) {}
      try {
        var smd = localStorage.getItem('nav_search_mode');
        settings.searchMode = (smd === 'focus') ? 'focus' : 'full';
      } catch(e) {}
      try { settings.searchKeep = searchKeepInput; } catch(e) {}
      try {
        var advExport = loadSearchAdv();
        if (advExport.on || advExport.exact || advExport.site || advExport.exclude || advExport.filetype || advExport.time) {
          settings.searchAdv = advExport;
        }
      } catch(e) {}
      try {
        var vm = localStorage.getItem('nav_vpn_mode');
        settings.vpnMode = (vm === 'auto' || vm === 'off' || vm === 'always') ? vm : 'auto';
      } catch(e) {}
      try {
        var oa = localStorage.getItem('nav_only_active');
        if (oa !== null) settings.onlyActive = oa === '1';
      } catch(e) {}
      try {
        var allCatIds = ['cat-favorites','cat-general','cat-ai','cat-buaa','cat-map','cat-academic','cat-entertainment','cat-tech','cat-learn','cat-tutorial','cat-aero','cat-translate','cat-navweb','cat-efficiency','cat-tool','cat-tradition','cat-mirror','cat-cloud','cat-data','cat-drive'];
        var hc = JSON.parse(localStorage.getItem('nav_hidden_cats') || '{}');
        var customCats = JSON.parse(localStorage.getItem('nav_custom_cats') || '[]');
        customCats.forEach(function(c) { allCatIds.push(c.id); });
        var fullHc = {};
        allCatIds.forEach(function(id) { fullHc[id] = !!hc[id]; });
        settings.hiddenCategories = fullHc;
      } catch(e) {}
      try {
        var allEngineIds = ALL_ENGINE_IDS.concat(['custom']);
        var he = JSON.parse(localStorage.getItem('nav_hidden_engines') || '{}');
        var customEnginesExport = JSON.parse(localStorage.getItem('nav_custom_engines') || '{}');
        Object.keys(customEnginesExport).forEach(function(k) { allEngineIds.push(k); });
        var fullHe = {};
        allEngineIds.forEach(function(id) { fullHe[id] = !!he[id]; });
        settings.hiddenEngines = fullHe;
      } catch(e) {}
      if (Object.keys(settings).length) data.settings = settings;
      var rtTools = loadRtCustom();
      if (rtTools.length) data.rtTools = rtTools;

      // 收藏网址 + 使用频次（让"导出配置"真的能带走收藏，与帮助文档一致）
      try {
        var favExport = JSON.parse(localStorage.getItem('nav_fav') || '[]');
        if (Array.isArray(favExport) && favExport.length) data.favorites = favExport;
      } catch(e) {}
      try {
        var favClkExport = JSON.parse(localStorage.getItem('nav_fav_clicks') || '{}');
        if (favClkExport && Object.keys(favClkExport).length) data.favClicks = favClkExport;
      } catch(e) {}

      // —— 浏览器侧配置：保证「换浏览器/换电脑导入后一模一样」——
      var ui = {};
      try {
        var sidesExport = JSON.parse(localStorage.getItem('nav_rt_sides') || '{}');
        if (sidesExport && Object.keys(sidesExport).length) ui.rtSides = sidesExport;
      } catch(e) {}
      try {
        var sbExport = localStorage.getItem('nav_sidebar');
        if (sbExport === 'collapsed' || sbExport === 'expanded') ui.sidebar = sbExport;
      } catch(e) {}
      try {
        var ccExport = JSON.parse(localStorage.getItem('nav_cat_collapse') || '{}');
        if (ccExport && Object.keys(ccExport).length) ui.catCollapse = ccExport;
      } catch(e) {}
      try {
        var engExport = localStorage.getItem('nav_engine');
        if (engExport) ui.engine = engExport;
      } catch(e) {}
      try { ui.wpExport = localStorage.getItem('nav_wp_export') === '1'; } catch(e) {}
      try { ui.cleanUi = localStorage.getItem('nav_clean_ui') === '1'; } catch(e) {}
      try {
        var poolExport = JSON.parse(localStorage.getItem('nav_wp_pool') || '[]');
        if (Array.isArray(poolExport) && poolExport.length) ui.wpPool = poolExport;
      } catch(e) {}
      var posExport = {};
      ['todo', 'note', 'pomo', 'conv', 'weather'].forEach(function(k) {
        try {
          var pv = localStorage.getItem('nav_' + k + '_pos');
          if (pv) posExport[k] = pv;
        } catch(e) {}
      });
      if (Object.keys(posExport).length) ui.pos = posExport;
      try {
        var cfgUrlExport = getSavedCfgUrl();
        if (cfgUrlExport) ui.configUrl = cfgUrlExport;
      } catch(e) {}
      if (Object.keys(ui).length) data.ui = ui;

      // —— 悬浮窗内容：待办 / 记事本 / 番茄钟统计（换电脑不想丢）——
      var content = {};
      try {
        var todoExport = JSON.parse(localStorage.getItem('nav_todo_items') || '[]');
        if (Array.isArray(todoExport) && todoExport.length) content.todoItems = todoExport;
      } catch(e) {}
      try {
        var noteExport = localStorage.getItem('nav_note_content');
        if (noteExport) content.note = noteExport;
      } catch(e) {}
      try {
        var pomoExport = JSON.parse(localStorage.getItem('nav_pomo_stats') || '{}');
        if (pomoExport && Object.keys(pomoExport).length) content.pomoStats = pomoExport;
      } catch(e) {}
      if (Object.keys(content).length) data.content = content;

      return data;
    }

    // 导出用的异步版本：壁纸在 IndexedDB 里是 Blob，需要时才转成 base64 附在末尾
    function buildConfigDataAsync() {
      var data = buildConfigData();
      var includeBase64 = false;
      try { includeBase64 = localStorage.getItem('nav_wp_export') === '1'; } catch(e) {}
      if (!includeBase64) return Promise.resolve(data);
      return idbGet(LOCAL_WP_KEY).then(function(blob) {
        if (!(blob instanceof Blob)) return data;
        return blobToDataUrl(blob).then(function(d) {
          data._base64Wallpaper = d;
          return data;
        });
      }).catch(function() { return data; });
    }

    function saveWpExport() {
      var checked = document.getElementById('wpExportCheckbox').checked;
      try { localStorage.setItem('nav_wp_export', checked ? '1' : '0'); } catch(e) {}
    }

    function setAsHomepage() {
      var url = window.location.href;
      if (url.indexOf('?') < 0) url += '?from=homepage';
      if (document.body.style.setProperty) {
        try {
          var e = document.createElement('a');
          e.href = url;
          e.setAttribute('rel', 'sidebar');
          e.setAttribute('title', 'AuroraUs导航');
          e.click();
        } catch(ex) {}
      }
      alert('不同浏览器设置首页的方式不同：\n\n🖥️ Chrome/Edge：点击地址栏右侧 ⭐ 收藏 → 右键收藏的网站 → "更多" → "添加到桌面"或设置为启动页\n🖥️ FireFox：拖动本页地址到工具栏"主页"图标上\n\n或者直接复制以下地址粘贴到浏览器设置的"启动时"选项中：\n' + url);
    }

    var iconColorMap = {blue:'icon-blue',red:'icon-red',green:'icon-green',orange:'icon-orange',purple:'icon-purple',cyan:'icon-cyan',teal:'icon-teal',pink:'icon-pink',indigo:'icon-indigo'};

    function renderCustomCategories() {
      var mainContent = document.querySelector('main.main-content');
      var sidebar = document.getElementById('sidebar');
      var mobileTabs = document.querySelector('.mobile-tabs');
      try {
        var customCats = JSON.parse(localStorage.getItem('nav_custom_cats') || '[]');
      } catch(e) { return; }
      if (!customCats.length) return;

      customCats.forEach(function(cat) {
        if (document.getElementById(cat.id)) return;

        var section = document.createElement('section');
        section.className = 'category-section';
        section.id = cat.id;
        section.innerHTML = '<div class="category-header" onclick="toggleCategory(this)">' +
          (cat.icon ? '<img src="' + cat.icon + '" alt="">' : '') +
          '<h2>' + cat.name + '</h2>' +
          '<span class="count">' + cat.sites.length + '个站点</span>' +
          '<span class="toggle-arrow">▼</span>' +
          '</div>' +
          '<div class="card-grid">' +
          cat.sites.map(function(s) {
            var cls = iconColorMap[s.iconColor] || 'icon-blue';
            return '<a class="nav-card" href="' + s.url + '" target="_blank" rel="noopener">' +
              '<div class="icon ' + cls + '">' + s.icon + '</div>' +
              '<div class="info"><h3>' + s.name + '</h3><p>' + s.desc + '</p><span class="url">' + (s.url.replace(/^https?:\/\//,'')) + '</span></div>' +
              '</a>';
          }).join('') +
          '</div>';
        mainContent.appendChild(section);

        if (sidebar) {
          var sbLink = document.createElement('a');
          sbLink.href = '#' + cat.id;
          sbLink.setAttribute('onclick', 'setActive(this)');
          sbLink.innerHTML = (cat.icon ? '<img src="' + cat.icon + '" alt="">' : '') + '<span>' + cat.name + '</span>';
          sidebar.appendChild(sbLink);
        }
        if (mobileTabs) {
          var mtLink = document.createElement('a');
          mtLink.className = 'mobile-tab';
          mtLink.href = '#' + cat.id;
          mtLink.setAttribute('onclick', 'setActive(this)');
          mtLink.innerHTML = (cat.icon ? '<img src="' + cat.icon + '" alt="">' : '') + cat.name;
          mobileTabs.appendChild(mtLink);
        }
      });
    }

    function registerCustomEngines() {
      try {
        var customEngines = JSON.parse(localStorage.getItem('nav_custom_engines') || '{}');
      } catch(e) { return; }
      var keys = Object.keys(customEngines);
      keys.forEach(function(k) {
        var eng = customEngines[k];
        engineUrls[k] = eng.url;
        enginePlaceholders[k] = eng.placeholder || ('输入关键词，' + eng.name + '搜索...');
        if (engineKeys.indexOf(k) < 0) engineKeys.push(k);
        if (desktopOnlyEngines.indexOf(k) < 0) desktopOnlyEngines.push(k);
        if (!(k in hiddenEngines)) hiddenEngines[k] = true;
      });

      var searchEnginesDiv = document.querySelector('.search-engines');
      if (!searchEnginesDiv) return;
      keys.forEach(function(k) {
        if (document.querySelector('.search-engines input[value="' + k + '"]')) return;
        var eng = customEngines[k];
        var label = document.createElement('label');
        label.className = 'engine-option desktop-only';
        label.innerHTML = '<input type="radio" name="engine" value="' + k + '">' + (eng.label || ('🔍 ' + eng.name));
        label.addEventListener('click', function() {
          var radio = this.querySelector('input[type="radio"]');
          if (!radio) return;
          radio.checked = true;
          document.querySelectorAll('.engine-option').forEach(function(l) { l.classList.remove('active'); });
          this.classList.add('active');
          document.getElementById('searchInput').placeholder = enginePlaceholders[radio.value];
          saveEnginePref(radio.value);
          updateStickyEngineLabel();
        });
        var customBtn = searchEnginesDiv.querySelector('.engine-custom-btn');
        if (customBtn) {
          searchEnginesDiv.insertBefore(label, customBtn);
        } else {
          searchEnginesDiv.appendChild(label);
        }
      });
    }

    function setTheme(mode, el) {
      var isDark = (mode === 'dark');
      document.body.classList.toggle('dark', isDark);
      var btn = document.querySelector('.theme-toggle');
      if (btn) btn.textContent = isDark ? '☀️' : '🌙';
      document.getElementById('setThemeLight').classList.toggle('on', !isDark);
      document.getElementById('setThemeDark').classList.toggle('on', isDark);
      updateHeroBg();
      try { localStorage.setItem('nav_theme', isDark ? 'dark' : 'light'); } catch(e) {}
    }

    function setNavFold(state, el) {
      // state: show（展开）/ hide（折叠并记住）/ autofold（刷新后自动折叠）
      navFoldMode = (state === 'hide' || state === 'autofold') ? state : 'show';
      allHidden = (state === 'hide' || state === 'autofold');
      if (allHidden) { document.body.classList.add('all-hidden'); }
      else { document.body.classList.remove('all-hidden'); }
      var cs = document.getElementById('setNavShow');
      var ch = document.getElementById('setNavHide');
      var ca = document.getElementById('setNavAuto');
      if (cs) cs.classList.toggle('on', navFoldMode === 'show');
      if (ch) ch.classList.toggle('on', navFoldMode === 'hide');
      if (ca) ca.classList.toggle('on', navFoldMode === 'autofold');
      updateToggleUi();
      try {
        localStorage.setItem('nav_all_hidden', allHidden ? '1' : '0');
        localStorage.setItem('nav_fold_mode', navFoldMode);
      } catch(e) {}
    }

    function toggleFreqVisible() {
      freqVisible = !freqVisible;
      document.getElementById('setFreqToggle').classList.toggle('on', freqVisible);
      var fs = document.getElementById('frequentSection');
      if (fs) { if (freqVisible) { fs.classList.add('visible'); } else { fs.classList.remove('visible'); } }
      try { localStorage.setItem('nav_freq_visible', freqVisible ? '1' : '0'); } catch(e) {}
    }

    function saveFreqCount() {
      var val = parseInt(document.getElementById('setFreqCount').value);
      if (val >= 1 && val <= 12) { freqCount = val; }
      else { document.getElementById('setFreqCount').value = freqCount; }
      try { localStorage.setItem('nav_freq_count', String(freqCount)); } catch(e) {}
    }

    (function() {
      var saved = null;
      try { saved = localStorage.getItem('nav_theme'); } catch(e) {}
      if (saved === 'dark') {
        document.body.classList.add('dark');
        var btn = document.querySelector('.theme-toggle');
        if (btn) btn.textContent = '☀️';
      }
      if (useBingWallpaper) updateHeroBg();
    })();

    function toggleSidebar() {
      var sidebar = document.getElementById('sidebar');
      var btn = document.getElementById('sidebarToggleBtn');
      if (!sidebar) return;
      var collapsed = sidebar.classList.toggle('collapsed');
      if (btn) btn.textContent = collapsed ? '▶' : '◀';
      try { localStorage.setItem('nav_sidebar', collapsed ? 'collapsed' : 'expanded'); } catch(e) {}
    }

    (function() {
      var saved = null;
      try { saved = localStorage.getItem('nav_sidebar'); } catch(e) {}
      if (saved === 'collapsed') {
        var sidebar = document.getElementById('sidebar');
        var btn = document.getElementById('sidebarToggleBtn');
        if (sidebar) sidebar.classList.add('collapsed');
        if (btn) btn.textContent = '▶';
      }
    })();

    (function() {
      try {
        var clicks = JSON.parse(localStorage.getItem('nav_clicks') || '{}');
        function bumpCard(card) {
          var href = card.getAttribute('href');
          var h3 = card.querySelector('h3');
          var name = h3 ? h3.textContent : '';
          if (!href || !name) return;
          clicks[name] = (clicks[name] || 0) + 1;
          clicks._hrefs = clicks._hrefs || {};
          clicks._hrefs[name] = href;
          localStorage.setItem('nav_clicks', JSON.stringify(clicks));
          renderFrequent();
        }
        // 一次委托代替 300+ 个卡片监听（启动更快，且收藏区的克隆卡也能计数）
        document.addEventListener('click', function(e) {
          var t = e.target;
          if (!t || !t.closest || t.closest('.fav-star')) return;
          var card = t.closest('.main-content a.nav-card');
          if (card) bumpCard(card);
        }, true);
        document.getElementById('frequentGrid').addEventListener('click', function(e) {
          var chip = e.target.closest('.frequent-chip');
          if (!chip) return;
          var name = chip.textContent;
          if (!name) return;
          clicks[name] = (clicks[name] || 0) + 1;
          clicks._hrefs = clicks._hrefs || {};
          if (!clicks._hrefs[name]) clicks._hrefs[name] = chip.getAttribute('href');
          localStorage.setItem('nav_clicks', JSON.stringify(clicks));
          renderFrequent();
        });
        renderFrequent();
        function renderFrequent() {
          var grid = document.getElementById('frequentGrid');
          var section = document.getElementById('frequentSection');
          if (!grid || !section) return;
          var current = JSON.parse(localStorage.getItem('nav_clicks') || '{}');
          var hrefs = current._hrefs || {};
          delete current._hrefs;
          var maxFreq = freqCount;
          var sorted = Object.keys(current).sort(function(a,b){ return current[b] - current[a]; }).slice(0, maxFreq);
          if (sorted.length === 0) return;
          if (freqVisible) section.classList.add('visible');
          grid.innerHTML = sorted.map(function(name) {
            return '<a class="frequent-chip" href="' + (hrefs[name] || '#') + '" target="_blank" rel="noopener">' + name + '</a>';
          }).join('');
        }
      } catch(e) {}
    })();

    /* ==========================================================
       扩展模块：VPN 模式 / 站点显隐 / 仅显示选中分类 / 日期时间
                 引擎下拉样式 / 工具条左右侧 / 快捷设置
       ========================================================== */

    // ---------- 通用小工具 ----------
    function ixLS(k, v) { try { return localStorage.getItem(k); } catch(e) { return null; } }
    function ixSet(k, v) { try { localStorage.setItem(k, v); } catch(e) {} }
    function ixGetBool(k, dflt) { var v = ixLS(k); return v === null ? dflt : v === '1'; }

    function ixClick(el, fn) { if (el && el.addEventListener) el.addEventListener('click', fn); }

    /* ---------- 网络与调度：核心服务优先，锦上添花的功能一律后台跑且必须有超时 ----------
       背景：天气/IP 定位/卫星图/必应图 都是「加分项」，但它们的请求在弱网或被墙时会长时间挂着，
       既让标签页一直转圈，又跟首屏抢连接。下面两个工具把它们彻底挡在主流程之外：
       · fetchT(url, opts, ms)  —— 带 AbortController 超时的 fetch，超时立刻放弃，绝不无限等
       · runWhenIdle(fn, delay) —— 等首屏（搜索框 + 卡片）画完、主线程空闲后再执行 */
    function fetchT(url, opts, ms) {
      var timeout = ms || 8000;
      opts = opts || {};
      var o = {}, k;
      for (k in opts) { if (Object.prototype.hasOwnProperty.call(opts, k)) o[k] = opts[k]; }
      var ctrl = (typeof AbortController === 'function') ? new AbortController() : null;
      var timer = 0;
      var settled = false;
      if (ctrl) { o.signal = ctrl.signal; }
      var p;
      try { p = fetch(url, o); } catch(e) { return Promise.reject(e); }
      if (!ctrl) {
        p = Promise.race([p, new Promise(function(_, rej) {
          timer = setTimeout(function() { rej(new Error('timeout')); }, timeout);
        })]);
      } else {
        timer = setTimeout(function() { if (!settled) { try { ctrl.abort(); } catch(e) {} } }, timeout);
      }
      return p.then(function(r) { settled = true; clearTimeout(timer); return r; },
                    function(e) { settled = true; clearTimeout(timer); throw e; });
    }
    // 访问统计（百度统计）：首屏之后 4 秒的空闲时间才加载，绝不参与首屏竞争
    function loadAnalytics() {
      try {
        if (window.__hmtLoaded) return;
        window.__hmtLoaded = true;
        window._hmt = window._hmt || [];
        var hm = document.createElement('script');
        hm.async = true;
        hm.src = 'https://hm.baidu.com/hm.js?ac6e171eb4ded069b81cd6f50f3d1032';
        (document.head || document.body).appendChild(hm);
      } catch(e) {}
    }
    window.loadAnalytics = loadAnalytics;
    runWhenIdle(loadAnalytics, 4000);

    function runWhenIdle(fn, delay) {
      var run = function() {
        try { fn(); } catch(e) { if (window.console && console.warn) console.warn('[deferred] 后台任务失败：', e && e.message); }
      };
      setTimeout(function() {
        if (window.requestIdleCallback) {
          try { requestIdleCallback(run, { timeout: 2500 }); return; } catch(e) {}
        }
        setTimeout(run, 120);
      }, delay || 0);
    }

    // ---------- IndexedDB（大对象持久化：本地壁纸等） ----------
    function idbOpen() {
      return new Promise(function(resolve, reject) {
        try {
          var req = indexedDB.open('auroraus_kv', 1);
          req.onupgradeneeded = function(e) {
            var db = e.target.result;
            if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
          };
          req.onsuccess = function(e) { resolve(e.target.result); };
          req.onerror = function() { reject(req.error); };
        } catch(e) { reject(e); }
      });
    }
    function idbSet(key, val) {
      return idbOpen().then(function(db) {
        return new Promise(function(resolve, reject) {
          var tx = db.transaction('kv', 'readwrite');
          tx.objectStore('kv').put(val, key);
          tx.oncomplete = function() { resolve(true); };
          tx.onerror = function() { reject(tx.error); };
        });
      });
    }
    function idbGet(key) {
      return idbOpen().then(function(db) {
        return new Promise(function(resolve, reject) {
          var tx = db.transaction('kv', 'readonly');
          var rq = tx.objectStore('kv').get(key);
          rq.onsuccess = function() { resolve(rq.result === undefined ? null : rq.result); };
          rq.onerror = function() { reject(rq.error); };
        });
      });
    }

    function idbDel(key) {
      return idbOpen().then(function(db) {
        return new Promise(function(resolve) {
          try {
            var tx = db.transaction('kv', 'readwrite');
            tx.objectStore('kv').delete(key);
            tx.oncomplete = function() { resolve(true); };
            tx.onerror = function() { resolve(false); };
          } catch(e) { resolve(false); }
        });
      });
    }

    // ---------- 本地壁纸：Blob 存储 + object URL 渲染 ----------
    // 旧版 dataURL / base64 字符串 → Blob。多 MB 的字符串不再进入 CSSOM 或 localStorage。
    function dataUrlToBlob(dataUrl) {
      return new Promise(function(resolve, reject) {
        try {
          var s = String(dataUrl || '');
          var m = /^data:([^;,]*)(;base64)?,/.exec(s);
          if (!m) { reject(new Error('不是有效图片数据')); return; }
          var mime = m[1] || 'image/jpeg';
          var body = s.slice(m[0].length);
          if (m[2]) {
            var bin = atob(body);
            var len = bin.length;
            var buf = new Uint8Array(len);
            for (var i = 0; i < len; i++) buf[i] = bin.charCodeAt(i);
            resolve(new Blob([buf], { type: mime }));
          } else {
            resolve(new Blob([decodeURIComponent(body)], { type: mime }));
          }
        } catch(e) { reject(e); }
      });
    }
    function decodeImageBlob(blob) {
      if (window.createImageBitmap) {
        return createImageBitmap(blob).catch(function() { return decodeImageBlobViaImg(blob); });
      }
      return decodeImageBlobViaImg(blob);
    }
    function decodeImageBlobViaImg(blob) {
      return new Promise(function(resolve, reject) {
        var url = URL.createObjectURL(blob);
        var img = new Image();
        img.onload = function() { resolve({ img: img, url: url }); };
        img.onerror = function() { URL.revokeObjectURL(url); reject(new Error('浏览器无法解码这张图片')); };
        img.src = url;
      });
    }
    // 统一处理：限制最长边 2560、体积压到 ~1.2MB 以内，返回 Blob。
    // 已经够小（≤2560 且 ≤1.2MB）就原样保留，避免无谓重编码掉画质。
    function normalizeWallpaperBlob(blob) {
      return new Promise(function(resolve, reject) {
        if (!blob || !blob.size) { reject(new Error('图片为空')); return; }
        if (blob.size > LOCAL_WP_MAX_RAW) { reject(new Error('图片超过 40MB')); return; }
        decodeImageBlob(blob).then(function(src) {
          var width = src.width || (src.img && src.img.naturalWidth) || 0;
          var height = src.height || (src.img && src.img.naturalHeight) || 0;
          var release = function() {
            if (src && src.close) { try { src.close(); } catch(e) {} }
            else if (src && src.url) { try { URL.revokeObjectURL(src.url); } catch(e) {} }
          };
          if (!width || !height) { release(); reject(new Error('图片尺寸异常')); return; }
          var maxEdge = Math.max(width, height);
          if (maxEdge <= LOCAL_WP_MAX_EDGE && blob.size <= LOCAL_WP_TARGET_BYTES) {
            release(); resolve(blob); return;   // 小图（含动图）保持原样
          }
          try {
            var scale = Math.min(1, LOCAL_WP_MAX_EDGE / maxEdge);
            var cv = document.createElement('canvas');
            cv.width = Math.max(1, Math.round(width * scale));
            cv.height = Math.max(1, Math.round(height * scale));
            var ctx = cv.getContext('2d');
            ctx.drawImage(src.img || src, 0, 0, cv.width, cv.height);
            release();
            var quals = [0.86, 0.78, 0.68, 0.58];
            var step = function(i) {
              cv.toBlob(function(out) {          // toBlob 是异步编码，不阻塞主线程
                if (!out) { reject(new Error('图片编码失败')); return; }
                if (out.size <= LOCAL_WP_TARGET_BYTES || i >= quals.length - 1) { resolve(out); return; }
                step(i + 1);
              }, 'image/jpeg', quals[i]);
            };
            step(0);
          } catch(e) { release(); reject(e); }
        }, function(err) { reject(err || new Error('浏览器无法解码这张图片')); });
      });
    }
    function localWpSetUrl(url) {
      // 不主动 revoke 旧的 object URL：它可能还挂在 CSS 背景上，提前释放会变成破图；
      // 每次替换最多多留一张 ≤1.2MB 的图，换壁纸这种低频操作不值得冒破图风险。
      localWallpaperUrl = url || '';
    }
    // 旧数据迁移：localStorage.nav_local_wp / IndexedDB 里的 base64 字符串 → Blob（迁完即删，释放配额）
    function migrateLegacyLocalWp() {
      var legacyLS = '';
      try { legacyLS = localStorage.getItem(LOCAL_WP_LEGACY_KEY) || ''; } catch(e) {}
      var cleanupLS = function() { try { localStorage.removeItem(LOCAL_WP_LEGACY_KEY); } catch(e) {} };
      var fromLS = function() {
        if (!legacyLS) return Promise.resolve(null);
        return dataUrlToBlob(legacyLS).then(function(raw) {
          // 解不了（罕见格式/损坏）也别把 base64 一直留在 localStorage 里拖慢一切：
          // 6MB 以内就原样存成 Blob 保个底，更大的直接放弃（本来也显示不出来）
          return normalizeWallpaperBlob(raw).catch(function() {
            return raw.size <= 6 * 1024 * 1024 ? raw : null;
          });
        }).then(function(blob) {
          if (!blob) return null;
          return idbSet(LOCAL_WP_KEY, blob).then(function() { return blob; });
        }).catch(function() { return null; });
      };
      // 不管走哪条分支成功，只要本地还留着旧 base64 就清掉（它是吃配额、拖慢所有设置的元凶）
      var finish = function(blob) {
        if (legacyLS) {
          return idbGet(LOCAL_WP_KEY).then(function(v) {
            var bl = blob || (v instanceof Blob ? v : null);
            // 实在迁不动（超 6MB 又解不出来）也删：它显示不出来，留着只会继续拖慢页面
            cleanupLS();
            return bl;
          }).catch(function() { cleanupLS(); return blob || null; });
        }
        return Promise.resolve(blob || null);
      };
      return idbGet(LOCAL_WP_LEGACY_KEY).then(function(old) {
        if (typeof old === 'string' && old.length > 100) {
          return dataUrlToBlob(old).then(normalizeWallpaperBlob).then(function(blob) {
            return idbSet(LOCAL_WP_KEY, blob).then(function() {
              return idbDel(LOCAL_WP_LEGACY_KEY).then(function() { return blob; });
            });
          }).catch(function() { return idbDel(LOCAL_WP_LEGACY_KEY).then(function() { return null; }); });
        }
        return null;
      }).then(function(blob) {
        return blob || fromLS();
      }).then(finish).catch(function() { return finish(null); });
    }
    // 写入：src 可以是 File/Blob，也可以是 base64 dataURL（导入配置时会用到）
    function saveLocalWallpaper(src, cb) {
      var done = function(err, blob) { if (cb) { try { cb(err || null, blob || null); } catch(e) {} } };
      var prep = (typeof src === 'string') ? dataUrlToBlob(src) : Promise.resolve(src);
      return prep.then(function(blob) {
        return normalizeWallpaperBlob(blob);
      }).then(function(blob) {
        localWallpaperBytes = blob.size;
        return idbSet(LOCAL_WP_KEY, blob).then(function() {
          return idbGet(LOCAL_WP_KEY);        // 回读校验，失败要明说而不是静默丢失
        }).then(function(back) {
          if (!(back instanceof Blob) || Math.abs((back.size || 0) - blob.size) > 8) {
            throw new Error('写入浏览器存储失败（可能空间不足）');
          }
          localWpSetUrl(URL.createObjectURL(back));
          if (wallpaperType === 'local') scheduleHeroBgApply();
          done(null, back);
          return back;
        });
      }).catch(function(err) {
        done(err || new Error('保存失败'));
        return null;
      });
    }
    // 启动恢复：新键（Blob）优先，旧键/旧 localStorage 自动迁移；贴图排在首屏之后
    function restoreLocalWallpaperAsync() {
      var useBlob = function(blob) {
        if (!blob) return null;
        localWallpaperBytes = blob.size || 0;
        localWpSetUrl(URL.createObjectURL(blob));
        if (wallpaperType === 'local') scheduleHeroBgApply();
        return blob;
      };
      return migrateLegacyLocalWp().then(function(migrated) {
        if (migrated) return useBlob(migrated);
        return idbGet(LOCAL_WP_KEY).then(function(v) {
          if (v instanceof Blob) return useBlob(v);
          return null;
        });
      }).catch(function() { return null; });
    }

    function scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }


    // ---------- 站点覆盖（显隐 / 需VPN / 排序） ----------
    var siteOv = {};
    function loadSiteOverrides() {
      try { siteOv = JSON.parse(ixLS('nav_site_overrides') || '{}') || {}; } catch(e) { siteOv = {}; }
    }
    function saveSiteOverrides() { ixSet('nav_site_overrides', JSON.stringify(siteOv)); }
    // 兼容编辑器历史键（nav_removed_sites：按名称隐藏）
    function legacyHidden(catId, name) {
      try {
        var rm = JSON.parse(ixLS('nav_removed_sites') || '{}');
        return !!(rm[catId] && rm[catId].indexOf(name) >= 0);
      } catch(e) { return false; }
    }
    function siteFlags(card, catId) {
      var name = (card.querySelector('h3') || {}).textContent || '';
      name = name.trim();
      var ov = siteOv[catId + '|' + name] || {};
      var dataVpn = card.getAttribute('data-vpn') === '1';
      // 编辑器显式设置优先于默认值：取消 VPN/取消隐藏 必须能覆盖 data-vpn 与旧隐藏键
      var vpn = (ov && typeof ov.vpn === 'boolean') ? ov.vpn : dataVpn;
      var hidden = (ov && typeof ov.hidden === 'boolean') ? ov.hidden : legacyHidden(catId, name);
      return {
        name: name,
        hidden: hidden,
        vpn: vpn,
        order: (ov && typeof ov.order === 'number') ? ov.order : null
      };
    }

    // ---------- VPN 三档模式 ----------
    // 'auto'（默认，自动判断：探测不通才隐藏） / 'always'（一直显示） / 'off'（一直隐藏）
    var vpnMode = 'auto';
    var vpnOn = true;
    var VPN_PROBE_KEY = 'nav_vpn_probe';
    var VPN_ENGINES = { google: 1, googlescholar: 1, scihub: 1, quora: 1, reddit: 1, perplexity: 1, wikipedia: 1 };
    var VPN_MODE_VER = '2';

    function loadVpnMode() {
      var raw = ixLS('nav_vpn_mode');
      var migrated = ixLS('nav_vpn_mode_migrated') === '1';
      var ver = ixLS('nav_vpn_mode_ver');
      if (ver !== VPN_MODE_VER) {
        // 一次性迁移（ver 2）：默认值改回「一直显示」——需 VPN 的站点/引擎默认就在页面上带角标显示。
        // 只有「一直隐藏」（off）必然用户主动选的、要保留；auto/always/空 → 统一切到新默认 always。
        if (raw === 'off') {
          vpnMode = 'off';
        } else {
          vpnMode = 'always';
          ixSet('nav_vpn_mode', 'always');
        }
        ixSet('nav_vpn_mode_migrated', '1');
        ixSet('nav_vpn_mode_ver', VPN_MODE_VER);
      } else if (!migrated) {
        if (raw === 'auto' || raw === 'off') {
          vpnMode = raw;
        } else {
          vpnMode = 'always';
          ixSet('nav_vpn_mode', 'always');
        }
        ixSet('nav_vpn_mode_migrated', '1');
      } else {
        vpnMode = (raw === 'auto' || raw === 'off' || raw === 'always') ? raw : 'always';
      }
      // 关键：载入后立刻算出 vpnOn，否则「一直隐藏」在刷新后不生效
      vpnOn = (vpnMode !== 'off');
    }
    function setVpnMode(mode, el) {
      vpnMode = (mode === 'auto' || mode === 'off') ? mode : 'always';
      ixSet('nav_vpn_mode', vpnMode);
      // 先算出当前是否展示需 VPN 站点，再刷新 UI，避免用到上一轮的旧状态
      vpnOn = (vpnMode !== 'off');
      if (vpnMode === 'auto') { probeVpnAndApply(); }
      applyVpnUi();
      applySiteVisibility();
      applyEngineVisibility();
      if (typeof window.ixApplyCatVisibility === 'function') window.ixApplyCatVisibility();
      var hint = document.getElementById('vpnModeHint');
      if (hint) hint.textContent = vpnModeHintText();
    }
    function applyVpnUi() {
      var on = document.getElementById('setVpnAlways');
      var au = document.getElementById('setVpnAuto');
      var off = document.getElementById('setVpnOff');
      if (on) on.classList.toggle('on', vpnMode === 'always');
      if (au) au.classList.toggle('on', vpnMode === 'auto');
      if (off) off.classList.toggle('on', vpnMode === 'off');
      // 搜索框下方的快捷「显示 / 隐藏」：auto 模式按当前探测结果反映实际效果
      var showBtn = document.getElementById('vpnQuickShow');
      var hideBtn = document.getElementById('vpnQuickHide');
      var effectiveShow = (vpnMode === 'auto') ? !!vpnOn : (vpnMode !== 'off');
      if (showBtn) showBtn.classList.toggle('on', effectiveShow);
      if (hideBtn) {
        hideBtn.classList.toggle('on', !effectiveShow);
        hideBtn.classList.toggle('muted-on', !effectiveShow);
      }
      var row = document.getElementById('vpnQuickRow');
      if (row) {
        row.title = vpnMode === 'auto'
          ? '当前为「自动判断」：探测到上不了外网时自动隐藏。点一下可固定为显示/隐藏。'
          : (vpnMode === 'always' ? '当前「一直显示」。点「隐藏」可固定为一直隐藏。' : '当前「一直隐藏」。点「显示」可固定为一直显示。');
      }
    }

    function probeOne(url, ms) {
      // 用「图片加载探测」而不是 fetch 状态：污染网络的拦截页会应答 HTTP 200（HTML 内容），
      // fetch 会误判可达；而 HTML 无法被 <img> 解码 → onerror，只有真实站点图片才能 onload。
      return new Promise(function(resolve) {
        var done = false;
        var timer = setTimeout(function() { if (!done) { done = true; resolve(false); } }, ms);
        var finish = function(ok) { if (!done) { done = true; clearTimeout(timer); resolve(ok); } };
        try {
          var img = new Image();
          img.onload = function() { finish(true); };
          img.onerror = function() { finish(false); };
          img.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + '_t=' + Date.now();  // 防缓存
        } catch(e) { finish(false); }
      });
    }

    // 两个都明确不通 → 认定需要 VPN；任一通或有异常 → 显示（避免误杀）
    function probeVpn() {
      var cached = null;
      try { cached = JSON.parse(sessionStorage.getItem(VPN_PROBE_KEY) || 'null'); } catch(e) {}
      if (cached && (Date.now() - cached.t) < 10 * 60 * 1000) {
        return Promise.resolve(cached.on);
      }
      return Promise.all([
        probeOne('https://www.google.com/favicon.ico', 1200),
        probeOne('https://www.quora.com/favicon.ico', 1200)
      ]).then(function(res) {
        var on = (res[0] || res[1]);
        try { sessionStorage.setItem(VPN_PROBE_KEY, JSON.stringify({ t: Date.now(), on: on })); } catch(e) {}
        try { console.log('[Auroraus] VPN 探测结果：google=' + res[0] + ' quora=' + res[1] + ' → ' + (on ? '显示需VPN站点' : '隐藏需VPN站点')); } catch(e) {}
        return on;
      }).catch(function() { return true; });
    }

    function probeVpnAndApply() {
      if (vpnMode !== 'auto') return;
      probeVpn().then(function(on) {
        if (vpnMode !== 'auto') return;
        vpnOn = on;
        applySiteVisibility();
        applyEngineVisibility();
        if (typeof window.applyCatVisibility === 'function') window.applyCatVisibility();
      });
    }

    // ---------- 站点显隐 / VPN 角标 ----------
    function applySiteVisibility() {
      document.querySelectorAll('.category-section').forEach(function(sec) {
        var catId = sec.id;
        sec.querySelectorAll('.nav-card').forEach(function(card) {
          var f = siteFlags(card, catId);
          var hide = f.hidden || (f.vpn && !vpnOn);
          card.style.display = hide ? 'none' : '';
          card.setAttribute('data-hidden', hide ? '1' : '0');
          var badge = card.querySelector('.vpn-badge');
          if (f.vpn && !hide) {
            if (!badge) {
              badge = document.createElement('span');
              badge.className = 'vpn-badge';
              badge.textContent = 'VPN';
              badge.title = '需要科学上网环境才能访问';
              card.appendChild(badge);
            }
          } else if (badge) {
            badge.parentNode.removeChild(badge);
          }
        });
        var n = sec.querySelectorAll('.nav-card:not([data-hidden="1"])').length;
        var cnt = sec.querySelector('.count');
        if (cnt) cnt.textContent = n + '个站点';
      });
    }

    // 空分类自动隐藏（权威实现见文件末尾的 ixApplyCatVisibility）

    // ---------- 需 VPN 的搜索引擎联动 ----------
    // 引擎是否需 VPN：默认取 VPN_ENGINES，编辑器覆盖（nav_engine_vpn）优先
    function engineNeedsVpn(val) {
      try {
        var ov = JSON.parse(ixLS('nav_engine_vpn') || '{}') || {};
        if (ov.hasOwnProperty(val)) return ov[val] === true;
      } catch(e) {}
      return !!VPN_ENGINES[val];
    }

    function applyEngineVisibility() {
      // 引擎的 hiddenEngines 仍生效；这里叠加 VPN 模式的影响
      document.querySelectorAll('.search-engines .engine-option').forEach(function(el) {
        var radio = el.querySelector('input[type="radio"]');
        if (!radio) return;
        var val = radio.value;
        var vpnBlocked = engineNeedsVpn(val) && !vpnOn;
        var userHidden = !!hiddenEngines[val];
        el.style.display = (vpnBlocked || userHidden) ? 'none' : '';
      });
      var cur = getSelectedEngine();
      var visibleKeys = getVisibleEngineKeys();
      if (visibleKeys.indexOf(cur) < 0 && visibleKeys.length) {
        applyEngine(visibleKeys[0]);
        saveEnginePref(visibleKeys[0]);
        updateStickyEngineLabel();
      }
    }

    // ---------- 仅显示选中分类（默认关闭；搜索时自动跨全部分类） ----------
    function applyOnlyActive() {
      var on = ixGetBool('nav_only_active', false);
      // 兜底：输入框已经是空的，就不该还挂着「正在搜索」的标记 ——
      // 否则一次搜索会把「仅显示选中分类」永久关掉（用户 2026-10-17 报的 bug）。
      var box = document.getElementById('searchInput');
      if (ixSearching && box && !String(box.value || '').trim()) ixSearching = false;
      document.body.classList.toggle('only-active', on && !ixSearching);
      var chip = document.getElementById('setOnlyActiveToggle');
      if (chip) chip.classList.toggle('on', on);
      if (on) markActiveSection(currentActiveCatId());
      else document.querySelectorAll('.category-section').forEach(function(s) { s.classList.remove('not-active'); });
    }
    function currentActiveCatId() {
      var a = document.querySelector('.sidebar a.active[href^="#cat-"]') ||
              document.querySelector('.sidebar a[href^="#cat-"]');
      return a ? a.getAttribute('href').replace('#', '') : '';
    }
    // 展开状态下，页面默认「打开」收藏网址分类（只有真的有收藏卡时才这样）
    function preferFavoritesActive() {
      var sec = document.getElementById('cat-favorites');
      if (!sec) return false;
      if (hiddenCategories['cat-favorites']) return false;
      if (sec.getAttribute('data-empty') === '1') return false;
      if (sec.style.display === 'none') return false;
      if (!sec.querySelector('.nav-card')) return false;
      document.querySelectorAll('.sidebar a, .mobile-tab').forEach(function(a) {
        a.classList.toggle('active', a.getAttribute('href') === '#cat-favorites');
      });
      markActiveSection('cat-favorites');
      return true;
    }
    window.preferFavoritesActive = preferFavoritesActive;
    function markActiveSection(id) {
      if (!ixGetBool('nav_only_active', false)) return;
      document.querySelectorAll('.category-section').forEach(function(sec) {
        sec.classList.toggle('not-active', sec.id !== id);
      });
    }
    function toggleOnlyActive(el) {
      var on = !ixGetBool('nav_only_active', false);
      ixSet('nav_only_active', on ? '1' : '0');
      applyOnlyActive();
    }

    // ---------- 搜索：跨全部分类展示匹配结果 ----------
    function applySearchOverride() {
      var q = (document.getElementById('searchInput') || {}).value || '';
      if (q.trim()) document.body.classList.remove('only-active');
      else applyOnlyActive();
    }

    // ---------- 设置面板新增项的同步 ----------
    // 注意：这里只做「界面回显」，绝不能反过来写回 localStorage，
    // 否则每次刷新页面都会把用户存的设置覆盖成默认值。
    function vpnModeHintText() {
      return vpnMode === 'always'
        ? '一直显示（默认）：所有站点都显示，需 VPN 的站点带小角标提示，需 VPN 的搜索引擎也在引擎栏里。'
        : vpnMode === 'auto'
          ? '自动判断：加载时后台探测 Google 与 Quora（各 1.5 秒上限），两个都不通才隐藏需 VPN 的站点与搜索引擎。'
          : '一直隐藏：需 VPN 的站点与搜索引擎一律不显示（不做任何探测，最快）。';
    }

    function refreshExtSettingsUi() {
      applyVpnUi();
      applyOnlyActive();
      applySearchModeUi();      // 只回显，不写盘
      applySearchAdvUi();       // 高级搜索回显
      // 仅回显提示文案，不调用 setVpnMode（那会写盘）
      var hint = document.getElementById('vpnModeHint');
      if (hint) hint.textContent = vpnModeHintText();
    }

    // ---------- 收藏网址 ----------
    var FAV_KEY = 'nav_fav';
    var FAVCLICK_KEY = 'nav_fav_clicks';
    function getFavs() { try { return JSON.parse(ixLS(FAV_KEY) || '[]') || []; } catch(e) { return []; } }
    function saveFavs(list) { ixSet(FAV_KEY, JSON.stringify(list)); }
    function isFav(url) { return getFavs().indexOf(url) >= 0; }

    // 使用频次（按 URL 计数）：收藏网址分类按这个频次从高到低排序
    function getFavClicks() {
      try { return JSON.parse(ixLS(FAVCLICK_KEY) || '{}') || {}; } catch(e) { return {}; }
    }
    function bumpFavClick(url) {
      if (!url) return;
      var c = getFavClicks();
      c[url] = (c[url] || 0) + 1;
      ixSet(FAVCLICK_KEY, JSON.stringify(c));
    }
    // 频次表：新计数（按 URL）与旧的 nav_clicks（按站名）取较大值合并，避免重复累加
    function favUsageCounts() {
      var out = {};
      var c = getFavClicks();
      Object.keys(c).forEach(function(u) { out[u] = c[u] || 0; });
      try {
        var nc = JSON.parse(ixLS('nav_clicks') || '{}') || {};
        var hrefs = nc._hrefs || {};
        Object.keys(hrefs).forEach(function(n) {
          var u = hrefs[n];
          if (!u) return;
          out[u] = Math.max(out[u] || 0, nc[n] || 0);
        });
      } catch(e) {}
      return out;
    }
    // 收藏排序：使用频次降序；频次相同保持收藏顺序（最近收藏的在前）
    function favSortedList(favs) {
      var counts = favUsageCounts();
      var idx = {};
      favs.forEach(function(u, i) { idx[u] = i; });
      return favs.slice().sort(function(a, b) {
        var ca = counts[a] || 0, cb = counts[b] || 0;
        if (cb !== ca) return cb - ca;
        return (idx[a] || 0) - (idx[b] || 0);
      });
    }

    function favHeaderHtml() {
      return '<div class="category-header" onclick="toggleCategory(this)">' +
             '<span class="fav-emoji" style="font-size:30px;line-height:1;">⭐</span>' +
             '<h2>收藏网址</h2>' +
             '<span class="count">0个站点</span>' +
             '<span class="toggle-arrow">▼</span></div>';
    }

    // 动态渲染「收藏网址」分类：卡片克隆自原分类（含 VPN 徽章与星星）
    function renderFavCategory() {
      var main = document.querySelector('.main-content');
      if (!main) return;
      var favs = getFavs();
      var sec = document.getElementById('cat-favorites');
      if (!sec) {
        sec = document.createElement('section');
        sec.className = 'category-section';
        sec.id = 'cat-favorites';
        sec.innerHTML = favHeaderHtml() + '<div class="card-grid"></div>';
        main.appendChild(sec);
        var sidebar = document.getElementById('sidebar');
        if (sidebar) {
          var a = document.createElement('a');
          a.href = '#cat-favorites';
          a.setAttribute('onclick', 'setActive(this)');
          a.innerHTML = '<span class="fav-emoji">⭐</span><span>收藏网址</span>';
          sidebar.insertBefore(a, sidebar.querySelector('a'));
        }
        var mt = document.querySelector('.mobile-tabs');
        if (mt) {
          var tab = document.createElement('a');
          tab.className = 'mobile-tab';
          tab.href = '#cat-favorites';
          tab.setAttribute('onclick', 'setActive(this)');
          tab.innerHTML = '<span class="fav-emoji">⭐</span>收藏网址';
          mt.insertBefore(tab, mt.querySelector('a'));
        }
      }
      var grid = sec.querySelector('.card-grid');
      var html = '';
      favSortedList(favs).forEach(function(url) {
        var orig = document.querySelector('.category-section:not(#cat-favorites) .nav-card[href="' + (window.CSS && CSS.escape ? CSS.escape(url) : url) + '"]');
        if (orig) html += orig.outerHTML;
      });
      grid.innerHTML = html;
      var cnt = sec.querySelector('.count');
      if (cnt) cnt.textContent = favs.length + '个站点';
    }

    // 收藏区当前 DOM 顺序（用于点击后判断是否需要重排）
    function favDomOrder() {
      var sec = document.getElementById('cat-favorites');
      if (!sec) return [];
      var ids = [];
      sec.querySelectorAll('.nav-card').forEach(function(c) { ids.push(c.getAttribute('href') || ''); });
      return ids;
    }

    // 记录「我的使用频次」：任何位置点击卡片都计数（含收藏区的克隆卡），点星标不算
    document.addEventListener('click', function(e) {
      var t = e.target;
      if (!t || !t.closest) return;
      if (t.closest('.fav-star')) return;
      var card = t.closest('.main-content a.nav-card');
      if (!card) return;
      var url = card.getAttribute('href') || '';
      if (!url) return;
      bumpFavClick(url);
      if (getFavs().indexOf(url) < 0) return;                 // 未收藏 → 无需重排收藏区
      if (favSortedList(getFavs()).join('|') === favDomOrder().join('|')) return;
      setTimeout(function() {                                  // 先让默认跳转发生，再静默重排
        renderFavCategory();
        applyFavStars();
      }, 0);
    }, true);

    // 给所有卡片注入/同步星标（收藏夹内的克隆卡用于取消收藏）
    function applyFavStars() {
      var all = document.querySelectorAll('.main-content .nav-card');
      for (var i = 0; i < all.length; i++) {
        var card = all[i];
        var url = card.getAttribute('href') || '';
        var st = card.querySelector('.fav-star');
        if (!st) {
          st = document.createElement('span');
          st.className = 'fav-star';
          st.textContent = '★';
          st.title = '收藏 / 取消收藏';
          st.setAttribute('onclick', 'toggleFav(event, \'' + String(url).replace(/'/g, "\\'") + '\')');
          card.appendChild(st);
        }
        var on = isFav(url);
        if (st.classList.contains('on') !== on) st.classList.toggle('on', on);
      }
    }

    window.toggleFav = function(ev, url) {
      if (ev) { ev.preventDefault(); ev.stopPropagation(); }
      var list = getFavs();
      var i = list.indexOf(url);
      if (i >= 0) list.splice(i, 1); else list.unshift(url);
      saveFavs(list);
      renderFavCategory();
      applyCatOrder();
      applySiteVisibility();
      applyFavStars();
      ixApplyCatVisibility();
    };

    // ---------- 初始化 ----------
    window.ixApplyCatVisibility = function() {
      document.querySelectorAll('.category-section').forEach(function(sec) {
        var n = sec.querySelectorAll('.nav-card:not([data-hidden="1"])').length;
        var empty = n === 0;
        sec.setAttribute('data-empty', empty ? '1' : '0');
        sec.style.display = (empty || hiddenCategories[sec.id]) ? 'none' : '';
        var link = document.querySelector('#sidebar a[href="#' + sec.id + '"]');
        if (link) link.style.display = (empty || hiddenCategories[sec.id]) ? 'none' : '';
        var tab = document.querySelector('.mobile-tab[href="#' + sec.id + '"]');
        if (tab) tab.style.display = (empty || hiddenCategories[sec.id]) ? 'none' : '';
      });
      markActiveSection(currentActiveCatId());
    };
    window.applyCatVisibility = window.ixApplyCatVisibility;

    function ixInit() {
      if (window.__ixInited) return;
      window.__ixInited = true;
      loadSiteOverrides();
      loadVpnMode();
      refreshExtSettingsUi();
      applySiteVisibility();
      ixApplyCatVisibility();
      preferFavoritesActive();     // 展开状态下默认选中「收藏网址」（有收藏时）
      applyEngineVisibility();
      applyFavStars();
      runWhenIdle(probeVpnAndApply, 1200);
      // Ctrl+S 打开设置（扩展模块自身的事件绑定）
      var topBtn = document.getElementById('ixTop');
      if (topBtn) topBtn.classList.toggle('show', (window.pageYOffset || document.documentElement.scrollTop) > 300);
    }
    if (document.readyState === 'complete') ixInit();
    else window.addEventListener('load', ixInit);

    var engineKeys = ALL_ENGINE_IDS.concat(['custom']);

    renderCustomCategories();
    registerCustomEngines();
    renderFavCategory();       // 收藏网址分类（置顶），在排序前注入
    applyCatOrder();
    applyDefaultCatMods();
    applySettings();
    // 分类排序模式与壁纸 chip 的初始态（无需打开设置面板也应正确）
    renderSettingsCatOrder();
    applyCatOrderLockUi();
    refreshSettingsUi();
    // 扩展模块的初始化放在文件末尾（见「扩展模块」段），确保所有声明可见

    setTimeout(function() {
      document.querySelectorAll('.category-section').forEach(function(sec) {
        sec.style.display = (hiddenCategories[sec.id] || sec.getAttribute('data-empty') === '1') ? 'none' : '';
      });
      document.querySelectorAll('.sidebar a, .mobile-tab').forEach(function(a) {
        var href = a.getAttribute('href');
        if (!href || href === '#') return;
        var id = href.replace('#', '');
        var sec = document.getElementById(id);
        var empty = sec && sec.getAttribute('data-empty') === '1';
        a.style.display = (hiddenCategories[id] || empty) ? 'none' : '';
      });
    }, 50);

    function applyDefaultCatMods() {
      try {
        var addedSites = JSON.parse(localStorage.getItem('nav_added_sites') || '{}');
        var removedSites = JSON.parse(localStorage.getItem('nav_removed_sites') || '{}');
        var allCatIds = Object.keys(addedSites).concat(Object.keys(removedSites));
        allCatIds = allCatIds.filter(function(v, i, a) { return a.indexOf(v) === i; });
        allCatIds.forEach(function(catId) {
          var section = document.getElementById(catId);
          if (!section) return;
          var grid = section.querySelector('.card-grid');
          if (!grid) return;
          var countEl = section.querySelector('.count');
          var rmNames = removedSites[catId] || [];
          var addList = addedSites[catId] || [];
          var cards = grid.querySelectorAll('.nav-card');
          var totalCount = cards.length;
          if (rmNames.length) {
            cards.forEach(function(card) {
              var h3 = card.querySelector('h3');
              if (h3 && rmNames.indexOf(h3.textContent.trim()) >= 0) {
                card.remove();
                totalCount--;
              }
            });
          }
          if (addList.length) {
            addList.forEach(function(s) {
              var exists = false;
              grid.querySelectorAll('h3').forEach(function(h3) {
                if (h3.textContent.trim() === s.name) exists = true;
              });
              if (exists) return;
              var cls = iconColorMap[s.iconColor] || 'icon-blue';
              var div = document.createElement('a');
              div.className = 'nav-card';
              div.href = s.url;
              div.target = '_blank';
              div.rel = 'noopener';
              div.innerHTML = '<div class="icon ' + cls + '">' + (s.icon || s.name.charAt(0)) + '</div>' +
                '<div class="info"><h3>' + s.name + '</h3><p>' + (s.desc || '') + '</p><span class="url">' + (s.url.replace(/^https?:\/\//,'')) + '</span></div>';
              grid.appendChild(div);
              totalCount++;
            });
          }
          if (countEl) countEl.textContent = totalCount + '个站点';
        });
      } catch(e) {}
    }

    function getVisibleEngineKeys() {
      var labels = document.querySelectorAll('.search-engines .engine-option');
      var keys = [];
      labels.forEach(function(label) {
        if (label.style.display === 'none') return;
        var radio = label.querySelector('input[name="engine"]');
        if (radio) keys.push(radio.value);
      });
      if (keys.length === 0) return ['bing'];
      return keys;
    }

    document.addEventListener('keydown', function(e) {
      var fIndex = -1;
      if (e.key === 'F1') fIndex = 0;
      else if (e.key === 'F2') fIndex = 1;
      else if (e.key === 'F3') fIndex = 2;
      else if (e.key === 'F4') fIndex = 3;
      else if (e.key === 'F5') fIndex = 4;
      else if (e.key === 'F6') fIndex = 5;
      else if (e.key === 'F7') fIndex = 6;
      else if (e.key === 'F8') fIndex = 7;
      else if (e.key === 'F9') fIndex = 8;
      else if (e.key === 'F10') fIndex = 9;
      else if (e.key === 'F11') fIndex = 10;
      else if (e.key === 'F12') fIndex = 11;
      if (fIndex >= 0) {
        e.preventDefault();
        var visibleKeys = getVisibleEngineKeys();
        if (fIndex < visibleKeys.length) {
          applyEngine(visibleKeys[fIndex]);
          saveEnginePref(visibleKeys[fIndex]);
          updateStickyEngineLabel();
          document.getElementById('searchInput').focus();
          document.getElementById('searchInput').select();
        }
        return;
      }
      if (e.key === 'Escape') {
        clearSearchInput();
      }
      // Ctrl + ← / →：按显示顺序切到上 / 下一个可用搜索引擎（取代旧版「单独按 Ctrl / Alt」）
      if (e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
        switchEngineByStep(e.key === 'ArrowRight' ? 1 : -1);
        return;
      }
      // Alt + V：显示 / 隐藏「需 VPN」的站点与搜索引擎（点一下切换）
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        toggleVpnQuick();
        return;
      }
      if (e.key === 'k' && e.ctrlKey) {
        e.preventDefault();
        document.getElementById('searchInput').focus();
      }
      if (e.key === 's' && e.altKey) {
        e.preventDefault();
        document.getElementById('searchInput').focus();
        document.getElementById('searchInput').select();
      }
    });

    // 按显示顺序切换搜索引擎 / 显示隐藏「需 VPN」（用户 2026-10-17 指定的快捷键）
    // Ctrl + →  下一个可用引擎；Ctrl + ←  上一个可用引擎；Alt + V  显示/隐藏需 VPN 的站点与搜索引擎
    function switchEngineByStep(step) {
      var engine = getSelectedEngine();
      var visibleKeys = getVisibleEngineKeys();
      var idx = visibleKeys.indexOf(engine);
      if (idx < 0) idx = 0;
      var len = visibleKeys.length;
      var next = ((idx + step) % len + len) % len;
      applyEngine(visibleKeys[next]);
      saveEnginePref(visibleKeys[next]);
      updateStickyEngineLabel();
      document.getElementById('searchInput').focus();
      document.getElementById('searchInput').select();
      return visibleKeys[next];
    }

    // 点一下就在「显示」和「隐藏」之间切换（与右上角 显示/隐藏 按钮同一套逻辑：固定为 always / off）
    function toggleVpnQuick() {
      var showing = (vpnMode === 'auto') ? !!vpnOn : (vpnMode !== 'off');
      var next = showing ? 'off' : 'always';
      setVpnMode(next);
      showModeToast(next === 'always'
        ? '🌐 已显示「需 VPN」的站点与搜索引擎（Alt + V 切换）'
        : '🙈 已隐藏「需 VPN」的站点与搜索引擎（Alt + V 切换）');
      return next;
    }
    window.toggleVpnQuick = toggleVpnQuick;
    window.switchEngineByStep = switchEngineByStep;

    function openFeedbackModal() {
      document.getElementById('feedbackModal').classList.add('visible');
    }
    function closeFeedbackModal() {
      document.getElementById('feedbackModal').classList.remove('visible');
    }

    var stickySearch = document.getElementById('stickySearch');
    var stickyInput = document.getElementById('stickyInput');
    var stickyEngine = document.getElementById('stickyEngine');
    var heroEl = document.querySelector('.hero');

    function updateStickyEngineLabel() {
      var engine = getSelectedEngine();
      var labels = {bing:'必应',baidu:'百度',google:'谷歌',metaso:'秘塔AI',perplexity:'Perplexity',sogou:'搜狗',sogouweixin:'搜狗微信',sogouzhihu:'搜狗知乎',yandex:'Yandex',gscholar2:'谷歌学术②',xmol:'XMOL',googlescholar:'谷歌学术',buaaebsco:'北航外文',baiduxueshu:'百度学术',kiphub:'KipHub',msacademic:'微软学术',quora:'Quora',reddit:'Reddit',wikipedia:'维基百科',trans2en:'译英',trans2zh:'译中'};
      try {
        var customEngines = JSON.parse(localStorage.getItem('nav_custom_engines') || '{}');
        Object.keys(customEngines).forEach(function(k) { labels[k] = customEngines[k].name; });
      } catch(e) {}
      if (engine === 'custom') {
        stickyEngine.textContent = customEngineName || '自定义';
      } else {
        stickyEngine.textContent = labels[engine] || engine;
      }
    }
    updateStickyEngineLabel();

    document.querySelectorAll('.engine-option').forEach(function(label) {
      label.addEventListener('click', function() {
        setTimeout(updateStickyEngineLabel, 50);
      });
    });

    document.getElementById('searchInput').addEventListener('input', function() {
      stickyInput.value = this.value;
    });
    stickyInput.addEventListener('input', function() {
      document.getElementById('searchInput').value = this.value;
      document.getElementById('searchInput').dispatchEvent(new Event('input'));
    });
    stickyInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doSearchFromSticky();
    });

    function doSearchFromSticky() {
      document.getElementById('searchInput').value = stickyInput.value;
      doSearch();
    }

    function clickStickyEngine() {
      var engine = getSelectedEngine();
      var idx = engineKeys.indexOf(engine);
      var next = (idx + 1) % engineKeys.length;
      applyEngine(engineKeys[next]);
      saveEnginePref(engineKeys[next]);
      updateStickyEngineLabel();
      document.getElementById('searchInput').focus();
    }

    function updateStickyVisibility() {
      var heroBottom = heroEl.getBoundingClientRect().bottom;
      if (heroBottom < 0) {
        stickySearch.classList.add('visible');
      } else {
        stickySearch.classList.remove('visible');
      }
    }
    window.addEventListener('scroll', updateStickyVisibility, { passive: true });
    updateStickyVisibility();

    // === Right Quick Links ===
    // rtGo defined above with renderRtEdge

    renderRtEdge();

    // === Todo Feature ===
    var todoItems = [];
    var todoFilter = 'all';
    var todoDrag = { active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
    var todoResize = { active: false, startX: 0, startY: 0, startW: 0, startH: 0 };

    function loadTodoItems() {
      try { todoItems = JSON.parse(localStorage.getItem('nav_todo_items') || '[]'); } catch(e) { todoItems = []; }
      cleanExpiredTodos();
    }

    function saveTodoItems() {
      try { localStorage.setItem('nav_todo_items', JSON.stringify(todoItems)); } catch(e) {}
    }

    function cleanExpiredTodos() {
      var now = Date.now();
      var twoDays = 2 * 24 * 60 * 60 * 1000;
      var changed = false;
      todoItems = todoItems.filter(function(item) {
        if (item.completed && item.completedAt && (now - item.completedAt) > twoDays) {
          changed = true;
          return false;
        }
        return true;
      });
      if (changed) saveTodoItems();
    }

    function getFilteredItems() {
      if (todoFilter === 'active') return todoItems.filter(function(t) { return !t.completed; });
      if (todoFilter === 'completed') return todoItems.filter(function(t) { return t.completed; });
      return todoItems;
    }

    function formatDeadline(deadline) {
      if (!deadline) return null;
      var now = new Date(); now.setHours(0,0,0,0);
      var target = new Date(deadline + 'T00:00:00');
      var diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) return { text: '已过期 ' + Math.abs(diffDays) + ' 天', cls: 'overdue' };
      if (diffDays === 0) return { text: '今天截止', cls: 'soon' };
      if (diffDays === 1) return { text: '明天截止', cls: 'soon' };
      if (diffDays <= 3) return { text: '剩余 ' + diffDays + ' 天', cls: 'soon' };
      return { text: '剩余 ' + diffDays + ' 天', cls: 'normal' };
    }

    function priLabel(pri) {
      if (pri === 'high') return '紧急';
      if (pri === 'mid') return '重要';
      return '一般';
    }

    function renderTodoList() {
      var listEl = document.getElementById('todoList');
      var countEl = document.getElementById('todoCount');
      if (!listEl) return;
      var filtered = getFilteredItems();
      var activeCount = todoItems.filter(function(t) { return !t.completed; }).length;
      var completedCount = todoItems.length - activeCount;

      if (filtered.length === 0) {
        listEl.innerHTML = '<div class="todo-empty">' + (todoFilter === 'completed' ? '暂无已完成事项' : (todoFilter === 'active' ? '暂无未完成事项，🎉' : '暂无待办事项，添加一个吧')) + '</div>';
      } else {
        var h = '';
        filtered.forEach(function(item) {
          var pri = item.priority || 'low';
          var dl = formatDeadline(item.deadline);
          h += '<div class="todo-item' + (item.completed ? ' completed' : '') + '">';
          h += '<div class="todo-check" onclick="todoToggle(\'' + item.id + '\')"></div>';
          h += '<span class="todo-text">' + escapeHtml(item.text) + '</span>';
          h += '<span class="todo-meta">';
          h += '<span class="todo-pri-badge ' + pri + '">' + priLabel(pri) + '</span>';
          if (dl) h += '<span class="todo-deadline ' + dl.cls + '">' + dl.text + '</span>';
          h += '</span>';
          h += '<button class="todo-del" onclick="todoDelete(\'' + item.id + '\')" title="删除">×</button>';
          h += '</div>';
        });
        listEl.innerHTML = h;
      }
      countEl.textContent = activeCount + ' 项未完成 · ' + completedCount + ' 项已完成';
      if (typeof applyTodoBadge === 'function') applyTodoBadge();
      if (typeof maybeShowTodoAlert === 'function') maybeShowTodoAlert();
    }

    function escapeHtml(str) {
      var div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    function todoAdd() {
      var input = document.getElementById('todoInput');
      var priSel = document.getElementById('todoPriority');
      var dateInp = document.getElementById('todoDeadline');
      if (!input) return;
      var text = input.value.trim();
      if (!text) { input.focus(); return; }
      var priority = priSel ? priSel.value : 'low';
      var deadline = (dateInp && dateInp.value) ? dateInp.value : null;
      todoItems.unshift({
        id: 't' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        text: text,
        completed: false,
        priority: priority,
        deadline: deadline,
        createdAt: Date.now(),
        completedAt: null
      });
      saveTodoItems();
      input.value = '';
      if (dateInp) dateInp.value = '';
      if (priSel) priSel.value = 'mid';
      input.focus();
      renderTodoList();
    }

    function todoToggle(id) {
      var item = todoItems.find(function(t) { return t.id === id; });
      if (!item) return;
      item.completed = !item.completed;
      item.completedAt = item.completed ? Date.now() : null;
      saveTodoItems();
      cleanExpiredTodos();
      renderTodoList();
    }

    function todoDelete(id) {
      todoItems = todoItems.filter(function(t) { return t.id !== id; });
      saveTodoItems();
      renderTodoList();
    }

    function todoClearCompleted() {
      var before = todoItems.length;
      todoItems = todoItems.filter(function(t) { return !t.completed; });
      if (todoItems.length < before) {
        saveTodoItems();
        renderTodoList();
      }
    }

    function todoSwitchTab(filter, el) {
      todoFilter = filter;
      var tabs = document.querySelectorAll('#todoTabs .todo-tab');
      tabs.forEach(function(t) { t.classList.remove('active'); });
      if (el) el.classList.add('active');
      renderTodoList();
    }

    function toggleTodoWindow() {
      var win = document.getElementById('todoWindow');
      if (!win) return;
      hideTodoAlert();
      if (win.classList.contains('visible')) {
        closeTodoWindow();
      } else {
        openTodoWindow();
      }
    }

    // ---------- 未完成待办：顶部醒目提醒条（全部完成/没有待办时不出现） ----------
    function hideTodoAlert() {
      var el = document.getElementById('todoAlert');
      if (el) el.classList.remove('show');
    }
    function maybeShowTodoAlert() {
      var n = (typeof activeTodoCount === 'function') ? activeTodoCount() : 0;
      var el = document.getElementById('todoAlert');
      if (!el) return;
      if (n <= 0 || document.getElementById('todoWindow').classList.contains('visible')) {
        el.classList.remove('show');
        return;
      }
      var txt = el.querySelector('.ta-text');
      if (txt) txt.textContent = '你还有 ' + n + ' 项待办未完成 → 点这里查看';
      el.classList.add('show');
    }
    window.hideTodoAlert = hideTodoAlert;
    window.maybeShowTodoAlert = maybeShowTodoAlert;

    function openTodoWindow() {
      var win = document.getElementById('todoWindow');
      if (!win) return;
      cleanExpiredTodos();
      restoreTodoPosition();
      restoreTodoSize();
      win.classList.add('visible');
      renderTodoList();
      setTimeout(function() {
        var input = document.getElementById('todoInput');
        if (input) input.focus();
      }, 100);
    }

    function closeTodoWindow() {
      var win = document.getElementById('todoWindow');
      if (!win) return;
      win.classList.remove('visible');
    }

    function restoreTodoPosition() {
      var win = document.getElementById('todoWindow');
      if (!win) return;
      try {
        var saved = JSON.parse(localStorage.getItem('nav_todo_pos') || 'null');
        if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
          var maxX = window.innerWidth - win.offsetWidth - 10;
          var maxY = window.innerHeight - win.offsetHeight - 10;
          win.style.left = Math.min(Math.max(saved.x, 10), maxX) + 'px';
          win.style.top = Math.min(Math.max(saved.y, 10), maxY) + 'px';
          win.style.right = 'auto';
        }
      } catch(e) {}
    }

    function saveTodoPosition() {
      var win = document.getElementById('todoWindow');
      if (!win) return;
      try {
        var rect = win.getBoundingClientRect();
        localStorage.setItem('nav_todo_pos', JSON.stringify({ x: rect.left, y: rect.top, w: rect.width, h: rect.height }));
      } catch(e) {}
    }

    function restoreTodoSize() {
      var win = document.getElementById('todoWindow');
      if (!win) return;
      try {
        var saved = JSON.parse(localStorage.getItem('nav_todo_pos') || 'null');
        if (saved && typeof saved.w === 'number' && typeof saved.h === 'number' && saved.w >= 300 && saved.h >= 340) {
          win.style.width = saved.w + 'px';
          win.style.height = saved.h + 'px';
        }
      } catch(e) {}
    }

    function saveTodoSize() {
      saveTodoPosition();
    }

    function initTodoDrag() {
      var header = document.getElementById('todoHeader');
      var win = document.getElementById('todoWindow');
      if (!header || !win) return;

      header.addEventListener('mousedown', function(e) {
        if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
        todoDrag.active = true;
        todoDrag.startX = e.clientX;
        todoDrag.startY = e.clientY;
        var rect = win.getBoundingClientRect();
        todoDrag.startLeft = rect.left;
        todoDrag.startTop = rect.top;
        win.style.right = 'auto';
        win.style.left = rect.left + 'px';
        win.style.top = rect.top + 'px';
        win.style.transition = 'none';
        e.preventDefault();
      });

      document.addEventListener('mousemove', function(e) {
        if (!todoDrag.active) return;
        var dx = e.clientX - todoDrag.startX;
        var dy = e.clientY - todoDrag.startY;
        var newLeft = todoDrag.startLeft + dx;
        var newTop = todoDrag.startTop + dy;
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - win.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - win.offsetHeight));
        win.style.left = newLeft + 'px';
        win.style.top = newTop + 'px';
      });

      document.addEventListener('mouseup', function(e) {
        if (!todoDrag.active) return;
        todoDrag.active = false;
        win.style.transition = '';
        saveTodoPosition();
      });
    }

    function initTodoResize() {
      var handle = document.getElementById('todoResizeHandle');
      var win = document.getElementById('todoWindow');
      if (!handle || !win) return;

      handle.addEventListener('mousedown', function(e) {
        todoResize.active = true;
        todoResize.startX = e.clientX;
        todoResize.startY = e.clientY;
        todoResize.startW = win.offsetWidth;
        todoResize.startH = win.offsetHeight;
        win.style.transition = 'none';
        e.preventDefault();
        e.stopPropagation();
      });

      document.addEventListener('mousemove', function(e) {
        if (!todoResize.active) return;
        var newW = todoResize.startW + (e.clientX - todoResize.startX);
        var newH = todoResize.startH + (e.clientY - todoResize.startY);
        newW = Math.max(300, Math.min(newW, window.innerWidth - win.getBoundingClientRect().left - 10));
        newH = Math.max(340, Math.min(newH, window.innerHeight - win.getBoundingClientRect().top - 10));
        win.style.width = newW + 'px';
        win.style.height = newH + 'px';
      });

      document.addEventListener('mouseup', function(e) {
        if (!todoResize.active) return;
        todoResize.active = false;
        win.style.transition = '';
        saveTodoSize();
      });
    }

    function todoExport() {
      var data = {
        version: 2,
        exportedAt: new Date().toISOString(),
        items: todoItems
      };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'auroraus_todo_' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function todoImport() {
      var fileInput = document.getElementById('todoImportFile');
      if (fileInput) fileInput.click();
    }

    function todoHandleImport(event) {
      var file = event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var data = JSON.parse(e.target.result);
          if (!data.items || !Array.isArray(data.items)) {
            alert('无效的待办数据文件格式');
            return;
          }
          var imported = data.items.filter(function(t) {
            return t && typeof t.text === 'string' && t.text.trim();
          }).map(function(t) {
            return {
              id: t.id || ('t' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)),
              text: t.text.trim(),
              completed: !!t.completed,
              priority: t.priority || 'low',
              deadline: t.deadline || null,
              createdAt: t.createdAt || Date.now(),
              completedAt: t.completed ? (t.completedAt || Date.now()) : null
            };
          });
          if (imported.length === 0) {
            alert('文件中没有有效的待办事项');
            return;
          }
          todoItems = imported;
          saveTodoItems();
          cleanExpiredTodos();
          renderTodoList();
        } catch(err) {
          alert('解析文件失败，请检查文件格式');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    }

    loadTodoItems();
    if (typeof renderTodoList === 'function') renderTodoList();   // 初始化待办徽标与提醒条
    initTodoDrag();
    initTodoResize();

    // === Notepad Feature ===
    var noteDrag = { active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
    var noteResize = { active: false, startX: 0, startY: 0, startW: 0, startH: 0 };
    var noteMode = 'edit';

    function loadNoteContent() {
      try { return localStorage.getItem('nav_note_content') || ''; } catch(e) { return ''; }
    }

    function saveNoteContent(text) {
      try { localStorage.setItem('nav_note_content', text); } catch(e) {}
    }

    function noteRenderMd(text) {
      if (!text) return '';
      text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      var lines = text.split('\n');
      var out = '';
      var inCodeBlock = false;
      var inList = false;
      var listType = '';
      var inTable = false;
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (/^```/.test(line)) {
          if (!inCodeBlock) { inCodeBlock = true; out += '<pre><code>'; }
          else { inCodeBlock = false; out += '</code></pre>'; }
          continue;
        }
        if (inCodeBlock) { out += line + '\n'; continue; }
        // Table
        if (/^\|.*\|/.test(line) && /\|.*\|/.test(lines[i+1]||'') && /^\|[\s\-:]+\|/.test(lines[i+1]||'')) {
          if (!inTable) { out += '<table>'; inTable = true; }
          var cells = line.split('|').filter(function(c) { return c.trim(); });
          out += '<tr>' + cells.map(function(c) { return '<th>' + c.trim() + '</th>'; }).join('') + '</tr>';
          continue;
        }
        if (inTable && /^\|.*\|/.test(line)) {
          var tds = line.split('|').filter(function(c) { return c.trim(); });
          out += '<tr>' + tds.map(function(c) { return '<td>' + c.trim() + '</td>'; }).join('') + '</tr>';
          continue;
        }
        if (inTable && !/^\|.*\|/.test(line)) {
          out += '</table>'; inTable = false;
        }
        // Headings
        if (/^#{1,6}\s/.test(line)) {
          var lvl = line.match(/^(#{1,6})/)[1].length;
          var txt = line.replace(/^#{1,6}\s+/, '');
          out += '<h' + lvl + '>' + inlineMd(txt) + '</h' + lvl + '>';
          continue;
        }
        // HR
        if (/^(\*{3,}|-{3,}|_{3,})$/.test(line.trim())) { out += '<hr>'; continue; }
        // Blockquote
        if (/^>\s/.test(line)) {
          out += '<blockquote>' + inlineMd(line.replace(/^>\s?/, '')) + '</blockquote>';
          continue;
        }
        // Unordered list
        if (/^[\-\*\+]\s/.test(line)) {
          if (!inList || listType !== 'ul') { out += '<ul>'; inList = true; listType = 'ul'; }
          out += '<li>' + inlineMd(line.replace(/^[\-\*\+]\s/, '')) + '</li>';
          continue;
        }
        // Ordered list
        if (/^\d+\.\s/.test(line)) {
          if (!inList || listType !== 'ol') { out += '<ol>'; inList = true; listType = 'ol'; }
          out += '<li>' + inlineMd(line.replace(/^\d+\.\s/, '')) + '</li>';
          continue;
        }
        // Close list
        if (inList && line.trim() === '') { out += (listType === 'ul' ? '</ul>' : '</ol>'); inList = false; listType = ''; }
        if (inList) { out += (listType === 'ul' ? '</ul>' : '</ol>'); inList = false; listType = ''; }
        // Paragraph
        if (line.trim() === '') { out += '<p> </p>'; continue; }
        out += '<p>' + inlineMd(line) + '</p>';
      }
      if (inCodeBlock) out += '</code></pre>';
      if (inTable) out += '</table>';
      if (inList) out += (listType === 'ul' ? '</ul>' : '</ol>');
      return out;
    }

    function inlineMd(text) {
      text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
      text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
      text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
      text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
      text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:4px;">');
      text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
      return text;
    }

    function noteUpdatePreview() {
      var ta = document.getElementById('noteTextarea');
      var prev = document.getElementById('notePreview');
      if (!ta || !prev) return;
      var text = ta.value;
      prev.innerHTML = noteRenderMd(text);
    }

    function noteSwitchMode(mode) {
      noteMode = mode;
      var ta = document.getElementById('noteTextarea');
      var prev = document.getElementById('notePreview');
      var editBtn = document.getElementById('noteEditBtn');
      var previewBtn = document.getElementById('notePreviewBtn');
      if (!ta || !prev) return;
      if (mode === 'edit') {
        ta.style.display = ''; prev.style.display = 'none';
        editBtn.classList.add('active'); previewBtn.classList.remove('active');
        setTimeout(function() { ta.focus(); }, 50);
      } else {
        noteUpdatePreview();
        ta.style.display = 'none'; prev.style.display = '';
        previewBtn.classList.add('active'); editBtn.classList.remove('active');
      }
    }

    function noteClear() {
      if (!confirm('确定要清空记事本全部内容吗？此操作不可恢复。')) return;
      var ta = document.getElementById('noteTextarea');
      if (!ta) return;
      ta.value = '';
      saveNoteContent('');
      noteUpdatePreview();
    }

    function noteExportMd() {
      var ta = document.getElementById('noteTextarea');
      if (!ta) return;
      var text = ta.value;
      if (!text) { alert('记事本为空，没有可导出的内容'); return; }
      var blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'auroraus_note_' + new Date().toISOString().slice(0, 10) + '.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    function noteImportNote() {
      var fileInput = document.getElementById('noteImportFile');
      if (fileInput) fileInput.click();
    }

    function noteHandleImport(event) {
      var file = event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        var ta = document.getElementById('noteTextarea');
        if (!ta) return;
        ta.value = e.target.result || '';
        saveNoteContent(ta.value);
        noteUpdatePreview();
      };
      reader.readAsText(file);
      event.target.value = '';
    }

    function toggleNoteWindow() {
      var win = document.getElementById('noteWindow');
      if (!win) return;
      if (win.classList.contains('visible')) {
        closeNoteWindow();
      } else {
        openNoteWindow();
      }
    }

    function openNoteWindow() {
      var win = document.getElementById('noteWindow');
      if (!win) return;
      restoreNotePosition();
      restoreNoteSize();
      win.classList.add('visible');
      var ta = document.getElementById('noteTextarea');
      if (ta) ta.value = loadNoteContent();
      if (noteMode === 'preview') noteUpdatePreview();
      setTimeout(function() {
        if (noteMode === 'edit' && ta) ta.focus();
      }, 100);
    }

    function closeNoteWindow() {
      var win = document.getElementById('noteWindow');
      if (!win) return;
      var ta = document.getElementById('noteTextarea');
      if (ta) saveNoteContent(ta.value);
      win.classList.remove('visible');
    }

    function restoreNotePosition() {
      var win = document.getElementById('noteWindow');
      if (!win) return;
      try {
        var saved = JSON.parse(localStorage.getItem('nav_note_pos') || 'null');
        if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
          var maxX = window.innerWidth - win.offsetWidth - 10;
          var maxY = window.innerHeight - win.offsetHeight - 10;
          win.style.left = Math.min(Math.max(saved.x, 10), maxX) + 'px';
          win.style.top = Math.min(Math.max(saved.y, 10), maxY) + 'px';
          win.style.right = 'auto';
        }
      } catch(e) {}
    }

    function saveNotePosition() {
      var win = document.getElementById('noteWindow');
      if (!win) return;
      try {
        var rect = win.getBoundingClientRect();
        localStorage.setItem('nav_note_pos', JSON.stringify({ x: rect.left, y: rect.top, w: rect.width, h: rect.height }));
      } catch(e) {}
    }

    function restoreNoteSize() {
      var win = document.getElementById('noteWindow');
      if (!win) return;
      try {
        var saved = JSON.parse(localStorage.getItem('nav_note_pos') || 'null');
        if (saved && typeof saved.w === 'number' && typeof saved.h === 'number' && saved.w >= 340 && saved.h >= 380) {
          win.style.width = saved.w + 'px';
          win.style.height = saved.h + 'px';
        }
      } catch(e) {}
    }

    function saveNoteSize() {
      saveNotePosition();
    }

    function initNoteDrag() {
      var header = document.getElementById('noteHeader');
      var win = document.getElementById('noteWindow');
      if (!header || !win) return;

      header.addEventListener('mousedown', function(e) {
        if (e.target.tagName === 'BUTTON') return;
        noteDrag.active = true;
        noteDrag.startX = e.clientX;
        noteDrag.startY = e.clientY;
        var rect = win.getBoundingClientRect();
        noteDrag.startLeft = rect.left;
        noteDrag.startTop = rect.top;
        win.style.right = 'auto';
        win.style.left = rect.left + 'px';
        win.style.top = rect.top + 'px';
        win.style.transition = 'none';
        e.preventDefault();
      });

      document.addEventListener('mousemove', function(e) {
        if (!noteDrag.active) return;
        var dx = e.clientX - noteDrag.startX;
        var dy = e.clientY - noteDrag.startY;
        var newLeft = noteDrag.startLeft + dx;
        var newTop = noteDrag.startTop + dy;
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - win.offsetWidth));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - win.offsetHeight));
        win.style.left = newLeft + 'px';
        win.style.top = newTop + 'px';
      });

      document.addEventListener('mouseup', function(e) {
        if (!noteDrag.active) return;
        noteDrag.active = false;
        win.style.transition = '';
        saveNotePosition();
      });
    }

    function initNoteResize() {
      var handle = document.getElementById('noteResizeHandle');
      var win = document.getElementById('noteWindow');
      if (!handle || !win) return;

      handle.addEventListener('mousedown', function(e) {
        noteResize.active = true;
        noteResize.startX = e.clientX;
        noteResize.startY = e.clientY;
        noteResize.startW = win.offsetWidth;
        noteResize.startH = win.offsetHeight;
        win.style.transition = 'none';
        e.preventDefault();
        e.stopPropagation();
      });

      document.addEventListener('mousemove', function(e) {
        if (!noteResize.active) return;
        var newW = noteResize.startW + (e.clientX - noteResize.startX);
        var newH = noteResize.startH + (e.clientY - noteResize.startY);
        newW = Math.max(340, Math.min(newW, window.innerWidth - win.getBoundingClientRect().left - 10));
        newH = Math.max(380, Math.min(newH, window.innerHeight - win.getBoundingClientRect().top - 10));
        win.style.width = newW + 'px';
        win.style.height = newH + 'px';
      });

      document.addEventListener('mouseup', function(e) {
        if (!noteResize.active) return;
        noteResize.active = false;
        win.style.transition = '';
        saveNoteSize();
      });
    }

    initNoteDrag();
    initNoteResize();

    // === Pomodoro Feature ===
    var pomoMode = 'work'; // work / short / long
    var pomoDurations = { work: 25*60, short: 5*60, long: 15*60 };
    var pomoRemaining = pomoDurations.work;
    var pomoRunning = false;
    var pomoInterval = null;
    var pomoDrag = { active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
    var pomoResize = { active: false, startX: 0, startY: 0, startW: 0, startH: 0 };

    function pomoGetStats() {
      try {
        var s = JSON.parse(localStorage.getItem('nav_pomo_stats') || '{}');
        var today = new Date().toISOString().slice(0,10);
        if (s.date !== today) { s = { date: today, count: 0, totalMin: 0 }; }
        return { date: today, count: s.count||0, totalMin: s.totalMin||0 };
      } catch(e) { return { date: new Date().toISOString().slice(0,10), count: 0, totalMin: 0 }; }
    }

    function pomoSaveStats(stats) {
      try { localStorage.setItem('nav_pomo_stats', JSON.stringify(stats)); } catch(e) {}
    }

    function pomoAddCompleted() {
      var stats = pomoGetStats();
      stats.count += 1;
      stats.totalMin += 25;
      pomoSaveStats(stats);
      pomoRenderStats();
    }

    function pomoRenderStats() {
      var stats = pomoGetStats();
      var c = document.getElementById('pomoTodayCount');
      var m = document.getElementById('pomoTotalMin');
      if (c) c.textContent = stats.count;
      if (m) m.textContent = stats.totalMin;
    }

    function pomoFormat(sec) {
      var m = Math.floor(sec / 60);
      var s = sec % 60;
      return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
    }

    function pomoRenderTime() {
      var t = document.getElementById('pomoTime');
      var p = document.getElementById('pomoPhase');
      var circle = document.getElementById('pomoCircle');
      var btn = document.getElementById('pomoStartBtn');
      if (t) t.textContent = pomoFormat(pomoRemaining);
      var total = pomoDurations[pomoMode];
      var pct = (total - pomoRemaining) / total;
      if (circle) {
        var deg = pct * 360;
        var color = pomoMode === 'work' ? 'var(--accent)' : '#16a34a';
        var bg = 'var(--bg3)';
        circle.style.background = 'conic-gradient(' + color + ' 0deg, ' + color + ' ' + deg + 'deg, ' + bg + ' ' + deg + 'deg, ' + bg + ' 360deg)';
        if (pomoMode !== 'work') circle.classList.add('break'); else circle.classList.remove('break');
      }
      if (p) {
        if (pomoRunning) p.textContent = (pomoMode === 'work' ? '专注中…' : (pomoMode === 'short' ? '短休中…' : '长休中…'));
        else p.textContent = pomoMode === 'work' ? '点击开始专注' : (pomoMode === 'short' ? '短休准备' : '长休准备');
      }
      if (btn) btn.textContent = pomoRunning ? '暂停' : (pomoRemaining < pomoDurations[pomoMode] ? '继续' : '开始');
    }

    function pomoToggle() {
      if (pomoRunning) {
        pomoRunning = false;
        clearInterval(pomoInterval);
      } else {
        pomoRunning = true;
        pomoInterval = setInterval(function() {
          pomoRemaining--;
          if (pomoRemaining <= 0) {
            pomoFinish();
          } else {
            pomoRenderTime();
          }
        }, 1000);
      }
      pomoRenderTime();
    }

    function pomoFinish() {
      clearInterval(pomoInterval);
      pomoRunning = false;
      if (pomoMode === 'work') {
        pomoAddCompleted();
        pomoMode = 'short';
        pomoRemaining = pomoDurations.short;
        var stats = pomoGetStats();
        if (stats.count % 4 === 0) { pomoMode = 'long'; pomoRemaining = pomoDurations.long; }
        try { new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==').play(); } catch(e) {}
        document.title = '🍅 专注完成！';
        setTimeout(function(){ document.title = 'Auroraus导航'; }, 4000);
      } else {
        pomoMode = 'work';
        pomoRemaining = pomoDurations.work;
      }
      pomoUpdateTabs();
      pomoRenderTime();
    }

    function pomoReset() {
      clearInterval(pomoInterval);
      pomoRunning = false;
      pomoRemaining = pomoDurations[pomoMode];
      pomoRenderTime();
    }

    function pomoSwitchMode(mode, el) {
      if (pomoRunning && !confirm('当前计时进行中，确定要切换模式吗？')) return;
      clearInterval(pomoInterval);
      pomoRunning = false;
      pomoMode = mode;
      pomoRemaining = pomoDurations[mode];
      pomoUpdateTabs();
      pomoRenderTime();
    }

    function pomoUpdateTabs() {
      var tabs = document.querySelectorAll('#pomoWindow .pomo-tab');
      tabs.forEach(function(t) {
        if (t.dataset.mode === pomoMode) t.classList.add('active');
        else t.classList.remove('active');
      });
    }

    function togglePomoWindow() {
      var win = document.getElementById('pomoWindow');
      if (!win) return;
      if (win.classList.contains('visible')) closePomoWindow();
      else openPomoWindow();
    }

    function openPomoWindow() {
      var win = document.getElementById('pomoWindow');
      if (!win) return;
      pomoRestorePos();
      win.classList.add('visible');
      pomoRenderStats();
      pomoRenderTime();
    }

    function closePomoWindow() {
      var win = document.getElementById('pomoWindow');
      if (!win) return;
      win.classList.remove('visible');
    }

    function pomoRestorePos() {
      var win = document.getElementById('pomoWindow');
      if (!win) return;
      try {
        var saved = JSON.parse(localStorage.getItem('nav_pomo_pos') || 'null');
        if (saved && typeof saved.x === 'number') {
          var maxX = window.innerWidth - win.offsetWidth - 10;
          var maxY = window.innerHeight - win.offsetHeight - 10;
          win.style.left = Math.min(Math.max(saved.x, 10), maxX) + 'px';
          win.style.top = Math.min(Math.max(saved.y, 10), maxY) + 'px';
          win.style.right = 'auto';
        }
        if (saved && typeof saved.w === 'number' && saved.w >= 280 && saved.h >= 360) {
          win.style.width = saved.w + 'px'; win.style.height = saved.h + 'px';
        }
      } catch(e) {}
    }

    function pomoSavePos() {
      var win = document.getElementById('pomoWindow');
      if (!win) return;
      try {
        var rect = win.getBoundingClientRect();
        localStorage.setItem('nav_pomo_pos', JSON.stringify({ x: rect.left, y: rect.top, w: rect.width, h: rect.height }));
      } catch(e) {}
    }

    function initPomoDrag() {
      var header = document.getElementById('pomoHeader');
      var win = document.getElementById('pomoWindow');
      if (!header || !win) return;
      header.addEventListener('mousedown', function(e) {
        if (e.target.tagName === 'BUTTON') return;
        pomoDrag.active = true; pomoDrag.startX = e.clientX; pomoDrag.startY = e.clientY;
        var rect = win.getBoundingClientRect();
        pomoDrag.startLeft = rect.left; pomoDrag.startTop = rect.top;
        win.style.right = 'auto'; win.style.left = rect.left + 'px'; win.style.top = rect.top + 'px';
        win.style.transition = 'none'; e.preventDefault();
      });
      document.addEventListener('mousemove', function(e) {
        if (!pomoDrag.active) return;
        var newLeft = Math.max(0, Math.min(pomoDrag.startLeft + e.clientX - pomoDrag.startX, window.innerWidth - win.offsetWidth));
        var newTop = Math.max(0, Math.min(pomoDrag.startTop + e.clientY - pomoDrag.startY, window.innerHeight - win.offsetHeight));
        win.style.left = newLeft + 'px'; win.style.top = newTop + 'px';
      });
      document.addEventListener('mouseup', function(e) {
        if (!pomoDrag.active) return;
        pomoDrag.active = false; win.style.transition = ''; pomoSavePos();
      });
    }

    function initPomoResize() {
      var handle = document.getElementById('pomoResizeHandle');
      var win = document.getElementById('pomoWindow');
      if (!handle || !win) return;
      handle.addEventListener('mousedown', function(e) {
        pomoResize.active = true; pomoResize.startX = e.clientX; pomoResize.startY = e.clientY;
        pomoResize.startW = win.offsetWidth; pomoResize.startH = win.offsetHeight;
        win.style.transition = 'none'; e.preventDefault(); e.stopPropagation();
      });
      document.addEventListener('mousemove', function(e) {
        if (!pomoResize.active) return;
        var newW = Math.max(280, Math.min(pomoResize.startW + e.clientX - pomoResize.startX, window.innerWidth - win.getBoundingClientRect().left - 10));
        var newH = Math.max(360, Math.min(pomoResize.startH + e.clientY - pomoResize.startY, window.innerHeight - win.getBoundingClientRect().top - 10));
        win.style.width = newW + 'px'; win.style.height = newH + 'px';
      });
      document.addEventListener('mouseup', function(e) {
        if (!pomoResize.active) return;
        pomoResize.active = false; win.style.transition = ''; pomoSavePos();
      });
    }

    function pomoExport() {
      var stats = pomoGetStats();
      var data = { version: 1, exportedAt: new Date().toISOString(), stats: stats };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = 'auroraus_pomo_' + new Date().toISOString().slice(0,10) + '.json';
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    function pomoImport() {
      var f = document.getElementById('pomoImportFile');
      if (f) f.click();
    }

    function pomoHandleImport(event) {
      var file = event.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function(e) {
        try {
          var data = JSON.parse(e.target.result);
          if (data.stats) { pomoSaveStats(data.stats); pomoRenderStats(); }
        } catch(err) { alert('解析文件失败'); }
      };
      reader.readAsText(file); event.target.value = '';
    }

    initPomoDrag();
    initPomoResize();

    // === Unit Converter Feature ===
    var convCat = 'length';
    var convG = 9.8; // 重力加速度（可修改），影响 kgf 与耗油率换算
    var convDrag = { active: false, startX: 0, startY: 0, startLeft: 0, startTop: 0 };
    var convResize = { active: false, startX: 0, startY: 0, startW: 0, startH: 0 };

    // factor = 1 of this unit equals factor base units (first in list = base, factor=1)
    var convData = {
      byte: [
        { label: 'B (字节)', factor: 1 },
        { label: 'KB', factor: 1024 },
        { label: 'MB', factor: 1048576 },
        { label: 'GB', factor: 1073741824 },
        { label: 'TB', factor: 1099511627776 },
        { label: 'PB', factor: 1125899906842624 },
        { label: 'bit (比特)', factor: 0.125 },
        { label: 'Kibit', factor: 128 }
      ],
      temp: [
        { label: '℃ (摄氏)', toBase: function(v){return v;}, fromBase: function(v){return v;} },
        { label: '℉ (华氏)', toBase: function(v){return (v-32)*5/9;}, fromBase: function(v){return v*9/5+32;} },
        { label: 'K (开尔文)', toBase: function(v){return v-273.15;}, fromBase: function(v){return v+273.15;} },
        { label: '°R (兰氏度)', toBase: function(v){return (v-491.67)*5/9;}, fromBase: function(v){return v*9/5+491.67;} }
      ],
      angle: [
        { label: '度 (°)', factor: 1 },
        { label: '弧度 (rad)', factor: 57.29577951308232 },
        { label: '梯度 (grad)', factor: 0.9 },
        { label: '角秒 (″)', factor: 1/3600 },
        { label: '角分 (′)', factor: 1/60 },
        { label: '转 (turn)', factor: 360 },
        { label: '毫弧度 (mrad)', factor: 0.05729577951308232 }
      ],
      length: [
        { label: 'm (米)', factor: 1 },
        { label: 'km (千米)', factor: 1000 },
        { label: 'cm (厘米)', factor: 0.01 },
        { label: 'mm (毫米)', factor: 0.001 },
        { label: 'μm (微米)', factor: 0.000001 },
        { label: 'nm (纳米)', factor: 0.000000001 },
        { label: '里 (市里)', factor: 500 },
        { label: '丈', factor: 10/3 },
        { label: '尺 (市尺)', factor: 1/3 },
        { label: '寸 (市寸)', factor: 1/30 },
        { label: 'inch (英寸)', factor: 0.0254 },
        { label: 'ft (英尺)', factor: 0.3048 },
        { label: 'yd (码)', factor: 0.9144 },
        { label: 'mile (英里)', factor: 1609.344 },
        { label: 'nmi (海里)', factor: 1852 },
        { label: 'mil (密耳)', factor: 0.0000254 },
        { label: '光年 (ly)', factor: 9460730472580800 }
      ],
      mass: [
        { label: 'kg (千克)', factor: 1 },
        { label: 'g (克)', factor: 0.001 },
        { label: 'mg (毫克)', factor: 0.000001 },
        { label: 't (吨)', factor: 1000 },
        { label: '斤', factor: 0.5 },
        { label: '两', factor: 0.05 },
        { label: '钱', factor: 0.005 },
        { label: 'lb (磅)', factor: 0.45359237 },
        { label: 'oz (盎司)', factor: 0.028349523125 },
        { label: 'slug (斯勒格)', factor: 14.59390293720636 },
        { label: 'grain (格令)', factor: 0.00006479891 },
        { label: 'US ton (短吨)', factor: 907.18474 },
        { label: 'long ton (长吨)', factor: 1016.0469088 },
        { label: 'ct (克拉)', factor: 0.0002 }
      ],
      pressure: [
        { label: 'Pa (帕)', factor: 1 },
        { label: 'kPa (千帕)', factor: 1000 },
        { label: 'MPa (兆帕)', factor: 1000000 },
        { label: 'GPa (吉帕)', factor: 1000000000 },
        { label: 'bar (巴)', factor: 100000 },
        { label: 'mbar (毫巴)', factor: 100 },
        { label: 'atm (标准大气压)', factor: 101325 },
        { label: 'psi (磅/英寸²)', factor: 6894.757293168 },
        { label: 'psf (磅/英尺²)', factor: 47.880258980335 },
        { label: 'ksi (千磅/英寸²)', factor: 6894757.293168 },
        { label: 'mmHg (毫米汞柱)', factor: 133.322387415 },
        { label: 'inHg (英寸汞柱)', factor: 3386.389 },
        { label: 'torr (托)', factor: 133.322368421 },
        { label: 'at (工程大气压)', factor: 98066.5 }
      ],
      force: [
        { label: 'DaN (十牛)', factor: 10 },
        { label: 'N (牛)', factor: 1 },
        { label: 'kN (千牛)', factor: 1000 },
        { label: 'MN (兆牛)', factor: 1000000 },
        { label: 'dyn (达因)', factor: 0.00001 },
        { label: 'lbf (磅力)', factor: 4.4482216152605 },
        { label: 'kip (千磅力)', factor: 4448.2216152605 },
        { label: 'kgf (千克力)', toBase: function(v){return v * convG;}, fromBase: function(v){return v / convG;} },
        { label: 'pdl (磅达)', factor: 0.138254954376 }
      ],
      area: [
        { label: 'm² (平方米)', factor: 1 },
        { label: 'km² (平方千米)', factor: 1000000 },
        { label: 'cm² (平方厘米)', factor: 0.0001 },
        { label: 'mm² (平方毫米)', factor: 0.000001 },
        { label: '亩', factor: 2000/3 },
        { label: '分 (市分)', factor: 200/3 },
        { label: '平方丈', factor: 100/9 },
        { label: '平方尺', factor: 1/9 },
        { label: 'ha (公顷)', factor: 10000 },
        { label: 'acre (英亩)', factor: 4046.8564224 },
        { label: 'ft² (平方英尺)', factor: 0.09290304 },
        { label: 'in² (平方英寸)', factor: 0.00064516 },
        { label: 'mi² (平方英里)', factor: 2589988.110336 },
        { label: 'yd² (平方码)', factor: 0.83612736 }
      ],
      power: [
        { label: 'W (瓦)', factor: 1 },
        { label: 'kW (千瓦)', factor: 1000 },
        { label: 'MW (兆瓦)', factor: 1000000 },
        { label: 'mW (毫瓦)', factor: 0.001 },
        { label: 'hp (机械马力)', factor: 745.69987158227 },
        { label: 'PS (公制马力)', factor: 735.49875 },
        { label: 'RT (冷吨)', factor: 3516.8528420667 },
        { label: 'BTU/s', factor: 1055.05585262 },
        { label: 'BTU/h', factor: 0.29307107017222 },
        { label: 'ft·lbf/s', factor: 1.3558179483314 },
        { label: 'cal/s', factor: 4.184 },
        { label: 'kcal/h', factor: 1.1622222222222 }
      ],
      energy: [
        { label: 'J (焦)', factor: 1 },
        { label: 'kJ (千焦)', factor: 1000 },
        { label: 'MJ (兆焦)', factor: 1000000 },
        { label: 'cal (卡)', factor: 4.184 },
        { label: 'kcal (千卡)', factor: 4184 },
        { label: 'BTU', factor: 1055.05585262 },
        { label: 'kWh (千瓦时)', factor: 3600000 },
        { label: 'ft·lbf (英尺磅力)', factor: 1.3558179483314 },
        { label: 'eV (电子伏)', factor: 1.602176634e-19 },
        { label: 'therm ( Therm)', factor: 105505585.262 }
      ],
      velocity: [
        { label: 'm/s', factor: 1 },
        { label: 'km/h', factor: 0.27777777777778 },
        { label: 'mph (英里/时)', factor: 0.44704 },
        { label: 'ft/s (英尺/秒)', factor: 0.3048 },
        { label: 'knot (节)', factor: 0.51444444444444 },
        { label: 'Mach (海平面)', factor: 340.29 },
        { label: 'cm/s', factor: 0.01 }
      ],
      volume: [
        { label: 'L (升)', factor: 1 },
        { label: 'mL (毫升)', factor: 0.001 },
        { label: 'm³ (立方米)', factor: 1000 },
        { label: 'cm³ (立方厘米)', factor: 0.001 },
        { label: '斗', factor: 10 },
        { label: '石', factor: 100 },
        { label: 'gal US (美制加仑)', factor: 3.785411784 },
        { label: 'gal UK (英制加仑)', factor: 4.54609 },
        { label: 'qt (夸脱)', factor: 0.946352946 },
        { label: 'pt (品脱)', factor: 0.473176473 },
        { label: 'cup (杯)', factor: 0.2365882365 },
        { label: 'fl oz US (液量盎司)', factor: 0.0295735295625 },
        { label: 'ft³ (立方英尺)', factor: 28.316846592 },
        { label: 'in³ (立方英寸)', factor: 0.016387064 },
        { label: 'yd³ (立方码)', factor: 764.554857984 },
        { label: 'barrel (石油桶)', factor: 158.987294928 }
      ],
      viscosity: [
        { label: 'Pa·s (帕秒)', factor: 1 },
        { label: 'mPa·s (毫帕秒)', factor: 0.001 },
        { label: 'cP (厘泊)', factor: 0.001 },
        { label: 'P (泊)', factor: 0.1 },
        { label: 'lbf·s/ft²', factor: 47.880258980335 },
        { label: 'lb/(ft·s)', factor: 1.4881639435696 },
        { label: 'kg/(m·s)', factor: 1 }
      ],
      density: [
        { label: 'kg/m³', factor: 1 },
        { label: 'g/cm³', factor: 1000 },
        { label: 'g/mL', factor: 1000 },
        { label: 'lb/ft³', factor: 16.01846337396 },
        { label: 'lb/in³', factor: 27679.904710203 },
        { label: 'slug/ft³', factor: 515.3788184 },
        { label: 'lb/gal US', factor: 119.8264273169 }
      ],
      fuel: [
        { label: 'kg/(N·s)', factor: 1 },
        { label: 'g/(N·s)', factor: 0.001 },
        { label: 'kg/(DaN·s)', factor: 0.1 },
        { label: 'g/(DaN·s)', factor: 0.0001 },
        { label: 'kg/(N·h)', factor: 1/3600 },
        { label: 'g/(N·h)', factor: 0.001/3600 },
        { label: 'kg/(DaN·h)', factor: 0.1/3600 },
        { label: 'g/(DaN·h)', factor: 0.0001/3600 },
        { label: 'kg/(kgf·h)', toBase: function(v){return v / convG / 3600;}, fromBase: function(v){return v * convG * 3600;} },
        { label: 'g/(kgf·h)', toBase: function(v){return v * 0.001 / convG / 3600;}, fromBase: function(v){return v * 1000 * convG * 3600;} },
        { label: 'kg/(kgf·s)', toBase: function(v){return v / convG;}, fromBase: function(v){return v * convG;} },
        { label: 'g/(kgf·s)', toBase: function(v){return v * 0.001 / convG;}, fromBase: function(v){return v * 1000 * convG;} }
      ]
    };

    function convUpdateG() {
      var inp = document.getElementById('convGInput');
      if (!inp) return;
      var v = parseFloat(inp.value);
      if (!isNaN(v) && v > 0) { convG = v; convCalc(); }
    }
    function convInitUnits() {
      var sel = document.getElementById('convUnit');
      if (!sel) return;
      var units = convData[convCat];
      var h = '';
      units.forEach(function(u, i) { h += '<option value="' + i + '">' + u.label + '</option>'; });
      sel.innerHTML = h;
    }

    function convSwitchCat(cat, el) {
      convCat = cat;
      var tabs = document.querySelectorAll('#convTabs .conv-tab');
      tabs.forEach(function(t){ t.classList.remove('active'); });
      if (el) el.classList.add('active');
      convInitUnits();
      convCalc();
    }

    function convFormatNum(v) {
      if (!isFinite(v)) return '—';
      var abs = Math.abs(v);
      if (abs === 0) return '0';
      if (abs < 0.000001) return v.toExponential(4);
      if (abs < 0.01) return v.toFixed(8).replace(/\.?0+$/,'');
      if (abs < 1) return v.toFixed(6).replace(/\.?0+$/,'');
      if (abs < 100) return v.toFixed(4).replace(/\.?0+$/,'');
      if (abs < 100000) return v.toFixed(2).replace(/\.?0+$/,'');
      if (abs < 1e15) return v.toFixed(0);
      return v.toExponential(4);
    }

    function convCalc() {
      var inp = document.getElementById('convInput');
      var sel = document.getElementById('convUnit');
      var res = document.getElementById('convResults');
      if (!inp || !sel || !res) return;
      var val = parseFloat(inp.value);
      if (isNaN(val)) { res.innerHTML = '<div class="conv-empty">输入数值后自动换算</div>'; return; }
      var units = convData[convCat];
      var fromIdx = parseInt(sel.value, 10) || 0;
      var fromUnit = units[fromIdx];
      var baseVal;
      if (fromUnit.toBase) baseVal = fromUnit.toBase(val);
      else baseVal = val * fromUnit.factor;

      var h = '';
      units.forEach(function(u, i) {
        if (i === fromIdx) return;
        var converted;
        if (u.fromBase) converted = u.fromBase(baseVal);
        else converted = baseVal / u.factor;
        h += '<div class="conv-result-item">';
        h += '<span class="conv-result-label">' + u.label + '</span>';
        h += '<span class="conv-result-value" onclick="convCopy(this)" title="点击复制">' + convFormatNum(converted) + '</span>';
        h += '</div>';
      });
      res.innerHTML = h;
    }

    function convCopy(el) {
      var text = el.textContent;
      try {
        navigator.clipboard.writeText(text);
        var orig = el.style.color;
        el.style.color = '#16a34a';
        setTimeout(function(){ el.style.color = orig; }, 600);
      } catch(e) {}
    }

    function toggleConvWindow() {
      var win = document.getElementById('convWindow');
      if (!win) return;
      if (win.classList.contains('visible')) closeConvWindow();
      else openConvWindow();
    }

    function openConvWindow() {
      var win = document.getElementById('convWindow');
      if (!win) return;
      convRestorePos();
      win.classList.add('visible');
      convInitUnits();
      convCalc();
      setTimeout(function(){ var i = document.getElementById('convInput'); if (i) i.focus(); }, 100);
    }

    function closeConvWindow() {
      var win = document.getElementById('convWindow');
      if (!win) return;
      win.classList.remove('visible');
    }

    /* ==================== 🌤️ 天气（Open-Meteo 数据 + MSN 跳转） ==================== */
    var WEATHER_LOC_KEY = 'nav_weather_loc';
    var WEATHER_CACHE_KEY = 'nav_weather_cache';
    var WEATHER_GEO_KEY = 'nav_weather_geo';       // IP 定位缓存（12 小时）
    var WEATHER_SRC_KEY = 'nav_weather_loc_src';   // 'user' = 用户手动选的城市
    // 天气属于「锦上添花」：缓存 1 小时、每小时最多刷新一次（用户 2026-10-17 明确要求不必很新）
    var WEATHER_TTL_MS = 60 * 60 * 1000;
    var weatherLoc = { name: '北京', lat: 39.9042, lon: 116.4074 };
    var weatherTimer = null;
    var WMO_TEXT = {
      0: ['晴', '☀️'], 1: ['大部晴朗', '🌤️'], 2: ['多云', '⛅'], 3: ['阴', '☁️'],
      45: ['有雾', '🌫️'], 48: ['雾凇', '🌫️'],
      51: ['小毛毛雨', '🌦️'], 53: ['毛毛雨', '🌦️'], 55: ['大毛毛雨', '🌧️'],
      56: ['冻毛毛雨', '🌧️'], 57: ['强冻毛毛雨', '🌧️'],
      61: ['小雨', '🌦️'], 63: ['中雨', '🌧️'], 65: ['大雨', '🌧️'],
      66: ['冻雨', '🌧️'], 67: ['强冻雨', '🌧️'],
      71: ['小雪', '🌨️'], 73: ['中雪', '🌨️'], 75: ['大雪', '❄️'], 77: ['米雪', '🌨️'],
      80: ['阵雨', '🌦️'], 81: ['强阵雨', '🌧️'], 82: ['暴雨', '⛈️'],
      85: ['阵雪', '🌨️'], 86: ['强阵雪', '❄️'],
      95: ['雷阵雨', '⛈️'], 96: ['雷阵雨伴冰雹', '⛈️'], 99: ['强雷暴伴冰雹', '⛈️']
    };
    var WIND_DIR = ['北', '东北偏北', '东北', '东北偏东', '东', '东南偏东', '东南', '东南偏南',
                    '南', '西南偏南', '西南', '西南偏西', '西', '西北偏西', '西北', '西北偏北'];
    function weatherTextOf(code) {
      return WMO_TEXT[code] || ['未知', '🌡️'];
    }
    function windDirText(deg) {
      if (deg === null || deg === undefined || isNaN(deg)) return '—';
      var i = Math.round(((Number(deg) % 360) / 22.5)) % 16;
      return WIND_DIR[i] + '风';
    }
    function aqiInfo(v) {
      var n = Number(v);
      if (isNaN(n)) return { text: '—', color: '#94a3b8' };
      if (n <= 50) return { text: '优', color: '#22c55e' };
      if (n <= 100) return { text: '良', color: '#84cc16' };
      if (n <= 150) return { text: '轻度污染', color: '#f59e0b' };
      if (n <= 200) return { text: '中度污染', color: '#f97316' };
      if (n <= 300) return { text: '重度污染', color: '#ef4444' };
      return { text: '严重污染', color: '#7c3aed' };
    }
    function weatherLocIsUser() {
      try { return localStorage.getItem(WEATHER_SRC_KEY) === 'user'; } catch(e) { return false; }
    }
    // 关注地优先级：用户手动选的 City > IP 定位（网络所在地，缓存 12h）> 北京
    function loadWeatherLoc() {
      try {
        if (weatherLocIsUser()) {
          var v = JSON.parse(localStorage.getItem(WEATHER_LOC_KEY) || 'null');
          if (v && typeof v.lat === 'number' && typeof v.lon === 'number') {
            weatherLoc = { name: v.name || '北京', lat: v.lat, lon: v.lon };
            return;
          }
        }
        var g = JSON.parse(localStorage.getItem(WEATHER_GEO_KEY) || 'null');
        if (g && typeof g.lat === 'number' && typeof g.lon === 'number' &&
            (Date.now() - (g.ts || 0)) < 12 * 3600 * 1000) {
          weatherLoc = { name: g.name || '当前位置', lat: g.lat, lon: g.lon };
          return;
        }
        // 没有 IP 定位缓存时，用上次天气缓存里的地点（避免为了天气再发一次 IP 查询）
        var wc = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || 'null');
        if (wc && wc.loc && typeof wc.loc.lat === 'number' && typeof wc.loc.lon === 'number') {
          weatherLoc = { name: wc.loc.name || wc.loc.city || weatherLoc.name, lat: wc.loc.lat, lon: wc.loc.lon };
        }
      } catch(e) {}
    }
    function saveWeatherLoc() {
      try {
        localStorage.setItem(WEATHER_LOC_KEY, JSON.stringify(weatherLoc));
        localStorage.setItem(WEATHER_SRC_KEY, 'user');
      } catch(e) {}
    }
    // IP 定位常返回英文城市名，这里给常见城市补个中文名（命中不到就保留原名）
    var IP_CITY_CN = {
      'Beijing': '北京', 'Shanghai': '上海', 'Tianjin': '天津', 'Chongqing': '重庆',
      'Guangzhou': '广州', 'Shenzhen': '深圳', 'Hangzhou': '杭州', 'Nanjing': '南京',
      'Wuhan': '武汉', 'Chengdu': '成都', 'Xi\'an': '西安', 'Xi’an': '西安',
      'Shenyang': '沈阳', 'Harbin': '哈尔滨', 'Changsha': '长沙', 'Zhengzhou': '郑州',
      'Jinan': '济南', 'Qingdao': '青岛', 'Xiamen': '厦门', 'Fuzhou': '福州',
      'Kunming': '昆明', 'Hefei': '合肥', 'Nanchang': '南昌', 'Shijiazhuang': '石家庄',
      'Taiyuan': '太原', 'Urumqi': '乌鲁木齐', 'Lhasa': '拉萨', 'Guiyang': '贵阳',
      'Nanning': '南宁', 'Haikou': '海口', 'Suzhou': '苏州', 'Dalian': '大连', 'Ningbo': '宁波'
    };
    function ipCityName(name) { return (name && IP_CITY_CN[name]) ? IP_CITY_CN[name] : (name || '当前位置'); }
    // IP 定位（网络所在地）：多个源依次尝试，任一成功即用
    function fetchIpGeo() {
      var sources = [
        { url: 'https://ipwho.is/', pick: function(d) {
            if (!d || d.success === false || !d.latitude || !d.longitude) return null;
            return { name: ipCityName(d.city || d.region || d.country), lat: Number(d.latitude), lon: Number(d.longitude) };
          } },
        { url: 'https://ipinfo.io/json', pick: function(d) {
            if (!d || !d.loc) return null;
            var p = String(d.loc).split(',');
            var lat = parseFloat(p[0]), lon = parseFloat(p[1]);
            if (!isFinite(lat) || !isFinite(lon)) return null;
            return { name: ipCityName(d.city || d.region || d.country), lat: lat, lon: lon };
          } },
        { url: 'https://api.ip.sb/geoip', pick: function(d) {
            if (!d || !d.latitude || !d.longitude) return null;
            return { name: ipCityName(d.city || d.region || d.country), lat: Number(d.latitude), lon: Number(d.longitude) };
          } }
      ];
      function tryOne(i) {
        if (i >= sources.length) return Promise.reject(new Error('no-geo'));
        var s = sources[i];
        return fetchT(s.url, { mode: 'cors', cache: 'no-store' }, 5000)
          .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
          .then(function(d) { var g = s.pick(d); if (!g) throw new Error('bad'); return g; })
          .catch(function() { return tryOne(i + 1); });
      }
      return tryOne(0);
    }
    // 确保 weatherLoc 有值（用户城市 > 12h 内的 IP 缓存 > 现场 IP 定位 > 北京）
    function ensureWeatherLocation() {
      return new Promise(function(resolve) {
        loadWeatherLoc();
        if (weatherLocIsUser() || weatherLoc.name !== '北京') return resolve(weatherLoc);
        var cachedFresh = false;
        try {
          var g = JSON.parse(localStorage.getItem(WEATHER_GEO_KEY) || 'null');
          cachedFresh = !!(g && (Date.now() - (g.ts || 0)) < 12 * 3600 * 1000);
        } catch(e) {}
        if (cachedFresh) return resolve(weatherLoc);
        fetchIpGeo().then(function(g) {
          try { localStorage.setItem(WEATHER_GEO_KEY, JSON.stringify({ name: g.name, lat: g.lat, lon: g.lon, ts: Date.now() })); } catch(e) {}
          weatherLoc = { name: g.name, lat: g.lat, lon: g.lon };
          resolve(weatherLoc);
        }).catch(function() { resolve(weatherLoc); });
      });
    }
    // 首屏右上角天气按钮：自动显示关注地当前的天气图标
    function setHeroWeatherIcon(emoji, title) {
      var b = document.getElementById('heroWeatherBtn');
      if (!b) return;
      if (emoji) b.textContent = emoji;
      if (title) b.title = title;
    }
    function fetchWeatherData() {
      var f = 'https://api.open-meteo.com/v1/forecast?latitude=' + weatherLoc.lat + '&longitude=' + weatherLoc.lon +
        '&current=temperature_2m,relative_humidity_2m,surface_pressure,weather_code,wind_speed_10m,wind_direction_10m,' +
        'wind_gusts_10m,apparent_temperature,visibility,precipitation,cloud_cover,is_day' +
        '&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_probability_max' +
        '&timezone=auto&forecast_days=1';
      var a = 'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=' + weatherLoc.lat +
        '&longitude=' + weatherLoc.lon + '&current=pm2_5,pm10,us_aqi,european_aqi,' +
        'alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen&timezone=auto';
      function getJSON(u) {
        return fetchT(u, { mode: 'cors', cache: 'no-store' }, 8000).then(function(r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        });
      }
      return Promise.all([getJSON(f), getJSON(a).catch(function() { return null; })])
        .then(function(res) { return { forecast: res[0], air: res[1], ts: Date.now() }; });
    }
    // 能见度：米 → 人类可读
    function visText(m) {
      var n = Number(m);
      if (!isFinite(n)) return '—';
      var km = n / 1000;
      if (km >= 10) return Math.round(km) + ' km';
      if (km >= 1) return km.toFixed(1) + ' km';
      return Math.round(n) + ' m';
    }
    // 花粉：Open-Meteo 的 pollen 字段只在欧洲有数据（CAMS Europe），中国区返回 null
    var POLLEN_FIELDS = [
      ['birch_pollen', '桦树'], ['alder_pollen', '赤杨'], ['grass_pollen', '禾本科'],
      ['mugwort_pollen', '蒿属'], ['olive_pollen', '橄榄'], ['ragweed_pollen', '豚草']
    ];
    function pollenInfo(air) {
      var cur = (air && air.current) ? air.current : null;
      if (!cur) return { known: false };
      var hits = [], max = null, anyNumber = false;
      POLLEN_FIELDS.forEach(function(f) {
        var v = cur[f[0]];
        if (v === null || v === undefined || typeof v !== 'number') return;
        anyNumber = true;
        if (max === null || v > max) max = v;
        if (v > 0.4) hits.push({ name: f[1], v: v });
      });
      if (!anyNumber) return { known: false };
      hits.sort(function(a, b) { return b.v - a.v; });
      var level, color;
      if (max <= 1) { level = '很低'; color = '#22c55e'; }
      else if (max <= 10) { level = '低'; color = '#84cc16'; }
      else if (max <= 50) { level = '中'; color = '#f59e0b'; }
      else if (max <= 200) { level = '高'; color = '#f97316'; }
      else { level = '很高'; color = '#ef4444'; }
      return { known: true, level: level, color: color, max: max, hits: hits.slice(0, 3) };
    }
    // 穿衣建议：以体感温度为主，叠加风、降水概率、紫外线
    function clothingAdvice(feels, wind, precipProb, uv) {
      var t = (feels === null || feels === undefined || isNaN(feels)) ? null : Number(feels);
      var base;
      if (t === null) base = '体感数据缺失，按今日气温自行加减衣物';
      else if (t >= 30) base = '短袖短裤 / 轻薄连衣裙，注意防晒补水';
      else if (t >= 26) base = '短袖 T 恤、薄长裤或短裙';
      else if (t >= 21) base = '长袖衬衫 / 薄长裤，早晚可搭薄开衫';
      else if (t >= 16) base = '薄外套或卫衣，里面一件长袖';
      else if (t >= 11) base = '夹克 / 风衣，内搭针织衫';
      else if (t >= 6) base = '厚外套 / 毛衣，注意保暖';
      else if (t >= 0) base = '棉服或羽绒服，围巾手套更稳妥';
      else base = '厚羽绒 + 围巾、手套、帽子';
      var extra = [];
      // 风速单位是 km/h（Open-Meteo 默认），20 km/h ≈ 5.5 m/s 才算"风大"
      if (wind !== null && wind !== undefined && Number(wind) >= 20) extra.push('风大，加件防风外套');
      if (precipProb !== null && precipProb !== undefined && Number(precipProb) >= 50) extra.push('降水概率 ' + Math.round(precipProb) + '%，带伞');
      if (uv !== null && uv !== undefined && Number(uv) >= 6) extra.push('紫外线强，注意防晒');
      return { base: base, extra: extra };
    }
    function renderWeather(data) {
      var body = document.getElementById('weatherBody');
      if (!body || !data || !data.forecast) return;
      var fc = data.forecast, cur = fc.current || {}, daily = fc.daily || {};
      var code = cur.weather_code;
      var wt = weatherTextOf(code);
      var temp = (cur.temperature_2m !== undefined && cur.temperature_2m !== null) ? Math.round(cur.temperature_2m) : '—';
      var feels = (cur.apparent_temperature !== undefined && cur.apparent_temperature !== null) ? Math.round(cur.apparent_temperature) : null;
      var tmax = (daily.temperature_2m_max && daily.temperature_2m_max[0] !== undefined) ? Math.round(daily.temperature_2m_max[0]) : '—';
      var tmin = (daily.temperature_2m_min && daily.temperature_2m_min[0] !== undefined) ? Math.round(daily.temperature_2m_min[0]) : '—';
      var sunrise = (daily.sunrise && daily.sunrise[0]) ? daily.sunrise[0].slice(11, 16) : '—';
      var sunset = (daily.sunset && daily.sunset[0]) ? daily.sunset[0].slice(11, 16) : '—';
      var uv = (daily.uv_index_max && daily.uv_index_max[0] !== undefined) ? daily.uv_index_max[0] : null;
      // 首屏按钮跟着关注地的实时天气换图标（用户要求：自动显示关注地/网络所在地的天气状态）
      setHeroWeatherIcon(wt[1], weatherLoc.name + ' ' + temp + '° ' + wt[0] + ' · 点开看天气详情');
      var precipProb = (daily.precipitation_probability_max && daily.precipitation_probability_max[0] !== undefined)
        ? daily.precipitation_probability_max[0] : null;
      var aqiVal = (data.air && data.air.current) ? data.air.current.us_aqi : null;
      var pm25 = (data.air && data.air.current) ? data.air.current.pm2_5 : null;
      var ai = aqiInfo(aqiVal);
      var pol = pollenInfo(data.air);
      var cloth = clothingAdvice(feels, cur.wind_speed_10m, precipProb, uv);
      var h = '';
      // ① 主区：温度 + 天气 + 城市 + 今日范围
      h += '<div class="weather-hero">';
      h += '<div class="weather-emoji">' + wt[1] + '</div>';
      h += '<div class="weather-hero-main">';
      h += '<div class="weather-temp">' + temp + '<small>°C</small></div>';
      h += '<div class="weather-desc">' + wt[0] + '</div>';
      h += '<div class="weather-city">📍 ' + weatherLoc.name +
           '<span class="weather-feels">体感 ' + (feels === null ? '—' : feels + '°') + '</span></div>';
      h += '</div>';
      h += '<div class="weather-range-box"><span class="wr-k">今日</span><span class="wr-v">' + tmin + '° ~ ' + tmax + '°</span></div>';
      h += '</div>';

      // ② 关键指标
      h += '<div class="weather-sec-title">关键指标</div>';
      h += '<div class="weather-grid">';
      h += '<div class="weather-cell"><span class="wc-k">💧 湿度</span><span class="wc-v">' +
           (cur.relative_humidity_2m !== undefined ? cur.relative_humidity_2m + '%' : '—') + '</span></div>';
      h += '<div class="weather-cell"><span class="wc-k">👁️ 能见度</span><span class="wc-v">' + visText(cur.visibility) + '</span></div>';
      h += '<div class="weather-cell"><span class="wc-k">💨 风</span><span class="wc-v">' +
           windDirText(cur.wind_direction_10m) + ' ' +
           (cur.wind_speed_10m !== undefined ? Math.round(cur.wind_speed_10m) + ' km/h' : '—') + '</span></div>';
      h += '<div class="weather-cell"><span class="wc-k">🧭 气压</span><span class="wc-v">' +
           (cur.surface_pressure !== undefined ? Math.round(cur.surface_pressure) + ' hPa' : '—') + '</span></div>';
      h += '<div class="weather-cell"><span class="wc-k">🌅 日出</span><span class="wc-v">' + sunrise + '</span></div>';
      h += '<div class="weather-cell"><span class="wc-k">🌇 日落</span><span class="wc-v">' + sunset + '</span></div>';
      h += '<div class="weather-cell"><span class="wc-k">☀️ 紫外线</span><span class="wc-v">' +
           (uv === null ? '—' : Math.round(uv) + ' / 11') + '</span></div>';
      h += '<div class="weather-cell"><span class="wc-k">☔ 降水概率</span><span class="wc-v">' +
           (precipProb === null ? '—' : Math.round(precipProb) + '%') + '</span></div>';
      h += '</div>';

      // ③ 空气质量（+ 花粉只有真的拿到数据才显示「过敏」那一行）
      var hasAir = !!(data.air && data.air.current);
      if (hasAir || pol.known) {
        h += '<div class="weather-sec-title">' + (pol.known ? '空气与过敏' : '空气质量') + '</div>';
        h += '<div class="weather-rows">';
        if (hasAir) {
          h += '<div class="weather-row"><span class="wr-label">空气质量</span><span class="wr-val weather-aqi">' +
               '<span class="aqi-dot" style="background:' + ai.color + '"></span>' + ai.text +
               (aqiVal !== null ? ' · AQI ' + Math.round(aqiVal) : '') +
               (pm25 !== null && pm25 !== undefined ? ' · PM2.5 ' + Math.round(pm25) : '') + '</span></div>';
        }
        if (pol.known) {
          var srcTxt = pol.hits.length
            ? pol.hits.map(function(x) { return x.name + ' ' + Math.round(x.v) + ' 粒/m³'; }).join('、')
            : '基本无花粉';
          h += '<div class="weather-row"><span class="wr-label">过敏（花粉）</span><span class="wr-val">' +
               '<span class="aqi-dot" style="background:' + pol.color + '"></span>' + pol.level +
               '<span class="wr-sub">' + srcTxt + '</span></span></div>';
        }
        h += '</div>';
      }

      // ④ 穿衣建议
      h += '<div class="weather-sec-title">穿衣建议</div>';
      h += '<div class="weather-cloth"><span class="wc-icon">👕</span><div>' + cloth.base +
           (cloth.extra.length ? '<span class="wr-sub">' + cloth.extra.join('；') + '</span>' : '') + '</div></div>';

      h += '<div class="weather-updated">数据源 Open-Meteo（forecast + air-quality）· 更新于 ' +
           new Date(data.ts).toLocaleTimeString('zh-CN', { hour12: false }) +
           (weatherLocIsUser() ? ' · 关注地：' + weatherLoc.name : ' · 位置：网络所在地 ' + weatherLoc.name) + '</div>';
      body.innerHTML = h;
    }
    function renderWeatherError(msg) {
      var body = document.getElementById('weatherBody');
      if (!body) return;
      body.innerHTML = '<div class="weather-loading">天气获取失败：' + (msg || '') +
        '<br><span style="opacity:.8">可点下方「MSN 详情」直接看网页版天气</span></div>';
    }
    function loadWeather(force) {
      var body = document.getElementById('weatherBody');
      if (!force) {
        try {
          var cache = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || 'null');
          if (cache && cache.ts && (Date.now() - cache.ts) < WEATHER_TTL_MS && cache.loc &&
              cache.loc.lat === weatherLoc.lat && cache.loc.lon === weatherLoc.lon) {
            renderWeather(cache.data);
            return Promise.resolve();
          }
        } catch(e) {}
      }
      if (body) body.innerHTML = '<div class="weather-loading">正在获取天气…</div>';
      return fetchWeatherData().then(function(data) {
        renderWeather(data);
        try {
          localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({
            ts: data.ts, loc: { name: weatherLoc.name, lat: weatherLoc.lat, lon: weatherLoc.lon }, data: data
          }));
        } catch(e) {}
      }).catch(function(e) { renderWeatherError(e && e.message ? e.message : ''); });
    }
    function toggleWeatherWindow() {
      var win = document.getElementById('weatherWindow');
      if (!win) return;
      if (win.classList.contains('visible')) closeWeatherWindow();
      else openWeatherWindow();
    }
    function openWeatherWindow() {
      var win = document.getElementById('weatherWindow');
      if (!win) return;
      win.classList.add('visible');
      var hb = document.getElementById('heroWeatherBtn');
      if (hb) hb.classList.add('on');
      loadWeatherWeatherPos();
      loadWeather(false);
      if (weatherTimer) clearInterval(weatherTimer);
      weatherTimer = setInterval(function() {
        if (document.getElementById('weatherWindow').classList.contains('visible')) loadWeather(false);
      }, WEATHER_TTL_MS);
    }
    function closeWeatherWindow() {
      var win = document.getElementById('weatherWindow');
      if (!win) return;
      win.classList.remove('visible');
      var hb = document.getElementById('heroWeatherBtn');
      if (hb) hb.classList.remove('on');
      if (weatherTimer) { clearInterval(weatherTimer); weatherTimer = null; }
    }
    function loadWeatherWeatherPos() {
      var win = document.getElementById('weatherWindow');
      if (!win) return;
      try {
        var p = JSON.parse(localStorage.getItem('nav_weather_pos') || 'null');
        if (p && typeof p.x === 'number') {
          var maxX = window.innerWidth - win.offsetWidth - 10;
          var maxY = window.innerHeight - win.offsetHeight - 10;
          win.style.left = Math.max(6, Math.min(p.x, maxX)) + 'px';
          win.style.top = Math.max(6, Math.min(p.y, maxY)) + 'px';
          win.style.right = 'auto';
        }
      } catch(e) {}
    }
    // 城市搜索（Open-Meteo 地理编码，支持中英文）
    function searchWeatherCity() {
      var input = document.getElementById('weatherCityInput');
      if (!input) return;
      var q = (input.value || '').trim();
      if (!q) { input.focus(); return; }
      var url = 'https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) +
                '&count=1&language=zh&format=json';
      fetchT(url, { mode: 'cors', cache: 'no-store' }, 6000).then(function(r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function(j) {
        if (!j.results || !j.results.length) { renderWeatherError('没找到这个城市，换个写法试试'); return; }
        var r0 = j.results[0];
        weatherLoc = { name: r0.name || q, lat: r0.latitude, lon: r0.longitude };
        saveWeatherLoc();
        input.value = '';
        return loadWeather(true);
      }).catch(function(e) { renderWeatherError(e && e.message ? e.message : ''); });
    }
    // 一键跳到 MSN 天气（地图模式 / 城市预报详情）
    // 注意：MSN 的 /weather/overview 已经 404（点开会看到一堆源码/报错），
    // 详情页要用 /weather/forecast/in-<城市名>，地图用 /weather/maps?loc=lat,lon。
    function openMsnWeather(kind) {
      var url;
      if (kind === 'maps') {
        url = 'https://www.msn.com/zh-cn/weather/maps?loc=' +
              encodeURIComponent(weatherLoc.lat + ',' + weatherLoc.lon);
      } else {
        url = 'https://www.msn.com/zh-cn/weather/forecast/in-' +
              encodeURIComponent(weatherLoc.name || 'Beijing');
      }
      window.open(url, '_blank', 'noopener');
    }
    // 天气窗拖动（放在标题栏）
    (function() {
      var win = document.getElementById('weatherWindow');
      var head = document.getElementById('weatherHeader');
      if (!win || !head) return;
      var drag = { on: false, sx: 0, sy: 0, left: 0, top: 0 };
      head.addEventListener('mousedown', function(e) {
        if (e.target.closest('button')) return;
        var r = win.getBoundingClientRect();
        drag = { on: true, sx: e.clientX, sy: e.clientY, left: r.left, top: r.top };
        win.style.right = 'auto';
        e.preventDefault();
      });
      document.addEventListener('mousemove', function(e) {
        if (!drag.on) return;
        var x = Math.max(6, Math.min(drag.left + e.clientX - drag.sx, window.innerWidth - win.offsetWidth - 6));
        var y = Math.max(6, Math.min(drag.top + e.clientY - drag.sy, window.innerHeight - 60));
        win.style.left = x + 'px';
        win.style.top = y + 'px';
      });
      document.addEventListener('mouseup', function() {
        if (!drag.on) return;
        drag.on = false;
        try {
          var r = win.getBoundingClientRect();
          localStorage.setItem('nav_weather_pos', JSON.stringify({ x: r.left, y: r.top }));
        } catch(e) {}
      });
    })();
    // 启动：先用缓存把首屏天气图标画上（纯本地，零网络），
    // 网络部分（IP 定位 + 拉天气）延迟到首屏画完、主线程空闲后再做，绝不跟搜索框/卡片抢资源。
    function initWeatherBadge() {
      loadWeatherLoc();
      var cachedFresh = false;
      try {
        var c = JSON.parse(localStorage.getItem(WEATHER_CACHE_KEY) || 'null');
        if (c && c.data && c.data.forecast && c.data.forecast.current) {
          var wt = weatherTextOf(c.data.forecast.current.weather_code);
          setHeroWeatherIcon(wt[1], weatherLoc.name + ' 天气 · 点开看详情');
          cachedFresh = !!(c.ts && (Date.now() - c.ts) < WEATHER_TTL_MS);
          if (cachedFresh) renderWeather(c.data);       // 天气窗里面也先用缓存铺上
        }
      } catch(e) {}
      if (cachedFresh) return;                          // 1 小时内刚拉过 → 这次不再联网
      runWhenIdle(function() {
        ensureWeatherLocation().then(function() {
          loadWeather(false);
        }).catch(function() {});
      }, 900);
    }
    window.toggleWeatherWindow = toggleWeatherWindow;
    window.searchWeatherCity = searchWeatherCity;
    window.openMsnWeather = openMsnWeather;
    window.initWeatherBadge = initWeatherBadge;
    initWeatherBadge();

    function convRestorePos() {
      var win = document.getElementById('convWindow');
      if (!win) return;
      try {
        var saved = JSON.parse(localStorage.getItem('nav_conv_pos') || 'null');
        if (saved && typeof saved.x === 'number') {
          var maxX = window.innerWidth - win.offsetWidth - 10;
          var maxY = window.innerHeight - win.offsetHeight - 10;
          win.style.left = Math.min(Math.max(saved.x, 10), maxX) + 'px';
          win.style.top = Math.min(Math.max(saved.y, 10), maxY) + 'px';
          win.style.right = 'auto';
        }
        if (saved && typeof saved.w === 'number' && saved.w >= 300 && saved.h >= 360) {
          win.style.width = saved.w + 'px'; win.style.height = saved.h + 'px';
        }
      } catch(e) {}
    }

    function convSavePos() {
      var win = document.getElementById('convWindow');
      if (!win) return;
      try {
        var rect = win.getBoundingClientRect();
        localStorage.setItem('nav_conv_pos', JSON.stringify({ x: rect.left, y: rect.top, w: rect.width, h: rect.height }));
      } catch(e) {}
    }

    function initConvDrag() {
      var header = document.getElementById('convHeader');
      var win = document.getElementById('convWindow');
      if (!header || !win) return;
      header.addEventListener('mousedown', function(e) {
        if (e.target.tagName === 'BUTTON') return;
        convDrag.active = true; convDrag.startX = e.clientX; convDrag.startY = e.clientY;
        var rect = win.getBoundingClientRect();
        convDrag.startLeft = rect.left; convDrag.startTop = rect.top;
        win.style.right = 'auto'; win.style.left = rect.left + 'px'; win.style.top = rect.top + 'px';
        win.style.transition = 'none'; e.preventDefault();
      });
      document.addEventListener('mousemove', function(e) {
        if (!convDrag.active) return;
        var newLeft = Math.max(0, Math.min(convDrag.startLeft + e.clientX - convDrag.startX, window.innerWidth - win.offsetWidth));
        var newTop = Math.max(0, Math.min(convDrag.startTop + e.clientY - convDrag.startY, window.innerHeight - win.offsetHeight));
        win.style.left = newLeft + 'px'; win.style.top = newTop + 'px';
      });
      document.addEventListener('mouseup', function(e) {
        if (!convDrag.active) return;
        convDrag.active = false; win.style.transition = ''; convSavePos();
      });
    }

    function initConvResize() {
      var handle = document.getElementById('convResizeHandle');
      var win = document.getElementById('convWindow');
      if (!handle || !win) return;
      handle.addEventListener('mousedown', function(e) {
        convResize.active = true; convResize.startX = e.clientX; convResize.startY = e.clientY;
        convResize.startW = win.offsetWidth; convResize.startH = win.offsetHeight;
        win.style.transition = 'none'; e.preventDefault(); e.stopPropagation();
      });
      document.addEventListener('mousemove', function(e) {
        if (!convResize.active) return;
        var newW = Math.max(300, Math.min(convResize.startW + e.clientX - convResize.startX, window.innerWidth - win.getBoundingClientRect().left - 10));
        var newH = Math.max(360, Math.min(convResize.startH + e.clientY - convResize.startY, window.innerHeight - win.getBoundingClientRect().top - 10));
        win.style.width = newW + 'px'; win.style.height = newH + 'px';
      });
      document.addEventListener('mouseup', function(e) {
        if (!convResize.active) return;
        convResize.active = false; win.style.transition = ''; convSavePos();
      });
    }

    initConvDrag();
    initConvResize();

    document.getElementById('searchInput').focus();

    // 返回顶部按钮：滚动超过一屏才淡入（抽成函数，便于直接调用与测试）
    function updateBackToTop() {
      var btn = document.getElementById('ixTop');
      if (!btn) return;
      var y = window.pageYOffset || document.documentElement.scrollTop || 0;
      btn.classList.toggle('show', y > 300);
    }
    window.updateBackToTop = updateBackToTop;
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    window.addEventListener('load', updateBackToTop);

    // Ctrl/Cmd + S 打开设置面板
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        if (document.getElementById('settingsOverlay').classList.contains('visible')) closeSettings();
        else openSettings();
      }
    });

    /* ---------- 缓存：让「不变的大文件」不用每次重下 ----------
       壁纸/图标/字体共 9MB，都是每次访问都一样的东西。Service Worker 把它们缓存到本地：
       第二次打开直接命中缓存（秒开、省流量），页面 HTML 仍走网络优先，改了文件刷新就是最新的。
       file:// 下浏览器不提供 Service Worker，此时靠本地磁盘，本来就快。 */
    (function() {
      function registerOfflineCache() {
        try {
          if (!('serviceWorker' in navigator)) return false;
          if (location.protocol !== 'http:' && location.protocol !== 'https:') return false;
          navigator.serviceWorker.register('sw.js').catch(function(err) {
            if (window.console && console.warn) console.warn('[cache] Service Worker 注册失败（不影响使用）：', err && err.message);
          });
          return true;
        } catch(e) { return false; }
      }
      window.registerOfflineCache = registerOfflineCache;
      if (document.readyState === 'complete') registerOfflineCache();
      else window.addEventListener('load', registerOfflineCache);
    })();

    /* ---------- 兜底：卡片标记在 assets/cards.js（首访加速拆分） ----------
       万一它没执行（弱网超时 / 被拦截 / CDN 异常），页面会缺整块导航。
       这里在初始化后再拉一次并就地注入，保证「导航永远不消失」。 */
    (function () {
      function ensureCards() {
        if (document.querySelector('.category-section')) return;
        try {
          var s = document.createElement('script');
          s.src = 'assets/cards.js?retry=' + Date.now();
          s.onload = function () {
            try { if (typeof window.__ixInjectCards === 'function') window.__ixInjectCards(); } catch (e) {}
            try { if (typeof applyFavStars === 'function') applyFavStars(); } catch (e) {}
            try { if (typeof applySiteVisibility === 'function') applySiteVisibility(); } catch (e) {}
            try { if (typeof applyEngineVisibility === 'function') applyEngineVisibility(); } catch (e) {}
          };
          document.body.appendChild(s);
        } catch (e) {}
      }
      window.ixEnsureCards = ensureCards;
      window.addEventListener('load', function () { setTimeout(ensureCards, 1200); });
    })();
  