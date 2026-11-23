'use strict';

/**
 * Truco Paulista - 4 jogadores, 2 duplas.
 * Jogadores 0 e 2 = equipe 0; jogadores 1 e 3 = equipe 1.
 *
 * Regras adotadas:
 *  - Baralho de 40 cartas (sem 8, 9, 10 e coringas).
 *  - Ordem normal (fraca -> forte): 4 5 6 7 Q J K A 2 3.
 *  - Manilha = carta seguinte à "vira" na ordem acima (circular).
 *  - Manilhas, da menor p/ maior: ouros < espadas < copas < paus.
 *  - Mão = melhor de 3 vazas. Apostas: 1 -> 3 -> 6 -> 9 -> 12.
 *  - Empate de vaza só ocorre se as melhores cartas forem de equipes diferentes.
 *  - Desempate da mão:
 *      1ª empata -> vence quem ganhar a 2ª (se a 2ª empatar, decide a 3ª;
 *                   se a 3ª empatar, vence a equipe da "mão");
 *      1ª decidida + 2ª empata -> vence quem ganhou a 1ª;
 *      1ª decidida, 2ª da outra equipe, 3ª empata -> vence quem ganhou a 1ª.
 *  - Partida até 12 pontos.
 */

const VALORES = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];
const NAIPES = ['ouros', 'espadas', 'copas', 'paus'];
const SEQUENCIA_APOSTAS = [1, 3, 6, 9, 12];
const PONTOS_VITORIA = 12;

const equipeDe = (jogador) => jogador % 2;

/* ----------------------------- baralho ----------------------------- */

function criarBaralho() {
  const baralho = [];
  for (const naipe of NAIPES) {
    for (const valor of VALORES) baralho.push({ valor, naipe });
  }
  return baralho;
}

