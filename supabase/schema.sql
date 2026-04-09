create extension if not exists pgcrypto;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  current_game_id uuid,
  next_starting_team text not null check (next_starting_team in ('red', 'blue')) default 'red',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  cards jsonb not null,
  starting_team text not null check (starting_team in ('red', 'blue')),
  current_turn text not null check (current_turn in ('red', 'blue')),
  status text not null check (status in ('active', 'finished')) default 'active',
  winner text check (winner in ('red', 'blue')),
  remaining_red integer not null,
  remaining_blue integer not null,
  revealed_all boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.rooms
  drop constraint if exists rooms_current_game_fk;

alter table public.rooms
  add constraint rooms_current_game_fk
  foreign key (current_game_id) references public.games(id) on delete set null;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists rooms_touch_updated_at on public.rooms;
create trigger rooms_touch_updated_at
before update on public.rooms
for each row execute function public.touch_updated_at();

drop trigger if exists games_touch_updated_at on public.games;
create trigger games_touch_updated_at
before update on public.games
for each row execute function public.touch_updated_at();

alter table public.rooms enable row level security;
alter table public.games enable row level security;

drop policy if exists "rooms are publicly readable" on public.rooms;
create policy "rooms are publicly readable"
on public.rooms
for select
using (true);

drop policy if exists "games are publicly readable" on public.games;
create policy "games are publicly readable"
on public.games
for select
using (true);

do $$
begin
  begin
    alter publication supabase_realtime add table public.rooms;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.games;
  exception
    when duplicate_object then null;
  end;
end;
$$;
