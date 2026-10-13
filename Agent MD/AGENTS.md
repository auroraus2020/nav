# AGENTS.md — AI 入职手册

## 1. 项目背景

### 1.1 项目是干啥的

- **项目定位**：AURORAUS 导航 —— 一个**单文件纯静态**的网址导航主页，把作者科研/学习/生活常用的几百个网站按分类编排成卡片墙，替代浏览器默认主页。核心价值：**打开即用、零后端、零构建、可离线、配置可导出分享**。
- **目标用户与使用场景**：主要用户是作者本人（科研方向，北航），也通过 JSON 配置文件分享给朋友。典型场景：新开浏览器标签页 → 搜索或点卡片 → 直达目标网站；顺手用右侧工具栏的待办/记事本/番茄钟。
- **核心业务流程（用户视角走一遍）**：
  1. 打开 `index.html`（或线上 `https://nav.auroraus.cn`）→ 首屏是大搜索框 + 常用站点 + 分类卡片墙（左侧为分类侧边栏，手机为底部 Tab）。
  2. 输入关键词：不按回车只是**本页筛选**卡片；选好搜索引擎按回车才**跳转搜索**。
  3. 点任意卡片 → 新标签页打开对应网站；点分类标题 → 折叠/展开该分类。
  4. 点左侧分类名 → 跳转到该分类（在「按使用时间排序」模式下会把它提到最前）。
  5. 右上/右下入口打开 **设置面板**：壁纸、主题、导航折叠、分类显隐、分类排序模式、搜索引擎显隐、常用站点、导入导出。
  6. 需要更大改动时点设置里的 **🖊️ 编辑器**（`config-editor/`）→ 图形化管理站点/分类/引擎/快捷工具 → 保存 → 回主页硬刷新。
  7. 换电脑/分享：设置里 **📤 导出配置** 得到 JSON，另一台机器 **📂 导入本地文件** 即可复原。
- **关键术语表**：

| 术语 | 含义 |
|---|---|
| 内置分类 | 直接写在 `index.html` 里的 `<section class="category-section" id="cat-xxx">`，共 17 个 |
| 自定义分类 | 用户通过 JSON 导入或编辑器创建的分类，存在 localStorage `nav_custom_cats`，id 形如 `custom-<时间戳>` |
| 常用站点 | 按点击次数自动聚合的快捷 chips，存 localStorage `nav_clicks` |
| 右侧快捷工具 / rtTools | 页面右边缘一竖排小图标；`rtBuiltins` 为内置，`nav_rt_custom_tools` 为自定义 |
| 排序模式 | `fixed`=固定顺序，点击不改变顺序（**默认**）；`recent`=按使用时间由新到旧自动排序 |
| addSites / removeSites | JSON 导入配置里向「已有分类」追加/隐藏站点的字段（只影响该浏览器，不改源码） |

### 1.2 功能清单

- ✅ 已实现：
  - 分类卡片墙（17 内置分类 / 276 站点）— `index.html` `<main class="main-content">`
  - 大搜索框 + 24 个内置搜索引擎 + 自定义引擎 — 模块：`index.html` `engineUrls` / `enginePlaceholders`
  - 本页实时筛选（不回车即筛选，`Esc` 复原）— `filterSites`
  - 左侧分类侧边栏 + 移动端底部 Tab + 分类折叠态记忆 — `setActive` / `toggleCategory` / `applyCatStates`
  - **分类排序双模式**（按使用时间 / 固定顺序）+ 设置面板手动 ↑↓ 调序 — `catSortMode` / `bumpCategory` / `moveCategory` / `renderSettingsCatOrder`
  - 四路壁纸（在线风景 / 默认 / 自定义网络 / 本地图片，含 base64 导出）— `initWallpaper` / `setWallpaper` / `updateHeroBg`
  - 浅色 / 深色主题 — `setTheme`
  - 常用站点聚合、分类显隐、导航折叠 — 设置面板
  - 右侧快捷工具栏（内置 5 项 + 待办/记事本/番茄钟/单位换算悬浮窗 + 自定义工具）— `rtBuiltins` / `renderRtEdge`
  - 配置 JSON 导入/导出（本地文件或网络 URL）、一键恢复默认 — `processImportJson` / `exportConfig` / `restoreDefaults`
  - 可视化配置编辑器（站点/分类/引擎/快捷工具/页面设置）— `config-editor/`
  - 使用帮助页 — `help/index.html`
- 🚧 开发中：
  - 无（本轮进入稳定态）
- 📋 规划/预期：
  - 把站点数据从 HTML 抽成单一数据源、由 JS 渲染（P2，消除两份拷贝，见 1.4）
  - 移动端分类 Tab 的横向滚动体验优化（P2）
  - 站点可达性批量巡检工具（P3）

### 1.3 项目进度与已完成工作（摘要）

