"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { BrowserSupabaseConfig } from "@/lib/env";
import { endTurn as applyEndTurn, revealCard as applyRevealCard } from "@/lib/game-logic";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { BoardCard, GameState, RoomState, ViewMode } from "@/lib/types";

const VIEW_KEY_PREFIX = "codenames-view:";

type PendingAction = "new-game" | "end-turn" | "reveal" | null;

interface RoomClientProps {
  initialRoom: RoomState;
  browserSupabaseConfig: BrowserSupabaseConfig;
}

function getCardStyles(card: BoardCard, viewMode: ViewMode, revealAll: boolean) {
  const showRole = viewMode === "spymaster" || card.revealed || revealAll;

  if (!showRole) {
    return "border-black/10 bg-[#fff5de] text-ink hover:bg-[#fffaf0]";
  }

  if (card.role === "red") {
    return card.revealed || revealAll
      ? "border-red-900/10 bg-redTeam text-white"
      : "border-red-800/15 bg-red-100 text-red-950";
  }

  if (card.role === "blue") {
    return card.revealed || revealAll
      ? "border-blue-950/10 bg-blueTeam text-white"
      : "border-blue-900/10 bg-blue-100 text-blue-950";
  }

  if (card.role === "assassin") {
    return "border-black/20 bg-assassin text-white";
  }

  return card.revealed || revealAll
    ? "border-[#a89262]/15 bg-neutral text-[#55472e]"
    : "border-[#a89262]/15 bg-[#f6ecd0] text-[#665537]";
}

function readSavedView(slug: string): ViewMode {
  if (typeof window === "undefined") {
    return "operatives";
  }

  const saved = window.localStorage.getItem(`${VIEW_KEY_PREFIX}${slug}`);
  return saved === "spymaster" ? "spymaster" : "operatives";
}

