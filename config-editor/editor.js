(function() {
  function getLS(key, fallback) {
    try { var v = localStorage.getItem(key); return v !== null ? v : fallback; } catch(e) { return fallback; }
  }
  function getLSJ(key, fallback) {
    try { var v = localStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch(e) { return fallback; }
  }
  var LS = {
    set: function(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
    }
  };

  var defaultCatIds = DEFAULT_CATEGORIES.map(function(c) { return c.id; });

  function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

  var removedSites = getLSJ('nav_removed_sites', {});
  var addedSites = getLSJ('nav_added_sites', {});
  var customCats = getLSJ('nav_custom_cats', []);
  var customEngines = getLSJ('nav_custom_engines', {});
  var hiddenEngines = getLSJ('nav_hidden_engines', {});
  var hiddenCats = getLSJ('nav_hidden_cats', {});
  var theme = getLS('nav_theme', 'light');
  var wallpaper = getLS('nav_wallpaper', 'default');   // 默认 = 默认壁纸（用户 2026-10-17 定稿）
  var customWallpaper = getLS('nav_custom_wp', '');
  var freqVisible = getLS('nav_freq_visible', '1') !== '0';
  var freqCount = parseInt(getLS('nav_freq_count', '8')) || 8;
  var navAllHidden = getLS('nav_all_hidden', '0') === '1';
  var catOrder = getLSJ('nav_cat_order', null);
  var rtCustom = getLSJ('nav_rt_custom_tools', []);
  var rtEnabled = getLS('nav_rt_enabled', '1') !== '0';
  var catSortMode = getLS('nav_cat_sort_mode', 'fixed') === 'recent' ? 'recent' : 'fixed';
  var vpnMode = getLS('nav_vpn_mode', 'always');
  var onlyActive = getLS('nav_only_active', '0') === '1';
  var todayVisible = getLS('nav_today_visible', '1') !== '0';
  var rtSides = getLSJ('nav_rt_sides', {});   // 每个工具的侧别：{key: 'left'|'right'}
  var engineVpn = getLSJ('nav_engine_vpn', {}); // 每个引擎是否需 VPN 的覆盖：{id: bool}
  function engineVpnOf(engId, deflt) {
    if (engineVpn.hasOwnProperty(engId)) return engineVpn[engId] === true;
    return deflt === true;
  }
  var siteOverrides = getLSJ('nav_site_overrides', {});
  var SITE_SEP = '|';

  function ovKey(catId, name) { return catId + SITE_SEP + name; }

  function catDisplayId(cat) {
    var idx = defaultCatIds.indexOf(cat.id);
    if (idx >= 0) return cat.id;
    return 'custom-' + cat.id;
  }

  function buildEditingCats() {
    var cats = [];
    DEFAULT_CATEGORIES.forEach(function(dc) {
      var cat = { id: dc.id, name: dc.name, icon: dc.icon, isDefault: true, sites: [] };
      var rmSet = removedSites[dc.id] || [];
      dc.sites.forEach(function(s) {
        var site = deepClone(s);
        site._removed = rmSet.indexOf(s.name) >= 0;
        cat.sites.push(site);
      });
      var adds = addedSites[dc.id] || [];
      adds.forEach(function(s) { cat.sites.push(deepClone(s)); });
      cats.push(cat);
    });
    customCats.forEach(function(cc) {
      var rmSet = removedSites[cc.id] || [];
      var sites = (cc.sites || []).map(function(s) {
        var site = deepClone(s);
        site._removed = rmSet.indexOf(s.name) >= 0;   // 自定义分类同样回显「显示/隐藏」状态
        return site;
      });
      cats.push({ id: cc.id, name: cc.name, icon: cc.icon, isDefault: false, sites: sites });
    });
    if (catOrder && catOrder.length) {
      var orderMap = {};
      catOrder.forEach(function(id, i) { orderMap[id] = i; });
      cats.sort(function(a, b) {
        var oa = (a.id in orderMap) ? orderMap[a.id] : 9999;
        var ob = (b.id in orderMap) ? orderMap[b.id] : 9999;
        return oa - ob;
      });
    }
    return cats;
  }

  var editingCats = buildEditingCats();

  var activeCatId = null;
  var activeTab = 'categories';

  document.body.className = theme === 'dark' ? 'dark' : '';

  function getCatById(id) {
    for (var i = 0; i < editingCats.length; i++) {
      if (editingCats[i].id === id) return editingCats[i];
    }
    return null;
  }

  function getDefaultCatById(id) {
    for (var i = 0; i < DEFAULT_CATEGORIES.length; i++) {
      if (DEFAULT_CATEGORIES[i].id === id) return DEFAULT_CATEGORIES[i];
    }
    return null;
  }

  var engineLabelMap = {
    bing: '🔵必应', baidu: '🔴百度', google: '🟢谷歌', metaso: '🧠秘塔AI', perplexity: '🔎Perplexity', sogou: '🟠搜狗',
    sogouweixin: '🟢搜狗微信', sogouzhihu: '🔵搜狗知乎', yandex: '🔴Yandex',
    gscholar2: '🟣谷歌学术②', xmol: '🟢XMOL', googlescholar: '🔵谷歌学术',
    buaaebsco: '🟠北航外文', baiduxueshu: '🔴百度学术', douyin: '🎵抖音',
    xiaohongshu: '📕小红书', bilibili: '📺哔哩哔哩', zhihu: '🔷知乎',
    weibo: '🔶微博', github: '🐙GitHub', baidumap: '🗺️百度地图',
    wikihow: '📘WikiHow', scihub: '📄Sci-Hub', kiphub: '📖KipHub',
    msacademic: '🟣微软学术', quora: '🌐Quora', reddit: '🟠Reddit', wikipedia: '📖维基百科',
    trans2en: '🔤译英', trans2zh: '🔤译中', custom: '⚙️自定义'
  };

  function getAllEngines() {
    var list = [];
    DEFAULT_ENGINES.forEach(function(e) {
      list.push({ id: e.id, name: e.name, url: e.url, label: e.label, isDefault: true, hidden: !!hiddenEngines[e.id] });
    });
    Object.keys(customEngines).forEach(function(k) {
      var ce = customEngines[k];
      list.push({ id: k, name: ce.name, url: ce.url, label: ce.label || ce.name, isDefault: false, hidden: !!hiddenEngines[k] });
    });
    return list;
  }

  function showMsg(text, isError) {
    var el = document.getElementById('msg');
    el.textContent = text;
    el.className = 'msg show' + (isError ? ' error' : '');
    clearTimeout(el._t);
    el._t = setTimeout(function() { el.className = 'msg'; }, 2000);
  }

  window.switchTab = function(name, tabEl) {
    activeTab = name;
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    if (tabEl) tabEl.classList.add('active');
    document.getElementById('main').querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
    if (name === 'categories') {
      document.getElementById('tab-categories').classList.add('active');
      renderCategories();
    } else if (name === 'catorder') {
      document.getElementById('tab-catorder').classList.add('active');
      renderCatOrder();
    } else if (name === 'engines') {
      document.getElementById('tab-engines').classList.add('active');
      renderEngines();
    } else if (name === 'settings') {
      document.getElementById('tab-settings').classList.add('active');
      renderSettings();
    } else if (name === 'rttools') {
      document.getElementById('tab-rttools').classList.add('active');
      renderRtTools();
    }
  };

  var dragSrcId = null;

  function renderCategories() {
    var sidebar = document.getElementById('catSidebar');
    var content = document.getElementById('catContent');

    var html = '<h4>分类列表 <span style="font-weight:400;font-size:0.7rem;color:var(--muted);">（可拖拽排序）</span></h4>';
    editingCats.forEach(function(cat) {
      var cls = 'cat-item' + (cat.id === activeCatId ? ' active' : '') + (cat.isDefault ? '' : ' custom');
      var delBtn = '';
      if (!cat.isDefault) {
        delBtn = '<span class="del-cat" onclick="event.stopPropagation();deleteCategory(\'' + cat.id + '\')" title="删除分类">✕</span>';
      }
      html += '<div class="' + cls + '" draggable="true" data-cat-id="' + cat.id + '" onclick="selectCategory(\'' + cat.id + '\')" ondragstart="handleDragStart(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)" ondragend="handleDragEnd(event)">' +
        '<span class="drag-handle" style="cursor:grab;margin-right:0.3rem;opacity:0.4;">⋮⋮</span>' +
        '<span style="flex:1;">' + cat.name + ' <span class="badge">' + cat.sites.length + '</span></span>' + delBtn + '</div>';
    });
    html += '<div style="padding:.5rem"><button class="btn primary small" onclick="showAddCategoryForm()" style="width:100%">+ 新建分类</button></div>';
    sidebar.innerHTML = html;

    if (!activeCatId && editingCats.length > 0) activeCatId = editingCats[0].id;
    renderCatContent(content);
  }

  window.handleDragStart = function(e) {
    dragSrcId = e.currentTarget.getAttribute('data-cat-id');
    e.currentTarget.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragSrcId);
  };

  window.handleDragOver = function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
  };

  window.handleDragLeave = function(e) {
    e.currentTarget.classList.remove('drag-over');
  };

  window.handleDrop = function(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    var targetId = e.currentTarget.getAttribute('data-cat-id');
    if (!dragSrcId || dragSrcId === targetId) return;

    var srcIdx = -1, tgtIdx = -1;
    for (var i = 0; i < editingCats.length; i++) {
      if (editingCats[i].id === dragSrcId) srcIdx = i;
      if (editingCats[i].id === targetId) tgtIdx = i;
    }
    if (srcIdx < 0 || tgtIdx < 0) return;

    var moved = editingCats.splice(srcIdx, 1)[0];
    editingCats.splice(tgtIdx, 0, moved);

    catOrder = editingCats.map(function(c) { return c.id; });
    renderCategories();
  };

  window.handleDragEnd = function(e) {
    e.currentTarget.style.opacity = '1';
    document.querySelectorAll('.cat-item').forEach(function(el) { el.classList.remove('drag-over'); });
    dragSrcId = null;
  };

  function renderCatContent(contentEl) {
    var cat = getCatById(activeCatId);
    if (!cat) { contentEl.innerHTML = '<p style="color:var(--muted);padding:1rem">请选择一个分类</p>'; return; }
    var visibleCount = 0;
    cat.sites.forEach(function(s) { if (!s._removed) visibleCount++; });
    var htm = '<h4>' + cat.name + ' <span class="count">' + cat.sites.length + '个站点' +
              (visibleCount < cat.sites.length ? '（' + visibleCount + ' 个可见）' : '') + '</span></h4>';
    htm += '<table class="site-table"><thead><tr>' +
      '<th class="col-show">显示</th><th class="col-vpn" title="是否需要科学上网">VPN</th>' +
      '<th class="col-name">名称</th><th class="col-url">URL</th>' +
      '<th class="col-desc">描述</th><th class="col-icon">图标</th><th class="col-color">颜色</th>' +
      '<th class="col-actions">排序/删除</th></tr></thead><tbody>';
    cat.sites.forEach(function(site, idx) {
      var isNew = false;
      if (cat.isDefault) {
        var adds = addedSites[cat.id] || [];
        isNew = adds.some(function(a) { return a.name === site.name; });
      }
      var isRemoved = !!site._removed;   // 默认分类与自定义分类统一从 _removed 回显
      var rowCls = 'site-row' + (isRemoved ? ' removed' : '') + (isNew ? ' added' : '');
      htm += '<tr class="' + rowCls + '" data-idx="' + idx + '">' +
        '<td class="col-show"><input type="checkbox" ' + (isRemoved ? '' : 'checked') + ' onchange="toggleSite(\'' + cat.id + '\',\'' + escHtml(site.name) + '\',this.checked)" title="显示/隐藏"></td>' +
        '<td class="col-vpn"><input type="checkbox" ' + (siteVpn(cat, site) ? 'checked' : '') + ' onchange="toggleSiteVpn(\'' + cat.id + '\',\'' + escHtml(site.name) + '\',this.checked)" title="需要 VPN / 科学上网"></td>' +
        '<td class="col-name">' + renderEditableField(site, cat, idx, 'name') + '</td>' +
        '<td class="col-url">' + renderEditableField(site, cat, idx, 'url') + '</td>' +
        '<td class="col-desc">' + renderEditableField(site, cat, idx, 'desc') + '</td>' +
        '<td class="col-icon"><input type="text" value="' + escAttr(site.icon || '') + '" onchange="updateSiteField(\'' + cat.id + '\',' + idx + ',\'icon\',this.value)" style="width:40px;text-align:center" maxlength="2" title="图标文字"></td>' +
        '<td class="col-color">' + renderColorSelect(site, cat, idx) + '</td>' +
        '<td class="col-actions">' +
          '<button class="btn small" onclick="moveSite(\'' + cat.id + '\',' + idx + ',-1)" title="上移"' + (idx === 0 ? ' disabled' : '') + '>↑</button> ' +
          '<button class="btn small" onclick="moveSite(\'' + cat.id + '\',' + idx + ',1)" title="下移"' + (idx === cat.sites.length - 1 ? ' disabled' : '') + '>↓</button> ' +
          '<button class="btn danger small" onclick="removeSite(\'' + cat.id + '\',' + idx + ')" title="删除">✕</button></td>' +
        '</tr>';
    });
    htm += '</tbody></table>';

    htm += '<button class="btn add-site-btn" onclick="showAddSiteForm(\'' + cat.id + '\')">+ 添加站点</button>';
    htm += '<div class="add-form" id="addSiteForm-' + cat.id + '" style="display:none">' +
      '<h5>添加新站点到「' + cat.name + '」</h5>' +
      '<div class="row"><input type="text" id="newSiteName-' + cat.id + '" placeholder="站点名称"><input type="text" id="newSiteUrl-' + cat.id + '" placeholder="URL"><input type="text" id="newSiteIcon-' + cat.id + '" placeholder="图标" maxlength="2" style="max-width:50px"></div>' +
      '<div class="row"><input type="text" id="newSiteDesc-' + cat.id + '" placeholder="描述"><select id="newSiteColor-' + cat.id + '">' + COLORS.map(function(c) { return '<option value="' + c.key + '">' + c.name + '</option>'; }).join('') + '</select>' +
        '<button class="btn primary small" onclick="addSiteToCategory(\'' + cat.id + '\')">确认添加</button></div></div>';
    contentEl.innerHTML = htm;
  }

  function renderEditableField(site, cat, idx, field) {
    var val = site[field] || '';
    return '<input type="text" value="' + escAttr(val) + '" onchange="updateSiteField(\'' + cat.id + '\',' + idx + ',\'' + field + '\',this.value)">';
  }

  function renderColorSelect(site, cat, idx) {
    var sel = '<select onchange="updateSiteField(\'' + cat.id + '\',' + idx + ',\'iconColor\',this.value)">';
    COLORS.forEach(function(c) {
      sel += '<option value="' + c.key + '"' + (site.iconColor === c.key ? ' selected' : '') + '>' + c.name + '</option>';
    });
    sel += '</select>';
    return sel;
  }

  function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function escAttr(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  window.selectCategory = function(catId) {
    activeCatId = catId;
    renderCategories();
  };

  function siteVpn(cat, site) {
    if (site && site.vpn === true) return true;
    var ov = siteOverrides[ovKey(cat.id, site.name)];
    return !!(ov && ov.vpn === true);
  }

  window.toggleSiteVpn = function(catId, siteName, checked) {
    var k = ovKey(catId, siteName);
    if (!siteOverrides[k]) siteOverrides[k] = {};
    siteOverrides[k].vpn = !!checked;
    editingCats = buildEditingCats();
    renderCatContent(document.getElementById('catContent'));
  };

  window.moveSite = function(catId, idx, delta) {
    var cat = getCatById(catId);
    if (!cat) return;
    var j = idx + delta;
    if (j < 0 || j >= cat.sites.length) return;
    var arr = cat.sites;
    var tmp = arr[idx]; arr[idx] = arr[j]; arr[j] = tmp;
    // 用 order 覆盖记录新顺序，保证首页与编辑器一致
    arr.forEach(function(site, i) {
      var k = ovKey(catId, site.name);
      if (!siteOverrides[k]) siteOverrides[k] = {};
      siteOverrides[k].order = i;
    });
    if (cat.isDefault) {
      // 默认站点：把重排结果写进 addedSites 覆盖（首页据此排序）
      var list = addedSites[catId] || [];
      arr.forEach(function(site) {
        var k = ovKey(catId, site.name);
        var rec = null;
        for (var i = 0; i < list.length; i++) { if (list[i].name === site.name) { rec = list[i]; break; } }
        if (!rec) {
          list.push({ name: site.name, url: site.url, desc: site.desc || '', icon: site.icon || '', iconColor: site.iconColor || 'blue' });
        }
      });
      addedSites[catId] = list;
    }
    editingCats = buildEditingCats();
    renderCatContent(document.getElementById('catContent'));
  };

  window.toggleSite = function(catId, siteName, checked) {
    if (!removedSites[catId]) removedSites[catId] = [];
    if (checked) {
      removedSites[catId] = removedSites[catId].filter(function(n) { return n !== siteName; });
    } else {
      if (removedSites[catId].indexOf(siteName) === -1) removedSites[catId].push(siteName);
    }
    editingCats = buildEditingCats();
    renderCatContent(document.getElementById('catContent'));
  };

  window.removeSite = function(catId, idx) {
    var cat = getCatById(catId);
    if (!cat || idx < 0 || idx >= cat.sites.length) return;
    var site = cat.sites[idx];
    if (!confirm('确定要删除站点「' + site.name + '」吗？')) return;
    if (cat.isDefault) {
      var dcat = getDefaultCatById(catId);
      var isDefaultSite = dcat && dcat.sites.some(function(s) { return s.name === site.name && s.url === site.url; });
      if (isDefaultSite) {
        if (!removedSites[catId]) removedSites[catId] = [];
        if (removedSites[catId].indexOf(site.name) === -1) removedSites[catId].push(site.name);
      } else {
        if (!addedSites[catId]) addedSites[catId] = [];
        addedSites[catId] = addedSites[catId].filter(function(s) { return !(s.name === site.name && s.url === site.url); });
      }
    } else {
      var cidx = -1;
      for (var i = 0; i < customCats.length; i++) {
        if (customCats[i].id === catId) { cidx = i; break; }
      }
      if (cidx >= 0) {
        customCats[cidx].sites = customCats[cidx].sites.filter(function(s, i) { return i !== idx; });
      }
    }
    editingCats = buildEditingCats();
    renderCategories();
  };

  window.updateSiteField = function(catId, idx, field, value) {
    var cat = getCatById(catId);
    if (!cat || idx < 0 || idx >= cat.sites.length) return;
    cat.sites[idx][field] = value;

    if (cat.isDefault) {
      var dcat = getDefaultCatById(catId);
      var site = cat.sites[idx];
      var isDefaultSite = dcat && dcat.sites.some(function(s) { return s.name === site.name && s.url === site.url; });
      if (isDefaultSite) return;
      if (!addedSites[catId]) addedSites[catId] = [];
      var aidx = -1;
      for (var i = 0; i < addedSites[catId].length; i++) {
        if (addedSites[catId][i].name === site.name) { aidx = i; break; }
      }
      if (aidx >= 0) {
        addedSites[catId][aidx][field] = value;
      } else {
        addedSites[catId].push({ name: site.name, url: site.url, desc: site.desc || '', icon: site.icon || '', iconColor: site.iconColor || 'blue' });
        if (!removedSites[catId]) removedSites[catId] = [];
        if (removedSites[catId].indexOf(site.name) < 0) removedSites[catId].push(site.name);
      }
    } else {
      var cidx = -1;
      for (var i = 0; i < customCats.length; i++) {
        if (customCats[i].id === catId) { cidx = i; break; }
      }
      if (cidx >= 0 && customCats[cidx].sites[idx]) {
        customCats[cidx].sites[idx][field] = value;
      }
    }
  };

  window.showAddSiteForm = function(catId) {
    var form = document.getElementById('addSiteForm-' + catId);
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  };

  window.addSiteToCategory = function(catId) {
    var nameEl = document.getElementById('newSiteName-' + catId);
    var urlEl = document.getElementById('newSiteUrl-' + catId);
    var iconEl = document.getElementById('newSiteIcon-' + catId);
    var descEl = document.getElementById('newSiteDesc-' + catId);
    var colorEl = document.getElementById('newSiteColor-' + catId);
    var name = nameEl.value.trim();
    var url = urlEl.value.trim();
    if (!name || !url) { showMsg('名称和URL不能为空', true); return; }
    var newSite = {
      name: name, url: url,
      desc: descEl.value.trim(),
      icon: iconEl.value.trim(),
      iconColor: colorEl.value
    };
    var cat = getCatById(catId);
    if (!cat) return;
    if (cat.isDefault) {
      if (!addedSites[catId]) addedSites[catId] = [];
      addedSites[catId].push(newSite);
    } else {
      var cidx = -1;
      for (var i = 0; i < customCats.length; i++) {
        if (customCats[i].id === catId) { cidx = i; break; }
      }
      if (cidx >= 0) {
        customCats[cidx].sites.push(newSite);
      }
    }
    nameEl.value = ''; urlEl.value = ''; iconEl.value = ''; descEl.value = '';
    document.getElementById('addSiteForm-' + catId).style.display = 'none';
    editingCats = buildEditingCats();
    renderCategories();
    showMsg('站点已添加');
  };

  window.showAddCategoryForm = function() {
    var sidebar = document.getElementById('catSidebar');
    var existing = sidebar.querySelector('.add-cat-form');
    if (existing) { existing.remove(); return; }
    var div = document.createElement('div');
    div.className = 'add-form add-cat-form';
    div.style.margin = '.5rem';
    div.innerHTML = '<h5>新建自定义分类</h5>' +
      '<div class="row"><input type="text" id="newCatName" placeholder="分类名称"><input type="text" id="newCatIcon" placeholder="图标路径" value="assets/icon_nav.jpg"></div>' +
      '<div class="row"><button class="btn primary small" onclick="addCustomCategory()">确认创建</button></div>';
    sidebar.appendChild(div);
  };

  window.addCustomCategory = function() {
    var name = document.getElementById('newCatName').value.trim();
    var icon = document.getElementById('newCatIcon').value.trim() || 'assets/icon_nav.jpg';
    if (!name) { showMsg('分类名称不能为空', true); return; }
    var newId = 'custom-' + Date.now();
    customCats.push({ id: newId, name: name, icon: icon, sites: [] });
    if (!catOrder) catOrder = editingCats.map(function(c) { return c.id; });
    catOrder.push(newId);
    editingCats = buildEditingCats();
    activeCatId = newId;
    renderCategories();
    showMsg('自定义分类已创建');
  };

  window.deleteCategory = function(catId) {
    if (!confirm('确定要删除这个自定义分类吗？所有站点将丢失。')) return;
    customCats = customCats.filter(function(c) { return c.id !== catId; });
    if (catOrder) catOrder = catOrder.filter(function(id) { return id !== catId; });
    editingCats = buildEditingCats();
    if (activeCatId === catId) activeCatId = editingCats.length > 0 ? editingCats[0].id : null;
    if (hiddenCats[catId]) delete hiddenCats[catId];
    renderCategories();
    showMsg('分类已删除');
  };

  function renderEngines() {
    var el = document.getElementById('engineContent');
    var engines = getAllEngines();
    var htm = '<h4 style="margin-bottom:.8rem">搜索引擎管理</h4>';
    htm += '<table class="engine-table"><thead><tr>' +
      '<th style="width:40px;text-align:center">显示</th>' +
      '<th style="width:64px;text-align:center" title="需要科学上网才能使用">需VPN</th>' +
      '<th style="width:150px">名称</th><th style="width:80px">标签</th>' +
      '<th>URL</th><th style="width:60px"></th></tr></thead><tbody>';
    engines.forEach(function(eng) {
      var rowCls = eng.hidden ? 'site-row removed' : '';
      var defVpn = false;
      if (eng.isDefault) {
        var de = DEFAULT_ENGINES.filter(function(e) { return e.id === eng.id; })[0];
        defVpn = !!(de && de.vpn);
      }
      htm += '<tr class="' + rowCls + '">' +
        '<td style="text-align:center"><input type="checkbox" ' + (eng.hidden ? '' : 'checked') + ' onchange="toggleEngine(\'' + eng.id + '\',this.checked)"></td>' +
        '<td style="text-align:center"><input type="checkbox" ' + (engineVpnOf(eng.id, defVpn) ? 'checked' : '') + ' onchange="toggleEngineVpn(\'' + eng.id + '\',this.checked)" title="需要科学上网才能使用"></td>' +
        '<td>' + (eng.isDefault ? eng.name : '<input type="text" value="' + escAttr(eng.name) + '" onchange="updateCustomEngine(\'' + eng.id + '\',\'name\',this.value)">') + '</td>' +
        '<td>' + (eng.isDefault ? eng.label : '<input type="text" value="' + escAttr(eng.label || '') + '" onchange="updateCustomEngine(\'' + eng.id + '\',\'label\',this.value)">') + '</td>' +
        '<td>' + (eng.isDefault ? '<span style="font-size:.75rem;color:var(--muted)">' + escHtml(eng.url) + '</span>' : '<input type="text" value="' + escAttr(eng.url) + '" onchange="updateCustomEngine(\'' + eng.id + '\',\'url\',this.value)">') + '</td>' +
        '<td style="text-align:center">' + (eng.isDefault ? '' : '<button class="btn danger small" onclick="deleteCustomEngine(\'' + eng.id + '\')">✕</button>') + '</td>' +
        '</tr>';
    });
    htm += '</tbody></table>';

    htm += '<div class="add-form" style="margin-top:1rem">' +
      '<h5>添加自定义搜索引擎</h5>' +
      '<div class="row"><input type="text" id="newEngId" placeholder="ID(英文)"><input type="text" id="newEngName" placeholder="引擎名称"><input type="text" id="newEngLabel" placeholder="标签(含emoji)"></div>' +
      '<div class="row"><input type="text" id="newEngUrl" placeholder="搜索URL(用%s代替检索词)"><button class="btn primary small" onclick="addCustomEngine()">添加引擎</button></div></div>';

    el.innerHTML = htm;
  }

  window.toggleEngineVpn = function(engId, checked) {
    engineVpn[engId] = !!checked;
    renderEngines();
  };

  window.toggleEngine = function(engId, checked) {
    hiddenEngines[engId] = !checked;
    if (checked) delete hiddenEngines[engId];
    renderEngines();
  };

  window.updateCustomEngine = function(engId, field, value) {
    if (!customEngines[engId]) return;
    customEngines[engId][field] = value;
  };

  window.addCustomEngine = function() {
    var id = document.getElementById('newEngId').value.trim();
    var name = document.getElementById('newEngName').value.trim();
    var label = document.getElementById('newEngLabel').value.trim();
    var url = document.getElementById('newEngUrl').value.trim();
    if (!id || !name || !url) { showMsg('ID、名称和URL不能为空', true); return; }
    if (DEFAULT_ENGINES.some(function(e) { return e.id === id; }) || customEngines[id]) {
      showMsg('引擎ID已存在', true); return;
    }
    customEngines[id] = { name: name, url: url, label: label || name };
    document.getElementById('newEngId').value = '';
    document.getElementById('newEngName').value = '';
    document.getElementById('newEngLabel').value = '';
    document.getElementById('newEngUrl').value = '';
    renderEngines();
    showMsg('自定义引擎已添加');
  };

  window.deleteCustomEngine = function(engId) {
    if (!confirm('确定要删除自定义搜索引擎「' + ((customEngines[engId] && customEngines[engId].name) || engId) + '」吗？')) return;
    delete customEngines[engId];
    if (hiddenEngines[engId]) delete hiddenEngines[engId];
    renderEngines();
    showMsg('引擎已删除');
  };

  function renderCatOrder() {
    var el = document.getElementById('catOrderContent');
    if (!el) return;
    var htm = '<h4>🧭 分类排序</h4>';
    htm += '<div class="setting-card"><h4>排序模式</h4><div class="setting-row">' +
      '<span class="chip' + (catSortMode === 'fixed' ? ' on' : '') + '" onclick="setCatSort(\'fixed\')">📌 固定顺序（默认）</span>' +
      '<span class="chip' + (catSortMode === 'recent' ? ' on' : '') + '" onclick="setCatSort(\'recent\')">🕘 按使用时间排序</span>' +
      '</div><p style="font-size:.74rem;color:var(--muted);margin:.4rem 0 0">固定顺序：点分类只把它提到自己分组的最前；按使用时间排序：每次点击都按最近使用重排。自定义分类始终排在默认分类之前。</p></div>';

    htm += '<div class="setting-card"><h4>顺序（↑ ↓ 调整，自定义分类排在最前）</h4>';
    var order = (catOrder && catOrder.length) ? catOrder.slice() : editingCats.map(function(c) { return c.id; });
    // 补齐缺失分类
    editingCats.forEach(function(c) { if (order.indexOf(c.id) < 0) order.push(c.id); });
    order = order.filter(function(id) { return editingCats.some(function(c) { return c.id === id; }); });
    // 自定义分类置顶
    var customs = order.filter(function(id) { return defaultCatIds.indexOf(id) < 0; });
    var defaults = order.filter(function(id) { return defaultCatIds.indexOf(id) >= 0; });
    order = customs.concat(defaults);

    htm += '<div class="order-list">';
    order.forEach(function(id, i) {
      var cat = getCatById(id);
      var nm = cat ? cat.name : id;
      var isCustom = defaultCatIds.indexOf(id) < 0;
      htm += '<div class="order-item">' +
        '<span class="order-idx">' + (i + 1) + '</span>' +
        '<span class="order-name">' + nm + (isCustom ? ' <span class="badge">自定义</span>' : '') + '</span>' +
        '<button class="btn small" onclick="moveCatInEditor(\'' + id + '\',-1)"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
        '<button class="btn small" onclick="moveCatInEditor(\'' + id + '\',1)"' + (i === order.length - 1 ? ' disabled' : '') + '>↓</button>' +
        '</div>';
    });
    htm += '</div><p style="font-size:.74rem;color:var(--muted);margin:.5rem 0 0">提示：这里调好的顺序会写入 <code>nav_cat_order</code>，并在导出 JSON 时带上。</p></div>';

    htm += '<div class="setting-card"><h4>其他显示设置</h4><div class="setting-row">' +
      '<label class="setting-label"><input type="checkbox" ' + (onlyActive ? 'checked' : '') + ' onchange="setSetting(\'onlyActive\',this.checked)"> 主页面仅显示选中的分类</label></div>' +
      '<div class="setting-row"><span style="font-size:.78rem">需 VPN 站点：</span>' +
      '<span class="chip' + (vpnMode === 'always' ? ' on' : '') + '" onclick="setSetting(\'vpnMode\',\'always\')">一直显示</span>' +
      '<span class="chip' + (vpnMode === 'auto' ? ' on' : '') + '" onclick="setSetting(\'vpnMode\',\'auto\')">自动判断</span>' +
      '<span class="chip' + (vpnMode === 'off' ? ' on' : '') + '" onclick="setSetting(\'vpnMode\',\'off\')">一直隐藏</span></div>' +
      '<p style="font-size:.74rem;color:var(--muted);margin:.4rem 0 0">快捷工具的左侧/右侧在「🔗 快捷工具」标签页里逐个设置。</p>' +
      '</div>';
    el.innerHTML = htm;
  }

  window.setCatSort = function(mode) {
    catSortMode = (mode === 'recent') ? 'recent' : 'fixed';
    renderCatOrder();
  };

  window.moveCatInEditor = function(id, delta) {
    var order = (catOrder && catOrder.length) ? catOrder.slice() : editingCats.map(function(c) { return c.id; });
    editingCats.forEach(function(c) { if (order.indexOf(c.id) < 0) order.push(c.id); });
    var i = order.indexOf(id);
    var j = i + delta;
    if (i < 0 || j < 0 || j >= order.length) return;
    order.splice(i, 1);
    order.splice(j, 0, id);
    catOrder = order;
    // 让分类 tab 的顺序跟随
    for (var k = 0; k < order.length; k++) {
      var idx = -1;
      for (var m2 = 0; m2 < editingCats.length; m2++) { if (editingCats[m2].id === order[k]) { idx = m2; break; } }
      if (idx >= 0) editingCats.push(editingCats.splice(idx, 1)[0]);
    }
    renderCatOrder();
  };

  function renderSettings() {
    var el = document.getElementById('settingsContent');
    var htm = '<h4 style="margin-bottom:.8rem">页面设置</h4><div class="settings-grid">';

    htm += '<div class="setting-card"><h4>主题</h4><div class="setting-row">' +
      '<span class="chip' + (theme === 'light' ? ' on' : '') + '" onclick="setSetting(\'theme\',\'light\')">☀️ 浅色</span>' +
      '<span class="chip' + (theme === 'dark' ? ' on' : '') + '" onclick="setSetting(\'theme\',\'dark\')">🌙 深色</span>' +
      '</div></div>';

    htm += '<div class="setting-card"><h4>壁纸</h4><div class="setting-row">' +
      '<span class="chip' + (wallpaper === 'earth' ? ' on' : '') + '" onclick="setSetting(\'wallpaper\',\'earth\')">🌍 地球实况</span>' +
      '<span class="chip' + (wallpaper === 'bing' ? ' on' : '') + '" onclick="setSetting(\'wallpaper\',\'bing\')">🌄 必应每日</span>' +
      '<span class="chip' + (wallpaper === 'default' ? ' on' : '') + '" onclick="setSetting(\'wallpaper\',\'default\')">🎨 默认</span>' +
      '<span class="chip' + (wallpaper === 'custom' ? ' on' : '') + '" onclick="setSetting(\'wallpaper\',\'custom\')">🔗 自定义URL</span>' +
      '<span class="chip' + (wallpaper === 'local' ? ' on' : '') + '" onclick="setSetting(\'wallpaper\',\'local\')">📁 本地</span>' +
      '</div>';
    if (wallpaper === 'custom') {
      htm += '<div class="setting-row" style="margin-top:.4rem"><input class="settings-input" type="text" value="' + escAttr(customWallpaper) + '" onchange="setSetting(\'customWallpaper\',this.value)" placeholder="输入壁纸图片URL"></div>';
    }
    htm += '</div>';

    htm += '<div class="setting-card"><h4>常用站点</h4>' +
      '<div class="setting-row">' +
      '<label class="setting-label"><input type="checkbox" ' + (freqVisible ? 'checked' : '') + ' onchange="setSetting(\'freqVisible\',this.checked)"> 显示常用站点</label>' +
      '</div><div class="setting-row" style="margin-top:.4rem">' +
      '<span style="font-size:.78rem;color:var(--muted)">显示个数:</span>' +
      '<input class="settings-input" type="number" min="1" max="12" value="' + freqCount + '" onchange="setSetting(\'freqCount\',Math.max(1,Math.min(12,parseInt(this.value)||8)))" style="width:70px">' +
      '</div></div>';

    htm += '<div class="setting-card"><h4>导航折叠</h4><div class="setting-row">' +
      '<span class="chip' + (!navAllHidden ? ' on' : '') + '" onclick="setSetting(\'navAllHidden\',false)">📂 展开</span>' +
      '<span class="chip' + (navAllHidden ? ' on' : '') + '" onclick="setSetting(\'navAllHidden\',true)">📁 折叠</span>' +
      '</div></div>';

    htm += '<div class="setting-card"><h4>分类可见性</h4><div class="setting-row">';
    editingCats.forEach(function(cat) {
      var hid = !!hiddenCats[cat.id];
      htm += '<span class="chip' + (hid ? '' : ' on') + '" onclick="setSetting(\'hiddenCat\',\'' + cat.id + '\')">' + (hid ? '👁️‍🗨️ ' : '👁️ ') + cat.name + '</span>';
    });
    htm += '</div></div>';

    htm += '</div>';
    el.innerHTML = htm;
  }

  window.setSetting = function(key, value) {
    if (key === 'theme') {
      theme = value;
      document.body.className = theme === 'dark' ? 'dark' : '';
    } else if (key === 'wallpaper') {
      wallpaper = value;
    } else if (key === 'customWallpaper') {
      customWallpaper = value;
    } else if (key === 'freqVisible') {
      freqVisible = value;
    } else if (key === 'freqCount') {
      freqCount = value;
    } else if (key === 'navAllHidden') {
      navAllHidden = value;
    } else if (key === 'onlyActive') {
      onlyActive = !!value;
      renderCatOrder();
    } else if (key === 'vpnMode') {
      vpnMode = value;
      renderCatOrder();
    } else if (key === 'hiddenCat') {
      var catId = value;
      if (hiddenCats[catId]) {
        delete hiddenCats[catId];
      } else {
        hiddenCats[catId] = true;
      }
    }
    renderSettings();
  };

  // --- Quick Tools ---
  function rtSideOf(key) {
    return rtSides[key] === 'left' ? 'left' : 'right';
  }

  function sideChips(key, handler) {
    var cur = rtSideOf(key);
    return '<span class="chip' + (cur === 'left' ? ' on' : '') + '" onclick="' + handler + '(\'' + key + '\',\'left\')">⬅️ 左</span>' +
           '<span class="chip' + (cur === 'right' ? ' on' : '') + '" onclick="' + handler + '(\'' + key + '\',\'right\')">➡️ 右</span>';
  }

  window.setRtSideOf = function(key, side) {
    rtSides[key] = (side === 'left') ? 'left' : 'right';
    renderRtTools();
  };

  // ===== 快捷工具的图标（emoji）选择器 =====
  // 用户 2026-10-17：添加自定义工具时默认只有一个 🔗，希望能从合适的候选中挑一个。
  var EMOJI_LIST = [
    // 常用 / 工具
    '🔗','📌','📋','📝','🗒️','✅','☑️','⭐','🔥','💡','🎯','📊','📈','📉','🧮','🔢',
    '🧰','🛠️','⚙️','🧩','🧪','🔬','🔧','🔨','🪛','🧲','🪄','🧹','🧽',
    // 文件 / 云 / 网络
    '📁','🗂️','💾','☁️','🌐','🛰️','📡','📶','🔌','🔋','📤','📥','🔁','🔄','🔗','🖇️',
    // 沟通
    '📧','✉️','💬','🗨️','📱','☎️','📞','🔔','🔕','📢','📣',
    // 设备 / 影音
    '🖥️','💻','⌨️','🖱️','🖨️','📷','📸','🎥','🎬','🎵','🎧','🎤','📺','📻','🎮','🕹️',
    // 学习 / 科研
    '📚','📖','📄','📰','🗞️','📓','📔','📕','🧠','🤖','🧑‍💻','🎓','🏫','🧑‍🔬','🔭','🧬',
    // 搜索 / 地图
    '🔍','🔎','🧭','🗺️','📍','🚩','🚀','✈️','🚗','🚲','🚇','🏠','🏢',
    // 时间 / 财务 / 生活
    '🕒','⏰','⏳','📅','🗓️','⌛','💰','💳','🛒','🎁','🏆','🥇','🩺','💊','🌡️','☕',
    '🍅','🍱','🌙','☀️','🌤️','🌍','🔒','🔓','🔑','🛡️','♻️','📦','➕','➖','❓','❗'
  ];
  function emojiOutsideClick(e) {
    var p = document.getElementById('emojiPicker');
    if (p && !p.contains(e.target)) closeEmojiPicker();
  }
  window.closeEmojiPicker = function() {
    var p = document.getElementById('emojiPicker');
    if (p) p.parentNode.removeChild(p);
    document.removeEventListener('mousedown', emojiOutsideClick, true);
  };
  window.pickEmoji = function(idx, emoji) {
    setRtSetting('icon', idx, emoji);     // setRtSetting 内部会清空并重建列表
    closeEmojiPicker();
  };
  window.openEmojiPicker = function(idx, btn) {
    closeEmojiPicker();
    var wrap = document.createElement('div');
    wrap.id = 'emojiPicker';
    wrap.className = 'emoji-picker';
    var htm = '<div class="emoji-picker-head"><span>给这个工具选一个图标</span>' +
      '<button type="button" class="emoji-close" onclick="closeEmojiPicker()" title="关闭">✕</button></div>' +
      '<div class="emoji-grid">';
    EMOJI_LIST.forEach(function(e) {
      htm += '<button type="button" class="emoji-cell" title="' + e + '" onclick="pickEmoji(' + idx + ',this.textContent)">' + e + '</button>';
    });
    htm += '</div>';
    htm += '<div class="emoji-custom"><span class="hint" style="margin:0;">或直接粘贴</span>' +
      '<input id="emojiCustomInput" type="text" maxlength="16" placeholder="任意 emoji / 字符，回车确认"' +
      ' onkeydown="if(event.key===\'Enter\'){pickEmoji(' + idx + ',this.value.trim());}"></div>';
    wrap.innerHTML = htm;
    document.body.appendChild(wrap);
    // 贴着按钮弹出；上下左右都不许出视口
    var r = btn.getBoundingClientRect();
    var w = wrap.offsetWidth || 340, h = wrap.offsetHeight || 300;
    var left = Math.min(Math.max(8, r.left), window.innerWidth - w - 8);
    var top = r.bottom + 6;
    if (top + h > window.innerHeight - 8) top = Math.max(8, r.top - h - 6);
    wrap.style.left = left + 'px';
    wrap.style.top = top + 'px';
    setTimeout(function() { document.addEventListener('mousedown', emojiOutsideClick, true); }, 0);
    var inp = document.getElementById('emojiCustomInput');
    if (inp) inp.focus();
  };

  function renderRtTools() {
    var el = document.getElementById('rtToolsContent');
    var htm = '<h4 style="margin-bottom:.8rem">快捷工具</h4>';
    htm += '<div class="setting-card"><h4>全局开关</h4><div class="setting-row">' +
      '<span class="chip' + (rtEnabled ? ' on' : '') + '" onclick="setRtSetting(\'enabled\',true)">✅ 启用所有</span>' +
      '<span class="chip' + (!rtEnabled ? ' on' : '') + '" onclick="setRtSetting(\'enabled\',false)">⛔ 禁用所有</span>' +
      '</div><p class="hint">禁用后右侧边栏所有快捷图标都会消失</p></div>';

    htm += '<div class="setting-card"><h4>自定义工具 (' + rtCustom.length + ' 个)</h4>';
    htm += '<table class="data-table"><thead><tr><th>图标</th><th>名称</th><th>网址</th><th>侧别</th><th>启用</th><th>操作</th></tr></thead><tbody>';
    rtCustom.forEach(function(t, i) {
      htm += '<tr>';
      htm += '<td class="icon-pick-cell"><button type="button" class="icon-pick-btn" onclick="openEmojiPicker(' + i + ', this)" title="点击从候选里挑一个图标">' +
        escAttr(t.icon || '🔗') + ' <span class="icon-pick-caret">▾</span></button>' +
        '<input class="settings-input" type="text" value="' + escAttr(t.icon||'🔗') + '" onchange="setRtSetting(\'icon\',' + i + ',this.value)" title="也可以直接粘贴任意 emoji" style="width:38px;text-align:center;font-size:.95rem;margin-left:3px;vertical-align:middle;"></td>';
      htm += '<td><input class="settings-input" type="text" value="' + escAttr(t.name||'') + '" onchange="setRtSetting(\'name\',' + i + ',this.value)" placeholder="名称"></td>';
      htm += '<td><input class="settings-input" type="text" value="' + escAttr(t.url||'') + '" onchange="setRtSetting(\'url\',' + i + ',this.value)" placeholder="https://..."></td>';
      htm += '<td>' + sideChips('rtc:' + (t.id || t.name || i), 'setRtSideOf') + '</td>';
      htm += '<td><span class="chip' + (t.enabled !== false ? ' on' : '') + '" onclick="setRtSetting(\'toggle\',' + i + ')">' + (t.enabled !== false ? '是' : '否') + '</span></td>';
      htm += '<td><button class="btn danger" onclick="setRtSetting(\'del\',' + i + ')" style="font-size:.7rem;padding:0.15rem 0.5rem;">✕</button></td>';
      htm += '</tr>';
    });
    htm += '</tbody></table>';
    htm += '<div class="setting-row" style="margin-top:.5rem;">' +
      '<button class="btn primary" onclick="setRtSetting(\'add\')">➕ 添加工具</button>' +
      '<button class="btn danger" onclick="setRtSetting(\'reset\')" style="font-size:.72rem;">↺ 清空</button>' +
      '</div>';
    htm += '</div>';

    htm += '<div class="setting-card"><h4>内置工具</h4><p class="hint">每个工具都能单独选择显示在<strong>左侧</strong>还是<strong>右侧</strong>工具条上；同一工具只会出现在一侧，不会重复。</p>';
    htm += '<table class="data-table"><thead><tr><th>图标</th><th>名称</th><th>说明</th><th>侧别</th></tr></thead><tbody>';
    var builtins = [
      {icon:'💬',name:'微信传输',url:'https://filehelper.weixin.qq.com/'},
      {icon:'📄',name:'在线WPS',url:'https://365.kdocs.cn'},
      {icon:'📋',name:'待办事项',url:'（悬浮窗）'},
      {icon:'📝',name:'记事本',url:'（悬浮窗）'},
      {icon:'🍅',name:'番茄钟',url:'（悬浮窗）'},
      {icon:'📐',name:'单位换算',url:'（悬浮窗）'},
      {icon:'🔢',name:'计算器',url:'https://www.desmos.com/scientific?lang=zh-CN'},
      {icon:'✏️',name:'画图',url:'https://app.diagrams.net/'},
      {icon:'🧰',name:'工具箱',url:'https://txttool.cn/'}
    ];
    builtins.forEach(function(t) {
      htm += '<tr><td style="font-size:1.2rem;">' + t.icon + '</td><td>' + t.name + '</td>' +
        '<td><code style="word-break:break-all;">' + t.url + '</code></td>' +
        '<td>' + sideChips('rtb:' + t.name, 'setRtSideOf') + '</td></tr>';
    });
    htm += '</tbody></table></div>';

    htm += '<div class="setting-card"><h4>📋 待办事项数据</h4>';
    try {
      var todoItems = JSON.parse(localStorage.getItem('nav_todo_items') || '[]');
      var activeCount = todoItems.filter(function(t) { return !t.completed; }).length;
      var completedCount = todoItems.length - activeCount;
      htm += '<p class="hint">当前共有 <strong>' + todoItems.length + '</strong> 条待办事项（未完成 ' + activeCount + ' 条，已完成 ' + completedCount + ' 条）</p>';
    } catch(e) {
      htm += '<p class="hint">暂无待办数据</p>';
    }
    htm += '<p class="hint">待办数据随全局配置一起导出/导入。在主页面右侧工具栏点击 📋 图标可使用待办功能。已完成超过2天的事项会自动清理。</p>';
    htm += '</div>';

    htm += '<div class="setting-card"><h4>📝 记事本数据</h4>';
    try {
      var noteContent = localStorage.getItem('nav_note_content') || '';
      var noteLines = noteContent.split('\n').length;
      htm += '<p class="hint">当前笔记长度: <strong>' + noteContent.length + '</strong> 字符（' + noteLines + ' 行）</p>';
    } catch(e) {
      htm += '<p class="hint">暂无笔记数据</p>';
    }
    htm += '<p class="hint">笔记数据随全局配置一起导出/导入。在主页面右侧工具栏点击 📝 图标可使用记事本功能。</p>';
    htm += '</div>';

    htm += '<div class="setting-card"><h4>🍅 番茄钟数据</h4>';
    try {
      var pomoData = JSON.parse(localStorage.getItem('nav_pomo_stats') || 'null');
      if (pomoData) {
        var pomoCount = pomoData.count || 0;
        var pomoMin = pomoData.totalMin || 0;
        htm += '<p class="hint">今日专注次数: <strong>' + pomoCount + '</strong> 次，累计专注时长: <strong>' + pomoMin + '</strong> 分钟</p>';
      } else {
        htm += '<p class="hint">暂无番茄钟数据</p>';
      }
    } catch(e) {
      htm += '<p class="hint">暂无番茄钟数据</p>';
    }
    htm += '<p class="hint">番茄钟数据随全局配置一起导出/导入。在主页面右侧工具栏点击 🍅 图标可使用番茄钟功能。</p>';
    htm += '</div>';

    el.innerHTML = htm;
  }

  window.setRtSetting = function(key, idx, val) {
    if (key === 'enabled') {
      rtEnabled = val;
    } else if (key === 'add') {
      rtCustom.push({icon:'🔗', name:'', url:'', enabled:true});
    } else if (key === 'reset') {
      if (!confirm('确定清空所有自定义快捷工具？')) return;
      rtCustom = [];
    } else if (key === 'del') {
      if (idx < 0 || idx >= rtCustom.length) return;
      rtCustom.splice(idx, 1);
    } else if (key === 'toggle') {
      if (idx < 0 || idx >= rtCustom.length) return;
      rtCustom[idx].enabled = rtCustom[idx].enabled === false ? true : false;
    } else if (key === 'icon') {
      if (idx < 0 || idx >= rtCustom.length) return;
      rtCustom[idx].icon = val || '🔗';    } else if (key === 'name') {
      if (idx < 0 || idx >= rtCustom.length) return;
      rtCustom[idx].name = val;
    } else if (key === 'url') {
      if (idx < 0 || idx >= rtCustom.length) return;
      rtCustom[idx].url = val;
    }
    renderRtTools();
    // 新加的工具：直接把图标候选板弹出来，省得用户不知道去哪儿挑图标
    if (key === 'add') {
      var pickBtns = document.querySelectorAll('.icon-pick-btn');
      var nb = pickBtns[rtCustom.length - 1];
      if (nb) openEmojiPicker(rtCustom.length - 1, nb);
    }
  };

  function rebuildAddedSitesFromEditing() {
    var newAdded = {};
    DEFAULT_CATEGORIES.forEach(function(dc) {
      var cat = getCatById(dc.id);
      if (!cat) return;
      var origNames = dc.sites.map(function(s) { return s.name; });
      var rmSet = removedSites[dc.id] || [];
      newAdded[dc.id] = [];
      cat.sites.forEach(function(s) {
        if (rmSet.indexOf(s.name) >= 0) return;
        var isOrig = dc.sites.some(function(os) { return os.name === s.name && os.url === s.url; });
        if (!isOrig) newAdded[dc.id].push({ name: s.name, url: s.url, desc: s.desc, icon: s.icon, iconColor: s.iconColor });
      });
      if (newAdded[dc.id].length === 0) delete newAdded[dc.id];
    });
    addedSites = newAdded;
  }

  window.saveAll = function() {
    rebuildAddedSitesFromEditing();
    LS.set('nav_added_sites', addedSites);
    LS.set('nav_removed_sites', removedSites);
    LS.set('nav_custom_cats', customCats.map(function(c) { return { id: c.id, name: c.name, icon: c.icon, sites: c.sites }; }));
    LS.set('nav_custom_engines', customEngines);
    LS.set('nav_hidden_engines', hiddenEngines);
    LS.set('nav_hidden_cats', hiddenCats);
    // Save simple strings to match main page format
    try { localStorage.setItem('nav_theme', theme); } catch(e) {}
    try { localStorage.setItem('nav_wallpaper', wallpaper); } catch(e) {}
    try { localStorage.setItem('nav_custom_wp', customWallpaper || ''); } catch(e) {}
    try { localStorage.setItem('nav_freq_visible', freqVisible ? '1' : '0'); } catch(e) {}
    try { localStorage.setItem('nav_freq_count', String(freqCount)); } catch(e) {}
    try { localStorage.setItem('nav_all_hidden', navAllHidden ? '1' : '0'); } catch(e) {}
    try { localStorage.setItem('nav_cat_order', JSON.stringify(catOrder || editingCats.map(function(c){return c.id;}))); } catch(e) {}
    try { localStorage.setItem('nav_cat_sort_mode', catSortMode); } catch(e) {}
    try { localStorage.setItem('nav_vpn_mode', vpnMode); } catch(e) {}
    try { localStorage.setItem('nav_only_active', onlyActive ? '1' : '0'); } catch(e) {}
    try { localStorage.setItem('nav_today_visible', todayVisible ? '1' : '0'); } catch(e) {}
    try { localStorage.setItem('nav_rt_sides', JSON.stringify(rtSides)); } catch(e) {}
    try { localStorage.setItem('nav_engine_vpn', JSON.stringify(engineVpn)); } catch(e) {}
    try { localStorage.setItem('nav_site_overrides', JSON.stringify(siteOverrides)); } catch(e) {}
    // 与 index.html 的 CAT_ORDER_VER 保持一致：带上版本号，避免首页把编辑器的排序当成「过期默认顺序」覆盖掉
    try { localStorage.setItem('nav_cat_order_ver', '2'); } catch(e) {}
    try { localStorage.setItem('nav_rt_enabled', rtEnabled ? '1' : '0'); } catch(e) {}
    try { localStorage.setItem('nav_rt_custom_tools', JSON.stringify(rtCustom)); } catch(e) {}
    showMsg('✅ 配置已保存！回到导航首页刷新即可看到变化');
  };

  window.exportJson = function() {
    rebuildAddedSitesFromEditing();
    var data = {};
    if (Object.keys(addedSites).length) data.addSites = addedSites;
    if (Object.keys(removedSites).length) data.removeSites = removedSites;
    var cc=customCats.map(function(c){return{id:c.id,name:c.name,icon:c.icon,sites:c.sites};});
    if (cc.length) data.categories = cc;
    var engArr=Object.keys(customEngines).map(function(k){return{id:k,name:customEngines[k].name,url:customEngines[k].url,label:customEngines[k].label};});
    if (engArr.length) data.engines = engArr;
    var s={};
    s.theme=theme;s.wallpaper=wallpaper;
    if(customWallpaper)s.customWallpaper=customWallpaper;
    s.freqVisible=!!freqVisible;s.freqCount=parseInt(freqCount)||6;s.navFold=navAllHidden?'hide':'show';
    if (catOrder && catOrder.length) s.catOrder = catOrder;
    var allCatIds=defaultCatIds.slice();
    cc.forEach(function(c){allCatIds.push(c.id);});
    var fhc={};allCatIds.forEach(function(id){fhc[id]=!!hiddenCats[id];});
    s.hiddenCategories=fhc;
    var allEngIds=DEFAULT_ENGINES.map(function(e){return e.id;});
    Object.keys(customEngines).forEach(function(k){allEngIds.push(k);});
    var fhe={};allEngIds.forEach(function(id){fhe[id]=!!hiddenEngines[id];});
    s.hiddenEngines=fhe;
    s.rtEnabled = !!rtEnabled;
    // 编辑器里没有控件、但主页确实在用的设置：直接从 localStorage 读，导出时一并带上（否则「编辑器导出」会悄悄丢设置）
    try {
      var skX = localStorage.getItem('nav_search_keep');
      if (skX === '0' || skX === '1') s.searchKeep = skX === '1';
      var smX = localStorage.getItem('nav_search_mode');
      if (smX === 'focus' || smX === 'full') s.searchMode = smX;
      var advX = JSON.parse(localStorage.getItem('nav_search_adv') || 'null');
      if (advX && (advX.on || advX.exact || advX.site || advX.exclude || advX.filetype || advX.time)) s.searchAdv = advX;
      var oaX = localStorage.getItem('nav_only_active');
      if (oaX === '0' || oaX === '1') s.onlyActive = oaX === '1';
      var vmX = localStorage.getItem('nav_vpn_mode');
      if (vmX === 'auto' || vmX === 'off' || vmX === 'always') s.vpnMode = vmX;
      var nfmX = localStorage.getItem('nav_fold_mode');
      if (nfmX === 'show' || nfmX === 'hide' || nfmX === 'autofold') s.navFold = nfmX;
    } catch(e) {}
    data.settings=s;
    if (rtCustom.length) data.rtTools = rtCustom;
    // 「浏览器侧配置」：与主页共用同一份 localStorage，原样带上 —— 换电脑导入后每个快捷工具在左/在右、折叠状态完全一致
    var uiX = {};
    try {
      var sidesX = JSON.parse(localStorage.getItem('nav_rt_sides') || '{}');
      if (sidesX && Object.keys(sidesX).length) uiX.rtSides = sidesX;
      var sbX = localStorage.getItem('nav_sidebar');
      if (sbX === 'collapsed' || sbX === 'expanded') uiX.sidebar = sbX;
      var ccX = JSON.parse(localStorage.getItem('nav_cat_collapse') || '{}');
      if (ccX && Object.keys(ccX).length) uiX.catCollapse = ccX;
      var engX = localStorage.getItem('nav_engine');
      if (engX) uiX.engine = engX;
      var wpeX = localStorage.getItem('nav_wp_export');
      if (wpeX === '0' || wpeX === '1') uiX.wpExport = wpeX === '1';
      var clnX = localStorage.getItem('nav_clean_ui');
      if (clnX === '0' || clnX === '1') uiX.cleanUi = clnX === '1';
      var poolX = JSON.parse(localStorage.getItem('nav_wp_pool') || '[]');
      if (Array.isArray(poolX) && poolX.length) uiX.wpPool = poolX;
      var posX = {};
      ['todo','note','pomo','conv','weather'].forEach(function(k) {
        var vX = localStorage.getItem('nav_' + k + '_pos');
        if (vX) posX[k] = vX;
      });
      if (Object.keys(posX).length) uiX.pos = posX;
      var cuX = localStorage.getItem('nav_cfg_url');
      if (cuX) uiX.configUrl = cuX;
    } catch(e) {}
    if (Object.keys(uiX).length) data.ui = uiX;
    try {
      var todoItems = JSON.parse(localStorage.getItem('nav_todo_items') || '[]');
      if (todoItems.length) data.todoItems = todoItems;
    } catch(e) {}
    try {
      var noteContent = localStorage.getItem('nav_note_content') || '';
      if (noteContent.trim()) data.noteContent = noteContent;
    } catch(e) {}
    try {
      var pomoStats = JSON.parse(localStorage.getItem('nav_pomo_stats') || 'null');
      if (pomoStats) data.pomoStats = pomoStats;
    } catch(e) {}
    var blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;a.download='auroraus_config_'+new Date().toISOString().slice(0,10)+'.json';
    a.click();URL.revokeObjectURL(url);
    showMsg('📤 配置已导出！');
  };

  window.importJson = function() {
    document.getElementById('importFile').click();
  };

  window.handleImport = function(event) {
    var file = event.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var data = JSON.parse(e.target.result);
        // Support both formats: main page format (addSites, removeSites, categories, engines, settings) and legacy flat format
        if (data.addSites) addedSites = data.addSites;
        if (data.removeSites) removedSites = data.removeSites;
        if (data.categories) customCats = data.categories;
        if (data.engines) {
          var engObj = {};
          data.engines.forEach(function(eng) { engObj[eng.id] = {name:eng.name,url:eng.url,label:eng.label}; });
          customEngines = engObj;
        }
        if (data.settings) {
          var s = data.settings;
          if (s.theme) theme = s.theme;
          if (s.wallpaper) wallpaper = s.wallpaper;
          if (s.customWallpaper) customWallpaper = s.customWallpaper;
          if (typeof s.freqVisible === 'boolean') freqVisible = s.freqVisible;
          if (typeof s.freqCount === 'number') freqCount = s.freqCount;
          if (s.navFold) navAllHidden = s.navFold === 'hide';
          if (s.hiddenCategories) hiddenCats = s.hiddenCategories;
          if (s.hiddenEngines) hiddenEngines = s.hiddenEngines;
          if (s.catOrder && Array.isArray(s.catOrder)) catOrder = s.catOrder;
          if (typeof s.rtEnabled === 'boolean') rtEnabled = s.rtEnabled;
        }
        if (data.rtTools && Array.isArray(data.rtTools)) rtCustom = data.rtTools;
        // 「浏览器侧配置」：主页导出的 ui 段（每个工具在左/在右、侧边栏与分类折叠、浮窗位置、记住的配置地址）
        if (data.ui && typeof data.ui === 'object') {
          if (data.ui.rtSides && typeof data.ui.rtSides === 'object') {
            rtSides = data.ui.rtSides;
            try { localStorage.setItem('nav_rt_sides', JSON.stringify(rtSides)); } catch(e) {}
          }
          if (data.ui.sidebar === 'collapsed' || data.ui.sidebar === 'expanded') {
            try { localStorage.setItem('nav_sidebar', data.ui.sidebar); } catch(e) {}
          }
          if (data.ui.catCollapse && typeof data.ui.catCollapse === 'object') {
            try { localStorage.setItem('nav_cat_collapse', JSON.stringify(data.ui.catCollapse)); } catch(e) {}
          }
          if (data.ui.pos && typeof data.ui.pos === 'object') {
            Object.keys(data.ui.pos).forEach(function(k) {
              if (['todo','note','pomo','conv','weather'].indexOf(k) < 0) return;
              try { localStorage.setItem('nav_' + k + '_pos', data.ui.pos[k]); } catch(e) {}
            });
          }
          if (typeof data.ui.configUrl === 'string' && /^https?:\/\//.test(data.ui.configUrl)) {
            try {
              localStorage.setItem('nav_cfg_url', data.ui.configUrl);
              localStorage.setItem('nav_cfg_url_at', String(Date.now()));
            } catch(e) {}
          }
          if (typeof data.ui.cleanUi === 'boolean') {
            try { localStorage.setItem('nav_clean_ui', data.ui.cleanUi ? '1' : '0'); } catch(e) {}
          }
        }
        // 主页新格式的 content 段（待办/记事本/番茄钟），与旧扁平字段并存兼容
        if (data.content && typeof data.content === 'object') {
          if (Array.isArray(data.content.todoItems)) {
            try { localStorage.setItem('nav_todo_items', JSON.stringify(data.content.todoItems)); } catch(e) {}
          }
          if (typeof data.content.note === 'string') {
            try { localStorage.setItem('nav_note_content', data.content.note); } catch(e) {}
          }
          if (data.content.pomoStats) {
            try { localStorage.setItem('nav_pomo_stats', JSON.stringify(data.content.pomoStats)); } catch(e) {}
          }
        }
        if (data.todoItems && Array.isArray(data.todoItems)) {
          try { localStorage.setItem('nav_todo_items', JSON.stringify(data.todoItems)); } catch(e) {}
        }
        if (data.noteContent && typeof data.noteContent === 'string') {
          try { localStorage.setItem('nav_note_content', data.noteContent); } catch(e) {}
        }
        if (data.pomoStats) {
          try { localStorage.setItem('nav_pomo_stats', JSON.stringify(data.pomoStats)); } catch(e) {}
        }
        // Legacy flat format
        if (data.nav_added_sites) addedSites = data.nav_added_sites;
        if (data.nav_removed_sites) removedSites = data.nav_removed_sites;
        if (data.nav_custom_cats) customCats = data.nav_custom_cats;
        if (data.nav_custom_engines) customEngines = data.nav_custom_engines;
        if (data.nav_hidden_engines) hiddenEngines = data.nav_hidden_engines;
        if (data.nav_hidden_cats) hiddenCats = data.nav_hidden_cats;
        if (data.nav_theme) theme = data.nav_theme;
        if (data.nav_wallpaper) wallpaper = data.nav_wallpaper;
        if (data.nav_custom_wp) customWallpaper = data.nav_custom_wp;
        if (typeof data.nav_freq_visible !== 'undefined') freqVisible = !!data.nav_freq_visible;
        if (data.nav_freq_count) freqCount = parseInt(data.nav_freq_count) || 6;
        if (data.nav_all_hidden !== undefined) navAllHidden = !!data.nav_all_hidden;
        if (data.nav_note_content !== undefined) {
          try { localStorage.setItem('nav_note_content', String(data.nav_note_content)); } catch(e) {}
        }
        if (data.nav_pomo_stats !== undefined) {
          try { localStorage.setItem('nav_pomo_stats', typeof data.nav_pomo_stats === 'string' ? data.nav_pomo_stats : JSON.stringify(data.nav_pomo_stats)); } catch(e) {}
        }
        document.body.className = theme === 'dark' ? 'dark' : '';
        editingCats = buildEditingCats();
        saveAll();
        if (activeTab === 'categories') renderCategories();
        else if (activeTab === 'engines') renderEngines();
        else if (activeTab === 'settings') renderSettings();
        else if (activeTab === 'rttools') renderRtTools();
        showMsg('📂 已导入配置并保存！');
      } catch(err) {
        showMsg('导入失败：JSON 格式错误', true);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  window.resetAll = function() {
    if (!confirm('确定要恢复所有设置为默认值吗？这将清除所有自定义配置。')) return;
    localStorage.removeItem('nav_added_sites');
    localStorage.removeItem('nav_removed_sites');
    localStorage.removeItem('nav_custom_cats');
    localStorage.removeItem('nav_custom_engines');
    localStorage.removeItem('nav_hidden_engines');
    localStorage.removeItem('nav_hidden_cats');
    localStorage.removeItem('nav_theme');
    localStorage.removeItem('nav_wallpaper');
    localStorage.removeItem('nav_custom_wp');
    localStorage.removeItem('nav_freq_visible');
    localStorage.removeItem('nav_freq_count');
    localStorage.removeItem('nav_all_hidden');
    localStorage.removeItem('nav_rt_enabled');
    localStorage.removeItem('nav_rt_custom_tools');
    localStorage.removeItem('nav_cat_order');
    localStorage.removeItem('nav_note_content');
    localStorage.removeItem('nav_pomo_stats');
    removedSites = {}; addedSites = {}; customCats = []; customEngines = {};
    hiddenEngines = {}; hiddenCats = {}; theme = 'light'; wallpaper = 'default';
    customWallpaper = ''; freqVisible = true; freqCount = 8; navAllHidden = false; catOrder = null;
    rtEnabled = true; rtCustom = [];
    document.body.className = '';
    editingCats = buildEditingCats();
    activeCatId = editingCats.length > 0 ? editingCats[0].id : null;
    activeTab = 'categories';
    document.querySelectorAll('.tab').forEach(function(t, i) { t.classList.toggle('active', i === 0); });
    document.getElementById('main').querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
    document.getElementById('tab-categories').classList.add('active');
    renderCategories();
    showMsg('🔄 已恢复默认配置');
  };

  if (editingCats.length > 0) activeCatId = editingCats[0].id;
  renderCategories();
})();
