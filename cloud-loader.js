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

  function carregarCloudSync() {
    carregarScript("cloud-sync.js?v=1", "luma-cloud-sync-script");
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