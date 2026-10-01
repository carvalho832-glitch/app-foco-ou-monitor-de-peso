/* EvoluaFit - Health Connect / Samsung Health */
(function () {
  if (window.__evoluaHealthConnectStarted) return;
  window.__evoluaHealthConnectStarted = true;

  const STORAGE_KEY = "evoluafitHealthConnectSnapshot";
  const READ_TYPES = [
    "steps",
    "distance",
    "calories",
    "heartRate",
    "weight",
    "sleep",
    "oxygenSaturation",
    "restingHeartRate",
    "workouts"
  ];

  let healthPlugin = null;
  let refreshing = false;
  let diagnosing = false;
  let lastDiagnosticReport = null;

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

  function getHealthPlugin() {
    if (healthPlugin) return healthPlugin;
    const cap = window.Capacitor;
    if (!cap) return null;

    if (cap.Plugins && cap.Plugins.Health) {
      healthPlugin = cap.Plugins.Health;
      return healthPlugin;
    }

    if (typeof cap.registerPlugin === "function") {
      try {
        healthPlugin = cap.registerPlugin("Health");
        return healthPlugin;
      } catch (_) {}
    }

    return null;
  }

  function parseStoredSnapshot() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (_) {
      return null;
    }
  }

  function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function round(value, digits) {
    const n = safeNumber(value);
    if (n == null) return null;
    const f = Math.pow(10, digits || 0);
    return Math.round(n * f) / f;
  }

  function latestSample(samples) {
    if (!Array.isArray(samples) || !samples.length) return null;
    return samples.slice().sort((a, b) => {
      const da = new Date(a.endDate || a.startDate || 0).getTime();
      const db = new Date(b.endDate || b.startDate || 0).getTime();
      return db - da;
    })[0] || null;
  }

  function longestSample(samples) {
    if (!Array.isArray(samples) || !samples.length) return null;
    return samples.slice().sort((a, b) => Number(b.value || 0) - Number(a.value || 0))[0] || null;
  }

  async function aggregate(health, dataType, startDate, endDate, aggregation) {
    try {
      const result = await health.queryAggregated({
        dataType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        bucket: "day",
        aggregation: aggregation || "sum"
      });
      const samples = result && Array.isArray(result.samples) ? result.samples : [];
      if (!samples.length) return null;

      if (Array.isArray(aggregation)) {
        return samples[0].values || null;
      }

      return samples.reduce((total, item) => total + Number(item.value || 0), 0);
    } catch (error) {
      console.warn("[Health Connect] aggregate", dataType, error);
      return null;
    }
  }

  async function readLatest(health, dataType, startDate, endDate, useLongest) {
    try {
      const result = await health.readSamples({
        dataType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 200
      });
      const samples = result && Array.isArray(result.samples) ? result.samples : [];
      return useLongest ? longestSample(samples) : latestSample(samples);
    } catch (error) {
      console.warn("[Health Connect] read", dataType, error);
      return null;
    }
  }

  function isSamsungHealthSample(sample) {
    if (!sample) return false;
    const sourceId = String(sample.sourceId || "").toLowerCase();
    const sourceName = String(sample.sourceName || "").toLowerCase();
    return sourceId.includes("com.sec.android.app.shealth") ||
      sourceName.includes("com.sec.android.app.shealth") ||
      sourceName === "samsung health";
  }

  async function readRawSamples(health, dataType, startDate, endDate, limit) {
    try {
      const result = await health.readSamples({
        dataType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: limit || 2000
      });
      return result && Array.isArray(result.samples) ? result.samples : [];
    } catch (error) {
      console.warn("[Health Connect] raw samples", dataType, error);
      return [];
    }
  }

  function samsungHealthMetricValue(samples) {
    const samsung = (samples || []).filter(isSamsungHealthSample).filter((sample) => safeNumber(sample.value) != null);
    if (!samsung.length) return null;

    const dailyLike = samsung.filter((sample) => {
      const start = new Date(sample.startDate || 0).getTime();
      const end = new Date(sample.endDate || 0).getTime();
      return start && end && end > start && (end - start) >= 20 * 60 * 60 * 1000;
    });

    if (dailyLike.length) {
      return Math.max(...dailyLike.map((sample) => Number(sample.value)));
    }

    return samsung.reduce((total, sample) => total + Number(sample.value || 0), 0);
  }

  async function readWorkouts(health, startDate, endDate) {
    try {
      const result = await health.queryWorkouts({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 50
      });
      return result && Array.isArray(result.workouts) ? result.workouts : [];
    } catch (error) {
      console.warn("[Health Connect] workouts", error);
      return [];
    }
  }

  function workoutMinutes(items) {
    return Math.round((items || []).reduce((total, item) => {
      const start = new Date(item.startDate || item.startTime || 0).getTime();
      const end = new Date(item.endDate || item.endTime || 0).getTime();
      if (start && end && end > start) return total + ((end - start) / 60000);
      const durationMinutes = Number(item.durationMinutes || 0);
      if (Number.isFinite(durationMinutes) && durationMinutes > 0) {
        return total + durationMinutes;
      }
      const durationSeconds = Number(item.duration || 0);
      return total + (Number.isFinite(durationSeconds) ? durationSeconds / 60 : 0);
    }, 0));
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function formatDuration(minutes) {
    const value = Math.max(0, Math.round(Number(minutes || 0)));
    if (!value) return "--";
    const h = Math.floor(value / 60);
    const m = value % 60;
    return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`;
  }

  function updateCard(snapshot) {
    if (!snapshot) return;
    const distanceMissing = snapshot.distanceSyncStatus === "not_shared_by_samsung_health";
    const caloriesMissing = snapshot.caloriesSyncStatus === "not_shared_by_samsung_health";

    setText("hcSteps", snapshot.steps == null ? "--" : Number(snapshot.steps).toLocaleString("pt-BR"));
    setText("hcDistance", distanceMissing ? "Não sinc." : (snapshot.distanceKm == null ? "--" : `${snapshot.distanceKm.toFixed(2)} km`));
    setText("hcCalories", caloriesMissing ? "Não sinc." : (snapshot.activeCaloriesKcal == null ? "--" : `${Math.round(snapshot.activeCaloriesKcal)} kcal`));
    setText("hcHeart", snapshot.heartRateAvg == null ? "--" : `${Math.round(snapshot.heartRateAvg)} bpm`);
    setText("hcRestingHr", snapshot.restingHeartRate == null ? "--" : `${Math.round(snapshot.restingHeartRate)} bpm`);
    setText("hcWeight", snapshot.weightKg == null ? "--" : `${snapshot.weightKg.toFixed(1)} kg`);
    setText("hcSleep", snapshot.sleepMinutes == null ? "--" : formatDuration(snapshot.sleepMinutes));
    setText("hcSpo2", snapshot.oxygenSaturationPct == null ? "--" : `${Math.round(snapshot.oxygenSaturationPct)}%`);
    setText("hcWorkout", snapshot.workoutsToday == null ? "--" : `${snapshot.workoutsToday} • ${formatDuration(snapshot.workoutMinutesToday)}`);
    setText("hcUpdated", snapshot.updatedAt ? `Atualizado ${new Date(snapshot.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "");

    const notes = [];
    if (snapshot.stepsSource === "samsung_health") notes.push("Passos: Samsung Health");
    if (distanceMissing) notes.push("Distância não compartilhada pelo Samsung Health");
    if (caloriesMissing) notes.push("Calorias ativas não compartilhadas pelo Samsung Health");
    setText("hcSourceNote", notes.join(" • "));

    const connectBtn = document.getElementById("hcConnectBtn");
    if (connectBtn && snapshot.updatedAt) {
      connectBtn.textContent = "Conectado ✓";
      connectBtn.disabled = true;
    }
  }

  function setStatus(text, kind) {
    const el = document.getElementById("hcStatus");
    if (!el) return;
    el.textContent = text;
    el.className = "hc-status " + (kind || "neutral");
  }

  function injectStyles() {
    if (document.getElementById("hcStyles")) return;
    const style = document.createElement("style");
    style.id = "hcStyles";
    style.textContent = `
      .hc-card{margin:0 0 12px;padding:14px;border:1px solid var(--border-color);border-radius:18px;background:var(--card-bg)}
      .hc-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:11px}.hc-head strong{font-size:15px}.hc-head small{display:block;margin-top:3px;color:var(--text-muted);font-size:10px;line-height:1.35}
      .hc-status{padding:6px 9px;border-radius:999px;font-size:10px;font-weight:900;white-space:nowrap}.hc-status.ok{background:rgba(16,185,129,.12);color:#047857}.hc-status.warn{background:rgba(245,158,11,.12);color:#b45309}.hc-status.error{background:rgba(239,68,68,.12);color:#b91c1c}.hc-status.neutral{background:rgba(100,116,139,.11);color:var(--text-muted)}
      .hc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.hc-item{position:relative;padding:10px 11px;border:1px solid var(--border-color);border-radius:14px;background:rgba(148,163,184,.045);cursor:pointer;transition:transform .15s ease,background .15s ease}.hc-item:active{transform:scale(.98);background:rgba(37,99,235,.09)}.hc-item[data-hc-detail]::after{content:"›";position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:20px;color:var(--text-muted);opacity:.55}.hc-label{font-size:9px;font-weight:850;text-transform:uppercase;color:var(--text-muted);padding-right:14px}.hc-value{margin-top:4px;font-size:16px;font-weight:900;line-height:1.15;padding-right:12px}
      .hc-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}.hc-btn{flex:1;min-width:110px;min-height:38px;border:0;border-radius:12px;padding:8px 10px;font-size:11px;font-weight:850}.hc-btn.primary{background:#2563eb;color:#fff}.hc-btn.secondary{background:rgba(37,99,235,.09);color:#2563eb;border:1px solid rgba(37,99,235,.16)}
      .hc-foot{margin-top:9px;color:var(--text-muted);font-size:9.5px;line-height:1.4}
      .hc-diagnostic{display:none;margin-top:12px;padding:12px;border:1px dashed rgba(37,99,235,.28);border-radius:14px;background:rgba(37,99,235,.035)}
      .hc-diagnostic.open{display:block}.hc-diagnostic h4{margin:0 0 5px;font-size:13px}.hc-diagnostic-note{font-size:9.5px;color:var(--text-muted);line-height:1.45;margin-bottom:10px}
      .hc-diag-block{margin-top:9px;padding:9px 10px;border-radius:12px;background:var(--card-bg);border:1px solid var(--border-color)}
      .hc-diag-title{font-size:11px;font-weight:900;margin-bottom:6px}.hc-diag-row{display:flex;justify-content:space-between;gap:10px;font-size:9.5px;line-height:1.5;padding:2px 0}.hc-diag-row span:first-child{color:var(--text-muted)}.hc-diag-row strong{text-align:right;overflow-wrap:anywhere}
      .hc-diag-source{margin-top:6px;padding-top:6px;border-top:1px solid var(--border-color);font-size:9px;color:var(--text-muted);line-height:1.5;overflow-wrap:anywhere}
      .hc-diag-actions{display:flex;gap:7px;margin-top:10px}.hc-diag-actions button{flex:1}
      .hc-detail-page{position:fixed;inset:0;z-index:99999;background:var(--body-bg,#071426);color:var(--text-color,#fff);overflow:auto;padding:0 0 32px;display:none}.hc-detail-page.open{display:block}.hc-detail-top{position:sticky;top:0;z-index:2;display:flex;align-items:center;gap:12px;padding:16px 18px;background:rgba(7,20,38,.94);backdrop-filter:blur(14px);border-bottom:1px solid var(--border-color)}.hc-detail-back{width:38px;height:38px;border:0;border-radius:12px;background:rgba(148,163,184,.1);color:inherit;font-size:24px}.hc-detail-title{font-size:18px;font-weight:900}.hc-detail-sub{font-size:10px;color:var(--text-muted);margin-top:2px}.hc-detail-body{padding:16px}.hc-detail-hero{padding:18px;border-radius:20px;background:linear-gradient(135deg,rgba(37,99,235,.22),rgba(139,92,246,.12));border:1px solid rgba(96,165,250,.25)}.hc-detail-hero-label{font-size:10px;text-transform:uppercase;font-weight:850;color:var(--text-muted)}.hc-detail-hero-value{font-size:38px;font-weight:950;line-height:1.1;margin-top:7px}.hc-detail-hero-note{font-size:10px;color:var(--text-muted);margin-top:8px}.hc-detail-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.hc-detail-stat{padding:12px 9px;border:1px solid var(--border-color);border-radius:15px;background:var(--card-bg)}.hc-detail-stat span{display:block;font-size:9px;color:var(--text-muted);text-transform:uppercase;font-weight:800}.hc-detail-stat strong{display:block;margin-top:5px;font-size:15px}.hc-detail-section{margin-top:14px;padding:15px;border:1px solid var(--border-color);border-radius:18px;background:var(--card-bg)}.hc-detail-section h3{margin:0 0 11px;font-size:14px}.hc-detail-chart{width:100%;height:130px;display:block}.hc-detail-empty{font-size:11px;color:var(--text-muted);line-height:1.5}.hc-detail-list{display:flex;flex-direction:column;gap:8px}.hc-detail-row{display:flex;justify-content:space-between;gap:14px;padding:9px 0;border-bottom:1px solid var(--border-color);font-size:11px}.hc-detail-row:last-child{border-bottom:0}.hc-detail-row span{color:var(--text-muted)}.hc-detail-row strong{text-align:right}.hc-detail-loading{padding:32px;text-align:center;color:var(--text-muted);font-size:12px}
    `;
    document.head.appendChild(style);
  }

  function injectCard() {
    if (!isAndroidNative() || document.getElementById("healthConnectCard")) return;
    const aba = document.getElementById("aba-dashboard");
    if (!aba) return;

    injectStyles();
    const card = document.createElement("section");
    card.id = "healthConnectCard";
    card.className = "hc-card";
    card.innerHTML = `
      <div class="hc-head">
        <div><strong>Samsung Health / Health Connect</strong><small>Atividade e saúde sincronizadas do celular e Galaxy Watch</small></div>
        <span id="hcStatus" class="hc-status neutral">Verificando</span>
      </div>
      <div class="hc-grid">
        <div class="hc-item" data-hc-detail="steps"><div class="hc-label">Passos hoje</div><div id="hcSteps" class="hc-value">--</div></div>
        <div class="hc-item" data-hc-detail="distance"><div class="hc-label">Distância</div><div id="hcDistance" class="hc-value">--</div></div>
        <div class="hc-item" data-hc-detail="calories"><div class="hc-label">Calorias ativas</div><div id="hcCalories" class="hc-value">--</div></div>
        <div class="hc-item" data-hc-detail="heart"><div class="hc-label">FC média</div><div id="hcHeart" class="hc-value">--</div></div>
        <div class="hc-item" data-hc-detail="restingHeart"><div class="hc-label">FC repouso</div><div id="hcRestingHr" class="hc-value">--</div></div>
        <div class="hc-item" data-hc-detail="weight"><div class="hc-label">Peso recente</div><div id="hcWeight" class="hc-value">--</div></div>
        <div class="hc-item" data-hc-detail="sleep"><div class="hc-label">Sono</div><div id="hcSleep" class="hc-value">--</div></div>
        <div class="hc-item" data-hc-detail="spo2"><div class="hc-label">SpO₂</div><div id="hcSpo2" class="hc-value">--</div></div>
        <div class="hc-item" data-hc-detail="workouts"><div class="hc-label">Treinos hoje</div><div id="hcWorkout" class="hc-value">--</div></div>
      </div>
      <div class="hc-actions">
        <button id="hcConnectBtn" class="hc-btn primary" type="button">Conectar dados de saúde</button>
        <button id="hcRefreshBtn" class="hc-btn secondary" type="button">Atualizar</button>
        <button id="hcSettingsBtn" class="hc-btn secondary" type="button">Permissões</button>
        <button id="hcDiagnosticBtn" class="hc-btn secondary" type="button">Diagnóstico</button>
      </div>
      <div id="hcDiagnosticPanel" class="hc-diagnostic">
        <h4>Diagnóstico do Health Connect</h4>
        <div class="hc-diagnostic-note">Compara o valor agregado com as amostras brutas e mostra origem, dispositivo e horário dos registros. Nada é enviado para fora do aparelho.</div>
        <div id="hcDiagnosticContent">Toque em Diagnóstico para analisar os dados de hoje.</div>
        <div class="hc-diag-actions">
          <button id="hcCopyDiagnosticBtn" class="hc-btn secondary" type="button">Copiar relatório</button>
        </div>
      </div>
      <div id="hcUpdated" class="hc-foot"></div>
      <div id="hcSourceNote" class="hc-foot"></div>
      <div class="hc-foot">No Samsung Health, mantenha a sincronização com Health Connect habilitada. O EvoluaFit solicita somente leitura.</div>
    `;

    const destaque = aba.querySelector(".card-highlight");
    if (destaque) destaque.insertAdjacentElement("afterend", card);
    else {
      const header = aba.querySelector("header");
      if (header) header.insertAdjacentElement("afterend", card);
      else aba.prepend(card);
    }

    document.getElementById("hcConnectBtn").addEventListener("click", connect);
    document.getElementById("hcRefreshBtn").addEventListener("click", refresh);
    document.getElementById("hcSettingsBtn").addEventListener("click", openSettings);
    document.getElementById("hcDiagnosticBtn").addEventListener("click", runDiagnostics);
    document.getElementById("hcCopyDiagnosticBtn").addEventListener("click", copyDiagnosticReport);
    card.querySelectorAll("[data-hc-detail]").forEach(function (item) {
      item.addEventListener("click", function () {
        openHealthDetail(item.getAttribute("data-hc-detail"));
      });
    });

    const saved = parseStoredSnapshot();
    if (saved) updateCard(saved);
  }



  const DETAIL_CONFIG = {
    steps: { title: "Passos", type: "steps", days: 7, unit: "passos" },
    distance: { title: "Distância", type: "distance", days: 7, unit: "km" },
    calories: { title: "Calorias ativas", type: "calories", days: 7, unit: "kcal" },
    heart: { title: "Frequência cardíaca", type: "heartRate", days: 1, unit: "bpm" },
    restingHeart: { title: "Frequência cardíaca em repouso", type: "restingHeartRate", days: 30, unit: "bpm" },
    weight: { title: "Peso", type: "weight", days: 30, unit: "kg" },
    sleep: { title: "Sono", type: "sleep", days: 7, unit: "min" },
    spo2: { title: "Oxigênio no sangue", type: "oxygenSaturation", days: 7, unit: "%" },
    workouts: { title: "Treinos", type: "workouts", days: 7, unit: "" }
  };

  function ensureDetailPage() {
    let page = document.getElementById("hcDetailPage");
    if (page) return page;
    page = document.createElement("section");
    page.id = "hcDetailPage";
    page.className = "hc-detail-page";
    page.innerHTML = '<div class="hc-detail-top">' +
      '<button id="hcDetailBack" class="hc-detail-back" type="button" aria-label="Voltar">‹</button>' +
      '<div><div id="hcDetailTitle" class="hc-detail-title">Saúde</div><div class="hc-detail-sub">Samsung Health • Health Connect</div></div>' +
      '</div><div id="hcDetailBody" class="hc-detail-body"><div class="hc-detail-loading">Carregando dados...</div></div>';
    document.body.appendChild(page);
    document.getElementById("hcDetailBack").addEventListener("click", closeHealthDetail);
    return page;
  }

  function closeHealthDetail() {
    const page = document.getElementById("hcDetailPage");
    if (page) page.classList.remove("open");
    document.body.style.overflow = "";
  }

  function detailHeroValue(key, snapshot) {
    if (!snapshot) return "--";
    if (key === "steps") return snapshot.steps == null ? "--" : Number(snapshot.steps).toLocaleString("pt-BR");
    if (key === "distance") return snapshot.distanceKm == null ? "--" : snapshot.distanceKm.toFixed(2) + " km";
    if (key === "calories") return snapshot.activeCaloriesKcal == null ? "--" : Math.round(snapshot.activeCaloriesKcal) + " kcal";
    if (key === "heart") return snapshot.heartRateAvg == null ? "--" : Math.round(snapshot.heartRateAvg) + " bpm";
    if (key === "restingHeart") return snapshot.restingHeartRate == null ? "--" : Math.round(snapshot.restingHeartRate) + " bpm";
    if (key === "weight") return snapshot.weightKg == null ? "--" : snapshot.weightKg.toFixed(1) + " kg";
    if (key === "sleep") return snapshot.sleepMinutes == null ? "--" : formatDuration(snapshot.sleepMinutes);
    if (key === "spo2") return snapshot.oxygenSaturationPct == null ? "--" : Math.round(snapshot.oxygenSaturationPct) + "%";
    if (key === "workouts") return snapshot.workoutsToday == null ? "--" : snapshot.workoutsToday + " • " + formatDuration(snapshot.workoutMinutesToday);
    return "--";
  }

  function sampleNumericValue(sample, key) {
    if (!sample) return null;
    const n = safeNumber(sample.value);
    if (n == null) return null;
    if (key === "distance") return n / 1000;
    return n;
  }

  function formatDetailValue(key, value) {
    const n = safeNumber(value);
    if (n == null) return "--";
    if (key === "steps") return Math.round(n).toLocaleString("pt-BR") + " passos";
    if (key === "distance") return n.toFixed(2) + " km";
    if (key === "calories") return Math.round(n) + " kcal";
    if (key === "heart" || key === "restingHeart") return Math.round(n) + " bpm";
    if (key === "weight") return n.toFixed(1) + " kg";
    if (key === "sleep") return formatDuration(n);
    if (key === "spo2") return Math.round(n) + "%";
    return String(n);
  }

  function formatDetailDate(value, withDate) {
    if (!value) return "--";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "--";
    return d.toLocaleString("pt-BR", withDate
      ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }
      : { hour: "2-digit", minute: "2-digit" });
  }

  function buildSparkline(values) {
    const nums = values.map(safeNumber).filter((n) => n != null);
    if (nums.length < 2) return '<div class="hc-detail-empty">Ainda não há pontos suficientes para montar o gráfico.</div>';
    const w = 320, h = 120, pad = 10;
    const min = Math.min.apply(null, nums);
    const max = Math.max.apply(null, nums);
    const span = Math.max(1, max - min);
    const points = nums.map(function (v, i) {
      const x = pad + (i * (w - pad * 2) / Math.max(1, nums.length - 1));
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    return '<svg class="hc-detail-chart" viewBox="0 0 320 120" preserveAspectRatio="none" aria-label="Gráfico">' +
      '<line x1="10" y1="110" x2="310" y2="110" stroke="currentColor" opacity=".12"/>' +
      '<polyline points="' + points + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';
  }

  function statsFromValues(values) {
    const nums = values.map(safeNumber).filter((n) => n != null);
    if (!nums.length) return null;
    const total = nums.reduce((a, b) => a + b, 0);
    return {
      min: Math.min.apply(null, nums),
      max: Math.max.apply(null, nums),
      avg: total / nums.length
    };
  }

  async function readDetailSamples(health, cfg) {
    const end = new Date();
    const start = new Date(end.getTime() - cfg.days * 24 * 60 * 60 * 1000);
    if (cfg.type === "workouts") {
      return readWorkouts(health, start, end);
    }
    return readRawSamples(health, cfg.type, start, end, 1200);
  }

  async function readDailyDetailSeries(health, cfg) {
    if (!["steps", "distance", "calories"].includes(cfg.type)) return [];
    const end = new Date();
    const start = new Date(end.getTime() - cfg.days * 24 * 60 * 60 * 1000);
    try {
      const result = await health.queryAggregated({
        dataType: cfg.type,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        bucket: "day",
        aggregation: "sum"
      });
      return result && Array.isArray(result.samples) ? result.samples : [];
    } catch (_) {
      return [];
    }
  }

  function renderSleepDetail(samples, snapshot) {
    const valid = samples.filter((x) => safeNumber(x.value) != null).sort((a, b) => new Date(b.endDate || b.startDate || 0) - new Date(a.endDate || a.startDate || 0));
    const values = valid.slice().reverse().map((x) => safeNumber(x.value));
    const stats = statsFromValues(values);
    const latest = valid[0];
    const rows = valid.slice(0, 7).map(function (x) {
      const when = x.startDate ? new Date(x.startDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "Registro";
      const interval = (x.startDate && x.endDate) ? formatDetailDate(x.startDate, false) + " – " + formatDetailDate(x.endDate, false) : "";
      return '<div class="hc-detail-row"><span>' + escapeHtml(when + (interval ? " • " + interval : "")) + '</span><strong>' + escapeHtml(formatDuration(x.value)) + '</strong></div>';
    }).join("");
    return '<div class="hc-detail-hero"><div class="hc-detail-hero-label">Sono mais recente</div><div class="hc-detail-hero-value">' + escapeHtml(detailHeroValue("sleep", snapshot)) + '</div>' +
      '<div class="hc-detail-hero-note">' + (latest && latest.startDate && latest.endDate ? escapeHtml("Registro " + formatDetailDate(latest.startDate, true) + " até " + formatDetailDate(latest.endDate, true)) : "Dados lidos do Health Connect") + '</div></div>' +
      '<div class="hc-detail-stats"><div class="hc-detail-stat"><span>Média</span><strong>' + (stats ? escapeHtml(formatDuration(stats.avg)) : "--") + '</strong></div>' +
      '<div class="hc-detail-stat"><span>Menor</span><strong>' + (stats ? escapeHtml(formatDuration(stats.min)) : "--") + '</strong></div>' +
      '<div class="hc-detail-stat"><span>Maior</span><strong>' + (stats ? escapeHtml(formatDuration(stats.max)) : "--") + '</strong></div></div>' +
      '<div class="hc-detail-section"><h3>Últimas noites</h3>' + buildSparkline(values) + '</div>' +
      '<div class="hc-detail-section"><h3>Histórico recebido</h3><div class="hc-detail-list">' + (rows || '<div class="hc-detail-empty">Nenhum registro detalhado de sono foi disponibilizado.</div>') + '</div></div>' +
      '<div class="hc-detail-section"><h3>Fases do sono</h3><div class="hc-detail-empty">O EvoluaFit mostra apenas as fases que o Health Connect entregar. Se o Samsung Health não compartilhar sono REM, profundo, leve e acordado como registros separados, o app não inventa esses dados.</div></div>';
  }

  function renderHeartDetail(samples, snapshot, key) {
    const valid = samples.filter((x) => sampleNumericValue(x, key) != null).sort((a, b) => new Date(a.endDate || a.startDate || 0) - new Date(b.endDate || b.startDate || 0));
    const values = valid.map((x) => sampleNumericValue(x, key));
    const stats = statsFromValues(values);
    const rows = valid.slice(-12).reverse().map(function (x) {
      return '<div class="hc-detail-row"><span>' + escapeHtml(formatDetailDate(x.endDate || x.startDate, true)) + '</span><strong>' + escapeHtml(formatDetailValue(key, sampleNumericValue(x, key))) + '</strong></div>';
    }).join("");
    const hero = detailHeroValue(key, snapshot);
    const snapMin = key === "heart" ? snapshot && snapshot.heartRateMin : null;
    const snapMax = key === "heart" ? snapshot && snapshot.heartRateMax : null;
    return '<div class="hc-detail-hero"><div class="hc-detail-hero-label">' + (key === "heart" ? "Média de hoje" : "Registro mais recente") + '</div><div class="hc-detail-hero-value">' + escapeHtml(hero) + '</div><div class="hc-detail-hero-note">Dados recebidos do Health Connect</div></div>' +
      '<div class="hc-detail-stats"><div class="hc-detail-stat"><span>Mínima</span><strong>' + escapeHtml(formatDetailValue(key, snapMin != null ? snapMin : stats && stats.min)) + '</strong></div>' +
      '<div class="hc-detail-stat"><span>Média</span><strong>' + escapeHtml(formatDetailValue(key, stats && stats.avg)) + '</strong></div>' +
      '<div class="hc-detail-stat"><span>Máxima</span><strong>' + escapeHtml(formatDetailValue(key, snapMax != null ? snapMax : stats && stats.max)) + '</strong></div></div>' +
      '<div class="hc-detail-section"><h3>Variação</h3>' + buildSparkline(values.slice(-80)) + '</div>' +
      '<div class="hc-detail-section"><h3>Leituras recentes</h3><div class="hc-detail-list">' + (rows || '<div class="hc-detail-empty">Nenhuma leitura detalhada disponível.</div>') + '</div></div>';
  }

  function renderGenericDetail(key, cfg, samples, daily, snapshot) {
    const source = daily.length ? daily : samples;
    const values = source.map((x) => sampleNumericValue(x, key)).filter((n) => n != null);
    const stats = statsFromValues(values);
    const sorted = samples.slice().sort((a, b) => new Date(b.endDate || b.startDate || 0) - new Date(a.endDate || a.startDate || 0));
    const rows = sorted.slice(0, 12).map(function (x) {
      const value = sampleNumericValue(x, key);
      if (value == null) return "";
      return '<div class="hc-detail-row"><span>' + escapeHtml(formatDetailDate(x.endDate || x.startDate, true)) + '</span><strong>' + escapeHtml(formatDetailValue(key, value)) + '</strong></div>';
    }).join("");
    return '<div class="hc-detail-hero"><div class="hc-detail-hero-label">Valor atual</div><div class="hc-detail-hero-value">' + escapeHtml(detailHeroValue(key, snapshot)) + '</div><div class="hc-detail-hero-note">Sincronizado pelo Health Connect</div></div>' +
      '<div class="hc-detail-stats"><div class="hc-detail-stat"><span>Mínimo</span><strong>' + escapeHtml(formatDetailValue(key, stats && stats.min)) + '</strong></div><div class="hc-detail-stat"><span>Média</span><strong>' + escapeHtml(formatDetailValue(key, stats && stats.avg)) + '</strong></div><div class="hc-detail-stat"><span>Máximo</span><strong>' + escapeHtml(formatDetailValue(key, stats && stats.max)) + '</strong></div></div>' +
      '<div class="hc-detail-section"><h3>Evolução</h3>' + buildSparkline(values) + '</div><div class="hc-detail-section"><h3>Registros</h3><div class="hc-detail-list">' + (rows || '<div class="hc-detail-empty">Nenhum registro detalhado disponível para este item.</div>') + '</div></div>';
  }

  function renderWorkoutDetail(samples, snapshot) {
    const rows = samples.slice().sort((a, b) => new Date(b.endDate || b.startDate || 0) - new Date(a.endDate || a.startDate || 0)).slice(0, 12).map(function (x) {
      const mins = safeNumber(x.duration) != null ? Math.round(Number(x.duration) / 60) : null;
      const name = x.workoutType || x.activityType || x.type || "Treino";
      return '<div class="hc-detail-row"><span>' + escapeHtml(String(name) + " • " + formatDetailDate(x.startDate, true)) + '</span><strong>' + escapeHtml(mins == null ? "--" : formatDuration(mins)) + '</strong></div>';
    }).join("");
    return '<div class="hc-detail-hero"><div class="hc-detail-hero-label">Treinos de hoje</div><div class="hc-detail-hero-value">' + escapeHtml(detailHeroValue("workouts", snapshot)) + '</div><div class="hc-detail-hero-note">Sessões recebidas do Health Connect</div></div>' +
      '<div class="hc-detail-section"><h3>Treinos recentes</h3><div class="hc-detail-list">' + (rows || '<div class="hc-detail-empty">Nenhum treino detalhado disponível.</div>') + '</div></div>';
  }

  async function openHealthDetail(key) {
    const cfg = DETAIL_CONFIG[key];
    if (!cfg) return;
    const page = ensureDetailPage();
    const title = document.getElementById("hcDetailTitle");
    const body = document.getElementById("hcDetailBody");
    if (title) title.textContent = cfg.title;
    if (body) body.innerHTML = '<div class="hc-detail-loading">Lendo dados do Health Connect...</div>';
    page.classList.add("open");
    document.body.style.overflow = "hidden";

    const health = getHealthPlugin();
    const snapshot = parseStoredSnapshot();
    if (!health) {
      body.innerHTML = '<div class="hc-detail-section"><div class="hc-detail-empty">Health Connect indisponível neste aparelho.</div></div>';
      return;
    }

    try {
      const [samples, daily] = await Promise.all([
        readDetailSamples(health, cfg),
        readDailyDetailSeries(health, cfg)
      ]);
      if (key === "sleep") body.innerHTML = renderSleepDetail(samples, snapshot);
      else if (key === "heart" || key === "restingHeart") body.innerHTML = renderHeartDetail(samples, snapshot, key);
      else if (key === "workouts") body.innerHTML = renderWorkoutDetail(samples, snapshot);
      else body.innerHTML = renderGenericDetail(key, cfg, samples, daily, snapshot);
    } catch (error) {
      console.error("[Health Connect] detalhe", key, error);
      body.innerHTML = '<div class="hc-detail-section"><div class="hc-detail-empty">Não consegui carregar os detalhes agora. Tente atualizar os dados e abrir novamente.</div></div>';
    }
  }

  function formatDiagNumber(value, digits) {
    const n = safeNumber(value);
    if (n == null) return "--";
    return Number(n.toFixed(digits == null ? 2 : digits)).toLocaleString("pt-BR", {
      maximumFractionDigits: digits == null ? 2 : digits
    });
  }

  function formatDiagTime(value) {
    if (!value) return "--";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "--";
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function readDiagnosticSamples(health, dataType, startDate, endDate) {
    const result = await health.readSamples({
      dataType,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 2000
    });
    const samples = result && Array.isArray(result.samples) ? result.samples : [];
    const sorted = samples.slice().sort((a, b) => new Date(a.startDate || 0) - new Date(b.startDate || 0));
    const total = samples.reduce((sum, sample) => {
      const value = safeNumber(sample && sample.value);
      return sum + (value == null ? 0 : value);
    }, 0);

    const sourceMap = new Map();
    samples.forEach((sample) => {
      const sourceName = sample.sourceName || sample.sourceId || "Origem não informada";
      const sourceId = sample.sourceId || "";
      const deviceType = sample.deviceType || "não informado";
      const key = sourceName + "|" + sourceId + "|" + deviceType;
      const current = sourceMap.get(key) || {
        sourceName,
        sourceId,
        deviceType,
        count: 0,
        total: 0,
        first: null,
        last: null
      };
      current.count += 1;
      const value = safeNumber(sample.value);
      if (value != null) current.total += value;
      const start = sample.startDate || sample.endDate || null;
      const end = sample.endDate || sample.startDate || null;
      if (!current.first || (start && new Date(start) < new Date(current.first))) current.first = start;
      if (!current.last || (end && new Date(end) > new Date(current.last))) current.last = end;
      sourceMap.set(key, current);
    });

    return {
      count: samples.length,
      total,
      unit: samples.find((sample) => sample && sample.unit)?.unit || "",
      first: sorted[0] ? (sorted[0].startDate || sorted[0].endDate || null) : null,
      last: sorted.length ? (sorted[sorted.length - 1].endDate || sorted[sorted.length - 1].startDate || null) : null,
      sources: Array.from(sourceMap.values()).sort((a, b) => b.total - a.total),
      recent: sorted.slice(-8).map((sample) => ({
        value: sample.value,
        unit: sample.unit || "",
        startDate: sample.startDate || null,
        endDate: sample.endDate || null,
        sourceName: sample.sourceName || null,
        sourceId: sample.sourceId || null,
        deviceType: sample.deviceType || null
      }))
    };
  }

  async function readDiagnosticHours(health, dataType, startDate, endDate) {
    try {
      const result = await health.queryAggregated({
        dataType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        bucket: "hour",
        aggregation: "sum"
      });
      const samples = result && Array.isArray(result.samples) ? result.samples : [];
      return samples
        .filter((sample) => safeNumber(sample && sample.value) != null && Number(sample.value) !== 0)
        .map((sample) => ({
          value: Number(sample.value),
          unit: sample.unit || "",
          startDate: sample.startDate || null,
          endDate: sample.endDate || null
        }));
    } catch (error) {
      return [];
    }
  }

  function diagDisplayValue(type, value) {
    const n = safeNumber(value);
    if (n == null) return "--";
    if (type === "steps") return Math.round(n).toLocaleString("pt-BR") + " passos";
    if (type === "distance") return formatDiagNumber(n / 1000, 3) + " km (" + formatDiagNumber(n, 0) + " m)";
    if (type === "calories") return formatDiagNumber(n, 1) + " kcal";
    return formatDiagNumber(n, 2);
  }

  function renderDiagnosticMetric(type, label, metric) {
    const sources = (metric.samples.sources || []).map((source) => {
      const device = source.deviceType && source.deviceType !== "não informado" ? " • " + source.deviceType : "";
      const id = source.sourceId ? " [" + source.sourceId + "]" : "";
      return "<div><strong>" + escapeHtml(source.sourceName) + "</strong>" + escapeHtml(device + id) +
        "<br>" + source.count + " amostras • " + escapeHtml(diagDisplayValue(type, source.total)) +
        " • última " + escapeHtml(formatDiagTime(source.last)) + "</div>";
    }).join("");

    const hours = (metric.hours || []).slice(-8).map((item) => {
      return formatDiagTime(item.startDate) + " = " + diagDisplayValue(type, item.value);
    }).join(" • ");

    return '<div class="hc-diag-block">' +
      '<div class="hc-diag-title">' + escapeHtml(label) + '</div>' +
      '<div class="hc-diag-row"><span>Agregado do dia</span><strong>' + escapeHtml(diagDisplayValue(type, metric.aggregated)) + '</strong></div>' +
      '<div class="hc-diag-row"><span>Soma das amostras</span><strong>' + escapeHtml(diagDisplayValue(type, metric.samples.total)) + '</strong></div>' +
      '<div class="hc-diag-row"><span>Quantidade</span><strong>' + metric.samples.count + ' amostras</strong></div>' +
      '<div class="hc-diag-row"><span>Primeira / última</span><strong>' + escapeHtml(formatDiagTime(metric.samples.first)) + ' / ' + escapeHtml(formatDiagTime(metric.samples.last)) + '</strong></div>' +
      '<div class="hc-diag-source"><strong>Origens:</strong><br>' + (sources || "Nenhuma origem retornada") + '</div>' +
      '<div class="hc-diag-source"><strong>Últimas horas com dados:</strong><br>' + escapeHtml(hours || "Nenhum bloco horário retornado") + '</div>' +
      '</div>';
  }

  function renderDiagnostics(report) {
    const panel = document.getElementById("hcDiagnosticPanel");
    const content = document.getElementById("hcDiagnosticContent");
    if (!panel || !content) return;
    panel.classList.add("open");

    if (!report) {
      content.innerHTML = "Sem relatório disponível.";
      return;
    }

    const pluginText = report.pluginVersion ? "Plugin " + report.pluginVersion : "Versão do plugin não informada";
    content.innerHTML =
      '<div class="hc-diag-row"><span>Horário</span><strong>' + escapeHtml(new Date(report.createdAt).toLocaleString("pt-BR")) + '</strong></div>' +
      '<div class="hc-diag-row"><span>Health plugin</span><strong>' + escapeHtml(pluginText) + '</strong></div>' +
      '<div class="hc-diag-row"><span>Permissões lidas</span><strong>' + escapeHtml((report.authorized || []).join(", ") || "nenhuma") + '</strong></div>' +
      renderDiagnosticMetric("steps", "Passos", report.metrics.steps) +
      renderDiagnosticMetric("distance", "Distância", report.metrics.distance) +
      renderDiagnosticMetric("calories", "Calorias ativas", report.metrics.calories);
  }

  async function runDiagnostics() {
    if (diagnosing || !isAndroidNative()) return;
    injectCard();
    const health = getHealthPlugin();
    if (!health) return;

    const button = document.getElementById("hcDiagnosticBtn");
    const panel = document.getElementById("hcDiagnosticPanel");
    const content = document.getElementById("hcDiagnosticContent");
    if (panel) panel.classList.add("open");
    if (content) content.textContent = "Lendo amostras brutas do Health Connect...";
    if (button) {
      button.disabled = true;
      button.textContent = "Analisando...";
    }
    diagnosing = true;

    try {
      const auth = await checkAuthorization(health);
      const authorized = auth && Array.isArray(auth.readAuthorized) ? auth.readAuthorized : [];
      const now = new Date();
      const today = startOfToday();
      const pluginVersionResult = health.getPluginVersion ? await health.getPluginVersion().catch(() => null) : null;

      const types = ["steps", "distance", "calories"];
      const results = await Promise.all(types.map(async (type) => {
        const [aggregated, samples, hours] = await Promise.all([
          aggregate(health, type, today, now, "sum"),
          readDiagnosticSamples(health, type, today, now),
          readDiagnosticHours(health, type, today, now)
        ]);
        return [type, { aggregated, samples, hours }];
      }));

      lastDiagnosticReport = {
        createdAt: new Date().toISOString(),
        pluginVersion: pluginVersionResult && pluginVersionResult.version ? pluginVersionResult.version : null,
        authorized,
        metrics: Object.fromEntries(results)
      };
      renderDiagnostics(lastDiagnosticReport);
    } catch (error) {
      console.error("[Health Connect] diagnostic", error);
      if (content) content.textContent = "Falha ao gerar diagnóstico: " + (error && error.message ? error.message : String(error));
    } finally {
      diagnosing = false;
      if (button) {
        button.disabled = false;
        button.textContent = "Diagnóstico";
      }
    }
  }

  async function copyDiagnosticReport() {
    if (!lastDiagnosticReport) {
      await runDiagnostics();
      if (!lastDiagnosticReport) return;
    }
    const payload = JSON.stringify(lastDiagnosticReport, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      const button = document.getElementById("hcCopyDiagnosticBtn");
      if (button) {
        const old = button.textContent;
        button.textContent = "Copiado ✓";
        setTimeout(() => { button.textContent = old; }, 1400);
      }
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = payload;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try { document.execCommand("copy"); } catch (_) {}
      area.remove();
    }
  }

  async function checkAuthorization(health) {
    try {
      return await health.checkAuthorization({ read: READ_TYPES, write: [] });
    } catch (_) {
      return null;
    }
  }

  async function connect() {
    injectCard();
    const health = getHealthPlugin();
    if (!health) {
      setStatus("Plugin indisponível", "error");
      return;
    }

    try {
      const availability = await health.isAvailable();
      if (!availability || !availability.available) {
        setStatus("Health Connect indisponível", "warn");
        return;
      }

      setStatus("Aguardando permissão", "warn");
      const auth = await health.requestAuthorization({ read: READ_TYPES, write: [] });
      const granted = auth && Array.isArray(auth.readAuthorized) ? auth.readAuthorized.length : 0;
      if (!granted) {
        setStatus("Permissão não concedida", "warn");
        return;
      }
      await refresh();
    } catch (error) {
      console.error("[Health Connect] connect", error);
      setStatus("Falha ao conectar", "error");
    }
  }

  async function openSettings() {
    const health = getHealthPlugin();
    try {
      if (health && health.openHealthConnectSettings) await health.openHealthConnectSettings();
    } catch (error) {
      console.warn("[Health Connect] settings", error);
    }
  }

  async function refresh() {
    if (refreshing || !isAndroidNative()) return;
    injectCard();
    const health = getHealthPlugin();
    if (!health) {
      setStatus("Plugin indisponível", "error");
      return;
    }

    refreshing = true;
    const refreshBtn = document.getElementById("hcRefreshBtn");
    if (refreshBtn) refreshBtn.disabled = true;

    try {
      const availability = await health.isAvailable();
      if (!availability || !availability.available) {
        setStatus("Health Connect indisponível", "warn");
        return;
      }

      const auth = await checkAuthorization(health);
      const authorized = auth && Array.isArray(auth.readAuthorized) ? auth.readAuthorized : [];
      if (!authorized.length) {
        setStatus("Toque em Conectar", "neutral");
        return;
      }

      setStatus("Sincronizando", "warn");
      const now = new Date();
      const today = startOfToday();
      const last36h = new Date(now.getTime() - 36 * 60 * 60 * 1000);
      const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const [
        stepsAggregate,
        distanceAggregate,
        caloriesAggregate,
        heart,
        weight,
        sleep,
        spo2,
        restingHeart,
        workouts,
        stepSamples,
        distanceSamples,
        calorieSamples
      ] = await Promise.all([
        aggregate(health, "steps", today, now, "sum"),
        aggregate(health, "distance", today, now, "sum"),
        aggregate(health, "calories", today, now, "sum"),
        aggregate(health, "heartRate", today, now, ["average", "min", "max"]),
        readLatest(health, "weight", last30d, now, false),
        readLatest(health, "sleep", last36h, now, true),
        readLatest(health, "oxygenSaturation", last36h, now, false),
        readLatest(health, "restingHeartRate", last30d, now, false),
        readWorkouts(health, today, now),
        readRawSamples(health, "steps", today, now, 2000),
        readRawSamples(health, "distance", today, now, 2000),
        readRawSamples(health, "calories", today, now, 2000)
      ]);

      const samsungSteps = samsungHealthMetricValue(stepSamples);
      const samsungDistance = samsungHealthMetricValue(distanceSamples);
      const samsungCalories = samsungHealthMetricValue(calorieSamples);
      const finalSteps = samsungSteps == null ? stepsAggregate : samsungSteps;

      const heartAvg = heart && safeNumber(heart.average);
      const snapshot = {
        source: "Health Connect / Samsung Health",
        updatedAt: new Date().toISOString(),
        steps: finalSteps == null ? null : Math.round(finalSteps),
        stepsSource: samsungSteps == null ? "health_connect_aggregate" : "samsung_health",
        distanceKm: samsungDistance == null ? null : round(samsungDistance / 1000, 2),
        distanceSyncStatus: samsungDistance == null && distanceAggregate != null ? "not_shared_by_samsung_health" : (samsungDistance == null ? "unavailable" : "samsung_health"),
        activeCaloriesKcal: samsungCalories == null ? null : round(samsungCalories, 0),
        caloriesSyncStatus: samsungCalories == null && caloriesAggregate != null ? "not_shared_by_samsung_health" : (samsungCalories == null ? "unavailable" : "samsung_health"),
        heartRateAvg: heartAvg == null ? null : round(heartAvg, 0),
        heartRateMin: heart && safeNumber(heart.min) != null ? round(heart.min, 0) : null,
        heartRateMax: heart && safeNumber(heart.max) != null ? round(heart.max, 0) : null,
        weightKg: weight && safeNumber(weight.value) != null ? round(weight.value, 1) : null,
        sleepMinutes: sleep && safeNumber(sleep.value) != null ? round(sleep.value, 0) : null,
        oxygenSaturationPct: spo2 && safeNumber(spo2.value) != null ? round(spo2.value, 0) : null,
        restingHeartRate: restingHeart && safeNumber(restingHeart.value) != null ? round(restingHeart.value, 0) : null,
        workoutsToday: workouts.length,
        workoutMinutesToday: workoutMinutes(workouts),
        permissions: authorized
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      updateCard(snapshot);
      setStatus("Conectado", "ok");
      document.dispatchEvent(new CustomEvent("evoluafit:health-connect-updated", { detail: snapshot }));
    } catch (error) {
      console.error("[Health Connect] refresh", error);
      setStatus("Erro ao sincronizar", "error");
    } finally {
      refreshing = false;
      if (refreshBtn) refreshBtn.disabled = false;
    }
  }

  window.EvoluaFitHealthConnect = {
    connect,
    refresh,
    openSettings,
    getSnapshot: parseStoredSnapshot
  };

  function boot() {
    if (!isAndroidNative()) return;
    injectCard();
    setTimeout(refresh, 900);
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) setTimeout(refresh, 400);
    });
    window.addEventListener("focus", function () {
      setTimeout(refresh, 400);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { setTimeout(boot, 350); });
  } else {
    setTimeout(boot, 350);
  }
})();