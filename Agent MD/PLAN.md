# PLAN.md — 分类站点批量补充 + 传统文化新分类 + 导航排序双模式 + 壁纸默认值（2026-10-13）

## 任务目标与验收标准

目标一句话：把用户点名的国内外知名站点补进对应分类，新增「传统文化」分类，并落地「分类排序双模式」「壁纸默认选中默认壁纸」「在线 WPS 进右侧小工具」三项功能改动。

验收标准（可检查）：

1. 用户点名的每一个站点都出现在指定分类中，且同分类内无重名卡片：
   - 综合导航：谷歌搜索
   - 技术与交流：Quora、Reddit、X（且位于该分类靠前位置）
   - 地图天气：谷歌地图、谷歌地球（Google Earth）、两步路；天气类新增国外知名且数据全面的站点
   - 效率提升：QQ邮箱、163邮箱、Outlook、Gmail
   - 影音娱乐：YouTube、TikTok、VoiceTube
   - 翻译工具：谷歌翻译等知名免费翻译站
   - 学习教程：维基百科 + 国外知名教程站
   - 镜像网站：APKPure 等安卓 APK 镜像站
   - 航空与科普：国外知名、数据全面的站点
   - 学术检索：国内官方专利检索（国家知识产权局专利检索及分析系统）、世界专利检索 WIPO PATENTSCOPE、国家数据
2. 新增分类「传统文化」（id `cat-tradition`）：在 main 区有独立 section，左侧边栏 + 移动端 Tab 有入口，设置面板「分类显示」有开关，`exportConfig` 的内置分类 ID 列表包含它；收录万年历、古籍、史料（县志/古地图）、诗词、易经道德经等免费站点。
3. 每个分类的头部分类计数（`N个站点`）与实际卡片数一致。
4. 壁纸：代码默认值为 `default`；对本地已存 `bing` 且未手动改过壁纸的浏览器做一次性迁移；用户手动选过壁纸的浏览器不受影响。
5. 分类排序两种模式：`recent`（按使用时间由新到旧自动排序，现状）与 `fixed`（固定顺序，点击分类不改变顺序）；设置页面可切换模式并在 fixed 模式下用上/下按钮手动调序；顺序与模式的导入/导出均生效。
6. 右侧边栏出现「在线WPS」（`https://365.kdocs.cn`）入口，且不与自定义快捷工具重复。
7. `configs/default_recommended.json` 与 `config-editor/data.js` 的默认数据与 index.html 一致（新分类存在、站点齐备、`settings.wallpaper = default`、`settings.catSortMode` 存在）。

## 背景与现状

- 项目为纯静态单文件导航站：`index.html`（约 5000 行，含全部 CSS 与 JS）、`config-editor/`（可视化配置编辑器）、`help/`（使用帮助）、`configs/`（导入用预设 JSON）、`assets/`（图标与壁纸）。
- 站点数据只有一份「真源」：index.html 里手写的 `.nav-card` 卡片；`configs/default_recommended.json` 与 `config-editor/data.js` 是供**导入**用的默认数据副本，必须同步维护。
- 现有分类（16 个）：cat-general / cat-academic / cat-ai / cat-buaa / cat-navweb / cat-translate / cat-tech / cat-learn / cat-efficiency / cat-tool / cat-map / cat-entertainment / cat-tutorial / cat-aero / cat-mirror / cat-cloud。
- 分类顺序现状：`catOrder` 数组存 localStorage（`nav_cat_order`），`setActive()` 每次点击 sidebar/Tab 就 `bumpCategory(id)` 把该分类提到最前 —— 这就是用户说的「按使用时间由新到旧排序」。
- 壁纸现状：`initializeWallpaper()` 默认 `wallpaperType='bing'`，设置面板第一个 chip（在线风景壁纸）默认点亮。
- 右侧小工具现状：`rtBuiltins` 四个内置项（微信传输/计算器/画图/工具箱）+ localStorage 里的自定义工具。
- 约束：无构建工具、无依赖，改完必须能直接双击 `index.html` 运行；不能引入外部库。

## 模块划分

