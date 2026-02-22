// sw.js — iOS-robuste app-shell service worker
const CACHE = "tuinlog-cache-v6"; // <-- BELANGRIJK: bump bij elke release
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
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // Alleen eigen origin
  if (url.origin !== self.location.origin) return;

  // 1) Navigations (iOS standalone herstart): altijd app-shell (index.html) uit cache
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);

      // probeer cache index (ook als URL afwijkt)
      const cachedIndex = await cache.match("./index.html", { ignoreSearch: true });
      if (cachedIndex) return cachedIndex;

      // als niet in cache, haal online en cache
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put("./index.html", fresh.clone());
        return fresh;
      } catch (err) {
        // laatste redmiddel: probeer root
        const cachedRoot = await cache.match("./", { ignoreSearch: true });
        if (cachedRoot) return cachedRoot;
        throw err;
      }
    })());
    return;
  }

  // 2) Overige GET requests: cache-first met ignoreSearch
  if (req.method === "GET") {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;

      const res = await fetch(req);
      // optioneel: cache enkel dezelfde-origin assets
      if (res && res.ok) {
        cache.put(req, res.clone());
      }
      return res;
    })());
  }
});
