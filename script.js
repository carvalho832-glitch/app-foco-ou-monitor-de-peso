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

// Listeners da Aba de Diário
document.getElementById('dataAlimentacaoInput').addEventListener('change', carregarRefeicoesDoDia);
document.getElementById('btnSalvarAlimentacao').addEventListener('click', salvarRefeicoes);

function iniciarApp() {
  carregarTema();
  configurarDataPadrao();
  configurarDataAlimentacaoPadrao();
  verificarExibicaoAltura();
  carregarMeta();
  carregarDados();
  carregarRefeicoesDoDia();
}

// ==========================================
// LÓGICA DO DIÁRIO (ALIMENTAÇÃO E ÁGUA)
// ==========================================

const itensPreProgramados = {
  cafe: ["Pão Francês", "Fruta", "Iogurte", "Café Preto", "Suco", "Ovos", "Biscoito"],
  almoco: ["Arroz", "Feijão", "Frango", "Carne", "Salada", "Legumes", "Macarrão"],
  jantar: ["Sopa", "Salada", "Frango", "Omelete", "Pão", "Iogurte", "Fruta"]
};

let refeicoesAtuais = { cafe: [], almoco: [], jantar: [], agua: 0 };

function trocarAba(abaId, elementoBotao) {
  document.getElementById('aba-dashboard').style.display = abaId === 'dashboard' ? 'block' : 'none';
  document.getElementById('aba-alimentacao').style.display = abaId === 'alimentacao' ? 'block' : 'none';
  
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  elementoBotao.classList.add('active');

  if (abaId === 'alimentacao') {
    const inputData = document.getElementById('dataAlimentacaoInput');
    if (!inputData.value) {
      inputData.value = new Date().toISOString().split('T')[0];
    }
    carregarRefeicoesDoDia();
  }
}

function configurarDataAlimentacaoPadrao() {
  const hoje = new Date();
  document.getElementById('dataAlimentacaoInput').value = hoje.toISOString().split('T')[0];
}

function carregarRefeicoesDoDia() {
  const dataSelect = document.getElementById('dataAlimentacaoInput').value;
  const historico = JSON.parse(localStorage.getItem('historicoAlimentacao') || '{}');
  
  if (historico[dataSelect]) {
    refeicoesAtuais = JSON.parse(JSON.stringify(historico[dataSelect]));
    if (typeof refeicoesAtuais.agua === 'undefined') refeicoesAtuais.agua = 0;
  } else {
    refeicoesAtuais = { cafe: [], almoco: [], jantar: [], agua: 0 };
  }
  
  renderizarTagsDeComida();
  renderizarAgua();
}

// --- Funções de Água (Calculada por Peso) ---

function obterMetaAguaDinamica() {
  const historico = obterHistorico();
  const ordenado = [...historico].sort((a, b) => b.id - a.id);
  const pesoAtual = ordenado.length > 0 ? ordenado[0].peso : 0;
  
  if (pesoAtual > 0) {
    // 35ml multiplicados pelo peso atual em kg
    return Math.round(pesoAtual * 35);
  }
  
  // Se ainda não houver peso registrado, o padrão é 2000ml
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
  
  if (atual >= metaAgua) {
    progressFill.style.backgroundColor = '#10b981'; // Verde se bater a meta
  } else {
    progressFill.style.backgroundColor = '#0ea5e9'; // Azul padrão
  }
}

// --- Funções de Comida ---

function renderizarTagsDeComida() {
  ['cafe', 'almoco', 'jantar'].forEach(refeicao => {
    const container = document.getElementById(`tags-${refeicao}`);
    container.innerHTML = '';
    
    const itensUnicos = new Set([...itensPreProgramados[refeicao], ...refeicoesAtuais[refeicao]]);
    
    itensUnicos.forEach(item => {
      const isSelected = refeicoesAtuais[refeicao].includes(item);
      const tag = document.createElement('div');
      tag.className = `food-tag ${isSelected ? 'selected' : ''}`;
      tag.innerText = item;
      
      tag.onclick = () => {
        const index = refeicoesAtuais[refeicao].indexOf(item);
        if (index > -1) {
          refeicoesAtuais[refeicao].splice(index, 1);
          tag.classList.remove('selected');
        } else {
          refeicoesAtuais[refeicao].push(item);
          tag.classList.add('selected');
        }
      };
      
      container.appendChild(tag);
    });
  });
}

function adicionarComidaCustomizada(refeicao) {
  const input = document.getElementById(`custom-${refeicao}`);
  const valor = input.value.trim();
  const valorFormatado = valor.charAt(0).toUpperCase() + valor.slice(1);
  
  if (valorFormatado) {
    if (!refeicoesAtuais[refeicao].includes(valorFormatado)) {
      refeicoesAtuais[refeicao].push(valorFormatado);
    }
    input.value = '';
    renderizarTagsDeComida();
  }
}

