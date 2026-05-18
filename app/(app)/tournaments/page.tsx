import Link from "next/link";
import { CalendarDays, Plus, Shield, Sparkles, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateTournamentForm } from "@/components/tournament/create-tournament-form";
import { Float, HoverLift, LiveBackdrop, Reveal } from "@/components/motion/reveal";
import { createClient } from "@/lib/supabase/server";

export default async function TournamentsPage() {
  const supabase = await createClient();
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
      <section className="space-y-5">
        <Reveal className="scanline-overlay relative overflow-hidden rounded-2xl border p-6">
          <LiveBackdrop />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm text-primary">
                <Sparkles className="h-4 w-4" /> Live operations center
              </p>
              <h1 className="text-gradient-primary mt-2 text-3xl font-bold">Tournament browser</h1>
              <p className="mt-2 max-w-2xl text-muted-foreground">
                Join live events, queue as solo or duo, or create a new bracket.
              </p>
            </div>
            <Button asChild variant="outline" className="interactive-surface">
              <Link href="/teams">
                <Plus className="h-4 w-4" /> Create team
              </Link>
            </Button>
          </div>
          <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
            <Float className="h-full" intensity={5} duration={4}>
              <div className="glass-panel rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Active brackets</p>
                <p className="mt-1 text-xl font-bold">{tournaments?.length ?? 0}</p>
              </div>
            </Float>
            <Float className="h-full" intensity={6} duration={4.4}>
              <div className="glass-panel rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Join status</p>
                <p className="mt-1 flex items-center gap-2 text-xl font-bold">
                  <span className="live-dot h-2.5 w-2.5 rounded-full bg-primary" /> Open
                </p>
              </div>
            </Float>
            <Float className="h-full" intensity={4} duration={4.8}>
              <div className="glass-panel rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Formats</p>
                <p className="mt-1 text-xl font-bold">Solo & Team</p>
              </div>
            </Float>
          </div>
        </Reveal>

        <div className="grid gap-4">
          {tournaments?.length ? (
            tournaments.map((tournament, index) => (
              <Reveal key={tournament.id} delay={0.06 * index}>
                <HoverLift>
                  <Link href={`/tournaments/${tournament.id}`}>
                    <Card className="interactive-surface cursor-pointer bg-card/90">
                      <CardHeader className="flex-row items-start justify-between gap-4">
                        <div>
                          <CardTitle>{tournament.name}</CardTitle>
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                            {tournament.description || "No description yet."}
                          </p>
                        </div>
                        <Badge className="capitalize">{tournament.status}</Badge>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <Swords className="h-4 w-4 text-primary" />
                          {tournament.format.replace("_", " ")}
                        </span>
                        <span className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-primary" />
                          {tournament.starts_at
                            ? new Date(tournament.starts_at).toLocaleString()
                            : "Start TBD"}
                        </span>
                        <span className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          {tournament.max_teams} teams max
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                </HoverLift>
              </Reveal>
            ))
          ) : (
            <Card className="glass-panel">
              <CardContent className="p-8 text-center text-muted-foreground">
                No tournaments yet. Create the first one and set the tone.
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      <aside>
        <Reveal delay={0.1}>
          <CreateTournamentForm />
        </Reveal>
      </aside>
    </div>
  );
}
