(function () {
  if (window.__lumaFoodPhotoStarted) return;
  window.__lumaFoodPhotoStarted = true;

  const FOTO_FOOD_API = "https://luma-gemini-api.onrender.com";
  const NOMES_REFEICOES = {
    cafe: "Café",
    almoco: "Almoço",
    jantar: "Jantar"
  };

  const FOTO_DB_NAME = "evoluafit-food-photo";
  const FOTO_DB_STORE = "fotos-pendentes";
  const FOTO_DB_VERSION = 1;
  const FOTO_REQUEST_TIMEOUT_MS = 65000;
  const FOTO_LOCAL_FALLBACK_PREFIX = "lumaFotoPendente:";
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
    ["cafe", "almoco", "jantar"].forEach((refeicao) => {
      const customInput = document.getElementById(`custom-${refeicao}`);
      const tagsContainer = document.getElementById(`tags-${refeicao}`);

      if (!customInput && !tagsContainer) return;
      if (document.getElementById(`fotoRefeicaoAcoes_${refeicao}`)) return;

      const acoes = document.createElement("div");
      acoes.id = `fotoRefeicaoAcoes_${refeicao}`;
      acoes.className = "foto-refeicao-actions";

      const botaoCamera = document.createElement("button");
      botaoCamera.id = `btnFotoRefeicao_${refeicao}`;
      botaoCamera.type = "button";
      botaoCamera.className = "foto-refeicao-inline-btn";
      botaoCamera.innerHTML = '<i class="bi bi-camera"></i> Câmera';
      botaoCamera.setAttribute("aria-label", `Tirar foto do ${NOMES_REFEICOES[refeicao]}`);
      botaoCamera.addEventListener("click", function () {
        abrirSeletorFoto(refeicao, "camera");
      });

      const botaoGaleria = document.createElement("button");
      botaoGaleria.id = `btnGaleriaRefeicao_${refeicao}`;
      botaoGaleria.type = "button";
      botaoGaleria.className = "foto-refeicao-inline-btn foto-refeicao-gallery-btn";
      botaoGaleria.innerHTML = '<i class="bi bi-image"></i> Galeria';
      botaoGaleria.setAttribute("aria-label", `Escolher foto do ${NOMES_REFEICOES[refeicao]} na galeria`);
      botaoGaleria.addEventListener("click", function () {
        abrirSeletorFoto(refeicao, "galeria");
      });

      acoes.appendChild(botaoCamera);
      acoes.appendChild(botaoGaleria);

      const customContainer = customInput ? customInput.parentElement : null;

      if (customContainer) {
        customContainer.classList.add("foto-refeicao-custom-row");
        customContainer.insertAdjacentElement("afterend", acoes);
      } else if (tagsContainer && tagsContainer.parentElement) {
        tagsContainer.parentElement.insertBefore(acoes, tagsContainer);
      }
    });

    criarStatusCompacto();
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

      .foto-refeicao-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 8px 0 2px;
      }

      .foto-refeicao-actions .foto-refeicao-inline-btn {
        width: 100%;
        min-width: 0;
      }

      .foto-refeicao-gallery-btn {
        background: linear-gradient(135deg, #8b5cf6, #ec4899);
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
      botoes.forEach((botao) => botao.disabled = false);
      input.value = "";
    }
  }

  async function analisarImagemPendente(refeicao) {
    const registro = await carregarFotoPendente(refeicao);

    if (!registro || !registro.dataUrl) {
      throw new Error("Não encontrei a foto pendente. Escolha a imagem novamente.");
    }

    const resultado = await enviarFotoParaAnalise(refeicao, registro);
    aplicarAnaliseNaRefeicao(resultado.analise || {}, refeicao);

    await removerFotoPendente(refeicao);
    mostrarSucessoAnalise(resultado.analise || {}, refeicao);
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
        } catch (erroJson) {
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
        throw new Error("A análise demorou demais e foi interrompida. A foto continua salva para tentar novamente.");
      }

      if (erro instanceof TypeError) {
        throw new Error("Falha de conexão com a Luma. A foto continua salva para tentar novamente.");
      }

      throw erro;

    } finally {
      clearTimeout(timeout);
    }
  }

  function mostrarSucessoAnalise(analise, refeicao) {
    const status = document.getElementById("fotoRefeicaoLumaStatus");
    if (!status) return;

    const itens = Array.isArray(analise.itens) ? analise.itens : [];
    const nomes = itens.map((item) => item.nome).filter(Boolean).join(", ");

    status.innerText =
      `✅ ${NOMES_REFEICOES[refeicao]} analisado: ${nomes || "itens adicionados"}.\n` +
      `🔥 Estimativa: ${Number(analise.totalKcal) || 0} kcal. Toque em Salvar Diário para guardar.`;
  }

  function mostrarFalhaComRetry(refeicao, erro) {
    const status = document.getElementById("fotoRefeicaoLumaStatus");
    if (!status) return;

    status.innerHTML = "";

    const texto = document.createElement("div");
    texto.textContent =
      `⚠️ Não consegui analisar o ${NOMES_REFEICOES[refeicao]} agora. ` +
      `${erro && erro.message ? erro.message : "Erro inesperado."} A foto ficou salva no aparelho.`;

    const acoes = document.createElement("div");
    acoes.className = "foto-refeicao-retry-actions";

    const tentar = document.createElement("button");
    tentar.type = "button";
    tentar.className = "foto-refeicao-retry-btn";
    tentar.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Tentar novamente';
    tentar.addEventListener("click", function () {
      reenviarFotoPendente(refeicao);
    });

    const galeria = document.createElement("button");
    galeria.type = "button";
    galeria.className = "foto-refeicao-retry-btn secundario";
    galeria.innerHTML = '<i class="bi bi-image"></i> Escolher outra foto';
    galeria.addEventListener("click", function () {
      abrirSeletorFoto(refeicao, "galeria");
    });

    acoes.appendChild(tentar);
    acoes.appendChild(galeria);
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

        for (const refeicao of ["cafe", "almoco", "jantar"]) {
          const registro = await carregarFotoPendente(refeicao);

          if (
            registro &&
            (!maisRecente || Number(registro.criadoEm || 0) > Number(maisRecente.criadoEm || 0))
          ) {
            maisRecente = {
              ...registro,
              refeicao
            };
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

        acoes.appendChild(tentar);
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
      } catch (erro) {}

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
    } catch (erroLocal) {}

    delete window.__lumaFotosPendentesMemoria[refeicao];
  }

  function montarContextoFotoRefeicao(refeicao) {
    let contextoSaude = null;
    let saudeHoje = null;

    try {
      if (typeof gerarContextoSaudeLuma === "function") contextoSaude = gerarContextoSaudeLuma();

      if (typeof obterSaudePorData === "function") {
        const dataAtual = document.getElementById("dataAlimentacaoInput")
          ? document.getElementById("dataAlimentacaoInput").value
          : new Date().toISOString().split("T")[0];

        saudeHoje = obterSaudePorData(dataAtual);
      }
    } catch (erro) {
      console.warn("Contexto de saúde indisponível para foto:", erro);
    }

    return {
      refeicao,
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
        total: 0,
        observacao: "Estimativa aproximada pela foto."
      };
    }

    refeicoesAtuais.kcal[refeicao] = Number(analise.totalKcal) || 0;
    refeicoesAtuais.kcal.total =
      (Number(refeicoesAtuais.kcal.cafe) || 0) +
      (Number(refeicoesAtuais.kcal.almoco) || 0) +
      (Number(refeicoesAtuais.kcal.jantar) || 0);

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
