/* ==========================================
   EVOLUAFIT I.A. - NUVEM SUPABASE
   Salva e restaura dados do localStorage por usuário
========================================== */

(function() {
  const SUPABASE_URL = "https://vndekmzdlmabdsezlnuz.supabase.co";
  const SUPABASE_KEY = "sb_publishable_WD-DeiX1xIE7bFsUnxE6zw_k7VGbpaB";

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

  let supabaseClient = null;
  let usuarioAtual = null;
  let sincronizacaoTimer = null;
  let restaurandoDaNuvem = false;

  const localSetItemOriginal = localStorage.setItem.bind(localStorage);

  document.addEventListener("DOMContentLoaded", iniciarNuvemEvoluaFit);

  async function iniciarNuvemEvoluaFit() {
    criarEstilosNuvem();
    criarCardNuvem();

    if (!window.supabase || !window.supabase.createClient) {
      atualizarStatusNuvem("Não consegui carregar a biblioteca da nuvem. Recarregue o app.", "erro");
      return;
    }

    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    configurarEventosNuvem();
    interceptarLocalStorage();

    const { data } = await supabaseClient.auth.getSession();
    usuarioAtual = data && data.session ? data.session.user : null;

    atualizarTelaNuvem();

    supabaseClient.auth.onAuthStateChange(function(_evento, sessao) {
      usuarioAtual = sessao ? sessao.user : null;
      atualizarTelaNuvem();
    });
  }

  function criarEstilosNuvem() {
    if (document.getElementById("evoluafit-cloud-style")) return;

    const style = document.createElement("style");
    style.id = "evoluafit-cloud-style";
    style.innerHTML = `
      .cloud-card-evoluafit {
        border: 1px solid rgba(14, 165, 233, 0.22);
        background: linear-gradient(135deg, rgba(14, 165, 233, 0.10), rgba(255, 255, 255, 0.96));
      }

      [data-theme="dark"] .cloud-card-evoluafit {
        background: linear-gradient(135deg, rgba(14, 165, 233, 0.14), rgba(15, 23, 42, 0.96));
      }

      .cloud-header-evoluafit {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
        margin-bottom: 12px;
      }

      .cloud-header-evoluafit h3 {
        margin-bottom: 4px;
      }

      .cloud-header-evoluafit p {
        margin: 0;
        font-size: 13px;
        color: var(--text-muted);
        line-height: 1.35;
      }

      .cloud-pill-evoluafit {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 6px 9px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        white-space: nowrap;
        background: rgba(100, 116, 139, 0.14);
        color: var(--text-muted);
      }

      .cloud-pill-evoluafit.ok {
        background: rgba(16, 185, 129, 0.15);
        color: #059669;
      }

      .cloud-pill-evoluafit.erro {
        background: rgba(239, 68, 68, 0.14);
        color: #dc2626;
      }

      .cloud-form-evoluafit {
        display: grid;
        gap: 10px;
      }

      .cloud-form-evoluafit input {
        width: 100%;
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 13px 14px;
        background: var(--card-bg);
        color: var(--text-main);
        font-size: 14px;
        outline: none;
      }

      .cloud-actions-evoluafit {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .cloud-actions-evoluafit button,
      .cloud-logged-actions-evoluafit button {
        border: 0;
        border-radius: 14px;
        padding: 12px 10px;
        font-weight: 800;
        font-size: 13px;
        cursor: pointer;
      }

      .cloud-btn-primary-evoluafit {
        background: #2563eb;
        color: white;
      }

      .cloud-btn-success-evoluafit {
        background: #10b981;
        color: white;
      }

      .cloud-btn-dark-evoluafit {
        background: #0f172a;
        color: white;
      }

      .cloud-btn-light-evoluafit {
        background: rgba(100, 116, 139, 0.14);
        color: var(--text-main);
      }

      .cloud-logged-actions-evoluafit {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-top: 10px;
      }

      .cloud-status-evoluafit {
        margin-top: 10px;
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(100, 116, 139, 0.10);
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.35;
        font-weight: 600;
      }

      .cloud-status-evoluafit.ok {
        background: rgba(16, 185, 129, 0.13);
        color: #047857;
      }

      .cloud-status-evoluafit.erro {
        background: rgba(239, 68, 68, 0.12);
        color: #b91c1c;
      }

      .cloud-user-evoluafit {
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(14, 165, 233, 0.10);
        color: var(--text-main);
        font-size: 13px;
        font-weight: 800;
        word-break: break-word;
      }

      @media (max-width: 420px) {
        .cloud-actions-evoluafit,
        .cloud-logged-actions-evoluafit {
          grid-template-columns: 1fr;
        }
      }
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
          <p>Entre para salvar peso, calorias, treinos e saúde no Supabase.</p>
        </div>
        <span id="cloudPillEvoluaFit" class="cloud-pill-evoluafit">Offline</span>
      </div>

      <div id="cloudLoginAreaEvoluaFit" class="cloud-form-evoluafit">
        <input type="email" id="cloudEmailEvoluaFit" placeholder="Seu e-mail">
        <input type="password" id="cloudSenhaEvoluaFit" placeholder="Sua senha" minlength="6">
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

      <div id="cloudStatusEvoluaFit" class="cloud-status-evoluafit">
        Aguardando conexão com a nuvem.
      </div>
    `;

    if (header && header.nextSibling) {
      abaDashboard.insertBefore(card, header.nextSibling);
    } else {
      abaDashboard.insertBefore(card, abaDashboard.firstChild);
    }
  }

  function configurarEventosNuvem() {
    ligarClique("btnCloudEntrarEvoluaFit", entrarNuvem);
    ligarClique("btnCloudCriarEvoluaFit", criarContaNuvem);
    ligarClique("btnCloudSairEvoluaFit", sairNuvem);
    ligarClique("btnCloudSalvarEvoluaFit", salvarTudoNaNuvem);
    ligarClique("btnCloudRestaurarEvoluaFit", restaurarTudoDaNuvem);
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
    const pill = document.getElementById("cloudPillEvoluaFit");

    if (loginArea) loginArea.style.display = logado ? "none" : "grid";
    if (logadoArea) logadoArea.style.display = logado ? "block" : "none";

    if (usuarioBox && usuarioAtual) {
      usuarioBox.innerText = `Conectado: ${usuarioAtual.email || usuarioAtual.id}`;
    }

    if (pill) {
      pill.innerText = logado ? "Online" : "Offline";
      pill.className = `cloud-pill-evoluafit ${logado ? "ok" : ""}`;
    }

    atualizarStatusNuvem(
      logado
        ? "Conta conectada. Ao salvar novos dados, uma cópia será enviada para a nuvem."
        : "Entre ou crie uma conta para ativar backup na nuvem.",
      logado ? "ok" : ""
    );
  }

  function atualizarStatusNuvem(mensagem, tipo = "") {
    const status = document.getElementById("cloudStatusEvoluaFit");
    if (!status) return;

    status.innerText = mensagem;
    status.className = `cloud-status-evoluafit ${tipo}`.trim();
  }

  async function criarContaNuvem() {
    const credenciais = obterCredenciaisTela();
    if (!credenciais) return;

    atualizarStatusNuvem("Criando conta na nuvem...", "");

    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email: credenciais.email,
        password: credenciais.senha
      });

      if (error) throw error;

      usuarioAtual = data && data.user ? data.user : usuarioAtual;
      atualizarTelaNuvem();

      atualizarStatusNuvem(
        data && data.session
          ? "Conta criada e conectada. Clique em Salvar na nuvem para guardar seus dados atuais."
          : "Conta criada. Se o Supabase pedir confirmação, confirme pelo e-mail e depois entre.",
        "ok"
      );
    } catch (erro) {
      atualizarStatusNuvem(`Erro ao criar conta: ${erro.message}`, "erro");
    }
  }

  async function entrarNuvem() {
    const credenciais = obterCredenciaisTela();
    if (!credenciais) return;

    atualizarStatusNuvem("Entrando na nuvem...", "");

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: credenciais.email,
        password: credenciais.senha
      });

      if (error) throw error;

      usuarioAtual = data.user;
      atualizarTelaNuvem();
      atualizarStatusNuvem("Login realizado. Use Salvar na nuvem ou Restaurar da nuvem.", "ok");
    } catch (erro) {
      atualizarStatusNuvem(`Erro ao entrar: ${erro.message}`, "erro");
    }
  }

  async function sairNuvem() {
    if (!supabaseClient) return;

    await supabaseClient.auth.signOut();
    usuarioAtual = null;
    atualizarTelaNuvem();
  }

  function obterCredenciaisTela() {
    const email = (document.getElementById("cloudEmailEvoluaFit") || {}).value || "";
    const senha = (document.getElementById("cloudSenhaEvoluaFit") || {}).value || "";

    if (!email.trim() || !senha.trim()) {
      atualizarStatusNuvem("Digite e-mail e senha para continuar.", "erro");
      return null;
    }

    if (senha.trim().length < 6) {
      atualizarStatusNuvem("A senha precisa ter pelo menos 6 caracteres.", "erro");
      return null;
    }

    return {
      email: email.trim(),
      senha: senha.trim()
    };
  }

  async function obterUsuarioSeguro() {
    if (usuarioAtual) return usuarioAtual;

    if (!supabaseClient) return null;

    const { data } = await supabaseClient.auth.getUser();
    usuarioAtual = data && data.user ? data.user : null;

    return usuarioAtual;
  }

  function lerDadosLocaisParaNuvem() {
    const linhas = [];

    CHAVES_SINCRONIZADAS.forEach(function(chave) {
      const valor = localStorage.getItem(chave);
      if (valor === null) return;

      linhas.push({
        user_id: usuarioAtual.id,
        chave: chave,
        dados: {
          __evoluafitLocalStorage: true,
          valor: valor
        },
        atualizado_em: new Date().toISOString()
      });
    });

    return linhas;
  }

  async function salvarTudoNaNuvem(silencioso = false) {
    if (restaurandoDaNuvem) return;

    const usuario = await obterUsuarioSeguro();

    if (!usuario) {
      atualizarStatusNuvem("Entre na sua conta antes de salvar na nuvem.", "erro");
      return;
    }

    const linhas = lerDadosLocaisParaNuvem();

    if (linhas.length === 0) {
      if (!silencioso) atualizarStatusNuvem("Não há dados locais para enviar ainda.", "erro");
      return;
    }

    if (!silencioso) atualizarStatusNuvem("Salvando dados na nuvem...", "");

    try {
      const { error } = await supabaseClient
        .from("luma_dados")
        .upsert(linhas, {
          onConflict: "user_id,chave"
        });

      if (error) throw error;

      atualizarStatusNuvem(`Backup na nuvem atualizado com ${linhas.length} item(ns).`, "ok");
    } catch (erro) {
      atualizarStatusNuvem(`Erro ao salvar na nuvem: ${erro.message}. Confira se a tabela luma_dados foi criada.`, "erro");
    }
  }

  async function restaurarTudoDaNuvem() {
    const usuario = await obterUsuarioSeguro();

    if (!usuario) {
      atualizarStatusNuvem("Entre na sua conta antes de restaurar.", "erro");
      return;
    }

    const confirmar = confirm(
      "Restaurar da nuvem vai substituir os dados locais deste aparelho pelos dados salvos no Supabase. Continuar?"
    );

    if (!confirmar) return;

    atualizarStatusNuvem("Buscando dados na nuvem...", "");

    try {
      const { data, error } = await supabaseClient
        .from("luma_dados")
        .select("chave,dados,atualizado_em")
        .eq("user_id", usuario.id);

      if (error) throw error;

      if (!data || data.length === 0) {
        atualizarStatusNuvem("Não encontrei backup na nuvem para esta conta.", "erro");
        return;
      }

      restaurandoDaNuvem = true;

      data.forEach(function(item) {
        if (!item || !item.chave || !item.dados) return;

        if (item.dados.__evoluafitLocalStorage) {
          localSetItemOriginal(item.chave, String(item.dados.valor));
        } else {
          localSetItemOriginal(item.chave, JSON.stringify(item.dados));
        }
      });

      restaurandoDaNuvem = false;

      recarregarTelasDoApp();

      atualizarStatusNuvem(`Dados restaurados da nuvem: ${data.length} item(ns).`, "ok");
    } catch (erro) {
      restaurandoDaNuvem = false;
      atualizarStatusNuvem(`Erro ao restaurar da nuvem: ${erro.message}.`, "erro");
    }
  }

  function interceptarLocalStorage() {
    localStorage.setItem = function(chave, valor) {
      localSetItemOriginal(chave, valor);

      if (!restaurandoDaNuvem && CHAVES_SINCRONIZADAS.includes(chave)) {
        agendarSincronizacaoAutomatica();
      }
    };
  }

  function agendarSincronizacaoAutomatica() {
    if (!usuarioAtual) return;

    if (sincronizacaoTimer) clearTimeout(sincronizacaoTimer);

    sincronizacaoTimer = setTimeout(function() {
      salvarTudoNaNuvem(true);
    }, 1800);
  }

  function recarregarTelasDoApp() {
    const funcoes = [
      "carregarMeta",
      "verificarExibicaoAltura",
      "carregarPerfilUsuario",
      "carregarDados",
      "carregarRefeicoesDoDia",
      "carregarHistoricoSaude",
      "carregarHistoricoTreinos",
      "carregarTreinoIASalvo",
      "carregarMetaKcalSalva"
    ];

    funcoes.forEach(function(nome) {
      try {
        if (typeof window[nome] === "function") window[nome]();
      } catch (erro) {
        console.warn("Erro ao recarregar", nome, erro);
      }
    });
  }

  function exportarBackupLocalNuvem() {
    const backup = {
      app: "EvoluaFit I.A.",
      tipo: "backup-local-nuvem",
      criadoEm: new Date().toLocaleString("pt-BR"),
      chaves: {}
    };

    CHAVES_SINCRONIZADAS.forEach(function(chave) {
      const valor = localStorage.getItem(chave);
      if (valor !== null) backup.chaves[chave] = valor;
    });

    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json;charset=utf-8"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `backup-evoluafit-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
})();
