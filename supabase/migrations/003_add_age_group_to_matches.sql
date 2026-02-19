-- Draws are per event + standard + age group (U11, U13, U15, U17, U19, Senior)
alter table public.matches
  add column if not exists age_group text;

comment on column public.matches.age_group is 'Age group for this draw: U11, U13, U15, U17, U19, Senior. Matches schema with registrations age_group.';
