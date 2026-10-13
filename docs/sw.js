/* Stage Radar service worker — makes the app installable and gives it an offline shell.
 * Privacy: cross-origin requests (Supabase API, CDNs) are NEVER intercepted or cached here,
 * so no account data, offers or CVs are ever stored by the service worker.
 */
const VERSION = 'sr-v7';
const SHELL = ['/', '/index.html', '/app.js', '/config.js', '/manifest.webmanifest',
               '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;         // Supabase & CDNs: leave to the network

  // SPA navigations (clean URLs like /offres): serve the app shell, network-first.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }
  // Same-origin assets: serve from cache fast, refresh in the background.
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
      }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
