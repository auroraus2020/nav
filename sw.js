/* Auroraus 导航 - 离线/加速缓存（Service Worker）
 *
 * 目标：把「每次访问都不变的大文件」缓到本地 —— 壁纸/图标/字体/CSS/脚本 ——
 *      第二次打开直接命中缓存，不再走网络；页面本体（HTML/配置）走「网络优先」，
 *      这样改了站内文件刷新就能看到最新版，不会卡在旧缓存上。
 *
 * 策略：
 *   导航请求（打开页面）  → 网络优先，失败回缓存（离线也能开）
 *   /assets/ 与静态文件   → 先用缓存立刻渲染，同时在后台拉一次更新（stale-while-revalidate）
 *   跨域请求（卫星图/必应）→ 不拦截，交给浏览器 HTTP 缓存
 *   tools/、_backup/       → 完全不碰
 */
var VER = 'v1';
var STATIC_CACHE = 'auroraus-static-' + VER;
var NAV_CACHE = 'auroraus-nav-' + VER;
var SKIP = /(\/tools\/|\/_backup\/|\.map$)/i;
var STATIC_EXT = /\.(css|js|json|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|txt)$/i;

self.addEventListener('install', function() {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== STATIC_CACHE && k !== NAV_CACHE) return caches.delete(k);
        return null;
      }));
    }).then(function() { return self.clients.claim(); })
  );
});

function usable(res) {
  if (!res) return false;
  if (!res.ok) return false;
  if (res.type !== 'basic' && res.type !== 'default') return false;   // 不缓存 opaque/cors
  return true;
}

function networkFirst(req) {
  return caches.open(NAV_CACHE).then(function(cache) {
    return fetch(req).then(function(res) {
      if (usable(res)) cache.put(req, res.clone());
      return res;
    }).catch(function(err) {
      return cache.match(req).then(function(hit) {
        if (hit) return hit;
        return cache.match('index.html').then(function(index) {
          if (index) return index;
          throw err;
        });
      });
    });
  });
}

function staleWhileRevalidate(req) {
  return caches.open(STATIC_CACHE).then(function(cache) {
    return cache.match(req).then(function(hit) {
      var update = fetch(req).then(function(res) {
        if (usable(res)) cache.put(req, res.clone());
        return res;
      }).catch(function() { return null; });
      if (hit) {
        // 命中缓存：立即返回，后台静默更新（下一次访问就是最新版）
        update.catch(function() {});
        return hit;
      }
      return update.then(function(res) {
        if (res) return res;
        throw new Error('offline');
      });
    });
  });
}

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;      // 跨域交给浏览器缓存
  if (SKIP.test(url.pathname)) return;
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(networkFirst(req));
    return;
  }
  if (STATIC_EXT.test(url.pathname)) {
    e.respondWith(staleWhileRevalidate(req));
  }
});
