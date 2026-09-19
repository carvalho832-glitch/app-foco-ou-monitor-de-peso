/* Backup JSON nativo para o APK Android (Capacitor).
   No navegador, o handler original do firebase-cloud.js continua sendo usado. */
(function () {
  function definirStatus(mensagem, tipo) {
    const status = document.getElementById("cloudStatusEvoluaFit");
    if (!status) return;
    status.innerText = mensagem;
    status.className = `cloud-status-evoluafit ${tipo || ""}`.trim();
  }

  function montarBackup() {
    const chaves = (window.EvoluaFitFirebase && window.EvoluaFitFirebase.chaves) || [];
    const dados = {};

    chaves.forEach((chave) => {
      const valor = localStorage.getItem(chave);
      if (valor !== null) dados[chave] = valor;
    });

    return {
      app: "EvoluaFit I.A.",
      exportadoEm: new Date().toISOString(),
      dados
    };
  }

  async function exportarBackupAndroid() {
    const capacitor = window.Capacitor;
    const plugins = capacitor && capacitor.Plugins;
    const Filesystem = plugins && plugins.Filesystem;
    const Share = plugins && plugins.Share;

    if (!Filesystem || !Share) {
      throw new Error("recursos nativos de arquivo/compartilhamento não carregados");
    }

    const nomeArquivo = `evoluafit-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const conteudo = JSON.stringify(montarBackup(), null, 2);

    definirStatus("Preparando seu Backup JSON...", "");

    const salvo = await Filesystem.writeFile({
      path: nomeArquivo,
      data: conteudo,
      directory: "CACHE",
      encoding: "utf8"
    });

    let uri = salvo && salvo.uri;
    if (!uri) {
      const resultadoUri = await Filesystem.getUri({
        path: nomeArquivo,
        directory: "CACHE"
      });
      uri = resultadoUri && resultadoUri.uri;
    }

    if (!uri) throw new Error("não foi possível localizar o arquivo criado");

    await Share.share({
      title: "Backup EvoluaFit",
      text: "Backup dos seus dados do EvoluaFit.",
      files: [uri],
      dialogTitle: "Salvar ou compartilhar Backup JSON"
    });

    definirStatus("Backup JSON criado. Escolha onde deseja salvar ou compartilhar o arquivo.", "ok");
  }

  document.addEventListener(
    "click",
    async function (event) {
      const alvo = event.target && event.target.closest
        ? event.target.closest("#btnCloudBackupEvoluaFit")
        : null;

      if (!alvo) return;

      const capacitor = window.Capacitor;
      const nativo = !!(capacitor && typeof capacitor.isNativePlatform === "function" && capacitor.isNativePlatform());
      if (!nativo) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      try {
        await exportarBackupAndroid();
      } catch (erro) {
        console.error("Backup JSON Android:", erro);
        definirStatus(`Não consegui criar o Backup JSON: ${(erro && erro.message) || "erro desconhecido"}.`, "erro");
      }
    },
    true
  );
})();
