const API_BASE_URL = "https://luma-gemini-api.onrender.com";

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

// Listeners Diário
document.getElementById('dataAlimentacaoInput').addEventListener('change', carregarRefeicoesDoDia);
document.getElementById('btnSalvarAlimentacao').addEventListener('click', salvarRefeicoes);
document.getElementById('btnAtualizarMetaKcal').addEventListener('click', atualizarMetaKcalComIA);

// Listeners Treino
document.getElementById('btnIniciarTreino').addEventListener('click', iniciarTreino);
document.getElementById('btnPararTreino').addEventListener('click', encerrarTreino);
document.getElementById('btnGerarTreinoIA').addEventListener('click', gerarTreinoIA);

// Listener Treino IA Recolhível
document.getElementById('treinoIAHeader').addEventListener('click', alternarCardTreinoIA);
document.getElementById('btnRecolherTreinoIA').addEventListener('click', recolherCardTreinoIA);

// Listener Compartilhamento
document.getElementById('btnCompartilharProgresso').addEventListener('click', compartilharProgresso);

// Listener IA
document.getElementById('btnAnalisarDia').addEventListener('click', solicitarAnaliseIA);

// Listener Perfil
document.getElementById('btnSalvarPerfil').addEventListener('click', salvarPerfilUsuario);

// Listener Menu Flutuante
document.getElementById('btnMenuLuma').addEventListener('click', alternarMenuLuma);

document.addEventListener('click', function(event) {
  const nav = document.getElementById('floatingNav');
  const clicouNoMenu = nav.contains(event.target);

  if (!clicouNoMenu && nav.classList.contains('open')) {
    nav.classList.remove('open');
  }
});

function iniciarApp() {
  carregarTema();
  configurarDataPadrao();
  configurarDataAlimentacaoPadrao();
  verificarExibicaoAltura();
  carregarMeta();
  carregarPerfilUsuario();
  carregarMetaKcalSalva();
  carregarDados();
  carregarRefeicoesDoDia();
  carregarHistoricoTreinos();
  carregarTreinoIASalvo();

  criarBotaoTutorialNoPerfil();
  iniciarTutorialSeNecessario();
}

function trocarAba(abaId, elementoBotao) {
  document.getElementById('aba-dashboard').style.display = abaId === 'dashboard' ? 'block' : 'none';
  document.getElementById('aba-alimentacao').style.display = abaId === 'alimentacao' ? 'block' : 'none';
  document.getElementById('aba-exercicio').style.display = abaId === 'exercicio' ? 'block' : 'none';
  document.getElementById('aba-ia').style.display = abaId === 'ia' ? 'block' : 'none';

  document.querySelectorAll('.floating-item').forEach(btn => {
    btn.classList.remove('active');
  });

  if (elementoBotao) {
    elementoBotao.classList.add('active');
  } else {
    const botaoAba = document.querySelector(`.floating-item[data-aba="${abaId}"]`);
    if (botaoAba) botaoAba.classList.add('active');
  }

  document.getElementById('floatingNav').classList.remove('open');

  if (abaId === 'alimentacao') {
    const inputData = document.getElementById('dataAlimentacaoInput');
    if (!inputData.value) inputData.value = new Date().toISOString().split('T')[0];
    carregarRefeicoesDoDia();
    carregarMetaKcalSalva();
  }

  if (abaId === 'exercicio') {
    setTimeout(iniciarMapaTreino, 200);
    carregarTreinoIASalvo();
  }

  if (abaId === 'ia') {
    carregarPerfilUsuario();
    carregarAnaliseSalva();
  }
}

function alternarMenuLuma(event) {
  event.stopPropagation();
  document.getElementById('floatingNav').classList.toggle('open');
}

// ==========================================
// PERFIL DA LUMA
// ==========================================

function obterPerfilUsuario() {
  return JSON.parse(localStorage.getItem('usuarioPerfil') || 'null');
}

function carregarPerfilUsuario() {
  const perfil = obterPerfilUsuario();

  if (!perfil) {
    atualizarStatusPerfil(null);
    return;
  }

  document.getElementById('perfilNome').value = perfil.nome || '';
  document.getElementById('perfilIdade').value = perfil.idade || '';
  document.getElementById('perfilSexo').value = perfil.sexo || '';
  document.getElementById('perfilNivel').value = perfil.nivel || '';
  document.getElementById('perfilObjetivo').value = perfil.objetivo || '';
  document.getElementById('perfilObservacoes').value = perfil.observacoes || '';

  atualizarStatusPerfil(perfil);
}

function salvarPerfilUsuario() {
  const nome = document.getElementById('perfilNome').value.trim();
  const idade = document.getElementById('perfilIdade').value.trim();
  const sexo = document.getElementById('perfilSexo').value;
  const nivel = document.getElementById('perfilNivel').value;
  const objetivo = document.getElementById('perfilObjetivo').value;
  const observacoes = document.getElementById('perfilObservacoes').value.trim();

  const perfil = {
    nome: nome,
    idade: idade ? Number(idade) : null,
    sexo: sexo,
    nivel: nivel,
    objetivo: objetivo,
    observacoes: observacoes,
    atualizadoEm: new Date().toLocaleString('pt-BR')
  };

  localStorage.setItem('usuarioPerfil', JSON.stringify(perfil));
  localStorage.removeItem('usuarioMetaKcal');

  atualizarStatusPerfil(perfil);
  carregarMetaKcalSalva();

  const btn = document.getElementById('btnSalvarPerfil');
  const textoOriginal = btn.innerHTML;

  btn.innerHTML = '<i class="bi bi-check2-circle"></i> Perfil salvo!';
  btn.style.background = '#10b981';

  setTimeout(() => {
    btn.innerHTML = textoOriginal;
    btn.style.background = '';
  }, 1800);
}

