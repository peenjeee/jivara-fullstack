const OFFLINE_URL = "/offline";
const CACHE_NAME = "jivara-offline-v6";
const OFFLINE_ASSETS = [OFFLINE_URL, "/images/logo/text.png", "/images/logo/notext.png", "/images/logo/splash.png"];
const NAVIGATION_TIMEOUT_MS = 8000;

async function fetchWithTimeout(request, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function cacheRequest(cache, request) {
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return null;
  }
}

function getStaticAssetUrls(html) {
  return Array.from(html.matchAll(/(?:src|href)="([^\"]*\/_next\/static\/[^\"]+)"/g))
    .map((match) => new URL(match[1], self.location.origin).href);
}

async function cacheOfflineRoute(cache) {
  const request = new Request(OFFLINE_URL, { cache: "reload" });
  const response = await cacheRequest(cache, request);
  if (!response) return;

  const html = await response.clone().text();
  await Promise.allSettled(
    getStaticAssetUrls(html).map((url) => cacheRequest(cache, new Request(url, { cache: "reload" }))),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.allSettled(OFFLINE_ASSETS.map((asset) => cacheRequest(cache, new Request(asset, { cache: "reload" }))));
      await cacheOfflineRoute(cache);
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.flatMap((key) => (key !== CACHE_NAME ? [caches.delete(key)] : [])),
    )).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetchWithTimeout(event.request, NAVIGATION_TIMEOUT_MS).catch(() => caches.match(OFFLINE_URL).then((response) => response ?? Response.error())),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        const network = cacheRequest(cache, event.request);
        return cached ?? await network ?? Response.error();
      }),
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

  const targetUrl = getSafeActionUrl(event.notification.data?.action_url);
  const tracking = trackNotificationEvent(event.notification.data, "clicked");

  event.waitUntil(
    Promise.allSettled([tracking, clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }

      return clients.openWindow(targetUrl);
    })]),
  );
});

async function trackNotificationEvent(data, eventType) {
  const notificationId = data?.notification_id;
  const trackingUrl = getSafeSameOriginUrl(data?.tracking_url);

  if (typeof notificationId !== "string" || !trackingUrl) return;

  await fetch(trackingUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notification_id: notificationId, event_type: eventType }),
  }).catch(() => undefined);
}

function getSafeActionUrl(actionUrl) {
  if (typeof actionUrl !== "string" || !actionUrl.startsWith("/")) {
    return `${self.location.origin}/dashboard`;
  }

  const targetUrl = new URL(actionUrl, self.location.origin);
  if (targetUrl.origin !== self.location.origin) {
    return `${self.location.origin}/dashboard`;
  }

  return targetUrl.href;
}

function getSafeSameOriginUrl(value) {
  if (typeof value !== "string" || !value.startsWith("/")) return null;

  const targetUrl = new URL(value, self.location.origin);
  if (targetUrl.origin !== self.location.origin) return null;

  return targetUrl.href;
}
