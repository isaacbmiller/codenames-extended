import { CreateRoomForm } from "@/components/create-room-form";
import { hasSupabaseEnv } from "@/lib/env";

export default function HomePage() {
  const configured = hasSupabaseEnv();

  return (
    <main className="grain min-h-screen px-5 py-8 md:px-8 md:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <section className="paper-panel w-full px-6 py-8 md:px-10 md:py-10">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.35em] text-black/55">
                  Codenames Extended
                </p>
                <h1 className="mt-3 font-display text-5xl uppercase leading-none tracking-[0.02em] text-ink md:text-7xl">
                  Game Night
                </h1>
              </div>
              <div className="rounded-[24px] border border-black/10 bg-[#efe2c4] px-5 py-4 shadow-card">
                <div className="flex items-center gap-3 text-sm text-black/75">
                  <span className="rounded-full bg-redTeam px-3 py-1 font-semibold uppercase tracking-[0.2em] text-white">
                    Red
                  </span>
                  <span>vs</span>
                  <span className="rounded-full bg-blueTeam px-3 py-1 font-semibold uppercase tracking-[0.2em] text-white">
                    Blue
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-black/10 bg-white/40 px-5 py-5 md:px-6">
              <div className="font-mono text-xs uppercase tracking-[0.3em] text-black/45">Rooms</div>
              <div className="mt-5">
                <CreateRoomForm configured={configured} />
              </div>
            </div>

            {!configured ? (
              <div className="rounded-[22px] border border-amber-700/20 bg-amber-100/70 px-4 py-4 text-sm leading-6 text-amber-950">
                Add the Supabase env vars and run{" "}
                <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px]">supabase/schema.sql</code>.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
