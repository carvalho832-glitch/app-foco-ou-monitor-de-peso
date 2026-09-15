/* ==========================================
   EVOLUAFIT I.A. - NUVEM FIREBASE
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

  const localSetItemOriginal = localStorage.setItem.bind(localStorage);
  let auth = null;
  let db = null;
  let usuarioAtual = null;
  let timerSync = null;
  let restaurandoDaNuvem = false;
  let autoSyncLiberado = false;

  document.addEventListener("DOMContentLoaded", iniciarFirebaseEvoluaFit);

  async function iniciarFirebaseEvoluaFit() {
    criarEstilosNuvem();
    criarCardNuvem();

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
      atualizarStatusNuvem("Não consegui carregar o Firebase. Verifique a internet e reabra o app.", "erro");
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

        if (usuarioAtual) {
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
      .cloud-card-evoluafit { border: 1px solid rgba(14,165,233,.22); background: linear-gradient(135deg, rgba(14,165,233,.10), rgba(255,255,255,.96)); }
      [data-theme="dark"] .cloud-card-evoluafit { background: linear-gradient(135deg, rgba(14,165,233,.14), rgba(15,23,42,.96)); }
      .cloud-header-evoluafit { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:12px; }
      .cloud-header-evoluafit h3 { margin-bottom:4px; }
      .cloud-header-evoluafit p { margin:0; font-size:13px; color:var(--text-muted); line-height:1.35; }
      .cloud-pill-evoluafit { display:inline-flex; align-items:center; justify-content:center; padding:6px 9px; border-radius:999px; font-size:11px; font-weight:800; white-space:nowrap; background:rgba(100,116,139,.14); color:var(--text-muted); }
      .cloud-pill-evoluafit.ok { background:rgba(16,185,129,.15); color:#059669; }
      .cloud-pill-evoluafit.erro { background:rgba(239,68,68,.14); color:#dc2626; }
      .cloud-form-evoluafit { display:grid; gap:10px; }
      .cloud-form-evoluafit input { width:100%; border:1px solid var(--border-color); border-radius:14px; padding:13px 14px; background:var(--card-bg); color:var(--text-main); font-size:14px; outline:none; }
      .cloud-actions-evoluafit, .cloud-logged-actions-evoluafit { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
      .cloud-logged-actions-evoluafit { margin-top:10px; }
      .cloud-actions-evoluafit button, .cloud-logged-actions-evoluafit button { border:0; border-radius:14px; padding:12px 10px; font-weight:800; font-size:13px; cursor:pointer; }
      .cloud-btn-primary-evoluafit { background:#2563eb; color:#fff; }
      .cloud-btn-success-evoluafit { background:#10b981; color:#fff; }
      .cloud-btn-dark-evoluafit { background:#0f172a; color:#fff; }
      .cloud-btn-light-evoluafit { background:rgba(100,116,139,.14); color:var(--text-main); }
      .cloud-status-evoluafit { margin-top:10px; padding:10px 12px; border-radius:14px; background:rgba(100,116,139,.10); color:var(--text-muted); font-size:12px; line-height:1.35; font-weight:600; }
      .cloud-status-evoluafit.ok { background:rgba(16,185,129,.13); color:#047857; }
      .cloud-status-evoluafit.erro { background:rgba(239,68,68,.12); color:#b91c1c; }
      .cloud-user-evoluafit { padding:10px 12px; border-radius:14px; background:rgba(14,165,233,.10); color:var(--text-main); font-size:13px; font-weight:800; word-break:break-word; }
      @media (max-width:420px) { .cloud-actions-evoluafit, .cloud-logged-actions-evoluafit { grid-template-columns:1fr; } }
    `;
    document.head.appendChild(style);
  }

  function criarCardNuvem() {
    if (document.getElementById("cloudCardEvoluaFit")) return;
    const abaDashboard = document.getElementById("aba-dashboard");
    if (!abaDashboard) return;

    const header = abaDashboard.querySelector("header");
    const card = document.createElement("div");
    card.id = "cloudCardEvoluaFit";
    card.className = "card cloud-card-evoluafit";
    card.innerHTML = `
      <div class="cloud-header-evoluafit">
        <div>
          <h3><i class="bi bi-cloud-check"></i> Nuvem EvoluaFit</h3>
          <p>Firebase protege sua conta e mantém peso, diário, treinos e saúde sincronizados.</p>
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
        <div class="cloud-logged-actions-evoluafit">
          <button id="btnCloudSalvarEvoluaFit" class="cloud-btn-success-evoluafit" type="button">Salvar na nuvem</button>
          <button id="btnCloudRestaurarEvoluaFit" class="cloud-btn-primary-evoluafit" type="button">Restaurar da nuvem</button>
          <button id="btnCloudBackupEvoluaFit" class="cloud-btn-dark-evoluafit" type="button">Backup JSON</button>
          <button id="btnCloudSairEvoluaFit" class="cloud-btn-light-evoluafit" type="button">Sair</button>
        </div>
      </div>
      <div id="cloudStatusEvoluaFit" class="cloud-status-evoluafit">Inicializando Firebase...</div>
    `;

    if (header && header.nextSibling) abaDashboard.insertBefore(card, header.nextSibling);
    else abaDashboard.insertBefore(card, abaDashboard.firstChild);
  }

  function configurarEventosNuvem() {
    ligarClique("btnCloudEntrarEvoluaFit", entrarNuvem);
    ligarClique("btnCloudCriarEvoluaFit", criarContaNuvem);
    ligarClique("btnCloudSairEvoluaFit", sairNuvem);
    ligarClique("btnCloudSalvarEvoluaFit", salvarTudoNaNuvem);
    ligarClique("btnCloudRestaurarEvoluaFit", () => restaurarTudoDaNuvem(false));
    ligarClique("btnCloudBackupEvoluaFit", exportarBackupLocalNuvem);
  }

  function ligarClique(id, funcao) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.addEventListener("click", funcao);
  }

  function atualizarTelaNuvem() {
    const logado = !!usuarioAtual;
    const loginArea = document.getElementById("cloudLoginAreaEvoluaFit");
    const logadoArea = document.getElementById("cloudLogadoAreaEvoluaFit");
    const usuarioBox = document.getElementById("cloudUsuarioEvoluaFit");
    if (loginArea) loginArea.style.display = logado ? "none" : "grid";
    if (logadoArea) logadoArea.style.display = logado ? "block" : "none";
    if (usuarioBox && usuarioAtual) usuarioBox.innerText = `Conectado: ${usuarioAtual.email || usuarioAtual.uid}`;
    atualizarPill(logado ? "Online" : "Offline", logado ? "ok" : "");
    if (!logado) atualizarStatusNuvem("Entre ou crie uma conta para ativar o backup no Firebase.", "");
  }

  function atualizarPill(texto, tipo) {
    const pill = document.getElementById("cloudPillEvoluaFit");
    if (!pill) return;
    pill.innerText = texto;
    pill.className = `cloud-pill-evoluafit ${tipo || ""}`.trim();
  }

  function atualizarStatusNuvem(mensagem, tipo) {
    const status = document.getElementById("cloudStatusEvoluaFit");
    if (!status) return;
    status.innerText = mensagem;
    status.className = `cloud-status-evoluafit ${tipo || ""}`.trim();
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
    try {
      const resultado = await auth.createUserWithEmailAndPassword(credenciais.email, credenciais.senha);
      usuarioAtual = resultado.user;
      autoSyncLiberado = true;
      await salvarTudoNaNuvem(true);
      atualizarStatusNuvem("Conta criada. Seus dados atuais já foram salvos na nuvem.", "ok");
    } catch (erro) {
      atualizarStatusNuvem(`Erro ao criar conta: ${traduzirErro(erro)}`, "erro");
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
    }
  }

  async function sairNuvem() {
    if (!auth) return;
    await auth.signOut();
    usuarioAtual = null;
    autoSyncLiberado = false;
    atualizarTelaNuvem();
  }

  async function prepararSessaoNuvem() {
    if (!usuarioAtual || !db) return;
    atualizarStatusNuvem("Verificando seu backup no Firebase...", "");
    try {
      const snap = await documentoUsuario().get();
      if (!snap.exists) {
        autoSyncLiberado = true;
        if (temDadosLocais()) await salvarTudoNaNuvem(true);
        else atualizarStatusNuvem("Conta conectada. Seus próximos registros serão sincronizados automaticamente.", "ok");
        return;
      }

      if (!temDadosLocais()) {
        await restaurarTudoDaNuvem(true);
        return;
      }

      autoSyncLiberado = false;
      atualizarStatusNuvem(
        "Existe um backup no Firebase e também há dados neste aparelho. Escolha Salvar na nuvem para manter os dados deste aparelho ou Restaurar da nuvem para usar o backup.",
        ""
      );
    } catch (erro) {
      atualizarStatusNuvem(`Erro ao verificar backup: ${traduzirErro(erro)}`, "erro");
    }
  }

  function documentoUsuario() {
    return db.collection("usuarios").doc(usuarioAtual.uid);
  }

  function temDadosLocais() {
    return CHAVES_SINCRONIZADAS.some((chave) => localStorage.getItem(chave) !== null);
  }

  function lerDadosLocais() {
    const dados = {};
    CHAVES_SINCRONIZADAS.forEach((chave) => {
      const valor = localStorage.getItem(chave);
      if (valor !== null) dados[chave] = valor;
    });
    return dados;
  }

  async function salvarTudoNaNuvem(silencioso) {
    if (!usuarioAtual || !db || restaurandoDaNuvem) return;
    if (!silencioso) atualizarStatusNuvem("Salvando seus dados no Firebase...", "");
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
      if (!silencioso) atualizarStatusNuvem("Backup salvo no Firebase com sucesso.", "ok");
    } catch (erro) {
      atualizarStatusNuvem(`Erro ao salvar: ${traduzirErro(erro)}`, "erro");
    }
  }

  async function restaurarTudoDaNuvem(silencioso) {
    if (!usuarioAtual || !db) return;
    if (!silencioso) atualizarStatusNuvem("Restaurando seus dados do Firebase...", "");
    try {
      const snap = await documentoUsuario().get();
      if (!snap.exists) {
        atualizarStatusNuvem("Ainda não existe backup para esta conta.", "erro");
        autoSyncLiberado = true;
        return;
      }

      const conteudo = snap.data() || {};
      const dados = conteudo.dados || {};
      restaurandoDaNuvem = true;
      CHAVES_SINCRONIZADAS.forEach((chave) => {
        if (Object.prototype.hasOwnProperty.call(dados, chave)) {
          localSetItemOriginal(chave, String(dados[chave]));
        }
      });
      restaurandoDaNuvem = false;
      autoSyncLiberado = true;
      atualizarStatusNuvem("Dados restaurados. Atualizando o app...", "ok");
      setTimeout(() => window.location.reload(), 450);
    } catch (erro) {
      restaurandoDaNuvem = false;
      atualizarStatusNuvem(`Erro ao restaurar: ${traduzirErro(erro)}`, "erro");
    }
  }

  function interceptarLocalStorage() {
    if (window.__evoluaFitFirebaseStorageInterceptado) return;
    window.__evoluaFitFirebaseStorageInterceptado = true;

    localStorage.setItem = function (chave, valor) {
      localSetItemOriginal(chave, valor);
      if (!CHAVES_SINCRONIZADAS.includes(chave)) return;
      if (!usuarioAtual || restaurandoDaNuvem || !autoSyncLiberado) return;
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

  window.EvoluaFitFirebase = {
    salvar: () => salvarTudoNaNuvem(false),
    restaurar: () => restaurarTudoDaNuvem(false),
    chaves: CHAVES_SINCRONIZADAS.slice()
  };
})();
