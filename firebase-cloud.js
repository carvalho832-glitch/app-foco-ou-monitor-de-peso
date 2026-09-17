/* ==========================================
   EVOLUAFIT I.A. - CONTA E NUVEM FIREBASE
   Autenticação + backup do localStorage no Cloud Firestore
========================================== */

(function () {
  const CHAVES_SINCRONIZADAS = [
    "historicoPeso",
    "historicoAlimentacao",
    "historicoTreinos",
    "historicoSaude",
    "usuarioAltura",
    "usuarioMeta",
    "usuarioMetaKcal",
    "usuarioPerfil",
    "usuarioTema",
    "analiseIACache",
    "treinoIACache",
    "lumaLembretes"
  ];

  const CHAVE_ULTIMA_SYNC = "evoluafitUltimaSync";
  const localSetItemOriginal = localStorage.setItem.bind(localStorage);
  let auth = null;
  let db = null;
  let usuarioAtual = null;
  let timerSync = null;
  let restaurandoDaNuvem = false;
  let autoSyncLiberado = false;
  let criandoContaAgora = false;
  let ultimaSyncEm = lerUltimaSyncLocal();
  let overflowAnterior = "";

  document.addEventListener("DOMContentLoaded", iniciarFirebaseEvoluaFit);

  async function iniciarFirebaseEvoluaFit() {
    criarEstilosNuvem();
    criarPainelConta();
    atualizarUltimaSyncUI();

    const config = window.EVOLUAFIT_FIREBASE_CONFIG || {};
    if (!config.apiKey || !config.projectId || !config.appId) {
      atualizarStatusNuvem(
        "Firebase ainda não configurado. Adicione os dados do projeto em firebase-config.js.",
        "erro"
      );
      atualizarPill("Configurar", "erro");
      return;
    }

    if (!window.firebase || !window.firebase.initializeApp) {
      atualizarStatusNuvem(
        "Não consegui carregar o Firebase. Verifique a internet e reabra o app.",
        "erro"
      );
      atualizarPill("Erro", "erro");
      return;
    }

    try {
      if (!window.firebase.apps.length) {
        window.firebase.initializeApp(config);
      }

      auth = window.firebase.auth();
      db = window.firebase.firestore();
      await auth.setPersistence(window.firebase.auth.Auth.Persistence.LOCAL);

      configurarEventosNuvem();
      interceptarLocalStorage();

      auth.onAuthStateChanged(async function (usuario) {
        usuarioAtual = usuario || null;
        autoSyncLiberado = false;
        atualizarTelaNuvem();

        if (usuarioAtual && !criandoContaAgora) {
          await prepararSessaoNuvem();
        }
      });
    } catch (erro) {
      console.error("Firebase init:", erro);
      atualizarStatusNuvem(`Erro ao iniciar Firebase: ${traduzirErro(erro)}`, "erro");
      atualizarPill("Erro", "erro");
    }
  }

  function criarEstilosNuvem() {
    if (document.getElementById("evoluafit-cloud-style")) return;

    const style = document.createElement("style");
    style.id = "evoluafit-cloud-style";
    style.innerHTML = `
      .cloud-top-row-evoluafit { display:flex; gap:8px; align-items:center; justify-content:flex-end; }
      .cloud-account-trigger-evoluafit { position:relative; display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:38px; padding:9px 12px; border:1px solid var(--border-color); border-radius:12px; background:var(--card-bg); color:var(--text-main); font-weight:700; font-size:13px; cursor:pointer; }
      .cloud-account-trigger-evoluafit .cloud-trigger-dot { width:8px; height:8px; border-radius:50%; background:#94a3b8; box-shadow:0 0 0 3px rgba(148,163,184,.13); }
      .cloud-account-trigger-evoluafit.online .cloud-trigger-dot { background:#10b981; box-shadow:0 0 0 3px rgba(16,185,129,.14); }
      .cloud-account-trigger-evoluafit.erro .cloud-trigger-dot { background:#ef4444; box-shadow:0 0 0 3px rgba(239,68,68,.14); }
      .cloud-account-trigger-evoluafit.alerta .cloud-trigger-dot { background:#f59e0b; box-shadow:0 0 0 3px rgba(245,158,11,.16); }

      .cloud-modal-evoluafit { position:fixed; inset:0; z-index:10050; display:none; align-items:flex-end; justify-content:center; background:rgba(15,23,42,.52); backdrop-filter:blur(5px); padding:14px; }
      .cloud-modal-evoluafit.aberto { display:flex; }
      .cloud-sheet-evoluafit { width:min(100%,480px); max-height:88vh; overflow:auto; border:1px solid var(--border-color); border-radius:24px 24px 18px 18px; background:var(--card-bg); color:var(--text-main); box-shadow:0 24px 70px rgba(15,23,42,.28); padding:18px; animation:cloudSheetIn .18s ease-out; }
      @keyframes cloudSheetIn { from { transform:translateY(18px); opacity:.5; } to { transform:translateY(0); opacity:1; } }
      .cloud-sheet-head-evoluafit { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:16px; }
      .cloud-sheet-title-evoluafit { display:flex; align-items:center; gap:11px; }
      .cloud-sheet-icon-evoluafit { width:42px; height:42px; border-radius:14px; display:grid; place-items:center; background:rgba(14,165,233,.12); color:#0284c7; font-size:20px; flex:0 0 auto; }
      .cloud-sheet-title-evoluafit h3 { margin:0 0 3px; font-size:19px; }
      .cloud-sheet-title-evoluafit p { margin:0; color:var(--text-muted); font-size:12px; line-height:1.35; }
      .cloud-close-evoluafit { width:38px; height:38px; border:0; border-radius:12px; background:rgba(100,116,139,.12); color:var(--text-main); font-size:20px; cursor:pointer; }

      .cloud-summary-evoluafit { display:grid; grid-template-columns:1fr auto; align-items:center; gap:12px; padding:14px; border-radius:17px; background:linear-gradient(135deg,rgba(14,165,233,.10),rgba(16,185,129,.08)); border:1px solid rgba(14,165,233,.16); margin-bottom:14px; }
      .cloud-summary-label-evoluafit { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--text-muted); font-weight:800; }
      .cloud-summary-value-evoluafit { margin-top:4px; font-size:13px; font-weight:800; line-height:1.35; word-break:break-word; }
      .cloud-pill-evoluafit { display:inline-flex; align-items:center; justify-content:center; padding:7px 10px; border-radius:999px; font-size:11px; font-weight:900; white-space:nowrap; background:rgba(100,116,139,.14); color:var(--text-muted); }
      .cloud-pill-evoluafit.ok { background:rgba(16,185,129,.15); color:#059669; }
      .cloud-pill-evoluafit.erro { background:rgba(239,68,68,.14); color:#dc2626; }
      .cloud-pill-evoluafit.alerta { background:rgba(245,158,11,.16); color:#b45309; }

      .cloud-form-evoluafit { display:grid; gap:10px; }
      .cloud-form-evoluafit input { width:100%; box-sizing:border-box; border:1px solid var(--border-color); border-radius:14px; padding:13px 14px; background:var(--card-bg); color:var(--text-main); font-size:14px; outline:none; }
      .cloud-actions-evoluafit,.cloud-logged-actions-evoluafit { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .cloud-actions-evoluafit button,.cloud-logged-actions-evoluafit button { border:0; border-radius:14px; padding:12px 10px; font-weight:800; font-size:13px; cursor:pointer; min-height:44px; }
      .cloud-btn-primary-evoluafit { background:#2563eb; color:#fff; }
      .cloud-btn-success-evoluafit { background:#10b981; color:#fff; }
      .cloud-btn-dark-evoluafit { background:#0f172a; color:#fff; }
      .cloud-btn-light-evoluafit { background:rgba(100,116,139,.14); color:var(--text-main); }
      .cloud-btn-danger-evoluafit { background:rgba(239,68,68,.12); color:#dc2626; }

      .cloud-user-evoluafit { padding:12px 13px; border-radius:14px; background:rgba(14,165,233,.08); color:var(--text-main); font-size:13px; font-weight:800; word-break:break-word; }
      .cloud-sync-meta-evoluafit { display:flex; align-items:center; justify-content:space-between; gap:10px; margin:10px 2px 14px; color:var(--text-muted); font-size:12px; }
      .cloud-status-evoluafit { margin-top:12px; padding:11px 12px; border-radius:14px; background:rgba(100,116,139,.10); color:var(--text-muted); font-size:12px; line-height:1.4; font-weight:650; }
      .cloud-status-evoluafit.ok { background:rgba(16,185,129,.12); color:#047857; }
      .cloud-status-evoluafit.erro { background:rgba(239,68,68,.11); color:#b91c1c; }
      .cloud-status-evoluafit.alerta { background:rgba(245,158,11,.13); color:#92400e; }
      .cloud-section-label-evoluafit { margin:14px 2px 8px; color:var(--text-muted); font-size:11px; font-weight:900; letter-spacing:.05em; text-transform:uppercase; }

      [data-theme="dark"] .cloud-sheet-evoluafit { background:#0f172a; }
      [data-theme="dark"] .cloud-account-trigger-evoluafit { background:#111827; }
      @media (min-width:700px) { .cloud-modal-evoluafit { align-items:center; } .cloud-sheet-evoluafit { border-radius:24px; } }
      @media (max-width:420px) { .cloud-actions-evoluafit,.cloud-logged-actions-evoluafit { grid-template-columns:1fr; } .cloud-account-trigger-evoluafit span.cloud-trigger-text { display:none; } }
    `;
    document.head.appendChild(style);
  }

  function criarPainelConta() {
    if (document.getElementById("cloudAccountModalEvoluaFit")) return;

    const abaDashboard = document.getElementById("aba-dashboard");
    const header = abaDashboard && abaDashboard.querySelector("header");
    if (header) {
      const painelDireita = header.lastElementChild;
      const btnTema = document.getElementById("btnTema");
      if (painelDireita && btnTema) {
        let linhaTopo = document.getElementById("cloudTopRowEvoluaFit");
        if (!linhaTopo) {
          linhaTopo = document.createElement("div");
          linhaTopo.id = "cloudTopRowEvoluaFit";
          linhaTopo.className = "cloud-top-row-evoluafit";
          painelDireita.insertBefore(linhaTopo, painelDireita.firstChild);
          linhaTopo.appendChild(btnTema);
        }

        const botaoConta = document.createElement("button");
        botaoConta.id = "btnCloudContaEvoluaFit";
        botaoConta.type = "button";
        botaoConta.className = "cloud-account-trigger-evoluafit";
        botaoConta.innerHTML = `
          <span id="cloudTriggerDotEvoluaFit" class="cloud-trigger-dot"></span>
          <i class="bi bi-person-circle"></i>
          <span class="cloud-trigger-text">Conta</span>
        `;
        linhaTopo.appendChild(botaoConta);
      }
    }

    const modal = document.createElement("div");
    modal.id = "cloudAccountModalEvoluaFit";
    modal.className = "cloud-modal-evoluafit";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="cloud-sheet-evoluafit" role="dialog" aria-modal="true" aria-labelledby="cloudAccountTitleEvoluaFit">
        <div class="cloud-sheet-head-evoluafit">
          <div class="cloud-sheet-title-evoluafit">
            <div class="cloud-sheet-icon-evoluafit"><i class="bi bi-cloud-check"></i></div>
            <div>
              <h3 id="cloudAccountTitleEvoluaFit">Conta e Backup</h3>
              <p>Seus dados do EvoluaFit protegidos na nuvem.</p>
            </div>
          </div>
          <button id="btnCloudFecharEvoluaFit" class="cloud-close-evoluafit" type="button" aria-label="Fechar">&times;</button>
        </div>

        <div class="cloud-summary-evoluafit">
          <div>
            <div class="cloud-summary-label-evoluafit">Status da nuvem</div>
            <div id="cloudResumoEvoluaFit" class="cloud-summary-value-evoluafit">Aguardando conexão...</div>
          </div>
          <span id="cloudPillEvoluaFit" class="cloud-pill-evoluafit">Offline</span>
        </div>

        <div id="cloudLoginAreaEvoluaFit" class="cloud-form-evoluafit">
          <input type="email" id="cloudEmailEvoluaFit" placeholder="Seu e-mail" autocomplete="email">
          <input type="password" id="cloudSenhaEvoluaFit" placeholder="Sua senha" minlength="6" autocomplete="current-password">
          <div class="cloud-actions-evoluafit">
            <button id="btnCloudEntrarEvoluaFit" class="cloud-btn-primary-evoluafit" type="button">Entrar</button>
            <button id="btnCloudCriarEvoluaFit" class="cloud-btn-success-evoluafit" type="button">Criar conta</button>
          </div>
        </div>

        <div id="cloudLogadoAreaEvoluaFit" style="display:none;">
          <div id="cloudUsuarioEvoluaFit" class="cloud-user-evoluafit"></div>
          <div class="cloud-sync-meta-evoluafit">
            <span><i class="bi bi-clock-history"></i> Última sincronização</span>
            <strong id="cloudUltimaSyncEvoluaFit">Ainda não sincronizado</strong>
          </div>

          <div class="cloud-section-label-evoluafit">Backup e sincronização</div>
          <div class="cloud-logged-actions-evoluafit">
            <button id="btnCloudSalvarEvoluaFit" class="cloud-btn-success-evoluafit" type="button"><i class="bi bi-cloud-arrow-up"></i> Sincronizar agora</button>
            <button id="btnCloudRestaurarEvoluaFit" class="cloud-btn-primary-evoluafit" type="button"><i class="bi bi-cloud-arrow-down"></i> Restaurar backup</button>
            <button id="btnCloudBackupEvoluaFit" class="cloud-btn-dark-evoluafit" type="button"><i class="bi bi-file-earmark-arrow-down"></i> Backup JSON</button>
            <button id="btnCloudSairEvoluaFit" class="cloud-btn-danger-evoluafit" type="button"><i class="bi bi-box-arrow-right"></i> Sair da conta</button>
          </div>
        </div>

        <div id="cloudStatusEvoluaFit" class="cloud-status-evoluafit">Inicializando Firebase...</div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  function configurarEventosNuvem() {
    ligarClique("btnCloudContaEvoluaFit", abrirPainelConta);
    ligarClique("btnCloudFecharEvoluaFit", fecharPainelConta);
    ligarClique("btnCloudEntrarEvoluaFit", entrarNuvem);
    ligarClique("btnCloudCriarEvoluaFit", criarContaNuvem);
    ligarClique("btnCloudSairEvoluaFit", sairNuvem);
    ligarClique("btnCloudSalvarEvoluaFit", () => salvarTudoNaNuvem(false));
    ligarClique("btnCloudRestaurarEvoluaFit", () => restaurarTudoDaNuvem(false));
    ligarClique("btnCloudBackupEvoluaFit", exportarBackupLocalNuvem);

    const modal = document.getElementById("cloudAccountModalEvoluaFit");
    if (modal) {
      modal.addEventListener("click", function (event) {
        if (event.target === modal) fecharPainelConta();
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") fecharPainelConta();
    });
  }

  function ligarClique(id, funcao) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.addEventListener("click", funcao);
  }

  function abrirPainelConta() {
    const modal = document.getElementById("cloudAccountModalEvoluaFit");
    if (!modal) return;
    overflowAnterior = document.body.style.overflow || "";
    document.body.style.overflow = "hidden";
    modal.classList.add("aberto");
    modal.setAttribute("aria-hidden", "false");
    atualizarUltimaSyncUI();
  }

  function fecharPainelConta() {
    const modal = document.getElementById("cloudAccountModalEvoluaFit");
    if (!modal || !modal.classList.contains("aberto")) return;
    modal.classList.remove("aberto");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = overflowAnterior;
  }

  function atualizarTelaNuvem() {
    const logado = !!usuarioAtual;
    const loginArea = document.getElementById("cloudLoginAreaEvoluaFit");
    const logadoArea = document.getElementById("cloudLogadoAreaEvoluaFit");
    const usuarioBox = document.getElementById("cloudUsuarioEvoluaFit");
    const resumo = document.getElementById("cloudResumoEvoluaFit");

    if (loginArea) loginArea.style.display = logado ? "none" : "grid";
    if (logadoArea) logadoArea.style.display = logado ? "block" : "none";
    if (usuarioBox && usuarioAtual) {
      usuarioBox.innerHTML = `<i class="bi bi-person-check"></i> ${escaparHtml(usuarioAtual.email || usuarioAtual.uid)}`;
    }

    if (resumo) resumo.innerText = logado ? "Conta conectada ao Firebase" : "Entre para ativar a sincronização";
    atualizarPill(logado ? "Conectado" : "Offline", logado ? "ok" : "");
    atualizarUltimaSyncUI();

    if (!logado) {
      atualizarStatusNuvem("Entre ou crie uma conta para ativar o backup automático.", "");
    }
  }

  function atualizarPill(texto, tipo) {
    const pill = document.getElementById("cloudPillEvoluaFit");
    const botaoConta = document.getElementById("btnCloudContaEvoluaFit");
    if (pill) {
      pill.innerText = texto;
      pill.className = `cloud-pill-evoluafit ${tipo || ""}`.trim();
    }

    if (botaoConta) {
      botaoConta.classList.remove("online", "erro", "alerta");
      if (tipo === "ok") botaoConta.classList.add("online");
      if (tipo === "erro") botaoConta.classList.add("erro");
      if (tipo === "alerta") botaoConta.classList.add("alerta");
      botaoConta.title = `Conta e Backup: ${texto}`;
    }
  }

  function atualizarStatusNuvem(mensagem, tipo) {
    const status = document.getElementById("cloudStatusEvoluaFit");
    const resumo = document.getElementById("cloudResumoEvoluaFit");
    if (status) {
      status.innerText = mensagem;
      status.className = `cloud-status-evoluafit ${tipo || ""}`.trim();
    }
    if (resumo && mensagem) resumo.innerText = resumoCurto(mensagem);
  }

  function resumoCurto(mensagem) {
    if (/sincroniz/i.test(mensagem)) return "Dados sincronizados com a nuvem";
    if (/restaur/i.test(mensagem)) return "Backup restaurado";
    if (/vazio/i.test(mensagem)) return "Nuvem pronta para receber seus dados";
    if (/erro|falha|bloquearam/i.test(mensagem)) return "Atenção à sincronização";
    if (/conectad|conta criada/i.test(mensagem)) return "Conta conectada ao Firebase";
    if (/salv/i.test(mensagem)) return "Backup atualizado";
    return mensagem.length > 54 ? mensagem.slice(0, 51) + "..." : mensagem;
  }

  function lerUltimaSyncLocal() {
    const valor = localStorage.getItem(CHAVE_ULTIMA_SYNC);
    if (!valor) return null;
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  function registrarUltimaSync(data) {
    const dataValida = data instanceof Date && !Number.isNaN(data.getTime()) ? data : new Date();
    ultimaSyncEm = dataValida;
    localSetItemOriginal(CHAVE_ULTIMA_SYNC, dataValida.toISOString());
    atualizarUltimaSyncUI();
  }

  function atualizarUltimaSyncUI() {
    const el = document.getElementById("cloudUltimaSyncEvoluaFit");
    if (!el) return;
    el.innerText = ultimaSyncEm
      ? ultimaSyncEm.toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })
      : "Ainda não sincronizado";
  }

  function dataFirestoreParaDate(valor) {
    try {
      if (valor && typeof valor.toDate === "function") return valor.toDate();
    } catch (_) {}
    return null;
  }

  function obterCredenciaisTela() {
    const email = ((document.getElementById("cloudEmailEvoluaFit") || {}).value || "").trim();
    const senha = ((document.getElementById("cloudSenhaEvoluaFit") || {}).value || "").trim();

    if (!email || !senha) {
      atualizarStatusNuvem("Digite e-mail e senha para continuar.", "erro");
      return null;
    }

    if (senha.length < 6) {
      atualizarStatusNuvem("A senha precisa ter pelo menos 6 caracteres.", "erro");
      return null;
    }

    return { email, senha };
  }

  async function criarContaNuvem() {
    const credenciais = obterCredenciaisTela();
    if (!credenciais || !auth) return;

    atualizarStatusNuvem("Criando sua conta no Firebase...", "");
    criandoContaAgora = true;

    try {
      const resultado = await auth.createUserWithEmailAndPassword(credenciais.email, credenciais.senha);
      usuarioAtual = resultado.user;
      autoSyncLiberado = true;
      await salvarTudoNaNuvem(true);
      atualizarTelaNuvem();
      atualizarPill("Sincronizado", "ok");
      atualizarStatusNuvem("Conta criada. Seus próximos registros serão sincronizados automaticamente.", "ok");
    } catch (erro) {
      atualizarStatusNuvem(`Erro ao criar conta: ${traduzirErro(erro)}`, "erro");
      atualizarPill("Erro", "erro");
    } finally {
      setTimeout(() => {
        criandoContaAgora = false;
      }, 500);
    }
  }

  async function entrarNuvem() {
    const credenciais = obterCredenciaisTela();
    if (!credenciais || !auth) return;

    atualizarStatusNuvem("Entrando na sua conta...", "");
    try {
      await auth.signInWithEmailAndPassword(credenciais.email, credenciais.senha);
    } catch (erro) {
      atualizarStatusNuvem(`Erro ao entrar: ${traduzirErro(erro)}`, "erro");
      atualizarPill("Erro", "erro");
    }
  }

  async function sairNuvem() {
    if (!auth) return;
    await auth.signOut();
    usuarioAtual = null;
    autoSyncLiberado = false;
    atualizarTelaNuvem();
    atualizarPill("Offline", "");
  }

  async function prepararSessaoNuvem() {
    if (!usuarioAtual || !db) return;

    atualizarStatusNuvem("Verificando seu backup no Firebase...", "");

    try {
      const snap = await documentoUsuario().get();
      const dadosLocais = lerDadosLocais();
      const localTemDados = temDadosObjeto(dadosLocais);

      if (!snap.exists) {
        autoSyncLiberado = true;
        if (localTemDados) {
          await salvarTudoNaNuvem(true);
          atualizarPill("Sincronizado", "ok");
          atualizarStatusNuvem("Conta conectada. Dados deste aparelho enviados para a nuvem.", "ok");
        } else {
          atualizarPill("Conectado", "ok");
          atualizarStatusNuvem("Conta conectada. Seus próximos registros serão sincronizados automaticamente.", "ok");
        }
        return;
      }

      const conteudo = snap.data() || {};
      const dadosNuvem = conteudo.dados || {};
      const nuvemTemDados = temDadosObjeto(dadosNuvem);
      const dataServidor = dataFirestoreParaDate(conteudo.atualizadoEm);
      if (dataServidor) registrarUltimaSync(dataServidor);

      if (!localTemDados && !nuvemTemDados) {
        autoSyncLiberado = true;
        atualizarPill("Conectado", "ok");
        atualizarStatusNuvem("Conta conectada. O backup está vazio e aguardando seus primeiros registros.", "ok");
        return;
      }

      if (!localTemDados && nuvemTemDados) {
        await restaurarTudoDaNuvem(true);
        return;
      }

      if (localTemDados && !nuvemTemDados) {
        autoSyncLiberado = true;
        await salvarTudoNaNuvem(true);
        atualizarPill("Sincronizado", "ok");
        atualizarStatusNuvem("Conta conectada. Dados deste aparelho enviados para a nuvem.", "ok");
        return;
      }

      if (dadosIguais(dadosLocais, dadosNuvem)) {
        autoSyncLiberado = true;
        atualizarPill("Sincronizado", "ok");
        atualizarStatusNuvem("Conta conectada e sincronizada com o Firebase.", "ok");
        return;
      }

      autoSyncLiberado = false;
      atualizarPill("Ação necessária", "alerta");
      atualizarStatusNuvem(
        "Há dados diferentes neste aparelho e no Firebase. Escolha Sincronizar agora para manter este aparelho ou Restaurar backup para usar a nuvem.",
        "alerta"
      );
    } catch (erro) {
      atualizarStatusNuvem(`Erro ao verificar backup: ${traduzirErro(erro)}`, "erro");
      atualizarPill("Erro", "erro");
    }
  }

  function documentoUsuario() {
    return db.collection("usuarios").doc(usuarioAtual.uid);
  }

  function lerDadosLocais() {
    const dados = {};
    CHAVES_SINCRONIZADAS.forEach((chave) => {
      const valor = localStorage.getItem(chave);
      if (valor !== null) dados[chave] = valor;
    });
    return dados;
  }

  function temDadosObjeto(dados) {
    return CHAVES_SINCRONIZADAS.some((chave) =>
      Object.prototype.hasOwnProperty.call(dados || {}, chave)
    );
  }

  function dadosIguais(a, b) {
    return CHAVES_SINCRONIZADAS.every((chave) => {
      const temA = Object.prototype.hasOwnProperty.call(a || {}, chave);
      const temB = Object.prototype.hasOwnProperty.call(b || {}, chave);
      if (temA !== temB) return false;
      if (!temA) return true;
      return String(a[chave]) === String(b[chave]);
    });
  }

  async function salvarTudoNaNuvem(silencioso) {
    if (!usuarioAtual || !db || restaurandoDaNuvem) return;
    if (!silencioso) atualizarStatusNuvem("Sincronizando seus dados com o Firebase...", "");

    try {
      await documentoUsuario().set(
        {
          email: usuarioAtual.email || "",
          dados: lerDadosLocais(),
          schemaVersion: 1,
          atualizadoEm: window.firebase.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      autoSyncLiberado = true;
      registrarUltimaSync(new Date());
      atualizarPill("Sincronizado", "ok");
      if (!silencioso) atualizarStatusNuvem("Dados sincronizados com sucesso.", "ok");
    } catch (erro) {
      atualizarStatusNuvem(`Erro ao salvar: ${traduzirErro(erro)}`, "erro");
      atualizarPill("Erro", "erro");
    }
  }

  async function restaurarTudoDaNuvem(silencioso) {
    if (!usuarioAtual || !db) return;
    if (!silencioso) atualizarStatusNuvem("Restaurando seus dados do Firebase...", "");

    try {
      const snap = await documentoUsuario().get();
      if (!snap.exists) {
        autoSyncLiberado = true;
        atualizarStatusNuvem("Ainda não existe backup para esta conta.", "erro");
        return;
      }

      const conteudo = snap.data() || {};
      const dados = conteudo.dados || {};
      const chavesParaRestaurar = CHAVES_SINCRONIZADAS.filter((chave) =>
        Object.prototype.hasOwnProperty.call(dados, chave)
      );

      if (chavesParaRestaurar.length === 0) {
        autoSyncLiberado = true;
        atualizarPill("Conectado", "ok");
        atualizarStatusNuvem("Conta conectada. O backup está vazio e não há nada para restaurar.", "ok");
        return;
      }

      restaurandoDaNuvem = true;
      chavesParaRestaurar.forEach((chave) => {
        localSetItemOriginal(chave, String(dados[chave]));
      });
      restaurandoDaNuvem = false;
      autoSyncLiberado = true;

      const dataServidor = dataFirestoreParaDate(conteudo.atualizadoEm) || new Date();
      registrarUltimaSync(dataServidor);
      atualizarPill("Sincronizado", "ok");
      atualizarStatusNuvem("Dados restaurados. Atualizando o app...", "ok");
      setTimeout(() => window.location.reload(), 450);
    } catch (erro) {
      restaurandoDaNuvem = false;
      atualizarStatusNuvem(`Erro ao restaurar: ${traduzirErro(erro)}`, "erro");
      atualizarPill("Erro", "erro");
    }
  }

  function interceptarLocalStorage() {
    if (window.__evoluaFitFirebaseStorageInterceptado) return;
    window.__evoluaFitFirebaseStorageInterceptado = true;

    localStorage.setItem = function (chave, valor) {
      localSetItemOriginal(chave, valor);
      if (!CHAVES_SINCRONIZADAS.includes(chave)) return;
      if (!usuarioAtual || restaurandoDaNuvem || !autoSyncLiberado) return;

      atualizarPill("Sincronizando...", "");
      clearTimeout(timerSync);
      timerSync = setTimeout(() => salvarTudoNaNuvem(true), 900);
    };
  }

  function exportarBackupLocalNuvem() {
    const backup = {
      app: "EvoluaFit I.A.",
      exportadoEm: new Date().toISOString(),
      dados: lerDadosLocais()
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `evoluafit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function traduzirErro(erro) {
    const codigo = (erro && erro.code) || "";
    const mensagens = {
      "auth/email-already-in-use": "este e-mail já possui uma conta",
      "auth/invalid-email": "e-mail inválido",
      "auth/invalid-credential": "e-mail ou senha incorretos",
      "auth/user-not-found": "conta não encontrada",
      "auth/wrong-password": "senha incorreta",
      "auth/weak-password": "use uma senha mais forte, com pelo menos 6 caracteres",
      "auth/network-request-failed": "falha de conexão com a internet",
      "permission-denied": "as regras do Firestore bloquearam o acesso"
    };

    return mensagens[codigo] || (erro && erro.message) || "erro desconhecido";
  }

  function escaparHtml(valor) {
    return String(valor)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.EvoluaFitFirebase = {
    salvar: () => salvarTudoNaNuvem(false),
    restaurar: () => restaurarTudoDaNuvem(false),
    abrirConta: abrirPainelConta,
    chaves: CHAVES_SINCRONIZADAS.slice()
  };
})();
