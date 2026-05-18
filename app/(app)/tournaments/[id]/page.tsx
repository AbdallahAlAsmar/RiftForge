import Link from "next/link";
import { Crown, GitBranch, Sparkles, Swords, UsersRound, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTeamForm } from "@/components/team/create-team-form";
import { HoverLift, LiveBackdrop, Reveal } from "@/components/motion/reveal";
import { QueueForm } from "@/components/tournament/queue-form";
import { joinTournament, joinTournamentWithTeam } from "@/lib/actions/tournaments";
import {
  checkTeamEligibility,
  formatTeamEligibilityIssue,
  type TeamWithMembers
} from "@/lib/domain/team-eligibility";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export default async function TournamentDetailsPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getSessionUser();
  const userTeamsPromise = user
    ? supabase
        .from("teams")
        .select(
          "id, name, logo_url, average_tsr, captain_id, team_members(user_id, users(display_name, rank))"
        )
        .eq("captain_id", user.id)
        .or(`tournament_id.is.null,tournament_id.eq.${id}`)
    : Promise.resolve({ data: [] as unknown[] });
  const [{ data: tournament }, { data: teams }, { data: matches }, { data: userTeamsData }] =
    await Promise.all([
      supabase.from("tournaments").select("*").eq("id", id).single(),
      supabase.from("teams").select("*, team_members(id)").eq("tournament_id", id),
      supabase.from("matches").select("id").eq("tournament_id", id).limit(1),
      userTeamsPromise
    ]);

  if (!tournament) {
    return <div className="text-muted-foreground">Tournament not found.</div>;
  }

  const userTeams = (userTeamsData ?? []) as TeamWithMembers[];
  const teamChecks = userTeams.map((team) => ({
    team,
    issues: checkTeamEligibility(team, tournament.min_rank, tournament.max_rank)
  }));
  const hasEligibleTeam = teamChecks.some((check) => check.issues.length === 0);

  async function joinAction() {
    "use server";
    await joinTournament(id);
  }

  async function joinWithTeamAction(teamId: string) {
    "use server";
    await joinTournamentWithTeam(id, teamId);
  }

  const isOwner = user?.id === tournament.owner_id;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-6">
        <Reveal className="scanline-overlay relative overflow-hidden rounded-xl border bg-card p-6">
          <LiveBackdrop />
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm text-primary">
                <Sparkles className="h-4 w-4" /> Tournament spotlight
              </p>
              <Badge className="mt-3">{tournament.status}</Badge>
              <h1 className="mt-4 text-3xl font-bold">{tournament.name}</h1>
              <p className="mt-3 max-w-3xl text-muted-foreground">
                {tournament.description || "The admin has not added details yet."}
              </p>
            </div>
            <div className="flex gap-2">
              {isOwner ? (
                <Button asChild variant="outline">
                  <Link href={`/tournaments/${id}/admin`}>Admin</Link>
                </Button>
              ) : null}
              <Button asChild>
                <Link href={`/tournaments/${id}/bracket`}>
                  <GitBranch className="h-4 w-4" /> Bracket
                </Link>
              </Button>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <Stat label="Format" value={tournament.format.replace("_", " ")} icon={Swords} />
            <Stat label="Max teams" value={String(tournament.max_teams)} icon={UsersRound} />
            <Stat label="Rank floor" value={tournament.min_rank ?? "Open"} icon={Crown} />
            <Stat label="Rank cap" value={tournament.max_rank ?? "Open"} icon={Crown} />
          </div>
        </Reveal>

        <Reveal delay={0.05}>
          <Card className="interactive-surface bg-card/95">
          <CardHeader>
            <CardTitle>Registered teams</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {teams?.length ? (
              teams.map((team) => (
                <Reveal key={team.id} distance={10}>
                  <HoverLift>
                    <Link
                      href={`/teams/${team.id}`}
                      className="interactive-surface flex items-center justify-between rounded-md border p-3 transition hover:bg-secondary/75"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
                          {team.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={team.logo_url} alt="" className="h-10 w-10 rounded-md object-cover" />
                          ) : (
                            <UsersRound className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{team.name}</p>
                          <p className="text-sm text-muted-foreground">{team.average_tsr} avg TSR</p>
                        </div>
                      </div>
                      <Badge>{team.source}</Badge>
                    </Link>
                  </HoverLift>
                </Reveal>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No teams have joined yet.</p>
            )}
          </CardContent>
          </Card>
        </Reveal>
      </section>

      <aside className="space-y-4">
        <Reveal delay={0.08}>
          <Card className="interactive-surface bg-card/95">
          <CardHeader>
            <CardTitle>Join tournament</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {user ? (
              <div className="grid gap-3">
                <p className="text-sm font-medium">Join with your team</p>
                {teamChecks.length ? (
                  teamChecks.map(({ team, issues }) => {
                    const eligible = issues.length === 0;
                    return (
                      <div
                        key={team.id}
                        className="interactive-surface space-y-3 rounded-md border bg-card/95 p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
                              {team.logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={team.logo_url}
                                  alt=""
                                  className="h-10 w-10 rounded-md object-cover"
                                />
                              ) : (
                                <UsersRound className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{team.name}</p>
                              <p className="text-xs text-muted-foreground">{team.average_tsr} avg TSR</p>
                            </div>
                          </div>
                          <Badge
                            className={
                              eligible
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-destructive/40 bg-destructive/10 text-destructive"
                            }
                          >
                            {eligible ? "Eligible" : "Not eligible"}
                          </Badge>
                        </div>
                        {eligible ? (
                          <form action={joinWithTeamAction.bind(null, team.id)}>
                            <Button className="w-full">Join with this team</Button>
                          </form>
                        ) : (
                          <div className="space-y-1.5">
                            {issues.map((issue, index) => (
                              <p
                                key={`${team.id}-issue-${index}`}
                                className="flex items-start gap-2 text-xs text-muted-foreground"
                              >
                                <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                                <span>{formatTeamEligibilityIssue(issue)}</span>
                              </p>
                            ))}
                            <p className="pt-1 text-xs text-muted-foreground">
                              This team does not fit this tournament. Create a new eligible team.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground">
                    You do not have a captained team yet. Create one below to join as a team.
                  </p>
                )}
                {!hasEligibleTeam && teamChecks.length ? (
                  <p className="text-xs text-muted-foreground">
                    No current team fits this tournament yet. You need a new team.
                  </p>
                ) : null}
              </div>
            ) : null}
            <form action={joinAction}>
              <Button className="w-full">Join as player</Button>
            </form>
            <QueueForm tournamentId={id} />
          </CardContent>
          </Card>
        </Reveal>
        <Reveal delay={0.12}>
          <CreateTeamForm tournamentId={id} />
        </Reveal>
        {matches?.length ? (
          <Button asChild variant="outline" className="w-full">
            <Link href={`/tournaments/${id}/bracket`}>View live bracket</Link>
          </Button>
        ) : null}
      </aside>
    </div>
  );
}

function Stat({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="interactive-surface rounded-md border bg-background/80 p-3">
      <Icon className="mb-2 h-4 w-4 text-primary" />
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}
