import type { BoardCard, CardRole, GameState, RemainingCounts, Team } from "@/lib/types";

export interface RevealOutcome {
  game: GameState;
  revealedCard: BoardCard | null;
  turnEnded: boolean;
  winningTeam: Team | null;
}

export function opposingTeam(team: Team): Team {
  return team === "red" ? "blue" : "red";
}

export function countRemaining(cards: BoardCard[]): RemainingCounts {
  return cards.reduce(
    (remaining, card) => {
      if (!card.revealed && card.role === "red") {
        remaining.red += 1;
      }

      if (!card.revealed && card.role === "blue") {
        remaining.blue += 1;
      }

      return remaining;
    },
    { red: 0, blue: 0 }
  );
}

function shuffle<T>(values: T[], random = Math.random): T[] {
  const next = [...values];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function createCardId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  return `card-${Math.random().toString(36).slice(2, 12)}`;
}

function buildRoleDeck(startingTeam: Team): CardRole[] {
  const otherTeam = opposingTeam(startingTeam);

  return [
    ...Array.from({ length: 9 }, () => startingTeam),
    ...Array.from({ length: 8 }, () => otherTeam),
    ...Array.from({ length: 7 }, () => "neutral" as const),
    "assassin"
  ];
}

export function buildBoard(words: string[], startingTeam: Team, random = Math.random): BoardCard[] {
  if (words.length < 25) {
    throw new Error("Need at least 25 unique words to build a board.");
  }

  const selectedWords = shuffle(words, random).slice(0, 25);
  const roles = shuffle(buildRoleDeck(startingTeam), random);

  return selectedWords.map((word, index) => ({
    id: createCardId(),
    word,
    role: roles[index],
    revealed: false
  }));
}

export function buildGameState(words: string[], roomId: string, startingTeam: Team, random = Math.random): Omit<GameState, "id" | "createdAt" | "updatedAt"> {
  const cards = buildBoard(words, startingTeam, random);
  const remaining = countRemaining(cards);

  return {
    roomId,
    cards,
    startingTeam,
    currentTurn: startingTeam,
    status: "active",
    winner: null,
    remaining,
    revealedAll: false
  };
}

export function endTurn(game: GameState): GameState {
  if (game.status !== "active") {
    return game;
  }

  return {
    ...game,
    currentTurn: opposingTeam(game.currentTurn)
  };
}

export function revealAll(game: GameState): GameState {
  return {
    ...game,
    revealedAll: true
  };
}

function finishGame(game: GameState, cards: BoardCard[], remaining: RemainingCounts, winner: Team): GameState {
  return {
    ...game,
    cards,
    remaining,
    status: "finished",
    winner,
    revealedAll: true
  };
}

export function revealCard(game: GameState, cardId: string): RevealOutcome {
  if (game.status !== "active") {
    return {
      game,
      revealedCard: null,
      turnEnded: false,
      winningTeam: game.winner
    };
  }

  const cardIndex = game.cards.findIndex((card) => card.id === cardId);

  if (cardIndex === -1 || game.cards[cardIndex].revealed) {
    return {
      game,
      revealedCard: null,
      turnEnded: false,
      winningTeam: game.winner
    };
  }

  const revealedCard: BoardCard = {
    ...game.cards[cardIndex],
    revealed: true
  };

  const cards = [...game.cards];
  cards[cardIndex] = revealedCard;

  const remaining = countRemaining(cards);
  const otherTeam = opposingTeam(game.currentTurn);

  if (revealedCard.role === "assassin") {
    return {
      game: finishGame(game, cards, remaining, otherTeam),
      revealedCard,
      turnEnded: true,
      winningTeam: otherTeam
    };
  }

  if (remaining.red === 0) {
    return {
      game: finishGame(game, cards, remaining, "red"),
      revealedCard,
      turnEnded: revealedCard.role !== "red",
      winningTeam: "red"
    };
  }

  if (remaining.blue === 0) {
    return {
      game: finishGame(game, cards, remaining, "blue"),
      revealedCard,
      turnEnded: revealedCard.role !== "blue",
      winningTeam: "blue"
    };
  }

  if (revealedCard.role === game.currentTurn) {
    return {
      game: {
        ...game,
        cards,
        remaining
      },
      revealedCard,
      turnEnded: false,
      winningTeam: null
    };
  }

  return {
    game: {
      ...game,
      cards,
      remaining,
      currentTurn: otherTeam
    },
    revealedCard,
    turnEnded: true,
    winningTeam: null
  };
}
