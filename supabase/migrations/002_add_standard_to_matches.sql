-- Draws are per event + standard (Intermediate / Advanced for all age groups)
alter table public.matches
  add column if not exists standard text;

comment on column public.matches.standard is 'Playing standard for this draw: e.g. Intermediate, Advanced. Used with event to scope the bracket.';
