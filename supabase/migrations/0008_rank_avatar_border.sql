alter table public.users
  add column if not exists show_rank_border boolean not null default true;