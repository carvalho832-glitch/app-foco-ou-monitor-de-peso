const API_BASE_URL = "https://luma-gemini-api.onrender.com";

let meuSwiper = null;
let kcalSwiper = null;
let saudeSwiper = null;

let instanciasGraficos = {
  peso: null,
  cintura: null,
  quadril: null
};

let graficoKcalTrend = null;
let graficoKcalData = null;
let graficoPressaoSaude = null;
let graficoGlicoseSaude = null;

document.addEventListener("DOMContentLoaded", iniciarApp);

function byId(id) {
  return document.getElementById(id);
}

function addListener(id, evento, funcao) {
  const elemento = byId(id);

  if (elemento) {
    elemento.addEventListener(evento, funcao);
  }
}

function iniciarApp() {
  configurarListeners();

  carregarTema();
  configurarDataPadrao();
  configurarDataAlimentacaoPadrao();
  configurarDataSaudePadrao();
  verificarExibicaoAltura();
  carregarMeta();
  carregarPerfilUsuario();
  carregarMetaKcalSalva();
  carregarDados();
  carregarRefeicoesDoDia();
  carregarHistoricoSaude();
  carregarHistoricoTreinos();
  carregarTreinoIASalvo();

  criarBotaoTutorialNoPerfil();
  configurarBotaoTutorialTopo();
  iniciarTutorialSeNecessario();
}

function configurarListeners() {
  addListener("btnSalvar", "click", adicionarRegistro);
  addListener("btnSalvarAltura", "click", salvarAltura);
  addListener("btnModificarAltura", "click", abrirEdicaoAltura);
  addListener("btnModificarMeta", "click", abrirEdicaoMeta);
  addListener("btnSalvarMeta", "click", salvarMeta);
  addListener("btnTema", "click", alternarTema);
  addListener("btnExportar", "click", exportarParaExcel);

  addListener("dataAlimentacaoInput", "change", carregarRefeicoesDoDia);
  addListener("btnSalvarAlimentacao", "click", salvarRefeicoes);
  addListener("btnAtualizarMetaKcal", "click", atualizarMetaKcalComIA);

  addListener("btnSalvarSaude", "click", salvarRegistroSaude);
  addListener("btnExportarSaude", "click", exportarSaudeCSV);

  addListener("btnIniciarTreino", "click", iniciarTreino);
  addListener("btnPararTreino", "click", encerrarTreino);
  addListener("btnGerarTreinoIA", "click", gerarTreinoIA);

  addListener("treinoIAHeader", "click", alternarCardTreinoIA);
  addListener("btnRecolherTreinoIA", "click", recolherCardTreinoIA);

  addListener("btnCompartilharProgresso", "click", compartilharProgresso);
  addListener("btnAnalisarDia", "click", solicitarAnaliseIA);
  addListener("btnSalvarPerfil", "click", salvarPerfilUsuario);
  addListener("btnMenuLuma", "click", alternarMenuLuma);

  document.addEventListener("click", function(event) {
    const nav = byId("floatingNav");

    if (!nav) return;

    const clicouNoMenu = nav.contains(event.target);

    if (!clicouNoMenu && nav.classList.contains("open")) {
      nav.classList.remove("open");
    }
  });
}

/* ==========================================
   MENU E ABAS
========================================== */

function trocarAba(abaId, elementoBotao) {
  const abas = {
    dashboard: byId("aba-dashboard"),
    alimentacao: byId("aba-alimentacao"),
    saude: byId("aba-saude"),
    exercicio: byId("aba-exercicio"),
    ia: byId("aba-ia")
  };

  Object.keys(abas).forEach(chave => {
    if (abas[chave]) {
      abas[chave].style.display = chave === abaId ? "block" : "none";
    }
  });

  document.querySelectorAll(".floating-item").forEach(btn => {
    btn.classList.remove("active");
  });

  if (elementoBotao) {
    elementoBotao.classList.add("active");
  } else {
    const botaoAba = document.querySelector(`.floating-item[data-aba="${abaId}"]`);
    if (botaoAba) botaoAba.classList.add("active");
  }

  const floatingNav = byId("floatingNav");
  if (floatingNav) floatingNav.classList.remove("open");

  if (abaId === "alimentacao") {
    const inputData = byId("dataAlimentacaoInput");

    if (inputData && !inputData.value) {
      inputData.value = new Date().toISOString().split("T")[0];
    }

    carregarRefeicoesDoDia();
    carregarMetaKcalSalva();

    setTimeout(() => {
      inicializarKcalSwiper();
      atualizarGraficosKcalCarrossel();
    }, 250);
  }

  if (abaId === "saude") {
    configurarDataSaudePadrao();
    carregarHistoricoSaude();

    setTimeout(() => {
      inicializarSaudeSwiper();
      atualizarGraficosSaude();
    }, 250);
  }

  if (abaId === "exercicio") {
    setTimeout(iniciarMapaTreino, 200);
    carregarTreinoIASalvo();
  }

  if (abaId === "ia") {
    carregarPerfilUsuario();
    carregarAnaliseSalva();
  }
}

function alternarMenuLuma(event) {
  if (event) event.stopPropagation();

  const nav = byId("floatingNav");

  if (nav) {
    nav.classList.toggle("open");
  }
}

/* ==========================================
   PERFIL DA LUMA
========================================== */

function obterPerfilUsuario() {
  return JSON.parse(localStorage.getItem("usuarioPerfil") || "null");
}

function carregarPerfilUsuario() {
  const perfil = obterPerfilUsuario();

  if (!perfil) {
    atualizarStatusPerfil(null);
    return;
  }

  if (byId("perfilNome")) byId("perfilNome").value = perfil.nome || "";
  if (byId("perfilIdade")) byId("perfilIdade").value = perfil.idade || "";
  if (byId("perfilSexo")) byId("perfilSexo").value = perfil.sexo || "";
  if (byId("perfilNivel")) byId("perfilNivel").value = perfil.nivel || "";
  if (byId("perfilObjetivo")) byId("perfilObjetivo").value = perfil.objetivo || "";
  if (byId("perfilObservacoes")) byId("perfilObservacoes").value = perfil.observacoes || "";

  atualizarStatusPerfil(perfil);
}

function salvarPerfilUsuario() {
  const nome = byId("perfilNome").value.trim();
  const idade = byId("perfilIdade").value.trim();
  const sexo = byId("perfilSexo").value;
  const nivel = byId("perfilNivel").value;
  const objetivo = byId("perfilObjetivo").value;
  const observacoes = byId("perfilObservacoes").value.trim();

  const perfil = {
    nome: nome,
    idade: idade ? Number(idade) : null,
    sexo: sexo,
    nivel: nivel,
    objetivo: objetivo,
    observacoes: observacoes,
    atualizadoEm: new Date().toLocaleString("pt-BR")
  };

  localStorage.setItem("usuarioPerfil", JSON.stringify(perfil));
  localStorage.removeItem("usuarioMetaKcal");

  atualizarStatusPerfil(perfil);
  carregarMetaKcalSalva();

  const btn = byId("btnSalvarPerfil");

  if (!btn) return;

  const textoOriginal = btn.innerHTML;

  btn.innerHTML = '<i class="bi bi-check2-circle"></i> Perfil salvo!';
  btn.style.background = "#10b981";

  setTimeout(() => {
    btn.innerHTML = textoOriginal;
    btn.style.background = "";
  }, 1800);
}

function atualizarStatusPerfil(perfil) {
  const status = byId("perfilStatus");

  if (!status) return;

  if (!perfil) {
    status.innerText = "Perfil ainda não configurado.";
    return;
  }

  const nome = perfil.nome || "Usuário";
  const idade = perfil.idade ? `${perfil.idade} anos` : "idade não informada";
  const nivel = perfil.nivel ? formatarTextoPerfil(perfil.nivel) : "nível não informado";
  const objetivo = perfil.objetivo ? formatarTextoPerfil(perfil.objetivo) : "objetivo não informado";

  status.innerText = `${nome} • ${idade} • ${nivel} • ${objetivo}`;
}

function formatarTextoPerfil(texto) {
  return String(texto || "")
    .replace(/_/g, " ")
    .replace("nao informar", "prefere não informar")
    .replace(/\b\w/g, letra => letra.toUpperCase());
}

/* ==========================================
   META KCAL DA LUMA
========================================== */

function obterMetaKcalSalva() {
  return JSON.parse(localStorage.getItem("usuarioMetaKcal") || "null");
}

function carregarMetaKcalSalva() {
  renderizarCalorias();
}

