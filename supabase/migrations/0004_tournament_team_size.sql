alter table public.tournaments
  add column if not exists team_size integer not null default 5 check (team_size in (1, 2, 5));