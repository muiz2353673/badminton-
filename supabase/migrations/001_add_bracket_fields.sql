-- Add bracket structure fields to matches for draw display and progression
alter table public.matches
  add column if not exists round_order int,
  add column if not exists slot_in_round int;

comment on column public.matches.round_order is '1 = first round, 2 = second, etc. Used for bracket tree.';
comment on column public.matches.slot_in_round is 'Match index within the round (0-based). Winner goes to (round_order+1, slot_in_round/2).';
