/* 習慣任務 PWA Service Worker
   檔案位置：請放在 index.html 同一層。
   HTML 會註冊：navigator.serviceWorker.register('./service-worker.js', { scope: './' })
*/
const CACHE_VERSION = 'habit-mission-v8-4-external-pwa-20260514';

const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './offline.html',
  './favicon.ico',
  './apple-touch-icon.png',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-167x167.png',
  './icons/icon-180x180.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png',
  './icons/maskable-icon-192x192.png',
  './icons/maskable-icon-512x512.png',
  './screenshots/screenshot-mobile.png',
  './screenshots/screenshot-desktop.png'
];

async function cacheAppShell() {
  const cache = await caches.open(CACHE_VERSION);
  await Promise.all(
    APP_SHELL.map(url =>
      cache.add(url).catch(() => {
        // 有些檔案如果目前不存在，不讓 install 失敗。
      })
    )
  );
}

self.addEventListener('install', event => {
  event.waitUntil(cacheAppShell().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

function shouldBypassCache(url) {
  const host = url.hostname;
  return [
    'firebaseinstallations.googleapis.com',
    'firestore.googleapis.com',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'accounts.google.com',
    'www.googleapis.com',
    'apis.google.com',
    'gstatic.com',
    'www.gstatic.com'
  ].some(domain => host === domain || host.endsWith('.' + domain));
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Firebase / Google Auth / Firestore 不快取，避免登入與同步被舊資料干擾。
  if (shouldBypassCache(url)) {
    event.respondWith(fetch(request));
    return;
  }

  // 頁面導覽：網路優先，失敗時回到快取首頁，再不行回 offline.html。
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html').then(cached => cached || caches.match('./offline.html')))
    );
    return;
  }

  // 一般靜態資源：快取優先，背景更新快取。
  event.respondWith(
    caches.match(request).then(cached => {
      const networkFetch = fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
