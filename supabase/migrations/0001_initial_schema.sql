create extension if not exists "pgcrypto";

create type public.tournament_status as enum ('draft', 'published', 'check_in', 'live', 'completed', 'cancelled');
create type public.tournament_format as enum ('single_elimination', 'double_elimination');
create type public.team_source as enum ('premade', 'solo_duo_generated');
create type public.queue_mode as enum ('solo', 'duo');
create type public.queue_status as enum ('queued', 'assigned', 'cancelled');
create type public.bracket_type as enum ('single', 'upper', 'lower', 'grand_final');
create type public.match_status as enum ('pending', 'ready', 'reported', 'confirmed');
create type public.result_status as enum ('submitted', 'confirmed', 'rejected');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  region text not null default 'EUW',
  rank text,
  tsr integer not null default 300 check (tsr >= 0),
  preferred_roles text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.riot_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  puuid text not null unique,
  game_name text not null,
  tag_line text not null,
  profile_icon_url text,
  region text not null default 'EUW',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  status public.tournament_status not null default 'draft',
  format public.tournament_format not null default 'single_elimination',
  max_teams integer not null default 8 check (max_teams between 2 and 128),
  min_rank text,
  max_rank text,
  starts_at timestamptz,
  check_in_starts_at timestamptz,
  check_in_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournament_participants (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  team_id uuid,
  participant_type text not null default 'player' check (participant_type in ('player', 'admin')),
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(id) on delete cascade,
  captain_id uuid not null references public.users(id) on delete restrict,
  name text not null,
  logo_url text,
  average_tsr integer not null default 300,
  source public.team_source not null default 'premade',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tournament_participants
  add constraint tournament_participants_team_id_fkey
  foreign key (team_id) references public.teams(id) on delete set null;

create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text,
  is_captain boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  invited_user_id uuid references public.users(id) on delete cascade,
  invited_by uuid not null references public.users(id) on delete cascade,
  email text,
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  expires_at timestamptz not null default now() + interval '7 days',
  created_at timestamptz not null default now()
);

create table public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  partner_user_id uuid references public.users(id) on delete cascade,
  mode public.queue_mode not null default 'solo',
  preferred_roles text[] not null default '{}',
  tsr integer not null default 300,
  status public.queue_status not null default 'queued',
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create table public.brackets (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  type public.bracket_type not null default 'single',
  created_at timestamptz not null default now(),
  unique (tournament_id, type)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  bracket_id uuid not null references public.brackets(id) on delete cascade,
  round integer not null check (round > 0),
  position integer not null check (position > 0),
  team_a_id uuid references public.teams(id) on delete set null,
  team_b_id uuid references public.teams(id) on delete set null,
  winner_team_id uuid references public.teams(id) on delete set null,
  status public.match_status not null default 'pending',
  next_match_id uuid references public.matches(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bracket_id, round, position)
);

create table public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches(id) on delete cascade,
  submitted_by uuid not null references public.users(id) on delete cascade,
  winner_team_id uuid not null references public.teams(id) on delete cascade,
  notes text,
  status public.result_status not null default 'submitted',
  created_at timestamptz not null default now(),
  confirmed_by uuid references public.users(id) on delete set null,
  confirmed_at timestamptz
);

create index users_rank_idx on public.users(rank);
create index users_tsr_idx on public.users(tsr);
create index riot_accounts_user_id_idx on public.riot_accounts(user_id);
create index tournaments_status_idx on public.tournaments(status);
create index tournaments_starts_at_idx on public.tournaments(starts_at);
create index teams_tournament_id_idx on public.teams(tournament_id);
create index team_members_user_id_idx on public.team_members(user_id);
create index queue_entries_tournament_status_idx on public.queue_entries(tournament_id, status);
create index matches_tournament_round_idx on public.matches(tournament_id, round);
create index match_results_match_status_idx on public.match_results(match_id, status);

create trigger users_set_updated_at before update on public.users for each row execute function public.set_updated_at();
create trigger riot_accounts_set_updated_at before update on public.riot_accounts for each row execute function public.set_updated_at();
create trigger tournaments_set_updated_at before update on public.tournaments for each row execute function public.set_updated_at();
create trigger teams_set_updated_at before update on public.teams for each row execute function public.set_updated_at();
create trigger matches_set_updated_at before update on public.matches for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.riot_accounts enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_participants enable row level security;
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.invites enable row level security;
alter table public.queue_entries enable row level security;
alter table public.brackets enable row level security;
alter table public.matches enable row level security;
alter table public.match_results enable row level security;

create policy "Profiles are public" on public.users for select using (true);
create policy "Users update own profile" on public.users for update using (auth.uid() = id);

create policy "Riot account owner can read" on public.riot_accounts for select using (auth.uid() = user_id);

create policy "Published tournaments are public" on public.tournaments for select using (status <> 'draft' or owner_id = auth.uid());
create policy "Authenticated users create tournaments" on public.tournaments for insert with check (auth.uid() = owner_id);
create policy "Owners update tournaments" on public.tournaments for update using (auth.uid() = owner_id);

create policy "Participants visible to authenticated users" on public.tournament_participants for select using (auth.role() = 'authenticated');
create policy "Users can join as themselves" on public.tournament_participants for insert with check (auth.uid() = user_id);

create policy "Teams visible" on public.teams for select using (true);
create policy "Captains create teams" on public.teams for insert with check (auth.uid() = captain_id);
create policy "Captains update teams" on public.teams for update using (auth.uid() = captain_id);

create policy "Team members visible" on public.team_members for select using (true);
create policy "Users join teams as themselves" on public.team_members for insert with check (auth.uid() = user_id);
create policy "Members can leave teams" on public.team_members for delete using (auth.uid() = user_id);

create policy "Invites visible to sender or recipient" on public.invites
  for select using (auth.uid() = invited_by or auth.uid() = invited_user_id);
create policy "Captains create invites" on public.invites
  for insert with check (auth.uid() = invited_by);

create policy "Queue visible to tournament owners and entry owners" on public.queue_entries
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.owner_id = auth.uid()
    )
  );
create policy "Users queue themselves" on public.queue_entries for insert with check (auth.uid() = user_id);
create policy "Users update own queue entry" on public.queue_entries for update using (auth.uid() = user_id);

create policy "Brackets visible" on public.brackets for select using (true);
create policy "Matches visible" on public.matches for select using (true);
create policy "Results visible" on public.match_results for select using (true);
create policy "Captains submit results" on public.match_results for insert with check (auth.uid() = submitted_by);

create policy "Tournament owners manage brackets" on public.brackets
  for all using (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.owner_id = auth.uid())
  );
create policy "Tournament owners manage matches" on public.matches
  for all using (
    exists (select 1 from public.tournaments t where t.id = tournament_id and t.owner_id = auth.uid())
  );
create policy "Tournament owners confirm results" on public.match_results
  for update using (
    exists (
      select 1
      from public.matches m
      join public.tournaments t on t.id = m.tournament_id
      where m.id = match_id and t.owner_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;

create policy "Team logos are public" on storage.objects
  for select using (bucket_id = 'team-logos');
create policy "Authenticated users upload team logos" on storage.objects
  for insert with check (bucket_id = 'team-logos' and auth.role() = 'authenticated');
