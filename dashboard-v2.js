/* ==========================================
   EVOLUAFIT - DASHBOARD V2
   Resumo do dia + navegação fixa + ações rápidas
========================================== */
(function () {
  if (window.__evoluaDashboardV2Loaded) return;
  window.__evoluaDashboardV2Loaded = true;

  const HOJE_ISO = () => new Date().toISOString().slice(0, 10);
  let sheetAberto = false;
  let timerAtualizacao = null;

  function iniciar() {
    if (!document.body || !document.getElementById("aba-dashboard")) return;
    document.body.classList.add("evolua-dashboard-v2");
    injetarEstilos();
    criarResumoHoje();
    prepararNavegacao();
    criarAcoesRapidas();
    atualizarTudo();
    observarTutorial();

    clearInterval(timerAtualizacao);
    timerAtualizacao = setInterval(atualizarTudo, 1600);
  }

  function injetarEstilos() {
    if (document.getElementById("evolua-dashboard-v2-style")) return;
    const style = document.createElement("style");
    style.id = "evolua-dashboard-v2-style";
    style.textContent = `
      body.evolua-dashboard-v2 .app-container { padding-bottom: 158px !important; }

      .today-overview-v2 {
        margin: -6px 0 16px;
        padding: 16px;
        border-radius: 20px;
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        box-shadow: 0 8px 26px rgba(15,23,42,.06);
      }
      .today-head-v2 { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:14px; }
      .today-eyebrow-v2 { font-size:11px; text-transform:uppercase; letter-spacing:.08em; color:var(--text-muted); font-weight:900; }
      .today-title-v2 { margin-top:3px; font-size:19px; line-height:1.15; font-weight:900; color:var(--text-main); }
      .today-date-v2 { margin-top:4px; color:var(--text-muted); font-size:12px; font-weight:650; }
      .today-register-v2 { flex:0 0 auto; min-height:40px; padding:9px 12px; border-radius:12px; background:#2563eb; color:#fff; border:0; font-size:13px; font-weight:850; box-shadow:0 7px 18px rgba(37,99,235,.18); }

      .today-grid-v2 { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:9px; }
      .today-metric-v2 { min-height:82px; border:1px solid var(--border-color); border-radius:16px; padding:11px 12px; background:rgba(148,163,184,.045); display:flex; flex-direction:column; justify-content:space-between; }
      .today-metric-top-v2 { display:flex; align-items:center; justify-content:space-between; gap:8px; color:var(--text-muted); font-size:11px; font-weight:800; }
      .today-metric-icon-v2 { width:28px; height:28px; border-radius:10px; display:grid; place-items:center; font-size:14px; background:rgba(37,99,235,.10); color:#2563eb; }
      .today-metric-icon-v2.water { background:rgba(14,165,233,.11); color:#0284c7; }
      .today-metric-icon-v2.food { background:rgba(249,115,22,.11); color:#ea580c; }
      .today-metric-icon-v2.workout { background:rgba(16,185,129,.11); color:#059669; }
      .today-metric-value-v2 { margin-top:7px; font-size:17px; line-height:1.1; font-weight:900; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .today-metric-sub-v2 { margin-top:3px; font-size:10.5px; color:var(--text-muted); font-weight:650; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

      .luma-mini-v2 { margin-top:10px; padding:11px 12px; display:grid; grid-template-columns:36px 1fr; gap:10px; align-items:center; border-radius:15px; background:linear-gradient(135deg,rgba(168,85,247,.08),rgba(37,99,235,.06)); border:1px solid rgba(168,85,247,.14); }
      .luma-mini-icon-v2 { width:36px; height:36px; border-radius:13px; display:grid; place-items:center; color:#9333ea; background:rgba(168,85,247,.11); font-size:17px; }
      .luma-mini-label-v2 { font-size:10px; color:#9333ea; font-weight:900; text-transform:uppercase; letter-spacing:.05em; }
      .luma-mini-text-v2 { margin-top:2px; color:var(--text-main); font-size:12px; line-height:1.35; font-weight:680; }

      body.evolua-dashboard-v2 .floating-nav { bottom:calc(6px + env(safe-area-inset-bottom)); height:72px; align-items:flex-end; pointer-events:none; }
      body.evolua-dashboard-v2 .floating-menu {
        position:fixed;
        left:8px;
        right:8px;
        bottom:calc(6px + env(safe-area-inset-bottom));
        width:auto;
        max-width:540px;
        margin:0 auto;
        height:66px;
        display:grid;
        grid-template-columns:repeat(5,1fr);
        gap:3px;
        padding:5px;
        border-radius:20px;
        opacity:1 !important;
        transform:none !important;
        pointer-events:auto !important;
        background:color-mix(in srgb,var(--card-bg) 92%,transparent);
        border:1px solid var(--border-color);
        box-shadow:0 13px 34px rgba(15,23,42,.16);
        backdrop-filter:blur(18px);
      }
      body.evolua-dashboard-v2 .floating-item {
        width:100%; height:54px; min-width:0; padding:5px 2px; border:0; box-shadow:none; border-radius:15px;
        opacity:1 !important; transform:none !important; pointer-events:auto; background:transparent; color:var(--text-muted);
        font-size:9px; gap:3px;
      }
      body.evolua-dashboard-v2 .floating-item i { font-size:18px; }
      body.evolua-dashboard-v2 .floating-item.active { background:rgba(37,99,235,.11); color:#2563eb; box-shadow:none; }
      [data-theme="dark"] body.evolua-dashboard-v2 .floating-item.active,
      body.evolua-dashboard-v2[data-theme="dark"] .floating-item.active { background:rgba(59,130,246,.18); color:#60a5fa; }

      body.evolua-dashboard-v2 .floating-main {
        position:fixed;
        left:50%;
        bottom:calc(69px + env(safe-area-inset-bottom));
        transform:translateX(-50%) !important;
        width:52px; height:52px; min-height:52px; padding:0; z-index:10005;
        background:#2563eb; border:4px solid var(--bg-color); box-shadow:0 9px 24px rgba(37,99,235,.30);
        animation:none !important; pointer-events:auto;
      }
      body.evolua-dashboard-v2 .floating-main::before,
      body.evolua-dashboard-v2 .floating-main::after { display:none !important; }
      body.evolua-dashboard-v2 .floating-main i { font-size:22px; animation:none !important; }

      .quick-backdrop-v2 { position:fixed; inset:0; z-index:10020; background:rgba(15,23,42,.42); backdrop-filter:blur(3px); opacity:0; pointer-events:none; transition:opacity .18s ease; }
      .quick-backdrop-v2.open { opacity:1; pointer-events:auto; }
      .quick-sheet-v2 { position:fixed; left:10px; right:10px; bottom:calc(132px + env(safe-area-inset-bottom)); z-index:10021; max-width:520px; margin:0 auto; padding:15px; border-radius:22px; border:1px solid var(--border-color); background:var(--card-bg); color:var(--text-main); box-shadow:0 24px 60px rgba(15,23,42,.26); transform:translateY(18px) scale(.97); opacity:0; pointer-events:none; transition:.2s ease; }
      .quick-sheet-v2.open { transform:translateY(0) scale(1); opacity:1; pointer-events:auto; }
      .quick-head-v2 { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:12px; }
      .quick-head-v2 strong { font-size:17px; }
      .quick-head-v2 span { display:block; margin-top:2px; color:var(--text-muted); font-size:11px; }
      .quick-close-v2 { width:36px; height:36px; padding:0; border-radius:12px; background:rgba(100,116,139,.12); color:var(--text-main); font-size:20px; }
      .quick-grid-v2 { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
      .quick-action-v2 { min-height:78px; padding:10px 6px; border-radius:16px; border:1px solid var(--border-color); background:rgba(148,163,184,.045); color:var(--text-main); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:7px; font-size:11px; font-weight:850; text-align:center; }
      .quick-action-v2 i { margin:0; font-size:21px; color:#2563eb; }
      .quick-action-v2[data-action="agua"] i { color:#0284c7; }
      .quick-action-v2[data-action="refeicao"] i { color:#ea580c; }
      .quick-action-v2[data-action="saude"] i { color:#dc2626; }
      .quick-action-v2[data-action="treino"] i { color:#059669; }
      .quick-action-v2[data-action="luma"] i { color:#9333ea; }

      .toast-v2 { position:fixed; left:50%; bottom:calc(146px + env(safe-area-inset-bottom)); transform:translate(-50%,14px); z-index:10040; padding:10px 14px; max-width:calc(100vw - 36px); border-radius:999px; background:#0f172a; color:#fff; font-size:12px; font-weight:800; box-shadow:0 12px 28px rgba(15,23,42,.25); opacity:0; pointer-events:none; transition:.2s ease; }
      .toast-v2.show { opacity:1; transform:translate(-50%,0); }

      @media (max-width:390px) {
        .today-overview-v2 { padding:14px; }
        .today-title-v2 { font-size:18px; }
        .today-register-v2 { padding:8px 10px; }
        body.evolua-dashboard-v2 .floating-item span { font-size:8px; }
      }
    `;
    document.head.appendChild(style);
  }

  function criarResumoHoje() {
    if (document.getElementById("todayOverviewV2")) return;
    const aba = document.getElementById("aba-dashboard");
    const header = aba && aba.querySelector("header");
    if (!aba || !header) return;

    const card = document.createElement("section");
    card.id = "todayOverviewV2";
    card.className = "today-overview-v2";
    card.innerHTML = `
      <div class="today-head-v2">
        <div>
          <div class="today-eyebrow-v2">Resumo de hoje</div>
          <div id="todayGreetingV2" class="today-title-v2">Seu dia em um relance</div>
          <div id="todayDateV2" class="today-date-v2"></div>
        </div>
        <button id="btnQuickRegisterV2" class="today-register-v2" type="button"><i class="bi bi-plus-lg"></i> Registrar</button>
      </div>
      <div class="today-grid-v2">
        <div class="today-metric-v2">
          <div class="today-metric-top-v2"><span>Peso</span><span class="today-metric-icon-v2"><i class="bi bi-speedometer2"></i></span></div>
          <div><div id="todayWeightV2" class="today-metric-value-v2">--</div><div id="todayWeightSubV2" class="today-metric-sub-v2">Aguardando registro</div></div>
        </div>
        <div class="today-metric-v2">
          <div class="today-metric-top-v2"><span>Água</span><span class="today-metric-icon-v2 water"><i class="bi bi-droplet-half"></i></span></div>
          <div><div id="todayWaterV2" class="today-metric-value-v2">0 ml</div><div id="todayWaterSubV2" class="today-metric-sub-v2">Meta 2.000 ml</div></div>
        </div>
        <div class="today-metric-v2">
          <div class="today-metric-top-v2"><span>Alimentação</span><span class="today-metric-icon-v2 food"><i class="bi bi-fire"></i></span></div>
          <div><div id="todayFoodV2" class="today-metric-value-v2">-- kcal</div><div id="todayFoodSubV2" class="today-metric-sub-v2">Diário de hoje</div></div>
        </div>
        <div class="today-metric-v2">
          <div class="today-metric-top-v2"><span>Treino</span><span class="today-metric-icon-v2 workout"><i class="bi bi-activity"></i></span></div>
          <div><div id="todayWorkoutV2" class="today-metric-value-v2">Ainda não</div><div id="todayWorkoutSubV2" class="today-metric-sub-v2">Toque em + para iniciar</div></div>
        </div>
      </div>
      <div class="luma-mini-v2">
        <div class="luma-mini-icon-v2"><i class="bi bi-stars"></i></div>
        <div><div class="luma-mini-label-v2">Luma</div><div id="todayLumaV2" class="luma-mini-text-v2">Vou acompanhando seus registros ao longo do dia.</div></div>
      </div>
    `;

    header.insertAdjacentElement("afterend", card);
    const botao = document.getElementById("btnQuickRegisterV2");
    if (botao) botao.addEventListener("click", abrirAcoesRapidas);
  }

  function prepararNavegacao() {
    const botao = document.getElementById("btnMenuLuma");
    if (!botao || botao.dataset.v2Ready === "1") return;
    botao.dataset.v2Ready = "1";
    botao.innerHTML = '<i class="bi bi-plus-lg"></i>';
    botao.setAttribute("aria-label", "Abrir ações rápidas");
    botao.setAttribute("title", "Registrar");

    document.addEventListener("click", function (event) {
      const alvo = event.target && event.target.closest ? event.target.closest("#btnMenuLuma") : null;
      if (!alvo) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      abrirAcoesRapidas();
    }, true);
  }

  function criarAcoesRapidas() {
    if (document.getElementById("quickSheetV2")) return;

    const backdrop = document.createElement("div");
    backdrop.id = "quickBackdropV2";
    backdrop.className = "quick-backdrop-v2";
    backdrop.addEventListener("click", fecharAcoesRapidas);

    const sheet = document.createElement("div");
    sheet.id = "quickSheetV2";
    sheet.className = "quick-sheet-v2";
    sheet.innerHTML = `
      <div class="quick-head-v2">
        <div><strong>Registrar rápido</strong><span>Escolha o que você quer atualizar agora</span></div>
        <button id="quickCloseV2" class="quick-close-v2" type="button" aria-label="Fechar">&times;</button>
      </div>
      <div class="quick-grid-v2">
        <button class="quick-action-v2" data-action="peso" type="button"><i class="bi bi-speedometer2"></i><span>Peso</span></button>
        <button class="quick-action-v2" data-action="agua" type="button"><i class="bi bi-droplet-half"></i><span>Água +250 ml</span></button>
        <button class="quick-action-v2" data-action="refeicao" type="button"><i class="bi bi-egg-fried"></i><span>Refeição</span></button>
        <button class="quick-action-v2" data-action="saude" type="button"><i class="bi bi-heart-pulse"></i><span>Saúde</span></button>
        <button class="quick-action-v2" data-action="treino" type="button"><i class="bi bi-activity"></i><span>Treino</span></button>
        <button class="quick-action-v2" data-action="luma" type="button"><i class="bi bi-stars"></i><span>Luma</span></button>
      </div>
    `;

    sheet.addEventListener("click", function (event) {
      const btn = event.target && event.target.closest ? event.target.closest("[data-action]") : null;
      if (!btn) return;
      executarAcao(btn.dataset.action);
    });

    const toast = document.createElement("div");
    toast.id = "toastV2";
    toast.className = "toast-v2";

    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);
    document.body.appendChild(toast);
    const fechar = document.getElementById("quickCloseV2");
    if (fechar) fechar.addEventListener("click", fecharAcoesRapidas);
  }

  function abrirAcoesRapidas() {
    const sheet = document.getElementById("quickSheetV2");
    const backdrop = document.getElementById("quickBackdropV2");
    if (!sheet || !backdrop) return;
    sheetAberto = true;
    sheet.classList.add("open");
    backdrop.classList.add("open");
  }

  function fecharAcoesRapidas() {
    const sheet = document.getElementById("quickSheetV2");
    const backdrop = document.getElementById("quickBackdropV2");
    sheetAberto = false;
    if (sheet) sheet.classList.remove("open");
    if (backdrop) backdrop.classList.remove("open");
  }

  function irParaAba(aba) {
    if (typeof window.trocarAba === "function") {
      const btn = document.querySelector(`.floating-item[data-aba="${aba}"]`);
      window.trocarAba(aba, btn || null);
    }
  }

  function rolarPara(elemento) {
    if (!elemento) return;
    setTimeout(function () {
      try { elemento.scrollIntoView({ behavior: "smooth", block: "center" }); } catch (_) {}
      if (typeof elemento.focus === "function") setTimeout(() => elemento.focus(), 450);
    }, 180);
  }

  function executarAcao(acao) {
    fecharAcoesRapidas();

    if (acao === "peso") {
      irParaAba("dashboard");
      rolarPara(document.getElementById("pesoInput"));
      return;
    }

    if (acao === "agua") {
      irParaAba("alimentacao");
      if (typeof window.adicionarAgua === "function") {
        window.adicionarAgua(250);
        mostrarToast("+250 ml de água registrados 💧");
        setTimeout(atualizarTudo, 250);
      } else {
        rolarPara(document.querySelector(".card-water"));
      }
      return;
    }

    if (acao === "refeicao") {
      irParaAba("alimentacao");
      const hora = new Date().getHours();
      const id = hora < 11 ? "custom-cafe" : hora < 17 ? "custom-almoco" : "custom-jantar";
      rolarPara(document.getElementById(id));
      return;
    }

    if (acao === "saude") {
      irParaAba("saude");
      rolarPara(document.querySelector('#aba-saude input[type="number"], #aba-saude input[type="text"]'));
      return;
    }

    if (acao === "treino") {
      irParaAba("exercicio");
      rolarPara(document.getElementById("btnIniciarTreino"));
      return;
    }

    if (acao === "luma") {
      irParaAba("ia");
      rolarPara(document.getElementById("btnAnalisarDia"));
    }
  }

  function mostrarToast(texto) {
    const toast = document.getElementById("toastV2");
    if (!toast) return;
    toast.textContent = texto;
    toast.classList.add("show");
    clearTimeout(toast.__timer);
    toast.__timer = setTimeout(() => toast.classList.remove("show"), 1900);
  }

  function texto(id) {
    const el = document.getElementById(id);
    return el ? String(el.textContent || "").trim() : "";
  }

  function numeroDeTexto(valor) {
    const encontrado = String(valor || "").replace(/\./g, "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
    return encontrado ? Number(encontrado[0]) : NaN;
  }

  function nomeUsuario() {
    try {
      const perfil = JSON.parse(localStorage.getItem("usuarioPerfil") || "null") || {};
      return String(perfil.nome || perfil.name || "").trim().split(/\s+/)[0];
    } catch (_) {
      return "";
    }
  }

  function saudacao() {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }

  function treinoHoje() {
    try {
      const lista = JSON.parse(localStorage.getItem("historicoTreinos") || "[]");
      if (!Array.isArray(lista) || !lista.length) return false;
      const hoje = HOJE_ISO();
      return lista.some((item) => {
        const candidatos = [item && item.data, item && item.date, item && item.inicio, item && item.criadoEm, item && item.timestamp, item && item.dataHora];
        if (candidatos.some((v) => String(v || "").slice(0, 10) === hoje)) return true;
        try { return JSON.stringify(item).includes(hoje); } catch (_) { return false; }
      });
    } catch (_) {
      return false;
    }
  }

  function atualizarTudo() {
    atualizarCabecalho();
    atualizarResumo();
    ajustarTutorialAtual();
  }

  function atualizarCabecalho() {
    const h1 = document.querySelector("#aba-dashboard header h1");
    const p = document.querySelector("#aba-dashboard header p");
    const nome = nomeUsuario();
    if (h1) h1.textContent = `${saudacao()}${nome ? `, ${nome}` : ""}!`;
    if (p) p.textContent = "Veja seu dia em um relance";

    const greeting = document.getElementById("todayGreetingV2");
    const data = document.getElementById("todayDateV2");
    if (greeting) greeting.textContent = nome ? `Como está seu dia, ${nome}?` : "Como está seu dia?";
    if (data) data.textContent = new Intl.DateTimeFormat("pt-BR", { weekday:"long", day:"2-digit", month:"long" }).format(new Date());
  }

  function atualizarResumo() {
    const pesoTexto = texto("pesoAtualCard");
    const pesoValido = /\d/.test(pesoTexto) && !pesoTexto.includes("--");
    setTexto("todayWeightV2", pesoValido ? pesoTexto.replace(/\s+/g, " ") : "Sem registro");
    setTexto("todayWeightSubV2", pesoValido ? `Meta ${texto("pesoMetaCard") || "definida"}` : "Registre seu peso de hoje");

    const aguaAtual = numeroDeTexto(texto("aguaAtualDisplay"));
    const aguaMeta = numeroDeTexto(texto("aguaMetaDisplay"));
    const aguaA = Number.isFinite(aguaAtual) ? aguaAtual : 0;
    const aguaM = Number.isFinite(aguaMeta) && aguaMeta > 0 ? aguaMeta : 2000;
    setTexto("todayWaterV2", `${Math.round(aguaA).toLocaleString("pt-BR")} ml`);
    setTexto("todayWaterSubV2", `Meta ${Math.round(aguaM).toLocaleString("pt-BR")} ml`);

    const kcal = numeroDeTexto(texto("kcal-total"));
    const metaKcal = numeroDeTexto(texto("kcal-meta-luma"));
    setTexto("todayFoodV2", Number.isFinite(kcal) ? `${Math.round(kcal)} kcal` : "Sem diário");
    setTexto("todayFoodSubV2", Number.isFinite(metaKcal) ? `Meta ${Math.round(metaKcal)} kcal` : "Diário de hoje");

    const fezTreino = treinoHoje();
    setTexto("todayWorkoutV2", fezTreino ? "Feito hoje ✓" : "Ainda não");
    setTexto("todayWorkoutSubV2", fezTreino ? "Treino registrado" : "Toque em + para iniciar");

    setTexto("todayLumaV2", insightLuma({ pesoValido, aguaA, aguaM, kcal, metaKcal, fezTreino }));
  }

  function insightLuma(d) {
    const hora = new Date().getHours();
    const proporcaoAgua = d.aguaM > 0 ? d.aguaA / d.aguaM : 0;

    if (!d.pesoValido) return "Comece registrando seu peso. Ele ajuda a montar uma visão melhor da sua evolução.";
    if (hora >= 12 && proporcaoAgua < .45) return "Sua hidratação ainda está abaixo da metade da meta. Um copo agora já empurra o dia na direção certa.";
    if (Number.isFinite(d.kcal) && Number.isFinite(d.metaKcal) && d.kcal > d.metaKcal) return "Seu diário já passou da meta de kcal de hoje. Use a Luma para revisar o restante do dia sem radicalismos.";
    if (!d.fezTreino && hora >= 17) return "Ainda não há treino hoje. Se fizer sentido para você, uma atividade leve já conta como progresso.";
    if (d.fezTreino) return "Treino registrado. Continue alimentando o diário para eu enxergar seu dia por inteiro.";
    return "Seus registros estão formando um retrato do dia. Água, alimentação e treino ficam mais úteis quando entram aos poucos.";
  }

  function setTexto(id, valor) {
    const el = document.getElementById(id);
    if (el && el.textContent !== valor) el.textContent = valor;
  }

  function observarTutorial() {
    const observer = new MutationObserver(ajustarTutorialAtual);
    observer.observe(document.body, { childList:true, subtree:true, characterData:true });
  }

  function ajustarTutorialAtual() {
    const textoEl = document.getElementById("tutorialTexto");
    const tituloEl = document.getElementById("tutorialTitulo");
    if (!textoEl) return;
    const atual = String(textoEl.textContent || "");
    if (atual.includes("Use este botão para navegar entre Evolução")) {
      textoEl.textContent = "A barra inferior fica sempre visível para navegar. O botão + abre Peso, Água, Refeição, Saúde, Treino e Luma em um toque.";
      if (tituloEl) tituloEl.textContent = "Navegação e registro rápido";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once:true });
  } else {
    setTimeout(iniciar, 0);
  }
})();
