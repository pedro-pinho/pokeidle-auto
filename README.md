# PokeIdle Auto

Dois scripts JavaScript para automatizar a escolha de rotas no [PokeIdle](https://pokeidle.io). Eles complementam as automações do jogo, que continuam responsáveis por andar, combater e tentar capturas.

## Qual script usar?

| Objetivo | Arquivo | Quando avança |
| --- | --- | --- |
| Completar a Pokédex | [pokeidle-auto.js](./pokeidle-auto.js) | Quando a rota atual recebe a marcação de captura concluída. |
| Buscar Pokémon de maior potência | [pokeidle-raros.js](./pokeidle-raros.js) | Quando o Pokémon aparece nas capturas recentes com potência igual ou superior ao mínimo escolhido. |

- [Completar a Pokédex](#completar-a-pokedex)
- [Buscar por potência mínima](#buscar-por-potencia-minima)

## Arquivos do repositório

Coloque estes três arquivos na mesma pasta:

```text
README.md
pokeidle-auto.js
pokeidle-raros.js
```

## Requisitos e execução

- Jogar pelo navegador no computador, mantendo a aba aberta e a sessão conectada.
- Ter as automações de combate e captura do jogo ativas, como as disponíveis no VIP.
- Copiar o conteúdo do script escolhido e executar no console da mesma aba do jogo.

Não é necessário instalar bibliotecas ou extensões. Execute apenas um script de navegação por vez.

Ao iniciar, o script de potência encerra uma instância anterior dele mesmo e também o script da Pokédex, se estiver rodando. Para voltar ao modo Pokédex, execute `pokeIdleRaros.stop()` antes de colar o outro script.

Colar novamente um script substitui a instância anterior desse mesmo script. Recarregar ou fechar a página encerra a execução. Os scripts não desativam as automações nativas do jogo quando são pausados ou encerrados.

<a id="completar-a-pokedex"></a>
## Completar a Pokédex

Use [pokeidle-auto.js](./pokeidle-auto.js) para percorrer as rotas ainda não marcadas como capturadas. Este modo procura o primeiro destino pendente da lista, que pode estar acima da rota inicial. O percurso estritamente para a frente pertence ao modo de busca por potência.

### Como usar

1. Entre no jogo e vá até a rota em que deseja começar.
2. Abra o mapa e deixe a lista de rotas visível.
3. Abra as ferramentas de desenvolvedor do navegador com **F12** e selecione **Console**.
4. Copie todo o conteúdo de [`pokeidle-auto.js`](./pokeidle-auto.js), cole no console e pressione **Enter**.
5. Acompanhe as mensagens com o prefixo `[PokeIdle Auto]` no console.

O script começa imediatamente. Por exemplo, se você estiver caçando um Ekans, ele aguardará a rota atual ser marcada como capturada antes de escolher outro destino.

Recarregar ou fechar a página encerra a execução. Para iniciar novamente, cole o script outra vez. Colá-lo enquanto já está rodando encerra a instância anterior e inicia uma nova.

### Funcionamento

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

### Comandos

Execute os comandos no console da mesma aba:

| Comando | Ação |
| --- | --- |
| `pokeIdleAuto.pause()` | Pausa a automação de navegação. |
| `pokeIdleAuto.resume()` | Retoma uma execução pausada. |
| `pokeIdleAuto.stop()` | Encerra a execução. Para reiniciar, cole o script novamente. |
| `pokeIdleAuto.status()` | Mostra se está parado ou pausado e os destinos pendentes. |

Pausar ou parar o script não desativa as automações nativas do jogo.

### Usar outras telas durante a automação

Você pode fechar o mapa para acessar outras partes do jogo. O script identifica cliques reais e a tecla Escape, aguarda enquanto o mapa estiver fechado e retoma quando você abrir o mapa novamente. Se iniciar o script com o mapa fechado, ele também aguardará sua abertura manual.

O fechamento causado por uma tentativa de viagem do script continua provocando a reabertura automática do mapa. Ao fechar manualmente, as tentativas pendentes são descartadas; na volta, o script lê novamente a rota e a região selecionadas. Uma pausa explícita com `pause()` continua exigindo `resume()`.

A distinção usa os eventos de interação do navegador e a visibilidade do mapa. Alterações na forma como o jogo fecha o mapa podem exigir ajustes.

### Configuração

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

### Seletores usados

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

### Solução de problemas

- **Aguardando captura:** confira se a captura automática está ativa. O script aguarda a marcação `capturado` da rota atual.
- **Tentando viajar repetidamente:** o combate pode estar impedindo a mudança. O script continuará tentando no intervalo configurado.
- **Rota indisponível:** o script aguarda o primeiro destino pendente ficar visível e habilitado; ele não pula esse destino.
- **Nova região não carregou:** o script pausa se não conseguir confirmar a troca em 30 segundos. Confira o mapa e use `pokeIdleAuto.resume()`.
- **Área ou próxima região bloqueada:** o script aguarda o desbloqueio indicado no mapa e continua automaticamente. Não é necessário retomar manualmente.
- **Rota atual não aparece:** verifique se o mapa está na região da sua caçada atual.
- **Execução lenta em segundo plano:** navegadores podem reduzir a frequência dos temporizadores de abas inativas.

### Limitações

- Depende da estrutura da interface e dos seletores descritos acima.
- Não captura Pokémon, escolhe Pokébolas, gerencia recursos ou altera as configurações do VIP.
- Não mantém a execução após recarregar a página e não funciona com o jogo fechado.
- Ao chegar à última região, encerra sem retornar às regiões anteriores.
- É um script independente, sem vínculo oficial com o PokeIdle.

<a id="buscar-por-potencia-minima"></a>
## Buscar por potência mínima

Use [pokeidle-raros.js](./pokeidle-raros.js) quando já tiver capturado pelo menos um Pokémon em todas as rotas e quiser procurar exemplares de maior potência. A escolha do mínimo ocorre depois de colar o script, e pode ser alterada durante a execução.

### Como usar

1. No jogo, abra **F12 → Console**, cole todo o conteúdo de [`pokeidle-raros.js`](./pokeidle-raros.js) e pressione **Enter**.
2. Na caixa que aparecer, escolha a potência mínima, de **1 a 5**. P4 aceita **P4 ou P5**; P5 aceita somente **P5**.
3. Abra o mapa na região da rota em que deseja começar, se ainda não estiver aberto.
4. Deixe a aba aberta com as automações de combate e captura do jogo ativas.

Não é necessário editar o arquivo, instalar bibliotecas ou extensões. Se cancelar a escolha inicial ou informar um valor inválido, o script fica aguardando uma potência válida, sem consultar capturas ou viajar. Execute `pokeIdleRaros.potencia()` para escolher novamente.

### Alterar a potência durante a execução

Para abrir a caixa de escolha novamente:

```js
pokeIdleRaros.potencia()
```

Ou defina o mínimo diretamente, sem abrir a caixa:

```js
pokeIdleRaros.potencia(5)
```

O novo mínimo vale para a rota atual e as seguintes, sem precisar colar o script novamente. Valores inválidos e o cancelamento da caixa mantêm a configuração anterior. Alterar a potência não cancela uma pausa explícita ou a espera por interação manual.

O script guarda a maior potência observada em cada rota. Ao aumentar o mínimo, uma captura anterior abaixo dele deixa de permitir o avanço. Se uma tentativa de viagem ainda estiver bloqueada por combate ou nível, ela é cancelada para buscar a nova potência na rota atual. Uma viagem já aceita ou uma troca de região em andamento continua; o novo mínimo vale no destino. O script não retorna às rotas anteriores.

Ao iniciar, o script encerra uma instância anterior de `pokeIdleRaros` e também o script da Pokédex (`pokeIdleAuto`), se estiverem rodando. Para voltar ao script da Pokédex, execute `pokeIdleRaros.stop()` antes de colar o outro script.

### Funcionamento

- Identifica a rota ativa por `#ml-corpo .ml-linha.on` e lê seu nome em `b.ml-nome`.
- Abre as capturas recentes clicando em `button#cena-capturas`.
- Procura, dentro de **um mesmo `li`** da lista `ul.capturas-linhas`, o nome em `b.cap-nome` e um selo de potência igual ou superior ao mínimo, dentro de `span.cap-selos span.pk-selos.compacto`. Para mínimo P4, aceita `span.p4` ou `span.p5`.
- Fecha as capturas recentes clicando novamente em `button#cena-capturas` e retorna ao mapa. Se ainda não encontrou o Pokémon, espera antes da próxima consulta.
- Registra a maior potência encontrada na memória desta execução. Quando ela atende ao mínimo vigente, escolhe a linha imediatamente seguinte no mapa. A classe `capturado` não participa da decisão.
- Se o combate impedir a viagem, repete o clique. Quando o mapa fecha após a tentativa, reabre-o e verifica se a rota de destino está ativa.
- Ao terminar a última rota da região, segue para a próxima região e começa pela primeira rota. Ao concluir a última região, encerra.

Por exemplo, para a lista:

```text
Charmander → Alakazam → Dragonite → Gyarados → Pikachu
```

Se você começar em **Dragonite** com mínimo P4, o script aguardará Dragonite **P4 ou P5**, seguirá para **Gyarados** e depois **Pikachu**. Ele não volta para Charmander ou Alakazam.

O script não consulta o inventário, a Pokédex ou capturas que não estejam na lista recente. Uma captura correspondente já presente nessa lista conta, mesmo se for anterior ao início do script. Não é exigida uma nova captura após a chegada à rota. Ao detectar uma captura válida, o script memoriza o resultado para aquela rota durante a execução, mesmo se o registro sair do histórico enquanto aguarda um desbloqueio.

### Bloqueios de nível

- **Área com `.travada`:** aguarda o desbloqueio sem pular a rota.
- **Região com `.mapa-area-travada`:** mantém o jogador onde está e aguarda o desbloqueio.
- Controles com `disabled` ou `aria-disabled="true"` também são aguardados.

Essas esperas não têm prazo máximo e não exigem `resume()`. O script relê os elementos do mapa em cada verificação. O jogo precisa atualizar a marcação de bloqueio na interface para que a automação perceba a liberação.

### Interação manual

Se você fechar manualmente o mapa ou a lista de capturas recentes por clique ou Escape, o script aguarda. Para retomar, abra o mapa e deixe as capturas recentes fechadas. As mudanças de janela feitas pelo próprio script fazem parte da consulta e não provocam essa espera.

Ao retomar, a rota ativa é lida novamente. Você pode mover o jogador manualmente para uma rota mais adiante. Se a rota selecionada ficar antes do progresso desta execução, o script pausa para evitar voltar no percurso. Nesse caso, selecione novamente a última rota alcançada ou reinicie o script para começar outro percurso.

### Comandos

| Comando | Ação |
| --- | --- |
| `pokeIdleRaros.potencia()` | Abre a caixa para escolher ou alterar a potência mínima. |
| `pokeIdleRaros.potencia(4)` | Define diretamente o mínimo P4, aceitando P4 ou P5. |
| `pokeIdleRaros.pause()` | Pausa a automação. |
| `pokeIdleRaros.resume()` | Libera a pausa e aguarda o mapa aberto, com as capturas fechadas. |
| `pokeIdleRaros.stop()` | Encerra e remove os eventos de interação do script. |
| `pokeIdleRaros.status()` | Mostra potência, Pokémon atual, destino, etapa e estado da execução. |

Reabrir o mapa não cancela uma pausa explícita feita com `pause()`. Os comandos não desativam as automações nativas do jogo.

### Tempos configuráveis

Todos os valores estão em milissegundos, no início do script:

| Constante | Padrão | Uso |
| --- | --- | --- |
| `INTERVALO` | `1500` | Verificações, bloqueios e tentativas de viagem. |
| `CONSULTA_CAPTURAS` | `10000` | Espera após fechar a lista antes de iniciar outra consulta. |
| `ESTABILIZACAO` | `2000` | Espera antes de ler capturas e pela estabilização da lista de uma nova região. |
| `LIMITE_JANELA` | `30000` | Prazo para confirmar abertura, fechamento, carregamento ou chegada. Em caso de falha, pausa. |

Uma consulta completa exige várias verificações para abrir, ler e fechar as janelas. Portanto, o intervalo real entre leituras é maior que `CONSULTA_CAPTURAS`.

### Limitações e solução de problemas

- O script presume que o jogador já capturou ao menos um Pokémon de cada rota e que o nome da rota corresponde ao Pokémon procurado.
- Nomes são comparados por igualdade, ignorando maiúsculas, minúsculas e espaços extras. Não há correspondência aproximada: `Dragonite` não é `Dragonair`.
- O mapa precisa exibir a rota ativa e a região selecionada para iniciar ou retomar. Se você estiver apenas navegando por outra região, volte à região da caçada.
- Se uma etapa não for confirmada em 30 segundos, confira as janelas, feche as capturas, abra o mapa e use `pokeIdleRaros.resume()`.
- A lista recente tem alcance limitado. Uma captura que sair dela antes da consulta pode não ser detectada. Reduzir o intervalo de consulta pode ajudar, mas não garante que todo registro será visto.
- Não há salvamento permanente. Recarregar a página ou colar novamente o script apaga o progresso memorizado e inicia uma nova execução na rota selecionada.
- Temporizadores podem ficar mais lentos em abas em segundo plano.
- A identificação de fechamento manual depende dos eventos reais de clique/Escape e da visibilidade das janelas. Mudanças na interface do jogo podem exigir ajustes.
- Este script é independente e não possui vínculo oficial com o PokeIdle.

### Validação

A sintaxe e o fluxo foram verificados em uma simulação da interface: escolha inicial, cancelamento, validação, potência mínima P4/P5, alterações durante consulta e viagem, nome e selo no mesmo item, sequência de rotas já capturadas, combate, bloqueios, fechamento manual, troca de região e encerramento. O funcionamento na sessão real do jogo ainda deve ser conferido.