async function atualizarMetaKcalComIA() {
  const btn = byId("btnAtualizarMetaKcal");

  if (!btn) return;

  const textoOriginal = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Calculando meta...';

  try {
    const dados = montarDadosMetaKcal();

    const resposta = await fetch(`${API_BASE_URL}/calcular-meta-kcal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dados)
    });

    if (!resposta.ok) {
      throw new Error("Erro ao conectar com a Luma. Status: " + resposta.status);
    }

    const resultado = await resposta.json();

    if (!resultado.sucesso) {
      throw new Error(resultado.erro || "Erro ao calcular meta de kcal.");
    }

    const meta = resultado.meta || {};

    const metaNormalizada = {
      metaKcal: Number(meta.metaKcal) || 1800,
      faixaMin: Number(meta.faixaMin) || 1700,
      faixaMax: Number(meta.faixaMax) || 2000,
      status: meta.status || "Meta estimada pela Luma",
      observacao: meta.observacao || "Meta aproximada calculada pela Luma.",
      atualizadoEm: new Date().toLocaleString("pt-BR")
    };

    localStorage.setItem("usuarioMetaKcal", JSON.stringify(metaNormalizada));

    renderizarCalorias();

    btn.innerHTML = '<i class="bi bi-check2-circle"></i> Meta atualizada!';
    btn.style.background = "#10b981";
    btn.style.color = "#ffffff";

    setTimeout(() => {
      btn.innerHTML = textoOriginal;
      btn.style.background = "";
      btn.style.color = "";
    }, 1800);

  } catch (erro) {
    console.error("Erro meta kcal:", erro);

    alert(
      "Não consegui calcular a meta de kcal agora.\n\n" +
      "Motivo: " + erro.message
    );

    btn.innerHTML = textoOriginal;

  } finally {
    btn.disabled = false;
  }
}

function montarDadosMetaKcal() {
  const historicoPeso = JSON.parse(localStorage.getItem("historicoPeso") || "[]");
  const historicoAlimentacao = JSON.parse(localStorage.getItem("historicoAlimentacao") || "{}");
  const historicoTreinos = JSON.parse(localStorage.getItem("historicoTreinos") || "[]");
  const historicoSaude = obterHistoricoSaude();

  const hojeISO = new Date().toISOString().split("T")[0];
  const altura = parseFloat(localStorage.getItem("usuarioAltura"));
  const metaPeso = localStorage.getItem("usuarioMeta") || "80.0";

  const pesoOrdenado = [...historicoPeso].sort((a, b) => b.id - a.id);
  const pesoAtual = pesoOrdenado.length > 0 ? pesoOrdenado[0].peso : null;

  let imc = null;

  if (altura && pesoAtual) {
    imc = pesoAtual / (altura * altura);
  }

  return {
    dataHoje: hojeISO,
    perfilUsuario: obterPerfilUsuario(),
    altura: altura || null,
    pesoAtual: pesoAtual,
    imc: imc ? Number(imc.toFixed(1)) : null,
    metaPeso: metaPeso,
    historicoPeso: historicoPeso.slice(-10),
    diarioHoje: historicoAlimentacao[hojeISO] || null,
    ultimosTreinos: historicoTreinos.slice(-7),
    saudeHoje: obterSaudePorData(hojeISO),
    ultimosRegistrosSaude: historicoSaude.slice(-7),
    contextoSaudeLuma: gerarContextoSaudeLuma()
  };
}

function calcularStatusKcal(totalConsumido, metaKcal) {
  if (!metaKcal || !metaKcal.metaKcal) {
    return {
      texto: "Aguardando meta da Luma",
      classe: ""
    };
  }

  const faixaMin = Number(metaKcal.faixaMin) || Number(metaKcal.metaKcal) - 150;
  const faixaMax = Number(metaKcal.faixaMax) || Number(metaKcal.metaKcal) + 150;

  if (totalConsumido <= 0) {
    return {
      texto: "Comece registrando suas refeições",
      classe: ""
    };
  }

  if (totalConsumido < faixaMin) {
    return {
      texto: "Abaixo da faixa da Luma",
      classe: "status-abaixo"
    };
  }

  if (totalConsumido <= faixaMax) {
    return {
      texto: "Dentro da meta da Luma ✅",
      classe: "status-dentro"
    };
  }

  return {
    texto: "Acima da faixa da Luma",
    classe: "status-acima"
  };
}

/* ==========================================
   COMPARTILHAMENTO
========================================== */

function compartilharProgresso() {
  const pesoAtual = byId("pesoAtualCard").innerText.replace("kg", "").trim();
  const eliminado = byId("totalEliminadoCard").innerText;

  const texto = `Bora focar! 🚀 Já eliminei ${eliminado} e estou pesando ${pesoAtual} kg. 💪 Acompanhando tudo pelo meu app EvoluaFit I.A.!`;

  if (navigator.share) {
    navigator.share({
      title: "Minha Evolução",
      text: texto
    }).catch(console.error);
  } else {
    alert("Seu navegador não suporta o compartilhamento nativo. Copie o texto:\n\n" + texto);
  }
}

let treinoAtualModalId = null;

function compartilharTreinoModal() {
  const treinos = JSON.parse(localStorage.getItem("historicoTreinos") || "[]");
  const treino = treinos.find(t => t.id === treinoAtualModalId);

  if (!treino) return;

  const nome = treino.tipo.charAt(0).toUpperCase() + treino.tipo.slice(1);

  const texto = `Treino concluído! ${nome}\n⏱️ Tempo: ${treino.tempo}\n🛣️ Distância: ${treino.distancia} km\n🔥 Gasto: ${treino.calorias} kcal.\nBora focar com o EvoluaFit I.A.! 💪`;

  if (navigator.share) {
    navigator.share({
      title: "Meu Treino",
      text: texto
    }).catch(console.error);
  } else {
    alert("Seu navegador não suporta o compartilhamento nativo. Copie o texto:\n\n" + texto);
  }
}

/* ==========================================
   IA DO DIA
========================================== */

function carregarAnaliseSalva() {
  const analise = JSON.parse(localStorage.getItem("iaAnaliseCache") || "null");
  const hoje = new Date().toLocaleDateString("pt-BR");

  if (analise && analise.data === hoje) {
    exibirRespostaIA(analise.plano, analise.dica);

    if (byId("iaStatusData")) {
      byId("iaStatusData").innerText = "Análise de hoje concluída ✅";
    }

    if (byId("btnAnalisarDia")) {
      byId("btnAnalisarDia").innerHTML = '<i class="bi bi-arrow-clockwise"></i> Atualizar análise';
    }
  }
}

async function solicitarAnaliseIA() {
  const btnIA = byId("btnAnalisarDia");
  const containerResposta = byId("iaRespostaContainer");
  const loading = byId("iaLoading");

  if (!btnIA || !containerResposta || !loading) return;

  btnIA.style.display = "none";
  containerResposta.style.display = "none";
  loading.style.display = "block";

  try {
    const dadosParaIA = montarDadosParaIA();

    const resposta = await fetch(`${API_BASE_URL}/analisar-dia`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dadosParaIA)
    });

    if (!resposta.ok) {
      throw new Error("Erro ao conectar com a IA. Status: " + resposta.status);
    }

    const resultado = await resposta.json();

    if (!resultado.sucesso) {
      throw new Error(resultado.erro || "Erro desconhecido");
    }

    const textoIA = resultado.resposta || "";
    const plano = extrairBlocoIA(textoIA, "PLANO:", "DICA:");
    const dica = extrairBlocoIA(textoIA, "DICA:", null);

    const cache = {
      data: new Date().toLocaleDateString("pt-BR"),
      plano: plano || textoIA,
      dica: dica || "Continue firme!"
    };

    localStorage.setItem("iaAnaliseCache", JSON.stringify(cache));

    exibirRespostaIA(cache.plano, cache.dica);
    btnIA.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Atualizar análise';

  } catch (erro) {
    console.error(erro);
    alert("Erro ao gerar análise da IA:\n\nMotivo: " + erro.message);
  } finally {
    loading.style.display = "none";
    btnIA.style.display = "block";
  }
}

function montarDadosParaIA() {
  const historicoPeso = JSON.parse(localStorage.getItem("historicoPeso") || "[]");
  const historicoAlimentacao = JSON.parse(localStorage.getItem("historicoAlimentacao") || "{}");
  const historicoTreinos = JSON.parse(localStorage.getItem("historicoTreinos") || "[]");
  const historicoSaude = obterHistoricoSaude();
  const hojeISO = new Date().toISOString().split("T")[0];

  return {
    dataHoje: hojeISO,
    perfilUsuario: obterPerfilUsuario(),
    metaKcalLuma: obterMetaKcalSalva(),
    altura: localStorage.getItem("usuarioAltura"),
    metaPeso: localStorage.getItem("usuarioMeta") || "80.0",
    historicoPeso: historicoPeso.slice(-10),
    diarioHoje: historicoAlimentacao[hojeISO] || null,
    ultimosTreinos: historicoTreinos.slice(-5),
    saudeHoje: obterSaudePorData(hojeISO),
    ultimosRegistrosSaude: historicoSaude.slice(-7),
    contextoSaudeLuma: gerarContextoSaudeLuma()
  };
}

function extrairBlocoIA(texto, inicio, fim) {
  const indexInicio = texto.indexOf(inicio);
  if (indexInicio === -1) return "";

  const corteInicio = indexInicio + inicio.length;
  const indexFim = fim ? texto.indexOf(fim) : -1;

  if (fim && indexFim !== -1) {
    return texto.substring(corteInicio, indexFim).trim();
  }

  return texto.substring(corteInicio).trim();
}

function exibirRespostaIA(plano, dica) {
  const blocoSaude = montarBlocoSaudeParaTela("plano");
  const planoFinal = blocoSaude ? `${blocoSaude}\n\n${plano}` : plano;

  if (byId("iaTextoPlano")) byId("iaTextoPlano").innerText = planoFinal;
  if (byId("iaTextoDica")) byId("iaTextoDica").innerText = dica;
  if (byId("iaRespostaContainer")) byId("iaRespostaContainer").style.display = "block";

  if (byId("iaStatusData")) {
    byId("iaStatusData").innerText =
      `Última análise: Hoje às ${new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      })}`;
  }
}

/* ==========================================
   TREINO COM IA
========================================== */

function carregarTreinoIASalvo() {
  const cache = JSON.parse(localStorage.getItem("treinoIACache") || "null");
  const hoje = new Date().toLocaleDateString("pt-BR");

  if (cache && cache.data === hoje && cache.treino) {
    exibirTreinoIA(cache.treino, true);

    if (byId("btnGerarTreinoIA")) {
      byId("btnGerarTreinoIA").innerHTML = '<i class="bi bi-arrow-clockwise"></i> Atualizar treino com I.A';
    }
  }
}

async function gerarTreinoIA() {
  const btn = byId("btnGerarTreinoIA");
  const container = byId("treinoIAContainer");
  const loading = byId("treinoIALoading");

  if (!btn || !container || !loading) return;

  const textoOriginal = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-cpu"></i> Gerando treino...';
  container.style.display = "none";
  loading.style.display = "block";

  try {
    const dadosTreino = montarDadosTreinoIA();

    const resposta = await fetch(`${API_BASE_URL}/gerar-treino`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dadosTreino)
    });

    if (!resposta.ok) {
      throw new Error("Erro ao conectar com a IA de treino. Status: " + resposta.status);
    }

    const resultado = await resposta.json();

    if (!resultado.sucesso) {
      throw new Error(resultado.erro || "Erro ao gerar treino.");
    }

    const treino = resultado.resposta || "Não consegui montar o treino agora.";

    const cache = {
      data: new Date().toLocaleDateString("pt-BR"),
      treino: treino
    };

    localStorage.setItem("treinoIACache", JSON.stringify(cache));

    exibirTreinoIA(treino, true);

    btn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Atualizar treino com I.A';

  } catch (erro) {
    console.error("Erro treino IA:", erro);

    alert(
      "Erro ao gerar treino:\n\n" +
      "Motivo: " + erro.message +
      "\n\nSe persistir, veja os logs do Render."
    );

    btn.innerHTML = textoOriginal;

  } finally {
    loading.style.display = "none";
    btn.disabled = false;
  }
}

function montarDadosTreinoIA() {
  const historicoPeso = JSON.parse(localStorage.getItem("historicoPeso") || "[]");
  const historicoAlimentacao = JSON.parse(localStorage.getItem("historicoAlimentacao") || "{}");
  const historicoTreinos = JSON.parse(localStorage.getItem("historicoTreinos") || "[]");
  const historicoSaude = obterHistoricoSaude();

  const hojeISO = new Date().toISOString().split("T")[0];
  const altura = parseFloat(localStorage.getItem("usuarioAltura"));
  const metaPeso = localStorage.getItem("usuarioMeta") || "80.0";

  const pesoOrdenado = [...historicoPeso].sort((a, b) => b.id - a.id);
  const pesoAtual = pesoOrdenado.length > 0 ? pesoOrdenado[0].peso : null;

  let imc = null;

  if (altura && pesoAtual) {
    imc = pesoAtual / (altura * altura);
  }

  const tipoAtividadeEscolhida = byId("tipoAtividade") ? byId("tipoAtividade").value : "caminhada";

  return {
    dataHoje: hojeISO,
    perfilUsuario: obterPerfilUsuario(),
    metaKcalLuma: obterMetaKcalSalva(),
    tipoAtividadeEscolhida: tipoAtividadeEscolhida,
    altura: altura || null,
    pesoAtual: pesoAtual,
    imc: imc ? Number(imc.toFixed(1)) : null,
    metaPeso: metaPeso,
    historicoPeso: historicoPeso.slice(-10),
    diarioHoje: historicoAlimentacao[hojeISO] || null,
    ultimosTreinos: historicoTreinos.slice(-7),
    saudeHoje: obterSaudePorData(hojeISO),
    ultimosRegistrosSaude: historicoSaude.slice(-7),
    contextoSaudeLuma: gerarContextoSaudeLuma()
  };
}

function exibirTreinoIA(treino, recolhido = true) {
  const container = byId("treinoIAContainer");
  const texto = byId("treinoIATexto");

  if (!container || !texto) return;

  const blocoSaude = montarBlocoSaudeParaTela("treino");
  const treinoFinal = blocoSaude ? `${blocoSaude}\n\n${treino}` : treino;

  texto.innerText = treinoFinal;
  container.style.display = "block";

  if (recolhido) {
    container.classList.add("treino-ia-collapsed");
  } else {
    container.classList.remove("treino-ia-collapsed");
  }
}

function alternarCardTreinoIA() {
  const container = byId("treinoIAContainer");

  if (container) {
    container.classList.toggle("treino-ia-collapsed");
  }
}

function recolherCardTreinoIA() {
  const container = byId("treinoIAContainer");

  if (container) {
    container.classList.add("treino-ia-collapsed");
  }
}

/* ==========================================
   SAÚDE
========================================== */

function configurarDataSaudePadrao() {
  if (byId("dataSaudeInput") && !byId("dataSaudeInput").value) {
    byId("dataSaudeInput").value = new Date().toISOString().split("T")[0];
  }
}

function obterHistoricoSaude() {
  return JSON.parse(localStorage.getItem("historicoSaude") || "[]");
}

function obterSaudePorData(dataISO) {
  const historico = obterHistoricoSaude();

  return historico
    .filter(item => item.dataRaw === dataISO)
    .sort((a, b) => b.id - a.id)[0] || null;
}

function salvarRegistroSaude() {
  const dataInput = byId("dataSaudeInput");
  const sistolicaInput = byId("pressaoSistolicaInput");
  const diastolicaInput = byId("pressaoDiastolicaInput");
  const batimentosInput = byId("batimentosInput");
  const periodoSelect = byId("periodoPressaoSelect");
  const observacaoPressaoInput = byId("observacaoPressaoInput");
  const glicoseInput = byId("glicoseInput");
  const momentoGlicoseSelect = byId("momentoGlicoseSelect");
  const observacaoGlicoseInput = byId("observacaoGlicoseInput");

  if (!dataInput) return;

  const data = dataInput.value || new Date().toISOString().split("T")[0];

  const sistolica = sistolicaInput && sistolicaInput.value ? Number(sistolicaInput.value) : null;
  const diastolica = diastolicaInput && diastolicaInput.value ? Number(diastolicaInput.value) : null;
  const batimentos = batimentosInput && batimentosInput.value ? Number(batimentosInput.value) : null;
  const glicose = glicoseInput && glicoseInput.value ? Number(glicoseInput.value) : null;

  const temPressao = sistolica || diastolica || batimentos;
  const temGlicose = glicose;

  if (!temPressao && !temGlicose) {
    alert("Digite pelo menos a pressão ou a glicose para salvar.");
    return;
  }

  if ((sistolica && sistolica <= 0) || (diastolica && diastolica <= 0) || (batimentos && batimentos <= 0) || (glicose && glicose <= 0)) {
    alert("Confira os valores digitados. Eles precisam ser maiores que zero.");
    return;
  }

  if ((sistolica && !diastolica) || (!sistolica && diastolica)) {
    alert("Para registrar pressão, informe sistólica e diastólica.");
    return;
  }

  const partes = data.split("-");

  const registro = {
    id: Date.now(),
    dataRaw: data,
    dataTexto: new Date(partes[0], partes[1] - 1, partes[2])
      .toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short"
      })
      .replace(".", ""),
    criadoEm: new Date().toLocaleString("pt-BR"),
    pressao: temPressao
      ? {
          sistolica: sistolica,
          diastolica: diastolica,
          batimentos: batimentos,
          periodo: periodoSelect ? periodoSelect.value : "",
          observacao: observacaoPressaoInput ? observacaoPressaoInput.value.trim() : ""
        }
      : null,
    glicose: temGlicose
      ? {
          valor: glicose,
          momento: momentoGlicoseSelect ? momentoGlicoseSelect.value : "",
          observacao: observacaoGlicoseInput ? observacaoGlicoseInput.value.trim() : ""
        }
      : null
  };

  registro.leitura = gerarLeituraSaude(registro);

  const historico = obterHistoricoSaude();

  historico.push(registro);

  localStorage.setItem("historicoSaude", JSON.stringify(historico));

  limparCamposSaude();
  carregarHistoricoSaude();

  const btn = byId("btnSalvarSaude");

  if (btn) {
    const textoOriginal = btn.innerHTML;

    btn.innerHTML = '<i class="bi bi-check-circle"></i> Saúde salva!';
    btn.style.background = "#10b981";

    setTimeout(() => {
      btn.innerHTML = textoOriginal;
      btn.style.background = "";
    }, 1800);
  }
}

function limparCamposSaude() {
  const ids = [
    "pressaoSistolicaInput",
    "pressaoDiastolicaInput",
    "batimentosInput",
    "observacaoPressaoInput",
    "glicoseInput",
    "observacaoGlicoseInput"
  ];

  ids.forEach(id => {
    if (byId(id)) byId(id).value = "";
  });

  if (byId("periodoPressaoSelect")) byId("periodoPressaoSelect").value = "";
  if (byId("momentoGlicoseSelect")) byId("momentoGlicoseSelect").value = "";
}

function gerarLeituraSaude(registro) {
  const mensagens = [];

  if (registro.pressao && registro.pressao.sistolica && registro.pressao.diastolica) {
    const s = Number(registro.pressao.sistolica);
    const d = Number(registro.pressao.diastolica);

    if (s >= 180 || d >= 120) {
      mensagens.push("⚠️ Pressão muito alta registrada. Se houver dor no peito, falta de ar, fraqueza, alteração na visão, dor de cabeça forte ou mal-estar intenso, procure atendimento imediatamente.");
    } else if (s >= 140 || d >= 90) {
      mensagens.push("🔴 Pressão acima do esperado. Hoje a Luma sugere evitar treino intenso, observar sintomas e acompanhar novas medições.");
    } else if (s >= 130 || d >= 80) {
      mensagens.push("🟠 Pressão em faixa de atenção. Pode ser útil observar estresse, sono, sal, hidratação e esforço físico do dia.");
    } else if (s < 90 || d < 60) {
      mensagens.push("🔵 Pressão baixa registrada. Se houver tontura, fraqueza ou desmaio, procure orientação profissional.");
    } else {
      mensagens.push("🟢 Pressão registrada em uma faixa comum para acompanhamento.");
    }

    if (registro.pressao.batimentos) {
      const bpm = Number(registro.pressao.batimentos);

      if (bpm > 110) {
        mensagens.push("💓 Batimentos elevados registrados. Observe se foi após esforço, ansiedade, café ou algum sintoma.");
      } else if (bpm < 50) {
        mensagens.push("💓 Batimentos baixos registrados. Se houver tontura ou fraqueza, busque orientação.");
      }
    }
  }

  if (registro.glicose && registro.glicose.valor) {
    const valor = Number(registro.glicose.valor);
    const momento = registro.glicose.momento || "";

    if (valor < 70) {
      mensagens.push("⚠️ Glicose baixa registrada. Se houver tremor, suor frio, confusão, fraqueza ou mal-estar, procure orientação rapidamente.");
    } else if (momento === "jejum" && valor >= 126) {
      mensagens.push("🔴 Glicose em jejum elevada. A Luma recomenda acompanhar a tendência e conversar com seu médico.");
    } else if (momento === "jejum" && valor >= 100) {
      mensagens.push("🟠 Glicose em jejum em atenção. Vale comparar com alimentação, sono e rotina dos últimos dias.");
    } else if (momento === "apos_refeicao" && valor >= 250) {
      mensagens.push("🔴 Glicose pós-refeição muito elevada registrada. Acompanhe sintomas e procure orientação profissional.");
    } else if (momento === "apos_refeicao" && valor >= 180) {
      mensagens.push("🟠 Glicose pós-refeição acima do ideal para muitas pessoas. Vale observar o que foi consumido.");
    } else {
      mensagens.push("🟢 Glicose registrada para acompanhamento da sua rotina.");
    }
  }

  if (mensagens.length === 0) {
    mensagens.push("Registro salvo. A Luma vai acompanhar a tendência com os próximos dados.");
  }

  mensagens.push("\n📌 Observação: essa leitura é apenas informativa e não substitui avaliação médica.");

  return mensagens.join("\n\n");
}

function gerarContextoSaudeLuma() {
  const hojeISO = new Date().toISOString().split("T")[0];
  const historico = obterHistoricoSaude().sort((a, b) => a.id - b.id);

  const saudeHoje = obterSaudePorData(hojeISO);
  const ultimoRegistro = saudeHoje || historico[historico.length - 1] || null;

  if (!ultimoRegistro) {
    return {
      temDados: false,
      nivel: "sem_dados",
      resumo: "Nenhum dado de saúde registrado ainda.",
      ajustePlano: "",
      ajusteTreino: ""
    };
  }

  const mensagens = [];
  let nivel = "normal";
  let evitarIntenso = false;
  let procurarAtendimento = false;

  if (ultimoRegistro.pressao && ultimoRegistro.pressao.sistolica && ultimoRegistro.pressao.diastolica) {
    const s = Number(ultimoRegistro.pressao.sistolica);
    const d = Number(ultimoRegistro.pressao.diastolica);

    if (s >= 180 || d >= 120) {
      nivel = "urgente";
      evitarIntenso = true;
      procurarAtendimento = true;

      mensagens.push(
        `Pressão registrada: ${s}/${d} mmHg. Valor muito alto. Se houver dor no peito, falta de ar, fraqueza, alteração na visão, dor de cabeça forte ou mal-estar intenso, procure atendimento imediatamente.`
      );

    } else if (s >= 140 || d >= 90) {
      nivel = "alerta";
      evitarIntenso = true;

      mensagens.push(
        `Pressão registrada: ${s}/${d} mmHg. Está acima do esperado. Hoje é melhor evitar treino intenso e priorizar algo leve.`
      );

    } else if (s >= 130 || d >= 80) {
      if (nivel !== "alerta" && nivel !== "urgente") nivel = "atencao";
      evitarIntenso = true;

      mensagens.push(
        `Pressão registrada: ${s}/${d} mmHg. Está em faixa de atenção. A Luma recomenda observar estresse, sono, sal e hidratação.`
      );

    } else if (s < 90 || d < 60) {
      if (nivel !== "alerta" && nivel !== "urgente") nivel = "atencao";
      evitarIntenso = true;

      mensagens.push(
        `Pressão registrada: ${s}/${d} mmHg. Está baixa. Se houver tontura, fraqueza ou mal-estar, evite esforço e procure orientação.`
      );

    } else {
      mensagens.push(
        `Pressão registrada: ${s}/${d} mmHg. Sem alerta importante no momento.`
      );
    }

    if (ultimoRegistro.pressao.batimentos) {
      const bpm = Number(ultimoRegistro.pressao.batimentos);

      if (bpm > 110) {
        if (nivel !== "urgente") nivel = "alerta";
        evitarIntenso = true;

        mensagens.push(
          `Batimentos registrados: ${bpm} bpm. Está elevado. Observe se foi após esforço, ansiedade, café ou algum sintoma.`
        );
      } else if (bpm < 50) {
        if (nivel !== "urgente") nivel = "atencao";
        evitarIntenso = true;

        mensagens.push(
          `Batimentos registrados: ${bpm} bpm. Está baixo. Se houver tontura ou fraqueza, procure orientação.`
        );
      }
    }
  }

  if (ultimoRegistro.glicose && ultimoRegistro.glicose.valor) {
    const valor = Number(ultimoRegistro.glicose.valor);
    const momento = ultimoRegistro.glicose.momento || "";

    if (valor < 70) {
      nivel = "alerta";
      evitarIntenso = true;

      mensagens.push(
        `Glicose registrada: ${valor} mg/dL. Está baixa. Se houver tremor, suor frio, confusão, fraqueza ou mal-estar, procure orientação rapidamente.`
      );

    } else if (momento === "jejum" && valor >= 126) {
      if (nivel !== "urgente") nivel = "alerta";

      mensagens.push(
        `Glicose em jejum: ${valor} mg/dL. Está elevada. A Luma recomenda acompanhar a tendência e conversar com seu médico.`
      );

    } else if (momento === "jejum" && valor >= 100) {
      if (nivel !== "alerta" && nivel !== "urgente") nivel = "atencao";

      mensagens.push(
        `Glicose em jejum: ${valor} mg/dL. Está em atenção. Vale observar alimentação, sono e rotina dos últimos dias.`
      );

    } else if (momento === "apos_refeicao" && valor >= 250) {
      if (nivel !== "urgente") nivel = "alerta";

      mensagens.push(
        `Glicose após refeição: ${valor} mg/dL. Está muito elevada. Acompanhe sintomas e procure orientação profissional.`
      );

    } else if (momento === "apos_refeicao" && valor >= 180) {
      if (nivel !== "alerta" && nivel !== "urgente") nivel = "atencao";

      mensagens.push(
        `Glicose após refeição: ${valor} mg/dL. Está acima do ideal para muitas pessoas. Vale revisar o que foi consumido.`
      );

    } else {
      mensagens.push(
        `Glicose registrada: ${valor} mg/dL. Sem alerta importante no momento.`
      );
    }
  }

  let ajustePlano = "";
  let ajusteTreino = "";

  if (procurarAtendimento) {
    ajustePlano =
      "Hoje a prioridade é segurança. A Luma recomenda não fazer treino e procurar atendimento se houver sintomas.";
    ajusteTreino =
      "Treino não recomendado agora. Priorize repouso e orientação profissional, principalmente se houver sintomas.";
  } else if (evitarIntenso) {
    ajustePlano =
      "Hoje a Luma recomenda uma rotina mais leve, boa hidratação, refeições equilibradas e atenção aos sinais do corpo.";
    ajusteTreino =
      "Prefira caminhada leve, alongamento ou descanso. Evite corrida intensa, treino pesado ou esforço alto hoje.";
  } else {
    ajustePlano =
      "Sem alerta importante nos dados de saúde registrados. A Luma pode seguir com plano equilibrado.";
    ajusteTreino =
      "Sem alerta importante nos dados de saúde registrados. Treino leve ou moderado pode ser considerado conforme disposição.";
  }

  return {
    temDados: true,
    nivel: nivel,
    data: ultimoRegistro.dataRaw,
    resumo: mensagens.join(" "),
    ajustePlano: ajustePlano,
    ajusteTreino: ajusteTreino,
    registro: ultimoRegistro
  };
}

function montarBlocoSaudeParaTela(tipo = "plano") {
  const contexto = gerarContextoSaudeLuma();

  if (!contexto.temDados) return "";

  const titulo = "🩺 Ajuste de saúde da Luma";

  const aviso =
    tipo === "treino"
      ? contexto.ajusteTreino
      : contexto.ajustePlano;

  return `${titulo}\n${contexto.resumo}\n\n${aviso}\n\n📌 A Luma não substitui médico, não altera medicação e não faz diagnóstico.`;
}

function carregarHistoricoSaude() {
  const lista = byId("historicoSaudeLista");
  const historico = obterHistoricoSaude();

  if (!lista) {
    atualizarResumoSaude();
    atualizarGraficosSaude();
    return;
  }

  lista.innerHTML = "";

  const ordenado = [...historico].sort((a, b) => b.id - a.id);

  ordenado.forEach(item => {
    const pressaoTxt = item.pressao && item.pressao.sistolica && item.pressao.diastolica
      ? `❤️ Pressão: ${item.pressao.sistolica}/${item.pressao.diastolica} mmHg${item.pressao.batimentos ? ` • ${item.pressao.batimentos} bpm` : ""}`
      : "";

    const glicoseTxt = item.glicose && item.glicose.valor
      ? `💧 Glicose: ${item.glicose.valor} mg/dL${item.glicose.momento ? ` • ${formatarMomentoGlicose(item.glicose.momento)}` : ""}`
      : "";

    const detalhes = [pressaoTxt, glicoseTxt].filter(Boolean).join("<br>");

    lista.innerHTML += `
      <div class="history-item">
        <div class="history-info">
          <span class="history-date">${item.dataTexto}</span>
          <span class="history-medidas">${detalhes}</span>
        </div>

        <div class="history-actions">
          <button class="btn-delete" onclick="event.stopPropagation(); deletarRegistroSaude(${item.id})">Excluir</button>
        </div>
      </div>
    `;
  });

  atualizarResumoSaude();
  atualizarGraficosSaude();
}

function atualizarResumoSaude() {
  const status = byId("statusSaudeTexto");
  const historico = obterHistoricoSaude();

  if (!status) return;

  if (historico.length === 0) {
    status.innerText = "Registre sua pressão ou glicose para a Luma acompanhar seus dados com mais cuidado.";
    return;
  }

  const ultimo = [...historico].sort((a, b) => b.id - a.id)[0];

  status.innerText = ultimo.leitura || gerarLeituraSaude(ultimo);
}

function deletarRegistroSaude(id) {
  if (!confirm("Excluir este registro de saúde?")) return;

  const historico = obterHistoricoSaude();

  localStorage.setItem(
    "historicoSaude",
    JSON.stringify(historico.filter(item => item.id !== id))
  );

  carregarHistoricoSaude();
}

function exportarSaudeCSV() {
  const historico = obterHistoricoSaude().sort((a, b) => b.id - a.id);

  if (historico.length === 0) {
    alert("Nenhum registro de saúde para exportar.");
    return;
  }

  let csv = "Data,Sistolica,Diastolica,Batimentos,Periodo Pressao,Observacao Pressao,Glicose,Momento Glicose,Observacao Glicose\n";

  historico.forEach(item => {
    const p = item.pressao || {};
    const g = item.glicose || {};

    csv += [
      item.dataRaw || "",
      p.sistolica || "",
      p.diastolica || "",
      p.batimentos || "",
      formatarPeriodoPressao(p.periodo || ""),
      limparCampoCSV(p.observacao || ""),
      g.valor || "",
      formatarMomentoGlicose(g.momento || ""),
      limparCampoCSV(g.observacao || "")
    ].join(",") + "\n";
  });

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = "historico_saude_luma.csv";
  link.click();
}

function limparCampoCSV(valor) {
  return String(valor || "").replace(/,/g, " ").replace(/\n/g, " ");
}

function formatarPeriodoPressao(periodo) {
  const mapa = {
    manha: "Manhã",
    tarde: "Tarde",
    noite: "Noite",
    madrugada: "Madrugada"
  };

  return mapa[periodo] || periodo || "";
}

function formatarMomentoGlicose(momento) {
  const mapa = {
    jejum: "Jejum",
    antes_refeicao: "Antes da refeição",
    apos_refeicao: "Após refeição",
    antes_dormir: "Antes de dormir",
    outro: "Outro"
  };

  return mapa[momento] || momento || "";
}

function inicializarSaudeSwiper() {
  if (typeof Swiper === "undefined") return;
  if (!document.querySelector(".saudeSwiper")) return;

  if (saudeSwiper) {
    saudeSwiper.update();
    return;
  }

  saudeSwiper = new Swiper(".saudeSwiper", {
    slidesPerView: 1,
    spaceBetween: 12,
    pagination: {
      el: ".saude-swiper-pagination",
      clickable: true
    },
    observer: true,
    observeParents: true,
    on: {
      slideChangeTransitionEnd: function() {
        atualizarGraficosSaude();
      }
    }
  });
}

function atualizarGraficosSaude() {
  inicializarSaudeSwiper();

  const card = byId("cardGraficosSaude");
  const historico = obterHistoricoSaude();

  const temPressao = historico.some(item => item.pressao && item.pressao.sistolica && item.pressao.diastolica);
  const temGlicose = historico.some(item => item.glicose && item.glicose.valor);

  if (card) {
    card.style.display = temPressao || temGlicose ? "block" : "none";
  }

  setTimeout(() => {
    renderizarGraficoPressaoSaude();
    renderizarGraficoGlicoseSaude();

    if (saudeSwiper) {
      saudeSwiper.update();
    }
  }, 80);
}

function renderizarGraficoPressaoSaude() {
  const canvas = byId("graficoPressaoSaude");

  if (!canvas || typeof Chart === "undefined") return;

  const historico = obterHistoricoSaude()
    .filter(item => item.pressao && item.pressao.sistolica && item.pressao.diastolica)
    .sort((a, b) => new Date(a.dataRaw) - new Date(b.dataRaw))
    .slice(-10);

  if (graficoPressaoSaude) {
    graficoPressaoSaude.destroy();
    graficoPressaoSaude = null;
  }

  if (historico.length === 0) return;

  const temaAtual = document.documentElement.getAttribute("data-theme");
  const dark = temaAtual === "dark";

  const corTexto = dark ? "#94a3b8" : "#64748b";
  const corGrid = dark ? "rgba(148, 163, 184, 0.18)" : "rgba(100, 116, 139, 0.18)";

  const ctx = canvas.getContext("2d");

  graficoPressaoSaude = new Chart(ctx, {
    type: "line",
    data: {
      labels: historico.map(item => formatarDataCurta(item.dataRaw)),
      datasets: [
        {
          label: "Sistólica",
          data: historico.map(item => Number(item.pressao.sistolica) || 0),
          borderColor: "#ef4444",
          backgroundColor: "rgba(239, 68, 68, 0.10)",
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: false
        },
        {
          label: "Diastólica",
          data: historico.map(item => Number(item.pressao.diastolica) || 0),
          borderColor: "#a855f7",
          backgroundColor: "rgba(168, 85, 247, 0.10)",
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 5,
          pointHoverRadius: 7,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 700,
        easing: "easeOutQuart"
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: corTexto,
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            font: {
              size: 11,
              weight: "700"
            }
          }
        },
        title: {
          display: true,
          text: "Pressão por data",
          color: corTexto,
          font: {
            size: 15,
            weight: "800"
          },
          padding: {
            bottom: 14
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          suggestedMin: 50,
          suggestedMax: 180,
          grid: {
            color: corGrid,
            drawBorder: false
          },
          ticks: {
            color: corTexto,
            font: {
              size: 11,
              weight: "700"
            }
          }
        },
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: corTexto,
            font: {
              size: 12,
              weight: "800"
            }
          }
        }
      }
    }
  });
}

function renderizarGraficoGlicoseSaude() {
  const canvas = byId("graficoGlicoseSaude");

  if (!canvas || typeof Chart === "undefined") return;

  const historico = obterHistoricoSaude()
    .filter(item => item.glicose && item.glicose.valor)
    .sort((a, b) => new Date(a.dataRaw) - new Date(b.dataRaw))
    .slice(-10);

  if (graficoGlicoseSaude) {
    graficoGlicoseSaude.destroy();
    graficoGlicoseSaude = null;
  }

  if (historico.length === 0) return;

  const temaAtual = document.documentElement.getAttribute("data-theme");
  const dark = temaAtual === "dark";

  const corTexto = dark ? "#94a3b8" : "#64748b";
  const corGrid = dark ? "rgba(148, 163, 184, 0.18)" : "rgba(100, 116, 139, 0.18)";

  const ctx = canvas.getContext("2d");

  const gradiente = ctx.createLinearGradient(0, 0, 0, 210);
  gradiente.addColorStop(0, "rgba(14, 165, 233, 0.45)");
  gradiente.addColorStop(1, "rgba(14, 165, 233, 0.00)");

  graficoGlicoseSaude = new Chart(ctx, {
    type: "line",
    data: {
      labels: historico.map(item => formatarDataCurta(item.dataRaw)),
      datasets: [
        {
          label: "Glicose",
          data: historico.map(item => Number(item.glicose.valor) || 0),
          borderColor: "#0ea5e9",
          backgroundColor: gradiente,
          borderWidth: 4,
          tension: 0.42,
          pointRadius: 6,
          pointHoverRadius: 7,
          pointBorderWidth: 4,
          pointBackgroundColor: dark ? "#1e293b" : "#ffffff",
          pointBorderColor: "#0ea5e9",
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 700,
        easing: "easeOutQuart"
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: corTexto,
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            font: {
              size: 11,
              weight: "700"
            }
          }
        },
        title: {
          display: true,
          text: "Glicose por data",
          color: corTexto,
          font: {
            size: 15,
            weight: "800"
          },
          padding: {
            bottom: 14
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const valor = context.parsed.y || 0;
              return `Glicose: ${valor} mg/dL`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: false,
          suggestedMin: 60,
          suggestedMax: Math.max(...historico.map(item => Number(item.glicose.valor) || 0), 180) * 1.12,
          grid: {
            color: corGrid,
            drawBorder: false
          },
          ticks: {
            color: corTexto,
            font: {
              size: 11,
              weight: "700"
            }
          }
        },
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: corTexto,
            font: {
              size: 12,
              weight: "800"
            }
          }
        }
      }
    }
  });
}

/* ==========================================
   TREINO, GPS E MAPAS
========================================== */

let isTreinando = false;
let gpsWatchId = null;
let timerInterval = null;
let tempoInicio = 0;
let distanciaTotalKm = 0;
let ultimaPosicao = null;

let mapaTreino = null;
let marcadorGPS = null;
let rotaPolyline = null;
let coordenadasRota = [];

let mapaDetalhe = null;
let detalhePolyline = null;

function iniciarMapaTreino() {
  const mapaContainer = byId("mapaTreinoContainer");

  if (!mapaContainer || typeof L === "undefined") return;

  if (mapaTreino !== null) {
    mapaTreino.invalidateSize();
    return;
  }

  mapaTreino = L.map("mapaTreinoContainer").setView([-14.235, -51.925], 4);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "© OpenStreetMap"
  }).addTo(mapaTreino);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const latLng = [pos.coords.latitude, pos.coords.longitude];

        mapaTreino.setView(latLng, 16);

        marcadorGPS = L.circleMarker(latLng, {
          color: "#0ea5e9",
          radius: 8,
          fillOpacity: 1
        }).addTo(mapaTreino);
      },
      () => {
        console.log("Aguardando permissão de GPS");
      }
    );
  }
}

function iniciarTreino() {
  if (!navigator.geolocation) {
    return alert("Seu navegador não suporta GPS.");
  }

  if (!mapaTreino) iniciarMapaTreino();

  isTreinando = true;
  distanciaTotalKm = 0;
  ultimaPosicao = null;
  coordenadasRota = [];
  tempoInicio = Date.now();

  if (byId("displayDistancia")) byId("displayDistancia").innerText = "0.00";
  if (byId("displayVelocidade")) byId("displayVelocidade").innerText = "0.0";
  if (byId("displayCalorias")) byId("displayCalorias").innerText = "0";
  if (byId("displayTempo")) byId("displayTempo").innerText = "00:00:00";

  if (byId("btnIniciarTreino")) byId("btnIniciarTreino").style.display = "none";
  if (byId("btnPararTreino")) byId("btnPararTreino").style.display = "block";
  if (byId("msgGpsErro")) byId("msgGpsErro").style.display = "none";

  if (rotaPolyline && mapaTreino) mapaTreino.removeLayer(rotaPolyline);

  rotaPolyline = L.polyline([], {
    color: "#ef4444",
    weight: 5
  }).addTo(mapaTreino);

  timerInterval = setInterval(atualizarCronometro, 1000);

  gpsWatchId = navigator.geolocation.watchPosition(
    processarPosicaoGps,
    erroGps,
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000
    }
  );
}

function processarPosicaoGps(posicao) {
  if (!mapaTreino) return;
  if (posicao.coords.accuracy > 40) return;

  const latLng = [posicao.coords.latitude, posicao.coords.longitude];

  if (marcadorGPS) {
    marcadorGPS.setLatLng(latLng);
  } else {
    marcadorGPS = L.circleMarker(latLng, {
      color: "#0ea5e9",
      radius: 8,
      fillOpacity: 1
    }).addTo(mapaTreino);
  }

  mapaTreino.setView(latLng);

  if (isTreinando) {
    coordenadasRota.push(latLng);

    if (rotaPolyline) {
      rotaPolyline.setLatLngs(coordenadasRota);
    }

    const coordAtual = {
      lat: latLng[0],
      lon: latLng[1]
    };

    if (ultimaPosicao) {
      distanciaTotalKm += calcularDistanciaHaversine(ultimaPosicao, coordAtual);
    }

    ultimaPosicao = coordAtual;

    atualizarTelaTreino();
  }
}

function erroGps(erro) {
  console.warn("Erro no GPS:", erro);

  if (byId("msgGpsErro")) {
    byId("msgGpsErro").style.display = "block";
  }
}

function calcularDistanciaHaversine(pos1, pos2) {
  const R = 6371;
  const dLat = (pos2.lat - pos1.lat) * Math.PI / 180;
  const dLon = (pos2.lon - pos1.lon) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(pos1.lat * Math.PI / 180) *
    Math.cos(pos2.lat * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function atualizarCronometro() {
  const diferenca = Date.now() - tempoInicio;

  const horas = Math.floor((diferenca % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
  const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);

  if (byId("displayTempo")) {
    byId("displayTempo").innerText =
      String(horas).padStart(2, "0") + ":" +
      String(minutos).padStart(2, "0") + ":" +
      String(segundos).padStart(2, "0");
  }

  atualizarTelaTreino();
}

function atualizarTelaTreino() {
  if (!isTreinando) return;

  const tempoHoras = (Date.now() - tempoInicio) / (1000 * 60 * 60);
  const velocidade = tempoHoras > 0 ? distanciaTotalKm / tempoHoras : 0;

  const historico = obterHistorico();
  const ordenado = [...historico].sort((a, b) => b.id - a.id);
  const pesoAtual = ordenado.length > 0 ? ordenado[0].peso : 80;

  const tipo = byId("tipoAtividade") ? byId("tipoAtividade").value : "caminhada";
  const fatorCalorico = tipo === "corrida" ? 1.03 : 0.75;

  if (byId("displayDistancia")) byId("displayDistancia").innerText = distanciaTotalKm.toFixed(2);
  if (byId("displayVelocidade")) byId("displayVelocidade").innerText = velocidade.toFixed(1);
  if (byId("displayCalorias")) byId("displayCalorias").innerText = Math.round(pesoAtual * distanciaTotalKm * fatorCalorico);
}

function encerrarTreino() {
  if (!isTreinando) return;

  isTreinando = false;

  clearInterval(timerInterval);

  if (gpsWatchId) {
    navigator.geolocation.clearWatch(gpsWatchId);
  }

  if (byId("btnIniciarTreino")) byId("btnIniciarTreino").style.display = "block";
  if (byId("btnPararTreino")) byId("btnPararTreino").style.display = "none";

  const treinos = JSON.parse(localStorage.getItem("historicoTreinos") || "[]");

  treinos.push({
    id: Date.now(),
    data: new Date().toLocaleDateString("pt-BR"),
    tipo: byId("tipoAtividade") ? byId("tipoAtividade").value : "caminhada",
    tempo: byId("displayTempo") ? byId("displayTempo").innerText : "00:00:00",
    distancia: byId("displayDistancia") ? byId("displayDistancia").innerText : "0.00",
    calorias: byId("displayCalorias") ? byId("displayCalorias").innerText : "0",
    rota: coordenadasRota
  });

  localStorage.setItem("historicoTreinos", JSON.stringify(treinos));

  carregarHistoricoTreinos();

  alert("Treino salvo com sucesso!");
}

function carregarHistoricoTreinos() {
  const treinos = JSON.parse(localStorage.getItem("historicoTreinos") || "[]");
  const lista = byId("historicoTreinosLista");

  if (!lista) return;

  lista.innerHTML = "";

  const ordenado = [...treinos].sort((a, b) => b.id - a.id);

  ordenado.forEach(treino => {
    const icone = treino.tipo === "corrida"
      ? '<i class="bi bi-lightning-charge"></i>'
      : '<i class="bi bi-person-walking"></i>';

    const nome = treino.tipo.charAt(0).toUpperCase() + treino.tipo.slice(1);

    lista.innerHTML += `
      <div class="history-item" onclick="abrirModalTreino(${treino.id})">
        <div class="history-info">
          <span class="history-date">${icone} ${nome} - ${treino.data}</span>
          <span class="history-medidas">⏱️ ${treino.tempo} | 🛣️ ${treino.distancia} km</span>
        </div>

        <div class="history-actions" style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
          <span class="history-weight" style="color: #f97316;">🔥 ${treino.calorias} kcal</span>
          <button class="btn-delete" onclick="event.stopPropagation(); deletarTreino(${treino.id})">Excluir</button>
        </div>
      </div>
    `;
  });
}

function deletarTreino(id) {
  if (!confirm("Excluir este treino definitivamente?")) return;

  const treinos = JSON.parse(localStorage.getItem("historicoTreinos") || "[]");

  localStorage.setItem(
    "historicoTreinos",
    JSON.stringify(treinos.filter(t => t.id !== id))
  );

  carregarHistoricoTreinos();
}

function abrirModalTreino(id) {
  const treinos = JSON.parse(localStorage.getItem("historicoTreinos") || "[]");
  const treino = treinos.find(t => t.id === id);

  if (!treino) return;

  treinoAtualModalId = id;

  if (byId("modalTituloTreino")) {
    byId("modalTituloTreino").innerText =
      `${treino.tipo === "corrida" ? "Corrida" : "Caminhada"} - ${treino.data}`;
  }

  if (byId("modalDistancia")) byId("modalDistancia").innerText = treino.distancia;
  if (byId("modalTempo")) byId("modalTempo").innerText = treino.tempo;
  if (byId("modalCalorias")) byId("modalCalorias").innerText = treino.calorias;
  if (byId("modalTreino")) byId("modalTreino").style.display = "flex";

  setTimeout(() => {
    if (!byId("mapaDetalheContainer") || typeof L === "undefined") return;

    if (!mapaDetalhe) {
      mapaDetalhe = L.map("mapaDetalheContainer");

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19
      }).addTo(mapaDetalhe);

      detalhePolyline = L.polyline([], {
        color: "#ef4444",
        weight: 5
      }).addTo(mapaDetalhe);
    }

    mapaDetalhe.invalidateSize();

    if (treino.rota && treino.rota.length > 0) {
      detalhePolyline.setLatLngs(treino.rota);
      mapaDetalhe.fitBounds(detalhePolyline.getBounds());
    } else {
      detalhePolyline.setLatLngs([]);
      mapaDetalhe.setView([-14.235, -51.925], 4);
    }
  }, 200);
}

function fecharModalTreino() {
  if (byId("modalTreino")) {
    byId("modalTreino").style.display = "none";
  }
}

/* ==========================================
   DIÁRIO, ÁGUA E KCAL
========================================== */

const itensPreProgramados = {
  cafe: ["Pão Francês", "Fruta", "Iogurte", "Café Preto", "Suco", "Ovos", "Biscoito"],
  almoco: ["Arroz", "Feijão", "Frango", "Carne", "Salada", "Legumes", "Macarrão"],
  jantar: ["Sopa", "Salada", "Frango", "Omelete", "Pão", "Iogurte", "Fruta"]
};

let refeicoesAtuais = {
  cafe: [],
  almoco: [],
  jantar: [],
  agua: 0,
  kcal: null,
  assinaturaKcal: null
};

function configurarDataAlimentacaoPadrao() {
  if (byId("dataAlimentacaoInput")) {
    byId("dataAlimentacaoInput").value = new Date().toISOString().split("T")[0];
  }
}

function carregarRefeicoesDoDia() {
  const inputData = byId("dataAlimentacaoInput");

  if (!inputData) return;

  const dataSelect = inputData.value;
  const historico = JSON.parse(localStorage.getItem("historicoAlimentacao") || "{}");

  if (historico[dataSelect]) {
    refeicoesAtuais = JSON.parse(JSON.stringify(historico[dataSelect]));

    if (typeof refeicoesAtuais.agua === "undefined") refeicoesAtuais.agua = 0;
    if (!Array.isArray(refeicoesAtuais.cafe)) refeicoesAtuais.cafe = [];
    if (!Array.isArray(refeicoesAtuais.almoco)) refeicoesAtuais.almoco = [];
    if (!Array.isArray(refeicoesAtuais.jantar)) refeicoesAtuais.jantar = [];
    if (typeof refeicoesAtuais.kcal === "undefined") refeicoesAtuais.kcal = null;
    if (typeof refeicoesAtuais.assinaturaKcal === "undefined") refeicoesAtuais.assinaturaKcal = null;

  } else {
    refeicoesAtuais = {
      cafe: [],
      almoco: [],
      jantar: [],
      agua: 0,
      kcal: null,
      assinaturaKcal: null
    };
  }

  renderizarTagsDeComida();
  renderizarAgua();
  renderizarCalorias();
}

function obterMetaAguaDinamica() {
  const historico = obterHistorico();
  const ordenado = [...historico].sort((a, b) => b.id - a.id);
  const pesoAtual = ordenado.length > 0 ? ordenado[0].peso : 0;

  if (pesoAtual > 0) return Math.round(pesoAtual * 35);

  return 2000;
}

function adicionarAgua(qtd) {
  refeicoesAtuais.agua += qtd;

  if (refeicoesAtuais.agua < 0) refeicoesAtuais.agua = 0;

  renderizarAgua();
}

function renderizarAgua() {
  const atual = refeicoesAtuais.agua;
  const metaAgua = obterMetaAguaDinamica();

  if (byId("aguaAtualDisplay")) byId("aguaAtualDisplay").innerText = atual;
  if (byId("aguaMetaDisplay")) byId("aguaMetaDisplay").innerText = metaAgua;

  let porcentagem = (atual / metaAgua) * 100;

  if (porcentagem > 100) porcentagem = 100;

  const progressFill = byId("aguaProgressFill");

  if (progressFill) {
    progressFill.style.width = `${porcentagem}%`;
    progressFill.style.backgroundColor = atual >= metaAgua ? "#10b981" : "#0ea5e9";
  }
}

function renderizarTagsDeComida() {
  ["cafe", "almoco", "jantar"].forEach(refeicao => {
    const container = byId(`tags-${refeicao}`);

    if (!container) return;

    container.innerHTML = "";

    if (!Array.isArray(refeicoesAtuais[refeicao])) {
      refeicoesAtuais[refeicao] = [];
    }

    const itensUnicos = new Set([
      ...itensPreProgramados[refeicao],
      ...refeicoesAtuais[refeicao]
    ]);

    itensUnicos.forEach(item => {
      const isSelected = refeicoesAtuais[refeicao].includes(item);

      const tag = document.createElement("button");

      tag.type = "button";
      tag.className = `food-tag ${isSelected ? "selected" : ""}`;
      tag.innerText = item;

      tag.addEventListener("click", function(event) {
        event.preventDefault();

        const index = refeicoesAtuais[refeicao].indexOf(item);

        if (index > -1) {
          refeicoesAtuais[refeicao].splice(index, 1);
        } else {
          refeicoesAtuais[refeicao].push(item);
        }

        marcarCaloriasComoDesatualizadas();
        renderizarTagsDeComida();
        renderizarCalorias();
      });

      container.appendChild(tag);
    });
  });
}

function adicionarComidaCustomizada(refeicao) {
  const input = byId(`custom-${refeicao}`);

  if (!input) return;

  const valor = input.value.trim();
  const valorFormatado = valor.charAt(0).toUpperCase() + valor.slice(1);

  if (valorFormatado && !refeicoesAtuais[refeicao].includes(valorFormatado)) {
    refeicoesAtuais[refeicao].push(valorFormatado);
    input.value = "";
    marcarCaloriasComoDesatualizadas();
    renderizarTagsDeComida();
    renderizarCalorias();
  }
}

function obterAssinaturaRefeicoes() {
  return JSON.stringify({
    cafe: [...(refeicoesAtuais.cafe || [])].sort(),
    almoco: [...(refeicoesAtuais.almoco || [])].sort(),
    jantar: [...(refeicoesAtuais.jantar || [])].sort()
  });
}

function marcarCaloriasComoDesatualizadas() {
  if (refeicoesAtuais.kcal) {
    refeicoesAtuais.assinaturaKcal = null;
  }
}

function renderizarCalorias() {
  const kcal = refeicoesAtuais.kcal || null;
  const metaKcal = obterMetaKcalSalva();

  const totalConsumido = kcal && typeof kcal.total !== "undefined"
    ? Number(kcal.total) || 0
    : 0;

  if (byId("kcal-cafe")) byId("kcal-cafe").innerText = kcal && typeof kcal.cafe !== "undefined" ? kcal.cafe : "--";
  if (byId("kcal-almoco")) byId("kcal-almoco").innerText = kcal && typeof kcal.almoco !== "undefined" ? kcal.almoco : "--";
  if (byId("kcal-jantar")) byId("kcal-jantar").innerText = kcal && typeof kcal.jantar !== "undefined" ? kcal.jantar : "--";
  if (byId("kcal-total")) byId("kcal-total").innerText = kcal && typeof kcal.total !== "undefined" ? kcal.total : "--";

  const metaDisplay = byId("kcal-meta-luma");
  const restanteDisplay = byId("kcal-restante");
  const statusDisplay = byId("kcal-status-dia");

  if (metaKcal && metaKcal.metaKcal) {
    const metaValor = Number(metaKcal.metaKcal) || 0;
    const restante = Math.max(metaValor - totalConsumido, 0);

    if (metaDisplay) metaDisplay.innerText = metaValor;
    if (restanteDisplay) restanteDisplay.innerText = restante;

    const status = calcularStatusKcal(totalConsumido, metaKcal);

    if (statusDisplay) {
      statusDisplay.innerText = status.texto;
      statusDisplay.className = `kcal-status-pill ${status.classe}`;
    }

  } else {
    if (metaDisplay) metaDisplay.innerText = "--";
    if (restanteDisplay) restanteDisplay.innerText = "--";

    if (statusDisplay) {
      statusDisplay.innerText = "Aguardando meta da Luma";
      statusDisplay.className = "kcal-status-pill";
    }
  }

  const observacao = byId("kcal-observacao");
  const assinaturaAtual = obterAssinaturaRefeicoes();

  if (observacao) {
    if (!kcal) {
      observacao.innerText = metaKcal
        ? "As calorias serão estimadas ao salvar o diário."
        : "Atualize a meta de kcal para a Luma comparar seu consumo.";

      atualizarGraficosKcalCarrossel();
      return;
    }

    if (refeicoesAtuais.assinaturaKcal !== assinaturaAtual) {
      observacao.innerText = "Você alterou alimentos. Salve o diário para recalcular as kcal.";

      atualizarGraficosKcalCarrossel();
      return;
    }

    if (metaKcal && metaKcal.observacao) {
      observacao.innerText = metaKcal.observacao;

      atualizarGraficosKcalCarrossel();
      return;
    }

    observacao.innerText = kcal.observacao || "Estimativa aproximada calculada pela Luma.";
  }

  atualizarGraficosKcalCarrossel();
}

async function salvarRefeicoes() {
  const inputData = byId("dataAlimentacaoInput");
  const btn = byId("btnSalvarAlimentacao");

  if (!inputData || !btn) return;

  const dataSelect = inputData.value;
  const historico = JSON.parse(localStorage.getItem("historicoAlimentacao") || "{}");
  const textoOriginal = btn.innerHTML;
  const corOriginal = btn.style.backgroundColor;

  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Salvando e calculando kcal...';
  btn.style.backgroundColor = "#f97316";

  const assinaturaAtual = obterAssinaturaRefeicoes();
  const temAlimento =
    refeicoesAtuais.cafe.length > 0 ||
    refeicoesAtuais.almoco.length > 0 ||
    refeicoesAtuais.jantar.length > 0;

  try {
    if (temAlimento && refeicoesAtuais.assinaturaKcal !== assinaturaAtual) {
      const calorias = await calcularCaloriasComIA();

      refeicoesAtuais.kcal = {
        cafe: Number(calorias.cafe) || 0,
        almoco: Number(calorias.almoco) || 0,
        jantar: Number(calorias.jantar) || 0,
        total: Number(calorias.total) || 0,
        observacao: calorias.observacao || "Estimativa aproximada calculada pela Luma."
      };

      refeicoesAtuais.assinaturaKcal = assinaturaAtual;
    }

    if (!temAlimento) {
      refeicoesAtuais.kcal = {
        cafe: 0,
        almoco: 0,
        jantar: 0,
        total: 0,
        observacao: "Nenhum alimento registrado."
      };

      refeicoesAtuais.assinaturaKcal = assinaturaAtual;
    }

    historico[dataSelect] = refeicoesAtuais;

    localStorage.setItem("historicoAlimentacao", JSON.stringify(historico));

    renderizarCalorias();

    btn.innerHTML = '<i class="bi bi-check-circle"></i> Diário salvo com kcal!';
    btn.style.backgroundColor = "#10b981";

  } catch (erro) {
    console.error("Erro ao calcular calorias:", erro);

    historico[dataSelect] = refeicoesAtuais;
    localStorage.setItem("historicoAlimentacao", JSON.stringify(historico));

    btn.innerHTML = '<i class="bi bi-check-circle"></i> Salvo sem kcal';
    btn.style.backgroundColor = "#10b981";

    renderizarCalorias();

    alert(
      "Diário salvo, mas não consegui calcular as calorias agora.\n\n" +
      "Motivo: " + erro.message
    );

  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = textoOriginal;
      btn.style.backgroundColor = corOriginal;
    }, 2200);
  }
}

async function calcularCaloriasComIA() {
  const dataAtual = byId("dataAlimentacaoInput")
    ? byId("dataAlimentacaoInput").value
    : new Date().toISOString().split("T")[0];

  const payload = {
    perfilUsuario: obterPerfilUsuario(),
    metaKcalLuma: obterMetaKcalSalva(),
    cafe: refeicoesAtuais.cafe || [],
    almoco: refeicoesAtuais.almoco || [],
    jantar: refeicoesAtuais.jantar || [],
    agua: refeicoesAtuais.agua || 0,
    data: dataAtual,
    saudeHoje: obterSaudePorData(dataAtual),
    contextoSaudeLuma: gerarContextoSaudeLuma()
  };

  let resposta;

  try {
    resposta = await fetch(`${API_BASE_URL}/calcular-calorias`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (erroRede) {
    throw new Error(
      "Falha de conexão com a API. Verifique se o servidor do Render está ativo."
    );
  }

  let resultado;

  try {
    resultado = await resposta.json();
  } catch (erroJson) {
    throw new Error(
      "A API respondeu, mas não devolveu um JSON válido. Status: " + resposta.status
    );
  }

  if (!resposta.ok) {
    throw new Error(
      resultado.erro ||
      resultado.message ||
      "Erro na API de calorias. Status: " + resposta.status
    );
  }

  if (!resultado.sucesso) {
    throw new Error(
      resultado.erro ||
      resultado.message ||
      "A API respondeu, mas não conseguiu calcular as calorias."
    );
  }

  if (!resultado.calorias) {
    throw new Error("A API não retornou o objeto 'calorias'.");
  }

  return resultado.calorias;
}

/* ==========================================
   CARROSSEL E GRÁFICOS DE KCAL
========================================== */

function inicializarKcalSwiper() {
  if (typeof Swiper === "undefined") return;
  if (!document.querySelector(".kcalSwiper")) return;

  if (kcalSwiper) {
    kcalSwiper.update();
    return;
  }

  kcalSwiper = new Swiper(".kcalSwiper", {
    slidesPerView: 1,
    spaceBetween: 12,
    pagination: {
      el: ".kcal-swiper-pagination",
      clickable: true
    },
    observer: true,
    observeParents: true,
    on: {
      slideChangeTransitionEnd: function() {
        atualizarGraficosKcalCarrossel();
      }
    }
  });
}

function atualizarGraficosKcalCarrossel() {
  inicializarKcalSwiper();

  setTimeout(() => {
    atualizarGraficoKcalData();
    atualizarGraficoKcalTrend();

    if (kcalSwiper) {
      kcalSwiper.update();
    }
  }, 80);
}

function obterDadosKcalPorData() {
  const historicoAlimentacao = JSON.parse(localStorage.getItem("historicoAlimentacao") || "{}");
  const entradas = [];

  Object.keys(historicoAlimentacao).forEach(dataISO => {
    const diario = historicoAlimentacao[dataISO];

    if (!diario || !diario.kcal || typeof diario.kcal.total === "undefined") return;

    entradas.push({
      dataISO: dataISO,
      label: formatarDataCurta(dataISO),
      total: Number(diario.kcal.total) || 0
    });
  });

  entradas.sort((a, b) => new Date(a.dataISO) - new Date(b.dataISO));

  const ultimos = entradas.slice(-7);

  if (ultimos.length > 0) {
    return ultimos;
  }

  const inputData = byId("dataAlimentacaoInput");
  const dataAtual = inputData && inputData.value ? inputData.value : new Date().toISOString().split("T")[0];

  const totalAtual =
    refeicoesAtuais.kcal && typeof refeicoesAtuais.kcal.total !== "undefined"
      ? Number(refeicoesAtuais.kcal.total) || 0
      : 0;

  return [
    {
      dataISO: dataAtual,
      label: formatarDataCurta(dataAtual),
      total: totalAtual
    }
  ];
}

function formatarDataCurta(dataISO) {
  if (!dataISO || !dataISO.includes("-")) return dataISO || "";

  const partes = dataISO.split("-");
  return `${partes[2]}/${partes[1]}`;
}

function atualizarGraficoKcalData() {
  const canvas = byId("kcalDataChart");

  if (!canvas || typeof Chart === "undefined") return;

  const metaKcal = obterMetaKcalSalva();
  const metaValor = metaKcal && metaKcal.metaKcal ? Number(metaKcal.metaKcal) || 0 : 0;

  const dadosPorData = obterDadosKcalPorData();

  const labels = dadosPorData.map(item => item.label);
  const dados = dadosPorData.map(item => item.total);
  const dadosMeta = labels.map(() => metaValor || null);

  const temaAtual = document.documentElement.getAttribute("data-theme");
  const dark = temaAtual === "dark";

  const corTexto = dark ? "#94a3b8" : "#64748b";
  const corGrid = dark ? "rgba(148, 163, 184, 0.18)" : "rgba(100, 116, 139, 0.18)";

  const ctx = canvas.getContext("2d");

  if (graficoKcalData) {
    graficoKcalData.destroy();
    graficoKcalData = null;
  }

  const gradiente = ctx.createLinearGradient(0, 0, 0, 210);
  gradiente.addColorStop(0, "rgba(14, 165, 233, 0.50)");
  gradiente.addColorStop(1, "rgba(14, 165, 233, 0.00)");

  graficoKcalData = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Kcal do dia",
          data: dados,
          borderColor: "#0ea5e9",
          backgroundColor: gradiente,
          borderWidth: 4,
          tension: 0.42,
          pointRadius: 6,
          pointHoverRadius: 7,
          pointBorderWidth: 4,
          pointBackgroundColor: dark ? "#1e293b" : "#ffffff",
          pointBorderColor: "#0ea5e9",
          fill: true
        },
        {
          label: "Meta Luma",
          data: dadosMeta,
          borderColor: "#a855f7",
          borderWidth: 2,
          borderDash: [8, 7],
          tension: 0,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 700,
        easing: "easeOutQuart"
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: corTexto,
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            font: {
              size: 11,
              weight: "700"
            }
          }
        },
        title: {
          display: true,
          text: "Kcal por data",
          color: corTexto,
          font: {
            size: 15,
            weight: "800"
          },
          padding: {
            bottom: 14
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const valor = context.parsed.y || 0;
              return `${context.dataset.label}: ${valor} kcal`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: metaValor
            ? Math.max(metaValor, ...dados) * 1.18
            : Math.max(...dados, 600),
          grid: {
            color: corGrid,
            drawBorder: false
          },
          ticks: {
            color: corTexto,
            font: {
              size: 11,
              weight: "700"
            }
          }
        },
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: corTexto,
            font: {
              size: 12,
              weight: "800"
            }
          }
        }
      }
    }
  });
}

function atualizarGraficoKcalTrend() {
  const canvas = byId("kcalTrendChart");

  if (!canvas || typeof Chart === "undefined") return;

  const metaKcal = obterMetaKcalSalva();
  const metaValor = metaKcal && metaKcal.metaKcal ? Number(metaKcal.metaKcal) || 0 : 0;

  const cafe = refeicoesAtuais.kcal && typeof refeicoesAtuais.kcal.cafe !== "undefined"
    ? Number(refeicoesAtuais.kcal.cafe) || 0
    : 0;

  const almoco = refeicoesAtuais.kcal && typeof refeicoesAtuais.kcal.almoco !== "undefined"
    ? Number(refeicoesAtuais.kcal.almoco) || 0
    : 0;

  const jantar = refeicoesAtuais.kcal && typeof refeicoesAtuais.kcal.jantar !== "undefined"
    ? Number(refeicoesAtuais.kcal.jantar) || 0
    : 0;

  const dadosConsumo = [
    cafe,
    cafe + almoco,
    cafe + almoco + jantar
  ];

  const labels = ["Café", "Almoço", "Jantar"];
  const dadosMeta = labels.map(() => metaValor || null);

  const temaAtual = document.documentElement.getAttribute("data-theme");
  const dark = temaAtual === "dark";

  const corTexto = dark ? "#94a3b8" : "#64748b";
  const corGrid = dark ? "rgba(148, 163, 184, 0.18)" : "rgba(100, 116, 139, 0.18)";

  const ctx = canvas.getContext("2d");

  if (graficoKcalTrend) {
    graficoKcalTrend.destroy();
    graficoKcalTrend = null;
  }

  const gradiente = ctx.createLinearGradient(0, 0, 0, 210);
  gradiente.addColorStop(0, "rgba(14, 165, 233, 0.48)");
  gradiente.addColorStop(1, "rgba(14, 165, 233, 0.00)");

  graficoKcalTrend = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Consumido",
          data: dadosConsumo,
          borderColor: "#0ea5e9",
          backgroundColor: gradiente,
          borderWidth: 4,
          tension: 0.45,
          pointRadius: 6,
          pointHoverRadius: 7,
          pointBorderWidth: 4,
          pointBackgroundColor: dark ? "#1e293b" : "#ffffff",
          pointBorderColor: "#0ea5e9",
          fill: true
        },
        {
          label: "Meta Luma",
          data: dadosMeta,
          borderColor: "#a855f7",
          borderWidth: 2,
          borderDash: [8, 7],
          tension: 0,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 700,
        easing: "easeOutQuart"
      },
      plugins: {
        legend: {
          display: true,
          labels: {
            color: corTexto,
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            font: {
              size: 11,
              weight: "700"
            }
          }
        },
        title: {
          display: true,
          text: "Consumo x Meta Luma",
          color: corTexto,
          font: {
            size: 15,
            weight: "800"
          },
          padding: {
            bottom: 14
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const valor = context.parsed.y || 0;
              return `${context.dataset.label}: ${valor} kcal`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          suggestedMax: metaValor
            ? Math.max(metaValor, dadosConsumo[2]) * 1.18
            : Math.max(dadosConsumo[2], 600),
          grid: {
            color: corGrid,
            drawBorder: false
          },
          ticks: {
            color: corTexto,
            font: {
              size: 11,
              weight: "700"
            }
          }
        },
        x: {
          grid: {
            display: false,
            drawBorder: false
          },
          ticks: {
            color: corTexto,
            font: {
              size: 12,
              weight: "800"
            }
          }
        }
      }
    }
  });
}

/* ==========================================
   PESO E GRÁFICOS
========================================== */

function carregarTema() {
  const temaSalvo = localStorage.getItem("usuarioTema");

  if (temaSalvo === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");

    if (byId("btnTema")) {
      byId("btnTema").innerHTML = '<i class="bi bi-sun"></i> Claro';
    }

    if (byId("metaThemeColor")) {
      byId("metaThemeColor").setAttribute("content", "#0f172a");
    }
  }
}

function alternarTema() {
  const temaAtual = document.documentElement.getAttribute("data-theme");
  const metaColor = byId("metaThemeColor");

  if (temaAtual === "dark") {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("usuarioTema", "light");

    if (byId("btnTema")) {
      byId("btnTema").innerHTML = '<i class="bi bi-moon-stars"></i> Escuro';
    }

    if (metaColor) {
      metaColor.setAttribute("content", "#ffffff");
    }
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("usuarioTema", "dark");

    if (byId("btnTema")) {
      byId("btnTema").innerHTML = '<i class="bi bi-sun"></i> Claro';
    }

    if (metaColor) {
      metaColor.setAttribute("content", "#0f172a");
    }
  }

  atualizarGraficos();
  atualizarGraficosKcalCarrossel();
  atualizarGraficosSaude();
}

function configurarDataPadrao() {
  if (byId("dataInput")) {
    byId("dataInput").value = new Date().toISOString().split("T")[0];
  }
}

function obterAltura() {
  return localStorage.getItem("usuarioAltura") || null;
}

function verificarExibicaoAltura() {
  const altura = obterAltura();

  if (altura) {
    if (byId("cardAltura")) byId("cardAltura").style.display = "none";
    if (byId("btnModificarAltura")) byId("btnModificarAltura").style.display = "block";
    if (byId("alturaInput")) byId("alturaInput").value = altura;
  } else {
    if (byId("cardAltura")) byId("cardAltura").style.display = "block";
    if (byId("btnModificarAltura")) byId("btnModificarAltura").style.display = "none";
  }
}

function abrirEdicaoAltura() {
  if (byId("cardAltura")) byId("cardAltura").style.display = "block";
  if (byId("btnModificarAltura")) byId("btnModificarAltura").style.display = "none";
}

function salvarAltura() {
  const input = byId("alturaInput");

  if (!input) return;

  const altura = parseFloat(input.value);

  if (!altura || isNaN(altura) || altura <= 0) {
    return alert("Altura inválida!");
  }

  localStorage.setItem("usuarioAltura", altura.toFixed(2));
  localStorage.removeItem("usuarioMetaKcal");

  verificarExibicaoAltura();
  carregarDados();
  carregarMetaKcalSalva();
}

function obterMeta() {
  return localStorage.getItem("usuarioMeta") || "80.0";
}

function carregarMeta() {
  const meta = obterMeta();

  if (byId("pesoMetaCard")) {
    byId("pesoMetaCard").innerHTML =
      `${parseFloat(meta).toFixed(1)} <span style="font-size: 16px; font-weight: 400;">kg</span>`;
  }

  if (byId("metaInput")) {
    byId("metaInput").value = meta;
  }
}

function abrirEdicaoMeta() {
  const card = byId("cardMeta");

  if (card) {
    card.style.display = card.style.display === "none" ? "block" : "none";
  }
}

function salvarMeta() {
  const input = byId("metaInput");

  if (!input) return;

  const meta = parseFloat(input.value);

  if (!meta || isNaN(meta) || meta <= 0) {
    return alert("Meta inválida!");
  }

  localStorage.setItem("usuarioMeta", meta.toFixed(1));
  localStorage.removeItem("usuarioMetaKcal");

  carregarMeta();

  if (byId("cardMeta")) {
    byId("cardMeta").style.display = "none";
  }

  carregarDados();
  carregarMetaKcalSalva();
}

function obterHistorico() {
  return JSON.parse(localStorage.getItem("historicoPeso") || "[]");
}

function carregarDados() {
  const historico = obterHistorico();
  const altura = obterAltura();
  const lista = byId("historicoLista");

  if (lista) lista.innerHTML = "";

  const ordenado = [...historico].sort((a, b) => b.id - a.id);
  const pesoAtual = ordenado.length > 0 ? ordenado[0].peso : 0;

  if (byId("pesoAtualCard")) {
    byId("pesoAtualCard").innerHTML =
      pesoAtual > 0
        ? `${pesoAtual.toFixed(1)} <span style="font-size: 16px; font-weight: 400;">kg</span>`
        : `--.- <span style="font-size: 16px; font-weight: 400;">kg</span>`;
  }

  if (altura && pesoAtual > 0) {
    const imc = pesoAtual / (altura * altura);

    if (byId("imcValue")) {
      byId("imcValue").innerText = imc.toFixed(1);
    }

    if (byId("imcStatus")) {
      if (imc < 18.5) {
        byId("imcStatus").innerText = "Abaixo";
      } else if (imc < 25) {
        byId("imcStatus").innerText = "Ideal";
      } else if (imc < 30) {
        byId("imcStatus").innerText = "Sobrepeso";
      } else {
        byId("imcStatus").innerText = "Obesidade";
      }
    }
  }

  if (historico.length > 0) {
    const cronologico = [...historico].sort((a, b) => a.id - b.id);
    const dif = cronologico[0].peso - cronologico[cronologico.length - 1].peso;

    if (byId("totalEliminadoCard")) {
      byId("totalEliminadoCard").innerText =
        dif >= 0 ? `${dif.toFixed(1)} kg` : `+${Math.abs(dif).toFixed(1)} kg`;
    }

    const dias = Math.round(
      Math.abs(
        (new Date(cronologico[cronologico.length - 1].dataRaw) -
          new Date(cronologico[0].dataRaw)) / 86400000
      )
    );

    if (byId("tempoJornadaCard")) {
      byId("tempoJornadaCard").innerText =
        dias === 0 ? "1º dia" : `${dias} dias`;
    }
  }

  if (lista) {
    ordenado.forEach(item => {
      let medidasTxt = "";

      if (item.cintura) medidasTxt += `Cintura: ${item.cintura}cm `;
      if (item.quadril) medidasTxt += `| Quadril: ${item.quadril}cm`;

      lista.innerHTML += `
        <div class="history-item">
          <div class="history-info">
            <span class="history-date">${item.dataTexto}</span>
            ${medidasTxt ? `<span class="history-medidas">${medidasTxt}</span>` : ""}
          </div>

          <div class="history-actions">
            <span class="history-weight">${item.peso.toFixed(1)} kg</span>
            <button class="btn-delete" onclick="event.stopPropagation(); deletarRegistro(${item.id})">Excluir</button>
          </div>
        </div>
      `;
    });
  }

  atualizarGraficosSlider();
  renderizarAgua();
}

function adicionarRegistro() {
  const pesoInput = byId("pesoInput");
  const dataInput = byId("dataInput");
  const cinturaInput = byId("cinturaInput");
  const quadrilInput = byId("quadrilInput");

  if (!pesoInput || !dataInput) return;

  const peso = parseFloat(pesoInput.value);
  const data = dataInput.value;
  const cintura = cinturaInput ? cinturaInput.value : "";
  const quadril = quadrilInput ? quadrilInput.value : "";

  if (!peso || isNaN(peso)) return alert("Digite o peso!");

  const historico = obterHistorico();
  const partes = data.split("-");

  historico.push({
    id: Date.now(),
    dataTexto: new Date(partes[0], partes[1] - 1, partes[2])
      .toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "short"
      })
      .replace(".", ""),
    dataRaw: data,
    peso: peso,
    cintura: cintura ? parseFloat(cintura) : null,
    quadril: quadril ? parseFloat(quadril) : null
  });

  localStorage.setItem("historicoPeso", JSON.stringify(historico));
  localStorage.removeItem("usuarioMetaKcal");

  carregarDados();
  carregarMetaKcalSalva();

  pesoInput.value = "";
  if (cinturaInput) cinturaInput.value = "";
  if (quadrilInput) quadrilInput.value = "";
}

function deletarRegistro(id) {
  if (!confirm("Excluir pesagem?")) return;

  localStorage.setItem(
    "historicoPeso",
    JSON.stringify(obterHistorico().filter(i => i.id !== id))
  );

  localStorage.removeItem("usuarioMetaKcal");

  carregarDados();
  carregarMetaKcalSalva();
}

function exportarParaExcel() {
  const historico = obterHistorico().sort((a, b) => b.id - a.id);

  if (historico.length === 0) {
    return alert("Nenhum dado para exportar.");
  }

  let csv = "Data,Peso (kg),Cintura (cm),Quadril (cm)\n";

  historico.forEach(item => {
    csv += `${item.dataRaw},${item.peso},${item.cintura || ""},${item.quadril || ""}\n`;
  });

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = "meu_historico_peso.csv";
  link.click();
}

function atualizarGraficosSlider() {
  const historico = obterHistorico();
  const cardSlider = byId("cardGraficosSlider");
  const wrapper = byId("graficosWrapper");

  if (!cardSlider || !wrapper || typeof Swiper === "undefined") return;

  wrapper.innerHTML = "";

  if (meuSwiper) {
    meuSwiper.destroy(true, true);
    meuSwiper = null;
  }

  if (historico.length < 2) {
    cardSlider.style.display = "none";
    return;
  }

  cardSlider.style.display = "block";

  const dadosHistorico = [...historico].sort((a, b) => a.id - b.id);

  if (dadosHistorico.filter(i => i.peso).length >= 2) {
    adicionarSlideComGrafico(wrapper, "graficoPeso");
  }

  if (dadosHistorico.filter(i => i.cintura).length >= 2) {
    adicionarSlideComGrafico(wrapper, "graficoCintura");
  }

  if (dadosHistorico.filter(i => i.quadril).length >= 2) {
    adicionarSlideComGrafico(wrapper, "graficoQuadril");
  }

  meuSwiper = new Swiper(".mySwiper", {
    pagination: {
      el: ".swiper-pagination",
      clickable: true
    },
    on: {
      slideChangeTransitionEnd: function() {
        atualizarGraficos();
      }
    }
  });

  atualizarGraficos();
}

function adicionarSlideComGrafico(wrapper, canvasId) {
  const slide = document.createElement("div");
  slide.className = "swiper-slide";

  const canvas = document.createElement("canvas");
  canvas.id = canvasId;

  slide.appendChild(canvas);
  wrapper.appendChild(slide);
}

function atualizarGraficos() {
  const historico = obterHistorico();

  if (historico.length < 2 || typeof Chart === "undefined") return;

  const dadosHistorico = [...historico].sort((a, b) => a.id - b.id);
  const temaAtual = document.documentElement.getAttribute("data-theme");
  const corGrid = temaAtual === "dark" ? "#334155" : "#f1f5f9";
  const corTexto = temaAtual === "dark" ? "#94a3b8" : "#64748b";

  renderizarGraficoUnico(
    "graficoPeso",
    "Peso (kg)",
    dadosHistorico.map(i => i.peso),
    dadosHistorico.map(i => i.dataTexto),
    corGrid,
    corTexto,
    "peso"
  );

  renderizarGraficoUnico(
    "graficoCintura",
    "Cintura (cm)",
    dadosHistorico.filter(i => i.cintura).map(i => i.cintura),
    dadosHistorico.filter(i => i.cintura).map(i => i.dataTexto),
    corGrid,
    corTexto,
    "cintura"
  );

  renderizarGraficoUnico(
    "graficoQuadril",
    "Quadril (cm)",
    dadosHistorico.filter(i => i.quadril).map(i => i.quadril),
    dadosHistorico.filter(i => i.quadril).map(i => i.dataTexto),
    corGrid,
    corTexto,
    "quadril"
  );
}

function renderizarGraficoUnico(canvasId, label, dados, labels, corGrid, corTexto, metricKey) {
  const canvas = byId(canvasId);

  if (!canvas || typeof Chart === "undefined") return;

  if (instanciasGraficos[metricKey]) {
    instanciasGraficos[metricKey].destroy();
  }

  const ctx = canvas.getContext("2d");
  const gradiente = ctx.createLinearGradient(0, 0, 0, 180);

  gradiente.addColorStop(0, "rgba(14, 165, 233, 0.45)");
  gradiente.addColorStop(1, "rgba(37, 99, 235, 0.00)");

  instanciasGraficos[metricKey] = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: dados,
        borderColor: "#0ea5e9",
        borderWidth: 3,
        tension: 0.4,
        pointBackgroundColor: "#2563eb",
        pointRadius: 4,
        pointHoverRadius: 6,
        fill: true,
        backgroundColor: gradiente
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        title: {
          display: true,
          text: `Evolução de ${label}`,
          color: corTexto,
          font: {
            size: 14,
            weight: "600"
          },
          padding: {
            bottom: 16
          }
        }
      },
      scales: {
        y: {
          grid: {
            color: corGrid
          },
          ticks: {
            color: corTexto
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: corTexto
          }
        }
      }
    }
  });
}

/* ==========================================
   TUTORIAL GUIADO
========================================== */

const tutorialPassos = [
  {
    aba: "dashboard",
    alvo: ".card-highlight",
    titulo: "Bem-vindo ao EvoluaFit IA",
    texto: "Aqui você acompanha sua evolução, peso atual, meta, IMC e progresso da sua jornada."
  },
  {
    aba: "dashboard",
    alvo: "#btnSalvar",
    titulo: "Registre suas medidas",
    texto: "Informe peso, cintura e quadril. Esses dados ajudam a IA a entender sua evolução."
  },
  {
    aba: "alimentacao",
    alvo: ".card-water",
    titulo: "Diário e hidratação",
    texto: "Aqui você registra água, refeições e salva o diário do dia."
  },
  {
    aba: "alimentacao",
    alvo: ".card-total-kcal",
    titulo: "Meta de kcal da IA",
    texto: "A Luma compara o que você consumiu com uma meta personalizada de calorias."
  },
  {
    aba: "saude",
    alvo: ".card-saude-aviso",
    titulo: "Saúde diária",
    texto: "Nesta área você registra pressão, glicose e sinais importantes para acompanhar sua rotina com mais segurança."
  },
  {
    aba: "saude",
    alvo: "#btnSalvarSaude",
    titulo: "Salve seus dados de saúde",
    texto: "Depois de medir pressão ou glicose, salve o registro para gerar histórico, gráficos e leitura da Luma."
  },
  {
    aba: "exercicio",
    alvo: "#btnGerarTreinoIA",
    titulo: "Treino com I.A",
    texto: "Aqui você registra caminhadas, corridas e também pode pedir um treino personalizado."
  },
  {
    aba: "ia",
    alvo: ".card-perfil-luma",
    titulo: "Personalize sua IA",
    texto: "Preencha seu perfil para a IA orientar melhor seus treinos, alimentação e metas."
  },
  {
    aba: "dashboard",
    alvo: "#btnMenuLuma",
    titulo: "Menu rápido",
    texto: "Use este botão para navegar entre Evolução, Diário, Saúde, Treino e I.A de forma rápida."
  }
];

let tutorialPassoAtual = 0;

function iniciarTutorialSeNecessario() {
  const tutorialConcluido = localStorage.getItem("tutorialConcluido");

  if (!tutorialConcluido) {
    setTimeout(() => {
      abrirTutorial(0);
    }, 1000);
  }
}

function configurarBotaoTutorialTopo() {
  const btnTopo = byId("btnVerTutorialTopo");

  if (btnTopo) {
    btnTopo.addEventListener("click", function() {
      localStorage.removeItem("tutorialConcluido");
      abrirTutorial(0);
    });
  }
}

function criarBotaoTutorialNoPerfil() {
  const perfilStatus = byId("perfilStatus");

  if (!perfilStatus) return;

  const botaoExistente = byId("btnVerTutorial");

  if (botaoExistente) {
    botaoExistente.addEventListener("click", () => {
      localStorage.removeItem("tutorialConcluido");
      abrirTutorial(0);
    });

    return;
  }

  const botao = document.createElement("button");

  botao.id = "btnVerTutorial";
  botao.className = "btn-tutorial-rever";
  botao.type = "button";
  botao.innerHTML = '<i class="bi bi-compass"></i> Ver tutorial novamente';

  botao.addEventListener("click", () => {
    localStorage.removeItem("tutorialConcluido");
    abrirTutorial(0);
  });

  perfilStatus.insertAdjacentElement("afterend", botao);
}

function abrirTutorial(indiceInicial = 0) {
  tutorialPassoAtual = indiceInicial;

  criarEstruturaTutorial();
  renderizarPassoTutorial();
}

function criarEstruturaTutorial() {
  if (byId("tutorialOverlay")) return;

  const overlay = document.createElement("div");

  overlay.id = "tutorialOverlay";
  overlay.className = "tutorial-overlay pos-bottom";

  overlay.innerHTML = `
    <div class="tutorial-card">
      <div class="tutorial-topo">
        <div>
          <div class="tutorial-label">Tutorial</div>
          <h2 id="tutorialTitulo">Bem-vindo</h2>
        </div>

        <button id="btnFecharTutorial" class="tutorial-close" type="button">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <p id="tutorialTexto" class="tutorial-texto"></p>

      <div class="tutorial-progress-area">
        <div id="tutorialProgressoTexto" class="tutorial-progress-text">Passo 1 de 9</div>

        <div class="tutorial-progress-bar">
          <div id="tutorialProgressoFill" class="tutorial-progress-fill"></div>
        </div>
      </div>

      <div class="tutorial-actions">
        <button id="btnPularTutorial" class="tutorial-btn-secondary" type="button">
          Pular
        </button>

        <div class="tutorial-actions-right">
          <button id="btnVoltarTutorial" class="tutorial-btn-secondary" type="button">
            Voltar
          </button>

          <button id="btnProximoTutorial" class="tutorial-btn-primary" type="button">
            Próximo
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  addListener("btnFecharTutorial", "click", concluirTutorial);
  addListener("btnPularTutorial", "click", concluirTutorial);
  addListener("btnVoltarTutorial", "click", voltarPassoTutorial);
  addListener("btnProximoTutorial", "click", avancarPassoTutorial);
}

