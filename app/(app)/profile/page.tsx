import Link from "next/link";
import { Activity, History, Link2, MessageCircle, Shield, Sparkles, Swords, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Float, HoverLift, LiveBackdrop, Reveal } from "@/components/motion/reveal";
import { ProfileForm } from "@/components/team/profile-form";
import { FriendsSection } from "@/components/profile/friends-section";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: profile }, { data: riot }, { data: tournaments }, { data: friendsData }] = await Promise.all([
    supabase.from("users").select("*").eq("id", user.id).single(),
    supabase.from("riot_accounts").select("*").eq("user_id", user.id).maybeSingle(),
    supabase
      .from("tournament_participants")
      .select("id, tournaments(id, name, status)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("friends").select("*").or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
  ]);

  const relatedUserIds = Array.from(new Set(
    (friendsData || []).flatMap((f: any) => [f.user_id, f.friend_id])
  )).filter(id => id !== user.id);

  let relatedProfiles: Record<string, any> = {};
  if (relatedUserIds.length > 0) {
    const { data: usersData } = await supabase
      .from("users")
      .select("id, display_name, avatar_url, region, rank, tsr")
      .in("id", relatedUserIds);
    if (usersData) {
      for (const u of usersData) relatedProfiles[u.id] = u;
    }
  }

  const friends = (friendsData || []).map((f: any) => ({
    ...f,
    profile: relatedProfiles[f.user_id === user.id ? f.friend_id : f.user_id] || null
  }));

  if (!profile) {
    return <div className="text-muted-foreground">Profile not found.</div>;
  }

  const identityProviders = new Set(
    [
      ...(((user.app_metadata?.providers as string[] | undefined) ?? []).filter(Boolean)),
      user.app_metadata?.provider as string | undefined,
      ...(((user as unknown as { identities?: Array<{ provider?: string }> }).identities ?? [])
        .map((identity) => identity.provider)
        .filter(Boolean) as string[])
    ].filter(Boolean)
  );
  const hasDiscord = identityProviders.has("discord");
  const accountType = riot ? "Riot Games" : hasDiscord ? "Discord" : "Supabase";

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <aside className="space-y-4">
        <Reveal className="scanline-overlay relative overflow-hidden rounded-xl border">
          <LiveBackdrop />
          <Card className="relative border-0 bg-transparent shadow-none">
            <CardHeader className="items-center text-center">
              <div className="glass-panel flex h-20 w-20 items-center justify-center rounded-md">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-md object-cover" />
                ) : (
                  <UserRound className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <CardTitle>{profile.display_name ?? "Player"}</CardTitle>
              <div className="flex gap-2">
                <Badge>{profile.region}</Badge>
                <Badge>{profile.rank ?? "unranked"}</Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">TSR</span>
                <strong>{profile.tsr}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Riot</span>
                <strong>{riot ? `${riot.game_name}#${riot.tag_line}` : "Not linked"}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Signed in with</span>
                <strong>{accountType}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Sync</span>
                <strong className="inline-flex items-center gap-2 text-primary">
                  <span className="live-dot h-2.5 w-2.5 rounded-full bg-primary" />
                  Active
                </strong>
              </div>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.1}>
          <FriendsSection currentUserId={user.id} friends={friends} />
        </Reveal>

        <Reveal delay={0.2}>
          <Float intensity={5}>
            <Card className="glass-panel">
              <CardContent className="p-5">
                <p className="inline-flex items-center gap-2 text-sm text-primary">
                  <Sparkles className="h-4 w-4" /> Player momentum
                </p>
                <p className="text-gradient-primary mt-2 text-2xl font-bold">Always tournament-ready</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Keep roles, rank, and profile settings current to improve balancing.
                </p>
              </CardContent>
            </Card>
          </Float>
        </Reveal>
      </aside>

      <section className="space-y-4">
        <Reveal>
          <Card className="interactive-surface border-primary/25">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" /> Account connections
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex flex-col justify-between gap-3 rounded-md border p-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <Swords className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Riot Games</p>
                    <p className="text-sm text-muted-foreground">
                      {riot
                        ? `${riot.game_name}#${riot.tag_line} is linked for tournament eligibility.`
                        : "Required before joining queues, registering teams, or participating in tournaments."}
                    </p>
                  </div>
                </div>
                {riot ? (
                  <Badge className="w-fit text-primary">Linked</Badge>
                ) : (
                  <Button asChild className="interactive-surface w-fit">
                    <Link href="/auth/riot?mode=link&next=/profile">Connect Riot</Link>
                  </Button>
                )}
              </div>

              <div className="flex flex-col justify-between gap-3 rounded-md border p-4 sm:flex-row sm:items-center">
                <div className="flex items-start gap-3">
                  <MessageCircle className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Discord</p>
                    <p className="text-sm text-muted-foreground">
                      {hasDiscord
                        ? "Discord is linked for future community and notification features."
                        : riot
                          ? "Optional for now. Linking Discord will support future invites and event notifications."
                          : "You are using Discord-first access. Link Riot above to compete."}
                    </p>
                  </div>
                </div>
                {hasDiscord ? (
                  <Badge className="w-fit text-primary">Linked</Badge>
                ) : (
                  <Button asChild variant="outline" className="interactive-surface w-fit">
                    <Link href="/auth/discord?mode=link&next=/profile">Connect Discord</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="interactive-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Profile settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileForm profile={profile} />
            </CardContent>
          </Card>
        </Reveal>

        <Reveal delay={0.1}>
          <Card className="interactive-surface">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" /> Tournament history
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {tournaments?.length ? (
                tournaments.map((row, index) => {
                  const tournament = (row as unknown as {
                    tournaments?: { id: string; name: string; status: string };
                  }).tournaments;
                  return tournament ? (
                    <Reveal key={row.id} delay={0.03 * index} distance={10}>
                      <HoverLift>
                        <Link
                          href={`/tournaments/${tournament.id}`}
                          className="interactive-surface flex items-center justify-between rounded-md border p-3"
                        >
                          <span className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            {tournament.name}
                          </span>
                          <Badge>{tournament.status}</Badge>
                        </Link>
                      </HoverLift>
                    </Reveal>
                  ) : null;
                })
              ) : (
                <div className="rounded-md border p-4 text-sm text-muted-foreground">
                  No tournament history yet.
                </div>
              )}
              <Button asChild variant="outline" className="interactive-surface">
                <Link href="/tournaments">Find tournaments</Link>
              </Button>
            </CardContent>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}
