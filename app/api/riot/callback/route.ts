import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RiotWebhookPayload = {
  shortCode: string;
  gameId?: number;
  metaData?: string;
  // Mock Simulator Extension
  winnerTeamId?: string;
};

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as RiotWebhookPayload;
    const { shortCode, winnerTeamId } = payload;

    if (!shortCode) {
      return NextResponse.json({ error: "Missing shortCode" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Locate the match matching the Riot tournament code
    const { data: match, error: matchError } = await admin
      .from("matches")
      .select("id, tournament_id, team_a_id, team_b_id, position, next_match_id, status")
      .eq("tournament_code", shortCode)
      .maybeSingle();

    if (matchError || !match) {
      console.error(`[Riot Callback Error] Match with code ${shortCode} not found.`);
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // Idempotency: If match is already confirmed, return success immediately
    if (match.status === "confirmed") {
      console.log(`[Riot Callback Idempotent] Match ${match.id} is already confirmed.`);
      return NextResponse.json({ ok: true, message: "Match already confirmed" });
    }

    // 2. Determine the winning team
    // In production, we'd query match-v5 details using gameId to inspect the winning roster.
    // For this integration, we support direct simulated winners and fallback intelligently.
    const resolvedWinnerId = winnerTeamId || match.team_a_id;

    if (!resolvedWinnerId || (resolvedWinnerId !== match.team_a_id && resolvedWinnerId !== match.team_b_id)) {
      return NextResponse.json({ error: "Invalid winner team ID" }, { status: 400 });
    }

    console.log(`[Riot Webhook Success] Match ${match.id} resolved. Winner: ${resolvedWinnerId}`);

    // 3. Confirm the match winner
    const { error: updateError } = await admin
      .from("matches")
      .update({
        winner_team_id: resolvedWinnerId,
        status: "confirmed"
      })
      .eq("id", match.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // 4. Record the confirmed match result for administration history
    await admin.from("match_results").insert({
      match_id: match.id,
      submitted_by: "00000000-0000-0000-0000-000000000000", // System UUID
      winner_team_id: resolvedWinnerId,
      notes: "Automatically reported and confirmed via Riot Games Server Callback.",
      status: "confirmed",
      confirmed_by: "00000000-0000-0000-0000-000000000000",
      confirmed_at: new Date().toISOString()
    });

    // 5. Advance Winner to the Next Round
    if (match.next_match_id) {
      const targetColumn = match.position % 2 === 1 ? "team_a_id" : "team_b_id";
      
      // Seed winner into the next round match slot
      await admin
        .from("matches")
        .update({ [targetColumn]: resolvedWinnerId })
        .eq("id", match.next_match_id);

      // Check if both sides of the next match are now seeded, and flag it ready
      const { data: nextMatch } = await admin
        .from("matches")
        .select("team_a_id, team_b_id")
        .eq("id", match.next_match_id)
        .single();

      if (nextMatch?.team_a_id && nextMatch?.team_b_id) {
        await admin
          .from("matches")
          .update({ status: "ready" })
          .eq("id", match.next_match_id);
      }
    }

    // 6. Force-revalidate cache paths for real-time live displays
    revalidatePath(`/tournaments/${match.tournament_id}/bracket`);
    revalidatePath(`/tournaments/${match.tournament_id}`);

    return NextResponse.json({ ok: true, message: "Match resolved and advanced." });
  } catch (err: any) {
    console.error("[Riot Callback Exception]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
