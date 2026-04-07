// ─── Monthly Planner Service Worker ─────────────────────────────
const CACHE_NAME = 'planner-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// Install — pre-cache shell assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for HTML (always get latest),
//          cache-first for everything else
self.addEventListener('fetch', e => {
  const { request } = e;

  // Skip non-GET and Firebase/external requests
  if (request.method !== 'GET') return;
  if (request.url.includes('firestore') || request.url.includes('googleapis')) return;

  if (request.mode === 'navigate') {
    // HTML pages: try network first, fall back to cache
    e.respondWith(
      fetch(request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request))
    );
  } else {
    // Static assets: cache first, then network
    e.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, copy));
          return res;
        });
      })
    );
  }
});
