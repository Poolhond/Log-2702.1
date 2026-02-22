// sw.js — iOS-robuste app-shell service worker
const CACHE = "tuinlog-shell-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./app.css",
  "./manifest.webmanifest",
];

const UNIQUE_ASSETS = [...new Set(ASSETS)];

self.addEventListener("install", (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const asset of UNIQUE_ASSETS) {
      try {
        await cache.add(asset);
      } catch {
        // install mag niet falen als een asset ontbreekt
      }
    }
    await self.skipWaiting();
  })());
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

  const accept = req.headers.get("accept") || "";
  const isNavigate = req.mode === "navigate" || accept.includes("text/html");

  // 1) Navigations (iOS standalone herstart): netwerk proberen, altijd fallback naar app-shell
  if (isNavigate) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) {
          cache.put(req, fresh.clone());
        }
        return fresh;
      } catch {
        const cachedIndex = await cache.match("./index.html", { ignoreSearch: true });
        if (cachedIndex) return cachedIndex;
        const cachedRoot = await cache.match("./", { ignoreSearch: true });
        if (cachedRoot) return cachedRoot;
        return new Response("Offline", {
          status: 503,
          statusText: "Offline",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })());
    return;
  }

  // 2) Overige GET requests: cache-first
  if (req.method === "GET") {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;

      try {
        const res = await fetch(req);
        if (res && res.ok) {
          cache.put(req, res.clone());
        }
        return res;
      } catch {
        return new Response("Offline", {
          status: 503,
          statusText: "Offline",
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      }
    })());
  }
});
