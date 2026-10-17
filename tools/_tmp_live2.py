# -*- coding: utf-8 -*-
"""临时：验证实时卫星图两种取景（中国区域 / 全圆盘）+ 北京时间备注（用完即删）。"""
import io, os, re, shutil, subprocess, sys, tempfile

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

PROBE = r'''
<script>
window.addEventListener('load', function () {
  var out = [];
  function credit() { return (document.getElementById('earthCredit').textContent || ''); }
  function bgInfo() {
    var bg = document.querySelector('.hero-bg');
    return (bg.style.backgroundImage || '').slice(0, 22) + ' len=' + (bg.style.backgroundImage || '').length +
           ' pos=' + bg.style.backgroundPosition + ' op=' + bg.style.opacity;
  }
  setTimeout(function () {
    out.push('earthCredit=' + credit());
    out.push('earthBg=' + bgInfo());
    setWallpaper('fy4');
    setTimeout(function () {
      out.push('fy4Class=' + document.body.classList.contains('wp-fy4'));
      out.push('scopeRowShown=' + (getComputedStyle(document.getElementById('liveScopeRow')).display !== 'none'));
      out.push('regionChipOn=' + document.getElementById('liveScopeRegion').classList.contains('on'));
      out.push('regionCredit=' + credit());
      out.push('regionBg=' + bgInfo());
      setLiveScope('disk');
      setTimeout(function () {
        out.push('diskClass=' + document.body.classList.contains('live-disk'));
        out.push('diskChipOn=' + document.getElementById('liveScopeDisk').classList.contains('on'));
        out.push('diskCredit=' + credit());
        out.push('diskBg=' + bgInfo());
        out.push('stored=' + localStorage.getItem('nav_wallpaper') + '/' + localStorage.getItem('nav_live_scope'));
        document.title = 'R|' + out.join(' || ');
      }, 14000);
    }, 16000);
  }, 16000);
});
</script>
'''

def run(size, label):
    with io.open(os.path.join(ROOT, 'index.html'), 'r', encoding='utf-8') as f:
        html = f.read()
    tmp = tempfile.mkdtemp(prefix='probe_live_')
    page = os.path.join(tmp, 'p.html')
    with io.open(page, 'w', encoding='utf-8') as f:
        f.write(html.replace('</body>', PROBE + '\n</body>'))
    prof = os.path.join(tmp, 'prof')
    cmd = [CHROME, '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
           '--hide-scrollbars', '--virtual-time-budget=180000', '--window-size=' + size,
           '--user-data-dir=' + prof, '--dump-dom', 'file:///' + page.replace('\\', '/')]
    p = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=600)
    m = re.search(r'<title>(R\|[^<]*)</title>', p.stdout or '')
    print('=====', label, size)
    if m:
        for part in m.group(1)[2:].split(' || '):
            print(' ', part)
    else:
        print('  NO-TITLE', (p.stderr or '')[-300:])
    shutil.rmtree(tmp, ignore_errors=True)

if __name__ == '__main__':
    run('1600,1000', 'desktop')
