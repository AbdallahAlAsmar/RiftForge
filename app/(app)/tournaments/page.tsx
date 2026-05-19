import Link from "next/link";
import { CalendarDays, Plus, Shield, Sparkles, Swords } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CreateTournamentForm } from "@/components/tournament/create-tournament-form";
import { Float, HoverLift, LiveBackdrop, Reveal } from "@/components/motion/reveal";
import { createClient } from "@/lib/supabase/server";

export default async function TournamentsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; status?: string; format?: string }>;
}) {
  const supabase = await createClient();
  const resolvedParams = await searchParams;
  const searchQuery = typeof resolvedParams?.q === "string" ? resolvedParams.q.trim() : "";
  const statusFilter = typeof resolvedParams?.status === "string" ? resolvedParams.status : "all";
  const formatFilter = typeof resolvedParams?.format === "string" ? resolvedParams.format : "all";

  let query = supabase.from("tournaments").select("*").order("created_at", { ascending: false });

  if (searchQuery) {
    query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
  }

  if (statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  if (formatFilter !== "all") {
    query = query.eq("format", formatFilter);
  }

  const { data: tournaments } = await query;
  const joinStatusLabel =
    statusFilter === "all"
      ? "Any"
      : statusFilter === "published"
        ? "Open"
        : statusFilter === "live"
          ? "Live"
          : statusFilter === "completed"
            ? "Completed"
            : statusFilter === "draft"
              ? "Draft"
              : statusFilter.replace(/_/g, " ");
  const formatLabel =
    formatFilter === "all"
      ? "Any format"
      : formatFilter === "single_elimination"
        ? "Single elimination"
        : formatFilter === "double_elimination"
          ? "Double elimination"
          : formatFilter.replace(/_/g, " ");
  const hasFilters = Boolean(searchQuery || statusFilter !== "all" || formatFilter !== "all");

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
                  <span className="live-dot h-2.5 w-2.5 rounded-full bg-primary" /> {joinStatusLabel}
                </p>
              </div>
            </Float>
            <Float className="h-full" intensity={4} duration={4.8}>
              <div className="glass-panel rounded-lg p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Formats</p>
                <p className="mt-1 text-xl font-bold">{formatLabel}</p>
              </div>
            </Float>
          </div>

          <form
            method="get"
            className="relative mt-6 grid gap-3 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto] lg:items-end"
          >
            <div className="grid gap-2">
              <Label htmlFor="q" className="text-xs uppercase tracking-[0.3em] text-[#8A8A8A]">
                Search tournaments
              </Label>
              <Input
                id="q"
                name="q"
                placeholder="Search by name or description"
                defaultValue={searchQuery}
                className="border-white/10 bg-[#0A0A0A]/80 text-white placeholder:text-[#8A8A8A]"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status" className="text-xs uppercase tracking-[0.3em] text-[#8A8A8A]">
                Join status
              </Label>
              <Select
                id="status"
                name="status"
                defaultValue={statusFilter}
                className="border-white/10 bg-[#0A0A0A]/80 text-white"
              >
                <option value="all">Any status</option>
                <option value="published">Open</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
                <option value="draft">Draft</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="format" className="text-xs uppercase tracking-[0.3em] text-[#8A8A8A]">
                Format
              </Label>
              <Select
                id="format"
                name="format"
                defaultValue={formatFilter}
                className="border-white/10 bg-[#0A0A0A]/80 text-white"
              >
                <option value="all">Any format</option>
                <option value="single_elimination">Single elimination</option>
                <option value="double_elimination">Double elimination</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" className="w-full">
                Apply
              </Button>
              {hasFilters ? (
                <Button asChild variant="outline" className="w-full">
                  <Link href="/tournaments">Clear</Link>
                </Button>
              ) : null}
            </div>
          </form>
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
