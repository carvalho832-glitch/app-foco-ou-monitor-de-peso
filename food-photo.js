(function () {
  if (window.__lumaFoodPhotoStarted) return;
  window.__lumaFoodPhotoStarted = true;

  const FOTO_FOOD_API = "https://luma-gemini-api.onrender.com";

  document.addEventListener("DOMContentLoaded", iniciarFotoRefeicaoLuma);
  setTimeout(iniciarFotoRefeicaoLuma, 600);
  setTimeout(iniciarFotoRefeicaoLuma, 1600);

  function iniciarFotoRefeicaoLuma() {
    if (document.getElementById("cardFotoRefeicaoLuma")) return;

    const abaDiario = document.getElementById("aba-alimentacao");
    const cardAgua = document.querySelector(".card-water");

    if (!abaDiario || !cardAgua) return;

    criarEstilosFotoRefeicao();

    const card = document.createElement("div");
    card.id = "cardFotoRefeicaoLuma";
    card.className = "card foto-refeicao-luma-card";

    card.innerHTML = `
      <div class="foto-refeicao-luma-header">
        <div>
          <h3><i class="bi bi-camera"></i> Luma por foto</h3>
          <p>Fotografe a refeição e a Luma estima os itens e calorias.</p>
        </div>
        <span class="foto-refeicao-luma-pill">Beta</span>
      </div>

      <div class="foto-refeicao-luma-actions">
        <button type="button" class="foto-refeicao-luma-btn" data-refeicao="cafe">
          📸 Café
        </button>
        <button type="button" class="foto-refeicao-luma-btn" data-refeicao="almoco">
          📸 Almoço
        </button>
        <button type="button" class="foto-refeicao-luma-btn" data-refeicao="jantar">
          📸 Jantar
        </button>
      </div>

      <input id="inputFotoRefeicaoLuma" type="file" accept="image/*" capture="environment" style="display:none;">

      <div id="fotoRefeicaoLumaPreview" class="foto-refeicao-luma-preview" style="display:none;"></div>
      <div id="fotoRefeicaoLumaStatus" class="foto-refeicao-luma-status">
        Dica: tire a foto de cima, com boa luz, mostrando o prato todo.
      </div>
    `;

    abaDiario.insertBefore(card, cardAgua);

    const input = document.getElementById("inputFotoRefeicaoLuma");

    card.querySelectorAll(".foto-refeicao-luma-btn").forEach((botao) => {
      botao.addEventListener("click", function () {
        input.dataset.refeicao = botao.dataset.refeicao || "cafe";
        input.click();
      });
    });

    input.addEventListener("change", analisarFotoSelecionada);
  }

  function criarEstilosFotoRefeicao() {
    if (document.getElementById("foto-refeicao-luma-style")) return;

    const style = document.createElement("style");
    style.id = "foto-refeicao-luma-style";
    style.innerHTML = `
      .foto-refeicao-luma-card {
        border: 1px solid rgba(14, 165, 233, 0.22);
        background: linear-gradient(135deg, rgba(14, 165, 233, 0.10), rgba(168, 85, 247, 0.08), rgba(255,255,255,0.96));
      }

      [data-theme="dark"] .foto-refeicao-luma-card {
        background: linear-gradient(135deg, rgba(14, 165, 233, 0.16), rgba(168, 85, 247, 0.12), rgba(15, 23, 42, 0.96));
      }

      .foto-refeicao-luma-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
        margin-bottom: 14px;
      }

      .foto-refeicao-luma-header h3 {
        margin-bottom: 4px;
      }

      .foto-refeicao-luma-header p {
        margin: 0;
        font-size: 13px;
        color: var(--text-muted);
        line-height: 1.35;
      }

      .foto-refeicao-luma-pill {
        padding: 6px 9px;
        border-radius: 999px;
        background: rgba(14, 165, 233, 0.16);
        color: #0284c7;
        font-size: 11px;
        font-weight: 800;
      }

      .foto-refeicao-luma-actions {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .foto-refeicao-luma-btn {
        border: 0;
        border-radius: 16px;
        padding: 12px 8px;
        font-weight: 800;
        font-size: 13px;
        color: #ffffff;
        background: linear-gradient(135deg, #0ea5e9, #7c3aed);
        box-shadow: 0 10px 22px rgba(14, 165, 233, 0.18);
      }

      .foto-refeicao-luma-btn:disabled {
        opacity: 0.65;
      }

      .foto-refeicao-luma-preview {
        margin-top: 12px;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid rgba(148, 163, 184, 0.25);
      }

      .foto-refeicao-luma-preview img {
        display: block;
        width: 100%;
        max-height: 220px;
        object-fit: cover;
      }

      .foto-refeicao-luma-status {
        margin-top: 12px;
        font-size: 13px;
        color: var(--text-muted);
        line-height: 1.35;
        white-space: pre-line;
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
    const preview = document.getElementById("fotoRefeicaoLumaPreview");
    const botoes = document.querySelectorAll(".foto-refeicao-luma-btn");

    try {
      botoes.forEach((botao) => botao.disabled = true);
      if (status) status.innerText = "📸 Luma analisando a foto...";

      const imagem = await reduzirImagemParaBase64(arquivo);

      if (preview) {
        preview.style.display = "block";
        preview.innerHTML = `<img src="${imagem.dataUrl}" alt="Foto da refeição analisada pela Luma">`;
      }

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
          `✅ Foto analisada: ${nomes || "itens adicionados"}.\n` +
          `🔥 Estimativa: ${Number(analise.totalKcal) || 0} kcal.\n` +
          `Toque em Salvar Diário para guardar no histórico.`;
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
