/* ==========================================
   EVOLUAFIT - LUMA MEDICATION V6
   Contexto opcional de tratamento para a IA
========================================== */
(function () {
  if (window.__evoluaLumaMedicationV6) return;
  window.__evoluaLumaMedicationV6 = true;

  const CHAVE_PERFIL = "usuarioPerfil";
  const CACHE_IA = ["analiseIACache", "treinoIACache"];

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

  function contextoSeguro(tratamento) {
    if (!tratamento || !tratamento.ativo) return "";
    const partes = [`Medicamento em uso para controle de peso: ${tratamento.nome || tratamento.medicamento}.`];
    if (tratamento.doseMg) partes.push(`Dose informada: ${tratamento.doseMg} mg.`);
    if (tratamento.frequencia) partes.push(`Frequência informada: ${tratamento.frequencia}.`);
    if (tratamento.inicio) partes.push(`Início informado: ${tratamento.inicio}.`);
    partes.push("Considere esse tratamento como contexto nas análises de peso, apetite, hidratação, alimentação e tolerância. Não recomende aumentar, reduzir, interromper, trocar ou antecipar doses. Para mudanças no tratamento ou efeitos adversos importantes, oriente avaliação com profissional de saúde.");
    return partes.join(" ");
  }

  function injetarEstilos() {
    if (document.getElementById("lumaMedicationV6Style")) return;
    const style = document.createElement("style");
    style.id = "lumaMedicationV6Style";
    style.textContent = `
      .luma-med-card{margin:14px 0;padding:14px;border-radius:17px;border:1px solid var(--border-color);background:linear-gradient(145deg,rgba(124,58,237,.07),rgba(37,99,235,.045))}
      .luma-med-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:11px}
      .luma-med-head h4{margin:0;color:var(--text-main);font-size:14px;display:flex;align-items:center;gap:7px}.luma-med-head h4 i{color:#7c3aed}
      .luma-med-head p{margin:4px 0 0;color:var(--text-muted);font-size:10.5px;line-height:1.4}
      .luma-med-switch{display:flex;align-items:center;gap:7px;font-size:10.5px;font-weight:800;color:var(--text-main);white-space:nowrap}.luma-med-switch input{width:18px;height:18px;accent-color:#7c3aed}
      .luma-med-fields{display:grid;grid-template-columns:1fr 1fr;gap:9px;transition:.18s ease}.luma-med-fields.off{opacity:.45;pointer-events:none;filter:saturate(.45)}
      .luma-med-field{display:flex;flex-direction:column;gap:5px}.luma-med-field.full{grid-column:1/-1}.luma-med-field span{font-size:10px;color:var(--text-muted);font-weight:800}
      .luma-med-field input,.luma-med-field select{width:100%;min-height:40px;padding:9px 10px;border:1px solid var(--border-color);border-radius:11px;background:var(--bg-color);color:var(--text-main);font-size:12px;outline:none}
      .luma-med-note{margin-top:10px;padding:9px 10px;border-radius:11px;background:rgba(124,58,237,.07);color:var(--text-muted);font-size:9.7px;line-height:1.4}
      .luma-med-actions{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:10px}.luma-med-status{font-size:9.8px;color:var(--text-muted);font-weight:750;line-height:1.3}.luma-med-status.ok{color:#059669}
      .luma-med-save{border:0;border-radius:11px;min-height:38px;padding:9px 12px;background:#7c3aed;color:#fff;font-size:10.5px;font-weight:850;white-space:nowrap}
      .luma-med-pill{display:inline-flex;align-items:center;gap:5px;margin-top:7px;padding:5px 8px;border-radius:999px;background:rgba(16,185,129,.09);color:#059669;font-size:9.5px;font-weight:850}
      @media(max-width:390px){.luma-med-fields{grid-template-columns:1fr}.luma-med-field.full{grid-column:auto}.luma-med-head{flex-direction:column}.luma-med-actions{align-items:flex-start;flex-direction:column}.luma-med-save{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function criarCard() {
    if (document.getElementById("lumaMedicationV6")) return;
    const observacoes = document.getElementById("perfilObservacoes");
    if (!observacoes) return;
    const ancora = observacoes.closest(".input-field") || observacoes.parentElement;
    if (!ancora || !ancora.parentElement) return;

    const card = document.createElement("div");
    card.id = "lumaMedicationV6";
    card.className = "luma-med-card";
    card.innerHTML = `
      <div class="luma-med-head">
        <div>
          <h4><i class="bi bi-capsule-pill"></i> Tratamento que influencia o peso</h4>
          <p>Opcional. Ajuda a Luma a interpretar seus registros com mais contexto.</p>
        </div>
        <label class="luma-med-switch"><input id="perfilMedicacaoAtiva" type="checkbox"> Em uso</label>
      </div>
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
        <label class="luma-med-field full"><span>Data de início (opcional)</span><input id="perfilMedicacaoInicio" type="date"></label>
      </div>
      <div class="luma-med-note"><i class="bi bi-shield-check"></i> A Luma usa essa informação apenas como contexto. Ela não deve orientar alteração de dose, suspensão ou troca de medicamento.</div>
      <div class="luma-med-actions"><div><div id="lumaMedicationStatus" class="luma-med-status">Nenhum tratamento informado.</div><div id="lumaMedicationPill"></div></div><button id="btnSalvarMedicacaoLuma" class="luma-med-save" type="button"><i class="bi bi-check2-circle"></i> Salvar no perfil</button></div>
    `;
    ancora.insertAdjacentElement("beforebegin", card);

    document.getElementById("perfilMedicacaoAtiva")?.addEventListener("change", atualizarEstadoCampos);
    document.getElementById("perfilMedicamentoPeso")?.addEventListener("change", function () {
      atualizarOutro();
      aplicarFrequenciaPadrao();
    });
    document.getElementById("btnSalvarMedicacaoLuma")?.addEventListener("click", function () { salvarTratamento(true); });
    document.getElementById("btnSalvarPerfil")?.addEventListener("click", function () {
      setTimeout(function () { salvarTratamento(false); }, 80);
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
  }

  function coletarTratamento() {
    const ativo = !!document.getElementById("perfilMedicacaoAtiva")?.checked;
    const medicamento = document.getElementById("perfilMedicamentoPeso")?.value || "";
    const outro = document.getElementById("perfilMedicamentoOutro")?.value.trim() || "";
    const doseBruta = document.getElementById("perfilMedicacaoDose")?.value.trim() || "";
    const doseMg = doseBruta.replace(",", ".");
    const frequencia = document.getElementById("perfilMedicacaoFrequencia")?.value || "";
    const inicio = document.getElementById("perfilMedicacaoInicio")?.value || "";
    const nome = nomeMedicamento(medicamento, outro);

    return {
      ativo,
      medicamento,
      nome,
      outro: medicamento === "outro" ? outro : "",
      doseMg: doseMg || "",
      frequencia,
      inicio,
      atualizadoEm: new Date().toLocaleString("pt-BR"),
      orientacaoIA: "Usar apenas como contexto. Não orientar aumento, redução, suspensão, troca ou antecipação de dose; encaminhar mudanças de tratamento e efeitos adversos importantes para avaliação profissional."
    };
  }

  function salvarTratamento(mostrarFeedback) {
    const tratamento = coletarTratamento();
    if (tratamento.ativo && !tratamento.medicamento) {
      const status = document.getElementById("lumaMedicationStatus");
      if (status) { status.textContent = "Selecione o medicamento para ativar este contexto."; status.classList.remove("ok"); }
      return false;
    }
    if (tratamento.ativo && tratamento.medicamento === "outro" && !tratamento.outro) {
      const status = document.getElementById("lumaMedicationStatus");
      if (status) { status.textContent = "Informe o nome do medicamento."; status.classList.remove("ok"); }
      return false;
    }

    const perfil = lerPerfil();
    perfil.tratamentoPeso = tratamento;
    perfil.contextoTratamentoIA = contextoSeguro(tratamento);
    localStorage.setItem(CHAVE_PERFIL, JSON.stringify(perfil));
    CACHE_IA.forEach((chave) => localStorage.removeItem(chave));
    atualizarStatus();

    if (mostrarFeedback) {
      const btn = document.getElementById("btnSalvarMedicacaoLuma");
      if (btn) {
        const antigo = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check2-circle"></i> Salvo';
        btn.style.background = "#059669";
        setTimeout(function () { btn.innerHTML = antigo; btn.style.background = ""; }, 1400);
      }
    }
    return true;
  }

  function carregarCampos() {
    const perfil = lerPerfil();
    const t = perfil.tratamentoPeso || {};
    const ativo = !!t.ativo;
    const check = document.getElementById("perfilMedicacaoAtiva");
    if (check) check.checked = ativo;
    const med = document.getElementById("perfilMedicamentoPeso");
    if (med) med.value = t.medicamento || "";
    const outro = document.getElementById("perfilMedicamentoOutro");
    if (outro) outro.value = t.outro || "";
    const dose = document.getElementById("perfilMedicacaoDose");
    if (dose) dose.value = t.doseMg ? String(t.doseMg).replace(".", ",") : "";
    const freq = document.getElementById("perfilMedicacaoFrequencia");
    if (freq) freq.value = t.frequencia || (["tirzepatida", "semaglutida"].includes(t.medicamento) ? "semanal" : t.medicamento === "liraglutida" ? "diaria" : "semanal");
    const inicio = document.getElementById("perfilMedicacaoInicio");
    if (inicio) inicio.value = t.inicio || "";
    atualizarOutro();
    atualizarEstadoCampos();
  }

  function atualizarStatus() {
    const perfil = lerPerfil();
    const salvo = perfil.tratamentoPeso || {};
    const checkAtivo = !!document.getElementById("perfilMedicacaoAtiva")?.checked;
    const status = document.getElementById("lumaMedicationStatus");
    const pill = document.getElementById("lumaMedicationPill");
    if (!status || !pill) return;

    if (salvo.ativo && salvo.nome) {
      status.textContent = `${salvo.nome} está incluída no contexto da Luma.`;
      status.classList.add("ok");
      const dose = salvo.doseMg ? ` • ${String(salvo.doseMg).replace(".", ",")} mg` : "";
      pill.innerHTML = `<span class="luma-med-pill"><i class="bi bi-cloud-check"></i> Contexto IA ativo${dose}</span>`;
    } else if (checkAtivo) {
      status.textContent = "Preencha e salve para a Luma considerar o tratamento.";
      status.classList.remove("ok");
      pill.innerHTML = "";
    } else {
      status.textContent = "Nenhum tratamento informado.";
      status.classList.remove("ok");
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
