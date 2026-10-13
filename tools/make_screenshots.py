# -*- coding: utf-8 -*-
"""生成 UI 证据截图（正常态 / 暗色 / 固定排序设置面板）。"""
import io, json, os, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
OUT = os.path.join(ROOT, 'Agent MD', 'docs', 'evidence')

PREPARE = r'''<script>
(function(){
  var PREP = __PREP__;
  try {
    PREP.forEach(function(it){ if (it[1] === null) localStorage.removeItem(it[0]); else localStorage.setItem(it[0], it[1]); });
  } catch(e){}
})();
</script>
'''

OPEN_SETTINGS = r'''
<script>
window.addEventListener('load', function(){ try { openSettings(); } catch(e){} });
</script>
'''

CASES = [
    ('ui_01_default_light', '1540,2300', [('nav_wallpaper', 'default'), ('nav_theme', 'light'), ('nav_cat_sort_mode', 'recent')], False),
    ('ui_02_default_dark', '1540,2300', [('nav_wallpaper', 'default'), ('nav_theme', 'dark'), ('nav_cat_sort_mode', 'recent')], False),
    ('ui_03_sortmode_settings', '1540,1400', [('nav_wallpaper', 'default'), ('nav_theme', 'light'), ('nav_cat_sort_mode', 'fixed')], True),
]


def main():
    if not os.path.exists(CHROME):
        print('chrome not found')
        return 2
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    with io.open(os.path.join(ROOT, 'index.html'), 'r', encoding='utf-8') as f:
        base = f.read()
    tmpdir = tempfile.mkdtemp(prefix='auroraus_shot_')
    try:
        for name, size, prep, settings in CASES:
            # 关键：prep 必须注入到 <head> 里、在主脚本之前执行，
            # 否则主题/壁纸要等 reload 才生效，而 --screenshot 会在 reload 前就截图。
            html = base.replace('<head>', '<head>\n' + PREPARE.replace('__PREP__', json.dumps(prep)), 1)
            if settings:
                html = html.replace('</body>', OPEN_SETTINGS + '\n</body>')
            page = os.path.join(tmpdir, name + '.html')
            with io.open(page, 'w', encoding='utf-8') as f:
                f.write(html)
            shot = os.path.join(OUT, name + '.png')
            prof = os.path.join(tmpdir, 'p_' + name)
            cmd = [CHROME, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
                   '--hide-scrollbars', '--virtual-time-budget=7000', '--window-size=' + size,
                   '--user-data-dir=' + prof, '--screenshot=' + shot,
                   'file:///' + page.replace('\\', '/')]
            p = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=180)
            ok = os.path.exists(shot)
            print('%-28s %s  %s' % (name, 'OK' if ok else 'FAIL', (str(os.path.getsize(shot)) + ' bytes') if ok else (p.stderr or '')[-200:]))
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)
    return 0


if __name__ == '__main__':
    sys.exit(main())
