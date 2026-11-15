// Mitday service worker: Web Push only (no offline caching).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const url =
    typeof data.url === "string" && /^\/(?![/\\])/.test(data.url)
      ? data.url
      : "/";
  event.waitUntil(
    self.registration.showNotification(data.title || "Mitday", {
      body: data.body || "",
      icon: "/api/pwa-icon/192",
      badge: "/api/pwa-icon/badge",
      tag: data.tag,
      renotify: Boolean(data.tag),
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin,
  ).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (client.url === target && "focus" in client) return client.focus();
      }
      // Never navigate an existing tab away: it may hold unsaved answers.
      return self.clients.openWindow(target);
    })(),
  );
});

// The browser rotated the subscription: re-link it with the same owners.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const old = event.oldSubscription;
      const sub =
        event.newSubscription ||
        (old && (await self.registration.pushManager.subscribe(old.options)));
      if (!sub) return;
      await fetch("/api/push/resubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          oldEndpoint: old ? old.endpoint : null,
          subscription: sub.toJSON(),
        }),
      });
    })(),
  );
});
