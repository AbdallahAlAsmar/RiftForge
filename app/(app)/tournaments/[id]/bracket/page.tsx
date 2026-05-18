import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BracketTree } from "@/components/bracket/bracket-tree";
import { BracketCanvas } from "@/components/bracket/bracket-canvas";
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
          <p className="text-xs font-black uppercase tracking-[0.45em] text-cyan-300">Live bracket system</p>
          <h1 className="mt-2 text-3xl font-bold">{tournament.name} bracket</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Pan around, zoom in, and follow the bracket like a live esports broadcast.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/tournaments/${id}`}>Back to tournament</Link>
        </Button>
      </div>

      <BracketCanvas>
        <BracketTree
          matches={matches ?? []}
          teams={teams ?? []}
          canAdmin={user?.id === tournament.owner_id}
        />
      </BracketCanvas>
    </div>
  );
}
