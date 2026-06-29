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
  var wallpaper = getLS('nav_wallpaper', 'bing');
  var customWallpaper = getLS('nav_custom_wp', '');
  var freqVisible = getLS('nav_freq_visible', '1') !== '0';
  var freqCount = parseInt(getLS('nav_freq_count', '8')) || 8;
  var navAllHidden = getLS('nav_all_hidden', '0') === '1';

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
        if (rmSet.indexOf(s.name) === -1) cat.sites.push(deepClone(s));
      });
      var adds = addedSites[dc.id] || [];
      adds.forEach(function(s) { cat.sites.push(deepClone(s)); });
      cats.push(cat);
    });
    customCats.forEach(function(cc) {
      cats.push({ id: cc.id, name: cc.name, icon: cc.icon, isDefault: false, sites: deepClone(cc.sites || []) });
    });
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
    bing: '🔵必应', baidu: '🔴百度', google: '🟢谷歌', sogou: '🟠搜狗',
    sogouweixin: '🟢搜狗微信', sogouzhihu: '🔵搜狗知乎', yandex: '🔴Yandex',
    gscholar2: '🟣谷歌学术②', xmol: '🟢XMOL', googlescholar: '🔵谷歌学术',
    buaaebsco: '🟠北航外文', baiduxueshu: '🔴百度学术', douyin: '🎵抖音',
    xiaohongshu: '📕小红书', bilibili: '📺哔哩哔哩', zhihu: '🔷知乎',
    weibo: '🔶微博', github: '🐙GitHub', baidumap: '🗺️百度地图',
    wikihow: '📘WikiHow', scihub: '📄Sci-Hub', kiphub: '📖KipHub',
    msacademic: '🟣微软学术', custom: '⚙️自定义'
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
    } else if (name === 'engines') {
      document.getElementById('tab-engines').classList.add('active');
      renderEngines();
    } else if (name === 'settings') {
      document.getElementById('tab-settings').classList.add('active');
      renderSettings();
    }
  };

  function renderCategories() {
    var sidebar = document.getElementById('catSidebar');
    var content = document.getElementById('catContent');

    var html = '<h4>分类列表</h4>';
    editingCats.forEach(function(cat) {
      var cls = 'cat-item' + (cat.id === activeCatId ? ' active' : '') + (cat.isDefault ? '' : ' custom');
      var delBtn = '';
      if (!cat.isDefault) {
        delBtn = '<span class="del-cat" onclick="event.stopPropagation();deleteCategory(\'' + cat.id + '\')" title="删除分类">✕</span>';
      }
      html += '<div class="' + cls + '" onclick="selectCategory(\'' + cat.id + '\')">' +
        '<span>' + cat.name + ' <span class="badge">' + cat.sites.length + '</span></span>' + delBtn + '</div>';
    });
    html += '<div style="padding:.5rem"><button class="btn primary small" onclick="showAddCategoryForm()" style="width:100%">+ 新建分类</button></div>';
    sidebar.innerHTML = html;

    if (!activeCatId && editingCats.length > 0) activeCatId = editingCats[0].id;
    renderCatContent(content);
  }

  function renderCatContent(contentEl) {
    var cat = getCatById(activeCatId);
    if (!cat) { contentEl.innerHTML = '<p style="color:var(--muted);padding:1rem">请选择一个分类</p>'; return; }
    var htm = '<h4>' + cat.name + ' <span class="count">' + cat.sites.length + '个站点</span></h4>';
    var rmSet = removedSites[cat.id] || [];
    htm += '<table class="site-table"><thead><tr>' +
      '<th class="col-show">显示</th><th class="col-name">名称</th><th class="col-url">URL</th>' +
      '<th class="col-desc">描述</th><th class="col-icon">图标</th><th class="col-color">颜色</th>' +
      '<th class="col-actions"></th></tr></thead><tbody>';
    cat.sites.forEach(function(site, idx) {
      var isNew = false;
      if (cat.isDefault) {
        var adds = addedSites[cat.id] || [];
        isNew = adds.some(function(a) { return a.name === site.name; });
      }
      var isRemoved = false;
      if (cat.isDefault) isRemoved = rmSet.indexOf(site.name) >= 0;
      var rowCls = 'site-row' + (isRemoved ? ' removed' : '') + (isNew ? ' added' : '');
      htm += '<tr class="' + rowCls + '" data-idx="' + idx + '">' +
        '<td class="col-show"><input type="checkbox" ' + (isRemoved ? '' : 'checked') + ' onchange="toggleSite(\'' + cat.id + '\',\'' + escHtml(site.name) + '\',this.checked)" title="显示/隐藏"></td>' +
        '<td class="col-name">' + renderEditableField(site, cat, idx, 'name') + '</td>' +
        '<td class="col-url">' + renderEditableField(site, cat, idx, 'url') + '</td>' +
        '<td class="col-desc">' + renderEditableField(site, cat, idx, 'desc') + '</td>' +
        '<td class="col-icon"><input type="text" value="' + escAttr(site.icon || '') + '" onchange="updateSiteField(\'' + cat.id + '\',' + idx + ',\'icon\',this.value)" style="width:40px;text-align:center" maxlength="2" title="图标文字"></td>' +
        '<td class="col-color">' + renderColorSelect(site, cat, idx) + '</td>' +
        '<td class="col-actions"><button class="btn danger small" onclick="removeSite(\'' + cat.id + '\',' + idx + ')" title="删除">✕</button></td>' +
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
    editingCats = buildEditingCats();
    activeCatId = newId;
    renderCategories();
    showMsg('自定义分类已创建');
  };

  window.deleteCategory = function(catId) {
    if (!confirm('确定要删除这个自定义分类吗？所有站点将丢失。')) return;
    customCats = customCats.filter(function(c) { return c.id !== catId; });
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
      '<th style="width:160px">名称</th><th style="width:80px">标签</th>' +
      '<th>URL</th><th style="width:60px"></th></tr></thead><tbody>';
    engines.forEach(function(eng) {
      var rowCls = eng.hidden ? 'site-row removed' : '';
      htm += '<tr class="' + rowCls + '">' +
        '<td style="text-align:center"><input type="checkbox" ' + (eng.hidden ? '' : 'checked') + ' onchange="toggleEngine(\'' + eng.id + '\',this.checked)"></td>' +
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

  function renderSettings() {
    var el = document.getElementById('settingsContent');
    var htm = '<h4 style="margin-bottom:.8rem">页面设置</h4><div class="settings-grid">';

    htm += '<div class="setting-card"><h4>主题</h4><div class="setting-row">' +
      '<span class="chip' + (theme === 'light' ? ' on' : '') + '" onclick="setSetting(\'theme\',\'light\')">☀️ 浅色</span>' +
      '<span class="chip' + (theme === 'dark' ? ' on' : '') + '" onclick="setSetting(\'theme\',\'dark\')">🌙 深色</span>' +
      '</div></div>';

    htm += '<div class="setting-card"><h4>壁纸</h4><div class="setting-row">' +
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
    var allCatIds=defaultCatIds.slice();
    cc.forEach(function(c){allCatIds.push(c.id);});
    var fhc={};allCatIds.forEach(function(id){fhc[id]=!!hiddenCats[id];});
    s.hiddenCategories=fhc;
    var allEngIds=DEFAULT_ENGINES.map(function(e){return e.id;});
    Object.keys(customEngines).forEach(function(k){allEngIds.push(k);});
    var fhe={};allEngIds.forEach(function(id){fhe[id]=!!hiddenEngines[id];});
    s.hiddenEngines=fhe;
    data.settings=s;
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
        document.body.className = theme === 'dark' ? 'dark' : '';
        editingCats = buildEditingCats();
        saveAll();
        if (activeTab === 'categories') renderCategories();
        else if (activeTab === 'engines') renderEngines();
        else if (activeTab === 'settings') renderSettings();
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
    localStorage.removeItem('nav_fold');
    localStorage.removeItem('nav_all_hidden');
    removedSites = {}; addedSites = {}; customCats = []; customEngines = {};
    hiddenEngines = {}; hiddenCats = {}; theme = 'light'; wallpaper = 'bing';
    customWallpaper = ''; freqVisible = true; freqCount = 8; navAllHidden = false;
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
