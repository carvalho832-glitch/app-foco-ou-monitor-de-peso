const CACHE_NAME = "monitor-peso-v60-luma-health-wording";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css?v=18",
  "./menu-animated.css?v=47",
  "./script.js?v=18",
  "./cloud-loader.js?v=5",
  "./dashboard-v2.js?v=1",
  "./health-v3.js?v=3",
  "./food-v3.js?v=1",
  "./account-v3.js?v=1",
  "./third-wave-v4.js?v=1",
  "./third-wave-goals-sync.js?v=1",
  "./third-wave-hotfix-v5.js?v=1",
  "./luma-medication-v7.js?v=1",
  "./firebase-config.js?v=1",
  "./firebase-cloud.js?v=2",
  "./native-backup.js?v=1",
  "./food-photo.js?v=3",
  "./manifest.json",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)).catch((error) => {
      console.log("Erro ao instalar cache:", error);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.map((cacheName) => {
        if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        return null;
      }));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET") return;

  if (
    url.hostname.includes("onrender.com") ||
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("firebaseio.com") ||
    url.hostname.includes("firebaseapp.com") ||
    url.hostname.includes("googleapis.com") ||
    url.hostname.includes("gstatic.com") ||
    url.hostname.includes("cdn.jsdelivr.net") ||
    url.hostname.includes("unpkg.com") ||
    url.hostname.includes("tile.openstreetmap.org")
  ) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request, { cache: "no-store" }).then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", clone));
        return response;
      }).catch(() => caches.match("./index.html"))
    );
    return;
  }

  if (
    url.pathname.endsWith("/menu-animated.css") ||
    url.pathname.endsWith("menu-animated.css") ||
    url.pathname.endsWith("/cloud-loader.js") ||
    url.pathname.endsWith("cloud-loader.js") ||
    url.pathname.endsWith("/dashboard-v2.js") ||
    url.pathname.endsWith("dashboard-v2.js") ||
    url.pathname.endsWith("/health-v3.js") ||
    url.pathname.endsWith("health-v3.js") ||
    url.pathname.endsWith("/food-v3.js") ||
    url.pathname.endsWith("food-v3.js") ||
    url.pathname.endsWith("/account-v3.js") ||
    url.pathname.endsWith("account-v3.js") ||
    url.pathname.endsWith("/third-wave-v4.js") ||
    url.pathname.endsWith("third-wave-v4.js") ||
    url.pathname.endsWith("/third-wave-goals-sync.js") ||
    url.pathname.endsWith("third-wave-goals-sync.js") ||
    url.pathname.endsWith("/third-wave-hotfix-v5.js") ||
    url.pathname.endsWith("third-wave-hotfix-v5.js") ||
    url.pathname.endsWith("/luma-medication-v7.js") ||
    url.pathname.endsWith("luma-medication-v7.js") ||
    url.pathname.endsWith("/firebase-config.js") ||
    url.pathname.endsWith("firebase-config.js") ||
    url.pathname.endsWith("/firebase-cloud.js") ||
    url.pathname.endsWith("firebase-cloud.js") ||
    url.pathname.endsWith("/native-backup.js") ||
    url.pathname.endsWith("native-backup.js") ||
    url.pathname.endsWith("/food-photo.js") ||
    url.pathname.endsWith("food-photo.js")
  ) {
    event.respondWith(
      fetch(request, { cache: "no-store" }).then((networkResponse) => {
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return networkResponse;
      }).catch(() => caches.match(request))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then((networkResponse) => {
        const clone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        return networkResponse;
      }).catch(() => caches.match("./index.html"));
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const urlParaAbrir = data.url || "./index.html";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();
          if ("navigate" in client) return client.navigate(urlParaAbrir);
          return null;
        }
      }
      if (clients.openWindow) return clients.openWindow(urlParaAbrir);
      return null;
    })
  );
});

self.addEventListener("push", (event) => {
  let dados = {
    title: "Luma lembra você",
    body: "Você tem um lembrete da Luma.",
    tag: "luma-push",
    url: "./index.html"
  };
  if (event.data) {
    try { dados = { ...dados, ...event.data.json() }; }
    catch (erro) { dados.body = event.data.text(); }
  }
  event.waitUntil(
    self.registration.showNotification(dados.title, {
      body: dados.body,
      tag: dados.tag || "luma-push",
      renotify: true,
      silent: false,
      data: { url: dados.url || "./index.html" }
    })
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("Notificacao fechada:", event.notification.tag);
});

self.addEventListener("message", (event) => {
  const dados = event.data || {};
  if (dados.type === "SKIP_WAITING") self.skipWaiting();
  if (dados.type === "SHOW_NOTIFICATION") {
    const titulo = dados.title || "Luma lembra você";
    const mensagem = dados.body || "Você tem um lembrete da Luma.";
    self.registration.showNotification(titulo, {
      body: mensagem,
      tag: dados.tag || "luma-message",
      renotify: true,
      silent: false,
      data: { url: dados.url || "./index.html" }
    });
  }
});
