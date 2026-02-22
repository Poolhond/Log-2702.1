// sw-v2702-1.js — iOS-robuste app-shell service worker
const CACHE = "tuinlog-cache-v2702-1";
const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./manifest.webmanifest",
  "./app.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))));
    await self.clients.claim();
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cachedIndex = await cache.match("./index.html", { ignoreSearch: true });
      if (cachedIndex) return cachedIndex;

      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          cache.put("./index.html", fresh.clone());
        }
        return fresh;
      } catch (err) {
        const fallbackIndex = await cache.match("./index.html", { ignoreSearch: true });
        if (fallbackIndex) return fallbackIndex;
        const cachedRoot = await cache.match("./", { ignoreSearch: true });
        if (cachedRoot) return cachedRoot;
        throw err;
      }
    })());
    return;
  }

  if (req.method === "GET") {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;

      const res = await fetch(req);
      if (res && res.ok) {
        cache.put(req, res.clone());
      }
      return res;
    })());
  }
});
