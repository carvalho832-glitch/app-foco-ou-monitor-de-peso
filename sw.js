const CACHE_NAME = "monitor-peso-v42-pwa-cloud";
const APP_FILES = ["./", "./index.html", "./style.css", "./menu-animated.css", "./script.js", "./cloud-sync.js", "./manifest.json", "./icon.svg"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(names => Promise.all(names.map(name => name !== CACHE_NAME ? caches.delete(name) : null))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.hostname.includes("onrender.com") || url.hostname.includes("supabase.co")) {
    event.respondWith(fetch(request));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    return response;
  }).catch(() => caches.match("./index.html"))));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const data = event.notification.data || {};
  const urlParaAbrir = data.url || "./index.html";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientList => {
    for (const client of clientList) {
      if ("focus" in client) {
        client.focus();
        if ("navigate" in client) return client.navigate(urlParaAbrir);
        return;
      }
    }
    if (clients.openWindow) return clients.openWindow(urlParaAbrir);
  }));
});

self.addEventListener("push", event => {
  let dados = { title: "Luma lembra você", body: "Você tem um lembrete da Luma.", tag: "luma-push", url: "./index.html" };
  if (event.data) {
    try { dados = { ...dados, ...event.data.json() }; } catch (erro) { dados.body = event.data.text(); }
  }
  event.waitUntil(self.registration.showNotification(dados.title, { body: dados.body, tag: dados.tag || "luma-push", renotify: true, silent: false, data: { url: dados.url || "./index.html" } }));
});

self.addEventListener("notificationclose", event => {
  console.log("Notificacao fechada:", event.notification.tag);
});

self.addEventListener("message", event => {
  const dados = event.data || {};
  if (dados.type === "SKIP_WAITING") self.skipWaiting();
  if (dados.type === "SHOW_NOTIFICATION") {
    self.registration.showNotification(dados.title || "Luma lembra você", { body: dados.body || "Você tem um lembrete da Luma.", tag: dados.tag || "luma-message", renotify: true, silent: false, data: { url: dados.url || "./index.html" } });
  }
});