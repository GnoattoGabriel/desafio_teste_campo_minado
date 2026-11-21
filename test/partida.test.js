'use strict';

// CT-38 a CT-41 — partidas completas, reinicio e visao do jogador.

const {
  api, verifica, assert, clonar, estadoCom, tabuleiroCom, matriz,
  contarAbertas, geradorComSeed, LINHAS, COLUNAS, BOMBAS
} = require('./support/helper');

// Estrategia deterministica: le o tabuleiro publico e abre, em ordem de leitura,
// toda casa segura ainda coberta. Nenhuma lista de jogadas e escrita a mao.
const jogarAteFim = (estado) => {
  let atual = estado;
  const estados = [];
  for (let l = 0; l < LINHAS; l++) {
    for (let c = 0; c < COLUNAS; c++) {
      if (atual.status !== 'jogando') break;
      if (atual.tabuleiro[l][c] === -1 || atual.abertas[l][c]) continue;
      const antes = clonar(atual);
      const r = api.abrir(atual, l, c);
      estados.push({ antes, entrada: atual, r, l, c });
      atual = r;
    }
  }
  return { atual, estados };
};

verifica('CT-38', 'partida completa ate vitoria com estrategia deterministica',
  () => {
    const gerador = geradorComSeed(101);
    const inicial = api.criarPartida({ gerador }).estado;
    const antesInicio = clonar(inicial);
    const primeiro = api.abrir(inicial, 7, 9);
    const jogo = jogarAteFim(primeiro);
    return { inicial, antesInicio, primeiro, jogo };
  },
  undefined, {
    apos: ({ inicial, antesInicio, primeiro, jogo }) => {
      const { atual, estados } = jogo;
      assert.deepEqual(inicial, antesInicio, 'CT-38: estado inicial intacto');
      assert.equal(primeiro.erro, null, 'CT-38: primeira jogada aceita');
      assert.ok(estados.length >= 1, 'CT-38: estrategia executou jogadas');
      estados.forEach(({ antes, entrada, r, l, c }, i) => {
        assert.equal(r.erro, null, `CT-38: sem erro no passo ${i}`);
        assert.deepEqual(entrada, antes, `CT-38: entrada ${i} intacta`);
        const ultimo = i === estados.length - 1;
        assert.equal(r.status, ultimo ? 'vitoria' : 'jogando',
          `CT-38: status no passo ${i} (${l},${c})`);
      });
      assert.equal(atual.status, 'vitoria', 'CT-38: terminou em vitoria');
      assert.equal(api.status(atual), 'vitoria', 'CT-38: status publico');
      assert.equal(atual.abertas.flat().filter(Boolean).length,
        LINHAS * COLUNAS - BOMBAS, 'CT-38: todas as casas seguras abertas');
    }
  });

verifica('CT-39', 'partida completa ate derrota com checagem em cada passo',
  () => {
    const gerador = geradorComSeed(202);
    const inicial = api.criarPartida({ gerador }).estado;
    const antesInicio = clonar(inicial);
    const primeiro = api.abrir(inicial, 0, 0);
    const antesPrimeiro = clonar(primeiro);

    // Uma casa segura ainda coberta, escolhida pela leitura do tabuleiro.
    let seguro = null;
    for (let l = 0; l < LINHAS && !seguro; l++) {
      for (let c = 0; c < COLUNAS && !seguro; c++) {
        if (primeiro.tabuleiro[l][c] !== -1 && !primeiro.abertas[l][c]) {
          seguro = [l, c];
        }
      }
    }
    assert.ok(seguro, 'CT-39: existe casa segura coberta');
    const segundo = api.abrir(primeiro, seguro[0], seguro[1]);

    let bomba = null;
    for (let l = 0; l < LINHAS && !bomba; l++) {
      for (let c = 0; c < COLUNAS && !bomba; c++) {
        if (segundo.tabuleiro[l][c] === -1) bomba = [l, c];
      }
    }
    assert.ok(bomba, 'CT-39: existe bomba no tabuleiro');
    const antesFinal = clonar(segundo);
    const final = api.abrir(segundo, bomba[0], bomba[1]);

    return {
      inicial, antesInicio, primeiro, antesPrimeiro, segundo,
      antesFinal, final
    };
  },
  undefined, {
    apos: (r) => {
      assert.deepEqual(r.inicial, r.antesInicio, 'CT-39: inicial intacto');
      assert.equal(r.primeiro.erro, null, 'CT-39: primeiro sem erro');
      assert.deepEqual(r.primeiro, r.antesPrimeiro, 'CT-39: primeiro não mutou');
      assert.equal(r.primeiro.status, 'jogando', 'CT-39: primeiro jogando');
      assert.equal(r.segundo.erro, null, 'CT-39: segundo sem erro');
      assert.equal(r.segundo.status, 'jogando', 'CT-39: derrota só no fim');
      assert.deepEqual(r.segundo, r.antesFinal, 'CT-39: penúltimo não mutou');
      assert.equal(r.final.erro, null, 'CT-39: abertura da bomba aceita');
      assert.equal(r.final.status, 'derrota', 'CT-39: derrota no ultimo passo');
      assert.equal(api.status(r.final), 'derrota', 'CT-39: status publico');
    }
  });

