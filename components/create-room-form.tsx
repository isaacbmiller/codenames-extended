"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

import { normalizeRoomSlug } from "@/lib/slug";

interface CreateRoomFormProps {
  configured: boolean;
}

export function CreateRoomForm({ configured }: CreateRoomFormProps) {
  const router = useRouter();
  const [joinSlug, setJoinSlug] = useState("game-night");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleCreateRoom() {
    setError(null);

    if (!configured) {
      setError("Configure Supabase before creating a room.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/rooms", {
        method: "POST"
      });

      const payload = (await response.json()) as { room?: { slug: string }; error?: string };

      if (!response.ok || !payload.room) {
        setError(payload.error ?? "Could not create a room.");
        return;
      }

      router.push(`/r/${payload.room.slug}`);
    });
  }

  function handleJoinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleaned = normalizeRoomSlug(joinSlug);

    if (!cleaned) {
      setError("Enter a room slug to join.");
      return;
    }

    startTransition(async () => {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ slug: cleaned })
      });

      const payload = (await response.json()) as { room?: { slug: string }; error?: string };

      if (!response.ok || !payload.room) {
        setError(payload.error ?? "Could not open room.");
        return;
      }

      router.push(`/r/${payload.room.slug}`);
    });
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={handleCreateRoom}
        disabled={isPending || !configured}
        className="w-full rounded-[22px] bg-ink px-5 py-4 font-display text-xl uppercase tracking-[0.08em] text-white transition hover:-translate-y-0.5 hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Working..." : "New room"}
      </button>

      <form onSubmit={handleJoinRoom} className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={joinSlug}
          onChange={(event) => setJoinSlug(event.target.value)}
          placeholder="Enter room slug"
          className="rounded-[18px] border border-black/10 bg-white/75 px-4 py-3 text-base text-ink outline-none transition focus:border-black/30 focus:bg-white"
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-[18px] border border-black/10 px-5 py-3 font-mono text-sm uppercase tracking-[0.24em] transition hover:border-black/20 hover:bg-white/45"
        >
          Open room
        </button>
      </form>

      {error ? (
        <div className="rounded-[18px] border border-red-900/10 bg-red-100/70 px-4 py-3 text-sm text-red-950">
          {error}
        </div>
      ) : null}
    </div>
  );
}
