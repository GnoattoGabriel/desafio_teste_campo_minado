'use strict';

// CT-42 a CT-47 — propriedades com oraculos independentes e seeds fixas.

const {
  api, verifica, assert, clonar, estadoCom, matriz, vizinhos,
  tabuleiroCom, geradorComSeed, LINHAS, COLUNAS, BOMBAS
} = require('./support/helper');

const bombasDo = (tabuleiro) => {
  const out = [];
  for (let l = 0; l < LINHAS; l++) {
    for (let c = 0; c < COLUNAS; c++) {
      if (tabuleiro[l][c] === -1) out.push([l, c]);
    }
  }
  return out;
};

const primeiraCasaFora = (bombas) => {
  for (let l = 0; l < LINHAS; l++) {
    for (let c = 0; c < COLUNAS; c++) {
      if (!bombas.some(([a, b]) => a === l && b === c)) return [l, c];
    }
  }
  throw new Error('lista de bombas cobre o tabuleiro');
};

verifica('CT-42', '100 geradores deterministicos: 40 bombas e numeros conferem',
  () => Array.from({ length: 100 }, (_, i) => {
    const seed = 1000 + i * 37;
    const primeira = [i % LINHAS, (i * 5) % COLUNAS];
    const gerador = geradorComSeed(seed);
    const lista = gerador(252, primeira);
    const e = estadoCom(null, { gerador });
    return { seed, primeira, lista, r: api.abrir(e, ...primeira) };
  }),
  undefined, {
    apos: (casos) => {
      assert.equal(casos.length, 100, 'CT-42: cem seeds');
      casos.forEach(({ seed, lista, r }, i) => {
        assert.equal(r.erro, null, `CT-42: geracao aceita ${i}`);
        assert.equal(lista.length, BOMBAS, `CT-42: 40 bombas ${i}`);
        assert.equal(bombasDo(r.tabuleiro).length, BOMBAS,
          `CT-42: 40 bombas no tabuleiro ${i}`);
        assert.deepEqual(r.tabuleiro, tabuleiroCom(lista),
          `CT-42: numeros batem com a vizinhança (seed ${seed})`);
      });
    }
  });

verifica('CT-43', 'identidade global: soma dos numeros = soma de vizinhos seguros das bombas',
  () => Array.from({ length: 25 }, (_, i) => {
    const seed = 5000 + i * 13;
    const primeira = [i % LINHAS, (i * 7) % COLUNAS];
    const gerador = geradorComSeed(seed);
    const lista = gerador(252, primeira);
    const r = api.abrir(estadoCom(null, { gerador }), ...primeira);
    let somaNumeros = 0;
    for (let l = 0; l < LINHAS; l++) {
      for (let c = 0; c < COLUNAS; c++) {
        if (r.tabuleiro[l][c] !== -1) somaNumeros += r.tabuleiro[l][c];
      }
    }
    const somaVizinhos = lista.reduce((total, [l, c]) => total +
      vizinhos(l, c).filter(([a, b]) =>
        r.tabuleiro[a][b] !== -1).length, 0);
    return { seed, somaNumeros, somaVizinhos };
  }),
  undefined, {
    apos: (casos) => {
      assert.equal(casos.length, 25, 'CT-43: 25 seeds');
      casos.forEach(({ seed, somaNumeros, somaVizinhos }, i) => {
        assert.equal(somaNumeros, somaVizinhos,
          `CT-43: identidade (seed ${seed}, caso ${i})`);
      });
    }
  });

verifica('CT-44', 'espelho horizontal, vertical e rotacao preservam as contagens',
  () => {
    const base = geradorComSeed(99)(252, [0, 0]);
    const transforms = {
      horizontal: ([l, c]) => [l, COLUNAS - 1 - c],
      vertical: ([l, c]) => [LINHAS - 1 - l, c],
      rotacao: ([l, c]) => [LINHAS - 1 - l, COLUNAS - 1 - c]
    };
    return Object.entries(transforms).map(([nome, fn]) => {
      const bombas = base.map(fn);
      const primeira = primeiraCasaFora(bombas);
      const r = api.abrir(
        estadoCom(null, { gerador: () => bombas }), ...primeira);
      return { nome, bombas, primeira, r };
    });
  },
  undefined, {
    apos: (casos) => {
      assert.equal(casos.length, 3, 'CT-44: tres transformacoes');
      casos.forEach(({ nome, bombas, r }) => {
        assert.equal(r.erro, null, `CT-44: ${nome} aceito`);
        assert.equal(bombasDo(r.tabuleiro).length, BOMBAS,
          `CT-44: 40 bombas apos ${nome}`);
        assert.deepEqual(r.tabuleiro, tabuleiroCom(bombas),
          `CT-44: contagens apos ${nome}`);
      });
    }
  });