function atualizarStatusPerfil(perfil) {
  const status = document.getElementById('perfilStatus');

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
  return String(texto || '')
    .replace(/_/g, ' ')
    .replace('nao informar', 'prefere não informar')
    .replace(/\b\w/g, letra => letra.toUpperCase());
}

// ==========================================
// META KCAL DA LUMA
// ==========================================

function obterMetaKcalSalva() {
  return JSON.parse(localStorage.getItem('usuarioMetaKcal') || 'null');
}

function carregarMetaKcalSalva() {
  renderizarCalorias();
}

async function atualizarMetaKcalComIA() {
  const btn = document.getElementById('btnAtualizarMetaKcal');
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
      atualizadoEm: new Date().toLocaleString('pt-BR')
    };

    localStorage.setItem('usuarioMetaKcal', JSON.stringify(metaNormalizada));

    renderizarCalorias();

    btn.innerHTML = '<i class="bi bi-check2-circle"></i> Meta atualizada!';
    btn.style.background = '#10b981';
    btn.style.color = '#ffffff';

    setTimeout(() => {
      btn.innerHTML = textoOriginal;
      btn.style.background = '';
      btn.style.color = '';
    }, 1800);

  } catch (erro) {
    console.error("Erro meta kcal:", erro);

    alert(
      "Não consegui calcular a meta de kcal agora.\n\n" +
      erro.message
    );

    btn.innerHTML = textoOriginal;

  } finally {
    btn.disabled = false;
  }
}

function montarDadosMetaKcal() {
  const historicoPeso = JSON.parse(localStorage.getItem('historicoPeso') || '[]');
  const historicoAlimentacao = JSON.parse(localStorage.getItem('historicoAlimentacao') || '{}');
  const historicoTreinos = JSON.parse(localStorage.getItem('historicoTreinos') || '[]');

  const hojeISO = new Date().toISOString().split('T')[0];
  const altura = parseFloat(localStorage.getItem('usuarioAltura'));
  const metaPeso = localStorage.getItem('usuarioMeta') || "80.0";

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
    ultimosTreinos: historicoTreinos.slice(-7)
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

// ==========================================
// COMPARTILHAMENTO
// ==========================================

function compartilharProgresso() {
  const pesoAtual = document.getElementById('pesoAtualCard').innerText.replace('kg', '').trim();
  const eliminado = document.getElementById('totalEliminadoCard').innerText;

  const texto = `Bora focar! 🚀 Já eliminei ${eliminado} e estou pesando ${pesoAtual} kg. 💪 Acompanhando tudo pelo meu app Luma!`;

  if (navigator.share) {
    navigator.share({
      title: 'Minha Evolução',
      text: texto
    }).catch(console.error);
  } else {
    alert("Seu navegador não suporta o compartilhamento nativo. Copie o texto:\n\n" + texto);
  }
}

let treinoAtualModalId = null;

function compartilharTreinoModal() {
  const treinos = JSON.parse(localStorage.getItem('historicoTreinos') || '[]');
  const treino = treinos.find(t => t.id === treinoAtualModalId);

  if (!treino) return;

  const nome = treino.tipo.charAt(0).toUpperCase() + treino.tipo.slice(1);

  const texto = `Treino concluído! ${nome}\n⏱️ Tempo: ${treino.tempo}\n🛣️ Distância: ${treino.distancia} km\n🔥 Gasto: ${treino.calorias} kcal.\nBora focar com a Luma! 💪`;

  if (navigator.share) {
    navigator.share({
      title: 'Meu Treino',
      text: texto
    }).catch(console.error);
  } else {
    alert("Seu navegador não suporta o compartilhamento nativo. Copie o texto:\n\n" + texto);
  }
}

// ==========================================
// LÓGICA DO TREINADOR IA - GEMINI REAL
// ==========================================

function carregarAnaliseSalva() {
  const analise = JSON.parse(localStorage.getItem('iaAnaliseCache') || 'null');
  const hoje = new Date().toLocaleDateString('pt-BR');

  if (analise && analise.data === hoje) {
    exibirRespostaIA(analise.plano, analise.dica);
    document.getElementById('iaStatusData').innerText = `Análise de hoje concluída ✅`;
    document.getElementById('btnAnalisarDia').innerHTML = '<i class="bi bi-arrow-clockwise"></i> Atualizar análise';
  }
}

async function solicitarAnaliseIA() {
  const btnIA = document.getElementById('btnAnalisarDia');
  const containerResposta = document.getElementById('iaRespostaContainer');
  const loading = document.getElementById('iaLoading');

  btnIA.style.display = 'none';
  containerResposta.style.display = 'none';
  loading.style.display = 'block';

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
      data: new Date().toLocaleDateString('pt-BR'),
      plano: plano || textoIA,
      dica: dica || "Continue firme!"
    };

    localStorage.setItem('iaAnaliseCache', JSON.stringify(cache));

    exibirRespostaIA(cache.plano, cache.dica);
    btnIA.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Atualizar análise';

  } catch (erro) {
    console.error(erro);
    alert("Erro ao gerar análise da IA:\n\n" + erro.message);
  } finally {
    loading.style.display = 'none';
    btnIA.style.display = 'block';
  }
}

