import Link from "next/link";
import { notFound } from "next/navigation";

import { RoomClient } from "@/components/room-client";
import { hasSupabaseEnv } from "@/lib/env";
import { fetchRoomStateBySlug } from "@/lib/room-service";

export const dynamic = "force-dynamic";

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!hasSupabaseEnv()) {
    return (
      <main className="grain flex min-h-screen items-center justify-center p-6">
        <div className="paper-panel max-w-xl px-8 py-10 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-black/55">Setup required</p>
          <h1 className="mt-4 font-display text-4xl uppercase">Missing Supabase environment</h1>
          <p className="mt-4 text-base leading-7 text-black/70">
            Add the values from <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px]">.env.example</code>,
            apply <code className="rounded bg-black/5 px-1.5 py-0.5 text-[13px]">supabase/schema.sql</code>,
            and redeploy.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-full border border-black/10 px-4 py-2 text-sm transition hover:bg-white/40"
          >
            Back home
          </Link>
        </div>
      </main>
    );
  }

  const room = await fetchRoomStateBySlug(slug);

  if (!room) {
    notFound();
  }

  return <RoomClient initialRoom={room} />;
}
