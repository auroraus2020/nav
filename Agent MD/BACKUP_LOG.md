# BACKUP_LOG.md

## 备份记录 - 2026-10-13 23:13
- 操作类型：备份
- commit hash：7f476bd
- 改动说明：建立本地备份仓库（`.backup/`），在开始「分类站点批量补充」改动前记录基线快照。
- 备注：此前项目无 `.backup/` 目录，本次新建并 `git init`；不含远程仓库，禁止 push。

## 备份记录 - 2026-10-13 23:24
- 操作类型：备份
- commit hash：61e229a
- 改动说明：分类扩充至 17 分类 / 266 站点；新增「传统文化」分类；新增分类排序双模式（按使用时间 / 固定顺序 + 手动 ↑↓ 调序）；壁纸默认改为「默认壁纸」并对存量 bing 用户做一次性迁移；「在线WPS」加入右侧快捷工具栏；同步 `config-editor/data.js`、`configs/default_recommended.json`、`help/index.html`；新建 `Agent MD/` 文档体系与 `tools/` 校验脚本。
- 备注：验证证据见 `Agent MD/docs/evidence/分类站点补充与排序双模式_20261013.md`（静态校验全绿 + 无头 Chrome 行为断言 PASS=61 FAIL=0）。

## 备份记录 - 2026-10-13 23:31
- 操作类型：备份
- commit hash：b8667c2
- 改动说明：补全 `Agent MD/` 文档（AGENTS/PROJECT_STATUS/README/BACKUP_LOG/证据/ADR-001）与 `tools/` 六道校验脚本；新增 `assets/icon_tradition.jpg`（传统文化分类图标）；收尾后全量回归 76 项断言零失败。
- 备注：本次为本轮任务的最终稳定快照。回滚方式：`git -C .backup reset --hard b8667c2`（或退到 `7f476bd` 取改动前基线）。

## 备份记录 - 2026-10-13 23:40
- 操作类型：备份
- commit hash：a9b0a9e
- 改动说明：「学习提升」补入 TypeWords（typewords.cc）、LanGeek（langeek.co/en-ZH）、黄油单词（waiyuka.cc）三个站点；TED 原已在该分类，未重复添加。`cat-learn` 16→19 个站点，全站 17 分类 269 站点；同步 `config-editor/data.js` 与 `tools/verify_site_integrity.py` 的点名断言。
- 备注：六道校验全部重跑通过（61 + 9 + 6 项断言零失败）；证据见 `Agent MD/docs/evidence/分类站点补充与排序双模式_20261013.md` 末尾「追加验证」小节。

## 备份记录 - 2026-10-14 00:12
- 操作类型：备份
- commit hash：c0d96ff
- 改动说明：修正站点问题——移除哈佛 CHGIS（404）与国学大师，新增历史地图网 / GeaCron / 中华古籍资源库 / 万年日历查询（简体），VoiceTube 改用 www.voicetube.com，国家图书馆改 https；影音娱乐补入红果短剧、爱壹帆、Tubi、Pluto TV、The Roku Channel；分类排序模式默认改为「固定顺序」（存量 recent 用户一次性迁移，主动选过的不动）。全站 17 分类 **276 站点**。
- 备注：六道校验全部重跑通过（74 + 9 + 6 项断言零失败）；新增 `tools/sync_data_js.py`（从 HTML 反向派生编辑器数据）与 `tools/list_category.py`（分类清单排查）。

## 备份记录 - 2026-10-14 00:24
- 操作类型：备份
- commit hash：b70dc5d
- 改动说明：右侧快捷工具顺序调整——「微信传输」移到第一位；原先挂在「第一个内置项之后」的四个悬浮窗入口改为固定排在内置工具之后，顺序不再随首项变化而漂移。同步更新 `help/index.html` 的内置工具表格。
- 备注：六道校验通过（行为断言 77 项零失败，新增 `wechatIsFirst` / `orderHead` / `firstFloatingAfterBuiltins` 三项排序断言）。
