# -*- coding: utf-8 -*-
"""捕获页面运行期错误（window.onerror）与控制台报错，用于快速定位脚本中断点。"""
import io, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

HEAD = '''<script>
window.__errs = [];
window.onerror = function(msg, src, line, col, err) {
  window.__errs.push({msg: msg, line: line, col: col, stack: String((err && err.stack) || '').split('\\n').slice(0, 4)});
  return false;
};
</script>'''

BODY = '''<pre id="__out" style="display:none"></pre>
<script>
window.addEventListener('load', function(){
  setTimeout(function(){
    var o = document.getElementById('__out');
    o.textContent = 'ERRS=' + JSON.stringify(window.__errs || []) +
      '\\nRTEDGE_LEN=' + (document.getElementById('rtEdge') || {}).innerHTML?.length +
      '\\nIXTOP=' + !!document.getElementById('ixTop') +
      '\\nBODYCLASS=' + document.body.className;
  }, 600);
});
</script>'''


def main():
    with io.open(os.path.join(ROOT, 'index.html'), 'r', encoding='utf-8') as f:
        html = f.read()
    html = html.replace('<head>', '<head>\n' + HEAD, 1)
    html = html.replace('</body>', BODY + '\n</body>')
    d = tempfile.mkdtemp(prefix='auroraus_err_')
    try:
        for sub in ('assets',):
            shutil.copytree(os.path.join(ROOT, sub), os.path.join(d, sub))
        p = os.path.join(d, 'index.html')
        io.open(p, 'w', encoding='utf-8').write(html)
        cmd = [CHROME, '--headless=new', '--disable-gpu', '--no-first-run', '--window-size=1600,1200', '--no-default-browser-check',
               '--allow-file-access-from-files', '--virtual-time-budget=6000',
               '--user-data-dir=' + os.path.join(d, 'prof'), '--dump-dom', 'file:///' + p.replace('\\', '/')]
        r = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=180)
        m = re.search(r'<pre id="__out"[^>]*>(.*?)</pre>', r.stdout or '', re.S)
        if m:
            print(m.group(1).replace('&quot;', '"').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>'))
        else:
            print('no output; rc=%d\n%s' % (r.returncode, (r.stderr or '')[-500:]))
    finally:
        shutil.rmtree(d, ignore_errors=True)


if __name__ == '__main__':
    main()
