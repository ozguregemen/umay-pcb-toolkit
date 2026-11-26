// Offline support. Network first, so an online reader always gets the current
// files; the cache is only the fallback when the network fails or stalls.
// The page fills the cache in the background (src/offline.js).

const CACHE = 'umay-v1';
const STALL_MS = 5000;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  // Static site: the query string (?v=…) never changes the file.
  const key = url.origin + url.pathname;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(key);
    const network = fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') cache.put(key, res.clone()).catch(() => {});
      return res;
    });
    if (!cached) return network;
    // With a cached copy at hand: use it when the network fails, and do not
    // wait for a stalled connection.
    const stall = new Promise((resolve) => { setTimeout(() => resolve(cached), STALL_MS); });
    return Promise.race([network.catch(() => cached), stall]);
  })());
});
