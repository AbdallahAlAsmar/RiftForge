import Link from "next/link";
import { Sparkles, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LiveBackdrop, Reveal } from "@/components/motion/reveal";
import { InviteFriendSection } from "@/components/team/invite-friend";
import { TeamRoster } from "@/components/team/team-roster";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export default async function TeamDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getSessionUser();
  const [{ data: team }, { data: members }, { data: friendsData }] = await Promise.all([
    supabase.from("teams").select("*").eq("id", id).single(),
    supabase
      .from("team_members")
      .select("id, role, is_captain, users(id, display_name, avatar_url, rank, tsr)")
      .eq("team_id", id),
    user ? supabase.from("friends").select("*").or(`user_id.eq.${user.id},friend_id.eq.${user.id}`) : Promise.resolve({ data: [] })
  ]);

  let friends: any[] = [];
  if (user && friendsData) {
    const relatedUserIds = Array.from(new Set(
      friendsData.flatMap((f: any) => [f.user_id, f.friend_id])
    )).filter(fid => fid !== user.id);

    if (relatedUserIds.length > 0) {
      const { data: usersData } = await supabase
        .from("users")
        .select("id, display_name, avatar_url, region, rank, tsr")
        .in("id", relatedUserIds);
      
      const acceptedFriends = friendsData.filter((f: any) => f.status === "accepted");
      friends = acceptedFriends.map((f: any) => {
        const friendId = f.user_id === user.id ? f.friend_id : f.user_id;
        return {
          id: friendId,
          ...usersData?.find(u => u.id === friendId)
        };
      }).filter(f => f.display_name); // ensure valid user
    }
  }

  if (!team) {
    return <div className="text-muted-foreground">Team not found.</div>;
  }

  const isCaptain = team.captain_id === user?.id;

  return (
    <div className="space-y-6">
      <Reveal className="scanline-overlay relative overflow-hidden rounded-xl border bg-card p-6">
        <LiveBackdrop />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-secondary">
              {team.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={team.logo_url} alt="" className="h-16 w-16 rounded-md object-cover" />
              ) : (
                <UsersRound className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <div>
              <p className="inline-flex items-center gap-2 text-sm text-primary">
                <Sparkles className="h-4 w-4" /> Team profile
              </p>
              <Badge>{team.source}</Badge>
              <h1 className="mt-2 text-3xl font-bold">{team.name}</h1>
              <p className="mt-1 text-muted-foreground">{team.average_tsr} average TSR</p>
            </div>
          </div>
          {team.tournament_id ? (
            <Button asChild variant="outline">
              <Link href={`/tournaments/${team.tournament_id}`}>Tournament</Link>
            </Button>
          ) : null}
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <TeamRoster teamId={team.id} members={(members ?? []) as any} canManage={isCaptain} />
      </Reveal>

      {isCaptain ? (
        <Reveal delay={0.1}>
          <div className="grid gap-6">
            <Card className="interactive-surface">
              <CardHeader>
                <CardTitle>Captain tools</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                MVP invite links are represented in the database. The next iteration can add email or
                Discord delivery without changing the team model.
              </CardContent>
            </Card>

            <InviteFriendSection teamId={team.id} friends={friends as any} />
          </div>
        </Reveal>
      ) : null}
    </div>
  );
}
