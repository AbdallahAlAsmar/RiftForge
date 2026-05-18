import Link from "next/link";
import { Sparkles, Trophy, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTeamForm } from "@/components/team/create-team-form";
import { Float, HoverLift, LiveBackdrop, Reveal } from "@/components/motion/reveal";
import { createClient } from "@/lib/supabase/server";

export default async function TeamsPage() {
  const supabase = await createClient();
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, logo_url, average_tsr, source, tournament_id")
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <section className="space-y-5">
        <Reveal className="scanline-overlay relative overflow-hidden rounded-2xl border p-6">
          <LiveBackdrop />
          <div className="relative">
            <p className="inline-flex items-center gap-2 text-sm text-primary">
              <Sparkles className="h-4 w-4" /> Team command center
            </p>
              <h1 className="text-gradient-primary mt-2 text-3xl font-bold">Teams</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Create a premade roster or inspect generated teams with live-ready lineups.
            </p>
          </div>
          <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
            <Float className="h-full" intensity={5} duration={4}>
              <div className="glass-panel rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Registered teams</p>
                <p className="mt-1 text-xl font-bold">{teams?.length ?? 0}</p>
              </div>
            </Float>
            <Float className="h-full" intensity={6} duration={4.5}>
              <div className="glass-panel rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Roster status</p>
                <p className="mt-1 flex items-center gap-2 text-xl font-bold">
                  <span className="live-dot h-2.5 w-2.5 rounded-full bg-primary" /> Live sync
                </p>
              </div>
            </Float>
          </div>
        </Reveal>

        <div className="grid gap-4 sm:grid-cols-2">
          {teams?.length ? (
            teams.map((team, index) => (
              <Reveal key={team.id} delay={0.05 * index}>
                <HoverLift className="h-full">
                  <Link href={`/teams/${team.id}`}>
                    <Card className="interactive-surface h-full cursor-pointer bg-card/90">
                      <CardHeader className="flex-row items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary">
                          {team.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={team.logo_url} alt="" className="h-12 w-12 rounded-md object-cover" />
                          ) : (
                            <UsersRound className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <CardTitle>{team.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{team.average_tsr} avg TSR</p>
                        </div>
                      </CardHeader>
                      <CardContent className="flex items-center justify-between">
                        <Badge className="capitalize">{team.source}</Badge>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Trophy className="h-3.5 w-3.5 text-primary" /> Ready
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                </HoverLift>
              </Reveal>
            ))
          ) : (
            <Card className="glass-panel sm:col-span-2">
              <CardContent className="p-8 text-center text-muted-foreground">
                No teams yet.
              </CardContent>
            </Card>
          )}
        </div>
      </section>
      <aside>
        <Reveal delay={0.1}>
          <CreateTeamForm />
        </Reveal>
      </aside>
    </div>
  );
}
