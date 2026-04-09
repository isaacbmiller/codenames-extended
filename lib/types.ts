export type Team = "red" | "blue";

export type CardRole = Team | "neutral" | "assassin";

export type GameStatus = "active" | "finished";

export type ViewMode = "operatives" | "spymaster";

export interface BoardCard {
  id: string;
  word: string;
  role: CardRole;
  revealed: boolean;
}

export interface RemainingCounts {
  red: number;
  blue: number;
}

export interface GameState {
  id: string;
  roomId: string;
  cards: BoardCard[];
  startingTeam: Team;
  currentTurn: Team;
  status: GameStatus;
  winner: Team | null;
  remaining: RemainingCounts;
  revealedAll: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomState {
  id: string;
  slug: string;
  currentGame: GameState | null;
  nextStartingTeam: Team;
  createdAt: string;
  updatedAt: string;
}

export interface RoomActionResult {
  room: RoomState;
}
