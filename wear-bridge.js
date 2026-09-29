/* EvoluaFit - Galaxy Watch direct bridge prototype */
(function () {
  if (window.__evoluaWearBridgeStarted) return;
  window.__evoluaWearBridgeStarted = true;

  const STORAGE_KEY = "evoluafitWearSnapshot";
  let timer = null;

  function isAndroidNative() {
    try {
      const cap = window.Capacitor;
      if (!cap) return false;
      const platform = typeof cap.getPlatform === "function" ? cap.getPlatform() : cap.platform;
      return platform === "android" && (typeof cap.isNativePlatform !== "function" || cap.isNativePlatform());
    } catch (_) {
      return false;
    }
  }

  function filesystem() {
    try {
      return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem;
    } catch (_) {
      return null;
    }
  }

  function ensureCard() {
    if (!isAndroidNative() || document.getElementById("wearDirectCard")) return;
    const hc = document.getElementById("healthConnectCard");
    if (!hc) return;

    const wrap = document.createElement("div");
    wrap.id = "wearDirectCard";
    wrap.style.marginTop = "10px";
    wrap.style.padding = "10px 11px";
    wrap.style.border = "1px solid var(--border-color)";
    wrap.style.borderRadius = "14px";
    wrap.style.background = "rgba(37,99,235,.04)";
    wrap.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center">
        <strong style="font-size:12px">Galaxy Watch direto</strong>
        <span id="wearDirectStatus" style="font-size:9px;color:var(--text-muted)">Aguardando</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
        <div><div style="font-size:9px;color:var(--text-muted)">PASSOS</div><div id="wearDirectSteps" style="font-size:15px;font-weight:900">--</div></div>
        <div><div style="font-size:9px;color:var(--text-muted)">FC DIRETA</div><div id="wearDirectHeart" style="font-size:15px;font-weight:900">--</div></div>
      </div>
      <div id="wearDirectUpdated" style="margin-top:7px;font-size:9px;color:var(--text-muted)">Instale e abra o EvoluaFit Watch no relógio.</div>
    `;
    hc.appendChild(wrap);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function render(data) {
    ensureCard();
    if (!data) return;

    setText("wearDirectSteps", data.steps == null ? "--" : Number(data.steps).toLocaleString("pt-BR"));
    setText("wearDirectHeart", data.heartRate == null ? "--" : Math.round(Number(data.heartRate)) + " bpm");
    setText("wearDirectStatus", "Conectado ✓");

    const when = Number(data.receivedAt || data.watchTimestamp || 0);
    setText(
      "wearDirectUpdated",
      when
        ? "Recebido " + new Date(when).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        : "Dados recebidos do Galaxy Watch"
    );
  }

  async function readLatest() {
    if (!isAndroidNative()) return null;
    ensureCard();

    const fs = filesystem();
    if (!fs || !fs.readFile) {
      setText("wearDirectStatus", "Filesystem indisponível");
      return null;
    }

    try {
      const result = await fs.readFile({
        path: "wear/latest.json",
        directory: "DATA",
        encoding: "utf8"
      });

      const raw = typeof result.data === "string" ? result.data : "";
      if (!raw) return null;

      const data = JSON.parse(raw);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      render(data);
      document.dispatchEvent(new CustomEvent("evoluafit:wear-direct-updated", { detail: data }));
      return data;
    } catch (_) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const data = JSON.parse(saved);
          render(data);
          return data;
        } catch (_) {}
      }
      setText("wearDirectStatus", "Aguardando relógio");
      return null;
    }
  }

  function boot() {
    if (!isAndroidNative()) return;
    ensureCard();
    readLatest();
    if (timer) clearInterval(timer);
    timer = setInterval(readLatest, 5000);
    window.addEventListener("focus", readLatest);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) readLatest();
    });
  }

  window.EvoluaFitWearBridge = {
    refresh: readLatest,
    getSnapshot: function () {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      } catch (_) {
        return null;
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 900); });
  } else {
    setTimeout(boot, 900);
  }
})();
