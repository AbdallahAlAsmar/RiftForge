import { Check, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmMatchWinner, submitMatchResult } from "@/lib/actions/brackets";
import { getBracketSlotLabel } from "@/lib/domain/brackets";
import BracketConnectors from "./bracket-connectors";

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
  next_match_id?: string | null;
};

export function BracketTree({
  matches,
  teams,
  maxTeams,
  canAdmin
}: {
  matches: Match[];
  teams: Team[];
  maxTeams: number;
  canAdmin: boolean;
}) {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const rounds = [...new Set(matches.map((match) => match.round))].sort((a, b) => a - b);
  const bracketSize = nextPowerOfTwo(Math.max(maxTeams, 2));

  // Bracket geometry tuned for real-world competitive layouts
  const MATCH_HEIGHT = 180;
  const MATCH_WIDTH = 280;
  const COLUMN_GAP = 120;
  const BASE_VERTICAL_GAP = 50;
  const RIGHT_PADDING = 140;

  const roundPositions = (() => {
    const positions: Record<number, number[]> = {};
    const roundOneCount = bracketSize / 2;

    positions[1] = Array.from({ length: roundOneCount }, (_, index) => index * (MATCH_HEIGHT + BASE_VERTICAL_GAP));

    for (let round = 2; round <= rounds.length; round += 1) {
      const matchCount = bracketSize / Math.pow(2, round);
      positions[round] = Array.from({ length: matchCount }, (_, index) => {
        const prevIndex = index * 2;
        const prevY1 = positions[round - 1]?.[prevIndex] ?? 0;
        const prevY2 = positions[round - 1]?.[prevIndex + 1] ?? prevY1;
        const prevCenter1 = prevY1 + MATCH_HEIGHT / 2;
        const prevCenter2 = prevY2 + MATCH_HEIGHT / 2;
        return (prevCenter1 + prevCenter2) / 2 - MATCH_HEIGHT / 2;
      });
    }

    return positions;
  })();

  const roundOneBottom = (roundPositions[1]?.at(-1) ?? 0) + MATCH_HEIGHT;
  const totalHeight = Math.max(roundOneBottom, MATCH_HEIGHT);
  const totalWidth = rounds.length * MATCH_WIDTH + (rounds.length - 1) * COLUMN_GAP + RIGHT_PADDING;

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

      <div
        className="relative bracket-board"
        style={{
          width: totalWidth,
          height: totalHeight,
          perspective: "1200px"
        }}
      >
        {/* Render all rounds */}
        {rounds.map((round, roundIndex) => {
          const matchesInRound = matches.filter((m) => m.round === round).sort((a, b) => a.position - b.position);
          const roundX = roundIndex * (MATCH_WIDTH + COLUMN_GAP);

          return (
            <div
              key={`round-${round}`}
              className="absolute top-0"
              style={{
                left: roundX,
                width: MATCH_WIDTH,
                height: totalHeight
              }}
            >
              {/* Round label */}
              <div className="absolute -top-8 left-0 right-0 flex justify-center">
                <h2 className="text-[10px] font-semibold uppercase tracking-[0.5em] text-cyan-100/70">
                  {round === rounds.length ? "Champion" : round === rounds.length - 1 ? "Final" : `Round ${round}`}
                </h2>
              </div>

              {/* Render matches in this round */}
                {matchesInRound.map((match, matchIndex) => {
                  const matchY = roundPositions[round]?.[matchIndex] ?? 0;

                return (
                  <div
                    key={match.id}
                    className="absolute"
                    style={{
                      top: matchY,
                      left: 0,
                      width: MATCH_WIDTH,
                      height: MATCH_HEIGHT
                    }}
                    data-match-id={match.id}
                    data-round={round}
                    data-position={match.position}
                  >
                    <MatchCard
                      match={match}
                      teamA={match.team_a_id ? teamsById.get(match.team_a_id) : undefined}
                      teamB={match.team_b_id ? teamsById.get(match.team_b_id) : undefined}
                      winner={match.winner_team_id ? teamsById.get(match.winner_team_id) : undefined}
                      maxTeams={maxTeams}
                      canAdmin={canAdmin}
                      isFinal={round === rounds.length}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Connectors overlay */}
        <BracketConnectors
          matches={matches}
          rounds={rounds}
          bracketSize={bracketSize}
          matchHeight={MATCH_HEIGHT}
          matchWidth={MATCH_WIDTH}
          columnGap={COLUMN_GAP}
          minVerticalGap={BASE_VERTICAL_GAP}
        />
      </div>
    </div>
  );
}

function MatchCard({
  match,
  teamA,
  teamB,
  winner,
  maxTeams,
  canAdmin,
  isFinal
}: {
  match: Match;
  teamA?: Team;
  teamB?: Team;
  winner?: Team;
  maxTeams: number;
  canAdmin: boolean;
  isFinal?: boolean;
}) {
  async function submitAction(formData: FormData) {
    "use server";
    await submitMatchResult(match.id, formData);
  }

  return (
    <Card className="relative h-full w-full border border-red-500/40 bg-[#141414]/95 shadow-[0_22px_90px_rgba(0,0,0,0.55)] backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 w-2 bg-red-500/95 shadow-[0_0_18px_rgba(255,59,59,0.9)]" />
      <CardHeader className="flex-row items-center justify-between border-b border-white/10 py-2">
        <CardTitle className="text-[10px] uppercase tracking-[0.5em] text-white/90">
          {isFinal ? "Final" : `Stage ${match.round}`}
        </CardTitle>
        <Badge className="border-white/10 bg-white/5 text-[10px] uppercase tracking-[0.25em]">{match.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-0 overflow-y-auto p-0">
        <TeamRow
          team={teamA}
          placeholder={getBracketSlotLabel(maxTeams, match.round, match.position, "A")}
          isWinner={winner?.id === teamA?.id}
        />
        <TeamRow
          team={teamB}
          placeholder={getBracketSlotLabel(maxTeams, match.round, match.position, "B")}
          isWinner={winner?.id === teamB?.id}
        />
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

function TeamRow({ team, placeholder, isWinner }: { team?: Team; placeholder: string; isWinner: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b border-white/10 px-4 py-2 last:border-b-0">
      <TeamGlyph name={team?.name} />
      <span className={team ? "text-sm font-semibold uppercase tracking-[0.16em] text-white" : "text-sm text-[#8A8A8A]"}>
        {team?.name ?? placeholder}
      </span>
      {isWinner ? <Check className="ml-auto h-4 w-4 text-red-500" /> : <span className="ml-auto text-[10px] font-bold uppercase tracking-[0.35em] text-[#8A8A8A]">vs</span>}
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
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-red-500/35 bg-red-500/10 text-[10px] font-black uppercase tracking-[0.18em] text-red-400">
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

function nextPowerOfTwo(value: number) {
  return 2 ** Math.ceil(Math.log2(value));
}
