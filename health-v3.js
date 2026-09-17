/* EvoluaFit - Saúde V3 */
(function () {
  if (window.__evoluaHealthV3) return;
  window.__evoluaHealthV3 = true;

  let periodo = 30;
  let chartPressao = null;
  let chartGlicose = null;

  const $ = (id) => document.getElementById(id);
  const parse = (txt, fallback) => { try { const v = JSON.parse(txt); return v == null ? fallback : v; } catch (_) { return fallback; } };

  function historico() {
    const v = parse(localStorage.getItem("historicoSaude") || "[]", []);
    return Array.isArray(v) ? v : [];
  }

  function ordenar(lista) {
    return lista.slice().sort((a, b) => {
      const da = String((a && a.dataRaw) || "");
      const db = String((b && b.dataRaw) || "");
      if (da !== db) return da.localeCompare(db);
      return Number((a && a.id) || 0) - Number((b && b.id) || 0);
    });
  }

  function dataCurta(iso) {
    const p = String(iso || "").split("-");
    return p.length === 3 ? `${p[2]}/${p[1]}` : String(iso || "");
  }

  function momento(valor) {
    return ({ jejum:"Jejum", antes_refeicao:"Antes da refeição", apos_refeicao:"Após refeição", antes_dormir:"Antes de dormir", outro:"Outro" })[valor] || valor || "";
  }

  function estilos() {
    if ($("evolua-health-v3-style")) return;
    const s = document.createElement("style");
    s.id = "evolua-health-v3-style";
    s.textContent = `
      .health-overview-v3{margin-bottom:12px;padding:14px;border:1px solid var(--border-color);border-radius:18px;background:var(--card-bg)}
      .health-overview-head-v3{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:11px}.health-overview-head-v3 strong{font-size:16px}.health-overview-head-v3 small{display:block;margin-top:3px;color:var(--text-muted);font-size:11px}.health-overview-pill-v3{padding:6px 9px;border-radius:999px;background:rgba(16,185,129,.11);color:#047857;font-size:10px;font-weight:900;white-space:nowrap}
      .health-overview-grid-v3{display:grid;grid-template-columns:1fr 1fr;gap:8px}.health-overview-item-v3{padding:11px 12px;border:1px solid var(--border-color);border-radius:14px;background:rgba(148,163,184,.045)}.health-overview-label-v3{color:var(--text-muted);font-size:10px;font-weight:850;text-transform:uppercase}.health-overview-value-v3{margin-top:5px;font-size:18px;line-height:1.1;font-weight:900}.health-overview-sub-v3{margin-top:3px;color:var(--text-muted);font-size:10px}
      #aba-saude .card-saude-aviso{padding:11px 13px;border-radius:14px;background:rgba(14,165,233,.055)}#aba-saude .card-saude-aviso h3{margin-bottom:5px;font-size:13px}#aba-saude .card-saude-aviso p{font-size:11px;line-height:1.45}
      .health-collapsible-v3{margin-bottom:12px}.health-collapse-toggle-v3{width:100%;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 13px;border-radius:14px;background:var(--card-bg);color:var(--text-main);border:1px solid var(--border-color);text-align:left}.health-collapse-toggle-v3 span{display:flex;align-items:center;gap:9px;font-size:13px;font-weight:850}.health-collapse-toggle-v3 small{color:var(--text-muted);font-size:10px;font-weight:700}.health-collapsible-v3.collapsed .health-collapse-body-v3{display:none}.health-collapse-body-v3{margin-top:8px}.health-collapse-body-v3>.card{margin-bottom:0}
      .health-register-shell-v3{margin-bottom:12px;border:1px solid var(--border-color);border-radius:18px;background:var(--card-bg);overflow:hidden}.health-tabs-v3{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:6px;background:rgba(148,163,184,.06)}.health-tab-v3{min-height:42px;padding:8px 10px;border-radius:12px;border:0;background:transparent;color:var(--text-muted);font-size:12px;font-weight:850}.health-tab-v3.active{background:var(--card-bg);color:#2563eb;box-shadow:0 4px 14px rgba(15,23,42,.08)}.health-register-body-v3{padding:8px 10px 2px}.health-register-body-v3 .card-saude{border:0;box-shadow:none;padding:10px 4px 12px;margin:0;background:transparent}.health-register-body-v3 .card-saude.is-hidden-v3{display:none}#aba-saude .btn-saude-salvar{margin-top:0}
      #cardGraficosSaude{display:none!important}.health-trends-v3{margin-top:14px}.health-trends-head-v3{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.health-trends-title-v3{font-size:15px;font-weight:900}.health-periods-v3{display:flex;gap:5px}.health-period-v3{min-height:32px;padding:6px 9px;border-radius:10px;border:1px solid var(--border-color);background:var(--card-bg);color:var(--text-muted);font-size:10px;font-weight:850}.health-period-v3.active{background:#2563eb;color:#fff;border-color:#2563eb}.health-chart-box-v3{min-height:185px;padding:10px 6px 2px;border:1px solid var(--border-color);border-radius:15px;margin-top:8px}.health-chart-box-v3 h4{margin:0 0 7px 7px;font-size:11px;color:var(--text-muted);font-weight:850}.health-chart-canvas-v3{width:100%!important;height:155px!important}.health-trend-empty-v3{display:none;padding:18px 8px;text-align:center;color:var(--text-muted);font-size:11px}
    `;
    document.head.appendChild(s);
  }

  function montarResumo() {
    const aba = $("aba-saude");
    if (!aba || $("healthOverviewV3")) return;
    const header = aba.querySelector("header");
    if (!header) return;
    const card = document.createElement("section");
    card.id = "healthOverviewV3";
    card.className = "health-overview-v3";
    card.innerHTML = `<div class="health-overview-head-v3"><div><strong>Resumo de saúde</strong><small>Seus registros mais recentes</small></div><span class="health-overview-pill-v3"><i class="bi bi-shield-check"></i> Acompanhamento</span></div><div class="health-overview-grid-v3"><div class="health-overview-item-v3"><div class="health-overview-label-v3">Pressão</div><div id="healthLatestPressureV3" class="health-overview-value-v3">-- / --</div><div id="healthLatestPressureSubV3" class="health-overview-sub-v3">Sem registro</div></div><div class="health-overview-item-v3"><div class="health-overview-label-v3">Glicose</div><div id="healthLatestGlucoseV3" class="health-overview-value-v3">--</div><div id="healthLatestGlucoseSubV3" class="health-overview-sub-v3">Sem registro</div></div></div>`;
    header.insertAdjacentElement("afterend", card);
  }

  function compactarLembretes() {
    const aba = $("aba-saude");
    const card = aba && aba.querySelector(".card-lembretes-luma");
    if (!card || card.dataset.v3Compact === "1") return;
    card.dataset.v3Compact = "1";
    const wrap = document.createElement("div");
    wrap.className = "health-collapsible-v3 collapsed";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "health-collapse-toggle-v3";
    btn.innerHTML = '<span><i class="bi bi-bell"></i> Lembretes da Luma</span><small>Abrir</small>';
    const body = document.createElement("div");
    body.className = "health-collapse-body-v3";
    card.parentNode.insertBefore(wrap, card); wrap.append(btn, body); body.appendChild(card);
    btn.addEventListener("click", () => { wrap.classList.toggle("collapsed"); btn.querySelector("small").textContent = wrap.classList.contains("collapsed") ? "Abrir" : "Fechar"; });
  }

  function compactarRegistro() {
    const aba = $("aba-saude");
    if (!aba || $("healthRegisterShellV3")) return;
    const p = aba.querySelector(".card-pressao");
    const g = aba.querySelector(".card-glicose");
    if (!p || !g) return;
    const shell = document.createElement("section");
    shell.id = "healthRegisterShellV3";
    shell.className = "health-register-shell-v3";
    shell.innerHTML = '<div class="health-tabs-v3"><button type="button" class="health-tab-v3 active" data-tab="p"><i class="bi bi-heart-pulse"></i> Pressão</button><button type="button" class="health-tab-v3" data-tab="g"><i class="bi bi-droplet"></i> Glicose</button></div><div class="health-register-body-v3"></div>';
    p.parentNode.insertBefore(shell, p);
    const body = shell.querySelector(".health-register-body-v3"); body.append(p, g); g.classList.add("is-hidden-v3");
    shell.querySelectorAll("[data-tab]").forEach(btn => btn.addEventListener("click", () => {
      shell.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("active", b === btn));
      const pressao = btn.dataset.tab === "p"; p.classList.toggle("is-hidden-v3", !pressao); g.classList.toggle("is-hidden-v3", pressao);
    }));
  }

  function montarGraficos() {
    const aba = $("aba-saude");
    if (!aba || $("healthTrendsV3")) return;
    const historicoSection = aba.querySelector(".history-section");
    if (!historicoSection) return;
    const card = document.createElement("section");
    card.id = "healthTrendsV3"; card.className = "card health-trends-v3";
    card.innerHTML = '<div class="health-trends-head-v3"><div class="health-trends-title-v3"><i class="bi bi-graph-up-arrow"></i> Tendências</div><div class="health-periods-v3"><button type="button" class="health-period-v3" data-days="7">7d</button><button type="button" class="health-period-v3 active" data-days="30">30d</button><button type="button" class="health-period-v3" data-days="90">90d</button></div></div><div id="healthTrendEmptyV3" class="health-trend-empty-v3">Ainda não há registros neste período.</div><div class="health-chart-box-v3"><h4>Pressão arterial</h4><canvas id="healthPressureChartV3" class="health-chart-canvas-v3"></canvas></div><div class="health-chart-box-v3"><h4>Glicose</h4><canvas id="healthGlucoseChartV3" class="health-chart-canvas-v3"></canvas></div>';
    historicoSection.parentNode.insertBefore(card, historicoSection);
    card.querySelectorAll("[data-days]").forEach(btn => btn.addEventListener("click", () => { periodo = Number(btn.dataset.days) || 30; card.querySelectorAll("[data-days]").forEach(b => b.classList.toggle("active", b === btn)); render(); }));
    setTimeout(render, 300);
  }

  function atualizarResumo() {
    const dados = ordenar(historico()).reverse();
    const p = dados.find(i => i && i.pressao);
    const g = dados.find(i => i && i.glicose);
    if ($("healthLatestPressureV3")) $("healthLatestPressureV3").textContent = p ? `${p.pressao.sistolica || "--"} / ${p.pressao.diastolica || "--"}` : "-- / --";
    if ($("healthLatestPressureSubV3")) $("healthLatestPressureSubV3").textContent = p ? `${dataCurta(p.dataRaw)}${p.pressao.batimentos ? ` • ${p.pressao.batimentos} bpm` : ""}` : "Sem registro";
    if ($("healthLatestGlucoseV3")) $("healthLatestGlucoseV3").textContent = g ? `${g.glicose.valor || "--"} mg/dL` : "--";
    if ($("healthLatestGlucoseSubV3")) $("healthLatestGlucoseSubV3").textContent = g ? `${dataCurta(g.dataRaw)}${g.glicose.momento ? ` • ${momento(g.glicose.momento)}` : ""}` : "Sem registro";
  }

  function periodoDados() {
    const fim = new Date(); fim.setHours(23,59,59,999);
    const inicio = new Date(fim); inicio.setDate(inicio.getDate() - (periodo - 1)); inicio.setHours(0,0,0,0);
    return ordenar(historico()).filter(i => { if (!i || !i.dataRaw) return false; const d = new Date(`${i.dataRaw}T12:00:00`); return d >= inicio && d <= fim; });
  }

  function opts(text, grid) {
    return { responsive:true, maintainAspectRatio:false, interaction:{mode:"index",intersect:false}, plugins:{legend:{labels:{color:text,boxWidth:10,usePointStyle:true,font:{size:10}}}}, scales:{x:{ticks:{color:text,maxTicksLimit:6,font:{size:9}},grid:{display:false}},y:{ticks:{color:text,font:{size:9}},grid:{color:grid}}} };
  }

  function render() {
    if (!window.Chart || !$("healthTrendsV3")) return;
    const d = periodoDados(); const ps = d.filter(i => i && i.pressao); const gs = d.filter(i => i && i.glicose);
    if ($("healthTrendEmptyV3")) $("healthTrendEmptyV3").style.display = (ps.length || gs.length) ? "none" : "block";
    if (chartPressao) chartPressao.destroy(); if (chartGlicose) chartGlicose.destroy();
    const cs = getComputedStyle(document.documentElement); const text = cs.getPropertyValue("--text-muted").trim() || "#64748b"; const grid = cs.getPropertyValue("--border-color").trim() || "#e2e8f0";
    const pc = $("healthPressureChartV3"), gc = $("healthGlucoseChartV3"); if (!pc || !gc) return;
    chartPressao = new Chart(pc,{type:"line",data:{labels:ps.map(i=>dataCurta(i.dataRaw)),datasets:[{label:"Sistólica",data:ps.map(i=>Number(i.pressao.sistolica)||null),borderWidth:2,tension:.28,pointRadius:3},{label:"Diastólica",data:ps.map(i=>Number(i.pressao.diastolica)||null),borderWidth:2,tension:.28,pointRadius:3}]},options:opts(text,grid)});
    chartGlicose = new Chart(gc,{type:"line",data:{labels:gs.map(i=>dataCurta(i.dataRaw)),datasets:[{label:"Glicose",data:gs.map(i=>Number(i.glicose.valor)||null),borderWidth:2,tension:.28,pointRadius:3}]},options:opts(text,grid)});
  }

  function iniciar() { estilos(); montarResumo(); compactarLembretes(); compactarRegistro(); montarGraficos(); atualizarResumo(); setInterval(() => { atualizarResumo(); if ($("aba-saude") && $("aba-saude").style.display !== "none") render(); }, 2500); }
  document.addEventListener("DOMContentLoaded", iniciar); if (document.readyState !== "loading") setTimeout(iniciar,0);
})();
