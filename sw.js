/*
  Service Worker for Lernio PWA
  — caches the app shell for offline use
  — lets Firebase handle data sync
*/
/* bump this on every deploy that changes index.html so phones actually
   pick up the update instead of serving a stale cached shell */
const CACHE = 'lernio-v9';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js',
];

/* install: cache the app shell */
self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

/* activate: clean old caches immediately and take control of open tabs */
self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* fetch strategy:
   - page navigations (opening/reloading the app) → NETWORK FIRST, cache as
     fallback only when offline. This is what makes an update show up the
     next time the app is opened, instead of being stuck on an old cached
     version until the cache name changes.
   - everything else (fonts, icons, manifest) → cache first, network fallback,
     since those rarely change and don't need to be fresh every load. */
self.addEventListener('fetch', ev => {
  const url = new URL(ev.request.url);

  /* never cache Firebase / Google auth requests */
  if (url.hostname.includes('firestore.googleapis.com') ||
      url.hostname.includes('identitytoolkit.googleapis.com') ||
      url.hostname.includes('securetoken.googleapis.com') ||
      url.hostname.includes('apis.google.com') ||
      url.hostname.includes('accounts.google.com')) {
    return; /* let it go to network */
  }

  if (ev.request.mode === 'navigate') {
    ev.respondWith(
      fetch(ev.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(ev.request, clone));
          return resp;
        })
        .catch(() => caches.match(ev.request).then(c => c || caches.match('./index.html')))
    );
    return;
  }

  ev.respondWith(
    caches.match(ev.request).then(cached => {
      if (cached) return cached;
      return fetch(ev.request).then(resp => {
        if (resp.ok && ev.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(ev.request, clone));
        }
        return resp;
      }).catch(() => {});
    })
  );
});
