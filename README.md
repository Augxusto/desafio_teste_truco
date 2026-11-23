# desafio_teste_truco
Aluno: Rodrigo Augusto da Silva Virgilino
RA: 24139528-2
## Especificação do Desafio

Este repositório contém os casos de teste em **JavaScript** utilizando **Jest** (abordagem **TDD**) para o desafio de **Truco Paulista de 2 duplas**, conforme a disciplina de Teste de Software:

- **Modalidade:** Partida para `4` jogadores, em `2` duplas (jogadores `0` e `2` contra `1` e `3`), com `3` cartas por jogador.
- **Regras principais:**
  * Baralho de `40` cartas (sem 8, 9 e 10). Ordem: `4 5 6 7 Q J K A 2 3`.
  * A `vira` define a `manilha` (carta seguinte na ordem, de forma circular). Entre manilhas: `paus > copas > espadas > ouros`.
  * Cada mão é decidida em até `3` vazas, com regras de empate (`empate` só ocorre entre equipes diferentes).
  * Apostas: `1 -> 3 (truco) -> 6 -> 9 -> 12`, com opções de `aceitar`, `correr` e `aumentar`. A equipe que fez a última aposta não pode aumentar a própria aposta.
  * Controle de turnos e condição de vitória ao atingir `12` pontos.
- **Linguagem e framework de teste:** JavaScript (`CommonJS`) com **Jest**.

---

## Funcionamento dos Casos de Teste

A suíte de testes está em `tests/truco.test.js` e valida `criarBaralho`, `embaralhar`, `distribuir`, `compararCartas`, `resolverMao`, `criarMao`, `podeJogarCarta`, `jogarCarta`, `podePedirAposta`, `pedirTruco`, `aceitarTruco`, `correrTruco`, `aumentarTruco`, `criarPartida` e `registrarMao`:

1. **Baralho:** Confirma 40 cartas únicas, sem 8, 9 e 10, embaralhamento determinístico (com seed) e distribuição de 3 cartas por jogador mais a vira.
2. **Inicialização para 2 duplas:** Confirma 4 jogadores com 3 cartas, mão valendo 1 e rejeita partidas com número de jogadores diferente de 4.
3. **Manilha:** Valida a manilha de cada vira, inclusive a circular (vira `3` => manilha `4`).
4. **Força das cartas:** Valida a ordem normal, manilhas acima das comuns e a ordem dos naipes entre manilhas.
5. **Resolução da mão:** Tabela com 20 combinações de vazas e empates (1ª empata, 2ª empata, 3ª empata, tudo empata).
6. **Jogadas e vazas:** Vencedor da vaza abre a próxima, empate entre equipes, cartas iguais de parceiros, erro ao jogar fora da vez ou com carta que não possui.
7. **Truco, seis, nove e doze:** Aceitar, correr, aumentar, escada completa até 12, bloqueio de aumento da própria aposta e respostas inválidas.
8. **Partida até 12 pontos:** Soma de pontos, limite de 12, definição do `vencedor` e bloqueio de mãos após o fim.
9. **Simulações:** 500 mãos aleatórias (seed fixa) e uma partida completa, verificando invariantes.

### Como executar os testes

```
npm install
npm test
```
