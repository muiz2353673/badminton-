-- North London Tournament – Supabase schema
-- Run this in Supabase Dashboard → SQL Editor

-- Tournaments
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  start_date date,
  end_date date,
  status text default 'upcoming' check (status in ('upcoming', 'ongoing', 'completed')),
  location text,
  details jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Venues (Woodhouse, Wren, etc.)
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  court_count int default 4,
  address text,
  created_at timestamptz default now()
);

-- Registrations (players per tournament + event)
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  age_group text not null check (age_group in ('U11', 'U13', 'U15', 'U17', 'U19', 'Senior')),
  event text not null,
  partner_name text,
  standard text,
  notes text,
  created_at timestamptz default now(),
  unique(tournament_id, email, event)
);

-- Matches
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  round text not null,
  event text not null,
  standard text,
  age_group text,
  round_order int,
  slot_in_round int,
  player1_id uuid references public.registrations(id) on delete set null,
  player2_id uuid references public.registrations(id) on delete set null,
  score1 int,
  score2 int,
  winner_id uuid references public.registrations(id) on delete set null,
  venue_id uuid references public.venues(id) on delete set null,
  scheduled_at timestamptz,
  status text default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed')),
  created_at timestamptz default now()
);

-- Enable RLS (optional; allow anon for demo, tighten later)
alter table public.tournaments enable row level security;
alter table public.venues enable row level security;
alter table public.registrations enable row level security;
alter table public.matches enable row level security;

-- Allow read for all (public site) – drop first so re-run is safe
drop policy if exists "Allow public read tournaments" on public.tournaments;
create policy "Allow public read tournaments" on public.tournaments for select using (true);
drop policy if exists "Allow public read venues" on public.venues;
create policy "Allow public read venues" on public.venues for select using (true);
drop policy if exists "Allow public read registrations" on public.registrations;
create policy "Allow public read registrations" on public.registrations for select using (true);
drop policy if exists "Allow public read matches" on public.matches;
create policy "Allow public read matches" on public.matches for select using (true);

-- Allow insert for registrations (anyone can register)
drop policy if exists "Allow insert registrations" on public.registrations;
create policy "Allow insert registrations" on public.registrations for insert with check (true);

-- Allow all for service role / backend (Python will use service key)
-- No policy = service role bypasses RLS

-- Seed first tournament and venues
insert into public.venues (name, court_count, address) values
  ('Woodhouse', 4, 'North London – TBC'),
  ('Wren', 4, 'North London – TBC')
on conflict (name) do nothing;

insert into public.tournaments (name, slug, start_date, end_date, status, location, details) values
  (
    'North London Tournament March 2026',
    'north-london-march-2026',
    '2026-03-28',
    '2026-03-29',
    'upcoming',
    'North London (Woodhouse & Wren)',
    '{"age_groups": ["U11", "U13", "U15", "U17", "U19", "Senior"], "events_woodhouse": ["Singles", "Women''s Doubles", "Mixed Doubles"], "events_wren": ["Men''s Doubles"]}'::jsonb
  )
on conflict (slug) do nothing;
