const OFFLINE_URL = "/offline";
const CACHE_NAME = "jivara-offline-v3";
const OFFLINE_ASSETS = [OFFLINE_URL, "/images/logo/text.png", "/images/logo/notext.png", "/images/logo/splash.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => Promise.all(
      OFFLINE_ASSETS.map((asset) => cache.add(new Request(asset, { cache: "reload" }))),
    )),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
    )).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL).then((response) => response ?? Response.error())),
    );
    return;
  }

  if (url.pathname === "/_next/image" && url.searchParams.get("url")?.startsWith("/images/logo/")) {
    const logoPath = url.searchParams.get("url");
    event.respondWith(fetch(event.request).catch(() => caches.match(logoPath)));
    return;
  }

  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
