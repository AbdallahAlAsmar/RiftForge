"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { createBracketSkeleton, getTeamStrength } from "@/lib/domain/brackets";
import { tsrForRank } from "@/lib/domain/ranks";
import { formString, requireTournamentOwner } from "./common";

type TeamRegistrationRow = {
  id: string;
  name: string;
  average_tsr: number;
  team_members?: Array<{
    users?: {
      rank?: string | null;
    };
  }>;
};

export async function syncBracketSeeding(tournamentId: string) {
  const admin = createAdminClient();

  const { data: matches } = await admin
    .from("matches")
    .select("id, round, position, team_a_id, team_b_id, winner_team_id, status, next_match_id")
    .eq("tournament_id", tournamentId)
    .order("round", { ascending: true })
    .order("position", { ascending: true });

  if (!matches?.length) return { ok: false, message: "Bracket could not be loaded." };

  const hasStarted = matches.some((match) => match.status === "reported" || match.status === "confirmed" || !!match.winner_team_id);
  if (hasStarted) {
    return { ok: true, message: "Bracket already started; seeding unchanged." };
  }

  const firstRoundMatches = matches.filter((match) => match.round === 1);
  if (!firstRoundMatches.length) return { ok: true, message: "No first round available." };

  const { data: teams, error: teamsError } = await admin
    .from("teams")
    .select("id, name, average_tsr, team_members(users(rank))")
    .eq("tournament_id", tournamentId);

  if (teamsError) return { ok: false, message: teamsError.message };

  const rankedTeams = ((teams ?? []) as TeamRegistrationRow[])
    .map((team) => {
      const ranks = (team.team_members ?? [])
        .map((member) => member.users?.rank)
        .filter((rank): rank is string => Boolean(rank));

      const averageRank = ranks.length
        ? ranks.reduce((sum, rank) => sum + tsrForRank(rank), 0) / ranks.length
        : tsrForRank("silver");

      return {
        id: team.id,
        name: team.name,
        average_tsr: team.average_tsr,
        rankScore: averageRank
      };
    })
    .sort((a, b) => getTeamStrength(b) - getTeamStrength(a));

  const slotOrder = firstRoundMatches.flatMap((match) => [
    { matchId: match.id, side: "team_a_id" as const },
    { matchId: match.id, side: "team_b_id" as const }
  ]);

  for (const match of firstRoundMatches) {
    await admin
      .from("matches")
      .update({ team_a_id: null, team_b_id: null, status: "pending", winner_team_id: null })
      .eq("id", match.id);
  }

  for (let index = 0; index < rankedTeams.length && index < slotOrder.length; index += 1) {
    const slot = slotOrder[index];
    const team = rankedTeams[index];
    await admin.from("matches").update({ [slot.side]: team.id }).eq("id", slot.matchId);
  }

  for (const match of firstRoundMatches) {
    const { data: updated } = await admin
      .from("matches")
      .select("id, position, team_a_id, team_b_id, next_match_id")
      .eq("id", match.id)
      .single();

    if (updated?.team_a_id && updated.team_b_id) {
      await admin.from("matches").update({ status: "ready" }).eq("id", match.id);
      continue;
    }

    if ((updated?.team_a_id || updated?.team_b_id) && updated?.next_match_id) {
      const winnerTeamId = updated.team_a_id ?? updated.team_b_id ?? null;
      if (!winnerTeamId) continue;

      await admin
        .from("matches")
        .update({ status: "confirmed", winner_team_id: winnerTeamId })
        .eq("id", updated.id);

      await advanceWinner(admin, updated, winnerTeamId);
    }
  }

  return { ok: true, message: "Bracket seeding refreshed." };
}

export async function initializeBracket(tournamentId: string, teamCapacity: number, format: "single_elimination" | "double_elimination") {
  const admin = createAdminClient();

  const { count } = await admin
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (count) return { ok: true, message: "Bracket already initialized." };

  const { data: bracket, error: bracketError } = await admin
    .from("brackets")
    .insert({
      tournament_id: tournamentId,
      type: format === "double_elimination" ? "upper" : "single"
    })
    .select("id")
    .single();

  if (bracketError) return { ok: false, message: bracketError.message };

  const skeletonMatches = createBracketSkeleton(teamCapacity);
  const { error: matchError } = await admin.from("matches").insert(
    skeletonMatches.map((match) => ({
      tournament_id: tournamentId,
      bracket_id: bracket.id,
      round: match.round,
      position: match.position,
      team_a_id: null,
      team_b_id: null,
      winner_team_id: null,
      status: match.status,
      next_match_id: null
    }))
  );

  if (matchError) return { ok: false, message: matchError.message };

  const { data: insertedMatches } = await admin
    .from("matches")
    .select("id, round, position")
    .eq("tournament_id", tournamentId)
    .order("round", { ascending: true })
    .order("position", { ascending: true });

  const bySlot = new Map(
    insertedMatches?.map((match) => [`${match.round}:${match.position}`, match]) ?? []
  );

  for (const match of insertedMatches ?? []) {
    const generated = skeletonMatches.find(
      (item) => item.round === match.round && item.position === match.position
    );
    if (!generated?.nextRound || !generated.nextPosition) continue;

    const next = bySlot.get(`${generated.nextRound}:${generated.nextPosition}`);
    if (!next) continue;

    await admin.from("matches").update({ next_match_id: next.id }).eq("id", match.id);
  }

  if (format === "double_elimination") {
    await admin.from("brackets").insert([
      { tournament_id: tournamentId, type: "lower" },
      { tournament_id: tournamentId, type: "grand_final" }
    ]);
  }

  return { ok: true, message: "Bracket initialized." };
}

