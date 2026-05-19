"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireLinkedRiotAccount } from "@/lib/auth/accounts";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { buildBalancedTeams, type QueueEntryForBalance, type Role } from "@/lib/domain/balancing";
import { formString, formStringArray, requireTournamentOwner } from "./common";

export async function joinQueue(tournamentId: string, formData: FormData) {
  const user = await requireUser();
  const riotCheck = await requireLinkedRiotAccount(user.id);
  if (!riotCheck.ok) return riotCheck;

  const supabase = await createClient();
  const { data: tournament, error: tournamentError } = await supabase
    .from("tournaments")
    .select("team_size")
    .eq("id", tournamentId)
    .single();

  if (tournamentError) return { ok: false, message: tournamentError.message };

  const { data: profile } = await supabase
    .from("users")
    .select("tsr, preferred_roles")
    .eq("id", user.id)
    .single();

  const mode = formString(formData, "mode") === "duo" ? "duo" : "solo";
  if (tournament?.team_size === 1 && mode === "duo") {
    return { ok: false, message: "This tournament only supports solo teams." };
  }

  const partnerUserId = formString(formData, "partnerUserId") || null;
  const preferredRoles = formStringArray(formData, "preferredRoles");

  const { error } = await supabase.from("queue_entries").upsert({
    tournament_id: tournamentId,
    user_id: user.id,
    partner_user_id: mode === "duo" ? partnerUserId : null,
    mode,
    preferred_roles: preferredRoles.length ? preferredRoles : profile?.preferred_roles ?? [],
    tsr: profile?.tsr ?? 300,
    status: "queued"
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true, message: "Queue entry updated." };
}

export async function generateBalancedTeams(tournamentId: string) {
  await requireTournamentOwner(tournamentId);
  const admin = createAdminClient();

  // Check for duplicate generation attempts (rate limit to once per 50 seconds)
  const fiftySecondsAgo = new Date(Date.now() - 50 * 1000).toISOString();
  const { data: recentTeamGeneration } = await admin
    .from("teams")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("source", "solo_duo_generated")
    .gte("created_at", fiftySecondsAgo)
    .limit(1);

  if (recentTeamGeneration?.length) {
    return {
      ok: false,
      message: "Team generation already in progress. Please wait."
    };
  }

  const { data: tournament, error: tournamentError } = await admin
    .from("tournaments")
    .select("team_size")
    .eq("id", tournamentId)
    .single();

  if (tournamentError) return { ok: false, message: tournamentError.message };
  const teamSize = tournament?.team_size ?? 5;

  const { data: entries, error } = await admin
    .from("queue_entries")
    .select("*")
    .eq("tournament_id", tournamentId)
    .eq("status", "queued");

  if (error) return { ok: false, message: error.message };
  if (!entries?.length) return { ok: false, message: "No queued players found." };

  const userIds = [
    ...new Set(entries.flatMap((entry) => [entry.user_id, entry.partner_user_id]).filter(Boolean))
  ] as string[];

  const { data: users } = await admin
    .from("users")
    .select("id, display_name, tsr, preferred_roles")
    .in("id", userIds);

  const usersById = new Map(users?.map((profile) => [profile.id, profile]) ?? []);
  const balanceEntries: QueueEntryForBalance[] = entries.map((entry) => {
    const userProfile = usersById.get(entry.user_id);
    const partnerProfile = entry.partner_user_id ? usersById.get(entry.partner_user_id) : null;

    return {
      id: entry.id,
      mode: entry.mode,
      user: {
        userId: entry.user_id,
        displayName: userProfile?.display_name ?? "Player",
        tsr: userProfile?.tsr ?? entry.tsr,
        preferredRoles: (entry.preferred_roles as Role[]) ?? ["fill"]
      },
      partner: partnerProfile
        ? {
            userId: partnerProfile.id,
            displayName: partnerProfile.display_name ?? "Duo",
            tsr: partnerProfile.tsr,
            preferredRoles: (partnerProfile.preferred_roles as Role[]) ?? ["fill"]
          }
        : null
    };
  });

  const generatedTeams = buildBalancedTeams(balanceEntries, teamSize);
  if (!generatedTeams.length) return { ok: false, message: `Need at least ${teamSize} queued players.` };

  const themedTeamNames = ["Blue Buff", "Red Buff", "Gromp", "Wolves", "Pink Ward", "Trinket"];

  function getTeamName(index: number) {
    const baseName = themedTeamNames[index % themedTeamNames.length];
    const cycle = Math.floor(index / themedTeamNames.length);
    return cycle > 0 ? `${baseName} ${cycle + 1}` : baseName;
  }

  for (const [index, generatedTeam] of generatedTeams.entries()) {
    const captain = generatedTeam.players[0];
    const { data: team, error: teamError } = await admin
      .from("teams")
      .insert({
        tournament_id: tournamentId,
        captain_id: captain.userId,
        name: getTeamName(index),
        average_tsr: generatedTeam.averageTsr,
        source: "solo_duo_generated"
      })
      .select("id")
      .single();

    if (teamError) return { ok: false, message: teamError.message };

    await admin.from("team_members").insert(
      generatedTeam.players.map((player) => ({
        team_id: team.id,
        user_id: player.userId,
        role: player.assignedRole,
        is_captain: player.userId === captain.userId
      }))
    );

    await admin.from("tournament_participants").upsert(
      generatedTeam.players.map((player) => ({
        tournament_id: tournamentId,
        user_id: player.userId,
        team_id: team.id,
        participant_type: "player"
      })),
      { onConflict: "tournament_id,user_id" }
    );
  }

  await admin
    .from("queue_entries")
    .update({ status: "assigned" })
    .in("id", entries.map((entry) => entry.id));

  revalidatePath(`/tournaments/${tournamentId}/admin`);
  revalidatePath(`/tournaments/${tournamentId}`);
  return { ok: true, message: `Generated ${generatedTeams.length} balanced teams.` };
}
