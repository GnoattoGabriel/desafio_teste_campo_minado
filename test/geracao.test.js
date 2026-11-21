'use strict';

// CT-01 a CT-15 — estado inicial, gerador e contagem de vizinhos.

const {
  api, verifica, assert, clonar, estadoCom, matriz, vizinhos,
  contarVizinhos, tabuleiroCom, esperaRecusa, geradorComSeed,
  LINHAS, COLUNAS, BOMBAS, SEGURAS
} = require('./support/helper');

const listaBombas = (tabuleiro) => {
  const out = [];
  for (let l = 0; l < LINHAS; l++) {
    for (let c = 0; c < COLUNAS; c++) {
      if (tabuleiro[l][c] === -1) out.push([l, c]);
    }
  }
  return out;
};

verifica('CT-01', 'estado inicial: tabuleiro nulo, matrizes vazias e 40 restantes',
  () => api.criarPartida(), undefined, {
    apos: (r) => {
      assert.equal(r.valida, true, 'CT-01: criacao valida');
      assert.equal(r.motivo, '', 'CT-01: sem motivo');
      const e = r.estado;
      assert.equal(e.tabuleiro, null, 'CT-01: tabuleiro ainda nao existe');
      assert.deepEqual(e.abertas, matriz(false), 'CT-01: nenhuma aberta');
      assert.deepEqual(e.bandeiras, matriz(false), 'CT-01: nenhuma bandeira');
      assert.equal(e.status, 'jogando', 'CT-01: jogando');
      assert.equal(e.restantes, BOMBAS, 'CT-01: 40 restantes');
      assert.equal(e.erro, null, 'CT-01: sem erro');
      assert.equal(e.gerador, null, 'CT-01: gerador padrao ausente do estado');
    }
  });

verifica('CT-02', 'gerador e guardado; gerador nao-funcao e opcoes nao-objeto sao recusados',
  () => {
    const gerador = geradorComSeed(1);
    return {
      comGerador: api.criarPartida({ gerador }),
      geradores: [null, 'x', 42, []].map((g) => api.criarPartida({ gerador: g })),
      opcoes: [null, 42, 'x', []].map((v) => api.criarPartida(v)),
      gerador
    };
  },
  undefined, {
    apos: ({ comGerador, geradores, opcoes, gerador }) => {
      assert.equal(comGerador.valida, true, 'CT-02: gerador aceito');
      assert.equal(comGerador.estado.gerador, gerador, 'CT-02: funcao guardada');
      geradores.forEach((r, i) => {
        assert.equal(r.valida, false, `CT-02: gerador recusado ${i}`);
        assert.equal(r.estado, null, `CT-02: sem estado ${i}`);
        assert.equal(r.motivo, 'gerador deve ser funcao', `CT-02: motivo ${i}`);
      });
      opcoes.forEach((r, i) => {
        assert.equal(r.valida, false, `CT-02: opcoes recusadas ${i}`);
        assert.equal(r.estado, null, `CT-02: sem estado de opcoes ${i}`);
        assert.equal(r.motivo, 'opcoes invalidas', `CT-02: motivo opcoes ${i}`);
      });
    }
  });

verifica('CT-03', 'visao antes do primeiro abrir e com estado invalido',
  () => {
    const r = api.criarPartida();
    return { valida: api.visao(r.estado), invalida: api.visao(null) };
  },
  undefined, {
    apos: ({ valida, invalida }) => {
      assert.equal(valida.erro, null, 'CT-03: visao valida sem erro');
      assert.equal(valida.tabuleiro.length, LINHAS, 'CT-03: 14 linhas');
      assert.ok(valida.tabuleiro.every(
        (linha) => linha.length === COLUNAS && linha.every((v) => v === null)),
      'CT-03: 18 colunas de null');
      assert.equal(invalida.erro, 'estado invalido', 'CT-03: estado invalido');
      assert.ok(invalida.tabuleiro.every(
        (linha) => linha.length === COLUNAS && linha.every((v) => v === null)),
      'CT-03: matriz nula mesmo na recusa');
    }
  });

verifica('CT-04', 'primeiro abrir gera 40 bombas fora da casa clicada',
  () => {
    const e = api.criarPartida({ gerador: geradorComSeed(11) }).estado;
    const antes = clonar(e);
    const r = api.abrir(e, 3, 7);
    return { r, antes, depois: e };
  },
  undefined, {
    apos: ({ r, antes, depois }) => {
      assert.equal(r.erro, null, 'CT-04: sem erro');
      assert.equal(r.tabuleiro.length, LINHAS, 'CT-04: 14 linhas');
      assert.ok(r.tabuleiro.every((linha) => linha.length === COLUNAS),
        'CT-04: 18 colunas');
      const bombas = listaBombas(r.tabuleiro);
      assert.equal(bombas.length, BOMBAS, 'CT-04: exatamente 40 bombas');
      assert.equal(bombas.some(([l, c]) => l === 3 && c === 7), false,
        'CT-04: casa clicada nao e bomba');
      const seguras = r.tabuleiro.flat().filter((v) => v !== -1).length;
      assert.equal(seguras, SEGURAS, 'CT-04: 212 casas seguras');
      assert.deepEqual(depois, antes, 'CT-04: estado recebido intacto');
    }
  });