function salvarRefeicoes() {
  const dataSelect = document.getElementById('dataAlimentacaoInput').value;
  const historico = JSON.parse(localStorage.getItem('historicoAlimentacao') || '{}');
  
  historico[dataSelect] = refeicoesAtuais;
  localStorage.setItem('historicoAlimentacao', JSON.stringify(historico));
  
  const btn = document.getElementById('btnSalvarAlimentacao');
  const textoOriginal = btn.innerText;
  btn.innerText = "✅ Salvo com sucesso!";
  btn.style.backgroundColor = "#10b981"; 
  
  setTimeout(() => {
    btn.innerText = textoOriginal;
    btn.style.backgroundColor = ""; 
  }, 2000);
}

// ==========================================
// LÓGICA DE PESO E GRÁFICOS (Original)
// ==========================================

function carregarTema() {
  const temaSalvo = localStorage.getItem('usuarioTema');
  if (temaSalvo === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.getElementById('btnTema').innerText = '☀️ Claro';
    document.getElementById('metaThemeColor').setAttribute('content', '#0f172a');
  }
}

function alternarTema() {
  const temaAtual = document.documentElement.getAttribute('data-theme');
  const metaColor = document.getElementById('metaThemeColor');
  if (temaAtual === 'dark') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('usuarioTema', 'light');
    document.getElementById('btnTema').innerText = '🌙 Escuro';
    metaColor.setAttribute('content', '#ffffff');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('usuarioTema', 'dark');
    document.getElementById('btnTema').innerText = '☀️ Claro';
    metaColor.setAttribute('content', '#0f172a');
  }
  atualizarGraficos(); 
}

function configurarDataPadrao() {
  const hoje = new Date();
  document.getElementById('dataInput').value = hoje.toISOString().split('T')[0];
}

function obterAltura() { return localStorage.getItem('usuarioAltura') || null; }
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
  if (!altura || isNaN(altura) || altura <= 0) return alert('Altura inválida!');
  localStorage.setItem('usuarioAltura', altura.toFixed(2));
  verificarExibicaoAltura();
  carregarDados();
}

function obterMeta() { return localStorage.getItem('usuarioMeta') || "80.0"; }
function carregarMeta() {
  const meta = obterMeta();
  document.getElementById('pesoMetaCard').innerHTML = `${parseFloat(meta).toFixed(1)} <span style="font-size: 16px; font-weight: 400;">kg</span>`;
  document.getElementById('metaInput').value = meta;
}
function abrirEdicaoMeta() {
  const card = document.getElementById('cardMeta');
  card.style.display = card.style.display === 'none' ? 'block' : 'none';
}
function salvarMeta() {
  const meta = parseFloat(document.getElementById('metaInput').value);
  if (!meta || isNaN(meta) || meta <= 0) return alert('Meta inválida!');
  localStorage.setItem('usuarioMeta', meta.toFixed(1));
  carregarMeta();
  document.getElementById('cardMeta').style.display = 'none';
  carregarDados();
}

function obterHistorico() {
  const dados = localStorage.getItem('historicoPeso');
  return dados ? JSON.parse(dados) : [];
}

