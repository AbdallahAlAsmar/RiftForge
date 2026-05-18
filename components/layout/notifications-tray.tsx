"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, X, UserPlus, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { acceptFriendRequest, declineFriendRequest } from "@/lib/actions/friends";
import { acceptTeamInvite, declineTeamInvite } from "@/lib/actions/teams";

export function NotificationsTray({ notifications }: { notifications: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const trayRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const visibleFriends = (notifications.friends ?? []).filter((item: any) => !dismissedIds.has(item.id));
  const visibleInvites = (notifications.invites ?? []).filter((item: any) => !dismissedIds.has(item.id));
  const total = visibleFriends.length + visibleInvites.length;

  const dedupedInvites = useMemo(() => {
    const seen = new Set<string>();
    return visibleInvites.filter((invite) => {
      const key = invite.teams?.id ?? invite.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [visibleInvites]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (trayRef.current && !trayRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleAction(action: () => Promise<any>, id: string) {
    setDismissedIds((current) => new Set(current).add(id));
    setLoadingId(id);
    const result = await action();
    if (result?.ok) {
      router.refresh();
    } else {
      setDismissedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
    setLoadingId(null);
  }

  return (
    <div className="relative" ref={trayRef}>
      <Button variant="ghost" size="icon" className="relative" aria-label="Notifications" onClick={() => setIsOpen(!isOpen)}>
        <Bell className="h-4 w-4" />
        {total > 0 && (
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive" />
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-md border border-border/50 bg-card text-card-foreground shadow-xl z-50 overflow-hidden interactive-surface animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 bg-secondary/30">
            <h4 className="text-sm font-medium">Notifications</h4>
            <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-0">{total}</Badge>
          </div>
          <div className="max-h-[300px] overflow-y-auto p-2 grid gap-1">
            {total === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                You're all caught up!
              </div>
            ) : (
              <>
                {visibleFriends.map((req: any) => (
                  <div key={req.id} className="flex items-center justify-between rounded-md p-2 hover:bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-primary shrink-0">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{req.users?.display_name || "Someone"}</span>
                        <span className="text-xs text-muted-foreground">Sent a friend request</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" disabled={loadingId === req.id} onClick={() => handleAction(() => declineFriendRequest(req.id), req.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="secondary" className="h-7 w-7 text-primary hover:bg-primary hover:text-primary-foreground transition-colors" disabled={loadingId === req.id} onClick={() => handleAction(() => acceptFriendRequest(req.id), req.id)}>
                        {loadingId === req.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
                {dedupedInvites.map((invite: any) => (
                  <div key={invite.id} className="flex items-center justify-between rounded-md p-2 hover:bg-secondary/50">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-primary shrink-0">
                        <Users className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{invite.teams?.name || "A team"}</span>
                        <span className="text-xs text-muted-foreground">Invited you to join</span>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" disabled={loadingId === invite.id} onClick={() => handleAction(() => declineTeamInvite(invite.id), invite.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="secondary" className="h-7 w-7 text-primary hover:bg-primary hover:text-primary-foreground transition-colors" disabled={loadingId === invite.id} onClick={() => handleAction(() => acceptTeamInvite(invite.id), invite.id)}>
                        {loadingId === invite.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