export async function generateBracket(tournamentId: string) {
  const { tournament } = await requireTournamentOwner(tournamentId);
  const admin = createAdminClient();

  const { count } = await admin
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (!count) {
    const initialized = await initializeBracket(tournamentId, tournament.max_teams, tournament.format);
    if (!initialized.ok) return initialized;
  }

  const bracketResult = await syncBracketSeeding(tournamentId);
  if (!bracketResult.ok) return bracketResult;

  await admin.from("tournaments").update({ status: "live" }).eq("id", tournamentId);

  revalidatePath(`/tournaments/${tournamentId}/bracket`);
  revalidatePath(`/tournaments/${tournamentId}/admin`);
  return { ok: true, message: "Bracket generated." };
}

export async function submitMatchResult(matchId: string, formData: FormData) {
  const user = await requireUser();
  const winnerTeamId = formString(formData, "winnerTeamId");
  const notes = formString(formData, "notes");
  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select("id, tournament_id, team_a_id, team_b_id")
    .eq("id", matchId)
    .single();

  if (!match || (winnerTeamId !== match.team_a_id && winnerTeamId !== match.team_b_id)) {
    return { ok: false, message: "Winner must be one of the teams in the match." };
  }

  const { error } = await supabase.from("match_results").insert({
    match_id: matchId,
    submitted_by: user.id,
    winner_team_id: winnerTeamId,
    notes,
    status: "submitted"
  });

  if (error) return { ok: false, message: error.message };

  await supabase.from("matches").update({ status: "reported" }).eq("id", matchId);
  revalidatePath(`/tournaments/${match.tournament_id}/bracket`);
  return { ok: true, message: "Result submitted for admin review." };
}

export async function confirmMatchWinner(matchId: string, winnerTeamId: string) {
  const admin = createAdminClient();
  const { data: match } = await admin
    .from("matches")
    .select("*, tournaments!inner(owner_id)")
    .eq("id", matchId)
    .single();

  const user = await requireUser();
  const ownerId = (match as unknown as { tournaments?: { owner_id: string } })?.tournaments?.owner_id;
  if (!match || ownerId !== user.id) {
    return { ok: false, message: "You do not have permission to confirm this match." };
  }

  if (winnerTeamId !== match.team_a_id && winnerTeamId !== match.team_b_id) {
    return { ok: false, message: "Winner must be one of the teams in the match." };
  }

  const { error } = await admin
    .from("matches")
    .update({ winner_team_id: winnerTeamId, status: "confirmed" })
    .eq("id", matchId);

  if (error) return { ok: false, message: error.message };

  await admin
    .from("match_results")
    .update({
      status: "confirmed",
      confirmed_by: user.id,
      confirmed_at: new Date().toISOString()
    })
    .eq("match_id", matchId)
    .eq("winner_team_id", winnerTeamId);

  await advanceWinner(admin, match, winnerTeamId);
  revalidatePath(`/tournaments/${match.tournament_id}/bracket`);
  revalidatePath(`/tournaments/${match.tournament_id}/admin`);
  return { ok: true, message: "Winner confirmed and advanced." };
}

async function advanceWinner(
  admin: ReturnType<typeof createAdminClient>,
  match: { id: string; position: number; next_match_id: string | null },
  winnerTeamId: string
) {
  if (!match.next_match_id) return;

  const targetColumn = match.position % 2 === 1 ? "team_a_id" : "team_b_id";
  await admin.from("matches").update({ [targetColumn]: winnerTeamId }).eq("id", match.next_match_id);

  const { data: nextMatch } = await admin
    .from("matches")
    .select("team_a_id, team_b_id")
    .eq("id", match.next_match_id)
    .single();

  if (nextMatch?.team_a_id && nextMatch.team_b_id) {
    await admin.from("matches").update({ status: "ready" }).eq("id", match.next_match_id);
  }
}
