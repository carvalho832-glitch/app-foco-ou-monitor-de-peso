let contadorAgua = 0;
document.addEventListener('DOMContentLoaded', iniciarApp);

function iniciarApp() {
    configurarDatasPadrao();
    carregarDados();
    document.getElementById('btnSalvarAlimentacao').addEventListener('click', salvarAlimentacao);
}

function mudarTela(tela) {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    if(tela === 'medidas') {
        document.getElementById('telaMedidas').classList.add('ativa');
        document.getElementById('navMedidas').classList.add('active');
        document.getElementById('headerActions').style.display = 'flex';
    } else {
        document.getElementById('telaAlimentacao').classList.add('ativa');
        document.getElementById('navAlimentacao').classList.add('active');
        document.getElementById('headerActions').style.display = 'none';
        atualizarMetaAgua();
    }
}

function calcularMetaAgua() {
    const hist = JSON.parse(localStorage.getItem('historicoPeso') || '[]');
    if (hist.length === 0) return 2000;
    const pesoAtual = hist.sort((a, b) => b.id - a.id)[0].peso;
    return Math.round(pesoAtual * 35);
}

function atualizarMetaAgua() {
    document.getElementById('metaAguaTexto').innerText = `Meta: ${calcularMetaAgua()}ml`;
}

function ajustarAgua(v) {
    contadorAgua = Math.max(0, contadorAgua + v);
    document.getElementById('contagemAgua').innerText = contadorAgua;
}

function salvarAlimentacao() {
    const data = document.getElementById('dataAlimentacao').value;
    const db = JSON.parse(localStorage.getItem('dieta') || '{}');
    db[data] = {
        cafe: document.getElementById('cafeInput').value,
        almoco: document.getElementById('almocoInput').value,
        lanche: document.getElementById('lancheInput').value,
        jantar: document.getElementById('jantarInput').value,
        agua: contadorAgua
    };
    localStorage.setItem('dieta', JSON.stringify(db));
    dispararCelebracao("Diário salvo! 🥗");
}

function dispararCelebracao(msg) {
    const t = document.getElementById('toastCelebracao');
    document.getElementById('toastMensagem').innerText = msg;
    t.classList.add('mostrar');
    setTimeout(() => t.classList.remove('mostrar'), 3000);
}
