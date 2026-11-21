'use strict';

// CT-16 a CT-31 — primeira jogada, flood fill, derrota, vitoria e recusas.

const {
  api, verifica, assert, clonar, estadoCom, vizinhos, tabuleiroCom,
  contarAbertas, esperaRecusa, geradorComSeed, LINHAS, COLUNAS, BOMBAS
} = require('./support/helper');

const primeiroComNumero = () => {
  for (let seed = 1; seed <= 40; seed++) {
    const gerador = geradorComSeed(seed);
    const tabuleiro = tabuleiroCom(gerador(252, [6, 6]));
    if (tabuleiro[6][6] > 0) return { gerador, tabuleiro };
  }
  throw new Error('nenhum seed produziu casa inicial com numero');
};

verifica('CT-16', 'primeira jogada segura em qualquer coordenada, com flood quando da zero',
  () => [[0, 0], [13, 17], [7, 9], [0, 17], [13, 0], [3, 11]].map(([l, c], i) => {
    const gerador = geradorComSeed(l * 31 + c + 1);
    const e = api.criarPartida({ gerador }).estado;
    const r = api.abrir(e, l, c);
    return { l, c, r, lista: gerador(252, [l, c]), i };
  }),
  undefined, {
    apos: (resultados) => {
      assert.equal(resultados.length, 6, 'CT-16: seis coordenadas');
      resultados.forEach(({ l, c, r, lista, i }) => {
        assert.equal(r.erro, null, `CT-16: sem erro ${i}`);
        assert.equal(r.tabuleiro[l][c] === -1, false, `CT-16: clicada segura ${i}`);
        assert.equal(lista.some(([a, b]) => a === l && b === c), false,
          `CT-16: gerador do teste exclui clicada ${i}`);
        if (r.tabuleiro[l][c] === 0) {
          assert.ok(contarAbertas(r.abertas) > 1,
            `CT-16: flood abriu regiao a partir de ${l},${c}`);
        }
      });
    }
  });

const INICIO_CT17 = primeiroComNumero();

verifica('CT-17', 'primeira jogada em casa com numero abre somente ela',
  () => {
    const e = api.criarPartida({ gerador: INICIO_CT17.gerador }).estado;
    return { r: api.abrir(e, 6, 6), tabuleiro: INICIO_CT17.tabuleiro };
  },
  undefined, {
    apos: ({ r, tabuleiro }) => {
      assert.equal(r.erro, null, 'CT-17: sem erro');
      assert.ok(tabuleiro[6][6] > 0, 'CT-17: casa clicada tem numero');
      assert.equal(contarAbertas(r.abertas), 1, 'CT-17: so a clicada abriu');
      assert.equal(r.abertas[6][6], true, 'CT-17: clicada aberta');
    }
  });

verifica('CT-18', 'abrir casa numerada em tabuleiro ja gerado nao abre vizinhas',
  () => api.abrir(estadoCom(tabuleiroCom([[5, 5]])), 5, 6),
  undefined, {
    apos: (r) => {
      assert.equal(r.erro, null, 'CT-18: sem erro');
      assert.equal(r.tabuleiro[5][6], 1, 'CT-18: numero 1');
      assert.equal(contarAbertas(r.abertas), 1, 'CT-18: so a clicada');
      vizinhos(5, 6).forEach(([l, c]) => {
        assert.equal(r.abertas[l][c], false, `CT-18: vizinha ${l},${c} fechada`);
      });
    }
  });

// Uma coluna inteira de bombas separa o tabuleiro em duas regioes de zeros.
// Assim ha bordas numeradas dos dois lados, mas so as da regiao clicada abrem.
const PAREDE_CT19 = Array.from(
  { length: LINHAS }, (_, l) => [l, 5]);

