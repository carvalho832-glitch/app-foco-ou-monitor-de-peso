(function () {
  if (window.__lumaFoodPhotoStarted) return;
  window.__lumaFoodPhotoStarted = true;

  const FOTO_FOOD_API = "https://luma-gemini-api.onrender.com";
  const NOMES_REFEICOES = {
    cafe: "Café",
    almoco: "Almoço",
    jantar: "Jantar"
  };

  document.addEventListener("DOMContentLoaded", iniciarFotoRefeicaoLuma);
  setTimeout(iniciarFotoRefeicaoLuma, 600);
  setTimeout(iniciarFotoRefeicaoLuma, 1600);

  function iniciarFotoRefeicaoLuma() {
    if (document.getElementById("inputFotoRefeicaoLuma")) return;

    const abaDiario = document.getElementById("aba-alimentacao");

    if (!abaDiario) return;

    criarEstilosFotoRefeicao();
    criarInputFoto();
    inserirBotoesNasRefeicoes();
  }

  function criarInputFoto() {
    const input = document.createElement("input");
    input.id = "inputFotoRefeicaoLuma";
    input.type = "file";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.style.display = "none";
    input.addEventListener("change", analisarFotoSelecionada);

    document.body.appendChild(input);
  }

  function inserirBotoesNasRefeicoes() {
    ["cafe", "almoco", "jantar"].forEach((refeicao) => {
      const customInput = document.getElementById(`custom-${refeicao}`);
      const tagsContainer = document.getElementById(`tags-${refeicao}`);

      if (!customInput && !tagsContainer) return;
      if (document.getElementById(`btnFotoRefeicao_${refeicao}`)) return;

      const botao = document.createElement("button");
      botao.id = `btnFotoRefeicao_${refeicao}`;
      botao.type = "button";
      botao.className = "foto-refeicao-inline-btn";
      botao.innerHTML = `<i class="bi bi-camera"></i> Foto`;
      botao.setAttribute("aria-label", `Analisar foto do ${NOMES_REFEICOES[refeicao]}`);

      botao.addEventListener("click", function () {
        const input = document.getElementById("inputFotoRefeicaoLuma");
        if (!input) return;

        input.dataset.refeicao = refeicao;
        input.click();
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

  function criarStatusCompacto() {
    if (document.getElementById("fotoRefeicaoLumaStatus")) return;

    const abaDiario = document.getElementById("aba-alimentacao");
    const referencia = document.getElementById("btnSalvarAlimentacao") || document.getElementById("aguaAtualDisplay");

    if (!abaDiario || !referencia) return;

    const status = document.createElement("div");
    status.id = "fotoRefeicaoLumaStatus";
    status.className = "foto-refeicao-inline-status";
    status.innerText = "📸 Tire uma foto da refeição para a Luma estimar os alimentos e kcal.";

    const local = referencia.parentElement || referencia;
    local.insertAdjacentElement("beforebegin", status);
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
    const botoes = document.querySelectorAll(".foto-refeicao-inline-btn");

    try {
      botoes.forEach((botao) => botao.disabled = true);
      if (status) status.innerText = `📸 Luma analisando a foto do ${NOMES_REFEICOES[refeicao]}...`;

      const imagem = await reduzirImagemParaBase64(arquivo);

      const resposta = await fetch(`${FOTO_FOOD_API}/analisar-foto-refeicao`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          imagemBase64: imagem.dataUrl,
          mimeType: imagem.mimeType,
          refeicao,
          contexto: montarContextoFotoRefeicao(refeicao)
        })
      });

      const resultado = await resposta.json();

      if (!resposta.ok || !resultado.sucesso) {
        throw new Error(resultado.erro || "Não consegui analisar a foto agora.");
      }

      aplicarAnaliseNaRefeicao(resultado.analise || {}, refeicao);

      if (status) {
        const analise = resultado.analise || {};
        const itens = Array.isArray(analise.itens) ? analise.itens : [];
        const nomes = itens.map((item) => item.nome).filter(Boolean).join(", ");

        status.innerText =
          `✅ ${NOMES_REFEICOES[refeicao]} analisado: ${nomes || "itens adicionados"}.\n` +
          `🔥 Estimativa: ${Number(analise.totalKcal) || 0} kcal. Toque em Salvar Diário para guardar.`;
      }

    } catch (erro) {
      console.error("Erro ao analisar foto da refeição:", erro);

      if (status) {
        status.innerText = "Não consegui analisar a foto agora. Motivo: " + erro.message;
      }

      alert("Não consegui analisar a foto agora.\n\nMotivo: " + erro.message);

    } finally {
      botoes.forEach((botao) => botao.disabled = false);
      input.value = "";
    }
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
