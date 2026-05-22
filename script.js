let meuSwiper = null;
let instanciasGraficos = { peso: null, cintura: null, quadril: null };

document.addEventListener('DOMContentLoaded', iniciarApp);

document.getElementById('btnSalvar').addEventListener('click', adicionarRegistro);
document.getElementById('btnSalvarAltura').addEventListener('click', salvarAltura);
document.getElementById('btnModificarAltura').addEventListener('click', abrirEdicaoAltura);
document.getElementById('btnModificarMeta').addEventListener('click', abrirEdicaoMeta);
document.getElementById('btnSalvarMeta').addEventListener('click', salvarMeta);
document.getElementById('btnTema').addEventListener('click', alternarTema);
document.getElementById('btnExportar').addEventListener('click', exportarParaExcel);

document.getElementById('dataAlimentacaoInput').addEventListener('change', carregarRefeicoesDoDia);
document.getElementById('btnSalvarAlimentacao').addEventListener('click', salvarRefeicoes);

document.getElementById('btnIniciarTreino').addEventListener('click', iniciarTreino);
document.getElementById('btnPararTreino').addEventListener('click', encerrarTreino);

document.getElementById('btnCompartilharProgresso').addEventListener('click', compartilharProgresso);

document.getElementById('btnAnalisarDia').addEventListener('click', solicitarAnaliseIA);

let treinoAtualModalId = null;

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

const itensPreProgramados = {
  cafe: ["Pão Francês", "Fruta", "Iogurte", "Café Preto", "Suco", "Ovos", "Biscoito"],
  almoco: ["Arroz", "Feijão", "Frango", "Carne", "Salada", "Legumes", "Macarrão"],
  jantar: ["Sopa", "Salada", "Frango", "Omelete", "Pão", "Iogurte", "Fruta"]
};

let refeicoesAtuais = {
  cafe: [],
  almoco: [],
  jantar: [],
  agua: 0
};

function iniciarApp() {
  carregarTema();
  configurarDataPadrao();
  configurarDataAlimentacaoPadrao();
  verificarExibicaoAltura();
  carregarMeta();
  carregarDados();
  carregarRefeicoesDoDia();
  carregarHistoricoTreinos();
}

function trocarAba(abaId, elementoBotao) {

  document.getElementById('aba-dashboard').style.display =
    abaId === 'dashboard' ? 'block' : 'none';

  document.getElementById('aba-alimentacao').style.display =
    abaId === 'alimentacao' ? 'block' : 'none';

  document.getElementById('aba-exercicio').style.display =
    abaId === 'exercicio' ? 'block' : 'none';

  document.getElementById('aba-ia').style.display =
    abaId === 'ia' ? 'block' : 'none';

  document.querySelectorAll('.nav-item')
    .forEach(btn => btn.classList.remove('active'));

  elementoBotao.classList.add('active');

  if (abaId === 'alimentacao') {

    const inputData =
      document.getElementById('dataAlimentacaoInput');

    if (!inputData.value) {
      inputData.value = new Date().toISOString().split('T')[0];
    }

    carregarRefeicoesDoDia();
  }

  if (abaId === 'exercicio') {
    setTimeout(iniciarMapaTreino, 200);
  }

  if (abaId === 'ia') {
    carregarAnaliseSalva();
  }
}

function compartilharProgresso() {

  const pesoAtual =
    document.getElementById('pesoAtualCard')
      .innerText.replace('kg', '')
      .trim();

  const eliminado =
    document.getElementById('totalEliminadoCard').innerText;

  const texto =
    `Bora focar! 🚀 Já eliminei ${eliminado} e estou pesando ${pesoAtual} kg. 💪`;

  if (navigator.share) {

    navigator.share({
      title: 'Minha Evolução',
      text: texto
    }).catch(console.error);

  } else {

    alert(texto);
  }
}

function carregarAnaliseSalva() {

  const analise =
    JSON.parse(localStorage.getItem('iaAnaliseCache') || 'null');

  const hoje =
    new Date().toLocaleDateString('pt-BR');

  if (analise && analise.data === hoje) {

    exibirRespostaIA(analise.plano, analise.dica);

    document.getElementById('iaStatusData').innerText =
      `Análise de hoje concluída ✅`;

    document.getElementById('btnAnalisarDia').innerText =
      "🔄 Atualizar Análise";
  }
}