| 模块 | 职责 | 文件 | 改动类型 |
|---|---|---|---|
| M1 站点内容 | 12 个分类的卡片增补与排序 | `index.html`（body 各 `<section>`） | 修改 |
| M2 新分类 | 传统文化 section + 侧边栏 + Tab + 设置项 + 内置 ID 数组 | `index.html` | 新增/修改 |
| M3 排序模式 | `catSortMode` 状态、`bumpCategory` 分支、设置面板手动调序 UI | `index.html`（JS + 设置面板 HTML/CSS） | 新增 |
| M4 壁纸默认 | 默认值与一次性迁移 | `index.html`（`initWallpaper`） | 修改 |
| M5 右侧工具 | 在线 WPS 内置项 | `index.html`（`rtBuiltins`） | 修改 |
| M6 预设数据 | 默认导入数据同步 | `configs/default_recommended.json`、`config-editor/data.js` | 修改 |
| M7 帮助文档 | 分类 ID 列表、排序模式、壁纸默认说明 | `help/index.html` | 修改 |
| M8 项目文档 | 新建 Agent MD 体系并归档 | `Agent MD/**` | 新增 |

## 接口契约

新增 localStorage 键：

- `nav_cat_sort_mode`：`'recent' | 'fixed'`，缺省按 `'recent'` 处理（保持旧行为）。
- `nav_wp_default_migrated`：`'1'` 表示已完成「默认壁纸」一次性迁移，避免反复覆盖用户选择。

新增/修改函数（index.html 全局作用域，与现有风格一致，ES5 语法）：

```js
// M3
var catSortMode = 'recent';
function loadCatSortMode()                                   // 读 localStorage，非法值回落 recent
function setCatSortMode(mode, el)                            // 切模式：更新状态/chip/UI，fixed 时固化当前顺序，recent 时恢复自动排序行为
function ensureFullCatOrder()                                // fixed 模式下补齐 catOrder，使其含全部现存分类且无重复
function moveCategory(id, delta)                             // 在 catOrder 中把 id 上移/下移（-1/+1），越界不动，存盘并 applyCatOrder()
function renderSettingsCatOrder()                            // 渲染设置面板「分类顺序」列表（含 ↑/↓ 按钮），fixed 外模式下置灰/提示
function applyCatOrderLockUi()                               // 同步「手动调序」区可用状态与模式 chip 高亮

// M3 修改
function bumpCategory(id)                                    // 增加 if (catSortMode === 'fixed') return; 分支

// M4 修改
function initWallpaper()                                     // 默认值改 'default'，并加入一次性迁移
```

设置面板新增 DOM（挂在 `#settingsCatRow` 之后，样式复用现有 `.settings-chip` / `.settings-action-btn` / `.settings-hint`）：

```html
<div class="settings-section wide">
  <h4>🔀 分类排序模式</h4>
  <div class="settings-row">
    <span class="settings-chip" onclick="setCatSortMode('recent',this)" id="setCatSortRecent">按使用时间排序</span>
    <span class="settings-chip" onclick="setCatSortMode('fixed',this)" id="setCatSortFixed">固定顺序</span>
  </div>
  <p class="settings-hint">…</p>
  <div id="settingsCatOrderList" class="cat-order-list"></div>
</div>
```

`settings.catSortMode` 加入 `exportConfig()` 的 settings 对象与导入分支（导入时写回 `nav_cat_sort_mode`）。

## 数据流

1. 页面加载 → `loadCatOrder()` 读 `nav_cat_order` → `applyCatOrder()` 用该数组重排 main 区 section、侧边栏链接、移动端 Tab → `applyCatStates()` 应用折叠态。
2. 用户点击 sidebar/Tab → `setActive(el)` → `bumpCategory(id)`：
   - `recent` 模式：把 id 提到 `catOrder` 头部 → `saveCatOrder()` → `applyCatOrder()`（现状不变）。
   - `fixed` 模式：直接 return，不写 `catOrder`，顺序保持用户设定。
3. 用户切换模式 → `setCatSortMode()`：写 `nav_cat_sort_mode`；若切到 fixed 则先 `ensureFullCatOrder()` 固化当前可见顺序，再渲染调序列表。
4. 用户点 ↑/↓ → `moveCategory()` 交换 `catOrder` 中相邻两项 → 存盘 → `applyCatOrder()` 实时生效。
5. 壁纸：`initWallpaper()` 读 `nav_wallpaper`；若键缺失且 `nav_wp_default_migrated` 不是 `'1'`，在一处一次性逻辑里写 `default` 并打迁移标记；若读到旧的 `bing` 且迁移标记缺失，则视为「沿用旧默认值」迁移到 `default`；随后写迁移标记。
6. 右侧工具：`renderRtEdge()` 遍历 `rtBuiltins` 渲染，内置项新增在线 WPS；若自定义列表里已存在同名同 URL 项则跳过，避免重复。

