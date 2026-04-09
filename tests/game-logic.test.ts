import { buildBoard, buildGameState, endTurn, opposingTeam, revealCard } from "@/lib/game-logic";
import type { BoardCard, GameState } from "@/lib/types";

const WORDS = Array.from({ length: 50 }, (_, index) => `WORD-${index}`);

function makeGame(
  overrides: Partial<GameState> = {},
  cards: BoardCard[] = [
    { id: "red", word: "RED", role: "red", revealed: false },
    { id: "blue", word: "BLUE", role: "blue", revealed: false },
    { id: "neutral", word: "NEUTRAL", role: "neutral", revealed: false },
    { id: "assassin", word: "ASSASSIN", role: "assassin", revealed: false }
  ]
): GameState {
  return {
    id: "game-1",
    roomId: "room-1",
    cards,
    startingTeam: "red",
    currentTurn: "red",
    status: "active",
    winner: null,
    remaining: { red: 1, blue: 1 },
    revealedAll: false,
    createdAt: "2026-04-09T00:00:00.000Z",
    updatedAt: "2026-04-09T00:00:00.000Z",
    ...overrides
  };
}

describe("game logic", () => {
  it("builds a board with correct counts and unique words", () => {
    const board = buildBoard(WORDS, "red", () => 0.42);
    expect(board).toHaveLength(25);
    expect(new Set(board.map((card) => card.word)).size).toBe(25);

    const counts = board.reduce(
      (accumulator, card) => {
        accumulator[card.role] += 1;
        return accumulator;
      },
      { red: 0, blue: 0, neutral: 0, assassin: 0 }
    );

    expect(counts).toEqual({ red: 9, blue: 8, neutral: 7, assassin: 1 });
  });

  it("sets the starting team as the first active team", () => {
    const game = buildGameState(WORDS, "room-1", "blue", () => 0.33);
    expect(game.startingTeam).toBe("blue");
    expect(game.currentTurn).toBe("blue");
    expect(game.remaining).toEqual({ red: 8, blue: 9 });
  });

  it("keeps the turn after revealing the active team's word", () => {
    const result = revealCard(makeGame(), "red");
    expect(result.game.currentTurn).toBe("red");
    expect(result.turnEnded).toBe(false);
  });

  it("passes the turn after revealing a neutral word", () => {
    const result = revealCard(makeGame(), "neutral");
    expect(result.game.currentTurn).toBe("blue");
    expect(result.turnEnded).toBe(true);
  });

  it("passes the turn after revealing the opposing team's word", () => {
    const cards: BoardCard[] = [
      { id: "red", word: "RED", role: "red", revealed: false },
      { id: "blue-1", word: "BLUE 1", role: "blue", revealed: false },
      { id: "blue-2", word: "BLUE 2", role: "blue", revealed: false },
      { id: "neutral", word: "NEUTRAL", role: "neutral", revealed: false }
    ];
    const result = revealCard(makeGame({ remaining: { red: 1, blue: 2 } }, cards), "blue-1");
    expect(result.game.currentTurn).toBe("blue");
    expect(result.turnEnded).toBe(true);
  });

  it("awards the game to the opposing team on assassin reveal", () => {
    const result = revealCard(makeGame(), "assassin");
    expect(result.game.status).toBe("finished");
    expect(result.game.winner).toBe("blue");
  });

  it("wins immediately when a team finds its final card", () => {
    const cards: BoardCard[] = [
      { id: "red", word: "RED", role: "red", revealed: false },
      { id: "blue", word: "BLUE", role: "blue", revealed: false }
    ];
    const result = revealCard(makeGame({ remaining: { red: 1, blue: 1 } }, cards), "red");
    expect(result.game.status).toBe("finished");
    expect(result.game.winner).toBe("red");
  });

  it("switches teams on explicit end turn", () => {
    expect(endTurn(makeGame()).currentTurn).toBe("blue");
  });

  it("does nothing when revealing an already revealed card", () => {
    const game = makeGame({}, [{ id: "red", word: "RED", role: "red", revealed: true }]);
    const result = revealCard(game, "red");
    expect(result.game).toEqual(game);
  });

  it("returns the opposing team helper", () => {
    expect(opposingTeam("red")).toBe("blue");
    expect(opposingTeam("blue")).toBe("red");
  });
});
