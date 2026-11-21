'use strict';

// Suporte comum aos cinco arquivos de teste do Campo Minado.
// A implementacao de src/campoMinado.js deve ser escrita a partir da
// especificacao. Enquanto ela nao existe, cada chamada lanca com o stack real.

const test = require('node:test');
const assert = require('node:assert/strict');

let api;
try {
  api = require('../../src/campoMinado');
} catch (erro) {
  const detalhe = (erro && (erro.stack || erro.message)) || String(erro);
  api = {};
  for (const nome of ['criarPartida', 'abrir', 'marcar',
    'visao', 'status', 'reiniciar']) {
    api[nome] = () => {
      throw new Error('Crie src/campoMinado.js exportando ' + nome + '. ' + detalhe);
    };
  }
}
for (const nome of ['criarPartida', 'abrir', 'marcar',
  'visao', 'status', 'reiniciar']) {
  if (typeof api[nome] !== 'function') {
    const mensagem = 'Exporte ' + nome + ' de src/campoMinado.js';
    api[nome] = () => { throw new Error(mensagem); };
  }
}

// Copia generica: preserva funcoes, NaN, undefined e qualquer tipo de entrada.
const clonar = (v) => {
  if (Array.isArray(v)) return v.map(clonar);
  if (v && typeof v === 'object') {
    const out = {};
    for (const chave of Object.keys(v)) out[chave] = clonar(v[chave]);
    return out;
  }
  return v;
};

const LINHAS = 14;
const COLUNAS = 18;
const BOMBAS = 40;
const SEGURAS = 212;

const matriz = (valor) => Array.from(
  { length: LINHAS }, () => Array(COLUNAS).fill(valor));

// Estado montado diretamente, sem depender da implementacao, para que os
// cenarios possam ser definidos mesmo no estado RED.
const estadoCom = (tabuleiro = null, extras = {}) => ({
  tabuleiro,
  abertas: matriz(false),
  bandeiras: matriz(false),
  status: 'jogando',
  restantes: BOMBAS,
  erro: null,
  gerador: null,
  ...extras
});

const vizinhos = (linha, coluna) => {
  const out = [];
  for (let dl = -1; dl <= 1; dl++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dl === 0 && dc === 0) continue;
      const l = linha + dl;
      const c = coluna + dc;
      if (l >= 0 && l < LINHAS && c >= 0 && c < COLUNAS) out.push([l, c]);
    }
  }
  return out;
};

const contarVizinhos = (tabuleiro, linha, coluna) =>
  vizinhos(linha, coluna).filter(([l, c]) => tabuleiro[l][c] === -1).length;

// Monta um tabuleiro 14x18 a partir de uma lista de bombas [linha, coluna].
const tabuleiroCom = (bombas) => {
  const t = matriz(0);
  for (const [l, c] of bombas) t[l][c] = -1;
  for (let l = 0; l < LINHAS; l++) {
    for (let c = 0; c < COLUNAS; c++) {
      if (t[l][c] !== -1) t[l][c] = contarVizinhos(t, l, c);
    }
  }
  return t;
};

const contarAbertas = (abertas) => abertas.reduce(
  (total, linha) => total + linha.filter(Boolean).length, 0);

const contarBandeiras = (bandeiras) => bandeiras.reduce(
  (total, linha) => total + linha.filter(Boolean).length, 0);

// Recusa: so o campo erro pode mudar em relacao ao estado recebido.
const esperaRecusa = (original, motivo, retornado) => {
  assert.equal(retornado.erro, motivo, `erro deve ser '${motivo}'`);
  const esperado = clonar(original);
  esperado.erro = motivo;
  assert.deepEqual(retornado, esperado, 'so o campo erro pode mudar na recusa');
};

// Gerador determinístico (LCG) usado nos testes: 40 pares distintos, sempre
// excluindo a casa clicada. Sem Math.random e sem relogio.
const geradorComSeed = (seed) => (casas, primeiraJogada) => {
  const total = LINHAS * COLUNAS;
  let s = seed >>> 0;
  const usadas = new Set();
  if (primeiraJogada) usadas.add(`${primeiraJogada[0]},${primeiraJogada[1]}`);
  const lista = [];
  while (lista.length < BOMBAS) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const indice = s % total;
    const l = Math.floor(indice / COLUNAS);
    const c = indice % COLUNAS;
    const chave = `${l},${c}`;
    if (usadas.has(chave)) continue;
    usadas.add(chave);
    lista.push([l, c]);
  }
  return lista;
};

// verifica sempre clona as entradas antes da chamada e compara depois.
// esperado pode ser um valor (assert.equal/deepEqual) ou uma funcao de asserts.
const verifica = (id, descricao, acao, esperado, opcoes = {}) => {
  test(`${id} — ${descricao}`, () => {
    const entradas = (opcoes.entradas || []).map(clonar);
    const saida = acao();
    if (typeof esperado === 'function') {
      esperado(saida);
    } else if (esperado !== undefined) {
      if (opcoes.deep) {
        assert.deepEqual(saida, esperado, `${id}: retorno`);
      } else {
        assert.equal(saida, esperado, `${id}: ${descricao}`);
      }
    }
    entradas.forEach((antes, i) => {
      assert.deepEqual(
        opcoes.entradas[i], antes,
        `${id}: a entrada ${i + 1} nao pode ser alterada`
      );
    });
    if (opcoes.apos) opcoes.apos(saida);
  });
};

module.exports = {
  test, assert, api, verifica, clonar, estadoCom, matriz, vizinhos,
  contarVizinhos, tabuleiroCom, contarAbertas, contarBandeiras,
  esperaRecusa, geradorComSeed,
  LINHAS, COLUNAS, BOMBAS, SEGURAS
};
