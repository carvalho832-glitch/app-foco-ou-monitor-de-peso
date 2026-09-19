/* Espelha metas semanais dentro de usuarioPerfil para entrar no backup Firebase. */
(function(){
  if(window.__evoluaGoalsSyncLoaded)return;window.__evoluaGoalsSyncLoaded=true;
  const KEY="evoluafitMetasSemanais";
  let ultimo="";
  function ler(chave,padrao){try{return JSON.parse(localStorage.getItem(chave)||JSON.stringify(padrao))}catch(_){return padrao}}
  function sincronizar(){
    const metas=ler(KEY,null);
    const perfil=ler("usuarioPerfil",{})||{};
    const perfilMetas=perfil.evoluaMetasSemanais||null;
    if(metas){
      const atual=JSON.stringify(metas);
      const remoto=JSON.stringify(perfilMetas||{});
      if(atual!==remoto){perfil.evoluaMetasSemanais=metas;localStorage.setItem("usuarioPerfil",JSON.stringify(perfil));ultimo=atual}
      else ultimo=atual;
      return;
    }
    if(perfilMetas){localStorage.setItem(KEY,JSON.stringify(perfilMetas));ultimo=JSON.stringify(perfilMetas)}
  }
  document.addEventListener("DOMContentLoaded",sincronizar);
  if(document.readyState!=="loading")setTimeout(sincronizar,0);
  setInterval(sincronizar,2200);
})();
