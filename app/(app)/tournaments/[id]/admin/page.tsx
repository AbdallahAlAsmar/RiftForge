import Link from "next/link";
import { Bot, GitBranch, Radio, Rocket, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateBracket } from "@/lib/actions/brackets";
import { generateBalancedTeams } from "@/lib/actions/queue";
import { publishTournament } from "@/lib/actions/tournaments";
import { requireTournamentOwner } from "@/lib/actions/common";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function TournamentAdminPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tournament } = await requireTournamentOwner(id);
  const admin = createAdminClient();

  const [{ data: teams }, { data: queueEntries }, { data: soloParticipants }, { data: matches }, { data: results }] =
    await Promise.all([
      admin.from("teams").select("id, name, average_tsr, source").eq("tournament_id", id),
      admin
        .from("queue_entries")
        .select("id, mode, tsr, status, users(display_name, preferred_roles)")
        .eq("tournament_id", id)
        .order("created_at", { ascending: true }),
      admin
        .from("tournament_participants")
        .select("id, user_id, team_id, users(display_name, preferred_roles, tsr)")
        .eq("tournament_id", id)
        .is("team_id", null),
      admin.from("matches").select("id, status").eq("tournament_id", id),
      admin
        .from("match_results")
        .select("id, status, match_id, winner_team_id")
        .eq("status", "submitted")
    ]);

  async function publishAction() {
    "use server";
    await publishTournament(id);
  }

  async function balanceAction() {
    "use server";
    await generateBalancedTeams(id);
  }

  async function bracketAction() {
    "use server";
    await generateBracket(id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge>{tournament.status}</Badge>
          <h1 className="mt-3 text-3xl font-bold">{tournament.name} admin</h1>
          <p className="mt-2 text-muted-foreground">Publish, balance teams, generate brackets, and review results.</p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/tournaments/${id}`}>View public page</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Metric icon={UsersRound} label="Teams" value={teams?.length ?? 0} />
        <Metric
          icon={Bot}
          label="Queued"
          value={(queueEntries?.filter((entry) => entry.status === "queued").length ?? 0) + (soloParticipants?.length ?? 0)}
        />
        <Metric icon={GitBranch} label="Matches" value={matches?.length ?? 0} />
        <Metric icon={Radio} label="Pending results" value={results?.length ?? 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Control panel</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <form action={publishAction}>
            <Button variant="outline">
              <Rocket className="h-4 w-4" /> Publish
            </Button>
          </form>
          <form action={balanceAction}>
            <Button variant="outline">
              <Bot className="h-4 w-4" /> Build balanced teams
            </Button>
          </form>
          <form action={bracketAction}>
            <Button>
              <GitBranch className="h-4 w-4" /> Generate bracket
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {teams?.length ? (
              teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between rounded-md border p-3">
                  <span>{team.name}</span>
                  <span className="text-sm text-muted-foreground">{team.average_tsr} TSR</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No teams yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Solo/duo queue</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {queueEntries?.length || soloParticipants?.length ? (
              <>
                {queueEntries
                  ?.filter((entry) => entry.status === "queued")
                  .map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="font-medium">
                          {(entry as unknown as { users?: { display_name?: string } }).users?.display_name ?? "Player"}
                        </p>
                        <p className="text-sm text-muted-foreground">{entry.mode} - {entry.tsr} TSR</p>
                      </div>
                      <Badge>{entry.status}</Badge>
                    </div>
                  ))}
                {soloParticipants?.length ? (
                  <>
                    <p className="pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Joined without a team yet
                    </p>
                    {soloParticipants.map((participant) => {
                      const profile = (participant as unknown as {
                        users?: { display_name?: string | null; preferred_roles?: string[]; tsr?: number };
                      }).users;

                      return (
                        <div key={participant.id} className="flex items-center justify-between rounded-md border p-3">
                          <div>
                            <p className="font-medium">{profile?.display_name ?? "Player"}</p>
                            <p className="text-sm text-muted-foreground">
                              solo - {profile?.tsr ?? 300} TSR
                            </p>
                          </div>
                          <Badge>Joined</Badge>
                        </div>
                      );
                    })}
                  </>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No queue entries yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-primary" />
      </CardContent>
    </Card>
  );
}
