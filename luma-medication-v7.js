/* ==========================================
   EVOLUAFIT - LUMA MEDICATION V7
   Perfil unificado + rotina de aplicação + efeitos percebidos
========================================== */
(function () {
  if (window.__evoluaLumaMedicationV7) return;
  window.__evoluaLumaMedicationV7 = true;

  const CHAVE_PERFIL = "usuarioPerfil";
  const CACHE_IA = ["analiseIACache", "treinoIACache"];
  const EFEITOS = {
    nausea: "Náusea",
    constipacao: "Constipação",
    refluxo: "Refluxo",
    apetiteReduzido: "Apetite reduzido",
    saciedadeAumentada: "Saciedade aumentada"
  };

  function lerPerfil() {
    try {
      const perfil = JSON.parse(localStorage.getItem(CHAVE_PERFIL) || "null");
      return perfil && typeof perfil === "object" ? perfil : {};
    } catch (_) {
      return {};
    }
  }

  function nomeMedicamento(valor, outro) {
    const nomes = {
      tirzepatida: "Tirzepatida",
      semaglutida: "Semaglutida",
      liraglutida: "Liraglutida",
      outro: String(outro || "Outro medicamento").trim() || "Outro medicamento"
    };
    return nomes[valor] || "";
  }

  function nomeFrequencia(valor) {
    return ({ semanal: "Semanal", diaria: "Diária", outro: "Outra" })[valor] || valor || "";
  }

  function contextoSeguro(tratamento) {
    if (!tratamento || !tratamento.ativo) return "";
    const partes = [`Medicação em uso no contexto de controle de peso: ${tratamento.nome || tratamento.medicamento}.`];
    if (tratamento.doseMg) partes.push(`Dose informada pelo usuário: ${tratamento.doseMg} mg.`);
    if (tratamento.frequencia) partes.push(`Frequência informada: ${nomeFrequencia(tratamento.frequencia)}.`);
    if (tratamento.diaAplicacao) partes.push(`Dia habitual informado: ${tratamento.diaAplicacao}.`);
    if (tratamento.inicio) partes.push(`Início informado: ${tratamento.inicio}.`);
    if (tratamento.ultimaAplicacao) partes.push(`Última aplicação informada: ${tratamento.ultimaAplicacao}.`);
    if (Array.isArray(tratamento.efeitosPercebidos) && tratamento.efeitosPercebidos.length) {
      const nomes = tratamento.efeitosPercebidos.map((chave) => EFEITOS[chave]).filter(Boolean);
      if (nomes.length) partes.push(`Efeitos ou mudanças percebidos informados pelo usuário: ${nomes.join(", ")}.`);
    }
    partes.push("Considere essas informações apenas como contexto para interpretar peso, apetite, saciedade, alimentação, hidratação, treino e tolerância. Não recomende aumentar, reduzir, interromper, trocar ou antecipar doses. Não faça prescrição. Mudanças no tratamento e sintomas importantes devem ser discutidos com profissional de saúde.");
    return partes.join(" ");
  }

  function injetarEstilos() {
    if (document.getElementById("lumaMedicationV7Style")) return;
    const style = document.createElement("style");
    style.id = "lumaMedicationV7Style";
    style.textContent = `
      .luma-med-card{margin:14px 0;padding:14px;border-radius:17px;border:1px solid var(--border-color);background:linear-gradient(145deg,rgba(124,58,237,.07),rgba(37,99,235,.045))}
      .luma-med-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:10px}
      .luma-med-title-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
      .luma-med-head h4{margin:0;color:var(--text-main);font-size:14px;display:flex;align-items:center;gap:7px}.luma-med-head h4 i{color:#7c3aed}
      .luma-med-head p{margin:4px 0 0;color:var(--text-muted);font-size:10.5px;line-height:1.4}
      .luma-med-switch{display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:800;color:var(--text-main);white-space:nowrap}.luma-med-switch input{width:18px;height:18px;accent-color:#7c3aed}
      .luma-med-pill{display:inline-flex;align-items:center;gap:5px;padding:5px 8px;border-radius:999px;background:rgba(16,185,129,.09);color:#059669;font-size:9.5px;font-weight:850}
      .luma-med-status{margin:0 0 10px;font-size:9.8px;color:var(--text-muted);font-weight:750;line-height:1.35}.luma-med-status.ok{color:#059669}.luma-med-status.erro{color:#b45309}
      .luma-med-fields{display:grid;grid-template-columns:1fr 1fr;gap:9px;transition:.18s ease}.luma-med-fields.off{opacity:.45;pointer-events:none;filter:saturate(.45)}
      .luma-med-field{display:flex;flex-direction:column;gap:5px}.luma-med-field.full{grid-column:1/-1}.luma-med-field span{font-size:10px;color:var(--text-muted);font-weight:800}
      .luma-med-field input,.luma-med-field select{width:100%;min-height:40px;padding:9px 10px;border:1px solid var(--border-color);border-radius:11px;background:var(--bg-color);color:var(--text-main);font-size:12px;outline:none}
      .luma-med-effects{grid-column:1/-1;display:flex;flex-direction:column;gap:7px;padding-top:2px}.luma-med-effects-title{font-size:10px;color:var(--text-muted);font-weight:800}.luma-med-effect-grid{display:flex;gap:7px;flex-wrap:wrap}
      .luma-med-effect{position:relative;display:inline-flex}.luma-med-effect input{position:absolute;opacity:0;pointer-events:none}.luma-med-effect span{display:inline-flex;align-items:center;min-height:34px;padding:7px 10px;border:1px solid var(--border-color);border-radius:999px;background:var(--bg-color);color:var(--text-muted);font-size:10px;font-weight:800;transition:.16s ease}.luma-med-effect input:checked+span{border-color:#7c3aed;background:rgba(124,58,237,.11);color:#7c3aed}
      .luma-med-note{margin-top:10px;padding:9px 10px;border-radius:11px;background:rgba(124,58,237,.07);color:var(--text-muted);font-size:9.7px;line-height:1.45}.luma-med-note strong{color:var(--text-main)}
      @media(max-width:390px){.luma-med-fields{grid-template-columns:1fr}.luma-med-field.full,.luma-med-effects{grid-column:auto}.luma-med-head{flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function criarCard() {
    if (document.getElementById("lumaMedicationV7")) return;
    const observacoes = document.getElementById("perfilObservacoes");
    if (!observacoes) return;
    const ancora = observacoes.closest(".input-field") || observacoes.parentElement;
    if (!ancora || !ancora.parentElement) return;

    const card = document.createElement("div");
    card.id = "lumaMedicationV7";
    card.className = "luma-med-card";
    card.innerHTML = `
      <div class="luma-med-head">
        <div>
          <div class="luma-med-title-row">
            <h4><i class="bi bi-capsule-pill"></i> Medicação em uso</h4>
            <span id="lumaMedicationPill"></span>
          </div>
          <p>Opcional. A Luma usa esse contexto para interpretar melhor seus registros.</p>
        </div>
        <label class="luma-med-switch"><input id="perfilMedicacaoAtiva" type="checkbox"> Em uso</label>
      </div>
      <div id="lumaMedicationStatus" class="luma-med-status">Nenhuma medicação informada.</div>
      <div id="lumaMedicationFields" class="luma-med-fields off">
        <label class="luma-med-field full"><span>Medicamento</span>
          <select id="perfilMedicamentoPeso">
            <option value="">Selecione</option>
            <option value="tirzepatida">Tirzepatida</option>
            <option value="semaglutida">Semaglutida</option>
            <option value="liraglutida">Liraglutida</option>
            <option value="outro">Outro</option>
          </select>
        </label>
        <label id="lumaMedicationOutroWrap" class="luma-med-field full" style="display:none"><span>Nome do medicamento</span><input id="perfilMedicamentoOutro" type="text" placeholder="Digite o nome"></label>
        <label class="luma-med-field"><span>Dose atual em mg (opcional)</span><input id="perfilMedicacaoDose" type="text" inputmode="decimal" placeholder="Ex: 2,5"></label>
        <label class="luma-med-field"><span>Frequência</span>
          <select id="perfilMedicacaoFrequencia"><option value="semanal">Semanal</option><option value="diaria">Diária</option><option value="outro">Outra</option></select>
        </label>
        <label id="lumaDiaAplicacaoWrap" class="luma-med-field"><span>Dia habitual da aplicação</span>
          <select id="perfilMedicacaoDia">
            <option value="">Não informado</option><option value="Segunda-feira">Segunda-feira</option><option value="Terça-feira">Terça-feira</option><option value="Quarta-feira">Quarta-feira</option><option value="Quinta-feira">Quinta-feira</option><option value="Sexta-feira">Sexta-feira</option><option value="Sábado">Sábado</option><option value="Domingo">Domingo</option>
          </select>
        </label>
        <label class="luma-med-field"><span>Data de início (opcional)</span><input id="perfilMedicacaoInicio" type="date"></label>
        <label class="luma-med-field full"><span>Última aplicação (opcional)</span><input id="perfilMedicacaoUltima" type="date"></label>
        <div class="luma-med-effects">
          <div class="luma-med-effects-title">Efeitos ou mudanças percebidos (opcional)</div>
          <div class="luma-med-effect-grid">
            <label class="luma-med-effect"><input type="checkbox" data-med-effect="nausea"><span>Náusea</span></label>
            <label class="luma-med-effect"><input type="checkbox" data-med-effect="constipacao"><span>Constipação</span></label>
            <label class="luma-med-effect"><input type="checkbox" data-med-effect="refluxo"><span>Refluxo</span></label>
            <label class="luma-med-effect"><input type="checkbox" data-med-effect="apetiteReduzido"><span>Apetite reduzido</span></label>
            <label class="luma-med-effect"><input type="checkbox" data-med-effect="saciedadeAumentada"><span>Saciedade aumentada</span></label>
          </div>
        </div>
      </div>
      <div class="luma-med-note"><i class="bi bi-shield-check"></i> A Luma usa essas informações apenas como contexto e <strong>não altera dose nem tratamento</strong>. Tudo é salvo junto pelo botão <strong>Salvar Perfil</strong> abaixo.</div>
    `;
    ancora.insertAdjacentElement("beforebegin", card);

    document.getElementById("perfilMedicacaoAtiva")?.addEventListener("change", atualizarEstadoCampos);
    document.getElementById("perfilMedicamentoPeso")?.addEventListener("change", function () {
      atualizarOutro();
      aplicarFrequenciaPadrao();
    });
    document.getElementById("perfilMedicacaoFrequencia")?.addEventListener("change", atualizarDiaAplicacao);
    document.getElementById("perfilMedicacaoUltima")?.addEventListener("change", inferirDiaDaUltimaAplicacao);
    document.getElementById("btnSalvarPerfil")?.addEventListener("click", function () {
      setTimeout(function () { salvarTratamento(); }, 80);
    });

    carregarCampos();
  }

  function atualizarEstadoCampos() {
    const ativo = !!document.getElementById("perfilMedicacaoAtiva")?.checked;
    document.getElementById("lumaMedicationFields")?.classList.toggle("off", !ativo);
    atualizarStatus();
  }

  function atualizarOutro() {
    const valor = document.getElementById("perfilMedicamentoPeso")?.value || "";
    const wrap = document.getElementById("lumaMedicationOutroWrap");
    if (wrap) wrap.style.display = valor === "outro" ? "flex" : "none";
  }

  function aplicarFrequenciaPadrao() {
    const med = document.getElementById("perfilMedicamentoPeso")?.value || "";
    const freq = document.getElementById("perfilMedicacaoFrequencia");
    if (!freq) return;
    if (["tirzepatida", "semaglutida"].includes(med)) freq.value = "semanal";
    if (med === "liraglutida") freq.value = "diaria";
    atualizarDiaAplicacao();
  }

  function atualizarDiaAplicacao() {
    const freq = document.getElementById("perfilMedicacaoFrequencia")?.value || "";
    const wrap = document.getElementById("lumaDiaAplicacaoWrap");
    if (wrap) wrap.style.display = freq === "semanal" ? "flex" : "none";
  }

  function inferirDiaDaUltimaAplicacao() {
    const freq = document.getElementById("perfilMedicacaoFrequencia")?.value || "";
    const valor = document.getElementById("perfilMedicacaoUltima")?.value || "";
    const select = document.getElementById("perfilMedicacaoDia");
    if (freq !== "semanal" || !valor || !select || select.value) return;
    const partes = valor.split("-").map(Number);
    if (partes.length !== 3) return;
    const d = new Date(partes[0], partes[1] - 1, partes[2]);
    const dias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    select.value = dias[d.getDay()] || "";
  }

  function efeitosSelecionados() {
    return Array.from(document.querySelectorAll('[data-med-effect]:checked')).map((el) => el.dataset.medEffect).filter(Boolean);
  }

  function coletarTratamento() {
    const ativo = !!document.getElementById("perfilMedicacaoAtiva")?.checked;
    const medicamento = document.getElementById("perfilMedicamentoPeso")?.value || "";
    const outro = document.getElementById("perfilMedicamentoOutro")?.value.trim() || "";
    const doseBruta = document.getElementById("perfilMedicacaoDose")?.value.trim() || "";
    const doseMg = doseBruta.replace(",", ".");
    const frequencia = document.getElementById("perfilMedicacaoFrequencia")?.value || "";
    const diaAplicacao = frequencia === "semanal" ? (document.getElementById("perfilMedicacaoDia")?.value || "") : "";
    const inicio = document.getElementById("perfilMedicacaoInicio")?.value || "";
    const ultimaAplicacao = document.getElementById("perfilMedicacaoUltima")?.value || "";
    const nome = nomeMedicamento(medicamento, outro);

    return {
      ativo,
      medicamento,
      nome,
      outro: medicamento === "outro" ? outro : "",
      doseMg: doseMg || "",
      frequencia,
      diaAplicacao,
      inicio,
      ultimaAplicacao,
      efeitosPercebidos: efeitosSelecionados(),
      atualizadoEm: new Date().toLocaleString("pt-BR"),
      orientacaoIA: "Usar apenas como contexto. Não orientar aumento, redução, suspensão, troca ou antecipação de dose; não fazer prescrição; encaminhar mudanças de tratamento e sintomas importantes para avaliação profissional."
    };
  }

  function marcarErro(texto) {
    const status = document.getElementById("lumaMedicationStatus");
    if (!status) return;
    status.textContent = texto;
    status.classList.remove("ok");
    status.classList.add("erro");
  }

  function salvarTratamento() {
    const tratamento = coletarTratamento();
    if (tratamento.ativo && !tratamento.medicamento) {
      marcarErro("Selecione o medicamento para ativar este contexto.");
      return false;
    }
    if (tratamento.ativo && tratamento.medicamento === "outro" && !tratamento.outro) {
      marcarErro("Informe o nome do medicamento.");
      return false;
    }

    const perfil = lerPerfil();
    perfil.tratamentoPeso = tratamento;
    perfil.contextoTratamentoIA = contextoSeguro(tratamento);
    localStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil));
    CACHE_IA.forEach((chave) => localStorage.removeItem(chave));
    atualizarStatus();
    return true;
  }

  function carregarCampos() {
    const perfil = lerPerfil();
    const t = perfil.tratamentoPeso || {};
    const check = document.getElementById("perfilMedicacaoAtiva");
    if (check) check.checked = !!t.ativo;
    const med = document.getElementById("perfilMedicamentoPeso");
    if (med) med.value = t.medicamento || "";
    const outro = document.getElementById("perfilMedicamentoOutro");
    if (outro) outro.value = t.outro || "";
    const dose = document.getElementById("perfilMedicacaoDose");
    if (dose) dose.value = t.doseMg ? String(t.doseMg).replace(".", ",") : "";
    const freq = document.getElementById("perfilMedicacaoFrequencia");
    if (freq) freq.value = t.frequencia || (["tirzepatida", "semaglutida"].includes(t.medicamento) ? "semanal" : t.medicamento === "liraglutida" ? "diaria" : "semanal");
    const dia = document.getElementById("perfilMedicacaoDia");
    if (dia) dia.value = t.diaAplicacao || "";
    const inicio = document.getElementById("perfilMedicacaoInicio");
    if (inicio) inicio.value = t.inicio || "";
    const ultima = document.getElementById("perfilMedicacaoUltima");
    if (ultima) ultima.value = t.ultimaAplicacao || "";
    const selecionados = new Set(Array.isArray(t.efeitosPercebidos) ? t.efeitosPercebidos : []);
    document.querySelectorAll("[data-med-effect]").forEach((el) => { el.checked = selecionados.has(el.dataset.medEffect); });
    atualizarOutro();
    atualizarDiaAplicacao();
    atualizarEstadoCampos();
  }

  function atualizarStatus() {
    const perfil = lerPerfil();
    const salvo = perfil.tratamentoPeso || {};
    const checkAtivo = !!document.getElementById("perfilMedicacaoAtiva")?.checked;
    const status = document.getElementById("lumaMedicationStatus");
    const pill = document.getElementById("lumaMedicationPill");
    if (!status || !pill) return;
    status.classList.remove("ok", "erro");

    if (salvo.ativo && salvo.nome) {
      status.textContent = `${salvo.nome} está incluída no contexto da Luma e será salva junto com seu perfil.`;
      status.classList.add("ok");
      const dose = salvo.doseMg ? ` • ${String(salvo.doseMg).replace(".", ",")} mg` : "";
      pill.innerHTML = `<span class="luma-med-pill"><i class="bi bi-cloud-check"></i> Contexto IA ativo${dose}</span>`;
    } else if (checkAtivo) {
      status.textContent = "Preencha os dados e toque em Salvar Perfil no fim desta seção.";
      pill.innerHTML = "";
    } else {
      status.textContent = "Nenhuma medicação informada.";
      pill.innerHTML = "";
    }
  }

  function observarAbaIA() {
    document.addEventListener("click", function (event) {
      const alvo = event.target && event.target.closest ? event.target.closest('[data-aba="ia"], .floating-item[data-aba="ia"]') : null;
      if (!alvo) return;
      setTimeout(function () { criarCard(); carregarCampos(); }, 120);
    }, true);
  }

  function iniciar() {
    injetarEstilos();
    criarCard();
    observarAbaIA();
    setTimeout(criarCard, 400);
    setTimeout(criarCard, 1200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else setTimeout(iniciar, 0);
})();
