"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { generateSingleEliminationBracket } from "@/lib/domain/brackets";
import { formString, requireTournamentOwner } from "./common";

export async function generateBracket(tournamentId: string) {
  const { tournament } = await requireTournamentOwner(tournamentId);
  const admin = createAdminClient();

  const { count } = await admin
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);

  if (count) return { ok: false, message: "This tournament already has a bracket." };

  const { data: teams, error: teamsError } = await admin
    .from("teams")
    .select("id, name, average_tsr")
    .eq("tournament_id", tournamentId)
    .order("average_tsr", { ascending: false });

  if (teamsError) return { ok: false, message: teamsError.message };
  if (!teams || teams.length < 2) return { ok: false, message: "At least two teams are required." };

  const { data: bracket, error: bracketError } = await admin
    .from("brackets")
    .insert({
      tournament_id: tournamentId,
      type: tournament.format === "double_elimination" ? "upper" : "single"
    })
    .select("id")
    .single();

  if (bracketError) return { ok: false, message: bracketError.message };

  const generatedMatches = generateSingleEliminationBracket(teams);
  const { data: insertedMatches, error: matchError } = await admin
    .from("matches")
    .insert(
      generatedMatches.map((match) => ({
        tournament_id: tournamentId,
        bracket_id: bracket.id,
        round: match.round,
        position: match.position,
        team_a_id: match.teamAId,
        team_b_id: match.teamBId,
        winner_team_id: match.winnerTeamId ?? null,
        status: match.status
      }))
    )
    .select("id, round, position, team_a_id, team_b_id, winner_team_id, status");

  if (matchError) return { ok: false, message: matchError.message };

  const bySlot = new Map(
    insertedMatches?.map((match) => [`${match.round}:${match.position}`, match]) ?? []
  );

  for (const match of insertedMatches ?? []) {
    const generated = generatedMatches.find(
      (item) => item.round === match.round && item.position === match.position
    );
    if (!generated?.nextRound || !generated.nextPosition) continue;

    const next = bySlot.get(`${generated.nextRound}:${generated.nextPosition}`);
    if (!next) continue;

    await admin.from("matches").update({ next_match_id: next.id }).eq("id", match.id);

    if (match.winner_team_id) {
      await advanceWinner(admin, { ...match, next_match_id: next.id }, match.winner_team_id);
    }
  }

  await admin.from("tournaments").update({ status: "live" }).eq("id", tournamentId);

  if (tournament.format === "double_elimination") {
    await admin.from("brackets").insert([
      { tournament_id: tournamentId, type: "lower" },
      { tournament_id: tournamentId, type: "grand_final" }
    ]);
  }

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