const TAB_CT05 = tabuleiroCom(geradorComSeed(23)(252, [0, 0]));
const PRIMEIRA_CT05 = (() => {
  for (let l = 0; l < LINHAS; l++) {
    for (let c = 0; c < COLUNAS; c++) {
      if (TAB_CT05[l][c] !== -1 && TAB_CT05[l][c] > 0) return [l, c];
    }
  }
  return [0, 0];
})();

verifica('CT-05', 'cada casa segura tem o numero correto de bombas na vizinhança de 8',
  () => {
    const e = estadoCom(TAB_CT05);
    return api.abrir(e, PRIMEIRA_CT05[0], PRIMEIRA_CT05[1]);
  },
  undefined, {
    apos: (r) => {
      assert.equal(r.erro, null, 'CT-05: sem erro');
      for (let l = 0; l < LINHAS; l++) {
        for (let c = 0; c < COLUNAS; c++) {
          const esperado = TAB_CT05[l][c] === -1 ? -1 : contarVizinhos(TAB_CT05, l, c);
          assert.equal(r.tabuleiro[l][c], esperado,
            `CT-05: numero em [${l},${c}]`);
        }
      }
    }
  });

verifica('CT-06', 'vizinhança de canto, borda e interior tem 3, 5 e 8 casas',
  () => api.abrir(estadoCom(tabuleiroCom([[0, 0]])), 13, 17),
  undefined, {
    apos: (r) => {
      assert.equal(vizinhos(0, 0).length, 3, 'CT-06: canto com 3 vizinhos');
      assert.equal(vizinhos(0, 5).length, 5, 'CT-06: borda com 5 vizinhos');
      assert.equal(vizinhos(5, 5).length, 8, 'CT-06: interior com 8 vizinhos');
      assert.equal(r.tabuleiro[0][1], 1, 'CT-06: ao lado da bomba');
      assert.equal(r.tabuleiro[1][1], 1, 'CT-06: diagonal da bomba');
      assert.equal(r.tabuleiro[13][17], 0, 'CT-06: longe da bomba');
    }
  });

verifica('CT-07', 'a bomba nao se conta e duas bombas opostas contam 2',
  () => api.abrir(estadoCom(tabuleiroCom([[5, 5], [5, 7]])), 0, 0),
  undefined, {
    apos: (r) => {
      assert.equal(r.tabuleiro[5][5], -1, 'CT-07: bomba continua -1');
      assert.equal(r.tabuleiro[5][6], 2, 'CT-07: entre duas bombas conta 2');
      assert.equal(r.tabuleiro[4][5], 1, 'CT-07: acima de uma bomba conta 1');
    }
  });

verifica('CT-08', 'faixa de tres linhas sem bomba produz zeros na linha do meio',
  () => {
    const bombas = [];
    for (let c = 0; c < COLUNAS; c++) {
      bombas.push([0, c], [13, c]);
      if (c < 4) bombas.push([1, c]);
    }
    return api.abrir(estadoCom(tabuleiroCom(bombas)), 7, 9);
  },
  undefined, {
    apos: (r) => {
      assert.equal(r.tabuleiro[7].every((v) => v === 0), true,
        'CT-08: linha 7 inteira sem bombas vizinhas');
      assert.equal(r.tabuleiro[2][0] > 0, true,
        'CT-08: linha 2 sente as bombas da linha 1');
    }
  });

const RUINS_CT09 = {
  curta: geradorComSeed(5)(252, [2, 2]).slice(0, 39),
  longa: (() => {
    const base = geradorComSeed(5)(252, [2, 2]);
    const extra = [];
    for (let l = 0; l < LINHAS && extra.length === 0; l++) {
      for (let c = 0; c < COLUNAS; c++) {
        if (!base.some(([a, b]) => a === l && b === c) && !(l === 2 && c === 2)) {
          extra.push([l, c]);
          break;
        }
      }
    }
    return [...base, extra[0]];
  })()
};