verifica('CT-19', 'flood fill para nas bordas numeradas sem atravessá-las',
  () => api.abrir(estadoCom(tabuleiroCom(PAREDE_CT19)), 7, 2),
  undefined, {
    apos: (r) => {
      assert.equal(r.erro, null, 'CT-19: sem erro');
      assert.equal(r.tabuleiro[7][2], 0, 'CT-19: clique em zero');
      assert.equal(r.abertas[7][2], true, 'CT-19: zero clicado aberta');
      assert.equal(r.abertas[7][4], true, 'CT-19: borda numerada foi aberta');
      assert.equal(r.tabuleiro[7][4] > 0, true, 'CT-19: borda tem numero');
      assert.equal(r.abertas[7][6], false,
        'CT-19: numerada da outra regiao nao foi aberta');
      assert.equal(r.abertas[7][5], false, 'CT-19: bomba nunca e aberta');
    }
  });

verifica('CT-20', 'flood fill percorre a vizinhança de 8, diagonais inclusive',
  () => api.abrir(estadoCom(tabuleiroCom([[10, 10]])), 0, 0),
  undefined, {
    apos: (r) => {
      assert.equal(r.erro, null, 'CT-20: sem erro');
      assert.equal(vizinhos(0, 0).some(([l, c]) => l === 1 && c === 1), true,
        'CT-20: diagonal faz parte da vizinhança');
      assert.equal(r.abertas[1][1], true, 'CT-20: diagonal aberta pelo flood');
      assert.equal(r.abertas[0][1], true, 'CT-20: horizontal aberta');
      assert.equal(r.abertas[13][17], true, 'CT-20: flood alcanca o canto oposto');
      assert.equal(r.abertas[10][10], false, 'CT-20: bomba permanece fechada');
    }
  });

verifica('CT-21', 'flood fill na borda do tabuleiro nao vaza para indices invalidos',
  () => [[0, 0], [13, 17], [0, 17], [13, 0]].map(([l, c]) =>
    api.abrir(estadoCom(tabuleiroCom([])), l, c)),
  undefined, {
    apos: (resultados) => {
      assert.equal(resultados.length, 4, 'CT-21: quatro cantos');
      resultados.forEach((r, i) => {
        assert.equal(r.erro, null, `CT-21: sem erro ${i}`);
        assert.equal(contarAbertas(r.abertas), LINHAS * COLUNAS,
          `CT-21: tabuleiro sem bombas totalmente aberto ${i}`);
      });
    }
  });

verifica('CT-22', 'flood fill nunca revela bomba vizinha de casa com zero',
  () => api.abrir(estadoCom(tabuleiroCom([[5, 5], [5, 6]])), 7, 7),
  undefined, {
    apos: (r) => {
      assert.equal(r.erro, null, 'CT-22: sem erro');
      assert.equal(r.abertas[5][5], false, 'CT-22: bomba 5,5 fechada');
      assert.equal(r.abertas[5][6], false, 'CT-22: bomba 5,6 fechada');
      assert.equal(r.tabuleiro[5][5], -1, 'CT-22: bomba continua -1');
    }
  });

const BOMBAS_CT23 = [[5, 5], [10, 10]];
const ESTADO_CT23 = estadoCom(tabuleiroCom(BOMBAS_CT23));
// Algumas casas seguras ja foram abertas antes da bomba, para conferir que a
// visao continua mostrando seus numeros apos a derrota.
ESTADO_CT23.abertas[0][0] = true;
ESTADO_CT23.abertas[0][1] = true;

verifica('CT-23', 'abrir bomba em jogada posterior causa derrota e revela tokens',
  () => {
    const r = api.abrir(ESTADO_CT23, 5, 5);
    return { r, visao: api.visao(r) };
  },
  undefined, {
    entradas: [ESTADO_CT23],
    apos: ({ r, visao }) => {
      assert.equal(r.erro, null, 'CT-23: abertura da bomba e aceita');
      assert.equal(r.status, 'derrota', 'CT-23: derrota');
      assert.equal(visao.erro, null, 'CT-23: visao valida');
      assert.equal(visao.tabuleiro[5][5], 'explodida', 'CT-23: bomba clicada');
      assert.equal(visao.tabuleiro[10][10], 'bomba', 'CT-23: outra bomba revelada');
      assert.equal(visao.tabuleiro[0][0], 0, 'CT-23: casa segura mostra numero');
      assert.equal(ESTADO_CT23.status, 'jogando', 'CT-23: entrada intacta');
    }
  });

