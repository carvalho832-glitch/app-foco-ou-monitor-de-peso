/* ==========================================
   EVOLUAFIT - HOTFIX TERCEIRA LEVA V5
   Corrige: loop da Luma, data local e hidratação ao vivo
========================================== */
(function () {
  if (window.__evoluaThirdWaveHotfixV5) return;
  window.__evoluaThirdWaveHotfixV5 = true;

  let lumaObserver = null;
  let timer = null;

  function dataLocalISO(data) {
    const d = data instanceof Date ? data : new Date();
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  function dataUtcISO(data) {
    const d = data instanceof Date ? data : new Date();
    return d.toISOString().slice(0, 10);
  }

  function numeroTexto(valor) {
    const match = String(valor == null ? "" : valor)
      .replace(/\./g, "")
      .replace(",", ".")
      .match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : NaN;
  }

  function json(chave, padrao) {
    try {
      const valor = JSON.parse(localStorage.getItem(chave) || "null");
      return valor == null ? padrao : valor;
    } catch (_) {
      return padrao;
    }
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
    for (const valor of candidatos) {
      const d = dataValida(valor);
      if (d) return d;
    }
    return null;
  }

  function mesmoDia(a, b) {
    return !!(a && b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate());
  }

  function inicioSemana() {
    const d = new Date();
    const dia = d.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + diff);
    return d;
  }

  function corrigirDatasUTC() {
    const hojeLocal = dataLocalISO();
    const hojeUtc = dataUtcISO();
    if (hojeLocal === hojeUtc) return;

    ["dataInput", "dataAlimentacaoInput", "dataSaudeInput"].forEach((id) => {
      const input = document.getElementById(id);
      if (input && input.value === hojeUtc) {
        input.value = hojeLocal;
        try { input.dispatchEvent(new Event("change", { bubbles: true })); } catch (_) {}
      }
    });
  }

  function aguaAtual() {
    const el = document.getElementById("aguaAtualDisplay");
    const n = numeroTexto(el && el.textContent);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  function metaAguaAtual() {
    const el = document.getElementById("aguaMetaDisplay");
    const n = numeroTexto(el && el.textContent);
    return Number.isFinite(n) && n > 0 ? n : 2000;
  }

  function persistirAguaAtual() {
    const inputData = document.getElementById("dataAlimentacaoInput");
    const chave = (inputData && inputData.value) || dataLocalISO();
    const historico = json("historicoAlimentacao", {});
    if (!historico || Array.isArray(historico) || typeof historico !== "object") return;

    const atual = historico[chave] && typeof historico[chave] === "object" ? historico[chave] : {};
    const agua = aguaAtual();
    if (Number(atual.agua) === agua) return;

    historico[chave] = { ...atual, agua };
    localStorage.setItem("historicoAlimentacao", JSON.stringify(historico));
  }

  function envolverRegistroDeAgua() {
    if (window.__evoluaAguaV5Wrapped) return;
    if (typeof window.adicionarAgua !== "function") return;

    const original = window.adicionarAgua;
    window.adicionarAgua = function (qtd) {
      const retorno = original.apply(this, arguments);
      setTimeout(function () {
        persistirAguaAtual();
        atualizarHidratacaoTendencia();
        fixarLuma();
      }, 0);
      return retorno;
    };
    window.__evoluaAguaV5Wrapped = true;
  }

  function registroOntemAgua() {
    const hist = json("historicoAlimentacao", {});
    if (!hist || Array.isArray(hist) || typeof hist !== "object") return null;
    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);
    const chave = dataLocalISO(ontem);
    const item = hist[chave];
    if (!item || typeof item !== "object") return null;
    const n = Number(item.agua);
    return Number.isFinite(n) ? n : null;
  }

  function atualizarHidratacaoTendencia() {
    const card = document.getElementById("v4TrendAgua");
    if (!card) return;
    const valorEl = card.querySelector(".v4-trend-value");
    const subEl = card.querySelector(".v4-trend-sub");
    const atual = aguaAtual();
    const ontem = registroOntemAgua();

    card.classList.remove("up", "down", "attention");
    if (atual > 0) card.classList.add("down");
    if (valorEl) valorEl.textContent = `${Math.round(atual).toLocaleString("pt-BR")} ml`;

    if (subEl) {
      if (ontem != null) {
        const dif = atual - ontem;
        subEl.textContent = `${dif > 0 ? "+" : ""}${Math.round(dif).toLocaleString("pt-BR")} ml vs ontem`;
      } else {
        subEl.textContent = atual > 0 ? "registrados hoje" : "ainda sem água hoje";
      }
    }
  }

  function pesosHistoricos() {
    const lista = json("historicoPeso", []);
    if (!Array.isArray(lista)) return [];
    return lista.map((item) => {
      const data = dataItem(item);
      const candidatos = [item && item.peso, item && item.weight, item && item.valor, item && item.value, item && item.kg];
      let valor = NaN;
      for (const candidato of candidatos) {
        const n = Number(String(candidato == null ? "" : candidato).replace(",", "."));
        if (Number.isFinite(n) && n > 20 && n < 400) { valor = n; break; }
      }
      return { data, valor };
    }).filter((x) => x.data && Number.isFinite(x.valor)).sort((a, b) => a.data - b.data);
  }

  function treinosHistoricos() {
    const lista = json("historicoTreinos", []);
    if (!Array.isArray(lista)) return [];
    return lista.map((item) => ({ data: dataItem(item), item })).filter((x) => x.data);
  }

  function metasSemanais() {
    const perfil = json("usuarioPerfil", {});
    const alvo = perfil && perfil.metasSemanais ? perfil.metasSemanais : json("evoluafitMetasSemanais", {});
    return {
      aguaDias: Math.max(1, Number(alvo && (alvo.aguaDias || alvo.agua)) || 5),
      treinos: Math.max(1, Number(alvo && alvo.treinos) || 3),
      pesoRegistros: Math.max(1, Number(alvo && (alvo.pesoRegistros || alvo.peso)) || 3)
    };
  }

  function treinoHojeLocal() {
    const hoje = new Date();
    return treinosHistoricos().some((x) => mesmoDia(x.data, hoje));
  }

  function corrigirResumoTreino() {
    const valor = document.getElementById("todayWorkoutV2");
    const sub = document.getElementById("todayWorkoutSubV2");
    if (!valor || !sub) return;
    const fez = treinoHojeLocal();
    const valorEsperado = fez ? "Feito hoje ✓" : "Ainda não";
    const subEsperado = fez ? "Treino registrado" : "Toque em + para iniciar";
    if (valor.textContent !== valorEsperado) valor.textContent = valorEsperado;
    if (sub.textContent !== subEsperado) sub.textContent = subEsperado;
  }

  function mensagemLumaCanonica() {
    const pesos = pesosHistoricos();
    const inicio = inicioSemana();
    const pesosSemana = pesos.filter((x) => x.data >= inicio);
    const agua = aguaAtual();
    const metaAgua = metaAguaAtual();
    const metas = metasSemanais();
    const treinosSemana = treinosHistoricos().filter((x) => x.data >= inicio).length;
    const hora = new Date().getHours();

    if (!pesos.length) {
      return "Comece registrando seu peso. Ele ajuda a montar uma visão melhor da sua evolução.";
    }

    if (pesosSemana.length >= 2) {
      const dif = pesosSemana[pesosSemana.length - 1].valor - pesosSemana[0].valor;
      if (Math.abs(dif) < 0.15) {
        return "Seu peso ficou praticamente estável nesta semana. O gráfico ajuda a enxergar a tendência além de um único dia.";
      }
      return `Nesta semana, seus registros mostram ${Math.abs(dif).toFixed(1).replace(".", ",")} kg de ${dif < 0 ? "redução" : "aumento"}. Observe a tendência ao longo de vários dias.`;
    }

    if (treinosSemana >= metas.treinos) {
      return `Você já alcançou sua meta de ${metas.treinos} treinos na semana. O próximo passo é manter a consistência sem precisar exagerar.`;
    }

    if (agua >= metaAgua) {
      return "Sua meta de água de hoje já foi atingida. Mais um passo consistente na semana. 💧";
    }

    if (hora >= 12 && agua / Math.max(1, metaAgua) < 0.45) {
      return "Sua hidratação ainda está abaixo da metade da meta. Um copo agora já ajuda a avançar no dia.";
    }

    if (!treinoHojeLocal() && hora >= 17) {
      return "Ainda não há treino hoje. Se fizer sentido para você, uma atividade leve já conta como progresso.";
    }

    return "Continue registrando aos poucos. Com alguns dias de histórico, suas tendências ficam mais úteis.";
  }

  function fixarLuma() {
    const el = document.getElementById("todayLumaV2");
    if (!el) return;
    const texto = mensagemLumaCanonica();
    if (el.textContent !== texto) el.textContent = texto;
  }

  function observarLuma() {
    const el = document.getElementById("todayLumaV2");
    if (!el || el.dataset.v5Observed === "1") return;
    el.dataset.v5Observed = "1";
    lumaObserver = new MutationObserver(function () {
      fixarLuma();
    });
    lumaObserver.observe(el, { childList: true, characterData: true, subtree: true });
    fixarLuma();
  }

  function aposNavegacao() {
    setTimeout(corrigirDatasUTC, 80);
    setTimeout(corrigirDatasUTC, 350);
  }

  function prepararNavegacao() {
    if (document.body.dataset.v5DateNav === "1") return;
    document.body.dataset.v5DateNav = "1";
    document.addEventListener("click", function (event) {
      const alvo = event.target && event.target.closest ? event.target.closest(".floating-item,[data-aba]") : null;
      if (alvo) aposNavegacao();
    }, true);
  }

  function atualizarTudo() {
    envolverRegistroDeAgua();
    observarLuma();
    atualizarHidratacaoTendencia();
    corrigirResumoTreino();
    fixarLuma();
  }

  function iniciar() {
    corrigirDatasUTC();
    prepararNavegacao();
    envolverRegistroDeAgua();
    observarLuma();
    atualizarTudo();

    setTimeout(corrigirDatasUTC, 250);
    setTimeout(corrigirDatasUTC, 900);

    clearInterval(timer);
    timer = setInterval(atualizarTudo, 550);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  } else {
    setTimeout(iniciar, 0);
  }
})();