verifica('CT-09', 'gerador com 39 ou 41 bombas e recusado sem gravar tabuleiro',
  () => Object.entries(RUINS_CT09).map(([nome, lista]) => {
    const e = estadoCom(null, { gerador: () => lista });
    const r = api.abrir(e, 2, 2);
    const repetido = api.abrir(r, 2, 2);
    return { nome, e, r, repetido };
  }),
  undefined, {
    apos: (resultados) => {
      assert.equal(resultados.length, 2, 'CT-09: dois cenarios');
      resultados.forEach(({ nome, e, r, repetido }, i) => {
        esperaRecusa(e, 'gerador invalido', r);
        assert.equal(r.tabuleiro, null, `CT-09: tabuleiro nulo ${nome}`);
        assert.equal(r.status, 'jogando', `CT-09: status intacto ${i}`);
        assert.equal(r.restantes, BOMBAS, `CT-09: contador intacto ${i}`);
        assert.equal(repetido.erro, 'gerador invalido',
          `CT-09: repeticao continua recusada ${i}`);
      });
    }
  });

verifica('CT-10', 'bomba fora da grade ou com coordenada negativa e recusada',
  () => [[-1, 3], [14, 3], [3, 18], [3, -2]].map(([l, c]) => {
    const lista = geradorComSeed(7)(252, [2, 2]).slice(1);
    lista.push([l, c]);
    const e = estadoCom(null, { gerador: () => lista });
    return { l, c, e, r: api.abrir(e, 2, 2) };
  }),
  undefined, {
    apos: (resultados) => {
      assert.equal(resultados.length, 4, 'CT-10: quatro coordenadas invalidas');
      resultados.forEach(({ l, c, e, r }, i) => {
        esperaRecusa(e, 'gerador invalido', r);
        assert.equal(r.tabuleiro, null, `CT-10: nada gravado ${i} (${l},${c})`);
      });
    }
  });

verifica('CT-11', 'posicoes de bomba repetidas sao recusadas',
  () => {
    const lista = geradorComSeed(13)(252, [2, 2]);
    lista[5] = [...lista[4]];
    const e = estadoCom(null, { gerador: () => lista });
    return { e, r: api.abrir(e, 2, 2) };
  },
  undefined, {
    apos: ({ e, r }) => {
      esperaRecusa(e, 'gerador invalido', r);
      assert.equal(r.tabuleiro, null, 'CT-11: nada gravado');
    }
  });

verifica('CT-12', 'gerador que nao devolve array e recusado',
  () => [null, {}, 42, 'bombas', undefined].map((saida) => {
    const e = estadoCom(null, { gerador: () => saida });
    return { saida, e, r: api.abrir(e, 2, 2) };
  }),
  undefined, {
    apos: (resultados) => {
      assert.equal(resultados.length, 5, 'CT-12: cinco saidas invalidas');
      resultados.forEach(({ e, r }, i) => {
        esperaRecusa(e, 'gerador invalido', r);
        assert.equal(r.tabuleiro, null, `CT-12: nada gravado ${i}`);
      });
    }
  });

verifica('CT-13', 'gerador que inclui a casa clicada e recusado',
  () => {
    const lista = geradorComSeed(17)(252, [6, 8]);
    lista[0] = [6, 8];
    const e = estadoCom(null, { gerador: () => lista });
    return { e, r: api.abrir(e, 6, 8) };
  },
  undefined, {
    apos: ({ e, r }) => {
      esperaRecusa(e, 'gerador invalido', r);
      assert.equal(r.tabuleiro, null, 'CT-13: primeira jogada nao foi gravada');
    }
  });

verifica('CT-14', 'gerador recebe (252, [linha, coluna]) e e deterministico',
  () => {
    const chamadas = [];
    const gerador = (casas, primeira) => {
      chamadas.push([casas, primeira]);
      return geradorComSeed(77)(casas, primeira);
    };
    const e = api.criarPartida({ gerador }).estado;
    const a = api.abrir(e, 4, 9);
    const b = api.abrir(e, 4, 9);
    const padrao = api.criarPartida().estado;
    const p1 = api.abrir(padrao, 1, 1);
    const p2 = api.abrir(padrao, 1, 1);
    return { chamadas, a, b, p1, p2 };
  },
  undefined, {
    apos: ({ chamadas, a, b, p1, p2 }) => {
      assert.deepEqual(chamadas, [[252, [4, 9]], [252, [4, 9]]],
        'CT-14: argumentos do gerador');
      assert.deepEqual(a.tabuleiro, b.tabuleiro, 'CT-14: gerador injetado estavel');
      assert.deepEqual(p1.tabuleiro, p2.tabuleiro, 'CT-14: gerador padrao estavel');
    }
  });

const LISTA_CT15 = geradorComSeed(31)(252, [0, 0]);

verifica('CT-15', 'a lista devolvida pelo gerador nao e alterada',
  () => {
    const e = estadoCom(null, { gerador: () => LISTA_CT15 });
    const antes = clonar(LISTA_CT15);
    const r = api.abrir(e, 0, 0);
    return { r, antes };
  },
  undefined, {
    apos: ({ r, antes }) => {
      assert.equal(r.erro, null, 'CT-15: geracao aceita');
      assert.deepEqual(LISTA_CT15, antes, 'CT-15: lista intacta');
    }
  });
