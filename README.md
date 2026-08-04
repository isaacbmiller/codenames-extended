# Codenames Extended

A Horsepaste-inspired Codenames clone for Vercel with:

- shared room URLs
- public and spymaster views on the same link
- red vs blue team gameplay
- realtime sync through Supabase
- a larger bundled English word pack than the base game

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres + Realtime
- Vitest

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Create a Supabase project.
3. Run the SQL in `supabase/schema.sql`.
4. Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Install dependencies with `npm install`.
6. Start the app with `npm run dev`.

## Deploy to Vercel

1. Import the project into Vercel.
2. Add the same three environment variables in the Vercel project settings.
3. Make sure the Supabase SQL schema has already been applied.
4. Deploy.

The `Supabase keep-alive` GitHub Actions workflow performs a minimal read from
Supabase daily so a Free-plan project has regular activity. It requires the
`SUPABASE_URL` and `SUPABASE_ANON_KEY` repository secrets. This is a best-effort
inactivity safeguard; upgrading to Supabase Pro is the only way to guarantee that
a project will not be paused for inactivity.

## Wordlist

The bundled word pack is generated from curated online Codenames-style source lists and deduplicated locally. Source attribution is recorded in `data/word-sources.md`.
