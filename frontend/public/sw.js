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

  if (OFFLINE_ASSETS.includes(url.pathname)) {
    event.respondWith(fetch(event.request).catch(() => caches.match(url.pathname)));
  }
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json() ?? {};
  const title = payload.title || "Jivara";
  const options = {
    body: payload.body || "Ada pengingat baru dari Jivara.",
    icon: "/images/logo/notext.png",
    badge: "/images/logo/notext.png",
    data: payload.data || {},
    tag: payload.data?.reminder_job_id || payload.type || "jivara-notification",
    renotify: payload.urgency === "urgent" || payload.urgency === "critical",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const actionUrl = event.notification.data?.action_url || "/dashboard";
  const targetUrl = new URL(actionUrl, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      return clients.openWindow(targetUrl);
    }),
  );
});
