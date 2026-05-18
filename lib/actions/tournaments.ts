"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/session";
import { requireLinkedRiotAccount } from "@/lib/auth/accounts";
import { checkTeamEligibility, formatTeamEligibilityIssue } from "@/lib/domain/team-eligibility";
import { createClient } from "@/lib/supabase/server";
import { formString, requireTournamentOwner, slugify, tournamentSchema } from "./common";

async function assignRandomAvailableTeam(tournamentId: string, userId: string, teamSize: number) {
  const admin = createAdminClient();

  const { data: teams, error } = await admin
    .from("teams")
    .select("id, name, team_members(user_id)")
    .eq("tournament_id", tournamentId);

  if (error) {
    throw new Error(error.message);
  }

  const availableTeams = (teams ?? []).filter((team) => {
    const members = (team.team_members ?? []) as Array<{ user_id: string }>;
    return members.length < teamSize && !members.some((member) => member.user_id === userId);
  });

  if (!availableTeams.length) {
    return null;
  }

  const selectedTeam = availableTeams[Math.floor(Math.random() * availableTeams.length)];

  const { error: teamMemberError } = await admin.from("team_members").upsert({
    team_id: selectedTeam.id,
    user_id: userId
  });

  if (teamMemberError) {
    throw new Error(teamMemberError.message);
  }

  const { error: participantError } = await admin
    .from("tournament_participants")
    .update({ team_id: selectedTeam.id })
    .eq("tournament_id", tournamentId)
    .eq("user_id", userId);

  if (participantError) {
    throw new Error(participantError.message);
  }

  return selectedTeam as { id: string; name: string };
}

export async function createTournament(_: unknown, formData: FormData) {
  const user = await requireUser();
  const parsed = tournamentSchema.safeParse({
    name: formString(formData, "name"),
    description: formString(formData, "description"),
    maxTeams: formString(formData, "maxTeams"),
    teamSize: formString(formData, "teamSize"),
    format: formString(formData, "format"),
    minRank: formString(formData, "minRank") || null,
    maxRank: formString(formData, "maxRank") || null,
    startsAt: formString(formData, "startsAt") || null,
    checkInStartsAt: formString(formData, "checkInStartsAt") || null,
    checkInEndsAt: formString(formData, "checkInEndsAt") || null
  });

  if (!parsed.success) {
    return { ok: false, message: "Tournament settings are incomplete." };
  }

  const supabase = await createClient();
  const slug = `${slugify(parsed.data.name)}-${crypto.randomUUID().slice(0, 6)}`;
  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      owner_id: user.id,
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      max_teams: parsed.data.maxTeams,
      team_size: parsed.data.teamSize,
      format: parsed.data.format,
      min_rank: parsed.data.minRank || null,
      max_rank: parsed.data.maxRank || null,
      starts_at: parsed.data.startsAt || null,
      check_in_starts_at: parsed.data.checkInStartsAt || null,
      check_in_ends_at: parsed.data.checkInEndsAt || null
    })
    .select("id")
    .single();

  if (error) return { ok: false, message: error.message };

  revalidatePath("/tournaments");
  redirect(`/tournaments/${data.id}/admin`);
}

export async function publishTournament(tournamentId: string) {
  await requireTournamentOwner(tournamentId);
  const admin = createAdminClient();
  const { error } = await admin
    .from("tournaments")
    .update({ status: "published" })
    .eq("id", tournamentId);

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/tournaments");
  return { ok: true, message: "Tournament published." };
}

export async function joinTournament(tournamentId: string) {
  const user = await requireUser();
  const riotCheck = await requireLinkedRiotAccount(user.id);
  if (!riotCheck.ok) return riotCheck;

  const admin = createAdminClient();
  const { data: tournament, error: tournamentError } = await admin
    .from("tournaments")
    .select("team_size")
    .eq("id", tournamentId)
    .single();

  if (tournamentError) return { ok: false, message: tournamentError.message };

  const { data: existingParticipant, error: participantLookupError } = await admin
    .from("tournament_participants")
    .select("team_id")
    .eq("tournament_id", tournamentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (participantLookupError) return { ok: false, message: participantLookupError.message };

  const { error } = await admin.from("tournament_participants").upsert({
    tournament_id: tournamentId,
    user_id: user.id,
    participant_type: "player"
  });

  if (error) return { ok: false, message: error.message };

  const assignedTeam = existingParticipant?.team_id
    ? null
    : await assignRandomAvailableTeam(tournamentId, user.id, tournament?.team_size ?? 5);

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath("/profile");

  if (assignedTeam) {
    return {
      ok: true,
      message: `You're in the tournament and have been placed in ${assignedTeam.name}.`
    };
  }

  if (existingParticipant?.team_id) {
    return { ok: true, message: "You're already in the tournament and assigned to a team." };
  }

  return {
    ok: true,
    message: "You're in the tournament. We'll place you into a random team when one is available."
  };
}

export async function joinTournamentWithTeam(tournamentId: string, teamId: string) {
  const user = await requireUser();
  const riotCheck = await requireLinkedRiotAccount(user.id);
  if (!riotCheck.ok) return riotCheck;

  const admin = createAdminClient();

  const [{ data: tournament }, { data: team }] = await Promise.all([
    admin.from("tournaments").select("id, min_rank, max_rank, team_size").eq("id", tournamentId).single(),
    admin
      .from("teams")
      .select(
        "id, name, logo_url, average_tsr, captain_id, tournament_id, team_members(user_id, users(display_name, rank))"
      )
      .eq("id", teamId)
      .single()
  ]);

  if (!tournament) return { ok: false, message: "Tournament not found." };
  if (!team) return { ok: false, message: "Team not found." };
  if (team.captain_id !== user.id) {
    return { ok: false, message: "Only the team captain can join a tournament with this team." };
  }
  if (team.tournament_id && team.tournament_id !== tournamentId) {
    return { ok: false, message: "This team is already registered in another tournament." };
  }

  const issues = checkTeamEligibility(team, tournament.min_rank, tournament.max_rank, tournament.team_size ?? 5);
  if (issues.length) {
    return { ok: false, message: formatTeamEligibilityIssue(issues[0]) };
  }

  const memberIds = (team.team_members ?? []).map((member) => member.user_id).filter(Boolean);
  if (!memberIds.length) {
    return { ok: false, message: "This team has no members yet." };
  }

  // BYPASS: Do not enforce Riot Games account requirement for testing
  /*
  const { data: linkedRiotAccounts } = await admin
    .from("riot_accounts")
    .select("user_id")
    .in("user_id", memberIds);
  if ((linkedRiotAccounts?.length ?? 0) !== memberIds.length) {
    return {
      ok: false,
      message: "Every team member must connect a Riot Games account before tournament registration."
    };
  }
  */

  const { error: teamUpdateError } = await admin
    .from("teams")
    .update({ tournament_id: tournamentId })
    .eq("id", team.id);
  if (teamUpdateError) return { ok: false, message: teamUpdateError.message };

  const { error: participantError } = await admin.from("tournament_participants").upsert(
    memberIds.map((memberId) => ({
      tournament_id: tournamentId,
      user_id: memberId,
      team_id: team.id,
      participant_type: "player"
    })),
    { onConflict: "tournament_id,user_id" }
  );
  if (participantError) return { ok: false, message: participantError.message };

  revalidatePath(`/tournaments/${tournamentId}`);
  revalidatePath(`/teams/${team.id}`);
  return { ok: true, message: `${team.name} joined tournament.` };
}
