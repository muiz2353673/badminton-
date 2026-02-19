-- Add standard and age_group to matches (for bracket filtering, aligned with registrations)
alter table public.matches
  add column if not exists standard text,
  add column if not exists age_group text;

comment on column public.matches.standard is 'Event standard, e.g. Open, A, B. Matches registrations.';
comment on column public.matches.age_group is 'Age group, e.g. U11, Senior. Matches registrations.';
