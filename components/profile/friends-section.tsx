"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, UserPlus, Search, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RankAvatar, RankLabel } from "@/components/profile/rank-visuals";
import { searchUsers, sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend } from "@/lib/actions/friends";

type Profile = { id: string; display_name: string | null; avatar_url: string | null; region: string; rank: string | null; show_rank_border: boolean; tsr: number };
type FriendData = {
  id: string;
  status: "pending" | "accepted";
  user_id: string;
  friend_id: string;
  profile: Profile | null;
};

export function FriendsSection({ currentUserId, friends }: { currentUserId: string; friends: FriendData[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [optimisticSent, setOptimisticSent] = useState<Set<string>>(new Set());

  const pendingRequests = friends.filter(f => f.status === "pending" && f.friend_id === currentUserId);
  const sentRequests = friends.filter(f => f.status === "pending" && f.user_id === currentUserId);
  const acceptedFriends = friends.filter(f => f.status === "accepted");

  useEffect(() => {
    setOptimisticSent((current) => {
      const next = new Set<string>();

      for (const userId of current) {
        const stillPending = friends.some(
          (friendship) =>
            friendship.status === "pending" &&
            friendship.user_id === currentUserId &&
            friendship.profile?.id === userId
        );

        if (stillPending) {
          next.add(userId);
        }
      }

      return next;
    });
  }, [currentUserId, friends]);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      const result = await searchUsers(searchQuery);
      if (result.ok && result.data) {
        setSearchResults(result.data);
      }
      setIsSearching(false);
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  async function handleAction(action: () => Promise<{ok: boolean, message?: string}>, loadingId: string) {
    setActionLoading(loadingId);
    const result = await action();
    if (result.ok) {
      router.refresh();
    }
    setActionLoading(null);
    return result;
  }

  async function handleSendRequest(userId: string) {
    const result = await handleAction(() => sendFriendRequest(userId), userId);
    if (result.ok) {
      setOptimisticSent(prev => new Set(prev).add(userId));
    }
  }

  async function handleRemoveFriend(friendId: string, friendshipId: string) {
    await handleAction(() => removeFriend(friendshipId), friendshipId);
    setOptimisticSent(prev => {
      const next = new Set(prev);
      next.delete(friendId);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <Card className="interactive-surface">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Add Friends
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by username..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="rounded-md border p-2 grid gap-2">
              <p className="text-xs font-medium text-muted-foreground px-2 pt-1">Search Results</p>
              {searchResults.map(user => {
                const isFriend = friends.some(f => f.profile?.id === user.id && f.status === "accepted");
                const hasSentReq = optimisticSent.has(user.id) || friends.some(f => f.profile?.id === user.id && f.status === "pending" && f.user_id === currentUserId);
                
                return (
                  <div key={user.id} className="flex items-center justify-between rounded-md p-2 hover:bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <RankAvatar
                        rank={user.rank}
                        src={user.avatar_url}
                        alt={user.display_name ?? "Player"}
                        showBorder={user.show_rank_border}
                        className="h-8 w-8"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{user.display_name}</span>
                        <span className="text-xs text-muted-foreground">
                          <RankLabel rank={user.rank} className="gap-1" iconClassName="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                    {isFriend ? (
                      <Badge className="bg-transparent border-primary/30 text-primary">Friends</Badge>
                    ) : hasSentReq ? (
                      <Badge>Request Sent</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={actionLoading === user.id}
                        onClick={() => handleSendRequest(user.id)}
                      >
                        {actionLoading === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Friend"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {pendingRequests.length > 0 && (
        <Card className="interactive-surface border-primary/25">
          <CardHeader>
            <CardTitle className="text-sm">Pending Requests</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {pendingRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <RankAvatar
                    rank={req.profile?.rank}
                    src={req.profile?.avatar_url}
                    alt={req.profile?.display_name ?? "Player"}
                    showBorder={req.profile?.show_rank_border}
                    className="h-10 w-10"
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{req.profile?.display_name ?? "Unknown"}</span>
                    <span className="text-xs text-muted-foreground">
                      <RankLabel rank={req.profile?.rank} className="gap-1" iconClassName="h-3.5 w-3.5" />
                      <span className="ml-2">Wants to be your friend</span>
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    disabled={actionLoading === req.id}
                    onClick={() => handleAction(() => declineFriendRequest(req.id), req.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={actionLoading === req.id}
                    onClick={() => handleAction(() => acceptFriendRequest(req.id), req.id)}
                  >
                    {actionLoading === req.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="interactive-surface">
        <CardHeader>
          <CardTitle className="text-sm">Your Friends ({acceptedFriends.length})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          {acceptedFriends.length === 0 ? (
            <div className="rounded-md border p-4 text-sm text-muted-foreground text-center">
              No friends added yet.
            </div>
          ) : (
            acceptedFriends.map(friend => (
              <div key={friend.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-3">
                  <RankAvatar
                    rank={friend.profile?.rank}
                    src={friend.profile?.avatar_url}
                    alt={friend.profile?.display_name ?? "Player"}
                    showBorder={friend.profile?.show_rank_border}
                    className="h-10 w-10"
                  />
                  <div className="flex flex-col">
                    <span className="font-medium">{friend.profile?.display_name ?? "Unknown"}</span>
                    <span className="text-xs text-muted-foreground">
                      <RankLabel rank={friend.profile?.rank} className="gap-1" iconClassName="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={actionLoading === friend.id}
                  onClick={() => handleRemoveFriend(friend.profile?.id || "", friend.id)}
                >
                  {actionLoading === friend.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
