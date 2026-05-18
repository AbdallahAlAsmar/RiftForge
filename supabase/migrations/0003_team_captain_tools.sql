create or replace function public.transfer_team_captaincy(p_team_id uuid, p_new_captain_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_captain uuid;
begin
  select captain_id
  into v_current_captain
  from public.teams
  where id = p_team_id;

  if v_current_captain is null then
    raise exception 'Team not found.';
  end if;

  if v_current_captain = p_new_captain_id then
    raise exception 'Player is already captain.';
  end if;

  if not exists (
    select 1
    from public.team_members
    where team_id = p_team_id
      and user_id = p_new_captain_id
  ) then
    raise exception 'Player must already be on the team.';
  end if;

  update public.teams
  set captain_id = p_new_captain_id
  where id = p_team_id;

  update public.team_members
  set is_captain = (user_id = p_new_captain_id)
  where team_id = p_team_id;
end;
$$;

create or replace function public.remove_team_member(p_team_id uuid, p_member_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_captain uuid;
begin
  select captain_id
  into v_current_captain
  from public.teams
  where id = p_team_id;

  if v_current_captain is null then
    raise exception 'Team not found.';
  end if;

  if v_current_captain = p_member_user_id then
    raise exception 'Transfer captaincy before removing the captain.';
  end if;

  delete from public.team_members
  where team_id = p_team_id
    and user_id = p_member_user_id;

  if not found then
    raise exception 'Player not found on this team.';
  end if;
end;
$$;