import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BracketTree } from "@/components/bracket/bracket-tree";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export default async function BracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getSessionUser();
  const [{ data: tournament }, { data: matches }, { data: teams }] = await Promise.all([
    supabase.from("tournaments").select("*").eq("id", id).single(),
    supabase
      .from("matches")
      .select("id, round, position, team_a_id, team_b_id, winner_team_id, status")
      .eq("tournament_id", id)
      .order("round", { ascending: true })
      .order("position", { ascending: true }),
    supabase.from("teams").select("id, name").eq("tournament_id", id)
  ]);

  if (!tournament) {
    return <div className="text-muted-foreground">Tournament not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{tournament.name} bracket</h1>
          <p className="mt-2 text-muted-foreground">
            Captains submit results. Admins confirm winners and advance the bracket.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/tournaments/${id}`}>Back to tournament</Link>
        </Button>
      </div>
      <BracketTree
        matches={matches ?? []}
        teams={teams ?? []}
        canAdmin={user?.id === tournament.owner_id}
      />
    </div>
  );
}
