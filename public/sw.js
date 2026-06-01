/* Minimal service worker: installability + basic offline.
   Network-first for same-origin GETs; ALWAYS resolves to a Response
   (never undefined) so respondWith doesn't throw "Returned response is null". */
const CACHE = "farma-v2";
const CACHE_PREFIX = "farma-";

self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // Only prune this app's own caches — caches are origin-wide and may be
      // shared with other apps on the same origin.
      await Promise.all(
        keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  ),
);

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch { return; }
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    (async () => {
      try {
        const res = await fetch(req);
        // Tie the cache write to the event lifetime so it isn't cancelled when
        // the worker is terminated after respondWith resolves.
        if (res && res.ok) {
          const copy = res.clone();
          event.waitUntil(caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}));
        }
        return res;
      } catch {
        // caches.match can itself reject (storage errors) — guard it so the
        // async function always resolves to a Response.
        try {
          const cached = await caches.match(req);
          return cached || Response.error();
        } catch {
          return Response.error();
        }
      }
    })(),
  );
});
