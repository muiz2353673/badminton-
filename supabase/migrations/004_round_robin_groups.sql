-- Round-robin: groups and group assignment (admin draws players into groups)
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  event text not null,
  standard text,
  age_group text,
  name text not null,
  sort_order int default 0,
  created_at timestamptz default now()
);

create index if not exists idx_groups_tournament_event on public.groups (tournament_id, event, standard, age_group);

alter table public.registrations
  add column if not exists group_id uuid references public.groups(id) on delete set null;

alter table public.matches
  add column if not exists group_id uuid references public.groups(id) on delete set null;

alter table public.groups enable row level security;
drop policy if exists "Allow public read groups" on public.groups;
create policy "Allow public read groups" on public.groups for select using (true);

comment on table public.groups is 'Round-robin groups; admin assigns players to groups, then generates matches (everyone vs everyone in each group).';