function montarDadosParaIA() {
  const historicoPeso = JSON.parse(localStorage.getItem('historicoPeso') || '[]');
  const historicoAlimentacao = JSON.parse(localStorage.getItem('historicoAlimentacao') || '{}');
  const historicoTreinos = JSON.parse(localStorage.getItem('historicoTreinos') || '[]');
  const hojeISO = new Date().toISOString().split('T')[0];

  return {
    dataHoje: hojeISO,
    perfilUsuario: obterPerfilUsuario(),
    metaKcalLuma: obterMetaKcalSalva(),
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

  const corteInicio = indexInicio + inicio.length;
  const indexFim = fim ? texto.indexOf(fim) : -1;

  if (fim && indexFim !== -1) {
    return texto.substring(corteInicio, indexFim).trim();
  }

  return texto.substring(corteInicio).trim();
}

function exibirRespostaIA(plano, dica) {
  document.getElementById('iaTextoPlano').innerText = plano;
  document.getElementById('iaTextoDica').innerText = dica;
  document.getElementById('iaRespostaContainer').style.display = 'block';

  document.getElementById('iaStatusData').innerText =
    `Última análise: Hoje às ${new Date().toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
}

// ==========================================
// TREINO COM IA
// ==========================================

function carregarTreinoIASalvo() {
  const cache = JSON.parse(localStorage.getItem('treinoIACache') || 'null');
  const hoje = new Date().toLocaleDateString('pt-BR');

  if (cache && cache.data === hoje && cache.treino) {
    exibirTreinoIA(cache.treino, true);
    document.getElementById('btnGerarTreinoIA').innerHTML = '<i class="bi bi-arrow-clockwise"></i> Atualizar treino com I.A';
  }
}

async function gerarTreinoIA() {
  const btn = document.getElementById('btnGerarTreinoIA');
  const container = document.getElementById('treinoIAContainer');
  const loading = document.getElementById('treinoIALoading');

  const textoOriginal = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-cpu"></i> Gerando treino...';
  container.style.display = 'none';
  loading.style.display = 'block';

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
      data: new Date().toLocaleDateString('pt-BR'),
      treino: treino
    };

    localStorage.setItem('treinoIACache', JSON.stringify(cache));

    exibirTreinoIA(treino, true);

    btn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Atualizar treino com I.A';

  } catch (erro) {
    console.error("Erro treino IA:", erro);

    alert(
      "Erro ao gerar treino:\n\n" +
      erro.message +
      "\n\nSe persistir, veja os logs do Render."
    );

    btn.innerHTML = textoOriginal;

  } finally {
    loading.style.display = 'none';
    btn.disabled = false;
  }
}

function montarDadosTreinoIA() {
  const historicoPeso = JSON.parse(localStorage.getItem('historicoPeso') || '[]');
  const historicoAlimentacao = JSON.parse(localStorage.getItem('historicoAlimentacao') || '{}');
  const historicoTreinos = JSON.parse(localStorage.getItem('historicoTreinos') || '[]');

  const hojeISO = new Date().toISOString().split('T')[0];
  const altura = parseFloat(localStorage.getItem('usuarioAltura'));
  const metaPeso = localStorage.getItem('usuarioMeta') || "80.0";

  const pesoOrdenado = [...historicoPeso].sort((a, b) => b.id - a.id);
  const pesoAtual = pesoOrdenado.length > 0 ? pesoOrdenado[0].peso : null;

  let imc = null;

  if (altura && pesoAtual) {
    imc = pesoAtual / (altura * altura);
  }

  const tipoAtividadeEscolhida = document.getElementById('tipoAtividade').value;

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
    ultimosTreinos: historicoTreinos.slice(-7)
  };
}

function exibirTreinoIA(treino, recolhido = true) {
  const container = document.getElementById('treinoIAContainer');
  const texto = document.getElementById('treinoIATexto');

  texto.innerText = treino;
  container.style.display = 'block';

  if (recolhido) {
    container.classList.add('treino-ia-collapsed');
  } else {
    container.classList.remove('treino-ia-collapsed');
  }
}

function alternarCardTreinoIA() {
  const container = document.getElementById('treinoIAContainer');
  container.classList.toggle('treino-ia-collapsed');
}

function recolherCardTreinoIA() {
  const container = document.getElementById('treinoIAContainer');
  container.classList.add('treino-ia-collapsed');
}

// ==========================================
// LÓGICA DE TREINO, GPS E MAPAS
// ==========================================

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
  if (mapaTreino !== null) {
    mapaTreino.invalidateSize();
    return;
  }

  mapaTreino = L.map('mapaTreinoContainer').setView([-14.235, -51.925], 4);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
  }).addTo(mapaTreino);

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latLng = [pos.coords.latitude, pos.coords.longitude];

        mapaTreino.setView(latLng, 16);

        marcadorGPS = L.circleMarker(latLng, {
          color: '#0ea5e9',
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
  if (!navigator.geolocation) return alert("Seu navegador não suporta GPS.");

  if (!mapaTreino) iniciarMapaTreino();

  isTreinando = true;
  distanciaTotalKm = 0;
  ultimaPosicao = null;
  coordenadasRota = [];
  tempoInicio = Date.now();

  document.getElementById('displayDistancia').innerText = "0.00";
  document.getElementById('displayVelocidade').innerText = "0.0";
  document.getElementById('displayCalorias').innerText = "0";
  document.getElementById('displayTempo').innerText = "00:00:00";

  document.getElementById('btnIniciarTreino').style.display = 'none';
  document.getElementById('btnPararTreino').style.display = 'block';
  document.getElementById('msgGpsErro').style.display = 'none';

  if (rotaPolyline && mapaTreino) mapaTreino.removeLayer(rotaPolyline);

  rotaPolyline = L.polyline([], {
    color: '#ef4444',
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
  if (posicao.coords.accuracy > 40) return;

  const latLng = [posicao.coords.latitude, posicao.coords.longitude];

  if (marcadorGPS) {
    marcadorGPS.setLatLng(latLng);
  } else {
    marcadorGPS = L.circleMarker(latLng, {
      color: '#0ea5e9',
      radius: 8,
      fillOpacity: 1
    }).addTo(mapaTreino);
  }

  mapaTreino.setView(latLng);

  if (isTreinando) {
    coordenadasRota.push(latLng);
    rotaPolyline.setLatLngs(coordenadasRota);

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
  document.getElementById('msgGpsErro').style.display = 'block';
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

  document.getElementById('displayTempo').innerText =
    String(horas).padStart(2, '0') + ":" +
    String(minutos).padStart(2, '0') + ":" +
    String(segundos).padStart(2, '0');

  atualizarTelaTreino();
}

function atualizarTelaTreino() {
  if (!isTreinando) return;

  const tempoHoras = (Date.now() - tempoInicio) / (1000 * 60 * 60);
  const velocidade = tempoHoras > 0 ? (distanciaTotalKm / tempoHoras) : 0;

  const historico = obterHistorico();
  const ordenado = [...historico].sort((a, b) => b.id - a.id);
  const pesoAtual = ordenado.length > 0 ? ordenado[0].peso : 80;

  const tipo = document.getElementById('tipoAtividade').value;
  const fatorCalorico = tipo === 'corrida' ? 1.03 : 0.75;

  document.getElementById('displayDistancia').innerText = distanciaTotalKm.toFixed(2);
  document.getElementById('displayVelocidade').innerText = velocidade.toFixed(1);
  document.getElementById('displayCalorias').innerText = Math.round(pesoAtual * distanciaTotalKm * fatorCalorico);
}

function encerrarTreino() {
  if (!isTreinando) return;

  isTreinando = false;

  clearInterval(timerInterval);

  if (gpsWatchId) {
    navigator.geolocation.clearWatch(gpsWatchId);
  }

  document.getElementById('btnIniciarTreino').style.display = 'block';
  document.getElementById('btnPararTreino').style.display = 'none';

  const treinos = JSON.parse(localStorage.getItem('historicoTreinos') || '[]');

  treinos.push({
    id: Date.now(),
    data: new Date().toLocaleDateString('pt-BR'),
    tipo: document.getElementById('tipoAtividade').value,
    tempo: document.getElementById('displayTempo').innerText,
    distancia: document.getElementById('displayDistancia').innerText,
    calorias: document.getElementById('displayCalorias').innerText,
    rota: coordenadasRota
  });

  localStorage.setItem('historicoTreinos', JSON.stringify(treinos));

  carregarHistoricoTreinos();

  alert("Treino salvo com sucesso!");
}

function carregarHistoricoTreinos() {
  const treinos = JSON.parse(localStorage.getItem('historicoTreinos') || '[]');
  const lista = document.getElementById('historicoTreinosLista');

  lista.innerHTML = '';

  const ordenado = [...treinos].sort((a, b) => b.id - a.id);

  ordenado.forEach(treino => {
    const icone = treino.tipo === 'corrida'
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

  const treinos = JSON.parse(localStorage.getItem('historicoTreinos') || '[]');

  localStorage.setItem(
    'historicoTreinos',
    JSON.stringify(treinos.filter(t => t.id !== id))
  );

  carregarHistoricoTreinos();
}

function abrirModalTreino(id) {
  const treinos = JSON.parse(localStorage.getItem('historicoTreinos') || '[]');
  const treino = treinos.find(t => t.id === id);

  if (!treino) return;

  treinoAtualModalId = id;

  document.getElementById('modalTituloTreino').innerText =
    `${treino.tipo === 'corrida' ? 'Corrida' : 'Caminhada'} - ${treino.data}`;

  document.getElementById('modalDistancia').innerText = treino.distancia;
  document.getElementById('modalTempo').innerText = treino.tempo;
  document.getElementById('modalCalorias').innerText = treino.calorias;
  document.getElementById('modalTreino').style.display = 'flex';

  setTimeout(() => {
    if (!mapaDetalhe) {
      mapaDetalhe = L.map('mapaDetalheContainer');

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(mapaDetalhe);

      detalhePolyline = L.polyline([], {
        color: '#ef4444',
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
  document.getElementById('modalTreino').style.display = 'none';
}

// ==========================================
// LÓGICA DO DIÁRIO - ALIMENTAÇÃO, ÁGUA E KCAL
// ==========================================

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
  document.getElementById('dataAlimentacaoInput').value = new Date().toISOString().split('T')[0];
}

function carregarRefeicoesDoDia() {
  const dataSelect = document.getElementById('dataAlimentacaoInput').value;
  const historico = JSON.parse(localStorage.getItem('historicoAlimentacao') || '{}');

  if (historico[dataSelect]) {
    refeicoesAtuais = JSON.parse(JSON.stringify(historico[dataSelect]));

    if (typeof refeicoesAtuais.agua === 'undefined') refeicoesAtuais.agua = 0;
    if (!Array.isArray(refeicoesAtuais.cafe)) refeicoesAtuais.cafe = [];
    if (!Array.isArray(refeicoesAtuais.almoco)) refeicoesAtuais.almoco = [];
    if (!Array.isArray(refeicoesAtuais.jantar)) refeicoesAtuais.jantar = [];
    if (typeof refeicoesAtuais.kcal === 'undefined') refeicoesAtuais.kcal = null;
    if (typeof refeicoesAtuais.assinaturaKcal === 'undefined') refeicoesAtuais.assinaturaKcal = null;

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

  document.getElementById('aguaAtualDisplay').innerText = atual;
  document.getElementById('aguaMetaDisplay').innerText = metaAgua;

  let porcentagem = (atual / metaAgua) * 100;

  if (porcentagem > 100) porcentagem = 100;

  const progressFill = document.getElementById('aguaProgressFill');

  progressFill.style.width = `${porcentagem}%`;
  progressFill.style.backgroundColor = atual >= metaAgua ? '#10b981' : '#0ea5e9';
}

function renderizarTagsDeComida() {
  ['cafe', 'almoco', 'jantar'].forEach(refeicao => {
    const container = document.getElementById(`tags-${refeicao}`);

    container.innerHTML = '';

    if (!Array.isArray(refeicoesAtuais[refeicao])) {
      refeicoesAtuais[refeicao] = [];
    }

    const itensUnicos = new Set([
      ...itensPreProgramados[refeicao],
      ...refeicoesAtuais[refeicao]
    ]);

    itensUnicos.forEach(item => {
      const isSelected = refeicoesAtuais[refeicao].includes(item);

      const tag = document.createElement('button');

      tag.type = 'button';
      tag.className = `food-tag ${isSelected ? 'selected' : ''}`;
      tag.innerText = item;

      tag.addEventListener('click', function(event) {
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
  const input = document.getElementById(`custom-${refeicao}`);
  const valor = input.value.trim();
  const valorFormatado = valor.charAt(0).toUpperCase() + valor.slice(1);

  if (valorFormatado && !refeicoesAtuais[refeicao].includes(valorFormatado)) {
    refeicoesAtuais[refeicao].push(valorFormatado);
    input.value = '';
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

  const totalConsumido = kcal && typeof kcal.total !== 'undefined'
    ? Number(kcal.total) || 0
    : 0;

  document.getElementById('kcal-cafe').innerText = kcal && typeof kcal.cafe !== 'undefined' ? kcal.cafe : '--';
  document.getElementById('kcal-almoco').innerText = kcal && typeof kcal.almoco !== 'undefined' ? kcal.almoco : '--';
  document.getElementById('kcal-jantar').innerText = kcal && typeof kcal.jantar !== 'undefined' ? kcal.jantar : '--';
  document.getElementById('kcal-total').innerText = kcal && typeof kcal.total !== 'undefined' ? kcal.total : '--';

  const metaDisplay = document.getElementById('kcal-meta-luma');
  const restanteDisplay = document.getElementById('kcal-restante');
  const statusDisplay = document.getElementById('kcal-status-dia');

  if (metaKcal && metaKcal.metaKcal) {
    const metaValor = Number(metaKcal.metaKcal) || 0;
    const restante = Math.max(metaValor - totalConsumido, 0);

    metaDisplay.innerText = metaValor;
    restanteDisplay.innerText = restante;

    const status = calcularStatusKcal(totalConsumido, metaKcal);

    statusDisplay.innerText = status.texto;
    statusDisplay.className = `kcal-status-pill ${status.classe}`;

  } else {
    metaDisplay.innerText = '--';
    restanteDisplay.innerText = '--';
    statusDisplay.innerText = "Aguardando meta da Luma";
    statusDisplay.className = "kcal-status-pill";
  }

  const observacao = document.getElementById('kcal-observacao');
  const assinaturaAtual = obterAssinaturaRefeicoes();

  if (!kcal) {
    observacao.innerText = metaKcal
      ? "As calorias serão estimadas ao salvar o diário."
      : "Atualize a meta de kcal para a Luma comparar seu consumo.";
    return;
  }

  if (refeicoesAtuais.assinaturaKcal !== assinaturaAtual) {
    observacao.innerText = "Você alterou alimentos. Salve o diário para recalcular as kcal.";
    return;
  }

  if (metaKcal && metaKcal.observacao) {
    observacao.innerText = metaKcal.observacao;
    return;
  }

  observacao.innerText = kcal.observacao || "Estimativa aproximada calculada pela Luma.";
}

async function salvarRefeicoes() {
  const dataSelect = document.getElementById('dataAlimentacaoInput').value;
  const historico = JSON.parse(localStorage.getItem('historicoAlimentacao') || '{}');
  const btn = document.getElementById('btnSalvarAlimentacao');
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

    localStorage.setItem('historicoAlimentacao', JSON.stringify(historico));

    renderizarCalorias();

    btn.innerHTML = '<i class="bi bi-check-circle"></i> Diário salvo com kcal!';
    btn.style.backgroundColor = "#10b981";

  } catch (erro) {
    console.error("Erro ao calcular calorias:", erro);

    historico[dataSelect] = refeicoesAtuais;
    localStorage.setItem('historicoAlimentacao', JSON.stringify(historico));

    btn.innerHTML = '<i class="bi bi-check-circle"></i> Salvo sem kcal';
    btn.style.backgroundColor = "#10b981";

    alert("Diário salvo, mas não consegui calcular as calorias agora.");
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = textoOriginal;
      btn.style.backgroundColor = corOriginal;
    }, 2200);
  }
}

async function calcularCaloriasComIA() {
  const resposta = await fetch(`${API_BASE_URL}/calcular-calorias`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      perfilUsuario: obterPerfilUsuario(),
      metaKcalLuma: obterMetaKcalSalva(),
      cafe: refeicoesAtuais.cafe || [],
      almoco: refeicoesAtuais.almoco || [],
      jantar: refeicoesAtuais.jantar || [],
      agua: refeicoesAtuais.agua || 0,
      data: document.getElementById('dataAlimentacaoInput').value
    })
  });

  if (!resposta.ok) {
    throw new Error("Erro ao conectar com a API de calorias. Status: " + resposta.status);
  }

  const resultado = await resposta.json();

  if (!resultado.sucesso) {
    throw new Error(resultado.erro || "Erro ao calcular calorias.");
  }

  return resultado.calorias;
}

// ==========================================
// LÓGICA DE PESO E GRÁFICOS
// ==========================================

function carregarTema() {
  const temaSalvo = localStorage.getItem('usuarioTema');

  if (temaSalvo === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('btnTema').innerHTML = '<i class="bi bi-sun"></i> Claro';
    document.getElementById('metaThemeColor').setAttribute('content', '#0f172a');
  }
}

function alternarTema() {
  const temaAtual = document.documentElement.getAttribute('data-theme');
  const metaColor = document.getElementById('metaThemeColor');

  if (temaAtual === 'dark') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('usuarioTema', 'light');
    document.getElementById('btnTema').innerHTML = '<i class="bi bi-moon-stars"></i> Escuro';
    metaColor.setAttribute('content', '#ffffff');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('usuarioTema', 'dark');
    document.getElementById('btnTema').innerHTML = '<i class="bi bi-sun"></i> Claro';
    metaColor.setAttribute('content', '#0f172a');
  }

  atualizarGraficos();
}

function configurarDataPadrao() {
  document.getElementById('dataInput').value = new Date().toISOString().split('T')[0];
}

function obterAltura() {
  return localStorage.getItem('usuarioAltura') || null;
}

function verificarExibicaoAltura() {
  const altura = obterAltura();

  if (altura) {
    document.getElementById('cardAltura').style.display = 'none';
    document.getElementById('btnModificarAltura').style.display = 'block';
    document.getElementById('alturaInput').value = altura;
  } else {
    document.getElementById('cardAltura').style.display = 'block';
    document.getElementById('btnModificarAltura').style.display = 'none';
  }
}

function abrirEdicaoAltura() {
  document.getElementById('cardAltura').style.display = 'block';
  document.getElementById('btnModificarAltura').style.display = 'none';
}

function salvarAltura() {
  const altura = parseFloat(document.getElementById('alturaInput').value);

  if (!altura || isNaN(altura) || altura <= 0) {
    return alert('Altura inválida!');
  }

  localStorage.setItem('usuarioAltura', altura.toFixed(2));
  localStorage.removeItem('usuarioMetaKcal');

  verificarExibicaoAltura();
  carregarDados();
  carregarMetaKcalSalva();
}

function obterMeta() {
  return localStorage.getItem('usuarioMeta') || "80.0";
}

function carregarMeta() {
  const meta = obterMeta();

  document.getElementById('pesoMetaCard').innerHTML =
    `${parseFloat(meta).toFixed(1)} <span style="font-size: 16px; font-weight: 400;">kg</span>`;

  document.getElementById('metaInput').value = meta;
}

function abrirEdicaoMeta() {
  const card = document.getElementById('cardMeta');
  card.style.display = card.style.display === 'none' ? 'block' : 'none';
}

function salvarMeta() {
  const meta = parseFloat(document.getElementById('metaInput').value);

  if (!meta || isNaN(meta) || meta <= 0) {
    return alert('Meta inválida!');
  }

  localStorage.setItem('usuarioMeta', meta.toFixed(1));
  localStorage.removeItem('usuarioMetaKcal');

  carregarMeta();

  document.getElementById('cardMeta').style.display = 'none';

  carregarDados();
  carregarMetaKcalSalva();
}

function obterHistorico() {
  return JSON.parse(localStorage.getItem('historicoPeso') || '[]');
}

function carregarDados() {
  const historico = obterHistorico();
  const altura = obterAltura();
  const lista = document.getElementById('historicoLista');

  lista.innerHTML = '';

  const ordenado = [...historico].sort((a, b) => b.id - a.id);
  const pesoAtual = ordenado.length > 0 ? ordenado[0].peso : 0;

  document.getElementById('pesoAtualCard').innerHTML =
    pesoAtual > 0
      ? `${pesoAtual.toFixed(1)} <span style="font-size: 16px; font-weight: 400;">kg</span>`
      : `--.- <span style="font-size: 16px; font-weight: 400;">kg</span>`;

  if (altura && pesoAtual > 0) {
    const imc = pesoAtual / (altura * altura);

    document.getElementById('imcValue').innerText = imc.toFixed(1);

    if (imc < 18.5) {
      document.getElementById('imcStatus').innerText = "Abaixo";
    } else if (imc < 25) {
      document.getElementById('imcStatus').innerText = "Ideal";
    } else if (imc < 30) {
      document.getElementById('imcStatus').innerText = "Sobrepeso";
    } else {
      document.getElementById('imcStatus').innerText = "Obesidade";
    }
  }

  if (historico.length > 0) {
    const cronologico = [...historico].sort((a, b) => a.id - b.id);
    const dif = cronologico[0].peso - cronologico[cronologico.length - 1].peso;

    document.getElementById('totalEliminadoCard').innerText =
      dif >= 0 ? `${dif.toFixed(1)} kg` : `+${Math.abs(dif).toFixed(1)} kg`;

    const dias = Math.round(
      Math.abs(
        (new Date(cronologico[cronologico.length - 1].dataRaw) -
          new Date(cronologico[0].dataRaw)) / 86400000
      )
    );

    document.getElementById('tempoJornadaCard').innerText =
      dias === 0 ? "1º dia" : `${dias} dias`;
  }

  ordenado.forEach(item => {
    let medidasTxt = '';

    if (item.cintura) medidasTxt += `Cintura: ${item.cintura}cm `;
    if (item.quadril) medidasTxt += `| Quadril: ${item.quadril}cm`;

    lista.innerHTML += `
      <div class="history-item">
        <div class="history-info">
          <span class="history-date">${item.dataTexto}</span>
          ${medidasTxt ? `<span class="history-medidas">${medidasTxt}</span>` : ''}
        </div>

        <div class="history-actions">
          <span class="history-weight">${item.peso.toFixed(1)} kg</span>
          <button class="btn-delete" onclick="event.stopPropagation(); deletarRegistro(${item.id})">Excluir</button>
        </div>
      </div>
    `;
  });

  atualizarGraficosSlider();
  renderizarAgua();
}

function adicionarRegistro() {
  const peso = parseFloat(document.getElementById('pesoInput').value);
  const data = document.getElementById('dataInput').value;
  const cintura = document.getElementById('cinturaInput').value;
  const quadril = document.getElementById('quadrilInput').value;

  if (!peso || isNaN(peso)) return alert('Digite o peso!');

  const historico = obterHistorico();
  const partes = data.split('-');

  historico.push({
    id: Date.now(),
    dataTexto: new Date(partes[0], partes[1] - 1, partes[2])
      .toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'short'
      })
      .replace('.', ''),
    dataRaw: data,
    peso: peso,
    cintura: cintura ? parseFloat(cintura) : null,
    quadril: quadril ? parseFloat(quadril) : null
  });

  localStorage.setItem('historicoPeso', JSON.stringify(historico));
  localStorage.removeItem('usuarioMetaKcal');

  carregarDados();
  carregarMetaKcalSalva();

  document.getElementById('pesoInput').value = '';
  document.getElementById('cinturaInput').value = '';
  document.getElementById('quadrilInput').value = '';
}

function deletarRegistro(id) {
  if (!confirm("Excluir pesagem?")) return;

  localStorage.setItem(
    'historicoPeso',
    JSON.stringify(obterHistorico().filter(i => i.id !== id))
  );

  localStorage.removeItem('usuarioMetaKcal');

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
    csv += `${item.dataRaw},${item.peso},${item.cintura || ''},${item.quadril || ''}\n`;
  });

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;'
  });

  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = "meu_historico_peso.csv";
  link.click();
}

function atualizarGraficosSlider() {
  const historico = obterHistorico();
  const cardSlider = document.getElementById('cardGraficosSlider');
  const wrapper = document.getElementById('graficosWrapper');

  wrapper.innerHTML = '';

  if (meuSwiper) {
    meuSwiper.destroy(true, true);
    meuSwiper = null;
  }

  if (historico.length < 2) {
    cardSlider.style.display = 'none';
    return;
  }

  cardSlider.style.display = 'block';

  const dadosHistorico = [...historico].sort((a, b) => a.id - b.id);

  if (dadosHistorico.filter(i => i.peso).length >= 2) {
    adicionarSlideComGrafico(wrapper, 'graficoPeso');
  }

  if (dadosHistorico.filter(i => i.cintura).length >= 2) {
    adicionarSlideComGrafico(wrapper, 'graficoCintura');
  }

  if (dadosHistorico.filter(i => i.quadril).length >= 2) {
    adicionarSlideComGrafico(wrapper, 'graficoQuadril');
  }

  meuSwiper = new Swiper('.mySwiper', {
    pagination: {
      el: '.swiper-pagination',
      clickable: true
    },
    on: {
      slideChangeTransitionEnd: function () {
        atualizarGraficos();
      }
    }
  });

  atualizarGraficos();
}

function adicionarSlideComGrafico(wrapper, canvasId) {
  const slide = document.createElement('div');
  slide.className = 'swiper-slide';

  const canvas = document.createElement('canvas');
  canvas.id = canvasId;

  slide.appendChild(canvas);
  wrapper.appendChild(slide);
}

function atualizarGraficos() {
  const historico = obterHistorico();

  if (historico.length < 2) return;

  const dadosHistorico = [...historico].sort((a, b) => a.id - b.id);
  const temaAtual = document.documentElement.getAttribute('data-theme');
  const corGrid = temaAtual === 'dark' ? '#334155' : '#f1f5f9';
  const corTexto = temaAtual === 'dark' ? '#94a3b8' : '#64748b';

  renderizarGraficoUnico(
    'graficoPeso',
    'Peso (kg)',
    dadosHistorico.map(i => i.peso),
    dadosHistorico.map(i => i.dataTexto),
    corGrid,
    corTexto,
    'peso'
  );

  renderizarGraficoUnico(
    'graficoCintura',
    'Cintura (cm)',
    dadosHistorico.filter(i => i.cintura).map(i => i.cintura),
    dadosHistorico.filter(i => i.cintura).map(i => i.dataTexto),
    corGrid,
    corTexto,
    'cintura'
  );

  renderizarGraficoUnico(
    'graficoQuadril',
    'Quadril (cm)',
    dadosHistorico.filter(i => i.quadril).map(i => i.quadril),
    dadosHistorico.filter(i => i.quadril).map(i => i.dataTexto),
    corGrid,
    corTexto,
    'quadril'
  );
}

function renderizarGraficoUnico(canvasId, label, dados, labels, corGrid, corTexto, metricKey) {
  const canvas = document.getElementById(canvasId);

  if (!canvas) return;

  if (instanciasGraficos[metricKey]) {
    instanciasGraficos[metricKey].destroy();
  }

  const ctx = canvas.getContext('2d');
  const gradiente = ctx.createLinearGradient(0, 0, 0, 180);

  gradiente.addColorStop(0, 'rgba(14, 165, 233, 0.45)');
  gradiente.addColorStop(1, 'rgba(37, 99, 235, 0.00)');

  instanciasGraficos[metricKey] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: label,
        data: dados,
        borderColor: '#0ea5e9',
        borderWidth: 3,
        tension: 0.4,
        pointBackgroundColor: '#2563eb',
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
            weight: '600'
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

// ==========================================
// TUTORIAL GUIADO DO EVOLUAFIT IA
// ==========================================

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
    texto: "Informe seu peso, cintura e quadril. Esses dados ajudam o app e a IA a entenderem sua evolução."
  },
  {
    aba: "alimentacao",
    alvo: ".card-water",
    titulo: "Diário e hidratação",
    texto: "Nesta área você registra água, refeições e salva o diário para calcular as calorias do dia."
  },
  {
    aba: "alimentacao",
    alvo: ".card-total-kcal",
    titulo: "Meta de kcal da IA",
    texto: "A Luma compara o que você consumiu com uma meta personalizada de calorias."
  },
  {
    aba: "exercicio",
    alvo: "#btnGerarTreinoIA",
    titulo: "Treino com I.A",
    texto: "Aqui você registra caminhadas, corridas e também pode pedir um treino personalizado para a IA."
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
    texto: "Use este botão para navegar entre Evolução, Diário, Treino e I.A de forma rápida."
  }
];

let tutorialPassoAtual = 0;

function iniciarTutorialSeNecessario() {
  const tutorialConcluido = localStorage.getItem("tutorialConcluido");

  if (!tutorialConcluido) {
    setTimeout(() => {
      abrirTutorial(0);
    }, 900);
  }
}

function criarBotaoTutorialNoPerfil() {
  const perfilStatus = document.getElementById("perfilStatus");

  if (!perfilStatus) return;

  if (document.getElementById("btnVerTutorial")) return;

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
  if (document.getElementById("tutorialOverlay")) return;

  const overlay = document.createElement("div");

  overlay.id = "tutorialOverlay";
  overlay.className = "tutorial-overlay";

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
        <div id="tutorialProgressoTexto" class="tutorial-progress-text">Passo 1 de 7</div>

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

  document.getElementById("btnFecharTutorial").addEventListener("click", concluirTutorial);
  document.getElementById("btnPularTutorial").addEventListener("click", concluirTutorial);
  document.getElementById("btnVoltarTutorial").addEventListener("click", voltarPassoTutorial);
  document.getElementById("btnProximoTutorial").addEventListener("click", avancarPassoTutorial);
}

function renderizarPassoTutorial() {
  const passo = tutorialPassos[tutorialPassoAtual];

  if (!passo) return;

  prepararAbaDoTutorial(passo.aba);

  const overlay = document.getElementById("tutorialOverlay");
  const titulo = document.getElementById("tutorialTitulo");
  const texto = document.getElementById("tutorialTexto");
  const progressoTexto = document.getElementById("tutorialProgressoTexto");
  const progressoFill = document.getElementById("tutorialProgressoFill");
  const btnVoltar = document.getElementById("btnVoltarTutorial");
  const btnProximo = document.getElementById("btnProximoTutorial");

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
    }
  }, 350);
}

function prepararAbaDoTutorial(abaId) {
  const botaoAba = document.querySelector(`.floating-item[data-aba="${abaId}"]`);

  if (typeof trocarAba === "function") {
    trocarAba(abaId, botaoAba);
  }
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
  const overlay = document.getElementById("tutorialOverlay");

  if (overlay) {
    overlay.style.display = "none";
  }

  removerDestaquesTutorial();
}

function removerDestaquesTutorial() {
  document.querySelectorAll(".tutorial-highlight").forEach(elemento => {
    elemento.classList.remove("tutorial-highlight");
  });
}