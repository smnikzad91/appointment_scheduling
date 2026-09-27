// Minimal service worker for the installed app: shows a Persian offline screen instead of the
// browser's error page when a navigation fails. Deliberately caches nothing else, so users never
// see stale appointment data.
const CACHE = "nobata-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll([OFFLINE_URL, "/fonts/Vazirmatn-Variable.woff2"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  // The offline page's own font.
  if (new URL(request.url).pathname === "/fonts/Vazirmatn-Variable.woff2") {
    event.respondWith(caches.match(request).then((hit) => hit || fetch(request)));
  }
});
