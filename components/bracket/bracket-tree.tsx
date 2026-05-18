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
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No bracket yet. Tournament admins can generate it from the admin dashboard.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="grid min-w-[860px] gap-4" style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(260px, 1fr))` }}>
        {rounds.map((round) => (
          <div key={round} className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
              Round {round}
            </h2>
            {matches
              .filter((match) => match.round === round)
              .sort((a, b) => a.position - b.position)
              .map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  teamA={match.team_a_id ? teamsById.get(match.team_a_id) : undefined}
                  teamB={match.team_b_id ? teamsById.get(match.team_b_id) : undefined}
                  winner={match.winner_team_id ? teamsById.get(match.winner_team_id) : undefined}
                  canAdmin={canAdmin}
                />
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
  canAdmin
}: {
  match: Match;
  teamA?: Team;
  teamB?: Team;
  winner?: Team;
  canAdmin: boolean;
}) {
  async function submitAction(formData: FormData) {
    "use server";
    await submitMatchResult(match.id, formData);
  }

  return (
    <Card className="bg-card/90">
      <CardHeader className="flex-row items-center justify-between py-4">
        <CardTitle className="text-sm">Match {match.position}</CardTitle>
        <Badge>{match.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <TeamRow team={teamA} isWinner={winner?.id === teamA?.id} />
        <TeamRow team={teamB} isWinner={winner?.id === teamB?.id} />
        {winner ? (
          <div className="flex items-center gap-2 rounded-md bg-primary/10 p-2 text-sm text-primary">
            <Trophy className="h-4 w-4" />
            {winner.name} advanced
          </div>
        ) : match.status === "ready" && teamA && teamB ? (
          <form action={submitAction} className="grid gap-2">
            <select name="winnerTeamId" className="h-9 rounded-md border bg-background px-2 text-sm">
              <option value={teamA.id}>{teamA.name}</option>
              <option value={teamB.id}>{teamB.name}</option>
            </select>
            <input
              name="notes"
              placeholder="Score or notes"
              className="h-9 rounded-md border bg-background px-2 text-sm"
            />
            <Button size="sm" variant="outline">
              Submit result
            </Button>
          </form>
        ) : null}
        {canAdmin && match.status !== "confirmed" && teamA && teamB ? (
          <div className="grid grid-cols-2 gap-2">
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
    <div className="flex items-center justify-between rounded-md border bg-background p-3">
      <span className={team ? "font-medium" : "text-muted-foreground"}>{team?.name ?? "TBD"}</span>
      {isWinner ? <Check className="h-4 w-4 text-primary" /> : null}
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