function renderizarPassoTutorial() {
  const passo = tutorialPassos[tutorialPassoAtual];

  if (!passo) return;

  prepararAbaDoTutorial(passo.aba);

  const overlay = byId("tutorialOverlay");
  const titulo = byId("tutorialTitulo");
  const texto = byId("tutorialTexto");
  const progressoTexto = byId("tutorialProgressoTexto");
  const progressoFill = byId("tutorialProgressoFill");
  const btnVoltar = byId("btnVoltarTutorial");
  const btnProximo = byId("btnProximoTutorial");

  if (!overlay || !titulo || !texto || !progressoTexto || !progressoFill || !btnVoltar || !btnProximo) {
    return;
  }

  overlay.style.display = "flex";

  titulo.innerText = passo.titulo;
  texto.innerText = passo.texto;

  progressoTexto.innerText = `Passo ${tutorialPassoAtual + 1} de ${tutorialPassos.length}`;

  const porcentagem = ((tutorialPassoAtual + 1) / tutorialPassos.length) * 100;
  progressoFill.style.width = `${porcentagem}%`;

  btnVoltar.disabled = tutorialPassoAtual === 0;

  btnProximo.innerText =
    tutorialPassoAtual === tutorialPassos.length - 1
      ? "Concluir"
      : "Próximo";

  setTimeout(() => {
    removerDestaquesTutorial();

    const alvo = document.querySelector(passo.alvo);

    if (alvo) {
      alvo.classList.add("tutorial-highlight");

      try {
        alvo.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      } catch (erro) {
        console.log("Não foi possível centralizar o item do tutorial:", erro);
      }

      setTimeout(() => {
        ajustarPosicaoCardTutorial(alvo);
      }, 450);
    } else {
      overlay.classList.remove("pos-top", "pos-bottom", "pos-center");
      overlay.classList.add("pos-bottom");
    }
  }, 350);
}