- 当前阶段：稳定可用，已完成一轮大扩容与两项体验功能（排序双模式、壁纸默认），细节以 `PROJECT_STATUS.md` 为准。
- 里程碑记录（倒序）：
  - 2026-10-13 分类扩展至 **17 分类 / 276 站点**；新增「传统文化」分类（并按用户要求剔除有问题站点、改用可访问的史料/古地图站）；新增分类排序双模式且**默认即「固定顺序」**；壁纸默认改为「默认壁纸」（含存量迁移）；在线 WPS 进右侧工具栏；影音娱乐补入红果短剧与免费美剧站、修正 VoiceTube 地址；学习提升补入 TypeWords / LanGeek / 黄油单词；建立 `Agent MD/` 文档体系与 `tools/` 校验脚本。
  - 2026-08 之前 基础形态：单文件导航页 + 设置面板 + 配置导入导出 + 右侧工具栏 + 配置编辑器。

### 1.4 注意事项与坑

- **技术坑：站点数据有两份拷贝，改一处必须同步另一处。**
  现象：`index.html` 里的卡片是手写的，`config-editor/data.js` 的 `DEFAULT_CATEGORIES` 是编辑器的默认值；只改一处 → 主页与编辑器显示不一致。
  怎么办：改完立刻跑 `python tools/verify_config_sync.py`（会逐分类比对「分类顺序 + 名称 + 图标 + 站点名/URL 序列」）。
- **技术坑：新增一个分类要登记 6 处，漏一处就出不一致。**
  清单：① 正文 `<section id="cat-xxx">`；② 左侧边栏 `<a href="#cat-xxx">`；③ 移动端 `<a class="mobile-tab" href="#cat-xxx">`；④ `renderSettingsCategories()` 的 cats 数组；⑤ `exportConfig()` 的 `allCatIds` 数组；⑥ `help/index.html` 的内置分类 ID 列表。
  另外 `DEFAULT_CAT_ORDER`（JS 常量）也应同步，它决定新分类补进 `catOrder` 时的相对位置。
  怎么办：跑 `python tools/verify_site_integrity.py`，它专门断言这 6 处。
- **技术坑：分类的「顺序」有两个来源，别混。**
  `catOrder`（localStorage `nav_cat_order`）是**展示顺序**；`DEFAULT_CAT_ORDER`（JS）只是**补位基准**。`applyCatOrder()` 现在统一用 `getFullCatOrderToday()` 补齐后的完整顺序去重排**正文 section、侧边栏、移动端 Tab 三处**，所以三处永远一致。改顺序逻辑时不要只改一处。
- **业务坑：`bumpCategory()` 是「按使用时间排序」的唯一写入口。**
  它内部有 `if (catSortMode === 'fixed') return;`。任何新的「点击分类」入口都必须走 `setActive()`/`bumpCategory()`，否则固定模式下顺序会被绕过改掉。
- **业务坑：壁纸一次性迁移有标记位。**
  `nav_wp_default_migrated='1'` 表示「已迁移过」。逻辑：值为 `custom|local|default` → 尊重用户选择；否则若未迁移 → 切 `default` 并打标记；否则保持 `bing`。**不要把迁移标记写进 `restoreDefaults()` 的清除列表之外**，也不要在别处重复迁移（会覆盖用户选择）。
- **环境/部署坑：本机网络对境外站点有 DNS 污染，别用「打不开」判定站点失效。**
  本网络会污染 github/google/wikipedia 等域名（返回黑洞地址）且阻断 DoH，境外站点必须靠代理/Tailscale。校验脚本因此**不**做真实连通性检查。
- **环境/部署坑：验证 UI 必须用真实浏览器。**
  本机无 Node DOM 环境；行为验证走无头 Chrome：`python tools/run_ui_tests.py`（把断言注入真实页面后 `--dump-dom` 取结果）。
  注意：`--print-to-pdf` 在 headless 下只输出截断内容，不能用来做「渲染文本」证据；`--screenshot` 配 `--virtual-time-budget` 会在 reload 前就截图，所以**预设 localStorage 必须注入 `<head>`**（`tools/make_screenshots.py` 已这么做）。
- **已知问题与技术债**：见 `PROJECT_STATUS.md` 的「已知问题与技术债」表（两份数据拷贝、6 处登记、无网络巡检）。

### 1.5 项目经验沉淀

- **架构决策**：坚持**零依赖、零构建、单文件**（`index.html` 自带全部 CSS/JS）。理由：这是个人主页，部署方式就是「丢一个文件夹到任何静态托管或本地双击打开」，引入打包器会让维护成本远超收益。相关取舍见 `docs/decisions/ADR-001-单文件零构建.md`。
- **踩坑后验证有效的解法**：
  - 批量改大量重复结构的 HTML：**先用脚本生成片段、再按 id 整段替换**，比手改几百处可靠得多；生成完立刻用断言脚本核对「声明计数 vs 实际卡片数」。
  - 无法直接看截图时：用 `--dump-dom` 跑**真实 DOM 断言**（可见性用 `offsetParent !== null`，交互用真实 `.click()`），再补**像素采样**做客观视觉证据。
  - 预设 localStorage 的截图/测试页：注入点必须在 `<head>`，否则首屏渲染用的是旧值。