verifica('CT-45', 'mutar uma bomba altera as contagens vizinhas',
  () => {
    const original = geradorComSeed(123)(252, [0, 0]);
    const mutada = original.map((par) => [...par]);
    const [l, c] = mutada[0];
    const semOrigem = mutada.filter(([a, b]) => !(a === l && b === c));
    const destino = primeiraCasaFora([...semOrigem, [l, c]]);
    mutada[0] = destino;
    const primeira = primeiraCasaFora([...original, ...mutada]);
    const rOriginal = api.abrir(
      estadoCom(null, { gerador: () => original }), ...primeira);
    const rMutada = api.abrir(
      estadoCom(null, { gerador: () => mutada }), ...primeira);
    return { original, mutada, primeira, rOriginal, rMutada };
  },
  undefined, {
    apos: ({ original, mutada, primeira, rOriginal, rMutada }) => {
      assert.equal(rOriginal.erro, null, 'CT-45: tabuleiro original aceito');
      assert.equal(rMutada.erro, null, 'CT-45: tabuleiro mutado aceito');
      assert.notDeepEqual(rOriginal.tabuleiro, rMutada.tabuleiro,
        'CT-45: a mutacao precisa mudar o tabuleiro');
      assert.deepEqual(rOriginal.tabuleiro, tabuleiroCom(original),
        'CT-45: contagens originais');
      assert.deepEqual(rMutada.tabuleiro, tabuleiroCom(mutada),
        'CT-45: contagens apos mutacao');
      const [l, c] = original[0];
      assert.notEqual(rOriginal.tabuleiro[l][c], rMutada.tabuleiro[l][c],
        `CT-45: antiga posicao ${l},${c} mudou`);
      assert.notEqual(rOriginal.tabuleiro[mutada[0][0]][mutada[0][1]],
        -1, 'CT-45: nova posicao e segura');
    }
  });

verifica('CT-46', 'nenhum numero passa de 8 e casa com oito bombas vizinhas conta 8',
  () => {
    const bombas = [];
    for (let l = 6; l <= 8; l++) {
      for (let c = 6; c <= 8; c++) {
        if (l !== 7 || c !== 7) bombas.push([l, c]);
      }
    }
    const r = api.abrir(estadoCom(tabuleiroCom(bombas)), 0, 0);
    const muitos = Array.from({ length: 40 }, (_, i) => {
      const seed = 9000 + i * 11;
      const lista = geradorComSeed(seed)(252, [0, 0]);
      return api.abrir(estadoCom(null, { gerador: () => lista }), 0, 0);
    });
    return { r, muitos };
  },
  undefined, {
    apos: ({ r, muitos }) => {
      assert.equal(r.erro, null, 'CT-46: tabuleiro montado aceito');
      assert.equal(r.tabuleiro[7][7], 8, 'CT-46: oito bombas na vizinhança');
      assert.equal(r.tabuleiro[6][6], -1, 'CT-46: posicao do anel e bomba');
      muitos.forEach((resposta, i) => {
        assert.equal(resposta.erro, null, `CT-46: geracao ${i} aceita`);
        resposta.tabuleiro.flat().forEach((v, j) => {
          if (v !== -1) assert.ok(v >= 0 && v <= 8,
            `CT-46: numero fora da faixa em ${i}/${j}`);
        });
      });
    }
  });

// Oraculo independente: zeros conectados por vizinhança de 8, mais as casas
// numeradas adjacentes a eles. Nao abre bomba e nao atravessa numeradas.
const alcanceEsperado = (tabuleiro, linha, coluna) => {
  const abertas = matriz(false);
  const valor = tabuleiro[linha][coluna];
  if (valor === -1) return abertas;
  if (valor > 0) {
    abertas[linha][coluna] = true;
    return abertas;
  }
  const fila = [[linha, coluna]];
  abertas[linha][coluna] = true;
  while (fila.length) {
    const [l, c] = fila.shift();
    for (const [a, b] of vizinhos(l, c)) {
      if (abertas[a][b]) continue;
      if (tabuleiro[a][b] === 0) {
        abertas[a][b] = true;
        fila.push([a, b]);
      }
    }
  }
  const zeros = [];
  for (let l = 0; l < LINHAS; l++) {
    for (let c = 0; c < COLUNAS; c++) {
      if (abertas[l][c]) zeros.push([l, c]);
    }
  }
  for (const [l, c] of zeros) {
    for (const [a, b] of vizinhos(l, c)) {
      if (tabuleiro[a][b] > 0) abertas[a][b] = true;
    }
  }
  return abertas;
};

verifica('CT-47', 'flood fill abre exatamente os zeros conectados e suas bordas',
  () => Array.from({ length: 20 }, (_, i) => {
    const seed = 20000 + i * 17;
    const primeira = [i % LINHAS, (i * 3) % COLUNAS];
    const gerador = geradorComSeed(seed);
    const lista = gerador(252, primeira);
    const r = api.abrir(estadoCom(null, { gerador }), ...primeira);
    return {
      seed, primeira, tabuleiro: tabuleiroCom(lista), r,
      esperado: alcanceEsperado(tabuleiroCom(lista), ...primeira)
    };
  }),
  undefined, {
    apos: (casos) => {
      assert.equal(casos.length, 20, 'CT-47: vinte seeds');
      casos.forEach(({ seed, primeira, tabuleiro, r, esperado }, i) => {
        assert.equal(r.erro, null, `CT-47: abertura aceita ${i}`);
        assert.deepEqual(r.abertas, esperado,
          `CT-47: conjunto aberto (seed ${seed}, clique ${primeira})`);
        for (let l = 0; l < LINHAS; l++) {
          for (let c = 0; c < COLUNAS; c++) {
            if (tabuleiro[l][c] === -1) {
              assert.equal(r.abertas[l][c], false,
                `CT-47: bomba ${l},${c} nunca aberta ${i}`);
            }
          }
        }
      });
    }
  });