const ABERTA_CT24 = estadoCom(tabuleiroCom([[5, 5]]));
ABERTA_CT24.abertas[3][4] = true;
const ABERTA_COM_ERRO_CT24 = clonar(ABERTA_CT24);
ABERTA_COM_ERRO_CT24.erro = 'casa aberta';

verifica('CT-24', 'abrir casa ja aberta e idempotente e zera erro anterior',
  () => ({
    r: api.abrir(ABERTA_CT24, 3, 4),
    rErro: api.abrir(ABERTA_COM_ERRO_CT24, 3, 4)
  }),
  undefined, {
    apos: ({ r, rErro }) => {
      assert.equal(r.erro, null, 'CT-24: sem erro');
      assert.deepEqual(r, ABERTA_CT24, 'CT-24: estado equivalente');
      assert.equal(rErro.erro, null, 'CT-24: erro anterior limpo');
      assert.deepEqual(rErro, ABERTA_CT24, 'CT-24: demais campos intactos');
    }
  });

const MARCADA_CT25 = estadoCom(tabuleiroCom([[5, 5]]));
MARCADA_CT25.bandeiras[3][4] = true;
MARCADA_CT25.restantes = BOMBAS - 1;

verifica('CT-25', 'abrir casa marcada e recusado com erro exclusivo',
  () => api.abrir(MARCADA_CT25, 3, 4),
  undefined, {
    apos: (r) => {
      esperaRecusa(MARCADA_CT25, 'casa marcada', r);
      assert.equal(contarAbertas(r.abertas), 0, 'CT-25: nenhuma casa aberta');
    }
  });

const COORDS_INVALIDAS_CT26 = [
  [-1, 0], [14, 0], [0, 18], [0, -1],
  [1.5, 2], [1, 2.5], ['1', 2], [1, '2'],
  [null, 0], [0, null], [NaN, 0], [0, NaN],
  [undefined, 0], [0, undefined], [Infinity, 0], [0, -Infinity]
];

verifica('CT-26', 'coordenadas invalidas em abrir sao recusadas sem mudar o estado',
  () => {
    const e = estadoCom(tabuleiroCom([[5, 5]]));
    return COORDS_INVALIDAS_CT26.map(([l, c]) => ({
      l, c, r: api.abrir(e, l, c)
    }));
  },
  undefined, {
    apos: (resultados) => {
      assert.equal(resultados.length, 16, 'CT-26: dezesseis coordenadas');
      resultados.forEach(({ l, c, r }, i) => {
        assert.equal(r.erro, 'coordenada invalida',
          `CT-26: motivo ${i} (${String(l)},${String(c)})`);
        assert.equal(contarAbertas(r.abertas), 0, `CT-26: nada aberto ${i}`);
        assert.equal(r.status, 'jogando', `CT-26: status intacto ${i}`);
      });
    }
  });

verifica('CT-27', 'abrir depois do fim e recusado com estado intacto',
  () => {
    const derrota = estadoCom(tabuleiroCom([[5, 5]]), { status: 'derrota' });
    const vitoria = estadoCom(tabuleiroCom([[5, 5]]), { status: 'vitoria' });
    return [api.abrir(derrota, 0, 0), api.abrir(vitoria, 0, 0)];
  },
  undefined, {
    apos: ([a, b]) => {
      assert.equal(a.erro, 'partida encerrada', 'CT-27: apos derrota');
      assert.equal(b.erro, 'partida encerrada', 'CT-27: apos vitoria');
    }
  });

const ULTIMA_CT28 = estadoCom(tabuleiroCom([[5, 5]]));
for (let l = 0; l < LINHAS; l++) {
  for (let c = 0; c < COLUNAS; c++) {
    if (ULTIMA_CT28.tabuleiro[l][c] !== -1 && !(l === 0 && c === 0)) {
      ULTIMA_CT28.abertas[l][c] = true;
    }
  }
}

