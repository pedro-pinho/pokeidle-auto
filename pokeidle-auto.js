(() => {
  'use strict';

  // Cole no console da aba do jogo. Executar novamente substitui a cópia anterior.
  window.pokeIdleAuto?.stop();

  const INTERVALO = 1500;
  const ESTABILIZACAO = 2000;
  const LIMITE_REGIAO = 30000;
  let timer;
  let pausado = false;
  let parado = false;
  let pendente = null;
  let regiaoPendente = null;
  let escolherNaRegiao = false;
  let ultimoAviso = '';
  let aguardandoMapaManual = false;
  let reabrirAposViagem = false;
  let ultimaAcaoHumana = false;

  const lista = () => document.querySelector('#ml-corpo');
  const visivel = el => !!el?.isConnected && el.getClientRects().length > 0 &&
    getComputedStyle(el).visibility !== 'hidden' &&
    !el.closest('[hidden], [aria-hidden="true"]');
  const nome = el => el?.textContent?.trim().replace(/\s+/g, ' ') || '(sem nome)';
  const regioes = () => [...document.querySelectorAll('#f-regiao .mapa-area.mapa-reg-bt')];
  // Áreas bloqueadas podem ser divs em vez de buttons: preserve a ordem da lista.
  const destinos = 'button.ml-linha:not(.capturado), .ml-linha.travada:not(.capturado)';
  const areaBloqueada = el => el.classList.contains('travada') || el.disabled ||
    el.getAttribute('aria-disabled') === 'true';
  const aviso = mensagem => {
    if (mensagem !== ultimoAviso) console.log('[PokeIdle Auto]', mensagem);
    ultimoAviso = mensagem;
  };
  const bloquear = mensagem => {
    pausado = true;
    aviso(`${mensagem} Automação pausada; use pokeIdleAuto.resume() para retomar.`);
  };
  const abrirMapa = () => {
    const botao = [...document.querySelectorAll('[data-modal="mapa"]')].find(visivel);
    if (botao && !botao.disabled) botao.click();
    else aviso('Aguardando o botão do mapa ficar disponível.');
  };

  function aguardarJogador() {
    aguardandoMapaManual = true;
    reabrirAposViagem = false;
    pendente = null;
    regiaoPendente = null;
    escolherNaRegiao = false;
    aviso('Mapa fechado pelo jogador. Aguardando você abrir o mapa novamente.');
  }

  // isTrusted distingue os cliques reais dos cliques feitos por este script.
  function interacao(evento) {
    if (!evento.isTrusted || (evento.type === 'keydown' && evento.key !== 'Escape')) return;
    ultimaAcaoHumana = true;
    const estavaAberto = visivel(lista());
    if (!estavaAberto && reabrirAposViagem) aguardarJogador();
    // Executa depois dos handlers do jogo, inclusive ao fechar com Escape ou pelo fundo.
    setTimeout(() => {
      if (!parado && estavaAberto && !visivel(lista()) && ultimaAcaoHumana) aguardarJogador();
    }, 0);
  }
  document.addEventListener('click', interacao, true);
  document.addEventListener('keydown', interacao, true);

  function clicarRota(alvo) {
    ultimaAcaoHumana = false;
    alvo.click();
  }

  function passo() {
    const corpo = lista();
    const aberto = visivel(corpo);

    if (!aberto && ultimaAcaoHumana) aguardarJogador();
    if (aguardandoMapaManual) {
      if (!aberto) return;
      aguardandoMapaManual = false;
      ultimaAcaoHumana = false;
      aviso('Mapa aberto. Automação retomada.');
    }
    if (reabrirAposViagem) {
      if (!aberto) { abrirMapa(); return; }
      reabrirAposViagem = false;
    }

    // O fechamento após o clique é a confirmação de viagem informada pelo jogo.
    if (pendente) {
      if (!aberto) {
        aviso(`Viagem aceita: ${pendente.nome}. Reabrindo o mapa.`);
        pendente = null;
        escolherNaRegiao = false;
        reabrirAposViagem = true;
        abrirMapa();
        return;
      }
      // Se o DOM foi recriado, procura o mesmo destino na lista atual.
      const alvo = [...corpo.querySelectorAll(destinos)]
        .find(el => nome(el) === pendente.nome);
      if (!alvo) {
        pendente = null;
        return;
      }
      // Uma seleção ativa também evita clicar de novo caso o mapa tenha reaberto.
      if (alvo.classList.contains('on')) {
        pendente = null;
        escolherNaRegiao = false;
        return;
      }
      if (areaBloqueada(alvo)) {
        aviso(`Aguardando desbloqueio da rota: ${nome(alvo)}.`);
        return;
      }
      if (visivel(alvo)) clicarRota(alvo);
      return;
    }

    if (!aberto) {
      aguardarJogador();
      return;
    }

    if (regiaoPendente) {
      const estado = regiaoPendente;
      if (Date.now() - estado.inicio > LIMITE_REGIAO) {
        regiaoPendente = null;
        bloquear('Não consegui confirmar o carregamento da nova região. Confira o mapa.');
        return;
      }
      const atual = regioes().find(el => el.classList.contains('on'));
      const html = corpo.innerHTML;
      if (corpo !== estado.corpo || html !== estado.html) estado.mudou = true;
      if (html !== estado.ultimoHTML) {
        estado.ultimoHTML = html;
        estado.estavelDesde = Date.now();
      }
      if (!estado.mudou || nome(atual) !== estado.nome ||
          Date.now() - estado.estavelDesde < ESTABILIZACAO ||
          !corpo.querySelector('.ml-linha')) return;
      regiaoPendente = null;
      escolherNaRegiao = true;
      aviso(`Região carregada: ${estado.nome}.`);
    }

    const linhas = [...corpo.querySelectorAll('.ml-linha')];
    if (!linhas.length) return; // Lista vazia pode estar carregando.
    const atual = corpo.querySelector('.ml-linha.on');
    if (!escolherNaRegiao) {
      if (!atual) {
        aviso('Aguardando a rota atual aparecer no mapa.');
        return;
      }
      if (!atual.classList.contains('capturado')) {
        aviso(`Aguardando captura: ${nome(atual)}.`);
        return;
      }
    }

    const proximo = corpo.querySelector(destinos);
    if (proximo) {
      if (areaBloqueada(proximo)) {
        aviso(`Aguardando desbloqueio da rota: ${nome(proximo)}.`);
        return;
      }
      if (!visivel(proximo)) {
        aviso(`Aguardando a rota ficar disponível: ${nome(proximo)}.`);
        return;
      }
      pendente = { nome: nome(proximo) };
      aviso(`Tentando viajar para ${pendente.nome}; repetirei enquanto houver combate.`);
      clicarRota(proximo);
      return;
    }

    const botoes = regioes();
    const indice = botoes.findIndex(el => el.classList.contains('on'));
    if (indice < 0) return;
    const seguinte = botoes[indice + 1];
    if (!seguinte) {
      aviso('Não há mais rotas pendentes nem próxima região. Automação encerrada.');
      api.stop();
      return;
    }
    if (seguinte.classList.contains('mapa-area-travada') ||
        seguinte.disabled || seguinte.getAttribute('aria-disabled') === 'true') {
      aviso(`Aguardando desbloqueio da região: ${nome(seguinte)}.`);
      return;
    }
    regiaoPendente = {
      nome: nome(seguinte), corpo, html: corpo.innerHTML,
      ultimoHTML: corpo.innerHTML, mudou: false,
      inicio: Date.now(), estavelDesde: Date.now()
    };
    aviso(`Abrindo a próxima região: ${nome(seguinte)}.`);
    ultimaAcaoHumana = false;
    seguinte.click();
  }

  const api = window.pokeIdleAuto = {
    pause() { pausado = true; aviso('Pausado.'); },
    resume() {
      if (parado) return console.log('Cole o script novamente para reiniciar.');
      pausado = false;
      aviso('Retomado.');
    },
    stop() {
      parado = true;
      clearTimeout(timer);
      document.removeEventListener('click', interacao, true);
      document.removeEventListener('keydown', interacao, true);
      console.log('[PokeIdle Auto] Parado.');
    },
    status() { return { parado, pausado, aguardandoMapaManual, destino: pendente?.nome, regiao: regiaoPendente?.nome }; }
  };
  function ciclo() {
    if (parado) return;
    if (!pausado) {
      try { passo(); }
      catch (erro) { console.error('[PokeIdle Auto]', erro); bloquear('Ocorreu um erro.'); }
    }
    if (!parado) timer = setTimeout(ciclo, INTERVALO);
  }
  aviso('Iniciado. Deixe o jogo aberto; acompanhe as mensagens neste console.');
  ciclo();
})();
