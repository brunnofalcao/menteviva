// Service Worker do PWA — recebe Web Push e exibe a notificação.
// O texto já vem tratado do servidor (modo discreto aplicado lá).

self.addEventListener("push", (event) => {
  let data = { title: "Mente Viva", body: "Um lembrete de cuidado." };
  try { data = event.data.json(); } catch (_e) { /* usa default */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [80, 40, 80],
      data: { url: "/app" },
      actions: [
        { action: "confirm", title: "Tomei" },
        { action: "snooze", title: "Adiar 30 min" },
      ],
    })
  );
});

// Confirmar dose a partir da própria notificação (fricção zero)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";
  if (event.action === "confirm") {
    event.waitUntil(fetch("/api/dose/confirm-latest", { method: "POST" }).catch(() => {}));
    return;
  }
  event.waitUntil(clients.openWindow(url));
});
