import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grain flex min-h-screen items-center justify-center p-6">
      <div className="paper-panel max-w-lg px-8 py-10 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-black/55">404</p>
        <h1 className="mt-4 font-display text-4xl uppercase">Room not found</h1>
        <p className="mt-4 text-base leading-7 text-black/70">
          This room slug does not exist or has not been created yet.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full border border-black/10 px-4 py-2 text-sm transition hover:bg-white/40"
        >
          Create or join a room
        </Link>
      </div>
    </main>
  );
}
