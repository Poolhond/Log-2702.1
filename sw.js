const CACHE = "tuinlog-cache-v7";
const ASSETS = [
  "./",
  "./index.html",
  "./app.css",
  "./manifest.webmanifest",
  "./app.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => (key === CACHE ? null : caches.delete(key)))))
      .then(() => self.clients.claim())
  );
});

const OFFLINE_FALLBACK_HTML = `<!doctype html>
<html lang="nl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tuinlog</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0b0f14; color: #fff; }
    main { min-height: 100vh; display: grid; place-items: center; padding: 24px; box-sizing: border-box; }
    .card { max-width: 460px; line-height: 1.5; }
    button { margin-top: 16px; border: 0; border-radius: 10px; padding: 10px 14px; background: #2f8f2f; color: #fff; font: inherit; }
  </style>
</head>
<body>
  <main>
    <div class="card">
      <h1>Tuinlog is offline</h1>
      <p>Er kon geen recente versie worden geladen. Controleer je verbinding en probeer opnieuw.</p>
      <button onclick="location.reload()">Herlaad</button>
    </div>
  </main>
</body>
</html>`;

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    networkPromise.catch(() => null);
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) return networkResponse;

  const cachedIndex = await cache.match("./index.html");
  if (cachedIndex) return cachedIndex;

  return new Response(OFFLINE_FALLBACK_HTML, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
    status: 200,
  });
}


self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
    return;
  }

  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(staleWhileRevalidate(event.request));
});
