const CACHE_NAME = "monitor-peso-v40-cloud";

const APP_FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./cloud-sync.js",
  "./manifest.json"
];

const CLOUD_SCRIPTS = `
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
  <script src="cloud-sync.js?v=1"></script>
`;

function injetarScriptsDaNuvem(html) {
  if (!html || html.includes("cloud-sync.js")) {
    return html;
  }

  if (html.includes("</body>")) {
    return html.replace("</body>", `${CLOUD_SCRIPTS}\n</body>`);
  }

  return `${html}\n${CLOUD_SCRIPTS}`;
}

function respostaHtml(html, responseOriginal) {
  const headers = new Headers(responseOriginal ? responseOriginal.headers : {});
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-cache");

  return new Response(injetarScriptsDaNuvem(html), {
    status: responseOriginal ? responseOriginal.status : 200,
    statusText: responseOriginal ? responseOriginal.statusText : "OK",
    headers
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.log("Erro ao instalar cache:", error);
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") {
    return;
  }

  if (url.hostname.includes("onrender.com") || url.hostname.includes("supabase.co")) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => response.text().then((html) => {
          const htmlFinal = injetarScriptsDaNuvem(html);

          caches.open(CACHE_NAME).then((cache) => {
            cache.put("./index.html", new Response(htmlFinal, {
              headers: {
                "Content-Type": "text/html; charset=utf-8"
              }
            }));
          });

          return respostaHtml(htmlFinal, response);
        }))
        .catch(() => caches.match("./index.html").then((cachedResponse) => {
          if (!cachedResponse) return caches.match("./index.html");
          return cachedResponse.text().then((html) => respostaHtml(html, cachedResponse));
        }))
    );

    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          const clone = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });

          return networkResponse;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const urlParaAbrir = data.url || "./index.html";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus();

          if ("navigate" in client) {
            return client.navigate(urlParaAbrir);
          }

          return;
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlParaAbrir);
      }
    })
  );
});

self.addEventListener("push", (event) => {
  let dados = {
    title: "🔔 Luma lembra você",
    body: "Você tem um lembrete da Luma.",
    tag: "luma-push",
    url: "./index.html"
  };

  if (event.data) {
    try {
      dados = {
        ...dados,
        ...event.data.json()
      };
    } catch (erro) {
      dados.body = event.data.text();
    }
  }

  const opcoes = {
    body: dados.body,
    tag: dados.tag || "luma-push",
    renotify: true,
    silent: false,
    data: {
      url: dados.url || "./index.html"
    }
  };

  event.waitUntil(
    self.registration.showNotification(dados.title, opcoes)
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("Notificação fechada:", event.notification.tag);
});

self.addEventListener("message", (event) => {
  const dados = event.data || {};

  if (dados.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (dados.type === "SHOW_NOTIFICATION") {
    const titulo = dados.title || "🔔 Luma lembra você";
    const mensagem = dados.body || "Você tem um lembrete da Luma.";

    self.registration.showNotification(titulo, {
      body: mensagem,
      tag: dados.tag || "luma-message",
      renotify: true,
      silent: false,
      data: {
        url: dados.url || "./index.html"
      }
    });
  }
});
