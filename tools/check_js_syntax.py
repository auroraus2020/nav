# -*- coding: utf-8 -*-
"""提取 index.html 的内联 <script> 块，逐个用 node --check 做语法校验。"""
import io, os, subprocess, sys, tempfile

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
path = os.path.join(root, 'index.html')
with io.open(path, 'r', encoding='utf-8') as f:
    html = f.read()

blocks = []
pos = 0
while True:
    s = html.find('<script>', pos)
    if s < 0:
        break
    e = html.find('</script>', s)
    blocks.append(html[s + len('<script>'):e])
    pos = e + 1

print('inline script blocks: %d' % len(blocks))
rc = 0
for i, code in enumerate(blocks):
    with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False, encoding='utf-8') as tf:
        tf.write(code)
        tmp = tf.name
    try:
        p = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
        status = 'OK' if p.returncode == 0 else 'SYNTAX ERROR'
        print('  block %d: %s (%d chars)' % (i, status, len(code)))
        if p.returncode != 0:
            print(p.stdout)
            print(p.stderr)
            rc = 1
    finally:
        os.unlink(tmp)
sys.exit(rc)
