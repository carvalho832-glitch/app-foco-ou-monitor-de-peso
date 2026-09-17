/* EvoluaFit - Diário V3 */
(function () {
  if (window.__evoluaFoodV3) return;
  window.__evoluaFoodV3 = true;

  const FAVORITOS_KEY = "evoluaFoodFavoritesV3";
  const $ = (id) => document.getElementById(id);
  const parse = (txt, fallback) => { try { const v = JSON.parse(txt); return v == null ? fallback : v; } catch (_) { return fallback; } };
  const tipos = ["cafe","almoco","jantar"];

  function nome(tipo) { return ({cafe:"Café da manhã",almoco:"Almoço",jantar:"Jantar"})[tipo] || tipo; }
  function normalizar(t) { return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase(); }
  function isoLocal(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }

  function estilos() {
    if ($("evolua-food-v3-style")) return;
    const s = document.createElement("style"); s.id = "evolua-food-v3-style";
    s.textContent = `
      .food-tools-v3{padding:14px;margin-bottom:14px;border-radius:18px;border:1px solid var(--border-color);background:var(--card-bg)}.food-tools-head-v3{margin-bottom:10px}.food-tools-head-v3 strong{font-size:15px}.food-tools-head-v3 small{display:block;margin-top:2px;color:var(--text-muted);font-size:10px}.food-tools-actions-v3{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.food-tool-btn-v3{min-height:50px;padding:8px 6px;border-radius:13px;border:1px solid var(--border-color);background:rgba(148,163,184,.045);color:var(--text-main);font-size:10px;font-weight:850}.food-tool-btn-v3 i{display:block;margin:0 0 3px;font-size:16px;color:#2563eb}.food-tool-panel-v3{display:none;margin-top:10px;padding-top:10px;border-top:1px solid var(--border-color)}.food-tool-panel-v3.open{display:block}.food-row-v3{margin-top:10px}.food-row-v3:first-child{margin-top:0}.food-row-title-v3{display:flex;justify-content:space-between;gap:8px;margin-bottom:6px;color:var(--text-muted);font-size:10px;font-weight:900;text-transform:uppercase}.food-chip-wrap-v3{display:flex;flex-wrap:wrap;gap:6px}.food-chip-v3{padding:7px 9px;border-radius:999px;border:1px solid var(--border-color);background:var(--card-bg);color:var(--text-main);font-size:10px;font-weight:750}.food-favorite-action-v3{display:flex;justify-content:flex-end;margin:-4px 0 9px}.food-favorite-action-v3 button{padding:6px 9px;min-height:30px;border-radius:9px;background:rgba(168,85,247,.09);color:#9333ea;border:1px solid rgba(168,85,247,.14);font-size:9.5px;font-weight:850}.food-v3-toast{position:fixed;left:50%;bottom:calc(150px + env(safe-area-inset-bottom));transform:translate(-50%,14px);z-index:10120;width:max-content;max-width:calc(100vw - 32px);padding:10px 13px;border-radius:999px;background:#0f172a;color:#fff;box-shadow:0 12px 28px rgba(15,23,42,.25);font-size:11px;font-weight:800;opacity:0;pointer-events:none;transition:.18s ease}.food-v3-toast.show{opacity:1;transform:translate(-50%,0)}@media(max-width:380px){.food-tools-actions-v3{grid-template-columns:1fr 1fr}}
    `; document.head.appendChild(s);
  }

  function toast(txt) {
    let t = $("foodV3Toast"); if (!t) { t = document.createElement("div"); t.id="foodV3Toast"; t.className="food-v3-toast"; document.body.appendChild(t); }
    t.textContent = txt; t.classList.add("show"); clearTimeout(t._tm); t._tm = setTimeout(()=>t.classList.remove("show"),2200);
  }

  function favoritos() {
    const s = parse(localStorage.getItem(FAVORITOS_KEY)||"{}",{});
    return {cafe:Array.isArray(s.cafe)?s.cafe:[],almoco:Array.isArray(s.almoco)?s.almoco:[],jantar:Array.isArray(s.jantar)?s.jantar:[]};
  }

  function selecionados(tipo) {
    return Array.from(document.querySelectorAll(`#tags-${tipo} .food-tag.selected`)).map(el=>(el.textContent||"").trim()).filter(Boolean);
  }

  function salvarFavorito(tipo) {
    const itens = selecionados(tipo); if (!itens.length) { toast("Selecione os alimentos dessa refeição primeiro."); return; }
    const fav = favoritos(); const assinatura = itens.map(normalizar).sort().join("|");
    if (fav[tipo].some(g=>g && g.assinatura===assinatura)) { toast("Essa refeição já está nos favoritos."); return; }
    fav[tipo].unshift({id:Date.now(),itens,assinatura}); fav[tipo]=fav[tipo].slice(0,6); localStorage.setItem(FAVORITOS_KEY,JSON.stringify(fav)); toast("Refeição salva nos favoritos.");
    const p=$("foodPanelV3"); if(p&&p.classList.contains("open")&&p.dataset.mode==="favorites") renderPainel("favorites",true);
  }

  function aplicarItem(tipo,item,silencioso) {
    const c=$(`tags-${tipo}`); if(!c) return;
    const tag=Array.from(c.querySelectorAll(".food-tag")).find(el=>normalizar(el.textContent)===normalizar(item));
    if(tag){ if(!tag.classList.contains("selected")) tag.click(); }
    else { const input=$(`custom-${tipo}`); if(input&&typeof window.adicionarComidaCustomizada==="function"){input.value=item;window.adicionarComidaCustomizada(tipo);} }
    if(!silencioso) toast(`${item} adicionado em ${nome(tipo).toLowerCase()}.`);
  }

  function aplicarGrupo(tipo,itens) { (itens||[]).forEach(i=>aplicarItem(tipo,i,true)); toast(`${nome(tipo)} favorita aplicada.`); }

  function recentes() {
    const h=parse(localStorage.getItem("historicoAlimentacao")||"{}",{}), datas=Object.keys(h).sort().reverse().slice(0,14), out={cafe:[],almoco:[],jantar:[]};
    tipos.forEach(tipo=>{const vistos=new Set();datas.forEach(d=>{const arr=h[d]&&h[d][tipo];if(!Array.isArray(arr))return;arr.forEach(i=>{const txt=String(i||"").trim(),k=normalizar(txt);if(!txt||vistos.has(k))return;vistos.add(k);out[tipo].push(txt);});});out[tipo]=out[tipo].slice(0,8);});return out;
  }

  function linhaChips(tipo,itens,click) {
    const r=document.createElement("div");r.className="food-row-v3";r.innerHTML=`<div class="food-row-title-v3"><span>${nome(tipo)}</span><span>${itens.length?"toque para adicionar":"sem itens"}</span></div>`;const w=document.createElement("div");w.className="food-chip-wrap-v3";itens.forEach(i=>{const b=document.createElement("button");b.type="button";b.className="food-chip-v3";b.textContent=i;b.addEventListener("click",()=>click(i));w.appendChild(b);});r.appendChild(w);return r;
  }

  function renderPainel(modo,manter) {
    const p=$("foodPanelV3");if(!p)return;if(!manter&&p.classList.contains("open")&&p.dataset.mode===modo){p.classList.remove("open");return;}p.classList.add("open");p.dataset.mode=modo;p.innerHTML="";
    if(modo==="recent"){const r=recentes();tipos.forEach(t=>p.appendChild(linhaChips(t,r[t],i=>aplicarItem(t,i))));return;}
    const f=favoritos();let total=0;tipos.forEach(t=>{const grupos=f[t]||[];total+=grupos.length;const row=document.createElement("div");row.className="food-row-v3";row.innerHTML=`<div class="food-row-title-v3"><span>${nome(t)}</span><span>${grupos.length} favorito(s)</span></div>`;const w=document.createElement("div");w.className="food-chip-wrap-v3";grupos.forEach((g,idx)=>{const b=document.createElement("button");b.type="button";b.className="food-chip-v3";b.textContent=`${idx+1}. ${(g.itens||[]).slice(0,3).join(", ")}${(g.itens||[]).length>3?"…":""}`;b.addEventListener("click",()=>aplicarGrupo(t,g.itens||[]));w.appendChild(b);});row.appendChild(w);p.appendChild(row);});
    if(!total)p.innerHTML='<div style="color:var(--text-muted);font-size:11px;text-align:center;padding:8px 0">Favorite uma refeição usando a estrela de cada card.</div>';
  }

  function copiarOntem() {
    const input=$("dataAlimentacaoInput"), atual=input&&input.value?input.value:new Date().toISOString().slice(0,10), d=new Date(`${atual}T12:00:00`);d.setDate(d.getDate()-1);const ontem=isoLocal(d), h=parse(localStorage.getItem("historicoAlimentacao")||"{}",{}), ant=h[ontem];
    if(!ant){toast("Não encontrei diário salvo no dia anterior.");return;}const hoje=h[atual]||{};h[atual]={...hoje,cafe:Array.isArray(ant.cafe)?ant.cafe.slice():[],almoco:Array.isArray(ant.almoco)?ant.almoco.slice():[],jantar:Array.isArray(ant.jantar)?ant.jantar.slice():[],agua:Number(hoje.agua)||0,kcal:null,assinaturaKcal:null};localStorage.setItem("historicoAlimentacao",JSON.stringify(h));if(typeof window.carregarRefeicoesDoDia==="function")window.carregarRefeicoesDoDia();toast("Refeições de ontem copiadas. Revise e salve o diário.");
  }

  function montar() {
    const aba=$("aba-alimentacao");if(!aba||$("foodToolsV3"))return;const agua=aba.querySelector(".card-water");if(!agua)return;
    const card=document.createElement("section");card.id="foodToolsV3";card.className="food-tools-v3";card.innerHTML='<div class="food-tools-head-v3"><strong>Atalhos do diário</strong><small>Menos toques para registrar suas refeições</small></div><div class="food-tools-actions-v3"><button type="button" id="btnCopyYesterdayV3" class="food-tool-btn-v3"><i class="bi bi-copy"></i>Copiar ontem</button><button type="button" data-food-panel="recent" class="food-tool-btn-v3"><i class="bi bi-clock-history"></i>Recentes</button><button type="button" data-food-panel="favorites" class="food-tool-btn-v3"><i class="bi bi-star"></i>Favoritos</button></div><div id="foodPanelV3" class="food-tool-panel-v3"></div>';agua.insertAdjacentElement("afterend",card);$("btnCopyYesterdayV3").addEventListener("click",copiarOntem);card.querySelectorAll("[data-food-panel]").forEach(b=>b.addEventListener("click",()=>renderPainel(b.dataset.foodPanel)));
    tipos.forEach(tipo=>{const tags=$(`tags-${tipo}`), meal=tags&&tags.closest(".meal-card");if(!meal)return;const line=document.createElement("div");line.className="food-favorite-action-v3";line.innerHTML=`<button type="button"><i class="bi bi-star"></i> Salvar como favorito</button>`;const title=meal.querySelector(".meal-title-row");if(title)title.insertAdjacentElement("afterend",line);line.querySelector("button").addEventListener("click",()=>salvarFavorito(tipo));});
  }

  function iniciar(){estilos();montar();}
  document.addEventListener("DOMContentLoaded",iniciar);if(document.readyState!=="loading")setTimeout(iniciar,0);
})();
