# desafio_teste_campo_minado

Casos de teste para o desafio **Campo Minado** da disciplina Projeto,
Implementação e Teste de Software — 2026. O enunciado em `desafios.md` pede
apenas "casos de teste para testar campo minado de tabuleiro 18 x 14 com 40
bombas; casos de teste em Javascript para testar Javascript".

**Colaborador:** Gabriel de Oliveira Gnoatto — RA 23298801-2 (individual).

## 1. Especificação considerada

O enunciado não define contrato JavaScript, coordenadas, primeira jogada,
bandeiras, abertura em cadeia nem critério de vitória. Tudo o que segue é
**premissa explícita**, registrada para que o professor possa ajustar a variante.

### 1.1 Premissas adotadas

| Premissa | Decisão |
|---|---|
| Dimensão | 14 linhas × 18 colunas (0..13 / 0..17) = 252 casas, 40 bombas e 212 seguras |
| Geração | `gerador(252, [linha, coluna])` no **primeiro `abrir`**; devolve 40 pares `[linha, coluna]` distintos, dentro da grade e fora da casa clicada |
| Gerador padrão | sem injeção, o jogo usa gerador interno determinístico e estável entre partidas; nenhum teste depende de posições específicas dele |
| Antes do primeiro `abrir` | `tabuleiro: null`; `abertas` e `bandeiras` já existem como matrizes 14×18 |
| Número da casa | bombas nos **8 vizinhos**, diagonais inclusive |
| Casa com 0 | flood fill pelos 8 vizinhos; o conjunto aberto são os **zeros conectados mais as casas numeradas adjacentes a eles** |
| Bandeira | alterna coberta ↔ marcada; **sem limite** (comportamento clássico); `restantes = 40 - bandeiras`, podendo ficar negativo |
| Vitória | nenhuma casa segura permanece coberta; bandeiras não são exigidas |
| Derrota | abrir bomba; clicada vira `'explodida'` e as demais `'bomba'` |
| Depois do fim | `abrir` e `marcar` são recusados com `partida encerrada` |
| Recusa | só o campo `erro` muda; toda operação aceita devolve `erro: null` |
| Clique duplo | fora do escopo |

Decisão confirmada pelo autor: **comportamento clássico**, sem limite de
bandeiras. Marcar qualquer casa coberta durante a partida é sempre aceito e
`restantes` pode passar de zero para valores negativos. O CT-35 cobre 45
bandeiras e o contador `-5`.

### 1.2 Contrato JavaScript

Módulo CommonJS em `src/campoMinado.js`:

```js
const {
  criarPartida, // ({ gerador? }) => { valida, estado, motivo }
  abrir,        // (estado, linha, coluna) => novo estado
  marcar,       // (estado, linha, coluna) => novo estado
  visao,        // (estado) => { tabuleiro, erro }
  status,       // (estado) => 'jogando' | 'vitoria' | 'derrota'
  reiniciar     // (estado) => { valida, estado, motivo }
} = require('./src/campoMinado');
```

- `gerador` recebe dois argumentos: `casas = 252` (número) e
  `primeiraJogada = [linha, coluna]`. Um gerador informado que não é função é
  recusado; opções que não são objeto também.
- `visao(estado)` devolve `{ tabuleiro, erro }`, com a matriz 14×18 como o
  jogador vê. `status` devolve string e não lança com estado inválido.
- `reiniciar(estado)` devolve `{ valida, estado, motivo }`, preservando a função
  `gerador` quando ela foi injetada.
- Todas as funções devolvem objeto novo. A não mutação é conferida pelo helper
  `verifica` em todas as aberturas e marcações, inclusive nas recusas; o CT-15
  também protege o array devolvido pelo gerador.

### 1.3 Estado e vocabulário

```js
{
  tabuleiro: null,               // ou 14x18 com -1 (bomba) e 0..8
  abertas:   [ /* 14x18 booleanos */ ],
  bandeiras: [ /* 14x18 booleanos */ ],
  status: 'jogando',             // 'jogando' | 'vitoria' | 'derrota'
  restantes: 40,
  erro: null,
  gerador: null                  // ou a função injetada
}
```

| Situação | `erro` |
|---|---|
| estado recebido inválido | `estado invalido` |
| linha/coluna inválida em `abrir` ou `marcar` | `coordenada invalida` |
| abrir casa marcada | `casa marcada` |
| marcar casa aberta | `casa aberta` |
| gerador com saída inválida | `gerador invalido` |
| jogada depois do fim | `partida encerrada` |

Não há limite de bandeiras: `limite de bandeiras` não faz parte do vocabulário
de erros.
Motivos de `criarPartida` (com `valida: false` e `estado: null`):
`opcoes invalidas` (opções que não são objeto: `null`, `42`, `'x'`, `[]`) e
`gerador deve ser funcao` (incluindo `gerador: null`). Cada termo do vocabulário
é exigido por algum caso.

Tokens de `visao`:

| Casa | Antes do fim | Após a vitória | Depois da derrota |
|---|---|---|---|
| coberta sem bandeira | `null` | `null` | `null` |
| marcada | `'bandeira'` | `'bandeira'` | `'bandeira'` |
| segura aberta | `0..8` | `0..8` | `0..8` |
| bomba não clicada | `null` | `null` | `'bomba'` |
| bomba clicada | — | — | `'explodida'` |

## 2. Funcionamento

```bash
npm test
```

Os testes usam `node:test` (sem dependências externas). A suíte está separada
em `geracao.test.js`, `abertura.test.js`, `bandeiras.test.js`,
`partida.test.js` e `propriedades.test.js`, com suporte comum em
`test/support/helper.js`.

**Situação atual:** os 47 casos viram **47 testes** e falham no repositório:

```
# tests 47
# pass 0
# fail 47
```

Esse é o estado **RED** esperado: a implementação do jogo não faz parte do
entregável. `src/campoMinado.js` não existe aqui; cada chamada lança uma
mensagem com o `stack` real do `require`.

**Determinismo:** nenhum teste usa `Math.random`, relógio ou uma lista de
jogadas escrita à mão no ciclo do jogo. Os geradores usam LCG com seeds fixas;
CT-38 e CT-39 extraem alvos do próprio `estado.tabuleiro` com estratégias
implementadas no teste.

**Ciclo TDD:** o GREEN (47/47), a refatoração da implementação de referência e
as variantes defeituosas foram executados em **cópia descartável** fora do
repositório, porque o entregável não pode conter `src/`. O histórico executado
foi: testes falhando no repo → implementação de referência na cópia (47/47) →
variantes → reforço das asserções (47/47) → variantes reexecutadas. Nenhum
`src/` foi deixado neste repositório.

**Ajustes durante a validação:** CT-02 passou a exigir `gerador deve ser funcao`
também para `gerador: null`; CT-19 trocou a bomba isolada por uma coluna de
bombas, porque com uma única bomba toda borda numerada é adjacente à região de
zeros e não existe casa numerada fechada; CT-23 abriu casas seguras antes da
bomba para conferir os números na visão pós-derrota; CT-29 passou a usar uma
casa numerada como penúltima jogada, evitando que o flood encerrasse a partida
antes da última casa.

## 3. Matriz de cobertura

| Área | Casos |
|---|---|
| Estado inicial, opções e gerador | CT-01 a CT-04, CT-14, CT-15 |
| Numeração e vizinhança de 8 | CT-05 a CT-08, CT-42 a CT-46 |
| Validação de gerador | CT-09 a CT-15 |
| Primeira jogada e abertura | CT-16 a CT-22 |
| Derrota, vitória e recusas | CT-23 a CT-31 |
| Bandeiras e contador | CT-32 a CT-37 |
| Partidas completas | CT-38, CT-39 |
| Reinício e visão do jogador | CT-40, CT-41 |
| Propriedades com oráculo independente | CT-42 a CT-47 |
| Não mutação | todos os casos com estado, mais CT-15, CT-23, CT-28 e CT-38 |

## 4. Variantes defeituosas detectadas

Cada uma das 24 variantes foi executada na cópia descartável contra a mesma
suíte de 47 testes. Todas foram detectadas:

| Variante | Falhas |
|---|---|
| sem flood fill (abre só a casa clicada) | 5 |
| vizinhança de 4 em vez de 8 | 5 |
| flood atravessa casas numeradas | 1 |
| sem detecção de vitória | 2 |
| vitória prematura | 4 |
| sem detecção de derrota | 3 |
| limite de 40 bandeiras reintroduzido | 1 |
| contador de bandeiras congelado | 3 |
| implementação que muta o estado | 9 |
| `visao` revela bombas antes do fim | 1 |
| `visao` sem `erro: 'estado invalido'` | 1 |
| `reiniciar` perde o gerador | 1 |
| `status` lança com estado inválido | 1 |
| aceita opções que não são objeto | 1 |
| aceita `gerador: null` | 1 |
| argumentos do gerador errados | 6 |
| números com um a mais | 5 |
| abre casa marcada | 2 |
| marca casa aberta | 1 |
| joga depois do fim | 2 |
| coordenada não validada | 3 |
| erro anterior não é limpo | 1 |
| recusa altera outros campos | 2 |
| mutate a lista devolvida pelo gerador | 2 |

## 5. Rastreabilidade

Os mesmos IDs (CT-01 a CT-47) aparecem nos arquivos `.test.js`, no resumo e
nas seções do `.docx` (`casos_de_teste_campo_minado.docx`): 47 casos, 47 testes
e 48 linhas no resumo (cabeçalho + 47). Vocabulário de `erro`, de `motivo` e
tokens de `visao` são rastreáveis: cada termo citado na seção 1 é exigido por
um caso. O `.docx` segue o template da disciplina: especificação, resumo e,
para cada caso, descrição, pré-condições, passos, cenário, dados de teste,
resultado esperado e pós-condições.

## 6. Colaborador

- Gabriel de Oliveira Gnoatto — RA 23298801-2 (trabalho individual).