function prepararAbaDoTutorial(abaId) {
  const botaoAba = document.querySelector(`.floating-item[data-aba="${abaId}"]`);

  if (typeof trocarAba === "function") {
    trocarAba(abaId, botaoAba);
  }
}

function ajustarPosicaoCardTutorial(alvo) {
  const overlay = byId("tutorialOverlay");

  if (!overlay || !alvo) return;

  overlay.classList.remove("pos-top", "pos-bottom", "pos-center");

  const rect = alvo.getBoundingClientRect();
  const alturaTela = window.innerHeight;

  const alvoMuitoEmbaixo = rect.bottom > alturaTela * 0.60;
  const alvoMuitoNoTopo = rect.top < alturaTela * 0.35;

  if (alvoMuitoEmbaixo) {
    overlay.classList.add("pos-top");
    return;
  }

  if (alvoMuitoNoTopo) {
    overlay.classList.add("pos-bottom");
    return;
  }

  overlay.classList.add("pos-bottom");
}

function avancarPassoTutorial() {
  if (tutorialPassoAtual >= tutorialPassos.length - 1) {
    concluirTutorial();
    return;
  }

  tutorialPassoAtual++;
  renderizarPassoTutorial();
}

function voltarPassoTutorial() {
  if (tutorialPassoAtual <= 0) return;

  tutorialPassoAtual--;
  renderizarPassoTutorial();
}

