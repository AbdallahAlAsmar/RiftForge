import { Check, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmMatchWinner, submitMatchResult } from "@/lib/actions/brackets";

type Team = {
  id: string;
  name: string;
};

type Match = {
  id: string;
  round: number;
  position: number;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_team_id: string | null;
  status: string;
};

export function BracketTree({
  matches,
  teams,
  canAdmin
}: {
  matches: Match[];
  teams: Team[];
  canAdmin: boolean;
}) {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const rounds = [...new Set(matches.map((match) => match.round))].sort((a, b) => a - b);

  if (!matches.length) {
    return (
      <Card className="border-white/10 bg-black/30">
        <CardContent className="p-8 text-center text-muted-foreground">
          No bracket yet. Tournament admins can generate it from the admin dashboard.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-max pb-6">
      <div className="mb-8 flex items-center gap-3 text-cyan-200">
        <div className="h-px w-10 bg-cyan-300/60" />
        <p className="text-xs font-black uppercase tracking-[0.5em]">Playoff bracket</p>
        <div className="h-px w-10 bg-cyan-300/60" />
      </div>
      <div className="grid min-w-[1180px] gap-x-14 gap-y-10" style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(290px, 1fr))` }}>
        {rounds.map((round) => (
          <div key={round} className="relative space-y-4">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.5em] text-cyan-100/70">
              {round === rounds.length ? "Champion" : round === rounds.length - 1 ? "Final" : `Round ${round}`}
            </h2>
            {matches
              .filter((match) => match.round === round)
              .sort((a, b) => a.position - b.position)
              .map((match) => (
                <div key={match.id} className="relative">
                  <div className="absolute -right-7 top-1/2 hidden h-px w-7 bg-cyan-300/45 lg:block" />
                  <div className="absolute -right-7 top-1/2 hidden h-24 w-px -translate-y-1/2 bg-cyan-300/35 lg:block" />
                  <MatchCard
                    match={match}
                    teamA={match.team_a_id ? teamsById.get(match.team_a_id) : undefined}
                    teamB={match.team_b_id ? teamsById.get(match.team_b_id) : undefined}
                    winner={match.winner_team_id ? teamsById.get(match.winner_team_id) : undefined}
                    canAdmin={canAdmin}
                    isFinal={round === rounds.length}
                  />
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({
  match,
  teamA,
  teamB,
  winner,
  canAdmin,
  isFinal
}: {
  match: Match;
  teamA?: Team;
  teamB?: Team;
  winner?: Team;
  canAdmin: boolean;
  isFinal?: boolean;
}) {
  async function submitAction(formData: FormData) {
    "use server";
    await submitMatchResult(match.id, formData);
  }

  return (
    <Card className="relative overflow-hidden border border-cyan-400/25 bg-[#04061b]/90 shadow-[0_22px_90px_rgba(0,0,0,0.55)] backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 w-2 bg-cyan-400/95 shadow-[0_0_18px_rgba(34,211,238,0.9)]" />
      <CardHeader className="flex-row items-center justify-between border-b border-white/5 py-3">
        <CardTitle className="text-[10px] uppercase tracking-[0.5em] text-cyan-100/85">
          {isFinal ? "Final" : `M${match.position}`}
        </CardTitle>
        <Badge className="border-white/10 bg-white/5 text-[10px] uppercase tracking-[0.25em]">{match.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-0 p-0">
        <TeamRow team={teamA} isWinner={winner?.id === teamA?.id} />
        <TeamRow team={teamB} isWinner={winner?.id === teamB?.id} />
        {winner ? (
          <div className="flex items-center gap-2 border-t border-white/5 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary">
            <Trophy className="h-4 w-4" />
            {winner.name} advanced
          </div>
        ) : match.status === "ready" && teamA && teamB ? (
          <form action={submitAction} className="grid gap-2 border-t border-white/5 px-4 py-3">
            <select name="winnerTeamId" className="h-10 rounded-md border border-white/10 bg-black/40 px-2 text-sm text-foreground outline-none">
              <option value={teamA.id}>{teamA.name}</option>
              <option value={teamB.id}>{teamB.name}</option>
            </select>
            <input
              name="notes"
              placeholder="Score or notes"
              className="h-10 rounded-md border border-white/10 bg-black/40 px-2 text-sm outline-none"
            />
            <Button size="sm" variant="outline">
              Submit result
            </Button>
          </form>
        ) : null}
        {canAdmin && match.status !== "confirmed" && teamA && teamB ? (
          <div className="grid grid-cols-2 gap-2 border-t border-white/5 px-4 py-3">
            <ConfirmButton matchId={match.id} team={teamA} />
            <ConfirmButton matchId={match.id} team={teamB} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function TeamRow({ team, isWinner }: { team?: Team; isWinner: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3 last:border-b-0">
      <TeamGlyph name={team?.name} />
      <span className={team ? "text-sm font-semibold uppercase tracking-[0.16em] text-white" : "text-sm text-slate-400"}>
        {team?.name ?? "WINNER"}
      </span>
      {isWinner ? <Check className="ml-auto h-4 w-4 text-cyan-300" /> : <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.35em] text-slate-500">vs</span>}
    </div>
  );
}

function TeamGlyph({ name }: { name?: string }) {
  const initials = name
    ? name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "W";

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-cyan-300/35 bg-cyan-300/10 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
      {initials}
    </div>
  );
}

function ConfirmButton({ matchId, team }: { matchId: string; team: Team }) {
  async function confirmAction() {
    "use server";
    await confirmMatchWinner(matchId, team.id);
  }

  return (
    <form action={confirmAction}>
      <Button className="w-full" size="sm" variant="secondary">
        {team.name}
      </Button>
    </form>
  );
}
