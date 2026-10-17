# -*- coding: utf-8 -*-
"""统计首页实际引用的图片体积，并（可选）压缩：把分类图标等比缩到 96px 后重编码。

用法:
  python tools/optimize_assets.py            # 只统计
  python tools/optimize_assets.py --apply    # 实际压缩（图标 96px q85；hero 1600px q82）
"""
import io, os, re, sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
apply = '--apply' in sys.argv

html = io.open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
refs = sorted(set(re.findall(r"assets/([A-Za-z0-9_\-.]+\.(?:jpg|jpeg|png|gif|webp|svg))", html)))
css = re.search(r'\.hero-bg \{[^}]*url\(\'assets/([^\']+)\'', html)
if css and css.group(1) not in refs:
    refs.append(css.group(1))

icons = [r for r in refs if r.startswith('icon_')]
heros = [r for r in refs if r.startswith('hero_')]
walls = [r for r in refs if r.startswith('wp_')]
other = [r for r in refs if r not in icons and r not in heros and r not in walls]


def size(name):
    p = os.path.join(ROOT, 'assets', name)
    return os.path.getsize(p) if os.path.exists(p) else 0


print('引用图片：图标 %d / 首屏背景 %d / 壁纸池 %d / 其它 %d' % (len(icons), len(heros), len(walls), len(other)))
print('首屏必载：图标 %.0f KB + 背景 %.0f KB = %.0f KB'
      % (sum(size(n) for n in icons) / 1024, sum(size(n) for n in heros) / 1024,
         (sum(size(n) for n in icons) + sum(size(n) for n in heros)) / 1024))
print('壁纸池（按需才载）：%.1f MB' % (sum(size(n) for n in walls) / 1048576))

if not apply:
    from PIL import Image
    for n in icons[:3] + heros[:2]:
        with Image.open(os.path.join(ROOT, 'assets', n)) as im:
            print('  %-24s %s  %d KB' % (n, im.size, size(n) / 1024))
    print('\n加 --apply 执行压缩')
    raise SystemExit(0)

from PIL import Image

before = after = 0
for n in icons:
    p = os.path.join(ROOT, 'assets', n)
    b = os.path.getsize(p)
    before += b
    with Image.open(p) as im:
        im = im.convert('RGB')
        im.thumbnail((96, 96), Image.LANCZOS)
        im.save(p, 'JPEG', quality=85, optimize=True, progressive=True)
    after += os.path.getsize(p)
print('图标：%.0f KB → %.0f KB' % (before / 1024, after / 1024))

before = after = 0
for n in heros:
    p = os.path.join(ROOT, 'assets', n)
    b = os.path.getsize(p)
    before += b
    with Image.open(p) as im:
        im = im.convert('RGB')
        im.thumbnail((1600, 1600), Image.LANCZOS)
        im.save(p, 'JPEG', quality=82, optimize=True, progressive=True)
    after += os.path.getsize(p)
print('首屏背景：%.0f KB → %.0f KB' % (before / 1024, after / 1024))