const FLOOD_VITORIA_CT28 = estadoCom(tabuleiroCom([[13, 17]]));
for (let l = 0; l < LINHAS; l++) {
  for (let c = 0; c < COLUNAS; c++) {
    if (FLOOD_VITORIA_CT28.tabuleiro[l][c] !== -1 && !(l === 0 && c === 0)) {
      FLOOD_VITORIA_CT28.abertas[l][c] = true;
    }
  }
}

verifica('CT-28', 'ultima casa segura aberta da vitoria, inclusive por flood fill',
  () => ({
    direta: api.abrir(ULTIMA_CT28, 0, 0),
    flood: api.abrir(FLOOD_VITORIA_CT28, 0, 0)
  }),
  undefined, {
    apos: ({ direta, flood }) => {
      assert.equal(direta.erro, null, 'CT-28: abertura direta aceita');
      assert.equal(direta.status, 'vitoria', 'CT-28: vitoria direta');
      assert.equal(flood.erro, null, 'CT-28: flood aceito');
      assert.equal(flood.status, 'vitoria', 'CT-28: vitoria pelo flood');
      assert.equal(api.status(flood), 'vitoria', 'CT-28: status publico');
    }
  });

// Duas casas seguras cobertas: [0,1] tem numero (ao lado da bomba), entao
// abri-la nao dispara o flood que abriria a ultima casa [0,0].
const ANTES_ULTIMA_CT29 = estadoCom(tabuleiroCom([[0, 2]]));
for (let l = 0; l < LINHAS; l++) {
  for (let c = 0; c < COLUNAS; c++) {
    if (ANTES_ULTIMA_CT29.tabuleiro[l][c] !== -1 && !(l === 0 && c <= 1)) {
      ANTES_ULTIMA_CT29.abertas[l][c] = true;
    }
  }
}

verifica('CT-29', 'abrir casa segura antes da ultima mantem a partida em jogando',
  () => api.abrir(ANTES_ULTIMA_CT29, 0, 1),
  undefined, {
    apos: (r) => {
      assert.equal(r.erro, null, 'CT-29: sem erro');
      assert.equal(r.status, 'jogando', 'CT-29: ainda jogando');
      assert.equal(r.abertas[0][1], true, 'CT-29: casa aberta');
      assert.equal(r.abertas[0][0], false, 'CT-29: ultima ainda coberta');
    }
  });

verifica('CT-30', 'aberturas validas e recusadas nao alteram a entrada',
  () => {
    const valida = estadoCom(tabuleiroCom([[5, 5]]));
    const marcada = clonar(MARCADA_CT25);
    const invalida = estadoCom(tabuleiroCom([[5, 5]]));
    return {
      valida: { antes: clonar(valida), depois: valida, r: api.abrir(valida, 0, 0) },
      marcada: { antes: clonar(marcada), r: api.abrir(marcada, 3, 4) },
      invalida: { antes: clonar(invalida), r: api.abrir(invalida, -1, 0) }
    };
  },
  undefined, {
    apos: ({ valida, marcada, invalida }) => {
      assert.deepEqual(valida.depois, valida.antes, 'CT-30: abertura valida');
      assert.equal(marcada.r.erro, 'casa marcada', 'CT-30: recusa marcada');
      assert.equal(invalida.r.erro, 'coordenada invalida', 'CT-30: recusa coord');
    }
  });

verifica('CT-31', 'estados invalidos em abrir sao recusados',
  () => {
    const torta = estadoCom(tabuleiroCom([]));
    torta.abertas = torta.abertas.slice(1);
    const ruims = [null, {}, { tabuleiro: null }, torta];
    const retornos = ruims.map((e) => api.abrir(e, 0, 0));
    return { retornos, status: api.status(null) };
  },
  undefined, {
    apos: ({ retornos, status }) => {
      retornos.forEach((r, i) => {
        assert.equal(r && r.erro, 'estado invalido', `CT-31: recusa ${i}`);
      });
      assert.equal(status, 'jogando', 'CT-31: status nao lanca com estado invalido');
    }
  });
