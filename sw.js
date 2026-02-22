const CACHE = "tuinlog-cache-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./manifest.webmanifest",
  "./app.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k === CACHE ? null : caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (e) => {
  if (e.data === "skipWaiting") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(e.request);

    const networkPromise = fetch(e.request)
      .then((response) => {
        if (response && response.ok) {
          cache.put(e.request, response.clone());
        }
        return response;
      });

    if (cached) {
      e.waitUntil(networkPromise.catch(() => undefined));
      return cached;
    }

    try {
      return await networkPromise;
    } catch {
      const offlineFallback = await cache.match("./index.html");
      if (offlineFallback) return offlineFallback;
      return new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});
