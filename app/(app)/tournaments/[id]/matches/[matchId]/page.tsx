import Link from "next/link";
import { ChevronLeft, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { MatchLobbyClient } from "./lobby-client";
import { generateTournamentCode } from "@/lib/riot-tournament";

type MatchWithTeams = {
  id: string;
  round: number;
  position: number;
  status: string;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_team_id: string | null;
  tournament_code: string | null;
  team_a?: {
    id: string;
    name: string;
    logo_url: string | null;
    captain_id: string;
    average_tsr: number;
  } | null;
  team_b?: {
    id: string;
    name: string;
    logo_url: string | null;
    captain_id: string;
    average_tsr: number;
  } | null;
};

export default async function MatchLobbyPage({
  params
}: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const { id: tournamentId, matchId } = await params;
  const supabase = await createClient();
  const user = await getSessionUser();

  const [{ data: tournament }, { data: rawMatch }] = await Promise.all([
    supabase.from("tournaments").select("id, name, owner_id, region, map_type").eq("id", tournamentId).single(),
    supabase
      .from("matches")
      .select(`
        id, round, position, status, team_a_id, team_b_id, winner_team_id, tournament_code,
        team_a:teams!team_a_id(id, name, logo_url, captain_id, average_tsr),
        team_b:teams!team_b_id(id, name, logo_url, captain_id, average_tsr)
      `)
      .eq("id", matchId)
      .single()
  ]);

  if (!tournament || !rawMatch) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <h2 className="text-xl font-bold">Match not found</h2>
        <p className="mt-2 text-muted-foreground">This match lobby does not exist or has been deleted.</p>
        <Button asChild className="mt-4">
          <Link href={`/tournaments/${tournamentId}`}>Back to tournament</Link>
        </Button>
      </div>
    );
  }

  // Auto-generate tournament code on-demand if it does not exist
  if (!rawMatch.tournament_code) {
    const code = await generateTournamentCode(
      8888,
      rawMatch.id,
      5,
      tournament.region || "EUW",
      tournament.map_type || "SUMMONERS_RIFT"
    );
    await supabase.from("matches").update({ tournament_code: code }).eq("id", rawMatch.id);
    rawMatch.tournament_code = code;
  }

  const match = rawMatch as unknown as MatchWithTeams;

  // Authorize player role
  const isCaptainA = user?.id === match.team_a?.captain_id;
  const isCaptainB = user?.id === match.team_b?.captain_id;
  const isAdmin = user?.id === tournament.owner_id;

  const currentRole = isCaptainA
    ? "captain_a"
    : isCaptainB
      ? "captain_b"
      : isAdmin
        ? "admin"
        : "spectator";

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/tournaments/${tournamentId}/bracket`}>
            <ChevronLeft className="h-4 w-4" /> Back to Bracket
          </Link>
        </Button>
      </div>

      <header className="scanline-overlay relative overflow-hidden rounded-2xl border border-primary/20 bg-card p-6">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="text-center md:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Swords className="h-3.5 w-3.5" /> Match Room #{match.position} (Round {match.round})
            </span>
            <h1 className="mt-3 text-3xl font-black tracking-tight">{tournament.name} Match Lobby</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Coordinate team picks, draft champions, and chat in real-time.
            </p>
          </div>
          <div className="text-center md:text-right">
            <span className="text-xs uppercase tracking-widest text-muted-foreground block">Lobby Status</span>
            <span className="mt-1.5 inline-block rounded-md bg-secondary/80 px-3 py-1.5 text-sm font-bold uppercase tracking-wider text-primary border border-primary/20">
              {match.status}
            </span>
          </div>
        </div>
      </header>

      <MatchLobbyClient
        match={match}
        tournamentId={tournamentId}
        currentUser={user}
        currentRole={currentRole}
      />
    </div>
  );
}
