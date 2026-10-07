self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "דובה", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "דובה";
  const options = {
    body: data.body || "",
    icon: "/icon.png",
    badge: "/badge.png",
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    silent: Boolean(data.silent),
    dir: "rtl",
    lang: "he",
    data: { url: data.url || "/today" },
  };

  const badge =
    typeof data.badge === "number" && "setAppBadge" in self.navigator
      ? data.badge > 0
        ? self.navigator.setAppBadge(data.badge)
        : self.navigator.clearAppBadge()
      : Promise.resolve();

  event.waitUntil(Promise.all([self.registration.showNotification(title, options), badge.catch(() => {})]));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/today", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (!open) return self.clients.openWindow(target);
      const focused = await open.focus();
      if (focused && "navigate" in focused) return focused.navigate(target).catch(() => self.clients.openWindow(target));
      return undefined;
    }),
  );
});
