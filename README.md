# PokeIdle Auto

Script JavaScript para avançar automaticamente pelas rotas e regiões do [PokeIdle](https://pokeidle.io) conforme os Pokémon são capturados.

O script complementa as automações do jogo: ele cuida da escolha do próximo destino, enquanto o jogo continua responsável por andar, combater e tentar capturas.

## Requisitos

- Jogar pelo navegador no computador.
- Manter a aba do jogo aberta e a sessão conectada.
- Ter as automações de combate e captura do jogo ativas, como as disponíveis no VIP.
- Ter o arquivo `pokeidle-auto.js` disponível.

## Como usar

1. Entre no jogo e vá até a rota em que deseja começar.
2. Abra o mapa e deixe a lista de rotas visível.
3. Abra as ferramentas de desenvolvedor do navegador com **F12** e selecione **Console**.
4. Copie todo o conteúdo de [`pokeidle-auto.js`](./pokeidle-auto.js), cole no console e pressione **Enter**.
5. Acompanhe as mensagens com o prefixo `[PokeIdle Auto]` no console.

O script começa imediatamente. Por exemplo, se você estiver caçando um Ekans, ele aguardará a rota atual ser marcada como capturada antes de escolher outro destino.

Recarregar ou fechar a página encerra a execução. Para iniciar novamente, cole o script outra vez. Colá-lo enquanto já está rodando encerra a instância anterior e inicia uma nova.

## Funcionamento

1. Verifica se o mapa está aberto. Se você o fechar manualmente, aguarda até você abri-lo novamente e retoma automaticamente.
2. Aguarda a rota atual receber a classe `capturado`.
3. Procura o primeiro destino pendente na ordem da lista, incluindo áreas bloqueadas com a classe `travada`. Se estiver bloqueado, aguarda sua liberação sem clicar nem pular para outro destino.
4. Tenta clicar nesse destino a cada **1,5 segundo**. Se o combate impedir a viagem, continua tentando.
5. Usa o fechamento do mapa após o clique como confirmação de que a viagem foi aceita. Também reconhece quando o destino passa a ser a rota ativa.
6. Reabre o mapa após a viagem automática e aguarda a captura na nova rota.
7. Quando não há destinos pendentes, seleciona a próxima região e aguarda sua lista carregar antes de continuar.
8. Encerra quando a lista não tem destinos pendentes e não existe uma próxima região.

A escolha segue a ordem do mapa, sem otimização por nível, dificuldade ou espécie. A captura é identificada pela classe da rota; o script não consulta diretamente o inventário ou a Pokédex.

Áreas com a classe `travada` e regiões com a classe `mapa-area-travada` são verificadas novamente a cada **1,5 segundo**, sem prazo máximo de espera. O jogador continua na rota onde está, ganhando experiência pelas automações do jogo. Quando o mapa refletir o desbloqueio, o script continua automaticamente, sem precisar executar `resume()`. Controles desabilitados também são aguardados.

## Comandos

Execute os comandos no console da mesma aba:

| Comando | Ação |
| --- | --- |
| `pokeIdleAuto.pause()` | Pausa a automação de navegação. |
| `pokeIdleAuto.resume()` | Retoma uma execução pausada. |
| `pokeIdleAuto.stop()` | Encerra a execução. Para reiniciar, cole o script novamente. |
| `pokeIdleAuto.status()` | Mostra se está parado ou pausado e os destinos pendentes. |

Pausar ou parar o script não desativa as automações nativas do jogo.

## Usar outras telas durante a automação

Você pode fechar o mapa para acessar outras partes do jogo. O script identifica cliques reais e a tecla Escape, aguarda enquanto o mapa estiver fechado e retoma quando você abrir o mapa novamente. Se iniciar o script com o mapa fechado, ele também aguardará sua abertura manual.

O fechamento causado por uma tentativa de viagem do script continua provocando a reabertura automática do mapa. Ao fechar manualmente, as tentativas pendentes são descartadas; na volta, o script lê novamente a rota e a região selecionadas. Uma pausa explícita com `pause()` continua exigindo `resume()`.

A distinção usa os eventos de interação do navegador e a visibilidade do mapa. Alterações na forma como o jogo fecha o mapa podem exigir ajustes.

## Configuração

Os tempos podem ser alterados nas constantes no início do arquivo. Os valores são em milissegundos:

```js
const INTERVALO = 1500;
const ESTABILIZACAO = 2000;
const LIMITE_REGIAO = 30000;
```

| Constante | Finalidade |
| --- | --- |
| `INTERVALO` | Intervalo entre verificações e novas tentativas de clique. |
| `ESTABILIZACAO` | Tempo mínimo sem alterações no conteúdo da lista ao carregar uma região. |
| `LIMITE_REGIAO` | Prazo para confirmar o carregamento de uma nova região antes de pausar. |

## Seletores usados

Se a interface do jogo mudar, estes seletores e classes podem precisar de ajustes:

| Seletor | Finalidade |
| --- | --- |
| `#ml-corpo` | Lista de rotas do mapa. |
| `.ml-linha.on` | Rota ativa na lista. |
| `.capturado` | Indica que a captura da rota foi concluída. |
| `button.ml-linha:not(.capturado)` | Destinos que ainda precisam de captura. |
| `.ml-linha.travada:not(.capturado)` | Áreas pendentes bloqueadas por nível, inclusive quando são divs. |
| `[data-modal="mapa"]` | Controle que abre o mapa. |
| `#f-regiao .mapa-area.mapa-reg-bt` | Regiões, na ordem de navegação. |
| `.on` nos controles de região | Região selecionada. |
| `.mapa-area-travada` | Região bloqueada por nível. |

## Solução de problemas

- **Aguardando captura:** confira se a captura automática está ativa. O script aguarda a marcação `capturado` da rota atual.
- **Tentando viajar repetidamente:** o combate pode estar impedindo a mudança. O script continuará tentando no intervalo configurado.
- **Rota indisponível:** o script aguarda o primeiro destino pendente ficar visível e habilitado; ele não pula esse destino.
- **Nova região não carregou:** o script pausa se não conseguir confirmar a troca em 30 segundos. Confira o mapa e use `pokeIdleAuto.resume()`.
- **Área ou próxima região bloqueada:** o script aguarda o desbloqueio indicado no mapa e continua automaticamente. Não é necessário retomar manualmente.
- **Rota atual não aparece:** verifique se o mapa está na região da sua caçada atual.
- **Execução lenta em segundo plano:** navegadores podem reduzir a frequência dos temporizadores de abas inativas.

## Limitações

- Depende da estrutura da interface e dos seletores descritos acima.
- Não captura Pokémon, escolhe Pokébolas, gerencia recursos ou altera as configurações do VIP.
- Não mantém a execução após recarregar a página e não funciona com o jogo fechado.
- Ao chegar à última região, encerra sem retornar às regiões anteriores.
- É um script independente, sem vínculo oficial com o PokeIdle.
