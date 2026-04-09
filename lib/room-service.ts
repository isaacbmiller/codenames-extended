import { buildGameState, endTurn, opposingTeam, revealAll, revealCard } from "@/lib/game-logic";
import { generateRoomSlug, normalizeRoomSlug } from "@/lib/slug";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BoardCard, GameState, RoomState, Team } from "@/lib/types";
import { WORDS } from "@/lib/words";

interface RoomRecord {
  id: string;
  slug: string;
  current_game_id: string | null;
  next_starting_team: Team;
  created_at: string;
  updated_at: string;
}

interface GameRecord {
  id: string;
  room_id: string;
  cards: BoardCard[];
  starting_team: Team;
  current_turn: Team;
  status: GameState["status"];
  winner: Team | null;
  remaining_red: number;
  remaining_blue: number;
  revealed_all: boolean;
  created_at: string;
  updated_at: string;
}

function mapGame(record: GameRecord): GameState {
  return {
    id: record.id,
    roomId: record.room_id,
    cards: record.cards,
    startingTeam: record.starting_team,
    currentTurn: record.current_turn,
    status: record.status,
    winner: record.winner,
    remaining: {
      red: record.remaining_red,
      blue: record.remaining_blue
    },
    revealedAll: record.revealed_all,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

function mapRoom(record: RoomRecord, game: GameRecord | null): RoomState {
  return {
    id: record.id,
    slug: record.slug,
    currentGame: game ? mapGame(game) : null,
    nextStartingTeam: record.next_starting_team,
    createdAt: record.created_at,
    updatedAt: record.updated_at
  };
}

async function getRoomRecordBySlug(slug: string): Promise<RoomRecord | null> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("rooms").select("*").eq("slug", slug).maybeSingle();

  if (error) {
    throw error;
  }

  return data as RoomRecord | null;
}

async function getGameRecord(gameId: string | null): Promise<GameRecord | null> {
  if (!gameId) {
    return null;
  }

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("games").select("*").eq("id", gameId).maybeSingle();

  if (error) {
    throw error;
  }

  return data as GameRecord | null;
}

async function updateGame(game: GameState): Promise<GameRecord> {
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .from("games")
    .update({
      cards: game.cards,
      current_turn: game.currentTurn,
      status: game.status,
      winner: game.winner,
      remaining_red: game.remaining.red,
      remaining_blue: game.remaining.blue,
      revealed_all: game.revealedAll
    })
    .eq("id", game.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as GameRecord;
}

async function createGameRecord(room: RoomRecord, startingTeam: Team): Promise<GameRecord> {
  const supabase = createServerSupabaseClient();
  const nextGame = buildGameState(WORDS, room.id, startingTeam);

  const { data, error } = await supabase
    .from("games")
    .insert({
      room_id: room.id,
      cards: nextGame.cards,
      starting_team: nextGame.startingTeam,
      current_turn: nextGame.currentTurn,
      status: nextGame.status,
      winner: nextGame.winner,
      remaining_red: nextGame.remaining.red,
      remaining_blue: nextGame.remaining.blue,
      revealed_all: nextGame.revealedAll
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data as GameRecord;
}

export async function fetchRoomStateBySlug(slug: string): Promise<RoomState | null> {
  const room = await getRoomRecordBySlug(slug);

  if (!room) {
    return null;
  }

  const game = await getGameRecord(room.current_game_id);
  return mapRoom(room, game);
}

export async function createRoom(preferredSlug?: string): Promise<RoomState> {
  const supabase = createServerSupabaseClient();
  const normalizedPreferredSlug = preferredSlug ? normalizeRoomSlug(preferredSlug) : "";

  if (preferredSlug && !normalizedPreferredSlug) {
    throw new Error("Room slug must include letters or numbers.");
  }

  if (normalizedPreferredSlug) {
    const existingRoom = await getRoomRecordBySlug(normalizedPreferredSlug);

    if (existingRoom) {
      if (existingRoom.current_game_id) {
        return {
          ...(await fetchRoomStateBySlug(existingRoom.slug))!
        };
      }

      return createNewGameForRoom(existingRoom.slug);
    }

    const { data, error } = await supabase
      .from("rooms")
      .insert({
        slug: normalizedPreferredSlug,
        next_starting_team: "red"
      })
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Unable to create room.");
    }

    return createNewGameForRoom((data as RoomRecord).slug);
  }

  let room: RoomRecord | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("rooms")
      .insert({
        slug: generateRoomSlug(),
        next_starting_team: "red"
      })
      .select("*")
      .single();

    if (!error && data) {
      room = data as RoomRecord;
      break;
    }
  }

  if (!room) {
    throw new Error("Unable to create a unique room slug.");
  }

  return createNewGameForRoom(room.slug);
}

export async function createNewGameForRoom(slug: string): Promise<RoomState> {
  const supabase = createServerSupabaseClient();
  const room = await getRoomRecordBySlug(slug);

  if (!room) {
    throw new Error("Room not found.");
  }

  const game = await createGameRecord(room, room.next_starting_team);
  const { error } = await supabase
    .from("rooms")
    .update({
      current_game_id: game.id,
      next_starting_team: opposingTeam(room.next_starting_team)
    })
    .eq("id", room.id);

  if (error) {
    throw error;
  }

  return {
    ...(await fetchRoomStateBySlug(slug))!
  };
}

export async function revealCardForRoom(slug: string, cardId: string): Promise<RoomState> {
  const room = await getRoomRecordBySlug(slug);

  if (!room?.current_game_id) {
    throw new Error("No active game found.");
  }

  const gameRecord = await getGameRecord(room.current_game_id);

  if (!gameRecord) {
    throw new Error("Current game not found.");
  }

  const nextGame = revealCard(mapGame(gameRecord), cardId).game;
  await updateGame(nextGame);
  return {
    ...(await fetchRoomStateBySlug(slug))!
  };
}

export async function endTurnForRoom(slug: string): Promise<RoomState> {
  const room = await getRoomRecordBySlug(slug);

  if (!room?.current_game_id) {
    throw new Error("No active game found.");
  }

  const gameRecord = await getGameRecord(room.current_game_id);

  if (!gameRecord) {
    throw new Error("Current game not found.");
  }

  await updateGame(endTurn(mapGame(gameRecord)));
  return {
    ...(await fetchRoomStateBySlug(slug))!
  };
}

export async function revealAllForRoom(slug: string): Promise<RoomState> {
  const room = await getRoomRecordBySlug(slug);

  if (!room?.current_game_id) {
    throw new Error("No active game found.");
  }

  const gameRecord = await getGameRecord(room.current_game_id);

  if (!gameRecord) {
    throw new Error("Current game not found.");
  }

  await updateGame(revealAll(mapGame(gameRecord)));
  return {
    ...(await fetchRoomStateBySlug(slug))!
  };
}
