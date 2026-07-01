# -*- coding: utf-8 -*-
fp = r'e:\业余爱好\网站运维\Auroraus导航网页\index.html'
with open(fp, 'r', encoding='utf-8') as f:
    c = f.read()

ok = []

# 1. Force: add DaN, make kgf dynamic
old1 = "{ label: 'N (\u725b)', factor: 1 },\n        { label: 'kN (\u5343\u725b)', factor: 1000 },\n        { label: 'MN (\u5146\u725b)', factor: 1000000 },\n        { label: 'dyn (\u8fbe\u56e0)', factor: 0.00001 },\n        { label: 'lbf (\u78c5\u529b)', factor: 4.4482216152605 },\n        { label: 'kip (\u5343\u78c5\u529b)', factor: 4448.2216152605 },\n        { label: 'kgf (\u5343\u514b\u529b)', factor: 9.80665 },\n        { label: 'pdl (\u78c5\u8fbe)', factor: 0.138254954376 }"
new1 = "{ label: 'N (\u725b)', factor: 1 },\n        { label: 'DaN (\u5341\u725b)', factor: 10 },\n        { label: 'kN (\u5343\u725b)', factor: 1000 },\n        { label: 'MN (\u5146\u725b)', factor: 1000000 },\n        { label: 'dyn (\u8fbe\u56e0)', factor: 0.00001 },\n        { label: 'lbf (\u78c5\u529b)', factor: 4.4482216152605 },\n        { label: 'kip (\u5343\u78c5\u529b)', factor: 4448.2216152605 },\n        { label: 'kgf (\u5343\u514b\u529b)', toBase: function(v){return v * convG;}, fromBase: function(v){return v / convG;} },\n        { label: 'pdl (\u78c5\u8fbe)', factor: 0.138254954376 }"
if old1 in c:
    c = c.replace(old1, new1); ok.append('force')
else:
    print('FORCE NOT FOUND')

# 2. Add fuel category after density
old2 = "{ label: 'lb/gal US', factor: 119.8264273169 }\n      ]\n    };"
new2 = "{ label: 'lb/gal US', factor: 119.8264273169 }\n      ],\n      fuel: [\n        { label: 'kg/(N\u00b7s)', factor: 1 },\n        { label: 'g/(N\u00b7s)', factor: 0.001 },\n        { label: 'kg/(DaN\u00b7s)', factor: 0.1 },\n        { label: 'g/(DaN\u00b7s)', factor: 0.0001 },\n        { label: 'kg/(N\u00b7h)', factor: 1/3600 },\n        { label: 'g/(N\u00b7h)', factor: 0.001/3600 },\n        { label: 'kg/(DaN\u00b7h)', factor: 0.1/3600 },\n        { label: 'g/(DaN\u00b7h)', factor: 0.0001/3600 },\n        { label: 'kg/(kgf\u00b7h)', toBase: function(v){return v / convG / 3600;}, fromBase: function(v){return v * convG * 3600;} },\n        { label: 'g/(kgf\u00b7h)', toBase: function(v){return v * 0.001 / convG / 3600;}, fromBase: function(v){return v * 1000 * convG * 3600;} },\n        { label: 'kg/(kgf\u00b7s)', toBase: function(v){return v / convG;}, fromBase: function(v){return v * convG;} },\n        { label: 'g/(kgf\u00b7s)', toBase: function(v){return v * 0.001 / convG;}, fromBase: function(v){return v * 1000 * convG;} }\n      ]\n    };"
if old2 in c:
    c = c.replace(old2, new2); ok.append('fuel')
else:
    print('FUEL NOT FOUND')

# 3. Add convG variable
old3 = "var convCat = 'length';"
new3 = "var convCat = 'length';\n    var convG = 9.8;"
if old3 in c:
    c = c.replace(old3, new3); ok.append('convG')
else:
    print('CONVG NOT FOUND')

# 4. Add fuel tab
old4 = "<button class=\"conv-tab\" onclick=\"convSwitchCat('byte',this)\">\u5b57\u8282</button>"
new4 = "<button class=\"conv-tab\" onclick=\"convSwitchCat('fuel',this)\">\u8017\u6cb9\u7387</button>\n      <button class=\"conv-tab\" onclick=\"convSwitchCat('byte',this)\">\u5b57\u8282</button>"
if old4 in c:
    c = c.replace(old4, new4); ok.append('tab')
else:
    print('TAB NOT FOUND')

# 5. Add g input to the input area
old5 = "<select id=\"convUnit\" onchange=\"convCalc()\"></select>\n    </div>"
new5 = "<select id=\"convUnit\" onchange=\"convCalc()\"></select>\n      <span style=\"font-size:0.68rem;color:var(--muted);white-space:nowrap;\">g=</span>\n      <input type=\"number\" id=\"convGInput\" value=\"9.8\" step=\"0.001\" style=\"width:52px;padding:0.2rem 0.3rem;border:1px solid var(--rule);border-radius:6px;font-size:0.7rem;background:var(--bg2);color:var(--ink);outline:none;font-family:var(--font);\" onchange=\"convUpdateG()\" title=\"\u91cd\u529b\u52a0\u901f\u5ea6\uff08\u5f71\u54cdkgf\u548c\u8017\u6cb9\u7387\uff09\">\n    </div>"
if old5 in c:
    c = c.replace(old5, new5); ok.append('ginput')
else:
    print('GINPUT NOT FOUND')

# 6. Add convUpdateG function
old6 = "function convInitUnits() {"
new6 = "function convUpdateG() {\n      var inp = document.getElementById('convGInput');\n      if (!inp) return;\n      var v = parseFloat(inp.value);\n      if (!isNaN(v) && v > 0) { convG = v; convCalc(); }\n    }\n\n    function convInitUnits() {"
if old6 in c:
    c = c.replace(old6, new6); ok.append('gfunc')
else:
    print('GFUNC NOT FOUND')

with open(fp, 'w', encoding='utf-8') as f:
    f.write(c)

print('Done: ' + ', '.join(ok))
