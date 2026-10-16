# -*- coding: utf-8 -*-
"""只跑 run_ui_tests.py 里的某几个用例（调试用，避免每次都跑全套）。
用法: python tools/run_one_case.py fav_freq_order [engine_modifier_switch ...]
"""
import importlib.util, io, os, shutil, sys, tempfile

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location('uit', os.path.join(ROOT, 'tools', 'run_ui_tests.py'))
uit = importlib.util.module_from_spec(spec)
spec.loader.exec_module(uit)

names = sys.argv[1:]
if not names:
    print('usage: python tools/run_one_case.py <case> [...]')
    print('cases:', ', '.join(c for c, _ in uit.CASES))
    raise SystemExit(2)

preps = dict(uit.CASES)
tmpdir = tempfile.mkdtemp(prefix='auroraus_one_')
hold = uit.HoldServer()
fails = 0
try:
    for name in names:
        if name not in preps:
            print('[FAIL] unknown case: %s' % name)
            fails += 1
            continue
        lines = uit.run_case(name, preps[name], tmpdir, hold.hold_url())
        for l in lines:
            print(l)
            if l.startswith('[FAIL]'):
                fails += 1
finally:
    hold.stop()
    shutil.rmtree(tmpdir, ignore_errors=True)
print('one-case done, FAIL=%d' % fails)
sys.exit(1 if fails else 0)