function carregarDados() {
  const historico = obterHistorico();
  const altura = obterAltura();
  const lista = document.getElementById('historicoLista');
  lista.innerHTML = ''; 

  let ordenado = [...historico].sort((a, b) => b.id - a.id);
  let pesoAtual = ordenado.length > 0 ? ordenado[0].peso : 0;

  document.getElementById('pesoAtualCard').innerHTML = pesoAtual > 0 
    ? `${pesoAtual.toFixed(1)} <span style="font-size: 16px; font-weight: 400;">kg</span>` 
    : `--.- <span style="font-size: 16px; font-weight: 400;">kg</span>`;

  if (altura && pesoAtual > 0) {
    const imc = pesoAtual / (altura * altura);
    document.getElementById('imcValue').innerText = imc.toFixed(1);
    if(imc < 18.5) document.getElementById('imcStatus').innerText = "Abaixo";
    else if(imc < 25) document.getElementById('imcStatus').innerText = "Ideal";
    else if(imc < 30) document.getElementById('imcStatus').innerText = "Sobrepeso";
    else document.getElementById('imcStatus').innerText = "Obesidade";
  }

  if (historico.length > 0) {
    const cronologico = [...historico].sort((a, b) => a.id - b.id);
    const dif = cronologico[0].peso - cronologico[cronologico.length - 1].peso;
    document.getElementById('totalEliminadoCard').innerText = dif >= 0 ? `${dif.toFixed(1)} kg` : `+${Math.abs(dif).toFixed(1)} kg`;
    
    const dias = Math.round(Math.abs((new Date(cronologico[cronologico.length - 1].dataRaw) - new Date(cronologico[0].dataRaw)) / 86400000));
    document.getElementById('tempoJornadaCard').innerText = dias === 0 ? "1º dia" : `${dias} dias`;
  }

  ordenado.forEach(item => {
    let medidasTxt = '';
    if(item.cintura) medidasTxt += `Cintura: ${item.cintura}cm `;
    if(item.quadril) medidasTxt += `| Quadril: ${item.quadril}cm`;
    
    lista.innerHTML += `
      <div class="history-item">
        <div class="history-info">
          <span class="history-date">${item.dataTexto}</span>
          ${medidasTxt ? `<span class="history-medidas">${medidasTxt}</span>` : ''}
        </div>
        <div class="history-actions">
          <span class="history-weight">${item.peso.toFixed(1)} kg</span>
          <button class="btn-delete" onclick="deletarRegistro(${item.id})">Excluir</button>
        </div>
      </div>
    `;
  });
  
  atualizarGraficosSlider();
  
  // Atualiza a barra de água caso o peso seja modificado na primeira tela
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
    dataTexto: new Date(partes[0], partes[1] - 1, partes[2]).toLocaleDateString('pt-BR', {day: 'numeric', month: 'short'}).replace('.',''),
    dataRaw: data,
    peso: peso,
    cintura: cintura ? parseFloat(cintura) : null,
    quadril: quadril ? parseFloat(quadril) : null
  });
  
  localStorage.setItem('historicoPeso', JSON.stringify(historico));
  carregarDados();
  document.getElementById('pesoInput').value = '';
  document.getElementById('cinturaInput').value = '';
  document.getElementById('quadrilInput').value = '';
}

function deletarRegistro(id) {
  if (!confirm("Excluir pesagem?")) return;
  const historico = obterHistorico().filter(i => i.id !== id);
  localStorage.setItem('historicoPeso', JSON.stringify(historico));
  carregarDados();
}

function exportarParaExcel() {
  const historico = obterHistorico().sort((a, b) => b.id - a.id);
  if(historico.length === 0) return alert("Nenhum dado para exportar.");
  
  let csv = "Data,Peso (kg),Cintura (cm),Quadril (cm)\n";
  historico.forEach(item => {
    csv += `${item.dataRaw},${item.peso},${item.cintura || ''},${item.quadril || ''}\n`;
  });
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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
    pagination: { el: '.swiper-pagination', clickable: true },
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

  renderizarGraficoUnico('graficoPeso', 'Peso (kg)', dadosHistorico.map(i => i.peso), dadosHistorico.map(i => i.dataTexto), corGrid, corTexto, 'peso');
  renderizarGraficoUnico('graficoCintura', 'Cintura (cm)', dadosHistorico.filter(i => i.cintura).map(i => i.cintura), dadosHistorico.filter(i => i.cintura).map(i => i.dataTexto), corGrid, corTexto, 'cintura');
  renderizarGraficoUnico('graficoQuadril', 'Quadril (cm)', dadosHistorico.filter(i => i.quadril).map(i => i.quadril), dadosHistorico.filter(i => i.quadril).map(i => i.dataTexto), corGrid, corTexto, 'quadril');
}

function renderizarGraficoUnico(canvasId, label, dados, labels, corGrid, corTexto, metricKey) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return; 
  const ctx = canvas.getContext('2d');

  if (instanciasGraficos[metricKey]) {
    instanciasGraficos[metricKey].destroy();
  }

  const gradiente = ctx.createLinearGradient(0, 0, 0, 180);
  gradiente.addColorStop(0, 'rgba(14, 165, 233, 0.45)');
  gradiente.addColorStop(1, 'rgba(37, 99, 235, 0.00)');

  instanciasGraficos[metricKey] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: label, data: dados,
        borderColor: '#0ea5e9', borderWidth: 3, tension: 0.4,
        pointBackgroundColor: '#2563eb', pointRadius: 4, pointHoverRadius: 6,
        fill: true, backgroundColor: gradiente
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { 
        legend: { display: false },
        title: {
            display: true, text: `Evolução de ${label}`, color: corTexto,
            font: { size: 14, weight: '600' }, padding: { bottom: 16 }
        }
      },
      scales: {
        y: { grid: { color: corGrid }, ticks: { color: corTexto } },
        x: { grid: { display: false }, ticks: { color: corTexto } }
      }
    }
  });
}
