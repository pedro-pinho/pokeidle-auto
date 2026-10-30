(() => {
  'use strict';

  // Escolhida depois de colar o script; alterável com pokeIdleRaros.potencia().
  let potenciaDesejada = null;
  const INTERVALO = 1500;
  const CONSULTA_CAPTURAS = 10000;
  const ESTABILIZACAO = 2000;
  const LIMITE_JANELA = 30000;

  // Dois scripts navegando ao mesmo tempo disputariam o mapa.
  window.pokeIdleAuto?.stop();
  window.pokeIdleRaros?.stop();

  const $ = seletor => document.querySelector(seletor);
  const normalizar = texto => String(texto ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
  const texto = el => el?.textContent?.trim().replace(/\s+/g, ' ') || '';
  const nomeRota = el => texto(el?.querySelector('b.ml-nome'));
  const visivel = el => !!el?.isConnected && el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== 'hidden' && !el.closest('[hidden], [aria-hidden="true"]');
  const mapaAberto = () => visivel($('#ml-corpo'));
  const capturasAbertas = () => visivel($('ul.capturas-linhas'));
  const linhas = () => [...document.querySelectorAll('#ml-corpo .ml-linha')];
  const regioes = () => [...document.querySelectorAll('#f-regiao .mapa-area.mapa-reg-bt')];
  const indiceRegiao = () => regioes().findIndex(el => el.classList.contains('on'));
  const travado = el => el.classList.contains('travada') ||
    el.classList.contains('mapa-area-travada') || !!el.disabled ||
    el.getAttribute('aria-disabled') === 'true';

  let timer, gesto = null, atual = null, destino = null, trocaRegiao = null;
  let fase = 'mapa', desde = Date.now(), ultimoAviso = '', proximaConsulta = 0;
  let pausado = false, parado = false, aguardandoJogador = false;
  // Guarda a maior potência observada por rota para reavaliar mudanças do mínimo.
  const capturadas = new Map();
  const atende = rota => (capturadas.get(chave(rota)) ?? 0) >= potenciaDesejada;
  const chave = rota => JSON.stringify([rota.regiao, rota.indice, normalizar(rota.nome)]);
  function aviso(mensagem) {
    if (mensagem !== ultimoAviso) console.log('[PokeIdle Raros]', mensagem);
    ultimoAviso = mensagem;
  }
  function mudar(novaFase) { fase = novaFase; desde = Date.now(); }
  function pausarErro(mensagem) {
    pausado = true;
    aviso(`${mensagem} Confira a tela e use pokeIdleRaros.resume().`);
  }
  function clicar(el) {
    if (!el || el.disabled || !visivel(el)) return false;
    gesto = null;
    el.click();
    return true;
  }
  function abrirMapa() {
    return clicar([...document.querySelectorAll('[data-modal="mapa"]')].find(visivel));
  }
  function alternarCapturas() { return clicar($('button#cena-capturas')); }
  function aguardarJogador() {
    aguardandoJogador = true;
    destino = null;
    trocaRegiao = null;
    mudar('mapa');
    aviso('Aguardando você abrir o mapa para retomar.');
  }
  function conferirGesto() {
    if (!gesto) return;
    if ((gesto.mapa && !mapaAberto()) || (gesto.capturas && !capturasAbertas())) {
      gesto = null;
      aguardarJogador();
    }
  }
  function interacao(evento) {
    if (!evento.isTrusted || (evento.type === 'keydown' && evento.key !== 'Escape')) return;
    gesto = { mapa: mapaAberto(), capturas: capturasAbertas() };
    // O jogador pode cancelar inclusive a reabertura após uma viagem.
    if (!gesto.mapa && !gesto.capturas) aguardarJogador();
    setTimeout(() => { if (!parado) conferirGesto(); }, 0);
  }
  document.addEventListener('click', interacao, true);
  document.addEventListener('keydown', interacao, true);

  function maiorPotencia(lista, pokemon) {
    let maior = 0;
    for (const li of lista.querySelectorAll('li')) {
      if (normalizar(li.querySelector('b.cap-nome')?.textContent) !== normalizar(pokemon)) continue;
      for (let p = 5; p > maior; p--) {
        if (li.querySelector(`span.cap-selos span.pk-selos.compacto span.p${p}`)) {
          maior = p;
          break;
        }
      }
    }
    return maior;
  }
  function definirPotencia(valor) {
    if (parado) { aviso('Cole o script novamente para reiniciar.'); return false; }
    if (valor === undefined) {
      valor = window.prompt('Qual a potência mínima desejada? Digite de 1 a 5.\nExemplo: 4 aceita P4 e P5.',
        String(potenciaDesejada ?? 4));
      // O prompt bloqueia o navegador; esse tempo não deve causar um timeout.
      desde = Date.now();
      if (valor === null) {
        aviso(potenciaDesejada === null
          ? 'Escolha uma potência com pokeIdleRaros.potencia() para iniciar.'
          : `Escolha cancelada. Mantido o mínimo P${potenciaDesejada}.`);
        return false;
      }
    }
    const numero = (typeof valor === 'number' || typeof valor === 'string') ? Number(valor) : NaN;
    if (!Number.isInteger(numero) || numero < 1 || numero > 5) {
      aviso('Potência inválida. Use pokeIdleRaros.potencia(4), com um inteiro de 1 a 5.');
      return false;
    }
    potenciaDesejada = numero;
    proximaConsulta = 0;
    // Se o combate ou o nível ainda impede a viagem, reavalie a rota de origem.
    // Uma viagem já aceita ou uma troca de região em curso não é desfeita.
    if (fase === 'viajar' && atual && mapaAberto()) {
      const rota = rotaNaTela();
      if (rota && chave(rota) === chave(atual) && !atende(atual)) {
        destino = null;
        mudar('mapa');
      }
    }
    aviso(`Potência mínima definida: P${potenciaDesejada}. Potências superiores também valem.`);
    return true;
  }
  function rotaNaTela() {
    const itens = linhas();
    const indice = itens.findIndex(el => el.classList.contains('on'));
    const regiao = indiceRegiao();
    const nome = nomeRota(itens[indice]);
    return indice >= 0 && regiao >= 0 && nome ? { indice, regiao, nome } : null;
  }
  function adotar(rota) {
    if (atual && (rota.regiao < atual.regiao ||
        (rota.regiao === atual.regiao && rota.indice < atual.indice))) {
      pausarErro('A rota selecionada fica antes do progresso desta execução. Volte ao último destino ou reinicie o script.');
      return false;
    }
    atual = rota;
    destino = null;
    proximaConsulta = 0;
    mudar('mapa');
    aviso(`Buscando ${atual.nome} P${potenciaDesejada} ou superior.`);
    return true;
  }
  function tentarDestino() {
    if (indiceRegiao() !== destino.regiao) {
      pausarErro('A região do mapa mudou durante a viagem.');
      return;
    }
    const alvo = linhas()[destino.indice];
    if (!alvo || normalizar(nomeRota(alvo)) !== normalizar(destino.nome)) {
      pausarErro('A ordem ou o nome das rotas mudou durante a viagem.');
      return;
    }
    if (alvo.classList.contains('on')) { adotar(destino); return; }
    if (travado(alvo)) {
      aviso(`Aguardando desbloqueio da rota: ${destino.nome}.`);
      return;
    }
    aviso(`Tentando viajar para ${destino.nome}; repetirei se houver combate.`);
    clicar(alvo);
  }
  function avancar() {
    const itens = linhas();
    // Índice seguinte, sem filtrar capturado nem retornar ao início da lista.
    const indice = atual.indice + 1;
    if (itens[indice]) {
      const nome = nomeRota(itens[indice]);
      if (!nome) { pausarErro('A próxima rota não tem b.ml-nome.'); return; }
      destino = { indice, nome, regiao: atual.regiao };
      mudar('viajar');
      tentarDestino();
      return;
    }
    const regioesMapa = regioes();
    const proxima = regioesMapa[atual.regiao + 1];
    if (!proxima) {
      aviso('Última rota concluída na potência desejada. Busca encerrada.');
      api.stop();
      return;
    }
    if (travado(proxima)) {
      aviso(`Aguardando desbloqueio da região: ${texto(proxima)}.`);
      return;
    }
    const corpo = $('#ml-corpo');
    trocaRegiao = {
      indice: atual.regiao + 1, corpo, html: corpo.innerHTML,
      ultimoHTML: corpo.innerHTML, mudou: false, estavelDesde: Date.now()
    };
    mudar('regiao');
    clicar(proxima);
  }

  function passo() {
    conferirGesto();
    if (aguardandoJogador) {
      if (!mapaAberto() || capturasAbertas()) return;
      aguardandoJogador = false;
      gesto = null;
      aviso('Mapa aberto. Retomando a busca.');
    }
    if (['abrirCapturas', 'lerCapturas', 'fecharCapturas', 'retornarMapa', 'confirmarViagem', 'regiao'].includes(fase) &&
        Date.now() - desde > LIMITE_JANELA) {
      pausarErro(`Não consegui confirmar a etapa "${fase}" em 30 segundos.`);
      return;
    }

    if (fase === 'abrirCapturas') {
      if (!capturasAbertas()) return;
      mudar('lerCapturas');
      return;
    }
    if (fase === 'lerCapturas') {
      if (!capturasAbertas()) { aguardarJogador(); return; }
      if (Date.now() - desde < ESTABILIZACAO) return;
      const maior = maiorPotencia($('ul.capturas-linhas'), atual.nome);
      capturadas.set(chave(atual), Math.max(capturadas.get(chave(atual)) ?? 0, maior));
      if (atende(atual)) {
        aviso(`Encontrado: ${atual.nome} P${capturadas.get(chave(atual))}! Mínimo: P${potenciaDesejada}.`);
      } else aviso(`Aguardando ${atual.nome} P${potenciaDesejada} ou superior nas capturas recentes.`);
      mudar('fecharCapturas');
      alternarCapturas();
      return;
    }
    if (fase === 'fecharCapturas') {
      if (capturasAbertas()) return;
      proximaConsulta = Date.now() + CONSULTA_CAPTURAS;
      mudar('retornarMapa');
      if (!mapaAberto()) abrirMapa();
      return;
    }
    if (fase === 'retornarMapa') {
      if (!mapaAberto()) { abrirMapa(); return; }
      mudar('mapa');
    }
    if (fase === 'viajar') {
      if (!mapaAberto()) {
        mudar('confirmarViagem');
        abrirMapa();
        return;
      }
      tentarDestino();
      return;
    }
    if (fase === 'confirmarViagem') {
      if (!mapaAberto()) { abrirMapa(); return; }
      const rota = rotaNaTela();
      if (!rota) return;
      if (chave(rota) === chave(destino)) { adotar(rota); return; }
      // O fechamento por si só não permite assumir a chegada ao destino.
      if (atual && chave(rota) === chave(atual)) {
        mudar('viajar');
        tentarDestino();
        return;
      }
      pausarErro('A rota ativa não corresponde ao destino esperado.');
      return;
    }
    if (fase === 'regiao') {
      if (!mapaAberto()) { aguardarJogador(); return; }
      const corpo = $('#ml-corpo');
      const html = corpo.innerHTML;
      if (corpo !== trocaRegiao.corpo || html !== trocaRegiao.html) trocaRegiao.mudou = true;
      if (html !== trocaRegiao.ultimoHTML) {
        trocaRegiao.ultimoHTML = html;
        trocaRegiao.estavelDesde = Date.now();
      }
      if (!trocaRegiao.mudou || indiceRegiao() !== trocaRegiao.indice ||
          Date.now() - trocaRegiao.estavelDesde < ESTABILIZACAO || !linhas().length) return;
      const nome = nomeRota(linhas()[0]);
      if (!nome) { pausarErro('A primeira rota da nova região não tem b.ml-nome.'); return; }
      destino = { indice: 0, nome, regiao: trocaRegiao.indice };
      trocaRegiao = null;
      mudar('viajar');
      tentarDestino();
      return;
    }

    if (!mapaAberto()) { aguardarJogador(); return; }
    // Uma janela de capturas aberta manualmente não é fechada pelo script.
    if (capturasAbertas()) return;
    const rota = rotaNaTela();
    if (!rota) { aviso('Aguardando a rota ativa (.ml-linha.on) na região atual.'); return; }
    if (!atual || chave(rota) !== chave(atual)) {
      if (!adotar(rota)) return;
    }
    if (atende(atual)) { avancar(); return; }
    if (Date.now() < proximaConsulta) return;
    if (alternarCapturas()) mudar('abrirCapturas');
    else aviso('Aguardando o botão button#cena-capturas ficar disponível.');
  }

  const api = window.pokeIdleRaros = {
    potencia: definirPotencia,
    pause() { pausado = true; aviso('Pausado.'); },
    resume() {
      if (parado) { aviso('Cole o script novamente para reiniciar.'); return; }
      pausado = false;
      aguardarJogador();
    },
    stop() {
      parado = true;
      clearTimeout(timer);
      document.removeEventListener('click', interacao, true);
      document.removeEventListener('keydown', interacao, true);
      console.log('[PokeIdle Raros] Parado.');
    },
    status() {
      return { parado, pausado, aguardandoJogador, fase, potencia: potenciaDesejada,
        pokemon: atual?.nome, destino: destino?.nome,
        rotasConcluidas: potenciaDesejada === null ? 0 :
          [...capturadas.values()].filter(p => p >= potenciaDesejada).length };
    }
  };
  function ciclo() {
    if (parado) return;
    if (!pausado && potenciaDesejada !== null) {
      try { passo(); }
      catch (erro) { console.error('[PokeIdle Raros]', erro); pausarErro('Ocorreu um erro.'); }
    }
    if (!parado) timer = setTimeout(ciclo, INTERVALO);
  }
  aviso('Escolha a potência mínima. Depois, abra o mapa na rota inicial. Altere a qualquer momento com pokeIdleRaros.potencia().');
  definirPotencia();
  ciclo();
})();
