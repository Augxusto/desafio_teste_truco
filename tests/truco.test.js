'use strict';

const {
  NAIPES,
  equipeDe,
  criarBaralho,
  embaralhar,
  distribuir,
  valorManilha,
  ehManilha,
  forcaCarta,
  compararCartas,
  resolverMao,
  criarMao,
  podeJogarCarta,
  jogarCarta,
  podePedirAposta,
  pedirTruco,
  aceitarTruco,
  correrTruco,
  aumentarTruco,
  criarPartida,
  registrarMao,
} = require('../src/truco');

/* ------------------------- helpers ------------------------- */

const LETRA_NAIPE = { O: 'ouros', E: 'espadas', C: 'copas', P: 'paus' };

const c = (s) => ({ valor: s[0], naipe: LETRA_NAIPE[s[1]] });

function montar({ maos, vira, primeiro = 0 }) {
  return criarMao({
    maos: maos.map((m) => m.split(' ').map(c)),
    vira: c(vira),
    primeiroJogador: primeiro,
  });
}


function jogarVaza(mao, cartas) {
  const inicio = mao.vez;
  for (let i = 0; i < 4; i++) {
    const j = (inicio + i) % 4;
    jogarCarta(mao, j, c(cartas[j]));
  }
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAOS_BASE = ['3P 6C QO', '2C 4P JO', 'AO 7E KP', 'KE 4C 5E'];
const VIRA_BASE = '4O';
const baseMao = () => montar({ maos: MAOS_BASE, vira: VIRA_BASE });
const VAZA1_BASE = ['3P', '2C', 'AO', 'KE']; // p0 vence
const VAZA2_BASE = ['6C', '4P', '7E', '4C']; // p2 vence

/* ------------------------- 1. baralho ------------------------- */

describe('1. Baralho', () => {
  test('tem 40 cartas únicas', () => {
    const b = criarBaralho();
    expect(b).toHaveLength(40);
    expect(new Set(b.map((x) => x.valor + x.naipe)).size).toBe(40);
  });

  test('não contém 8, 9 e 10', () => {
    const valores = new Set(criarBaralho().map((x) => x.valor));
    expect(valores.has('8')).toBe(false);
    expect(valores.has('9')).toBe(false);
    expect(valores.has('10')).toBe(false);
    expect(valores.size).toBe(10);
  });

  test('tem 10 cartas de cada naipe', () => {
    const b = criarBaralho();
    for (const n of NAIPES) {
      expect(b.filter((x) => x.naipe === n)).toHaveLength(10);
    }
  });

  test('embaralhar não altera o original e preserva as cartas', () => {
    const original = criarBaralho();
    const snapshot = JSON.stringify(original);
    const emb = embaralhar(original, mulberry32(1));
    const chave = (x) => x.valor + x.naipe;
    expect(JSON.stringify(original)).toBe(snapshot);
    expect(emb).toHaveLength(40);
    expect(emb.map(chave).sort()).toEqual(original.map(chave).sort());
  });

  test('embaralhar é determinístico com a mesma seed e muda com outra', () => {
    const b = criarBaralho();
    expect(embaralhar(b, mulberry32(42))).toEqual(embaralhar(b, mulberry32(42)));
    expect(embaralhar(b, mulberry32(42))).not.toEqual(embaralhar(b, mulberry32(43)));
  });

  test('distribuir dá 3 cartas a cada um dos 4 jogadores e uma vira, sem repetição', () => {
    const { maos, vira } = distribuir(embaralhar(criarBaralho(), mulberry32(7)));
    expect(maos).toHaveLength(4);
    maos.forEach((m) => expect(m).toHaveLength(3));
    const todas = [...maos.flat(), vira].map((x) => x.valor + x.naipe);
    expect(new Set(todas).size).toBe(13);
  });

  test('distribuir falha com baralho insuficiente', () => {
    expect(() => distribuir(criarBaralho().slice(0, 10))).toThrow(/insuficiente/);
  });
});

/* ------------------------- 2. inicialização ------------------------- */

describe('2. Inicialização da mão (2 duplas)', () => {
  test('cria 4 jogadores com 3 cartas, valendo 1, sem aposta e sem vencedor', () => {
    const m = baseMao();
    expect(m.maos).toHaveLength(4);
    m.maos.forEach((cartas) => expect(cartas).toHaveLength(3));
    expect(m.valor).toBe(1);
    expect(m.aposta).toBeNull();
    expect(m.finalizada).toBe(false);
    expect(m.vencedor).toBeNull();
    expect(m.vazas).toEqual([]);
  });

  test('rejeita partidas com número de jogadores diferente de 4', () => {
    const maos2 = [[c('3P')], [c('2C')]];
    expect(() => criarMao({ maos: maos2, vira: c('4O') })).toThrow(/4 jogadores/);
    expect(() => criarMao({ maos: [[], [], [], [], []], vira: c('4O') })).toThrow(/4 jogadores/);
  });

  test('quem começa é o jogador indicado como mão', () => {
    const m = montar({ maos: MAOS_BASE, vira: VIRA_BASE, primeiro: 2 });
    expect(m.vez).toBe(2);
  });

  test('equipeDe: 0 e 2 são a equipe 0; 1 e 3 a equipe 1', () => {
    expect([0, 1, 2, 3].map(equipeDe)).toEqual([0, 1, 0, 1]);
  });
});

/* ------------------------- 3. manilha ------------------------- */

describe('3. Manilha', () => {
  const casos = [
    ['4', '5'],
    ['5', '6'],
    ['6', '7'],
    ['7', 'Q'],
    ['Q', 'J'],
    ['J', 'K'],
    ['K', 'A'],
    ['A', '2'],
    ['2', '3'],
    ['3', '4'], // circular
  ];

  test.each(casos)('vira %s => manilha %s', (vira, esperada) => {
    expect(valorManilha({ valor: vira, naipe: 'copas' })).toBe(esperada);
  });

  test('ehManilha identifica as 4 cartas do valor correto', () => {
    const vira = c('4O');
    const manilhas = criarBaralho().filter((x) => ehManilha(x, vira));
    expect(manilhas).toHaveLength(4);
    expect(manilhas.every((x) => x.valor === '5')).toBe(true);
  });
});

/* ------------------------- 4. força das cartas ------------------------- */

describe('4. Força das cartas', () => {
  test('ordem normal: 3 > 2 > A > K > J > Q > 7 > 6 > 4', () => {
    const vira = c('4O'); // manilha 5 (fora da sequência abaixo)
    const ordem = ['4', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
    for (let i = 0; i < ordem.length - 1; i++) {
      const fraca = { valor: ordem[i], naipe: 'copas' };
      const forte = { valor: ordem[i + 1], naipe: 'copas' };
      expect(compararCartas(forte, fraca, vira)).toBe(1);
    }
  });

  test('manilha vence qualquer carta comum, inclusive o 3', () => {
    const vira = c('4O');
    expect(compararCartas(c('5O'), c('3P'), vira)).toBe(1);
    expect(compararCartas(c('3P'), c('5O'), vira)).toBe(-1);
  });

  test('ordem dos naipes entre manilhas: paus > copas > espadas > ouros', () => {
    const vira = c('4O');
    expect(compararCartas(c('5P'), c('5C'), vira)).toBe(1);
    expect(compararCartas(c('5C'), c('5E'), vira)).toBe(1);
    expect(compararCartas(c('5E'), c('5O'), vira)).toBe(1);
  });

  test('cartas comuns de mesmo valor e naipes diferentes empatam', () => {
    expect(compararCartas(c('KP'), c('KO'), c('4O'))).toBe(0);
  });

  test('a manilha muda conforme a vira (vira 3 => o 4 vira manilha)', () => {
    expect(compararCartas(c('4O'), c('3P'), c('3O'))).toBe(1);
  });

  test('a própria carta da vira tem força comum', () => {
    const vira = c('7O'); // manilha Q
    expect(compararCartas(c('7O'), c('QO'), vira)).toBe(-1);
  });

  test('exatamente 4 manilhas ficam acima de todas as comuns, para toda vira', () => {
    const baralho = criarBaralho();
    for (const vira of baralho) {
      const manilhas = baralho.filter((x) => ehManilha(x, vira));
      const comuns = baralho.filter((x) => !ehManilha(x, vira));
      const minManilha = Math.min(...manilhas.map((x) => forcaCarta(x, vira)));
      const maxComum = Math.max(...comuns.map((x) => forcaCarta(x, vira)));
      expect(manilhas).toHaveLength(4);
      expect(minManilha).toBeGreaterThan(maxComum);
    }
  });

  test('compararCartas é antissimétrica', () => {
    const baralho = criarBaralho();
    const vira = c('QC');
    for (const a of baralho) {
      for (const b of baralho) {
        expect(compararCartas(a, b, vira) + compararCartas(b, a, vira)).toBe(0);
      }
    }
  });
});

/* ------------------------- 5. resolução da mão ------------------------- */

describe('5. resolverMao (melhor de 3 + empates)', () => {
  const tabela = [
    // [vazas, equipeMao, esperado, descrição]
    [[], 0, null, 'sem vazas'],
    [[0], 0, null, 'só a 1ª vaza'],
    [[0, 0], 1, 0, 'mesma equipe ganha 1ª e 2ª'],
    [[1, 1], 0, 1, 'equipe 1 ganha 1ª e 2ª'],
    [[0, 1], 0, null, '1x1 vai para a 3ª'],
    [[0, 1, 0], 0, 0, '3ª decide para equipe 0'],
    [[0, 1, 1], 0, 1, '3ª decide para equipe 1'],
    [[1, 0, 1], 0, 1, '3ª decide (equipe 1 após 1x1)'],
    [[0, 1, null], 1, 0, '3ª empata: vence quem ganhou a 1ª'],
    [[1, 0, null], 0, 1, '3ª empata: vence quem ganhou a 1ª (equipe 1)'],
    [[0, null], 1, 0, '2ª empata: vence quem ganhou a 1ª'],
    [[1, null], 0, 1, '2ª empata: vence a equipe 1 (ganhou a 1ª)'],
    [[null], 0, null, '1ª empata, aguarda'],
    [[null, 1], 0, 1, '1ª empata: 2ª decide'],
    [[null, 0], 1, 0, '1ª empata: 2ª decide (equipe 0)'],
    [[null, null], 0, null, '1ª e 2ª empatam, aguarda a 3ª'],
    [[null, null, 0], 1, 0, '3ª decide após dois empates'],
    [[null, null, 1], 0, 1, '3ª decide após dois empates (equipe 1)'],
    [[null, null, null], 0, 0, 'tudo empata: vence a equipe da mão (0)'],
    [[null, null, null], 1, 1, 'tudo empata: vence a equipe da mão (1)'],
  ];

  test.each(tabela)('%j (mão=%i) => %j — %s', (vazas, equipeMao, esperado) => {
    expect(resolverMao(vazas, equipeMao)).toBe(esperado);
  });
});

/* ------------------------- 6. jogadas e vazas ------------------------- */

describe('6. Jogadas e vazas', () => {
  test('a vez passa ao jogador seguinte (sentido circular)', () => {
    const m = baseMao();
    jogarCarta(m, 0, c('3P'));
    expect(m.vez).toBe(1);
    jogarCarta(m, 1, c('2C'));
    jogarCarta(m, 2, c('AO'));
    expect(m.vez).toBe(3);
  });

  test('equipe 0 vence em duas vazas e a mão vale 1 ponto', () => {
    const m = baseMao();
    jogarVaza(m, VAZA1_BASE);
    expect(m.finalizada).toBe(false);
    expect(m.vazas).toEqual([0]);
    expect(m.vez).toBe(0);
    jogarVaza(m, VAZA2_BASE);
    expect(m.finalizada).toBe(true);
    expect(m.vencedor).toBe(0);
    expect(m.pontos).toBe(1);
  });

  test('manilha vence a vaza e quem venceu abre a próxima', () => {
    const m = montar({
      maos: ['3P 6C QO', '5O 4P JO', '2C 7E KP', 'AE 4C KE'],
      vira: '4O',
    });
    jogarVaza(m, ['3P', '5O', '2C', 'AE']);
    expect(m.vazas).toEqual([1]);
    expect(m.vez).toBe(1);
  });

  test('entre manilhas, paus vence ouros', () => {
    const m = montar({
      maos: ['3P 6C QO', '5O 4P JO', '2C 7E KP', '5P 4C KE'],
      vira: '4O',
    });
    jogarVaza(m, ['3P', '5O', '2C', '5P']);
    expect(m.vazas).toEqual([1]); // jogador 3 (equipe 1)
    expect(m.vez).toBe(3);
  });

  test('empate entre equipes diferentes: a vaza empata e abre quem a iniciou', () => {
    const m = montar({
      maos: ['6C 3P 7E', '6E 3C QO', '4E 4C 7C', '4P 7P JP'],
      vira: '4O',
    });
    jogarVaza(m, ['6C', '6E', '4E', '4P']);
    expect(m.vazas).toEqual([null]);
    expect(m.vez).toBe(0);
    expect(m.finalizada).toBe(false);
  });

  test('empate na 1ª e vitória na 2ª: a 2ª decide a mão', () => {
    const m = montar({
      maos: ['6C 3P 7E', '6E 3C QO', '4E 4C 7C', '4P 7P JP'],
      vira: '4O',
    });
    jogarVaza(m, ['6C', '6E', '4E', '4P']);
    jogarVaza(m, ['7E', '3C', '4C', '7P']);
    expect(m.vazas).toEqual([null, 1]);
    expect(m.finalizada).toBe(true);
    expect(m.vencedor).toBe(1);
    expect(m.pontos).toBe(1);
  });

  test('cartas iguais entre parceiros não empatam: a dupla vence a vaza', () => {
    const m = montar({
      maos: ['6C 3P 7E', '4P 3C QO', '6E 4C 7C', '4E 7P JP'],
      vira: '4O',
      primeiro: 1,
    });
    jogarVaza(m, ['6C', '4P', '6E', '4E']); // joga p1, p2, p3, p0
    expect(m.vazas).toEqual([0]);
    expect(m.vez).toBe(2); // primeira das melhores cartas na mesa
  });

  test('três empates seguidos: vence a equipe da mão', () => {
    const maos = ['6C 7E QO', '6E 7C QP', '4E 4C 4P', '6P 7P QE'];
    const m = montar({ maos, vira: '4O', primeiro: 1 });
    jogarVaza(m, ['6C', '6E', '4E', '6P']);
    jogarVaza(m, ['7E', '7C', '4C', '7P']);
    jogarVaza(m, ['QO', 'QP', '4P', 'QE']);
    expect(m.vazas).toEqual([null, null, null]);
    expect(m.finalizada).toBe(true);
    expect(m.vencedor).toBe(1); // jogador 1 era a mão
  });

  test('jogador fora da vez gera erro', () => {
    expect(() => jogarCarta(baseMao(), 1, c('2C'))).toThrow(/vez/);
  });

  test('carta que o jogador não tem gera erro', () => {
    expect(() => jogarCarta(baseMao(), 0, c('AO'))).toThrow(/não possui/);
  });

  test('a mesma carta não pode ser jogada duas vezes', () => {
    const m = baseMao();
    jogarVaza(m, VAZA1_BASE);
    expect(() => jogarCarta(m, 0, c('3P'))).toThrow(/não possui/);
  });

  test('não é possível jogar depois da mão finalizada', () => {
    const m = baseMao();
    jogarVaza(m, VAZA1_BASE);
    jogarVaza(m, VAZA2_BASE);
    expect(() => jogarCarta(m, 0, c('QO'))).toThrow(/finalizada/);
  });

  test('cada jogador mantém as cartas não jogadas', () => {
    const m = baseMao();
    jogarVaza(m, VAZA1_BASE);
    m.maos.forEach((cartas) => expect(cartas).toHaveLength(2));
  });

  test('podeJogarCarta valida vez, posse da carta e aposta pendente', () => {
    const m = baseMao();
    expect(podeJogarCarta(m, 0, c('3P'))).toBe(true);
    expect(podeJogarCarta(m, 1, c('2C'))).toBe(false); // fora da vez
    expect(podeJogarCarta(m, 0, c('AO'))).toBe(false); // carta de outro jogador
    pedirTruco(m, 0);
    expect(podeJogarCarta(m, 0, c('3P'))).toBe(false); // aposta pendente
  });
});

/* ------------------------- 7. truco e apostas ------------------------- */

describe('7. Truco, seis, nove e doze', () => {
  test('mão começa valendo 1', () => {
    expect(baseMao().valor).toBe(1);
  });

  test('truco cria aposta pendente de 3 sem mudar o valor ainda', () => {
    const m = baseMao();
    pedirTruco(m, 0);
    expect(m.aposta).toEqual({ de: 0, valor: 3 });
    expect(m.valor).toBe(1);
  });

  test('aceitar o truco passa o valor da mão para 3 e limpa a aposta', () => {
    const m = baseMao();
    pedirTruco(m, 0);
    aceitarTruco(m, 1);
    expect(m.valor).toBe(3);
    expect(m.aposta).toBeNull();
  });

  test('mão aceita em truco e vencida vale 3 pontos', () => {
    const m = baseMao();
    pedirTruco(m, 0);
    aceitarTruco(m, 3);
    jogarVaza(m, VAZA1_BASE);
    jogarVaza(m, VAZA2_BASE);
    expect(m.vencedor).toBe(0);
    expect(m.pontos).toBe(3);
  });

  test('correr do truco dá 1 ponto à equipe que pediu', () => {
    const m = baseMao();
    pedirTruco(m, 0);
    correrTruco(m, 1);
    expect(m.finalizada).toBe(true);
    expect(m.vencedor).toBe(0);
    expect(m.pontos).toBe(1);
  });

  test('correr do seis dá 3 pontos à equipe que pediu seis', () => {
    const m = baseMao();
    pedirTruco(m, 0);
    aumentarTruco(m, 1); // aceita 3 e pede 6
    expect(m.valor).toBe(3);
    expect(m.aposta).toEqual({ de: 1, valor: 6 });
    correrTruco(m, 0);
    expect(m.vencedor).toBe(1);
    expect(m.pontos).toBe(3);
  });

  test('escada completa: truco -> seis -> nove -> doze', () => {
    const m = baseMao();
    pedirTruco(m, 0);
    aumentarTruco(m, 1);
    expect(m.aposta).toEqual({ de: 1, valor: 6 });
    aumentarTruco(m, 2);
    expect(m.valor).toBe(6);
    expect(m.aposta).toEqual({ de: 0, valor: 9 });
    aumentarTruco(m, 3);
    expect(m.valor).toBe(9);
    expect(m.aposta).toEqual({ de: 1, valor: 12 });
    aceitarTruco(m, 0);
    expect(m.valor).toBe(12);
    expect(m.aposta).toBeNull();
  });

  test('não é possível aumentar uma aposta de 12', () => {
    const m = baseMao();
    pedirTruco(m, 0);
    aumentarTruco(m, 1);
    aumentarTruco(m, 0);
    aumentarTruco(m, 1); // pede 12
    expect(() => aumentarTruco(m, 0)).toThrow(/além de 12/);
  });

  test('depois de aceito o 12, ninguém pode pedir mais', () => {
    const m = baseMao();
    pedirTruco(m, 0);
    aumentarTruco(m, 1);
    aumentarTruco(m, 0);
    aumentarTruco(m, 1);
    aceitarTruco(m, 0);
    expect(() => pedirTruco(m, 0)).toThrow(/máximo|própria/);
    expect(podePedirAposta(m, 0)).toBe(false);
  });

  test('a equipe que pediu truco não pode pedir seis em seguida', () => {
    const m = baseMao();
    pedirTruco(m, 0);
    aceitarTruco(m, 1);
    expect(() => pedirTruco(m, 0)).toThrow(/própria aposta/);
    expect(podePedirAposta(m, 0)).toBe(false);
  });

  test('a equipe adversária pode pedir seis na sua vez', () => {
    const m = baseMao();
    pedirTruco(m, 0);
    aceitarTruco(m, 1);
    jogarCarta(m, 0, c('3P'));
    expect(podePedirAposta(m, 1)).toBe(true);
    pedirTruco(m, 1);
    expect(m.aposta).toEqual({ de: 1, valor: 6 });
  });

  test('só é possível pedir truco na própria vez', () => {
    const m = baseMao();
    expect(() => pedirTruco(m, 1)).toThrow(/vez/);
    expect(podePedirAposta(m, 1)).toBe(false);
    expect(podePedirAposta(m, 0)).toBe(true);
  });

  test('não é possível jogar carta com aposta pendente', () => {
    const m = baseMao();
    pedirTruco(m, 0);
    expect(() => jogarCarta(m, 0, c('3P'))).toThrow(/pendente/);
  });

  test('não é possível pedir truco com outra aposta pendente', () => {
    const m = baseMao();
    pedirTruco(m, 0);
    expect(() => pedirTruco(m, 0)).toThrow(/pendente/);
  });

  test('o parceiro de quem pediu truco não pode responder', () => {
    const m = baseMao();
    pedirTruco(m, 0);
    expect(() => aceitarTruco(m, 2)).toThrow(/própria equipe/);
    expect(() => correrTruco(m, 0)).toThrow(/própria equipe/);
    expect(() => aumentarTruco(m, 2)).toThrow(/própria equipe/);
  });

  test('qualquer jogador da equipe adversária pode responder', () => {
    const m = baseMao();
    pedirTruco(m, 0);
    aceitarTruco(m, 3);
    expect(m.valor).toBe(3);
  });

  test('responder sem aposta pendente gera erro', () => {
    const m = baseMao();
    expect(() => aceitarTruco(m, 1)).toThrow(/Não há aposta/);
    expect(() => correrTruco(m, 1)).toThrow(/Não há aposta/);
    expect(() => aumentarTruco(m, 1)).toThrow(/Não há aposta/);
  });

  test('não é possível apostar depois da mão finalizada', () => {
    const m = baseMao();
    pedirTruco(m, 0);
    correrTruco(m, 1);
    expect(() => pedirTruco(m, 0)).toThrow(/finalizada/);
  });
});

/* ------------------------- 8. partida ------------------------- */

describe('8. Partida até 12 pontos', () => {
  test('começa em 0 x 0 sem vencedor', () => {
    const p = criarPartida();
    expect(p.placar).toEqual([0, 0]);
    expect(p.vencedor).toBeNull();
  });

  test('soma pontos por equipe', () => {
    const p = criarPartida();
    registrarMao(p, 0, 3);
    registrarMao(p, 1, 1);
    registrarMao(p, 0, 6);
    expect(p.placar).toEqual([9, 1]);
    expect(p.vencedor).toBeNull();
  });

  test('vence ao atingir 12 pontos', () => {
    const p = criarPartida();
    registrarMao(p, 1, 9);
    registrarMao(p, 1, 3);
    expect(p.vencedor).toBe(1);
  });

  test('o placar não passa de 12', () => {
    const p = criarPartida();
    registrarMao(p, 0, 9);
    registrarMao(p, 0, 6);
    expect(p.placar[0]).toBe(12);
  });

  test('não aceita mãos após o fim da partida', () => {
    const p = criarPartida();
    registrarMao(p, 0, 12);
    expect(() => registrarMao(p, 1, 1)).toThrow(/encerrada/);
  });
});

/* ------------------------- 9. simulações ------------------------- */

describe('9. Simulações com baralhos aleatórios (seed fixa)', () => {
  test('500 mãos terminam em 2 ou 3 vazas com vencedor válido', () => {
    for (let seed = 1; seed <= 500; seed++) {
      const rng = mulberry32(seed);
      const { maos, vira } = distribuir(embaralhar(criarBaralho(), rng));
      const mao = criarMao({ maos, vira, primeiroJogador: seed % 4 });

      let jogadas = 0;
      while (!mao.finalizada) {
        const j = mao.vez;
        jogarCarta(mao, j, mao.maos[j][0]);
        jogadas++;
        if (jogadas > 12) throw new Error(`seed ${seed}: mão não terminou`);
      }

      expect(mao.vazas.length).toBeGreaterThanOrEqual(2);
      expect(mao.vazas.length).toBeLessThanOrEqual(3);
      expect([0, 1]).toContain(mao.vencedor);
      expect(mao.pontos).toBe(1);
      expect(jogadas).toBe(mao.vazas.length * 4);
      expect(mao.mesa).toHaveLength(0);
    }
  });

  test('partida simulada termina com exatamente um vencedor em 12 pontos', () => {
    const rng = mulberry32(2024);
    const partida = criarPartida();
    let maosJogadas = 0;

    while (partida.vencedor === null) {
      const { maos, vira } = distribuir(embaralhar(criarBaralho(), rng));
      const mao = criarMao({ maos, vira, primeiroJogador: maosJogadas % 4 });
      // pede truco aleatoriamente e a outra equipe sempre aceita
      if (rng() < 0.3) {
        pedirTruco(mao, mao.vez);
        aceitarTruco(mao, (mao.vez + 1) % 4);
      }
      while (!mao.finalizada) {
        const j = mao.vez;
        jogarCarta(mao, j, mao.maos[j][0]);
      }
      registrarMao(partida, mao.vencedor, mao.pontos);
      maosJogadas++;
      if (maosJogadas >= 200) throw new Error('partida não terminou');
    }

    expect(partida.placar).toContain(12);
    expect(partida.placar.every((p) => p <= 12)).toBe(true);
  });
});