- **性能/安全/稳定性经验**：
  - 所有 localStorage 读写都包在 `try/catch`（隐身模式会抛异常），新增设置项请沿用。
  - 用户数据一律存 localStorage 键前缀 `nav_`；导出配置时 settings 里要**显式带出**新键，否则「导出→导入」会丢设置（`nav_cat_sort_mode` 就是这么加的，`nav_wp_default_migrated` 属内部标记不导出）。

## 2. 技术栈

- 纯 HTML + CSS + 原生 JavaScript（ES5 兼容写法为主，如 `var` / `function`），**无框架、无构建、无 npm 依赖**。选型原因：单文件分发、离线可用、十年后仍能打开。
- Python 3（仅开发期校验用，非运行时依赖）：`config-editor` 数据生成与 `tools/` 下的校验/测试脚本。
- 无版本锁定问题（不含第三方库）。

## 3. 目录结构

```
index.html                 # 主页面（全部结构/样式/逻辑都在此，约 5600 行）
configs/
  default_recommended.json # 推荐配置预设（导入用，含 addSites/settings/rtTools）
config-editor/             # 可视化配置编辑器（index.html + editor.js + data.js + editor.css）
  data.js                  # [生成] COLORS / DEFAULT_CATEGORIES / DEFAULT_ENGINES
help/index.html            # 使用帮助（含 JSON 格式参考与内置分类 ID 列表）
assets/                    # 图标（icon_*.jpg）、壁纸（wp_*.jpg/gif、hero_bg*.jpg）
tools/                     # 开发期校验脚本（非运行时依赖）
  verify_site_integrity.py # 计数/重名/点名站点/新分类登记 断言
  verify_config_sync.py    # index.html 与 config-editor/data.js 一致性
  sync_data_js.py          # 从 index.html 反向派生 data.js（改站点后先跑它，再验一致性）
  list_category.py         # 打印某分类的实际卡片与声明计数（排查用）
  check_js_syntax.py       # 内联 <script> 的 node --check
  run_ui_tests.py          # 无头 Chrome 运行时行为测试（输出 ui_test_output.txt）
  run_import_preset_test.py # 端到端：真实导入 configs/default_recommended.json 并断言结果
  run_editor_smoke_test.py # config-editor 冒烟（默认数据/新分类/表格渲染/无 JS 报错）
  make_screenshots.py      # 生成 UI 证据截图
Agent MD/                  # 项目文档（AI 入职手册/进度/方案/用户输入/备份日志/证据）
.backup/                   # 本地 Git 备份仓库（不涉及远程）
```

## 4. 开发命令

```powershell
# 本地打开（无需服务器，直接双击也行）
start index.html

# 起一个本地静态服务（便于相对路径与 file:// 限制场景）
python -m http.server 8080        # 然后访问 http://127.0.0.1:8080/

# —— 改完代码必跑的六道校验 ——
python tools/verify_site_integrity.py   # 分类计数、重名、点名站点、新分类 6 处登记
python tools/verify_config_sync.py      # index.html 与 config-editor/data.js 是否一致
python tools/check_js_syntax.py         # 内联脚本语法（需已安装 node）
python tools/run_ui_tests.py            # 无头 Chrome 行为测试，期望 PASS=74 FAIL=0
python tools/run_import_preset_test.py  # 端到端导入推荐预设，期望 PASS=9  FAIL=0
python tools/run_editor_smoke_test.py   # 配置编辑器冒烟，期望 PASS=6  FAIL=0

# 改过站点卡片后：先反向派生编辑器默认数据，再验一致性
python tools/sync_data_js.py && python tools/verify_config_sync.py

# 生成 UI 证据截图（输出到 Agent MD/docs/evidence/）
python tools/make_screenshots.py

# 备份
git -C .backup add -A
git -C .backup -c user.email=ai@local -c user.name=ai commit -m "说明"
```

## 5. 硬约束

- **保持零依赖、零构建**：不引入 npm 包、打包器、CDN 框架；新增能力用原生 JS/CSS 实现。
- **必须能 `file://` 直接打开可用**：不使用 ES module（`import`）、不使用 `fetch` 读本地文件，网络请求一律有失败兜底。
- **改站点数据必须同步两份**：`index.html` 卡片 ↔ `config-editor/data.js`，并以 `tools/verify_config_sync.py` 通过为准。
- **新增分类必须登记全部 6 处**（见 1.4），并以 `tools/verify_site_integrity.py` 通过为准。
- **localStorage 键统一 `nav_` 前缀**，读写必须 `try/catch`；新增可导出设置必须同时改 `exportConfig` 与 `processImportJson`。
- **不要动 `.backup/` 之外的 Git 操作**：本项目无远程仓库，备份只在 `.backup/` 内 commit，禁止 push。
- **不要修改 `assets/` 下已有壁纸与图标的文件名**：`wp_序号.jpg` 命名被「在线风景壁纸」的轮换逻辑依赖。
- **文档同步**：更新 `PROJECT_STATUS.md` 时必须同步刷新本文件 1.3 节；验证证据归档到 `Agent MD/docs/evidence/`，没证据不算完成。
