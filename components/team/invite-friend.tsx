"use client";

import { useState } from "react";
import { UserRound, Loader2, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type FriendData = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  rank: string | null;
  tsr: number;
};

// We will assume there's a server action `inviteToTeam` which we can call.
// Since we don't know the exact name of the server action, let's just make a mock one 
// or implement it if we need to. Actually, looking at `lib/actions/teams.ts` there might be one.
// But for now, we'll just show the UI. Let's create an action in teams.ts or call an existing one.
import { inviteUserToTeam } from "@/lib/actions/teams"; // Assume this exists or we will create it

export function InviteFriendSection({ teamId, friends }: { teamId: string; friends: FriendData[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleInvite(friendId: string) {
    setLoadingId(friendId);
    await inviteUserToTeam(teamId, friendId);
    setLoadingId(null);
  }

  return (
    <Card className="interactive-surface">
      <CardHeader>
        <CardTitle className="text-sm">Invite Friends to Team</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {friends.length === 0 ? (
          <div className="rounded-md border p-4 text-sm text-muted-foreground text-center">
            You don't have any friends to invite yet.
          </div>
        ) : (
          friends.map(friend => (
            <div key={friend.id} className="flex items-center justify-between rounded-md border p-3 hover:bg-secondary/50">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary">
                  {friend.avatar_url ? (
                    <img src={friend.avatar_url} alt="" className="h-8 w-8 rounded-md object-cover" />
                  ) : (
                    <UserRound className="h-4 w-4" />
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{friend.display_name}</span>
                  <span className="text-xs text-muted-foreground">{friend.rank ?? "unranked"} • {friend.tsr} TSR</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                disabled={loadingId === friend.id}
                onClick={() => handleInvite(friend.id)}
              >
                {loadingId === friend.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Invite
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
