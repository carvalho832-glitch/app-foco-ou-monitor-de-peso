(function () {
  if (window.__lumaFoodPhotoStarted) return;
  window.__lumaFoodPhotoStarted = true;

  const FOTO_FOOD_API = "https://luma-gemini-api.onrender.com";
  const NOMES_REFEICOES = {
    cafe: "Café",
    almoco: "Almoço",
    jantar: "Jantar",
    ceia: "Ceia"
  };

  const FOTO_DB_NAME = "evoluafit-food-photo";
  const FOTO_DB_STORE = "fotos-pendentes";
  const FOTO_DB_VERSION = 1;
  const FOTO_REQUEST_TIMEOUT_MS = 65000;
  const FOTO_LOCAL_FALLBACK_PREFIX = "lumaFotoPendente:";
  const TIPOS_REFEICAO = ["cafe", "almoco", "jantar", "ceia"];
  window.__lumaFotosPendentesMemoria = window.__lumaFotosPendentesMemoria || {};

  document.addEventListener("DOMContentLoaded", iniciarFotoRefeicaoLuma);
  setTimeout(iniciarFotoRefeicaoLuma, 600);
  setTimeout(iniciarFotoRefeicaoLuma, 1600);

  function iniciarFotoRefeicaoLuma() {
    removerStatusAntigoForaDoDiario();

    if (
      document.getElementById("inputFotoRefeicaoLuma") &&
      document.getElementById("inputGaleriaRefeicaoLuma")
    ) {
      inserirBotoesNasRefeicoes();
      criarStatusCompacto();
      restaurarFotoPendenteSeExistir();
      return;
    }

    const abaDiario = document.getElementById("aba-alimentacao");

    if (!abaDiario) return;

    criarEstilosFotoRefeicao();
    criarInputsFoto();
    inserirBotoesNasRefeicoes();
    criarStatusCompacto();
    restaurarFotoPendenteSeExistir();
  }

  function removerStatusAntigoForaDoDiario() {
    const abaDiario = document.getElementById("aba-alimentacao");

    document.querySelectorAll("#fotoRefeicaoLumaStatus").forEach((status) => {
      if (!abaDiario || !abaDiario.contains(status)) {
        status.remove();
      }
    });
  }

  function criarInputsFoto() {
    criarInputFoto("inputFotoRefeicaoLuma", "camera");
    criarInputFoto("inputGaleriaRefeicaoLuma", "galeria");
  }

  function criarInputFoto(id, origem) {
    if (document.getElementById(id)) return;

    const input = document.createElement("input");
    input.id = id;
    input.type = "file";
    input.accept = "image/*";
    input.dataset.origem = origem;

    if (origem === "camera") {
      input.setAttribute("capture", "environment");
    }

    input.style.display = "none";
    input.addEventListener("change", analisarFotoSelecionada);

    document.body.appendChild(input);
  }

  function inserirBotoesNasRefeicoes() {
    TIPOS_REFEICAO.forEach((refeicao) => {
      const customInput = document.getElementById(`custom-${refeicao}`);
      const tagsContainer = document.getElementById(`tags-${refeicao}`);

      if (!customInput && !tagsContainer) return;
      if (document.getElementById(`btnFotoRefeicao_${refeicao}`)) return;

      const botao = document.createElement("button");
      botao.id = `btnFotoRefeicao_${refeicao}`;
      botao.type = "button";
      botao.className = "foto-refeicao-inline-btn";
      botao.innerHTML = '<i class="bi bi-camera"></i> Foto';
      botao.setAttribute("aria-label", `Adicionar foto: ${NOMES_REFEICOES[refeicao]}`);

      botao.addEventListener("click", function () {
        mostrarEscolhaFonteFoto(refeicao);
      });

      const customContainer = customInput ? customInput.parentElement : null;

      if (customContainer) {
        customContainer.classList.add("foto-refeicao-custom-row");
        customContainer.appendChild(botao);
      } else if (tagsContainer && tagsContainer.parentElement) {
        tagsContainer.parentElement.insertBefore(botao, tagsContainer);
      }
    });

    criarStatusCompacto();
  }

  function mostrarEscolhaFonteFoto(refeicao) {
    fecharEscolhaFonteFoto();

    const overlay = document.createElement("div");
    overlay.id = "fotoRefeicaoSourceOverlay";
    overlay.className = "foto-refeicao-source-overlay";

    const sheet = document.createElement("div");
    sheet.className = "foto-refeicao-source-sheet";
    sheet.innerHTML = `
      <div class="foto-refeicao-source-handle"></div>
      <div class="foto-refeicao-source-title">Adicionar foto do ${NOMES_REFEICOES[refeicao]}</div>
      <div class="foto-refeicao-source-subtitle">Escolha de onde vem a imagem. Ela será salva antes da análise.</div>
      <button type="button" class="foto-refeicao-source-btn" data-origem="camera">
        <i class="bi bi-camera"></i>
        <span><strong>Tirar foto</strong><small>Abrir a câmera agora</small></span>
      </button>
      <button type="button" class="foto-refeicao-source-btn" data-origem="galeria">
        <i class="bi bi-image"></i>
        <span><strong>Escolher da galeria</strong><small>Usar uma foto já salva</small></span>
      </button>
      <button type="button" class="foto-refeicao-source-cancel">Cancelar</button>
    `;

    overlay.appendChild(sheet);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", function (event) {
      if (event.target === overlay) fecharEscolhaFonteFoto();
    });

    sheet.querySelectorAll("[data-origem]").forEach((botao) => {
      botao.addEventListener("click", function () {
        const origem = botao.dataset.origem || "camera";
        fecharEscolhaFonteFoto();
        abrirSeletorFoto(refeicao, origem);
      });
    });

    const cancelar = sheet.querySelector(".foto-refeicao-source-cancel");
    if (cancelar) cancelar.addEventListener("click", fecharEscolhaFonteFoto);

    requestAnimationFrame(() => overlay.classList.add("visivel"));
  }

  function fecharEscolhaFonteFoto() {
    const overlay = document.getElementById("fotoRefeicaoSourceOverlay");
    if (!overlay) return;

    overlay.classList.remove("visivel");
    setTimeout(() => {
      if (overlay.parentElement) overlay.remove();
    }, 180);
  }

  function abrirSeletorFoto(refeicao, origem) {
    const id = origem === "galeria"
      ? "inputGaleriaRefeicaoLuma"
      : "inputFotoRefeicaoLuma";

    const input = document.getElementById(id);
    if (!input) return;

    input.dataset.refeicao = refeicao;
    input.value = "";
    input.click();
  }

  function criarStatusCompacto() {
    removerStatusAntigoForaDoDiario();

    if (document.getElementById("fotoRefeicaoLumaStatus")) return;

    const abaDiario = document.getElementById("aba-alimentacao");

    if (!abaDiario) return;

    const referencia =
      abaDiario.querySelector("#btnSalvarAlimentacao") ||
      abaDiario.querySelector("#aguaAtualDisplay") ||
      abaDiario.querySelector("#tags-cafe");

    if (!referencia) return;

    const status = document.createElement("div");
    status.id = "fotoRefeicaoLumaStatus";
    status.className = "foto-refeicao-inline-status";
    status.innerText = "📸 Tire uma foto da refeição para a Luma estimar os alimentos e kcal.";

    const cardReferencia = referencia.closest(".card") || referencia.parentElement || abaDiario;
    cardReferencia.insertAdjacentElement("beforebegin", status);
  }

  function criarEstilosFotoRefeicao() {
    if (document.getElementById("foto-refeicao-luma-style")) return;

    const style = document.createElement("style");
    style.id = "foto-refeicao-luma-style";
    style.innerHTML = `
      .foto-refeicao-custom-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .foto-refeicao-custom-row input {
        flex: 1;
        min-width: 0;
      }

      .foto-refeicao-inline-btn {
        border: 0;
        min-width: 74px;
        height: 42px;
        padding: 0 11px;
        border-radius: 14px;
        color: #ffffff;
        font-size: 13px;
        font-weight: 850;
        white-space: nowrap;
        background: linear-gradient(135deg, #0ea5e9, #7c3aed);
        box-shadow: 0 9px 18px rgba(14, 165, 233, 0.18);
      }

      .foto-refeicao-inline-btn i {
        margin-right: 3px;
      }

      .foto-refeicao-inline-btn:disabled {
        opacity: 0.65;
      }

      .foto-refeicao-source-overlay {
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding: 16px;
        background: rgba(15, 23, 42, 0);
        transition: background 0.18s ease;
      }

      .foto-refeicao-source-overlay.visivel {
        background: rgba(15, 23, 42, 0.44);
      }

      .foto-refeicao-source-sheet {
        width: min(100%, 520px);
        padding: 10px 14px 14px;
        border-radius: 24px;
        background: var(--card-bg, #ffffff);
        box-shadow: 0 -12px 36px rgba(15, 23, 42, 0.22);
        transform: translateY(24px);
        opacity: 0;
        transition: transform 0.18s ease, opacity 0.18s ease;
      }

      .foto-refeicao-source-overlay.visivel .foto-refeicao-source-sheet {
        transform: translateY(0);
        opacity: 1;
      }

      .foto-refeicao-source-handle {
        width: 42px;
        height: 5px;
        margin: 0 auto 12px;
        border-radius: 999px;
        background: rgba(148, 163, 184, 0.45);
      }

      .foto-refeicao-source-title {
        font-size: 16px;
        font-weight: 850;
        color: var(--text-color, #1f2937);
        text-align: center;
      }

      .foto-refeicao-source-subtitle {
        margin: 5px 10px 13px;
        color: var(--text-muted, #64748b);
        font-size: 12px;
        line-height: 1.4;
        text-align: center;
      }

      .foto-refeicao-source-btn {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 12px;
        margin-top: 8px;
        padding: 12px 14px;
        border: 1px solid rgba(124, 58, 237, 0.14);
        border-radius: 16px;
        background: rgba(124, 58, 237, 0.07);
        color: var(--text-color, #1f2937);
        text-align: left;
      }

      .foto-refeicao-source-btn > i {
        width: 38px;
        height: 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 38px;
        border-radius: 13px;
        color: #ffffff;
        font-size: 18px;
        background: linear-gradient(135deg, #0ea5e9, #7c3aed);
      }

      .foto-refeicao-source-btn span {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .foto-refeicao-source-btn strong {
        font-size: 14px;
      }

      .foto-refeicao-source-btn small {
        color: var(--text-muted, #64748b);
        font-size: 11.5px;
      }

      .foto-refeicao-source-cancel {
        width: 100%;
        margin-top: 10px;
        padding: 10px;
        border: 0;
        border-radius: 14px;
        background: transparent;
        color: var(--text-muted, #64748b);
        font-size: 13px;
        font-weight: 750;
      }

      .foto-refeicao-retry-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 9px;
      }

      .foto-refeicao-retry-btn {
        border: 0;
        min-height: 36px;
        padding: 8px 11px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 800;
        color: #ffffff;
        background: linear-gradient(135deg, #0ea5e9, #2563eb);
      }

      .foto-refeicao-retry-btn.secundario {
        background: rgba(124, 58, 237, 0.12);
        color: #7c3aed;
        border: 1px solid rgba(124, 58, 237, 0.22);
      }

      [data-theme="dark"] .foto-refeicao-source-sheet {
        background: #182033;
      }

      [data-theme="dark"] .foto-refeicao-retry-btn.secundario {
        color: #c4b5fd;
        background: rgba(124, 58, 237, 0.18);
      }

      .foto-refeicao-inline-status {
        margin: 10px 0 14px;
        padding: 10px 12px;
        border-radius: 15px;
        background: rgba(14, 165, 233, 0.09);
        border: 1px solid rgba(14, 165, 233, 0.14);
        color: var(--text-muted);
        font-size: 12.5px;
        line-height: 1.35;
        white-space: pre-line;
      }

      #aba-alimentacao .foto-refeicao-inline-status {
        display: block;
      }

      [data-theme="dark"] .foto-refeicao-inline-status {
        background: rgba(14, 165, 233, 0.13);
        border-color: rgba(14, 165, 233, 0.20);
      }
    `;

    document.head.appendChild(style);
  }

  async function analisarFotoSelecionada(event) {
    const input = event.target;
    const arquivo = input.files && input.files[0];
    const refeicao = input.dataset.refeicao || "cafe";

    if (!arquivo) return;

    const status = document.getElementById("fotoRefeicaoLumaStatus");
    const botoes = document.querySelectorAll(".foto-refeicao-inline-btn, .foto-refeicao-retry-btn");

    try {
      botoes.forEach((botao) => botao.disabled = true);

      if (status) {
        status.innerText = `💾 Salvando a foto do ${NOMES_REFEICOES[refeicao]} antes da análise...`;
      }

      const imagem = await reduzirImagemParaBase64(arquivo);

      await salvarFotoPendente(refeicao, {
        dataUrl: imagem.dataUrl,
        mimeType: imagem.mimeType,
        criadoEm: Date.now(),
        origem: input.dataset.origem || "arquivo",
        nomeArquivo: arquivo.name || ""
      });

      if (status) {
        status.innerText =
          `✅ Foto do ${NOMES_REFEICOES[refeicao]} salva neste aparelho.\n` +
          "🤖 Luma analisando agora...";
      }

      await analisarImagemPendente(refeicao);

    } catch (erro) {
      console.error("Erro ao analisar foto da refeição:", erro);
      mostrarFalhaComRetry(refeicao, erro);

    } finally {
      document
        .querySelectorAll(".foto-refeicao-inline-btn, .foto-refeicao-retry-btn")
        .forEach((botao) => botao.disabled = false);
      input.value = "";
    }
  }

  async function analisarImagemPendente(refeicao) {
    const registro = await carregarFotoPendente(refeicao);

    if (!registro || !registro.dataUrl) {
      throw new Error("Não encontrei a foto pendente. Escolha a imagem novamente.");
    }

    const resultado = await enviarFotoParaAnalise(refeicao, registro);
    const analise = resultado.analise || {};

    aplicarAnaliseNaRefeicao(analise, refeicao);

    const registroHorario = typeof registrarHorarioFotoRefeicao === "function"
      ? registrarHorarioFotoRefeicao(refeicao)
      : null;

    await removerFotoPendente(refeicao);
    mostrarSucessoAnalise(analise, refeicao, registroHorario);
  }

  async function enviarFotoParaAnalise(refeicao, imagem) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FOTO_REQUEST_TIMEOUT_MS);

    try {
      const resposta = await fetch(`${FOTO_FOOD_API}/analisar-foto-refeicao`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imagemBase64: imagem.dataUrl,
          mimeType: imagem.mimeType || "image/jpeg",
          refeicao,
          contexto: montarContextoFotoRefeicao(refeicao)
        }),
        signal: controller.signal
      });

      const textoResposta = await resposta.text();
      let resultado = {};

      if (textoResposta) {
        try {
          resultado = JSON.parse(textoResposta);
        } catch (_) {
          resultado = {};
        }
      }

      if (!resposta.ok) {
        const detalhe = resultado.erro || resultado.message || "";
        throw new Error(
          detalhe
            ? `Servidor da Luma respondeu ${resposta.status}: ${detalhe}`
            : `Servidor da Luma respondeu erro ${resposta.status}.`
        );
      }

      if (!resultado.sucesso) {
        throw new Error(resultado.erro || "A Luma não conseguiu concluir a leitura da foto.");
      }

      return resultado;

    } catch (erro) {
      if (erro && erro.name === "AbortError") {
        throw new Error("A análise demorou demais. A foto ficou salva para tentar novamente.");
      }

      if (erro instanceof TypeError) {
        throw new Error("Falha de conexão com a Luma. A foto ficou salva para tentar novamente.");
      }

      throw erro;

    } finally {
      clearTimeout(timeout);
    }
  }

  function mostrarSucessoAnalise(analise, refeicao, registroHorario) {
    const status = document.getElementById("fotoRefeicaoLumaStatus");
    if (!status) return;

    const itens = Array.isArray(analise.itens) ? analise.itens : [];
    const nomes = itens.map((item) => item.nome).filter(Boolean).join(", ");
    const horario = registroHorario && registroHorario.horario
      ? registroHorario.horario
      : new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const leituraHorario = String(analise.observacaoHorario || "").trim();

    status.innerText =
      `✅ ${NOMES_REFEICOES[refeicao]}: ${nomes || "itens adicionados"}.\n` +
      `🔥 Estimativa: ${Number(analise.totalKcal) || 0} kcal.\n` +
      `🕒 Foto registrada às ${horario}.` +
      (leituraHorario ? ` ${leituraHorario}` : "") +
      "\n💾 Foto, alimentos e horário salvos automaticamente.";
  }

  function mostrarFalhaComRetry(refeicao, erro) {
    const status = document.getElementById("fotoRefeicaoLumaStatus");
    if (!status) return;

    status.innerHTML = "";

    const texto = document.createElement("div");
    texto.textContent =
      `⚠️ Não consegui analisar o ${NOMES_REFEICOES[refeicao]} agora. ` +
      `${erro && erro.message ? erro.message : "Erro inesperado."} A foto continua salva no aparelho.`;

    const acoes = document.createElement("div");
    acoes.className = "foto-refeicao-retry-actions";

    const tentar = document.createElement("button");
    tentar.type = "button";
    tentar.className = "foto-refeicao-retry-btn";
    tentar.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Tentar novamente';
    tentar.addEventListener("click", function () {
      reenviarFotoPendente(refeicao);
    });

    const outra = document.createElement("button");
    outra.type = "button";
    outra.className = "foto-refeicao-retry-btn secundario";
    outra.innerHTML = '<i class="bi bi-image"></i> Escolher outra foto';
    outra.addEventListener("click", function () {
      mostrarEscolhaFonteFoto(refeicao);
    });

    acoes.appendChild(tentar);
    acoes.appendChild(outra);
    status.appendChild(texto);
    status.appendChild(acoes);
  }

  async function reenviarFotoPendente(refeicao) {
    const status = document.getElementById("fotoRefeicaoLumaStatus");
    const botoes = document.querySelectorAll(".foto-refeicao-inline-btn, .foto-refeicao-retry-btn");

    try {
      botoes.forEach((botao) => botao.disabled = true);

      if (status) {
        status.innerText =
          `📤 Reenviando a foto salva do ${NOMES_REFEICOES[refeicao]}...\n` +
          "Você não precisa tirar outra foto.";
      }

      await analisarImagemPendente(refeicao);

    } catch (erro) {
      console.error("Erro ao reenviar foto pendente:", erro);
      mostrarFalhaComRetry(refeicao, erro);

    } finally {
      document
        .querySelectorAll(".foto-refeicao-inline-btn, .foto-refeicao-retry-btn")
        .forEach((botao) => botao.disabled = false);
    }
  }

  async function restaurarFotoPendenteSeExistir() {
    if (window.__lumaFotoPendenciaRestaurada) return;
    window.__lumaFotoPendenciaRestaurada = true;

    setTimeout(async function () {
      try {
        let maisRecente = null;

        for (const refeicao of TIPOS_REFEICAO) {
          const registro = await carregarFotoPendente(refeicao);

          if (
            registro &&
            (!maisRecente || Number(registro.criadoEm || 0) > Number(maisRecente.criadoEm || 0))
          ) {
            maisRecente = { ...registro, refeicao };
          }
        }

        if (!maisRecente) return;

        const status = document.getElementById("fotoRefeicaoLumaStatus");
        if (!status) return;

        status.innerHTML = "";

        const texto = document.createElement("div");
        texto.textContent =
          `📸 Existe uma foto do ${NOMES_REFEICOES[maisRecente.refeicao]} aguardando análise. ` +
          "Ela ficou salva neste aparelho.";

        const acoes = document.createElement("div");
        acoes.className = "foto-refeicao-retry-actions";

        const tentar = document.createElement("button");
        tentar.type = "button";
        tentar.className = "foto-refeicao-retry-btn";
        tentar.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Analisar foto salva';
        tentar.addEventListener("click", function () {
          reenviarFotoPendente(maisRecente.refeicao);
        });

        const outra = document.createElement("button");
        outra.type = "button";
        outra.className = "foto-refeicao-retry-btn secundario";
        outra.innerHTML = '<i class="bi bi-image"></i> Nova foto';
        outra.addEventListener("click", function () {
          mostrarEscolhaFonteFoto(maisRecente.refeicao);
        });

        acoes.appendChild(tentar);
        acoes.appendChild(outra);
        status.appendChild(texto);
        status.appendChild(acoes);

      } catch (erro) {
        console.warn("Não foi possível restaurar foto pendente:", erro);
      }
    }, 250);
  }

  function abrirBancoFotos() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) {
        reject(new Error("IndexedDB indisponível"));
        return;
      }

      const request = indexedDB.open(FOTO_DB_NAME, FOTO_DB_VERSION);

      request.onupgradeneeded = function () {
        const db = request.result;

        if (!db.objectStoreNames.contains(FOTO_DB_STORE)) {
          db.createObjectStore(FOTO_DB_STORE, { keyPath: "refeicao" });
        }
      };

      request.onsuccess = function () {
        resolve(request.result);
      };

      request.onerror = function () {
        reject(request.error || new Error("Falha ao abrir armazenamento de fotos"));
      };
    });
  }

  async function salvarFotoPendente(refeicao, imagem) {
    const registro = {
      refeicao,
      dataUrl: imagem.dataUrl,
      mimeType: imagem.mimeType || "image/jpeg",
      criadoEm: Number(imagem.criadoEm) || Date.now(),
      origem: imagem.origem || "arquivo",
      nomeArquivo: imagem.nomeArquivo || ""
    };

    try {
      const db = await abrirBancoFotos();

      await new Promise((resolve, reject) => {
        const tx = db.transaction(FOTO_DB_STORE, "readwrite");
        tx.objectStore(FOTO_DB_STORE).put(registro);
        tx.oncomplete = resolve;
        tx.onerror = function () {
          reject(tx.error || new Error("Falha ao salvar foto"));
        };
      });

      db.close();

      try {
        localStorage.removeItem(FOTO_LOCAL_FALLBACK_PREFIX + refeicao);
      } catch (_) {}

      delete window.__lumaFotosPendentesMemoria[refeicao];
      return;

    } catch (erroDb) {
      console.warn("IndexedDB indisponível para foto. Tentando fallback:", erroDb);
    }

    try {
      localStorage.setItem(
        FOTO_LOCAL_FALLBACK_PREFIX + refeicao,
        JSON.stringify(registro)
      );
      return;
    } catch (erroLocal) {
      console.warn("localStorage indisponível para foto. Mantendo em memória:", erroLocal);
    }

    window.__lumaFotosPendentesMemoria[refeicao] = registro;
  }

  async function carregarFotoPendente(refeicao) {
    try {
      const db = await abrirBancoFotos();

      const registro = await new Promise((resolve, reject) => {
        const tx = db.transaction(FOTO_DB_STORE, "readonly");
        const request = tx.objectStore(FOTO_DB_STORE).get(refeicao);

        request.onsuccess = function () {
          resolve(request.result || null);
        };

        request.onerror = function () {
          reject(request.error || new Error("Falha ao ler foto"));
        };
      });

      db.close();

      if (registro) return registro;

    } catch (erroDb) {
      console.warn("Falha ao ler IndexedDB da foto:", erroDb);
    }

    try {
      const salvo = localStorage.getItem(FOTO_LOCAL_FALLBACK_PREFIX + refeicao);
      if (salvo) return JSON.parse(salvo);
    } catch (erroLocal) {
      console.warn("Falha ao ler fallback local da foto:", erroLocal);
    }

    return window.__lumaFotosPendentesMemoria[refeicao] || null;
  }

  async function removerFotoPendente(refeicao) {
    try {
      const db = await abrirBancoFotos();

      await new Promise((resolve, reject) => {
        const tx = db.transaction(FOTO_DB_STORE, "readwrite");
        tx.objectStore(FOTO_DB_STORE).delete(refeicao);
        tx.oncomplete = resolve;
        tx.onerror = function () {
          reject(tx.error || new Error("Falha ao remover foto pendente"));
        };
      });

      db.close();
    } catch (erroDb) {
      console.warn("Falha ao remover foto do IndexedDB:", erroDb);
    }

    try {
      localStorage.removeItem(FOTO_LOCAL_FALLBACK_PREFIX + refeicao);
    } catch (_) {}

    delete window.__lumaFotosPendentesMemoria[refeicao];
  }

  function montarContextoFotoRefeicao(refeicao) {
    let contextoSaude = null;
    let saudeHoje = null;
    const agora = new Date();
    const inputData = document.getElementById("dataAlimentacaoInput");
    const dataAtual = inputData && inputData.value
      ? inputData.value
      : `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;

    try {
      if (typeof gerarContextoSaudeLuma === "function") contextoSaude = gerarContextoSaudeLuma();

      if (typeof obterSaudePorData === "function") {
        saudeHoje = obterSaudePorData(dataAtual);
      }
    } catch (erro) {
      console.warn("Contexto de saúde indisponível para foto:", erro);
    }

    let registrosFotoAnteriores = null;

    try {
      if (typeof refeicoesAtuais !== "undefined" && refeicoesAtuais.registrosFoto) {
        registrosFotoAnteriores = JSON.parse(JSON.stringify(refeicoesAtuais.registrosFoto));
      }
    } catch (_) {}

    return {
      refeicao,
      dataDiario: dataAtual,
      horarioLocal: agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      dataHoraISO: agora.toISOString(),
      registrosFotoAnteriores,
      perfilUsuario: typeof obterPerfilUsuario === "function" ? obterPerfilUsuario() : null,
      metaKcalLuma: typeof obterMetaKcalSalva === "function" ? obterMetaKcalSalva() : null,
      saudeHoje,
      contextoSaudeLuma: contextoSaude
    };
  }

  function aplicarAnaliseNaRefeicao(analise, refeicao) {
    if (typeof refeicoesAtuais === "undefined") {
      throw new Error("Diário ainda não carregou. Reabra a aba Diário e tente novamente.");
    }

    if (!Array.isArray(refeicoesAtuais[refeicao])) refeicoesAtuais[refeicao] = [];

    const itens = Array.isArray(analise.itens) ? analise.itens : [];

    itens.forEach((item) => {
      const nome = formatarNomeItemFoto(item.nome || "Alimento");
      const quantidade = String(item.quantidade || "").trim();
      const texto = quantidade ? `${nome} (${quantidade})` : nome;

      if (texto && !refeicoesAtuais[refeicao].includes(texto)) {
        refeicoesAtuais[refeicao].push(texto);
      }
    });

    if (!refeicoesAtuais.kcal) {
      refeicoesAtuais.kcal = {
        cafe: 0,
        almoco: 0,
        jantar: 0,
        ceia: 0,
        total: 0,
        observacao: "Estimativa aproximada pela foto."
      };
    }

    refeicoesAtuais.kcal[refeicao] = Number(analise.totalKcal) || 0;
    refeicoesAtuais.kcal.total =
      (Number(refeicoesAtuais.kcal.cafe) || 0) +
      (Number(refeicoesAtuais.kcal.almoco) || 0) +
      (Number(refeicoesAtuais.kcal.jantar) || 0) +
      (Number(refeicoesAtuais.kcal.ceia) || 0);

    refeicoesAtuais.kcal.observacao = analise.observacao || "Calorias estimadas pela foto. Ajuste as porções se necessário.";

    if (typeof obterAssinaturaRefeicoes === "function") {
      refeicoesAtuais.assinaturaKcal = obterAssinaturaRefeicoes();
    }

    if (typeof renderizarTagsDeComida === "function") renderizarTagsDeComida();
    if (typeof renderizarCalorias === "function") renderizarCalorias();
  }

  function formatarNomeItemFoto(nome) {
    const limpo = String(nome || "").trim();
    if (!limpo) return "Alimento";
    return limpo.charAt(0).toUpperCase() + limpo.slice(1);
  }

  function reduzirImagemParaBase64(arquivo) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = function () {
        const img = new Image();

        img.onload = function () {
          const maxLado = 1280;
          let largura = img.width;
          let altura = img.height;

          if (largura > altura && largura > maxLado) {
            altura = Math.round((altura * maxLado) / largura);
            largura = maxLado;
          } else if (altura > maxLado) {
            largura = Math.round((largura * maxLado) / altura);
            altura = maxLado;
          }

          const canvas = document.createElement("canvas");
          canvas.width = largura;
          canvas.height = altura;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, largura, altura);

          const dataUrl = canvas.toDataURL("image/jpeg", 0.78);

          resolve({
            dataUrl,
            mimeType: "image/jpeg"
          });
        };

        img.onerror = function () {
          reject(new Error("Não consegui ler a imagem selecionada."));
        };

        img.src = reader.result;
      };

      reader.onerror = function () {
        reject(new Error("Falha ao carregar a foto."));
      };

      reader.readAsDataURL(arquivo);
    });
  }
})();
