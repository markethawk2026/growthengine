/**
 * NC Markets — auto-updating service worker.
 *
 * Every app file is revalidated against the server on each load using a conditional
 * request (fast 304 when unchanged, 200 with fresh bytes when you deploy). This means
 * new deploys go live immediately — NO version bumping, NO cache-name changes ever again.
 * Offline: falls back to the last cached copy.
 */
const CACHE_NAME = "nc-markets-shell";
const SHELL = ["./","./index.html","./css/style.css","./js/security.js","./js/data-source.js","./js/request-manager.js","./js/api.js","./js/user-tools.js","./js/user-tools-ui.js","./js/product-polish.js","./js/quality-assurance.js","./js/main.js","./manifest.webmanifest"];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(SHELL.map(function (u) { return new Request(u, { cache: "reload" }); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if (url.origin !== location.origin) return; // never cache third-party market/API responses

  // Network-first with server revalidation (no-cache) so deploys appear on a normal reload.
  event.respondWith(
    fetch(event.request, { cache: "no-cache" }).then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
      }
      return response;
    }).catch(function () {
      return caches.match(event.request).then(function (hit) { return hit || caches.match("./index.html"); });
    })
  );
});