async function solicitarAnaliseIA() {

  const btnIA =
    document.getElementById('btnAnalisarDia');

  const containerResposta =
    document.getElementById('iaRespostaContainer');

  const loading =
    document.getElementById('iaLoading');

  btnIA.style.display = 'none';
  containerResposta.style.display = 'none';
  loading.style.display = 'block';

  try {

    const dadosParaIA = montarDadosParaIA();

    const resposta = await fetch(
      "https://luma-gemini-api.onrender.com/analisar-dia",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(dadosParaIA)
      }
    );

    if (!resposta.ok) {
      throw new Error("Erro ao conectar com a IA");
    }

    const resultado = await resposta.json();

    if (!resultado.sucesso) {
      throw new Error(resultado.erro || "Erro desconhecido");
    }

    const textoIA = resultado.resposta || "";

    const plano =
      extrairBlocoIA(textoIA, "PLANO:", "DICA:");

    const dica =
      extrairBlocoIA(textoIA, "DICA:", null);

    const cache = {
      data: new Date().toLocaleDateString('pt-BR'),
      plano: plano || textoIA,
      dica: dica || "Continue firme!"
    };

    localStorage.setItem(
      'iaAnaliseCache',
      JSON.stringify(cache)
    );

    exibirRespostaIA(cache.plano, cache.dica);

    btnIA.innerText = "🔄 Atualizar Análise";

  } catch (erro) {

    console.error(erro);

    alert("Erro ao gerar análise da IA.");

  } finally {

    loading.style.display = 'none';
    btnIA.style.display = 'block';
  }
}

function montarDadosParaIA() {

  const historicoPeso =
    JSON.parse(localStorage.getItem('historicoPeso') || '[]');

  const historicoAlimentacao =
    JSON.parse(localStorage.getItem('historicoAlimentacao') || '{}');

  const historicoTreinos =
    JSON.parse(localStorage.getItem('historicoTreinos') || '[]');

  const hojeISO =
    new Date().toISOString().split('T')[0];

  return {
    dataHoje: hojeISO,
    altura: localStorage.getItem('usuarioAltura'),
    metaPeso: localStorage.getItem('usuarioMeta') || "80.0",
    historicoPeso: historicoPeso.slice(-10),
    diarioHoje: historicoAlimentacao[hojeISO] || null,
    ultimosTreinos: historicoTreinos.slice(-5)
  };
}

function extrairBlocoIA(texto, inicio, fim) {

  const indexInicio = texto.indexOf(inicio);

  if (indexInicio === -1) return "";

  const corteInicio =
    indexInicio + inicio.length;

  const indexFim =
    fim ? texto.indexOf(fim) : -1;

  if (fim && indexFim !== -1) {

    return texto.substring(
      corteInicio,
      indexFim
    ).trim();
  }

  return texto.substring(corteInicio).trim();
}

function exibirRespostaIA(plano, dica) {

  document.getElementById('iaTextoPlano').innerText =
    plano;

  document.getElementById('iaTextoDica').innerText =
    dica;

  document.getElementById('iaRespostaContainer').style.display =
    'block';

  document.getElementById('iaStatusData').innerText =
    `Última análise: Hoje às ${
      new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }`;
}

function configurarDataPadrao() {
  document.getElementById('dataInput').value =
    new Date().toISOString().split('T')[0];
}

function configurarDataAlimentacaoPadrao() {
  document.getElementById('dataAlimentacaoInput').value =
    new Date().toISOString().split('T')[0];
}

function obterHistorico() {
  return JSON.parse(localStorage.getItem('historicoPeso') || '[]');
}

function obterAltura() {
  return localStorage.getItem('usuarioAltura') || null;
}

function obterMeta() {
  return localStorage.getItem('usuarioMeta') || "80.0";
}

function carregarMeta() {

  const meta = obterMeta();

  document.getElementById('pesoMetaCard').innerHTML =
    `${parseFloat(meta).toFixed(1)}
     <span style="font-size:16px;font-weight:400;">kg</span>`;

  document.getElementById('metaInput').value = meta;
}

function verificarExibicaoAltura() {

  const altura = obterAltura();

  if (altura) {

    document.getElementById('cardAltura').style.display = 'none';

    document.getElementById('btnModificarAltura').style.display =
      'block';

    document.getElementById('alturaInput').value = altura;

  } else {

    document.getElementById('cardAltura').style.display = 'block';

    document.getElementById('btnModificarAltura').style.display =
      'none';
  }
}

function abrirEdicaoAltura() {

  document.getElementById('cardAltura').style.display =
    'block';

  document.getElementById('btnModificarAltura').style.display =
    'none';
}

function salvarAltura() {

  const altura =
    parseFloat(document.getElementById('alturaInput').value);

  if (!altura || isNaN(altura) || altura <= 0) {
    return alert('Altura inválida!');
  }

  localStorage.setItem(
    'usuarioAltura',
    altura.toFixed(2)
  );

  verificarExibicaoAltura();

  carregarDados();
}

function abrirEdicaoMeta() {

  const card =
    document.getElementById('cardMeta');

  card.style.display =
    card.style.display === 'none'
      ? 'block'
      : 'none';
}

function salvarMeta() {

  const meta =
    parseFloat(document.getElementById('metaInput').value);

  if (!meta || isNaN(meta) || meta <= 0) {
    return alert('Meta inválida!');
  }

  localStorage.setItem(
    'usuarioMeta',
    meta.toFixed(1)
  );

  carregarMeta();

  document.getElementById('cardMeta').style.display =
    'none';

  carregarDados();
}
