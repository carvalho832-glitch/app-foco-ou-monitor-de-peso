(function () {
  if (window.__lumaCloudLoaderStarted) return;
  window.__lumaCloudLoaderStarted = true;

  function carregarScript(src, id, callback) {
    if (id && document.getElementById(id)) {
      if (callback) callback();
      return;
    }

    const script = document.createElement("script");

    if (id) script.id = id;

    script.src = src;
    script.async = false;

    script.onload = function () {
      if (callback) callback();
    };

    script.onerror = function () {
      console.log("Erro ao carregar:", src);

      if (callback) callback();
    };

    document.body.appendChild(script);
  }

  function dispararDOMContentLoadedExtra() {
    try {
      document.dispatchEvent(new Event("DOMContentLoaded", {
        bubbles: true,
        cancelable: true
      }));
    } catch (erro) {
      const evento = document.createEvent("Event");
      evento.initEvent("DOMContentLoaded", true, true);
      document.dispatchEvent(evento);
    }
  }

  function carregarFotoRefeicao() {
    carregarScript("food-photo.js?v=3", "luma-food-photo-script");
  }

  function carregarCloudSync() {
    carregarScript("cloud-sync.js?v=2", "luma-cloud-sync-script", function () {
      setTimeout(dispararDOMContentLoadedExtra, 120);
      setTimeout(carregarFotoRefeicao, 250);
    });
  }

  if (window.supabase && window.supabase.createClient) {
    carregarCloudSync();
    return;
  }

  carregarScript(
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
    "luma-supabase-js",
    carregarCloudSync
  );
})();
