import Link from "next/link";

import { CreateRoomForm } from "@/components/create-room-form";
import { hasSupabaseEnv } from "@/lib/env";

export default function HomePage() {
  const configured = hasSupabaseEnv();

  return (
    <main className="grain min-h-screen px-5 py-8 md:px-8 md:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col justify-between gap-8">
        <section className="paper-panel px-6 py-8 md:px-10 md:py-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <p className="font-mono text-xs uppercase tracking-[0.35em] text-black/55">
                Codenames Extended
              </p>
              <h1 className="mt-3 font-display text-5xl uppercase leading-none tracking-[0.02em] text-ink md:text-7xl">
                One board. Two teams. Hidden key.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-7 text-black/70 md:text-xl">
                A shareable room URL for the projector screen, with a local spymaster toggle for side
                laptops. Built for Vercel and Supabase, styled after the spare tabletop feel of
                Horsepaste rather than generic app chrome.
              </p>
            </div>
            <div className="rounded-[24px] border border-black/10 bg-[#efe2c4] px-5 py-4 shadow-card">
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-black/55">Game Flow</div>
              <div className="mt-3 flex items-center gap-3 text-sm text-black/75">
                <span className="rounded-full bg-redTeam px-3 py-1 font-semibold uppercase tracking-[0.2em] text-white">
                  Red
                </span>
                <span>vs</span>
                <span className="rounded-full bg-blueTeam px-3 py-1 font-semibold uppercase tracking-[0.2em] text-white">
                  Blue
                </span>
              </div>
              <p className="mt-3 max-w-xs text-sm leading-6 text-black/65">
                Starting team alternates each new game. Correct guesses keep the turn. Neutral,
                opponent, and assassin reveals resolve automatically.
              </p>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-6">
          <div className="paper-panel px-6 py-8 md:px-8">
            <div className="max-w-2xl">
              <p className="font-mono text-xs uppercase tracking-[0.35em] text-black/55">
                Room Control
              </p>
              <h2 className="mt-3 font-display text-3xl uppercase tracking-[0.04em] md:text-4xl">
                Open a shared room and keep the link stable
              </h2>
              <p className="mt-4 text-base leading-7 text-black/70">
                The public screen and all side computers use the same room URL. The default room key
                is <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px]">game-night</code>,
                and each device can pick public or spymaster view locally.
              </p>
            </div>

            <div className="mt-8">
              <CreateRoomForm configured={configured} />
            </div>
          </div>

          <div className="paper-panel px-6 py-8 md:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-black/55">Board Notes</p>
            <div className="mt-4 space-y-4 text-base leading-7 text-black/72">
              <p>
                Cards start neutral in public view and show their hidden ownership in spymaster view.
              </p>
              <p>
                The word pack is bundled locally and expanded beyond the base game with curated
                family-safe community lists.
              </p>
              <p>
                Realtime updates come from Supabase so every screen stays synced when cards are
                revealed or turns change.
              </p>
            </div>
            {!configured ? (
              <div className="mt-6 rounded-[22px] border border-amber-700/20 bg-amber-100/70 px-4 py-4 text-sm leading-6 text-amber-950">
                Supabase environment variables are missing. Add the keys from{" "}
                <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px]">.env.example</code> and
                apply{" "}
                <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px]">supabase/schema.sql</code>{" "}
                before running the live app.
              </div>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-black/60">
              <Link
                href="https://vercel.com"
                className="rounded-full border border-black/10 px-4 py-2 transition hover:border-black/20 hover:bg-white/45"
              >
                Deploy on Vercel
              </Link>
              <Link
                href="https://supabase.com"
                className="rounded-full border border-black/10 px-4 py-2 transition hover:border-black/20 hover:bg-white/45"
              >
                Create Supabase Project
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
