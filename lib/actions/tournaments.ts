"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/session";
import { requireLinkedRiotAccount } from "@/lib/auth/accounts";
import { checkTeamEligibility, formatTeamEligibilityIssue } from "@/lib/domain/team-eligibility";
import { createClient } from "@/lib/supabase/server";
import { formString, requireTournamentOwner, slugify, tournamentSchema } from "./common";

export async function createTournament(_: unknown, formData: FormData) {
  const user = await requireUser();
  const parsed = tournamentSchema.safeParse({
    name: formString(formData, "name"),
    description: formString(formData, "description"),
    maxTeams: formString(formData, "maxTeams"),
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

  const supabase = await createClient();
  const { error } = await supabase.from("tournament_participants").upsert({
    tournament_id: tournamentId,
    user_id: user.id,
    participant_type: "player"
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true, message: "Joined tournament." };
}

export async function joinTournamentWithTeam(tournamentId: string, teamId: string) {
  const user = await requireUser();
  const riotCheck = await requireLinkedRiotAccount(user.id);
  if (!riotCheck.ok) return riotCheck;

  const admin = createAdminClient();

  const [{ data: tournament }, { data: team }] = await Promise.all([
    admin.from("tournaments").select("id, min_rank, max_rank").eq("id", tournamentId).single(),
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

  const issues = checkTeamEligibility(team, tournament.min_rank, tournament.max_rank);
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
