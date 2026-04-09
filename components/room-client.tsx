"use client";

import clsx from "clsx";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { getBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { BoardCard, GameState, RoomState, ViewMode } from "@/lib/types";

const VIEW_KEY_PREFIX = "codenames-view:";

interface RoomClientProps {
  initialRoom: RoomState;
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

export function RoomClient({ initialRoom }: RoomClientProps) {
  const [room, setRoom] = useState(initialRoom);
  const [viewMode, setViewMode] = useState<ViewMode>("operatives");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState(`/r/${initialRoom.slug}`);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setViewMode(readSavedView(initialRoom.slug));
  }, [initialRoom.slug]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(`${VIEW_KEY_PREFIX}${room.slug}`, viewMode);
  }, [room.slug, viewMode]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setShareUrl(window.location.href);
  }, [room.slug]);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `slug=eq.${room.slug}` },
        () => {
          void refreshRoom();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `room_id=eq.${room.id}` },
        () => {
          void refreshRoom();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [room.id, room.slug]);

  async function refreshRoom() {
    const response = await fetch(`/api/rooms/${room.slug}`, { cache: "no-store" });
    const payload = (await response.json()) as { room?: RoomState; error?: string };

    if (response.ok && payload.room) {
      setRoom(payload.room);
    }
  }

  async function sendAction(path: string, body?: object) {
    setFeedback(null);

    startTransition(async () => {
      const response = await fetch(path, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });

      const payload = (await response.json()) as { room?: RoomState; error?: string };

      if (!response.ok || !payload.room) {
        setFeedback(payload.error ?? "Action failed.");
        return;
      }

      setRoom(payload.room);
    });
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
            onClick={() => void sendAction(`/api/rooms/${room.slug}/new-game`)}
            className="mt-6 inline-flex rounded-full bg-ink px-5 py-3 font-mono text-sm uppercase tracking-[0.24em] text-white"
          >
            Create first board
          </button>
        </div>
      </main>
    );
  }

  const controlsDisabled = isPending || game.status !== "active";
  const readOnly = viewMode === "spymaster";
  const statusLabel =
    game.status === "finished" && game.winner
      ? `${game.winner.toUpperCase()} TEAM WINS`
      : `${game.currentTurn.toUpperCase()} TEAM TURN`;

  return (
    <main className="grain min-h-screen px-4 py-4 md:px-6 md:py-5">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4">
        <section className="paper-panel px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/"
                  className="rounded-full border border-black/10 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.24em] text-black/60 transition hover:bg-white/45"
                >
                  Home
                </Link>
                <span className="rounded-full bg-black/5 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.24em] text-black/65">
                  Room {room.slug}
                </span>
                <span
                  className={clsx(
                    "rounded-full px-3 py-1.5 font-mono text-xs uppercase tracking-[0.24em]",
                    game.status === "finished"
                      ? "bg-[#e7dcc3] text-black/75"
                      : game.currentTurn === "red"
                        ? "bg-redTeam text-white"
                        : "bg-blueTeam text-white"
                  )}
                >
                  {statusLabel}
                </span>
                <span className="rounded-full bg-black/5 px-3 py-1.5 font-mono text-xs uppercase tracking-[0.24em] text-black/65">
                  Starts: {game.startingTeam}
                </span>
              </div>
              <div>
                <h1 className="font-display text-3xl uppercase tracking-[0.05em] md:text-4xl">
                  Shared board, local key
                </h1>
                <p className="mt-2 max-w-4xl text-sm leading-6 text-black/65 md:text-base">
                  Use this same room link on the public screen and side computers. Public view is for
                  operatives. Spymaster view is read-only on this device and reveals the hidden key.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:items-end">
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
              <div className="rounded-[18px] border border-black/10 bg-white/55 px-4 py-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-black/50">
                  Share URL
                </div>
                <div className="mt-2 max-w-[360px] truncate text-sm text-black/70">{shareUrl}</div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      void navigator.clipboard.writeText(window.location.href);
                      setFeedback("Room URL copied to clipboard.");
                    }
                  }}
                  className="mt-3 rounded-full border border-black/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.24em] text-black/65 transition hover:bg-white/60"
                >
                  Copy link
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="paper-panel px-4 py-4 md:px-5">
            <div className="grid gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => void sendAction(`/api/rooms/${room.slug}/new-game`)}
                className="rounded-[18px] bg-ink px-4 py-3 font-display text-lg uppercase tracking-[0.08em] text-white transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPending ? "Working..." : "New Game"}
              </button>

              <button
                type="button"
                disabled={controlsDisabled || readOnly}
                onClick={() => void sendAction(`/api/rooms/${room.slug}/end-turn`)}
                className="rounded-[18px] border border-black/10 bg-white/65 px-4 py-3 font-mono text-sm uppercase tracking-[0.24em] text-black/75 transition hover:border-black/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                End Turn
              </button>

              <button
                type="button"
                disabled={controlsDisabled || readOnly || game.revealedAll}
                onClick={() => void sendAction(`/api/rooms/${room.slug}/reveal-all`)}
                className="rounded-[18px] border border-black/10 bg-white/65 px-4 py-3 font-mono text-sm uppercase tracking-[0.24em] text-black/75 transition hover:border-black/20 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {game.revealedAll ? "Board Revealed" : "Reveal Board"}
              </button>
            </div>

            <div className="mt-5 grid gap-3">
              <TeamPanel team="red" remaining={game.remaining.red} active={game.currentTurn === "red"} />
              <TeamPanel team="blue" remaining={game.remaining.blue} active={game.currentTurn === "blue"} />
            </div>

            <div className="mt-5 rounded-[20px] border border-black/10 bg-[#f2e5c9] px-4 py-4 text-sm leading-6 text-black/70">
              {readOnly ? (
                <p>Spymaster mode is read-only here to keep side-computer viewing safe.</p>
              ) : (
                <p>
                  Click unrevealed cards on the board. Correct team cards keep the turn. Wrong,
                  neutral, and assassin reveals resolve automatically.
                </p>
              )}
            </div>

            {feedback ? (
              <div className="mt-4 rounded-[18px] border border-red-900/10 bg-red-100/70 px-4 py-3 text-sm text-red-950">
                {feedback}
              </div>
            ) : null}
          </aside>

          <section className="paper-panel px-3 py-3 md:px-4 md:py-4">
            <div className="grid grid-cols-5 gap-2 md:gap-3">
              {game.cards.map((card) => (
                <CardButton
                  key={card.id}
                  card={card}
                  game={game}
                  viewMode={viewMode}
                  disabled={controlsDisabled || readOnly}
                  onReveal={(cardId) => void sendAction(`/api/rooms/${room.slug}/reveal`, { cardId })}
                />
              ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}

function TeamPanel({
  team,
  remaining,
  active
}: {
  team: "red" | "blue";
  remaining: number;
  active: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-[22px] border px-4 py-4 shadow-card transition",
        team === "red" ? "border-red-900/10 bg-red-100/80 text-red-950" : "border-blue-900/10 bg-blue-100/80 text-blue-950"
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] opacity-65">Team</div>
          <div className="mt-1 font-display text-2xl uppercase tracking-[0.06em]">{team}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-[11px] uppercase tracking-[0.28em] opacity-65">Remaining</div>
          <div className="mt-1 font-display text-3xl leading-none">{remaining}</div>
        </div>
      </div>
      <div className="mt-4">
        <span
          className={clsx(
            "rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.24em]",
            active ? "bg-black text-white" : "bg-black/10 text-black/60"
          )}
        >
          {active ? "Active turn" : "Waiting"}
        </span>
      </div>
    </div>
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
  const isInteractive = !disabled && !card.revealed && !game.revealedAll && game.status === "active";
  const styles = getCardStyles(card, viewMode, game.revealedAll);

  return (
    <button
      type="button"
      disabled={!isInteractive}
      onClick={() => onReveal(card.id)}
      className={clsx(
        "group flex aspect-[1.02/1] min-h-[86px] items-center justify-center rounded-[18px] border px-2 py-2 text-center shadow-card transition md:min-h-[112px] md:px-3",
        styles,
        isInteractive && "hover:-translate-y-0.5 hover:shadow-xl",
        !isInteractive && "cursor-default"
      )}
    >
      <span className="font-display text-lg uppercase leading-tight tracking-[0.06em] md:text-[1.45rem]">
        {card.word}
      </span>
    </button>
  );
}