verifica('CT-40', 'reiniciar preserva o gerador e devolve estado inicial',
  () => {
    const gerador = geradorComSeed(303);
    const inicial = api.criarPartida({ gerador }).estado;
    const jogado = api.abrir(inicial, 5, 5);
    const antes = clonar(jogado);
    return {
      gerador,
      inicial,
      jogado,
      antes,
      aposDerrota: api.reiniciar(
        estadoCom(tabuleiroCom([[5, 5]]), { status: 'derrota' })),
      aposVitoria: api.reiniciar(
        estadoCom(tabuleiroCom([[5, 5]]), { status: 'vitoria' })),
      r: api.reiniciar(jogado),
      invalido: api.reiniciar(null)
    };
  },
  undefined, {
    apos: ({ gerador, inicial, jogado, antes, aposDerrota, aposVitoria, r, invalido }) => {
      assert.deepEqual(jogado, antes, 'CT-40: estado jogado intacto');
      [r, aposDerrota, aposVitoria].forEach((resposta, i) => {
        assert.equal(resposta.valida, true, `CT-40: reinicio valido ${i}`);
        assert.equal(resposta.motivo, '', `CT-40: sem motivo ${i}`);
        const e = resposta.estado;
        assert.equal(e.tabuleiro, null, `CT-40: tabuleiro nulo ${i}`);
        assert.deepEqual(e.abertas, matriz(false), `CT-40: abertas vazias ${i}`);
        assert.deepEqual(e.bandeiras, matriz(false), `CT-40: bandeiras vazias ${i}`);
        assert.equal(e.status, 'jogando', `CT-40: jogando ${i}`);
        assert.equal(e.restantes, BOMBAS, `CT-40: 40 restantes ${i}`);
        assert.equal(e.erro, null, `CT-40: sem erro ${i}`);
      });
      assert.equal(r.estado.gerador, gerador, 'CT-40: gerador preservado');
      assert.deepEqual(r.estado, inicial, 'CT-40: equivale ao estado inicial');
      assert.equal(invalido.valida, false, 'CT-40: estado invalido recusado');
      assert.equal(invalido.estado, null, 'CT-40: sem estado na recusa');
      assert.equal(invalido.motivo, 'estado invalido', 'CT-40: motivo');
    }
  });

const SEM_FIM_CT41 = estadoCom(tabuleiroCom([[5, 5]]));
SEM_FIM_CT41.abertas[0][0] = true;         // segura com numero 0
SEM_FIM_CT41.abertas[4][4] = true;         // segura com numero 1
SEM_FIM_CT41.bandeiras[7][7] = true;       // coberta marcada
SEM_FIM_CT41.restantes = BOMBAS - 1;

const VITORIA_CT41 = clonar(SEM_FIM_CT41);
VITORIA_CT41.status = 'vitoria';

const DERROTA_CT41 = clonar(SEM_FIM_CT41);
DERROTA_CT41.status = 'derrota';
DERROTA_CT41.abertas[5][5] = true;

verifica('CT-41', 'visao respeita os tokens antes do fim, na vitoria e na derrota',
  () => ({
    antes: api.visao(SEM_FIM_CT41),
    vitoria: api.visao(VITORIA_CT41),
    derrota: api.visao(DERROTA_CT41),
    inicial: api.visao(api.criarPartida().estado)
  }),
  undefined, {
    apos: ({ antes, vitoria, derrota, inicial }) => {
      [antes, vitoria, derrota, inicial].forEach((v, i) => {
        assert.equal(v.erro, null, `CT-41: visao valida ${i}`);
        assert.equal(v.tabuleiro.length, LINHAS, `CT-41: 14 linhas ${i}`);
        assert.ok(v.tabuleiro.every((linha) => linha.length === COLUNAS),
          `CT-41: 18 colunas ${i}`);
      });
      assert.equal(antes.tabuleiro[0][0], 0, 'CT-41: segura aberta mostra numero');
      assert.equal(antes.tabuleiro[4][4], 1, 'CT-41: outra segura com numero');
      assert.equal(antes.tabuleiro[7][7], 'bandeira', 'CT-41: marcada');
      assert.equal(antes.tabuleiro[6][6], null, 'CT-41: coberta sem bandeira');
      assert.equal(antes.tabuleiro[5][5], null, 'CT-41: bomba nao revelada antes');
      assert.equal(vitoria.tabuleiro[5][5], null,
        'CT-41: bomba continua oculta apos vitoria');
      assert.equal(vitoria.tabuleiro[7][7], 'bandeira',
        'CT-41: bandeira visivel apos vitoria');
      assert.equal(derrota.tabuleiro[5][5], 'explodida',
        'CT-41: bomba clicada');
      assert.equal(derrota.tabuleiro[4][4], 1,
        'CT-41: casas seguras continuam numeradas na derrota');
      assert.equal(inicial.tabuleiro.flat().every((v) => v === null), true,
        'CT-41: tabuleiro inicial todo coberto');
    }
  });