function concluirTutorial() {
  localStorage.setItem("tutorialConcluido", "true");
  fecharTutorial();
}

function fecharTutorial() {
  const overlay = byId("tutorialOverlay");

  if (overlay) {
    overlay.style.display = "none";
    overlay.classList.remove("pos-top", "pos-bottom", "pos-center");
    overlay.classList.add("pos-bottom");
  }

  removerDestaquesTutorial();
}

function removerDestaquesTutorial() {
  document.querySelectorAll(".tutorial-highlight").forEach(elemento => {
    elemento.classList.remove("tutorial-highlight");
  });
}

/* ==========================================
   REAJUSTE DOS GRÁFICOS
========================================== */

window.addEventListener("resize", function() {
  atualizarGraficosKcalCarrossel();
  atualizarGraficosSaude();
});

/* ==========================================
   FUNÇÕES GLOBAIS PARA HTML
========================================== */

window.abrirTutorial = abrirTutorial;
window.trocarAba = trocarAba;
window.adicionarAgua = adicionarAgua;
window.adicionarComidaCustomizada = adicionarComidaCustomizada;
window.abrirModalTreino = abrirModalTreino;
window.fecharModalTreino = fecharModalTreino;
window.deletarTreino = deletarTreino;
window.deletarRegistro = deletarRegistro;
window.deletarRegistroSaude = deletarRegistroSaude;
window.compartilharTreinoModal = compartilharTreinoModal;