/* ==========================================
   EVOLUAFIT - TERCEIRA LEVA V4
   Tendências + metas semanais + evolução visual
========================================== */
(function () {
  if (window.__evoluaThirdWaveV4Loaded) return;
  window.__evoluaThirdWaveV4Loaded = true;

  const CHAVE_METAS = "evoluafitMetasSemanais";
  const HOJE = () => new Date().toISOString().slice(0, 10);
  let periodoGrafico = 30;
  let metricaGrafico = "peso";
  let grafico = null;
  let timer = null;

  function iniciar() {
    const dashboard = document.getElementById("aba-dashboard");
    if (!dashboard) return;
    document.body.classList.add("evolua-third-wave-v4");
    injetarEstilos();
    criarBlocoTendencias();
    criarBlocoMetas();
    criarBlocoEvolucao();
    criarModalMetas();
    prepararToquesAndroid();
    atualizarTudo();
    clearInterval(timer);
    timer = setInterval(atualizarTudo, 2500);
  }

  function injetarEstilos() {
    if (document.getElementById("evolua-third-wave-v4-style")) return;
    const style = document.createElement("style");
    style.id = "evolua-third-wave-v4-style";
    style.textContent = `
      html,body{overscroll-behavior-y:none}
      button,.food-tag,.floating-item{touch-action:manipulation}
      .v4-section{margin:0 0 16px;padding:15px;border-radius:20px;background:var(--card-bg);border:1px solid var(--border-color);box-shadow:0 8px 24px rgba(15,23,42,.05)}
      .v4-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
      .v4-head h3{margin:0;color:var(--text-main);font-size:16px;display:flex;align-items:center;gap:8px}
      .v4-head h3 i{color:#2563eb}
      .v4-sub{color:var(--text-muted);font-size:11px;margin-top:3px;line-height:1.35}
      .v4-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
      .v4-trend{min-height:88px;border:1px solid var(--border-color);border-radius:15px;padding:10px;background:rgba(148,163,184,.045)}
      .v4-trend-label{font-size:10px;font-weight:850;color:var(--text-muted);display:flex;align-items:center;gap:5px}
      .v4-trend-value{margin-top:9px;font-size:15px;font-weight:900;color:var(--text-main);line-height:1.05}
      .v4-trend-sub{margin-top:5px;font-size:9.5px;line-height:1.25;color:var(--text-muted);font-weight:650}
      .v4-trend.up .v4-trend-value{color:#0f766e}.v4-trend.down .v4-trend-value{color:#2563eb}.v4-trend.attention .v4-trend-value{color:#b45309}

      .v4-goals{display:grid;gap:11px}
      .v4-goal-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}
      .v4-goal-title{font-size:11px;font-weight:850;color:var(--text-main)}
      .v4-goal-count{font-size:11px;font-weight:900;color:#2563eb}
      .v4-progress{grid-column:1/-1;height:8px;border-radius:999px;overflow:hidden;background:rgba(148,163,184,.16)}
      .v4-progress>span{display:block;height:100%;width:0;border-radius:inherit;background:linear-gradient(90deg,#2563eb,#7c3aed);transition:width .28s ease}
      .v4-edit{border:1px solid var(--border-color);background:rgba(37,99,235,.07);color:#2563eb;border-radius:11px;padding:8px 10px;min-height:36px;font-size:10.5px;font-weight:850}
      .v4-week-badge{font-size:10px;color:var(--text-muted);font-weight:750;padding:6px 8px;border-radius:999px;background:rgba(148,163,184,.09)}

      .v4-chart-controls{display:flex;gap:6px;overflow:auto;padding-bottom:2px;scrollbar-width:none}.v4-chart-controls::-webkit-scrollbar{display:none}
      .v4-chip{flex:0 0 auto;border:1px solid var(--border-color);background:transparent;color:var(--text-muted);border-radius:999px;padding:7px 10px;font-size:10px;font-weight:850;min-height:32px}
      .v4-chip.active{background:#2563eb;color:#fff;border-color:#2563eb}
      .v4-chart-box{height:220px;margin-top:12px;position:relative;border-radius:16px;padding:8px;background:rgba(148,163,184,.035);border:1px solid var(--border-color)}
      .v4-chart-box canvas{width:100%!important;height:100%!important}
      .v4-empty{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:20px;color:var(--text-muted);font-size:11px;font-weight:750}
      .v4-chart-summary{margin-top:10px;padding:10px 11px;border-radius:13px;background:rgba(37,99,235,.06);color:var(--text-main);font-size:11px;line-height:1.4;font-weight:700}

      .v4-modal-backdrop{position:fixed;inset:0;z-index:10060;background:rgba(15,23,42,.48);backdrop-filter:blur(3px);opacity:0;pointer-events:none;transition:.18s ease}
      .v4-modal-backdrop.open{opacity:1;pointer-events:auto}
      .v4-modal{position:fixed;left:10px;right:10px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:10061;max-width:520px;margin:auto;padding:17px;border-radius:22px;background:var(--card-bg);border:1px solid var(--border-color);box-shadow:0 24px 60px rgba(15,23,42,.28);transform:translateY(18px) scale(.97);opacity:0;pointer-events:none;transition:.2s ease}
      .v4-modal.open{transform:translateY(0) scale(1);opacity:1;pointer-events:auto}
      .v4-modal h3{margin:0;color:var(--text-main);font-size:17px}.v4-modal p{margin:4px 0 14px;color:var(--text-muted);font-size:11px}
      .v4-goal-form{display:grid;gap:10px}.v4-goal-field{display:grid;grid-template-columns:1fr 92px;gap:10px;align-items:center;padding:10px;border:1px solid var(--border-color);border-radius:14px}.v4-goal-field label{font-size:11px;font-weight:800;color:var(--text-main)}.v4-goal-field small{display:block;color:var(--text-muted);font-size:9.5px;margin-top:2px}.v4-goal-field input{width:100%;padding:9px;border-radius:10px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-main);text-align:center;font-weight:850}
      .v4-modal-actions{display:grid;grid-template-columns:1fr 1.3fr;gap:8px;margin-top:13px}.v4-modal-actions button{min-height:42px;border-radius:12px;font-weight:850}.v4-cancel{background:rgba(148,163,184,.12);color:var(--text-main);border:1px solid var(--border-color)}.v4-save{background:#2563eb;color:#fff;border:0}
      .v4-about{margin-top:9px;text-align:center;color:var(--text-muted);font-size:9.5px;font-weight:700}

      @media(max-width:390px){.v4-grid-3{grid-template-columns:1fr}.v4-trend{min-height:70px}.v4-chart-box{height:200px}}
    `;
    document.head.appendChild(style);
  }

  function criarBlocoTendencias() {
    if (document.getElementById("v4Trends")) return;
    const ancora = document.getElementById("todayOverviewV2");
    if (!ancora) return;
    const sec = document.createElement("section");
    sec.id = "v4Trends";
    sec.className = "v4-section";
    sec.innerHTML = `
      <div class="v4-head"><div><h3><i class="bi bi-graph-up-arrow"></i> Tendências</h3><div class="v4-sub">Comparações simples com seus próprios registros.</div></div></div>
      <div class="v4-grid-3">
        <div id="v4TrendPeso" class="v4-trend"><div class="v4-trend-label"><i class="bi bi-speedometer2"></i> Peso</div><div class="v4-trend-value">--</div><div class="v4-trend-sub">Aguardando histórico</div></div>
        <div id="v4TrendAgua" class="v4-trend"><div class="v4-trend-label"><i class="bi bi-droplet-half"></i> Hidratação</div><div class="v4-trend-value">--</div><div class="v4-trend-sub">Comparação com ontem</div></div>
        <div id="v4TrendTreino" class="v4-trend"><div class="v4-trend-label"><i class="bi bi-activity"></i> Treinos</div><div class="v4-trend-value">--</div><div class="v4-trend-sub">Nesta semana</div></div>
      </div>`;
    ancora.insertAdjacentElement("afterend", sec);
  }

  function criarBlocoMetas() {
    if (document.getElementById("v4Goals")) return;
    const trends = document.getElementById("v4Trends");
    if (!trends) return;
    const sec = document.createElement("section");
    sec.id = "v4Goals";
    sec.className = "v4-section";
    sec.innerHTML = `
      <div class="v4-head">
        <div><h3><i class="bi bi-bullseye"></i> Metas da semana</h3><div class="v4-sub">Frequência, não perfeição.</div></div>
        <button id="v4EditGoals" class="v4-edit" type="button"><i class="bi bi-sliders"></i> Ajustar</button>
      </div>
      <div class="v4-goals">
        <div class="v4-goal-row"><div class="v4-goal-title">Dias batendo a meta de água</div><div id="v4GoalWaterCount" class="v4-goal-count">0/5</div><div class="v4-progress"><span id="v4GoalWaterBar"></span></div></div>
        <div class="v4-goal-row"><div class="v4-goal-title">Treinos concluídos</div><div id="v4GoalWorkoutCount" class="v4-goal-count">0/3</div><div class="v4-progress"><span id="v4GoalWorkoutBar"></span></div></div>
        <div class="v4-goal-row"><div class="v4-goal-title">Registros de peso</div><div id="v4GoalWeightCount" class="v4-goal-count">0/3</div><div class="v4-progress"><span id="v4GoalWeightBar"></span></div></div>
      </div>`;
    trends.insertAdjacentElement("afterend", sec);
    document.getElementById("v4EditGoals")?.addEventListener("click", abrirMetas);
  }

  function criarBlocoEvolucao() {
    if (document.getElementById("v4Evolution")) return;
    const goals = document.getElementById("v4Goals");
    if (!goals) return;
    const sec = document.createElement("section");
    sec.id = "v4Evolution";
    sec.className = "v4-section";
    sec.innerHTML = `
      <div class="v4-head"><div><h3><i class="bi bi-bar-chart-line"></i> Sua evolução</h3><div class="v4-sub">Escolha o indicador e o período.</div></div><span id="v4WeekBadge" class="v4-week-badge">últimos 30 dias</span></div>
      <div id="v4MetricControls" class="v4-chart-controls">
        <button class="v4-chip active" data-metric="peso" type="button">Peso</button>
        <button class="v4-chip" data-metric="agua" type="button">Água</button>
        <button class="v4-chip" data-metric="treino" type="button">Treinos</button>
      </div>
      <div id="v4PeriodControls" class="v4-chart-controls" style="margin-top:7px">
        <button class="v4-chip" data-period="7" type="button">7 dias</button>
        <button class="v4-chip active" data-period="30" type="button">30 dias</button>
        <button class="v4-chip" data-period="90" type="button">90 dias</button>
        <button class="v4-chip" data-period="0" type="button">Tudo</button>
      </div>
      <div class="v4-chart-box"><canvas id="v4EvolutionChart"></canvas><div id="v4ChartEmpty" class="v4-empty" style="display:none">Registre alguns dados para formar seu gráfico.</div></div>
      <div id="v4ChartSummary" class="v4-chart-summary">Os próximos registros vão deixando sua evolução mais clara.</div>`;
    goals.insertAdjacentElement("afterend", sec);
    sec.querySelectorAll("[data-metric]").forEach(btn => btn.addEventListener("click", () => {
      metricaGrafico = btn.dataset.metric;
      sec.querySelectorAll("[data-metric]").forEach(x => x.classList.toggle("active", x === btn));
      renderizarGrafico();
      toqueCurto();
    }));
    sec.querySelectorAll("[data-period]").forEach(btn => btn.addEventListener("click", () => {
      periodoGrafico = Number(btn.dataset.period || 30);
      sec.querySelectorAll("[data-period]").forEach(x => x.classList.toggle("active", x === btn));
      renderizarGrafico();
      toqueCurto();
    }));
  }

  function criarModalMetas() {
    if (document.getElementById("v4GoalsModal")) return;
    const back = document.createElement("div");
    back.id = "v4GoalsBackdrop";
    back.className = "v4-modal-backdrop";
    back.addEventListener("click", fecharMetas);
    const modal = document.createElement("div");
    modal.id = "v4GoalsModal";
    modal.className = "v4-modal";
    modal.innerHTML = `
      <h3>Metas da semana</h3><p>Ajuste para uma rotina que faça sentido para você.</p>
      <div class="v4-goal-form">
        <div class="v4-goal-field"><div><label>Dias com meta de água</label><small>Quantos dias da semana quer atingir sua meta diária.</small></div><input id="v4GoalWaterInput" type="number" min="1" max="7" inputmode="numeric"></div>
        <div class="v4-goal-field"><div><label>Treinos por semana</label><small>Caminhada ou corrida salva no app.</small></div><input id="v4GoalWorkoutInput" type="number" min="1" max="14" inputmode="numeric"></div>
        <div class="v4-goal-field"><div><label>Registros de peso</label><small>Quantidade de registros desejada por semana.</small></div><input id="v4GoalWeightInput" type="number" min="1" max="7" inputmode="numeric"></div>
      </div>
      <div class="v4-modal-actions"><button id="v4GoalCancel" class="v4-cancel" type="button">Cancelar</button><button id="v4GoalSave" class="v4-save" type="button">Salvar metas</button></div>
      <div class="v4-about">As metas são sincronizadas com sua conta EvoluaFit.</div>`;
    document.body.append(back, modal);
    document.getElementById("v4GoalCancel")?.addEventListener("click", fecharMetas);
    document.getElementById("v4GoalSave")?.addEventListener("click", salvarMetas);
  }

  function metas() {
    const padrao = { aguaDias: 5, treinos: 3, pesoRegistros: 3 };
    try {
      const salvo = JSON.parse(localStorage.getItem(CHAVE_METAS) || "null") || {};
      return {
        aguaDias: limitarNumero(salvo.aguaDias, 1, 7, padrao.aguaDias),
        treinos: limitarNumero(salvo.treinos, 1, 14, padrao.treinos),
        pesoRegistros: limitarNumero(salvo.pesoRegistros, 1, 7, padrao.pesoRegistros)
      };
    } catch (_) { return padrao; }
  }

  function limitarNumero(v, min, max, padrao) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : padrao;
  }

  function abrirMetas() {
    const m = metas();
    setValor("v4GoalWaterInput", m.aguaDias);
    setValor("v4GoalWorkoutInput", m.treinos);
    setValor("v4GoalWeightInput", m.pesoRegistros);
    document.getElementById("v4GoalsBackdrop")?.classList.add("open");
    document.getElementById("v4GoalsModal")?.classList.add("open");
    toqueCurto();
  }

  function fecharMetas() {
    document.getElementById("v4GoalsBackdrop")?.classList.remove("open");
    document.getElementById("v4GoalsModal")?.classList.remove("open");
  }

  function salvarMetas() {
    const m = {
      aguaDias: limitarNumero(document.getElementById("v4GoalWaterInput")?.value, 1, 7, 5),
      treinos: limitarNumero(document.getElementById("v4GoalWorkoutInput")?.value, 1, 14, 3),
      pesoRegistros: limitarNumero(document.getElementById("v4GoalWeightInput")?.value, 1, 7, 3)
    };
    localStorage.setItem(CHAVE_METAS, JSON.stringify(m));
    fecharMetas();
    atualizarMetas();
    toqueCurto();
  }

  function setValor(id, valor) {
    const el = document.getElementById(id);
    if (el) el.value = valor;
  }

  function json(chave, padrao) {
    try { return JSON.parse(localStorage.getItem(chave) || JSON.stringify(padrao)); }
    catch (_) { return padrao; }
  }

  function inicioSemana() {
    const d = new Date();
    const dia = d.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + diff);
    return d;
  }

  function dataValida(valor) {
    if (!valor) return null;
    if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor;
    const s = String(valor);
    const iso = s.match(/(20\d{2})-(\d{2})-(\d{2})/);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const br = s.match(/(\d{1,2})\/(\d{1,2})\/(20\d{2})/);
    if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function dataItem(item) {
    if (!item) return null;
    const candidatos = [item.dataRaw, item.data, item.date, item.inicio, item.dataHora, item.timestamp, item.criadoEm, item.dataTexto];
    for (const v of candidatos) {
      const d = dataValida(v);
      if (d) return d;
    }
    return null;
  }

  function numeroPeso(item) {
    if (!item) return NaN;
    const candidatos = [item.peso, item.weight, item.valor, item.value, item.kg];
    for (const v of candidatos) {
      const n = Number(String(v ?? "").replace(",", "."));
      if (Number.isFinite(n) && n > 20 && n < 400) return n;
    }
    return NaN;
  }

  function pontosPeso() {
    const lista = json("historicoPeso", []);
    if (!Array.isArray(lista)) return [];
    return lista.map(item => ({ data:dataItem(item), valor:numeroPeso(item) }))
      .filter(x => x.data && Number.isFinite(x.valor))
      .sort((a,b) => a.data - b.data);
  }

  function diarios() {
    const hist = json("historicoAlimentacao", {});
    if (!hist || Array.isArray(hist) || typeof hist !== "object") return [];
    return Object.entries(hist).map(([chave, item]) => {
      const data = dataValida(chave) || dataItem(item);
      const agua = Number(item && item.agua);
      let kcal = Number(item && item.kcal);
      if (!Number.isFinite(kcal) && item && item.kcal && typeof item.kcal === "object") kcal = Number(item.kcal.total || item.kcal.valor);
      return { data, chave, agua:Number.isFinite(agua) ? agua : 0, kcal:Number.isFinite(kcal) ? kcal : NaN };
    }).filter(x => x.data).sort((a,b) => a.data - b.data);
  }

  function treinos() {
    const lista = json("historicoTreinos", []);
    if (!Array.isArray(lista)) return [];
    return lista.map(item => ({ data:dataItem(item), item })).filter(x => x.data).sort((a,b) => a.data - b.data);
  }

  function dentroPeriodo(data, dias) {
    if (!data) return false;
    if (!dias) return true;
    const limite = new Date();
    limite.setHours(0,0,0,0);
    limite.setDate(limite.getDate() - (dias - 1));
    return data >= limite;
  }

  function mesmoDia(a,b) {
    return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
  }

  function metaAguaDiaria() {
    const texto = document.getElementById("aguaMetaDisplay")?.textContent || "2000";
    const n = Number(String(texto).replace(/\./g, "").replace(",", ".").match(/\d+(?:\.\d+)?/)?.[0]);
    return Number.isFinite(n) && n > 0 ? n : 2000;
  }

  function atualizarTudo() {
    atualizarTendencias();
    atualizarMetas();
    renderizarGrafico();
    acrescentarVersaoConta();
  }

  function atualizarTendencias() {
    const pesos = pontosPeso();
    const tPeso = document.getElementById("v4TrendPeso");
    if (tPeso) {
      const ultimos = pesos.filter(x => dentroPeriodo(x.data, 14));
      if (ultimos.length >= 2) {
        const dif = ultimos[ultimos.length-1].valor - ultimos[0].valor;
        preencherTrend(tPeso, `${dif > 0 ? "+" : ""}${dif.toFixed(1).replace(".",",")} kg`, dif === 0 ? "Sem mudança no período" : `comparando ${ultimos.length} registros recentes`, dif < 0 ? "down" : dif > 0 ? "up" : "");
      } else preencherTrend(tPeso, "--", "Registre pelo menos 2 pesos", "");
    }

    const listaDiarios = diarios();
    const agora = new Date();
    const ontem = new Date(); ontem.setDate(ontem.getDate()-1);
    const hojeD = listaDiarios.find(x => mesmoDia(x.data, agora));
    const ontemD = listaDiarios.find(x => mesmoDia(x.data, ontem));
    const tAgua = document.getElementById("v4TrendAgua");
    if (tAgua) {
      if (hojeD && ontemD) {
        const dif = hojeD.agua - ontemD.agua;
        preencherTrend(tAgua, `${dif >= 0 ? "+" : ""}${Math.round(dif)} ml`, dif === 0 ? "igual a ontem" : "comparado com ontem", dif > 0 ? "down" : dif < 0 ? "attention" : "");
      } else if (hojeD) preencherTrend(tAgua, `${Math.round(hojeD.agua)} ml`, "registrados hoje", "down");
      else preencherTrend(tAgua, "0 ml", "ainda sem água hoje", "");
    }

    const inicio = inicioSemana();
    const qtdTreinos = treinos().filter(x => x.data >= inicio).length;
    const tTreino = document.getElementById("v4TrendTreino");
    if (tTreino) preencherTrend(tTreino, `${qtdTreinos} ${qtdTreinos===1?"treino":"treinos"}`, "desde segunda-feira", qtdTreinos > 0 ? "down" : "");

    atualizarInsightLuma({ pesos, listaDiarios, qtdTreinos });
  }

  function preencherTrend(el, valor, sub, classe) {
    el.classList.remove("up","down","attention");
    if (classe) el.classList.add(classe);
    const v = el.querySelector(".v4-trend-value"), s = el.querySelector(".v4-trend-sub");
    if (v && v.textContent !== valor) v.textContent = valor;
    if (s && s.textContent !== sub) s.textContent = sub;
  }

  function atualizarInsightLuma(ctx) {
    const el = document.getElementById("todayLumaV2");
    if (!el) return;
    const inicio = inicioSemana();
    const pesoSemana = ctx.pesos.filter(x => x.data >= inicio);
    const aguaHoje = ctx.listaDiarios.find(x => mesmoDia(x.data, new Date()));
    const m = metas();
    let texto = "Continue registrando aos poucos. Com alguns dias de histórico, suas tendências ficam mais úteis.";
    if (pesoSemana.length >= 2) {
      const d = pesoSemana[pesoSemana.length-1].valor - pesoSemana[0].valor;
      texto = Math.abs(d) < .15 ? "Seu peso ficou praticamente estável nesta semana. O gráfico ajuda a enxergar a tendência além de um único dia." : `Nesta semana, seus registros mostram ${Math.abs(d).toFixed(1).replace(".",",")} kg de ${d < 0 ? "redução" : "aumento"}. Observe a tendência ao longo de vários dias.`;
    } else if (ctx.qtdTreinos >= m.treinos) {
      texto = `Você já alcançou sua meta de ${m.treinos} treinos na semana. O próximo passo é manter a consistência sem precisar exagerar.`;
    } else if (aguaHoje && aguaHoje.agua >= metaAguaDiaria()) {
      texto = "Sua meta de água de hoje já foi atingida. Mais um quadrinho verde para a semana. 💧";
    }
    if (el.textContent !== texto) el.textContent = texto;
  }

  function atualizarMetas() {
    const m = metas();
    const inicio = inicioSemana();
    const metaAgua = metaAguaDiaria();
    const diasAgua = diarios().filter(x => x.data >= inicio && x.agua >= metaAgua).length;
    const qtdTreinos = treinos().filter(x => x.data >= inicio).length;
    const qtdPeso = pontosPeso().filter(x => x.data >= inicio).length;
    atualizarMetaLinha("Water", diasAgua, m.aguaDias);
    atualizarMetaLinha("Workout", qtdTreinos, m.treinos);
    atualizarMetaLinha("Weight", qtdPeso, m.pesoRegistros);
  }

  function atualizarMetaLinha(nome, atual, meta) {
    const count = document.getElementById(`v4Goal${nome}Count`);
    const bar = document.getElementById(`v4Goal${nome}Bar`);
    if (count) count.textContent = `${atual}/${meta}`;
    if (bar) bar.style.width = `${Math.min(100, Math.round((atual / Math.max(1,meta))*100))}%`;
  }

  function dadosGrafico() {
    if (metricaGrafico === "peso") {
      const dados = pontosPeso().filter(x => dentroPeriodo(x.data, periodoGrafico));
      return { dados, tipo:"line", label:"Peso (kg)", unidade:"kg", valor:x=>x.valor };
    }
    if (metricaGrafico === "agua") {
      const dados = diarios().filter(x => dentroPeriodo(x.data, periodoGrafico));
      return { dados, tipo:"bar", label:"Água (ml)", unidade:"ml", valor:x=>x.agua };
    }
    const porDia = new Map();
    treinos().filter(x => dentroPeriodo(x.data, periodoGrafico)).forEach(x => {
      const chave = `${x.data.getFullYear()}-${String(x.data.getMonth()+1).padStart(2,"0")}-${String(x.data.getDate()).padStart(2,"0")}`;
      porDia.set(chave, (porDia.get(chave)||0)+1);
    });
    const dados = [...porDia.entries()].map(([chave,valor]) => ({data:dataValida(chave),valor})).sort((a,b)=>a.data-b.data);
    return { dados, tipo:"bar", label:"Treinos", unidade:"", valor:x=>x.valor };
  }

  function renderizarGrafico() {
    const canvas = document.getElementById("v4EvolutionChart");
    const vazio = document.getElementById("v4ChartEmpty");
    if (!canvas || !window.Chart) return;
    const cfg = dadosGrafico();
    const pontos = cfg.dados || [];
    const badge = document.getElementById("v4WeekBadge");
    if (badge) badge.textContent = periodoGrafico ? `últimos ${periodoGrafico} dias` : "histórico completo";

    if (!pontos.length) {
      if (grafico) { grafico.destroy(); grafico = null; }
      if (vazio) vazio.style.display = "grid";
      const sum = document.getElementById("v4ChartSummary");
      if (sum) sum.textContent = "Ainda não há dados suficientes neste período.";
      return;
    }
    if (vazio) vazio.style.display = "none";
    const labels = pontos.map(x => x.data.toLocaleDateString("pt-BR", {day:"2-digit",month:"2-digit"}));
    const valores = pontos.map(cfg.valor);
    if (grafico) grafico.destroy();
    const corTexto = getComputedStyle(document.body).getPropertyValue("--text-muted").trim() || "#64748b";
    const corGrade = getComputedStyle(document.body).getPropertyValue("--border-color").trim() || "rgba(148,163,184,.2)";
    grafico = new Chart(canvas.getContext("2d"), {
      type: cfg.tipo,
      data: { labels, datasets:[{ label:cfg.label, data:valores, borderColor:"#2563eb", backgroundColor:cfg.tipo==="line"?"rgba(37,99,235,.12)":"rgba(37,99,235,.65)", fill:cfg.tipo==="line", tension:.32, borderWidth:2, pointRadius:cfg.tipo==="line"?2.5:0, borderRadius:cfg.tipo==="bar"?7:0 }] },
      options: { responsive:true, maintainAspectRatio:false, animation:false, plugins:{ legend:{display:false}, tooltip:{displayColors:false} }, scales:{ x:{ticks:{color:corTexto,font:{size:9},maxRotation:0,autoSkip:true,maxTicksLimit:7},grid:{display:false}}, y:{beginAtZero:metricaGrafico!=="peso",ticks:{color:corTexto,font:{size:9}},grid:{color:corGrade}} } }
    });
    atualizarResumoGrafico(valores, cfg.unidade);
  }

  function atualizarResumoGrafico(valores, unidade) {
    const el = document.getElementById("v4ChartSummary");
    if (!el || !valores.length) return;
    let texto = "";
    if (metricaGrafico === "peso") {
      const dif = valores[valores.length-1] - valores[0];
      texto = valores.length === 1 ? `Há 1 registro no período: ${valores[0].toFixed(1).replace(".",",")} kg.` : `Do primeiro ao último registro do período: ${dif > 0 ? "+" : ""}${dif.toFixed(1).replace(".",",")} kg.`;
    } else if (metricaGrafico === "agua") {
      const media = valores.reduce((a,b)=>a+b,0)/valores.length;
      texto = `Média nos dias registrados: ${Math.round(media).toLocaleString("pt-BR")} ${unidade}.`;
    } else {
      const total = valores.reduce((a,b)=>a+b,0);
      texto = `${total} ${total===1?"treino registrado":"treinos registrados"} no período selecionado.`;
    }
    el.textContent = texto;
  }

  function prepararToquesAndroid() {
    if (document.body.dataset.v4Touch === "1") return;
    document.body.dataset.v4Touch = "1";
    document.addEventListener("click", (event) => {
      const alvo = event.target && event.target.closest ? event.target.closest("button,.floating-item,.food-tag") : null;
      if (alvo) toqueCurto();
    }, { passive:true });
  }

  function toqueCurto() {
    try { if (navigator.vibrate) navigator.vibrate(8); } catch (_) {}
  }

  function acrescentarVersaoConta() {
    const extra = document.getElementById("cloudAccountExtraV3");
    if (!extra || document.getElementById("v4AboutVersion")) return;
    const d = document.createElement("div");
    d.id = "v4AboutVersion";
    d.className = "v4-about";
    d.textContent = "EvoluaFit • canal de testes com atualização segura";
    extra.appendChild(d);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once:true });
  else setTimeout(iniciar, 0);
})();