## 风险点与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| 站点全压在 index.html 手写卡片里，改动量大易漏同步 | 卡片数/计数不一致、config-editor 与页面数据分叉 | 用脚本校验：解析 `index.html` 各 section 的卡片名与计数，与 `config-editor/data.js` 的 `DEFAULT_CATEGORIES` 逐一比对；不一致即视为未完成 |
| 新分类加进 HTML 但漏登记（设置面板 / exportConfig 内置 ID / 帮助文档） | 导出配置后分类顺序或显隐信息丢失，文档误导 | 把「4 处登记」写成 checklist 并逐项 grep 验证 |
| `bumpCategory` 在 fixed 模式下被其它入口调用 | 顺序仍会跳动 | 只在 `bumpCategory` 内部做分支（唯一写入口），并验证 fixed 下点击分类后 `nav_cat_order` 不变 |
| 壁纸迁移覆盖用户主动选择 | 用户偏好被改 | 仅迁移「键缺失」或「值仍是旧默认 bing 且无迁移标记」两种情况；迁移只执行一次；用户选过 custom/local/default 的值一律不动 |
| 新站点 URL 失效或写错 | 用户点到无效页 | 只收录可确认的知名站点官方域名；不确定的先用 web 检索核实（如两步路 2bulu.com、CNIPA 专利检索系统 pss-system.cponline.cnipa.gov.cn、APKPure） |
| 内置 WPS 与用户自定义工具重复 | 右侧出现两个 WPS | 渲染时按 URL 去重 |
| 改动涉及 ~100 个卡片，单次 review 过重 | 审查困难 | 按分类分块改动，每块改完立即用脚本核对计数，最后统一出验证证据文档 |

## 执行步骤

- [ ] 1. 建立 `Agent MD/` 骨架，归档用户需求到 `User Input.md`
- [ ] 2. 在本 PLAN.md 记录方案（用户已批准直接执行）
- [ ] 3. M1+M2：重写 12 个分类的卡片内容，插入「传统文化」section
- [ ] 4. M2：登记新分类（侧边栏 / 移动端 Tab / `renderSettingsCategories` / `exportConfig` 内置 ID / settings 面板）
- [ ] 5. M4：壁纸默认 `default` + 一次性迁移
- [ ] 6. M5：`rtBuiltins` 加在线 WPS（带去重）
- [ ] 7. M3：新增排序模式（状态、UI、`bumpCategory` 分支、手动调序、导入导出）
- [ ] 8. M6：同步 `configs/default_recommended.json` 与 `config-editor/data.js`
- [ ] 9. M7：同步 `help/index.html`
- [ ] 10. 验证脚本 + 人工核对，证据归档 `Agent MD/docs/evidence/`
- [ ] 11. 备份到 `.backup/`，写 `BACKUP_LOG.md`，更新 `PROJECT_STATUS.md` 与 `AGENTS.md`

## 验证计划

| 验收标准 | 验证方法 |
|---|---|
| 1 点名站点齐备 | 脚本扫描 index.html，断言每个点名站点名存在于对应 section 内；输出缺失清单 |
| 2 新分类登记齐备 | grep 断言 `cat-tradition` 出现在 main section / sidebar / mobile-tab / `renderSettingsCategories` / `exportConfig` 内置数组 / 帮助文档 |
| 3 计数一致 | 脚本按 section 统计 `.nav-card` 数量与 `N个站点` 文本比对，全部相等 |
| 4 壁纸默认 | 用 Node 跑 `initializeWallpaper` 的取值分支做真值表验证（键缺失 / bing / custom / local / default × 迁移标记有无） |
| 5 排序双模式 | 用 Node + 最小 DOM 桩或在浏览器 DevTools 执行：切 fixed → 点 3 个不同分类 → 断言 `nav_cat_order` 未变且顺序等于设定；切 recent → 再点 → 断言被点分类置顶 |
| 6 WPS 右侧 | 断言 `rtBuiltins` 含 `365.kdocs.cn`；断言渲染去重逻辑对重复 URL 只输出一次 |
| 7 预设数据一致 | 脚本比对 `config-vs-html` 的站点名集合与设置项 |

UI 部分补截图：`Agent MD/docs/evidence/` 下记录「正常态 + 暗色 + fixed 模式设置面板」。