export function RoomClient({ initialRoom, browserSupabaseConfig }: RoomClientProps) {
  const [room, setRoom] = useState(initialRoom);
  const [viewMode, setViewMode] = useState<ViewMode>("operatives");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roomUrl, setRoomUrl] = useState(`/r/${initialRoom.slug}`);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const roomRef = useRef(room);
  const refreshTimeoutRef = useRef<number | null>(null);
  const refreshInFlightRef = useRef(false);
  const refreshQueuedRef = useRef(false);

  useEffect(() => {
    setViewMode(readSavedView(initialRoom.slug));
  }, [initialRoom.slug]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setRoomUrl(`${window.location.origin}/r/${room.slug}`);
  }, [room.slug]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(`${VIEW_KEY_PREFIX}${room.slug}`, viewMode);
  }, [room.slug, viewMode]);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current !== null) {
        window.clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient(browserSupabaseConfig);
    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `slug=eq.${room.slug}` },
        (payload) => {
          const currentRoom = roomRef.current;

          if (
            payload.eventType === "UPDATE" &&
            currentRoom.updatedAt === payload.new.updated_at &&
            currentRoom.currentGame?.id === payload.new.current_game_id &&
            currentRoom.nextStartingTeam === payload.new.next_starting_team
          ) {
            return;
          }

          scheduleRefreshRoom();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `room_id=eq.${room.id}` },
        (payload) => {
          const currentGame = roomRef.current.currentGame;

          if (
            payload.eventType === "UPDATE" &&
            currentGame &&
            currentGame.id === payload.new.id &&
            currentGame.updatedAt === payload.new.updated_at
          ) {
            return;
          }

          scheduleRefreshRoom();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [browserSupabaseConfig, room.id, room.slug]);

  async function refreshRoom() {
    if (refreshInFlightRef.current) {
      refreshQueuedRef.current = true;
      return;
    }

    refreshInFlightRef.current = true;
    try {
      const response = await fetch(`/api/rooms/${room.slug}`, { cache: "no-store" });
      const payload = (await response.json()) as { room?: RoomState; error?: string };

      if (response.ok && payload.room) {
        setRoom(payload.room);
      }
    } finally {
      refreshInFlightRef.current = false;

      if (refreshQueuedRef.current) {
        refreshQueuedRef.current = false;
        void refreshRoom();
      }
    }
  }

  function scheduleRefreshRoom(delay = 80) {
    if (typeof window === "undefined") {
      return;
    }

    if (refreshTimeoutRef.current !== null) {
      return;
    }

    refreshTimeoutRef.current = window.setTimeout(() => {
      refreshTimeoutRef.current = null;
      void refreshRoom();
    }, delay);
  }

  async function sendAction(
    path: string,
    options: {
      body?: object;
      optimisticRoom?: RoomState;
      pendingAction: Exclude<PendingAction, null>;
    }
  ) {
    setFeedback(null);
    setPendingAction(options.pendingAction);

    if (options.pendingAction === "new-game") {
      setMobileMenuOpen(false);
    }

    const previousRoom = roomRef.current;

    if (options.optimisticRoom) {
      setRoom(options.optimisticRoom);
    }

    try {
      const response = await fetch(path, {
        method: "POST",
        headers: options.body ? { "Content-Type": "application/json" } : undefined,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      const payload = (await response.json()) as { room?: RoomState; error?: string };

      if (!response.ok || !payload.room) {
        if (options.optimisticRoom) {
          setRoom(previousRoom);
        }
        setFeedback(payload.error ?? "Action failed.");
        return;
      }

      setRoom(payload.room);
    } catch {
      if (options.optimisticRoom) {
        setRoom(previousRoom);
      }
      setFeedback("Action failed.");
      void refreshRoom();
    } finally {
      setPendingAction(null);
    }
  }

  function revealCardOptimistically(cardId: string) {
    const currentGame = room.currentGame;

    if (!currentGame) {
      return;
    }

    const outcome = applyRevealCard(currentGame, cardId);

    if (!outcome.revealedCard) {
      return;
    }

    void sendAction(`/api/rooms/${room.slug}/reveal`, {
      body: { cardId },
      optimisticRoom: { ...room, currentGame: outcome.game },
      pendingAction: "reveal"
    });
  }

  function endTurnOptimistically() {
    const currentGame = room.currentGame;

    if (!currentGame) {
      return;
    }

    void sendAction(`/api/rooms/${room.slug}/end-turn`, {
      optimisticRoom: { ...room, currentGame: applyEndTurn(currentGame) },
      pendingAction: "end-turn"
    });
  }

  function createNewGame() {
    void sendAction(`/api/rooms/${room.slug}/new-game`, {
      pendingAction: "new-game"
    });
  }

  function copyRoomLink() {
    if (typeof window === "undefined") {
      return;
    }

    const url = `${window.location.origin}/r/${room.slug}`;
    void navigator.clipboard.writeText(url);
    setRoomUrl(url);
    setFeedback("Room link copied.");
  }

  const game = room.currentGame;
  if (!game) {
    return (
      <main className="grain flex min-h-screen items-center justify-center p-6">
        <div className="paper-panel max-w-lg px-8 py-10 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-black/55">No active game</p>
          <h1 className="mt-4 font-display text-4xl uppercase">This room is empty</h1>
          <button
            type="button"
            onClick={createNewGame}
            className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 font-mono text-sm uppercase tracking-[0.24em] text-white"
          >
            {pendingAction === "new-game" ? "Shuffling..." : "Create first board"}
          </button>
        </div>
      </main>
    );
  }

  const controlsDisabled = pendingAction !== null || game.status !== "active";
  const readOnly = viewMode === "spymaster";
  const winnerLabel = game.status === "finished" && game.winner ? `${game.winner.toUpperCase()} TEAM WINS` : null;

  return (
    <main className="grain min-h-screen px-4 py-4 md:px-6 md:py-5">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-4">
        <section className="paper-panel px-4 py-3 md:px-5">
          <div className="hidden items-center justify-between gap-4 md:flex">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <div className="flex min-w-0 flex-wrap items-center gap-2.5">
                <Link
                  href="/"
                  className="rounded-full border border-black/10 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.24em] text-black/60 transition hover:bg-white/45"
                >
                  Home
                </Link>
                <span className="rounded-full border border-black/10 bg-white/45 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.24em] text-black/65">
                  Room {room.slug}
                </span>
                {winnerLabel ? (
                  <span className="rounded-full bg-[#ded2b7] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.24em] text-black/75">
                    {winnerLabel}
                  </span>
                ) : null}
                <HeaderTeamBadge team="red" remaining={game.remaining.red} active={game.currentTurn === "red"} />
                <HeaderTeamBadge team="blue" remaining={game.remaining.blue} active={game.currentTurn === "blue"} />
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <div className="flex rounded-full border border-black/10 bg-white/55 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("operatives")}
                  className={clsx(
                    "rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.24em] transition",
                    viewMode === "operatives" ? "bg-ink text-white" : "text-black/65"
                  )}
                >
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("spymaster")}
                  className={clsx(
                    "rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.24em] transition",
                    viewMode === "spymaster" ? "bg-ink text-white" : "text-black/65"
                  )}
                >
                  Spymaster
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white/55 px-3 py-1.5">
                <span className="max-w-[320px] truncate font-mono text-[11px] tracking-[0.08em] text-black/60 xl:max-w-[420px]">
                  {roomUrl}
                </span>
                <button
                  type="button"
                  onClick={copyRoomLink}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/80 text-black/60 transition hover:bg-white hover:text-black"
                  aria-label="Copy room link"
                >
                  <CopyIcon />
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-black/45">
                  Room
                </div>
                <div className="mt-1 truncate font-mono text-sm uppercase tracking-[0.18em] text-black/70">
                  {room.slug}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen((value) => !value)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/60 text-black/70 transition hover:bg-white"
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
              >
                <span className="flex flex-col gap-1.5">
                  <span className="block h-[2px] w-4 rounded-full bg-current" />
                  <span className="block h-[2px] w-4 rounded-full bg-current" />
                  <span className="block h-[2px] w-4 rounded-full bg-current" />
                </span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {winnerLabel ? (
                <span className="rounded-full bg-[#ded2b7] px-3 py-1.5 font-mono text-xs uppercase tracking-[0.24em] text-black/75">
                  {winnerLabel}
                </span>
              ) : null}
              <HeaderTeamBadge team="red" remaining={game.remaining.red} active={game.currentTurn === "red"} mobile />
              <HeaderTeamBadge team="blue" remaining={game.remaining.blue} active={game.currentTurn === "blue"} mobile />
            </div>

            <div className="flex min-w-0 items-center gap-3">
              <div className="flex min-w-0 flex-1 rounded-full border border-black/10 bg-white/55 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("operatives")}
                  className={clsx(
                    "flex-1 rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.24em] transition",
                    viewMode === "operatives" ? "bg-ink text-white" : "text-black/65"
                  )}
                >
                  Public
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("spymaster")}
                  className={clsx(
                    "flex-1 rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.24em] transition",
                    viewMode === "spymaster" ? "bg-ink text-white" : "text-black/65"
                  )}
                >
                  Spymaster
                </button>
              </div>
            </div>

            {mobileMenuOpen ? (
              <div className="grid gap-2 rounded-[20px] border border-black/10 bg-white/45 p-3">
                <div className="flex items-center gap-2 rounded-[16px] border border-black/10 bg-white/70 px-3 py-2">
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] tracking-[0.06em] text-black/65">
                    {roomUrl}
                  </span>
                  <button
                    type="button"
                    onClick={copyRoomLink}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white/90 text-black/60 transition hover:bg-white hover:text-black"
                    aria-label="Copy room link"
                  >
                    <CopyIcon />
                  </button>
                </div>
                <Link
                  href="/"
                  className="rounded-full border border-black/10 bg-white/70 px-4 py-2 text-center font-mono text-xs uppercase tracking-[0.24em] text-black/65 transition hover:bg-white"
                >
                  Home
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        {feedback ? (
          <div className="rounded-[18px] border border-red-900/10 bg-red-100/70 px-4 py-3 text-sm text-red-950">
            {feedback}
          </div>
        ) : null}

        <section className="paper-panel relative px-3 py-3 md:px-4 md:py-4">
          <div className="mb-3 flex flex-col gap-3 px-1 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center justify-between gap-3">
              <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-black/45">
                Board
              </div>
              {readOnly ? (
                <span className="rounded-full bg-black/5 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em] text-black/60">
                  Read only
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={pendingAction !== null}
                onClick={createNewGame}
                className="rounded-full bg-ink px-4 py-2.5 font-mono text-xs uppercase tracking-[0.24em] text-white transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingAction === "new-game" ? "Shuffling..." : "New Game"}
              </button>

              <button
                type="button"
                disabled={controlsDisabled || readOnly}
                onClick={endTurnOptimistically}
                className="rounded-full border border-black/10 bg-white/65 px-4 py-2.5 font-mono text-xs uppercase tracking-[0.24em] text-black/75 transition hover:border-black/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingAction === "end-turn" ? "Ending..." : "End Turn"}
              </button>
            </div>
          </div>

          <div
            className={clsx(
              "grid grid-cols-5 gap-1.5 transition-opacity md:h-[calc(100dvh-13rem)] md:grid-rows-5 md:gap-3 lg:h-[calc(100dvh-12rem)]",
              pendingAction === "new-game" && "opacity-45"
            )}
            data-board-grid
          >
            {game.cards.map((card) => (
              <CardButton
                key={card.id}
                card={card}
                game={game}
                viewMode={viewMode}
                disabled={controlsDisabled || readOnly}
                onReveal={revealCardOptimistically}
              />
            ))}
          </div>

          {pendingAction === "new-game" ? (
            <div className="pointer-events-none absolute inset-x-6 top-24 flex justify-center md:top-28">
              <div className="rounded-full border border-black/10 bg-white/90 px-4 py-2 font-mono text-xs uppercase tracking-[0.24em] text-black/65 shadow-card">
                Shuffling new board
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="7" y="3" width="9" height="11" rx="2" />
      <path d="M5 7H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-1" />
    </svg>
  );
}

function HeaderTeamBadge({
  team,
  remaining,
  active,
  mobile = false
}: {
  team: "red" | "blue";
  remaining: number;
  active: boolean;
  mobile?: boolean;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-2 rounded-full border font-mono uppercase transition",
        mobile ? "px-2.5 py-1.5 text-[10px] tracking-[0.18em]" : "px-3 py-1.5 text-xs tracking-[0.24em]",
        team === "red"
          ? active
            ? "border-red-900/10 bg-redTeam text-white"
            : "border-red-900/10 bg-red-100/80 text-red-950"
          : active
            ? "border-blue-950/10 bg-blueTeam text-white"
            : "border-blue-900/10 bg-blue-100/80 text-blue-950"
      )}
    >
      <span>{team}</span>
      <span className={clsx("font-display leading-none", mobile ? "text-lg" : "text-xl")}>{remaining}</span>
      {active ? (
        <span
          className={clsx(
            "rounded-full font-mono uppercase",
            mobile ? "bg-white/20 px-1.5 py-0.5 text-[9px] tracking-[0.16em]" : "bg-white/20 px-2 py-0.5 text-[10px] tracking-[0.18em]"
          )}
        >
          Active
        </span>
      ) : null}
    </span>
  );
}

function CardButton({
  card,
  game,
  viewMode,
  disabled,
  onReveal
}: {
  card: BoardCard;
  game: GameState;
  viewMode: ViewMode;
  disabled: boolean;
  onReveal: (cardId: string) => void;
}) {
  const revealAll = game.revealedAll || game.status === "finished";
  const isInteractive = !disabled && !card.revealed && !revealAll && game.status === "active";
  const styles = getCardStyles(card, viewMode, revealAll);

  return (
    <button
      type="button"
      disabled={!isInteractive}
      onClick={() => onReveal(card.id)}
      data-card-button
      className={clsx(
        "group flex h-[58px] min-h-[58px] w-full min-w-0 items-center justify-center overflow-hidden rounded-[12px] border px-1 py-1 text-center shadow-[0_2px_5px_rgba(74,50,25,0.08)] transition md:h-full md:min-h-0 md:w-full md:rounded-[18px] md:px-3 md:py-2 md:shadow-card",
        styles,
        isInteractive && "hover:-translate-y-0.5 hover:shadow-xl",
        !isInteractive && "cursor-default"
      )}
    >
      <span
        className={clsx(
          "block min-w-0 max-w-full overflow-hidden font-display uppercase",
          getWordClass(card.word)
        )}
      >
        {card.word}
      </span>
    </button>
  );
}

function getWordClass(word: string) {
  const length = word.replace(/\s+/g, "").length;

  if (length > 13) {
    return "break-all text-[0.5rem] leading-[1.02] tracking-normal md:text-[0.9rem]";
  }

  if (length > 10) {
    return "break-all text-[0.56rem] leading-[1.03] tracking-normal md:text-[1rem]";
  }

  if (length > 8) {
    return "break-all text-[0.62rem] leading-[1.04] tracking-normal md:text-[1.08rem] md:tracking-[0.03em]";
  }

  if (length > 6) {
    return "text-[0.68rem] leading-[1.04] tracking-normal md:text-[1.14rem] md:tracking-[0.03em]";
  }

  return "text-[0.78rem] leading-[1.06] tracking-[0.01em] md:text-[1.3rem] md:tracking-[0.04em]";
}
