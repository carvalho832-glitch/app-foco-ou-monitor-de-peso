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

  function carregarIntegracaoFirebase() {
    carregarScript("firebase-cloud.js?v=1", "evoluafit-firebase-cloud", function () {
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

  carregarScript("firebase-config.js?v=1", "evoluafit-firebase-config", carregarFirebaseApp);
})();
