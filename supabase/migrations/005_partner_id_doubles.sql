-- Partner linking for doubles/mixed doubles: link two registrations as a pair
alter table public.registrations
  add column if not exists partner_id uuid references public.registrations(id) on delete set null;

-- Matches can store both players per side for doubles
alter table public.matches
  add column if not exists player1_partner_id uuid references public.registrations(id) on delete set null,
  add column if not exists player2_partner_id uuid references public.registrations(id) on delete set null;

comment on column public.registrations.partner_id is 'For doubles: the other registration in this pair. Set mutually (A.partner_id=B, B.partner_id=A).';
comment on column public.matches.player1_partner_id is 'Doubles: partner of player1_id. Null for singles.';
comment on column public.matches.player2_partner_id is 'Doubles: partner of player2_id. Null for singles.';
