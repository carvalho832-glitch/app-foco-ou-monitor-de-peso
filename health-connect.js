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
      const duration = Number(item.duration || item.durationMinutes || 0);
      return total + (Number.isFinite(duration) ? duration : 0);
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
    setText("hcSteps", snapshot.steps == null ? "--" : Number(snapshot.steps).toLocaleString("pt-BR"));
    setText("hcDistance", snapshot.distanceKm == null ? "--" : `${snapshot.distanceKm.toFixed(2)} km`);
    setText("hcCalories", snapshot.activeCaloriesKcal == null ? "--" : `${Math.round(snapshot.activeCaloriesKcal)} kcal`);
    setText("hcHeart", snapshot.heartRateAvg == null ? "--" : `${Math.round(snapshot.heartRateAvg)} bpm`);
    setText("hcWeight", snapshot.weightKg == null ? "--" : `${snapshot.weightKg.toFixed(1)} kg`);
    setText("hcSleep", snapshot.sleepMinutes == null ? "--" : formatDuration(snapshot.sleepMinutes));
    setText("hcSpo2", snapshot.oxygenSaturationPct == null ? "--" : `${Math.round(snapshot.oxygenSaturationPct)}%`);
    setText("hcWorkout", snapshot.workoutsToday == null ? "--" : `${snapshot.workoutsToday} • ${formatDuration(snapshot.workoutMinutesToday)}`);
    setText("hcUpdated", snapshot.updatedAt ? `Atualizado ${new Date(snapshot.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "");
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
      .hc-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.hc-item{padding:10px 11px;border:1px solid var(--border-color);border-radius:14px;background:rgba(148,163,184,.045)}.hc-label{font-size:9px;font-weight:850;text-transform:uppercase;color:var(--text-muted)}.hc-value{margin-top:4px;font-size:16px;font-weight:900;line-height:1.15}
      .hc-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:11px}.hc-btn{flex:1;min-width:110px;min-height:38px;border:0;border-radius:12px;padding:8px 10px;font-size:11px;font-weight:850}.hc-btn.primary{background:#2563eb;color:#fff}.hc-btn.secondary{background:rgba(37,99,235,.09);color:#2563eb;border:1px solid rgba(37,99,235,.16)}
      .hc-foot{margin-top:9px;color:var(--text-muted);font-size:9.5px;line-height:1.4}
    `;
    document.head.appendChild(style);
  }

  function injectCard() {
    if (!isAndroidNative() || document.getElementById("healthConnectCard")) return;
    const aba = document.getElementById("aba-saude");
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
        <div class="hc-item"><div class="hc-label">Passos hoje</div><div id="hcSteps" class="hc-value">--</div></div>
        <div class="hc-item"><div class="hc-label">Distância</div><div id="hcDistance" class="hc-value">--</div></div>
        <div class="hc-item"><div class="hc-label">Calorias ativas</div><div id="hcCalories" class="hc-value">--</div></div>
        <div class="hc-item"><div class="hc-label">FC média</div><div id="hcHeart" class="hc-value">--</div></div>
        <div class="hc-item"><div class="hc-label">Peso recente</div><div id="hcWeight" class="hc-value">--</div></div>
        <div class="hc-item"><div class="hc-label">Sono</div><div id="hcSleep" class="hc-value">--</div></div>
        <div class="hc-item"><div class="hc-label">SpO₂</div><div id="hcSpo2" class="hc-value">--</div></div>
        <div class="hc-item"><div class="hc-label">Treinos hoje</div><div id="hcWorkout" class="hc-value">--</div></div>
      </div>
      <div class="hc-actions">
        <button id="hcConnectBtn" class="hc-btn primary" type="button">Conectar dados de saúde</button>
        <button id="hcRefreshBtn" class="hc-btn secondary" type="button">Atualizar</button>
        <button id="hcSettingsBtn" class="hc-btn secondary" type="button">Permissões</button>
      </div>
      <div id="hcUpdated" class="hc-foot"></div>
      <div class="hc-foot">No Samsung Health, mantenha a sincronização com Health Connect habilitada. O EvoluaFit solicita somente leitura.</div>
    `;

    const overview = document.getElementById("healthOverviewV3");
    if (overview && overview.parentNode) overview.insertAdjacentElement("afterend", card);
    else {
      const header = aba.querySelector("header");
      if (header) header.insertAdjacentElement("afterend", card);
      else aba.prepend(card);
    }

    document.getElementById("hcConnectBtn").addEventListener("click", connect);
    document.getElementById("hcRefreshBtn").addEventListener("click", refresh);
    document.getElementById("hcSettingsBtn").addEventListener("click", openSettings);

    const saved = parseStoredSnapshot();
    if (saved) updateCard(saved);
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
        steps,
        distance,
        calories,
        heart,
        weight,
        sleep,
        spo2,
        restingHeart,
        workouts
      ] = await Promise.all([
        aggregate(health, "steps", today, now, "sum"),
        aggregate(health, "distance", today, now, "sum"),
        aggregate(health, "calories", today, now, "sum"),
        aggregate(health, "heartRate", today, now, ["average", "min", "max"]),
        readLatest(health, "weight", last30d, now, false),
        readLatest(health, "sleep", last36h, now, true),
        readLatest(health, "oxygenSaturation", last36h, now, false),
        readLatest(health, "restingHeartRate", last30d, now, false),
        readWorkouts(health, today, now)
      ]);

      const heartAvg = heart && safeNumber(heart.average);
      const snapshot = {
        source: "Health Connect / Samsung Health",
        updatedAt: new Date().toISOString(),
        steps: steps == null ? null : Math.round(steps),
        distanceKm: distance == null ? null : round(distance / 1000, 2),
        activeCaloriesKcal: calories == null ? null : round(calories, 0),
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