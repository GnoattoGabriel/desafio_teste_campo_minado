'use strict';

// CT-32 a CT-37 — bandeiras, contador, limites e fim de partida.

const {
  api, verifica, assert, clonar, estadoCom, tabuleiroCom,
  contarBandeiras, esperaRecusa, geradorComSeed, BOMBAS
} = require('./support/helper');

verifica('CT-32', 'marcar casa coberta antes e depois do primeiro abrir',
  () => {
    const inicial = api.criarPartida({ gerador: geradorComSeed(3) }).estado;
    const antes = clonar(inicial);
    const marcadaAntes = api.marcar(inicial, 0, 0);
    const gerado = api.abrir(inicial, 7, 7);
    const marcadaDepois = api.marcar(gerado, 2, 3);
    return { inicial, antes, marcadaAntes, gerado, marcadaDepois };
  },
  undefined, {
    apos: ({ inicial, antes, marcadaAntes, gerado, marcadaDepois }) => {
      assert.equal(marcadaAntes.erro, null, 'CT-32: marcar antes do abrir');
      assert.equal(marcadaAntes.bandeiras[0][0], true, 'CT-32: bandeira antes');
      assert.equal(marcadaAntes.restantes, BOMBAS - 1, 'CT-32: 39 restantes');
      assert.equal(marcadaAntes.tabuleiro, null, 'CT-32: tabuleiro continua nulo');
      assert.equal(marcadaAntes.status, 'jogando', 'CT-32: ainda jogando');
      assert.deepEqual(inicial, antes, 'CT-32: entrada intacta');

      assert.equal(gerado.erro, null, 'CT-32: primeiro abrir aceito');
      assert.equal(marcadaDepois.erro, null, 'CT-32: marcar depois do abrir');
      assert.equal(marcadaDepois.bandeiras[2][3], true, 'CT-32: bandeira depois');
      assert.equal(marcadaDepois.restantes, BOMBAS - 1, 'CT-32: 39 restantes');
      assert.equal(contarBandeiras(marcadaDepois.bandeiras), 1,
        'CT-32: exatamente uma bandeira');
      const esperado = clonar(gerado);
      esperado.bandeiras[2][3] = true;
      esperado.restantes = BOMBAS - 1;
      assert.deepEqual(marcadaDepois, esperado,
        'CT-32: so a bandeira e o contador mudam');
    }
  });

const MARCADA_CT33 = estadoCom(tabuleiroCom([[5, 5]]));
MARCADA_CT33.bandeiras[4][4] = true;
MARCADA_CT33.restantes = BOMBAS - 1;

verifica('CT-33', 'marcar de novo desmarca e devolve o contador',
  () => {
    const antes = clonar(MARCADA_CT33);
    const r = api.marcar(MARCADA_CT33, 4, 4);
    return { antes, r, entrada: MARCADA_CT33 };
  },
  undefined, {
    apos: ({ antes, r, entrada }) => {
      assert.equal(r.erro, null, 'CT-33: sem erro');
      assert.equal(r.bandeiras[4][4], false, 'CT-33: volta a coberta');
      assert.equal(r.restantes, BOMBAS, 'CT-33: 40 restantes');
      assert.equal(contarBandeiras(r.bandeiras), 0, 'CT-33: nenhuma bandeira');
      assert.deepEqual(entrada, antes, 'CT-33: entrada intacta');
    }
  });

const ABERTA_CT34 = estadoCom(tabuleiroCom([[5, 5]]));
ABERTA_CT34.abertas[3][4] = true;

verifica('CT-34', 'marcar casa aberta e coordenada invalida sao recusados',
  () => {
    const rAberta = api.marcar(ABERTA_CT34, 3, 4);
    const coords = [[-1, 0], [14, 0], [0, 18], [1.5, 2], ['1', 2], [null, 0], [NaN, 0]];
    const rCoords = coords.map(([l, c]) => api.marcar(ABERTA_CT34, l, c));
    return { rAberta, rCoords };
  },
  undefined, {
    apos: ({ rAberta, rCoords }) => {
      esperaRecusa(ABERTA_CT34, 'casa aberta', rAberta);
      assert.equal(contarBandeiras(rAberta.bandeiras), 0,
        'CT-34: nenhuma bandeira criada');
      assert.equal(rCoords.length, 7, 'CT-34: sete coordenadas invalidas');
      rCoords.forEach((r, i) => {
        // A casa [3,4] esta aberta, mas a coordenada invalida tem prioridade.
        assert.equal(r.erro, 'coordenada invalida', `CT-34: recusa coord ${i}`);
        assert.equal(contarBandeiras(r.bandeiras), 0, `CT-34: nada marcado ${i}`);
      });
    }
  });