function embaralhar(baralho, rng = Math.random) {
  const copia = baralho.map((c) => ({ ...c }));
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

function distribuir(baralho) {
  if (baralho.length < 13) throw new Error('Baralho insuficiente');
  const maos = [0, 1, 2, 3].map((j) => baralho.slice(j * 3, j * 3 + 3));
  return { maos, vira: baralho[12] };
}

/* ----------------------------- cartas ----------------------------- */

function valorManilha(vira) {
  return VALORES[(VALORES.indexOf(vira.valor) + 1) % VALORES.length];
}

function ehManilha(carta, vira) {
  return carta.valor === valorManilha(vira);
}

function forcaCarta(carta, vira) {
  if (ehManilha(carta, vira)) return 100 + NAIPES.indexOf(carta.naipe);
  return VALORES.indexOf(carta.valor);
}

/** 1 se a > b, -1 se a < b, 0 se empate. */
function compararCartas(a, b, vira) {
  return Math.sign(forcaCarta(a, vira) - forcaCarta(b, vira));
}

function proximaAposta(valor) {
  const i = SEQUENCIA_APOSTAS.indexOf(valor);
  if (i < 0 || i === SEQUENCIA_APOSTAS.length - 1) return null;
  return SEQUENCIA_APOSTAS[i + 1];
}

/**
 * vazas: equipe vencedora de cada vaza (null = empate).
 * Retorna a equipe vencedora da mão, ou null se ainda indefinida.
 */
function resolverMao(vazas, equipeMao) {
  const [v1, v2, v3] = vazas;
  if (v1 === undefined) return null;

  if (v1 !== null) {
    if (v2 === undefined) return null;
    if (v2 === null || v2 === v1) return v1;
    if (v3 === undefined) return null;
    return v3 === null ? v1 : v3;
  }

  if (v2 === undefined) return null;
  if (v2 !== null) return v2;
  if (v3 === undefined) return null;
  return v3 === null ? equipeMao : v3;
}

/* ----------------------------- mão ----------------------------- */

function criarMao({ maos, vira, primeiroJogador = 0 }) {
  if (!Array.isArray(maos) || maos.length !== 4) {
    throw new Error('O truco de duplas exige 4 jogadores');
  }
  return {
    maos: maos.map((m) => m.map((c) => ({ ...c }))),
    vira,
    maoJogador: primeiroJogador,
    vez: primeiroJogador,
    vazas: [],
    mesa: [],
    valor: 1,
    aposta: null, // { de: equipe, valor }
    ultimoAumento: null, // equipe da última aposta aceita
    finalizada: false,
    vencedor: null,
    pontos: 0,
  };
}

function finalizarMao(mao, equipe, pontos) {
  mao.finalizada = true;
  mao.vencedor = equipe;
  mao.pontos = pontos;
}

function exigirMaoAtiva(mao) {
  if (mao.finalizada) throw new Error('Mão já finalizada');
}

function exigirSemAposta(mao) {
  if (mao.aposta) throw new Error('Há uma aposta pendente');
}

function exigirResposta(mao, jogador) {
  exigirMaoAtiva(mao);
  if (!mao.aposta) throw new Error('Não há aposta pendente');
  if (equipeDe(jogador) === mao.aposta.de) {
    throw new Error('A própria equipe não pode responder à sua aposta');
  }
}

const mesmaCarta = (a, b) => a.valor === b.valor && a.naipe === b.naipe;

function podeJogarCarta(mao, jogador, carta) {
  if (mao.finalizada || mao.aposta) return false;
  if (jogador !== mao.vez) return false;
  return mao.maos[jogador].some((c) => mesmaCarta(c, carta));
}

function jogarCarta(mao, jogador, carta) {
  exigirMaoAtiva(mao);
  exigirSemAposta(mao);
  if (jogador !== mao.vez) throw new Error('Não é a vez do jogador');

  const idx = mao.maos[jogador].findIndex((c) => mesmaCarta(c, carta));
  if (idx < 0) throw new Error('Jogador não possui esta carta');

  const [jogada] = mao.maos[jogador].splice(idx, 1);
  mao.mesa.push({ jogador, carta: jogada });

  if (mao.mesa.length < 4) {
    mao.vez = (jogador + 1) % 4;
    return mao;
  }
  fecharVaza(mao);
  return mao;
}

function fecharVaza(mao) {
  const forcas = mao.mesa.map((j) => forcaCarta(j.carta, mao.vira));
  const max = Math.max(...forcas);
  const melhores = mao.mesa.filter((_, i) => forcas[i] === max);
  const equipes = new Set(melhores.map((j) => equipeDe(j.jogador)));

  let resultado;
  let proximo;
  if (equipes.size > 1) {
    resultado = null; // empate
    proximo = mao.mesa[0].jogador;
  } else {
    resultado = [...equipes][0];
    proximo = melhores[0].jogador;
  }

  mao.vazas.push(resultado);
  mao.mesa = [];

  const vencedor = resolverMao(mao.vazas, equipeDe(mao.maoJogador));
  if (vencedor !== null) finalizarMao(mao, vencedor, mao.valor);
  else mao.vez = proximo;
}

/* ----------------------------- apostas ----------------------------- */

function podePedirAposta(mao, jogador) {
  if (mao.finalizada || mao.aposta) return false;
  if (jogador !== mao.vez) return false;
  if (mao.ultimoAumento === equipeDe(jogador)) return false;
  return proximaAposta(mao.valor) !== null;
}

function pedirTruco(mao, jogador) {
  exigirMaoAtiva(mao);
  exigirSemAposta(mao);
  if (jogador !== mao.vez) throw new Error('Não é a vez do jogador');

  const equipe = equipeDe(jogador);
  if (mao.ultimoAumento === equipe) {
    throw new Error('A equipe não pode aumentar a própria aposta');
  }
  const prox = proximaAposta(mao.valor);
  if (prox === null) throw new Error('Valor máximo já atingido');

  mao.aposta = { de: equipe, valor: prox };
  return mao;
}

function aceitarTruco(mao, jogador) {
  exigirResposta(mao, jogador);
  mao.valor = mao.aposta.valor;
  mao.ultimoAumento = mao.aposta.de;
  mao.aposta = null;
  return mao;
}

function correrTruco(mao, jogador) {
  exigirResposta(mao, jogador);
  const quemPediu = mao.aposta.de;
  mao.aposta = null;
  finalizarMao(mao, quemPediu, mao.valor);
  return mao;
}

function aumentarTruco(mao, jogador) {
  exigirResposta(mao, jogador);
  const prox = proximaAposta(mao.aposta.valor);
  if (prox === null) throw new Error('Não é possível aumentar além de 12');

  mao.valor = mao.aposta.valor; // aceitou implicitamente
  mao.ultimoAumento = mao.aposta.de;
  mao.aposta = { de: equipeDe(jogador), valor: prox };
  return mao;
}

/* ----------------------------- partida ----------------------------- */

function criarPartida() {
  return { placar: [0, 0], vencedor: null };
}

function registrarMao(partida, equipe, pontos) {
  if (partida.vencedor !== null) throw new Error('Partida já encerrada');
  partida.placar[equipe] = Math.min(PONTOS_VITORIA, partida.placar[equipe] + pontos);
  const i = partida.placar.findIndex((p) => p >= PONTOS_VITORIA);
  partida.vencedor = i < 0 ? null : i;
  return partida;
}

module.exports = {
  VALORES,
  NAIPES,
  SEQUENCIA_APOSTAS,
  PONTOS_VITORIA,
  equipeDe,
  criarBaralho,
  embaralhar,
  distribuir,
  valorManilha,
  ehManilha,
  forcaCarta,
  compararCartas,
  proximaAposta,
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
};
