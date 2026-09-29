(function () {
  if (window.__lumaHealthConnectStarted) return;
  window.__lumaHealthConnectStarted = true;

  const STORAGE_KEY = "lumaHealthConnectSnapshot";
  const HEALTH_TYPES = [
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

  const state = {
    plugin: null,
    available: false,
    connected: false,
    authorized: [],
    denied: [],
    syncing: false,
    snapshot: null,
    lastError: ""
  };

  function getPlugin() {
    if (state.plugin) return state.plugin;
    const cap = window.Capacitor;
    if (!cap) return null;

    try {
      if (cap.Plugins && cap.Plugins.Health) {
        state.plugin = cap.Plugins.Health;
        return state.plugin;
      }

      if (typeof cap.registerPlugin === "function") {
        state.plugin = cap.registerPlugin("Health");
        return state.plugin;
      }
    } catch (error) {
      console.warn("Health Connect plugin indisponível:", error);
    }

    return null;
  }

  function parseStoredSnapshot() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveSnapshot(snapshot) {
    state.snapshot = snapshot;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    window.lumaHealthConnectSnapshot = snapshot;
    renderCard();
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function formatDateTime(iso) {
    if (!iso) return "Nunca";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Nunca";
    return pad2(d.getDate()) + "/" + pad2(d.getMonth() + 1) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes());
  }

  function formatSleep(minutes) {
    if (!Number.isFinite(minutes) || minutes <= 0) return "--";
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return h + "h " + pad2(m);
  }

  function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function hoursAgo(hours) {
    return new Date(Date.now() - hours * 60 * 60 * 1000);
  }

  function daysAgo(days) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  function sumSamples(samples) {
    return (samples || []).reduce(function (total, sample) {
      const value = Number(sample && sample.value);
      return total + (Number.isFinite(value) ? value : 0);
    }, 0);
  }

  function latestSample(samples) {
    return (samples || [])
      .filter(Boolean)
      .slice()
      .sort(function (a, b) {
        return new Date(b.endDate || b.startDate || 0).getTime() - new Date(a.endDate || a.startDate || 0).getTime();
      })[0] || null;
  }

  async function readSamples(dataType, startDate, endDate, limit) {
    const result = await state.plugin.readSamples({
      dataType: dataType,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: limit || 500,
      ascending: false
    });

    return result && Array.isArray(result.samples) ? result.samples : [];
  }

  async function aggregate(dataType, startDate, endDate, aggregation) {
    try {
      const result = await state.plugin.queryAggregated({
        dataType: dataType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        bucket: "day",
        aggregation: aggregation || "sum"
      });

      if (result && Array.isArray(result.samples) && result.samples.length) {
        return result.samples;
      }
    } catch (error) {
      console.warn("Agregação Health Connect falhou para " + dataType + ", usando amostras:", error);
    }

    const samples = await readSamples(dataType, startDate, endDate, 1000);
    return [{
      value: sumSamples(samples),
      values: {}
    }];
  }

  function metricValue(samples) {
    if (!samples || !samples.length) return 0;
    return samples.reduce(function (total, sample) {
      const value = Number(sample && sample.value);
      return total + (Number.isFinite(value) ? value : 0);
    }, 0);
  }

  async function collectSnapshot() {
    const now = new Date();
    const today = startOfToday();
    const auth = new Set(state.authorized || []);

    const jobs = {
      steps: auth.has("steps") ? aggregate("steps", today, now, "sum") : Promise.resolve([]),
      distance: auth.has("distance") ? aggregate("distance", today, now, "sum") : Promise.resolve([]),
      calories: auth.has("calories") ? aggregate("calories", today, now, "sum") : Promise.resolve([]),
      heartRate: auth.has("heartRate") ? aggregate("heartRate", today, now, ["average", "min", "max"]) : Promise.resolve([]),
      restingHeartRate: auth.has("restingHeartRate") ? readSamples("restingHeartRate", hoursAgo(36), now, 100) : Promise.resolve([]),
      weight: auth.has("weight") ? readSamples("weight", daysAgo(30), now, 100) : Promise.resolve([]),
      sleep: auth.has("sleep") ? readSamples("sleep", hoursAgo(36), now, 200) : Promise.resolve([]),
      oxygen: auth.has("oxygenSaturation") ? readSamples("oxygenSaturation", hoursAgo(36), now, 100) : Promise.resolve([]),
      workouts: auth.has("workouts")
        ? state.plugin.queryWorkouts({
            startDate: today.toISOString(),
            endDate: now.toISOString(),
            limit: 100,
            ascending: false
          })
        : Promise.resolve({ workouts: [] })
    };

    const names = Object.keys(jobs);
    const results = await Promise.allSettled(names.map(function (name) { return jobs[name]; }));
    const data = {};

    results.forEach(function (result, index) {
      data[names[index]] = result.status === "fulfilled" ? result.value : [];
      if (result.status === "rejected") {
        console.warn("Falha ao ler " + names[index] + ":", result.reason);
      }
    });

    const hrBucket = Array.isArray(data.heartRate) && data.heartRate.length ? data.heartRate[data.heartRate.length - 1] : null;
    const hrValues = hrBucket && hrBucket.values ? hrBucket.values : {};
    const resting = latestSample(data.restingHeartRate);
    const weight = latestSample(data.weight);
    const oxygen = latestSample(data.oxygen);

    let sleepMinutes = 0;
    const sleepSamples = Array.isArray(data.sleep) ? data.sleep : [];
    const sessionSamples = sleepSamples.filter(function (sample) {
      return Array.isArray(sample && sample.stages) && sample.stages.length > 0;
    });
    const candidates = sessionSamples.length ? sessionSamples : sleepSamples.filter(function (sample) {
      return sample && sample.sleepState !== "awake" && sample.sleepState !== "inBed";
    });

    candidates.forEach(function (sample) {
      const value = Number(sample && sample.value);
      if (Number.isFinite(value) && value > sleepMinutes) sleepMinutes = value;
    });

    const workouts = data.workouts && Array.isArray(data.workouts.workouts) ? data.workouts.workouts : [];
    const workoutMinutes = workouts.reduce(function (total, workout) {
      const seconds = Number(workout && workout.duration);
      return total + (Number.isFinite(seconds) ? seconds / 60 : 0);
    }, 0);

    return {
      connected: true,
      updatedAt: now.toISOString(),
      provider: "Health Connect",
      steps: Math.round(metricValue(data.steps)),
      distanceKm: Number((metricValue(data.distance) / 1000).toFixed(2)),
      activeCalories: Math.round(metricValue(data.calories)),
      heartRateAvg: Number.isFinite(Number(hrValues.average))
        ? Math.round(Number(hrValues.average))
        : (hrBucket && Number.isFinite(Number(hrBucket.value)) ? Math.round(Number(hrBucket.value)) : null),
      heartRateMin: Number.isFinite(Number(hrValues.min)) ? Math.round(Number(hrValues.min)) : null,
      heartRateMax: Number.isFinite(Number(hrValues.max)) ? Math.round(Number(hrValues.max)) : null,
      restingHeartRate: resting && Number.isFinite(Number(resting.value)) ? Math.round(Number(resting.value)) : null,
      weightKg: weight && Number.isFinite(Number(weight.value)) ? Number(Number(weight.value).toFixed(1)) : null,
      sleepMinutes: Math.round(sleepMinutes),
      spo2: oxygen && Number.isFinite(Number(oxygen.value)) ? Number(Number(oxygen.value).toFixed(1)) : null,
      workoutsCount: workouts.length,
      workoutMinutes: Math.round(workoutMinutes),
      authorized: state.authorized.slice(),
      denied: state.denied.slice()
    };
  }

  function healthSummary(snapshot) {
    if (!snapshot || !snapshot.connected) return null;

    return {
      origem: "Health Connect / Samsung Health",
      atualizadoEm: snapshot.updatedAt,
      passosHoje: snapshot.steps,
      distanciaKmHoje: snapshot.distanceKm,
      caloriasAtivasHoje: snapshot.activeCalories,
      frequenciaCardiacaMediaHoje: snapshot.heartRateAvg,
      frequenciaCardiacaMinHoje: snapshot.heartRateMin,
      frequenciaCardiacaMaxHoje: snapshot.heartRateMax,
      frequenciaCardiacaRepouso: snapshot.restingHeartRate,
      pesoMaisRecenteKg: snapshot.weightKg,
      sonoUltimas36hMin: snapshot.sleepMinutes,
      spo2MaisRecente: snapshot.spo2,
      treinosHoje: snapshot.workoutsCount,
      minutosTreinoHoje: snapshot.workoutMinutes
    };
  }

  function installFetchContextBridge() {
    if (window.__lumaHealthFetchBridgeInstalled) return;
    window.__lumaHealthFetchBridgeInstalled = true;

    const originalFetch = window.fetch.bind(window);

    window.fetch = function (input, init) {
      try {
        const url = typeof input === "string" ? input : (input && input.url) || "";
        const snapshot = state.snapshot || parseStoredSnapshot();

        if (
          snapshot &&
          snapshot.connected &&
          url.indexOf("luma-gemini-api.onrender.com") !== -1 &&
          init &&
          typeof init.body === "string"
        ) {
          const body = JSON.parse(init.body);

          if (body && typeof body === "object" && !Array.isArray(body)) {
            body.healthConnect = healthSummary(snapshot);
            init = Object.assign({}, init, {
              body: JSON.stringify(body)
            });
          }
        }
      } catch (_) {
        // Mantém a requisição original caso o corpo não seja JSON.
      }

      return originalFetch(input, init);
    };
  }

  function injectStyles() {
    if (document.getElementById("luma-health-connect-style")) return;

    const style = document.createElement("style");
    style.id = "luma-health-connect-style";
    style.textContent = [
      ".health-connect-card{overflow:hidden;position:relative}",
      ".health-connect-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px}",
      ".health-connect-head h3{margin-bottom:4px}",
      ".health-connect-head p{font-size:12px;color:var(--text-muted);line-height:1.4}",
      ".health-connect-pill{white-space:nowrap;font-size:11px;font-weight:800;padding:6px 9px;border-radius:999px;background:var(--btn-sec-bg);color:var(--text-muted)}",
      ".health-connect-pill.ok{background:rgba(16,185,129,.14);color:#059669}",
      ".health-connect-pill.warn{background:rgba(249,115,22,.14);color:#ea580c}",
      ".health-connect-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}",
      ".health-connect-metric{background:var(--input-bg);border:1px solid var(--border-color);border-radius:13px;padding:12px}",
      ".health-connect-metric span{display:block;font-size:11px;color:var(--text-muted);font-weight:700;margin-bottom:5px}",
      ".health-connect-metric strong{font-size:18px;letter-spacing:-.3px}",
      ".health-connect-metric small{font-size:10px;color:var(--text-muted);display:block;margin-top:3px;min-height:13px}",
      ".health-connect-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}",
      ".health-connect-actions button{flex:1;min-width:145px;padding:10px 12px;font-size:13px}",
      ".health-connect-actions .hc-secondary{background:var(--btn-sec-bg);color:var(--btn-sec-text)}",
      ".health-connect-foot{font-size:11px;color:var(--text-muted);margin-top:10px;line-height:1.4}",
      "@media(min-width:700px){.health-connect-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}"
    ].join("");
    document.head.appendChild(style);
  }

  function ensureCard() {
    let card = document.getElementById("healthConnectCard");
    if (card) return card;

    const dashboard = document.getElementById("aba-dashboard");
    if (!dashboard) return null;

    card = document.createElement("div");
    card.className = "card health-connect-card";
    card.id = "healthConnectCard";
    card.innerHTML =
      '<div class="health-connect-head">' +
        '<div><h3><i class="bi bi-heart-pulse"></i> Samsung Health</h3>' +
        '<p>Dados lidos pelo Health Connect no seu Android.</p></div>' +
        '<span id="hcStatus" class="health-connect-pill">Verificando</span>' +
      '</div>' +
      '<div class="health-connect-grid">' +
        '<div class="health-connect-metric"><span>Passos hoje</span><strong id="hcSteps">--</strong><small>passos</small></div>' +
        '<div class="health-connect-metric"><span>Calorias ativas</span><strong id="hcCalories">--</strong><small>kcal</small></div>' +
        '<div class="health-connect-metric"><span>Distância</span><strong id="hcDistance">--</strong><small>km hoje</small></div>' +
        '<div class="health-connect-metric"><span>Frequência cardíaca</span><strong id="hcHeartRate">--</strong><small id="hcHeartRateInfo">bpm</small></div>' +
        '<div class="health-connect-metric"><span>FC repouso</span><strong id="hcRestingHeartRate">--</strong><small>bpm</small></div>' +
        '<div class="health-connect-metric"><span>Sono</span><strong id="hcSleep">--</strong><small>últimas 36h</small></div>' +
        '<div class="health-connect-metric"><span>SpO₂</span><strong id="hcSpo2">--</strong><small>% mais recente</small></div>' +
        '<div class="health-connect-metric"><span>Peso</span><strong id="hcWeight">--</strong><small>kg mais recente</small></div>' +
        '<div class="health-connect-metric"><span>Treinos hoje</span><strong id="hcWorkouts">--</strong><small id="hcWorkoutInfo">sessões</small></div>' +
      '</div>' +
      '<div class="health-connect-actions">' +
        '<button id="hcConnectBtn" type="button"><i class="bi bi-link-45deg"></i> Conectar Samsung Health</button>' +
        '<button id="hcSettingsBtn" class="hc-secondary" type="button"><i class="bi bi-gear"></i> Permissões</button>' +
      '</div>' +
      '<div id="hcFoot" class="health-connect-foot">Aguardando Health Connect.</div>';

    const highlight = dashboard.querySelector(".card-highlight");
    if (highlight && highlight.parentNode) {
      highlight.parentNode.insertBefore(card, highlight.nextSibling);
    } else {
      dashboard.insertBefore(card, dashboard.firstChild);
    }

    const connect = document.getElementById("hcConnectBtn");
    const settings = document.getElementById("hcSettingsBtn");
    if (connect) connect.addEventListener("click", connectHealth);
    if (settings) settings.addEventListener("click", openSettings);

    return card;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderCard() {
    if (!ensureCard()) return;

    const pill = document.getElementById("hcStatus");
    const connect = document.getElementById("hcConnectBtn");
    const settings = document.getElementById("hcSettingsBtn");
    const snapshot = state.snapshot || parseStoredSnapshot();

    if (!getPlugin()) {
      if (pill) {
        pill.textContent = "Somente no APK";
        pill.className = "health-connect-pill";
      }
      if (connect) {
        connect.disabled = true;
        connect.innerHTML = '<i class="bi bi-phone"></i> Abra o APK Android';
      }
      if (settings) settings.disabled = true;
      setText("hcFoot", "No navegador/PWA o Health Connect não fica disponível. Instale a versão Android para sincronizar com o Samsung Health.");
    } else if (state.syncing) {
      if (pill) {
        pill.textContent = "Sincronizando";
        pill.className = "health-connect-pill warn";
      }
      if (connect) {
        connect.disabled = true;
        connect.innerHTML = '<i class="bi bi-arrow-repeat"></i> Sincronizando...';
      }
    } else if (state.connected) {
      if (pill) {
        pill.textContent = state.denied.length ? "Conectado parcial" : "Conectado";
        pill.className = "health-connect-pill " + (state.denied.length ? "warn" : "ok");
      }
      if (connect) {
        connect.disabled = false;
        connect.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Atualizar dados';
      }
      if (settings) settings.disabled = false;
      setText("hcFoot", "Última sincronização: " + formatDateTime(snapshot && snapshot.updatedAt) + ". Os dados entram também no contexto enviado para a Luma.");
    } else {
      if (pill) {
        pill.textContent = state.available ? "Não conectado" : "Indisponível";
        pill.className = "health-connect-pill " + (state.available ? "warn" : "");
      }
      if (connect) {
        connect.disabled = !state.available;
        connect.innerHTML = '<i class="bi bi-link-45deg"></i> Conectar Samsung Health';
      }
      if (settings) settings.disabled = !state.available;
      setText("hcFoot", state.lastError || "Conecte o Health Connect para ler os dados que o Samsung Health compartilhar.");
    }

    if (snapshot) {
      setText("hcSteps", Number.isFinite(Number(snapshot.steps)) ? Number(snapshot.steps).toLocaleString("pt-BR") : "--");
      setText("hcCalories", Number.isFinite(Number(snapshot.activeCalories)) ? Math.round(snapshot.activeCalories).toLocaleString("pt-BR") : "--");
      setText("hcDistance", Number.isFinite(Number(snapshot.distanceKm)) ? Number(snapshot.distanceKm).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : "--");
      setText("hcHeartRate", snapshot.heartRateAvg != null ? String(snapshot.heartRateAvg) : "--");
      setText("hcHeartRateInfo", snapshot.heartRateMin != null && snapshot.heartRateMax != null ? "mín " + snapshot.heartRateMin + " • máx " + snapshot.heartRateMax : "bpm");
      setText("hcRestingHeartRate", snapshot.restingHeartRate != null ? String(snapshot.restingHeartRate) : "--");
      setText("hcSleep", formatSleep(Number(snapshot.sleepMinutes)));
      setText("hcSpo2", snapshot.spo2 != null ? String(snapshot.spo2) : "--");
      setText("hcWeight", snapshot.weightKg != null ? String(snapshot.weightKg).replace(".", ",") : "--");
      setText("hcWorkouts", snapshot.workoutsCount != null ? String(snapshot.workoutsCount) : "--");
      setText("hcWorkoutInfo", snapshot.workoutMinutes ? snapshot.workoutMinutes + " min no total" : "sessões");
    }
  }

  async function refreshAuthorization() {
    const plugin = getPlugin();
    if (!plugin) return false;

    const availability = await plugin.isAvailable();
    state.available = !!(availability && availability.available);

    if (!state.available) {
      state.lastError = (availability && availability.reason) || "Health Connect indisponível neste aparelho.";
      state.connected = false;
      renderCard();
      return false;
    }

    const authorization = await plugin.checkAuthorization({ read: HEALTH_TYPES });
    state.authorized = authorization && Array.isArray(authorization.readAuthorized) ? authorization.readAuthorized : [];
    state.denied = authorization && Array.isArray(authorization.readDenied) ? authorization.readDenied : [];
    state.connected = state.authorized.length > 0;
    renderCard();
    return state.connected;
  }

  async function syncHealth() {
    if (state.syncing) return;
    if (!getPlugin()) {
      renderCard();
      return;
    }

    state.syncing = true;
    state.lastError = "";
    renderCard();

    try {
      const connected = await refreshAuthorization();
      if (!connected) return;

      const snapshot = await collectSnapshot();
      saveSnapshot(snapshot);
    } catch (error) {
      console.error("Erro ao sincronizar Health Connect:", error);
      state.lastError = "Não foi possível ler os dados. Verifique as permissões do Health Connect.";
    } finally {
      state.syncing = false;
      renderCard();
    }
  }

  async function connectHealth() {
    const plugin = getPlugin();
    if (!plugin) return;

    if (state.connected) {
      await syncHealth();
      return;
    }

    state.syncing = true;
    renderCard();

    try {
      const availability = await plugin.isAvailable();
      state.available = !!(availability && availability.available);

      if (!state.available) {
        state.lastError = (availability && availability.reason) || "Health Connect indisponível.";
        return;
      }

      const authorization = await plugin.requestAuthorization({ read: HEALTH_TYPES });
      state.authorized = authorization && Array.isArray(authorization.readAuthorized) ? authorization.readAuthorized : [];
      state.denied = authorization && Array.isArray(authorization.readDenied) ? authorization.readDenied : [];
      state.connected = state.authorized.length > 0;

      if (state.connected) {
        const snapshot = await collectSnapshot();
        saveSnapshot(snapshot);
      } else {
        state.lastError = "Nenhuma permissão de leitura foi liberada.";
      }
    } catch (error) {
      console.error("Erro ao autorizar Health Connect:", error);
      state.lastError = "A autorização foi cancelada ou não pôde ser concluída.";
    } finally {
      state.syncing = false;
      renderCard();
    }
  }

  async function openSettings() {
    const plugin = getPlugin();
    if (!plugin) return;

    try {
      await plugin.openHealthConnectSettings();
    } catch (error) {
      console.warn("Não foi possível abrir as configurações do Health Connect:", error);
    }
  }

  async function init() {
    injectStyles();
    ensureCard();
    installFetchContextBridge();

    const cached = parseStoredSnapshot();
    if (cached) {
      state.snapshot = cached;
      window.lumaHealthConnectSnapshot = cached;
    }

    renderCard();

    if (!getPlugin()) return;

    try {
      const connected = await refreshAuthorization();
      if (connected) await syncHealth();
    } catch (error) {
      console.warn("Falha ao inicializar Health Connect:", error);
      state.lastError = "Não foi possível inicializar o Health Connect.";
      renderCard();
    }
  }

  window.getLumaHealthConnectContext = function () {
    return healthSummary(state.snapshot || parseStoredSnapshot());
  };

  window.lumaHealthConnect = {
    connect: connectHealth,
    sync: syncHealth,
    openSettings: openSettings,
    getSnapshot: function () { return state.snapshot || parseStoredSnapshot(); }
  };

  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState !== "visible" || !state.connected || state.syncing) return;

    const snapshot = state.snapshot || parseStoredSnapshot();
    const last = snapshot && snapshot.updatedAt ? new Date(snapshot.updatedAt).getTime() : 0;

    if (!last || Date.now() - last > 2 * 60 * 1000) {
      syncHealth();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
