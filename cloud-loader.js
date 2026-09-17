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

  function carregarExperiencia() {
    carregarScript("dashboard-v2.js?v=1", "evoluafit-dashboard-v2");
    carregarScript("health-v3.js?v=1", "evoluafit-health-v3");
    carregarScript("food-v3.js?v=1", "evoluafit-food-v3");
    carregarScript("account-v3.js?v=1", "evoluafit-account-v3");
    carregarScript("third-wave-v4.js?v=1", "evoluafit-third-wave-v4");
    carregarScript("third-wave-goals-sync.js?v=1", "evoluafit-third-wave-goals-sync");
  }

  function carregarFotoRefeicao() {
    carregarScript("food-photo.js?v=3", "luma-food-photo-script");
  }

  function carregarBackupNativo() {
    carregarScript("native-backup.js?v=1", "evoluafit-native-backup");
  }

  function carregarIntegracaoFirebase() {
    carregarScript("firebase-cloud.js?v=2", "evoluafit-firebase-cloud", function () {
      carregarBackupNativo();
      setTimeout(dispararDOMContentLoadedExtra, 120);
      setTimeout(carregarFotoRefeicao, 250);
    });
  }

  function carregarFirestore() {
    carregarScript(
      "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore-compat.js",
      "evoluafit-firebase-firestore",
      carregarIntegracaoFirebase
    );
  }

  function carregarAuth() {
    carregarScript(
      "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth-compat.js",
      "evoluafit-firebase-auth",
      carregarFirestore
    );
  }

  function carregarFirebaseApp() {
    if (window.firebase && window.firebase.initializeApp) {
      carregarAuth();
      return;
    }

    carregarScript(
      "https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js",
      "evoluafit-firebase-app",
      carregarAuth
    );
  }

  carregarExperiencia();
  carregarScript("firebase-config.js?v=1", "evoluafit-firebase-config", carregarFirebaseApp);
})();
