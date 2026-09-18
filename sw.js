/*
  Service Worker for Lernio PWA
  — caches the app shell for offline use
  — lets Firebase handle data sync
*/
const CACHE = 'lernio-v1';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
];

/* install: cache the app shell */
self.addEventListener('install', ev => {
  ev.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

/* activate: clean old caches */
self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* fetch: serve from cache, fall back to network */
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

  ev.respondWith(
    caches.match(ev.request).then(cached => {
      if (cached) return cached;
      return fetch(ev.request).then(resp => {
        /* cache successful GET responses for fonts etc */
        if (resp.ok && ev.request.method === 'GET') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(ev.request, clone));
        }
        return resp;
      }).catch(() => {
        /* offline fallback for navigate requests */
        if (ev.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
