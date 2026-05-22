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

function iniciarApp() {
  carregarTema();
  configurarDataPadrao();
  verificarExibicaoAltura();
  carregarMeta();
  carregarDados();
}

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
}

function adicionarRegistro() {
  const peso = parseFloat(document.getElementById('pesoInput').value);
  const data = document.getElementById('dataInput').value;
  const cintura = document.getElementById('cinturaInput').value;
  const quadril = document.getElementById('quadrilInput').value;
  
  if (!peso || isNaN(peso)) return alert('Digite o peso!');
  
  const historico = obterHistorico();
  const partes = data.split('-');
  
  // Lógica inteligente para saber se o peso diminuiu
  let ultimoPeso = null;
  if(historico.length > 0) {
      const histOrd = [...historico].sort((a,b) => b.id - a.id);
      ultimoPeso = histOrd[0].peso;
  }
  
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
  
  // Gatilho da comemoração
  if (ultimoPeso !== null && peso < ultimoPeso) {
      dispararCelebracao("Peso menor que o anterior! Mandou bem! 🎉", true);
  } else if (ultimoPeso === null) {
      dispararCelebracao("Primeiro registro! Rumo à meta! 🚀", false);
  } else {
      dispararCelebracao("Registro salvo! Bora focar! 💪", false);
  }
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
  if (meuSwiper) { meuSwiper.destroy(true, true); meuSwiper = null; }
  if (historico.length < 2) { cardSlider.style.display = 'none'; return; }
  
  cardSlider.style.display = 'block';
  const dadosHistorico = [...historico].sort((a, b) => a.id - b.id);
  
  if (dadosHistorico.filter(i => i.peso).length >= 2) adicionarSlideComGrafico(wrapper, 'graficoPeso');
  if (dadosHistorico.filter(i => i.cintura).length >= 2) adicionarSlideComGrafico(wrapper, 'graficoCintura');
  if (dadosHistorico.filter(i => i.quadril).length >= 2) adicionarSlideComGrafico(wrapper, 'graficoQuadril');
  
  meuSwiper = new Swiper('.mySwiper', {
    pagination: { el: '.swiper-pagination', clickable: true },
    on: { slideChangeTransitionEnd: function () { atualizarGraficos(); } }
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

// --- FUNÇÃO DE CELEBRAÇÃO (CONFETES E MENSAGEM) ---
function dispararCelebracao(mensagem, comConfete) {
  const toast = document.getElementById('toastCelebracao');
  document.getElementById('toastMensagem').innerText = mensagem;
  toast.classList.add('mostrar');

  if(comConfete) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#0ea5e9', '#2563eb', '#10b981', '#fbbf24'],
        zIndex: 10000
      });
  }

  setTimeout(() => {
    toast.classList.remove('mostrar');
  }, 4000);
}