verifica('CT-35', 'comportamento classico: 45 bandeiras aceitas e contador negativo',
  () => {
    const e = estadoCom(tabuleiroCom([[13, 13]]));
    let atual = e;
    for (let i = 0; i < 45; i++) {
      const l = Math.floor(i / 18);
      const c = i % 18;
      atual = api.marcar(atual, l, c);
    }
    const antes46 = clonar(atual);
    const r46 = api.marcar(atual, 2, 9);
    return { e, antes: clonar(e), atual, antes46, r46 };
  },
  undefined, {
    apos: ({ e, antes, atual, antes46, r46 }) => {
      assert.deepEqual(e, antes, 'CT-35: entrada original intacta');
      assert.equal(atual.erro, null, 'CT-35: 45 bandeiras sem erro');
      assert.equal(contarBandeiras(atual.bandeiras), 45,
        'CT-35: exatamente 45 bandeiras');
      assert.equal(atual.restantes, BOMBAS - 45,
        'CT-35: contador -5 (pode ser negativo)');
      assert.equal(r46.erro, null, 'CT-35: 46a bandeira tambem aceita');
      assert.equal(contarBandeiras(r46.bandeiras), 46,
        'CT-35: nenhum limite de bandeiras');
      assert.equal(r46.restantes, BOMBAS - 46, 'CT-35: contador -6');
      const esperado = clonar(antes46);
      esperado.bandeiras[2][9] = true;
      esperado.restantes = BOMBAS - 46;
      assert.deepEqual(r46, esperado,
        'CT-35: so a bandeira e o contador mudaram');
    }
  });

const BOMBA_CT36 = estadoCom(tabuleiroCom([[5, 5]]));

verifica('CT-36', 'bandeira em bomba nao protege: desmarcar e abrir ainda da derrota',
  () => {
    const antes = clonar(BOMBA_CT36);
    const marcada = api.marcar(BOMBA_CT36, 5, 5);
    const visaoMarcada = api.visao(marcada);
    const desmarcada = api.marcar(marcada, 5, 5);
    const aberta = api.abrir(desmarcada, 5, 5);
    const visaoFinal = api.visao(aberta);
    return { antes, marcada, visaoMarcada, desmarcada, aberta, visaoFinal };
  },
  undefined, {
    apos: ({ antes, marcada, visaoMarcada, desmarcada, aberta, visaoFinal }) => {
      assert.deepEqual(BOMBA_CT36, antes, 'CT-36: entrada intacta');
      assert.equal(marcada.erro, null, 'CT-36: marcar aceito');
      assert.equal(marcada.status, 'jogando', 'CT-36: marcar nao decide');
      assert.equal(visaoMarcada.tabuleiro[5][5], 'bandeira',
        'CT-36: bandeira visivel antes do fim');
      assert.equal(desmarcada.erro, null, 'CT-36: desmarcar aceito');
      assert.equal(desmarcada.bandeiras[5][5], false, 'CT-36: bomba desmarcada');
      assert.equal(desmarcada.restantes, BOMBAS, 'CT-36: contador devolvido');
      assert.equal(aberta.erro, null, 'CT-36: abrir aceito');
      assert.equal(aberta.status, 'derrota', 'CT-36: bomba explode');
      assert.equal(visaoFinal.tabuleiro[5][5], 'explodida',
        'CT-36: bomba clicada revelada');
    }
  });

verifica('CT-37', 'bandeiras nao sao vitoria e marcar apos o fim e recusado',
  () => {
    const e = estadoCom(tabuleiroCom([[5, 5]]));
    let atual = e;
    for (let i = 0; i < BOMBAS; i++) {
      const l = Math.floor(i / 18);
      const c = i % 18;
      atual = api.marcar(atual, l, c);
    }
    const derrota = estadoCom(tabuleiroCom([[5, 5]]), { status: 'derrota' });
    const vitoria = estadoCom(tabuleiroCom([[5, 5]]), { status: 'vitoria' });
    return {
      e, antes: clonar(e), marcadas: atual, status: api.status(atual),
      rDerrota: api.marcar(derrota, 0, 0),
      rVitoria: api.marcar(vitoria, 0, 0),
      rInvalido: api.marcar(null, 0, 0)
    };
  },
  undefined, {
    apos: ({ e, antes, marcadas, status, rDerrota, rVitoria, rInvalido }) => {
      assert.deepEqual(e, antes, 'CT-37: entrada intacta');
      assert.equal(marcadas.erro, null, 'CT-37: bandeiras aceitas');
      assert.equal(status, 'jogando', 'CT-37: bandeiras nao geram vitoria');
      assert.equal(marcadas.status, 'jogando', 'CT-37: estado segue jogando');
      assert.equal(rDerrota.erro, 'partida encerrada', 'CT-37: apos derrota');
      assert.equal(rVitoria.erro, 'partida encerrada', 'CT-37: apos vitoria');
      assert.equal(rInvalido.erro, 'estado invalido', 'CT-37: estado invalido');
    }
  });
