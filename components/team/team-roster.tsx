"use client";

import { useActionState, useEffect, useState } from "react";
import { Crown, ShieldCheck, UserMinus, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { promoteTeamMember, removeTeamMember } from "@/lib/actions/teams";
import { cn } from "@/lib/utils/cn";

type TeamMember = {
  id: string;
  role: string | null;
  is_captain: boolean;
  users?: {
    id?: string;
    display_name?: string | null;
    avatar_url?: string | null;
    rank?: string | null;
    tsr?: number | null;
  } | null;
};

const initialState = { ok: true, message: "" };

type PendingAction = {
  memberId: string;
  memberName: string;
  memberAction: "promote" | "remove";
};

function TeamActionModal({
  action,
  onClose
}: {
  action: PendingAction;
  onClose: () => void;
}) {
  const isPromote = action.memberAction === "promote";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-5 shadow-2xl shadow-black/40">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {isPromote ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserMinus className="h-3.5 w-3.5" />}
            Captain action
          </div>
          <h3 className="text-lg font-semibold">{isPromote ? "Transfer captaincy" : "Remove player"}</h3>
          <p className="text-sm text-muted-foreground">
            {isPromote
              ? `Promote ${action.memberName} so they can invite and manage members.`
              : `Kick ${action.memberName} from the roster. They will lose team access immediately.`}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={`${action.memberAction}-${action.memberId}`}
            variant={isPromote ? "outline" : "destructive"}
          >
            {isPromote ? "Promote" : "Kick player"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CaptainActionForm({
  teamId,
  memberId,
  memberName,
  memberAction,
  tone,
  onRequestAction,
  onComplete
}: {
  teamId: string;
  memberId: string;
  memberName: string;
  memberAction: "promote" | "remove";
  tone: "outline" | "destructive";
  onRequestAction: (action: PendingAction) => void;
  onComplete: () => void;
}) {
  const action = memberAction === "promote" ? promoteTeamMember : removeTeamMember;
  const [state, formAction] = useActionState(action, initialState);

  useEffect(() => {
    if (state.ok && state.message) {
      onComplete();
    }
  }, [onComplete, state.message, state.ok]);

  return (
    <>
      <form id={`${memberAction}-${memberId}`} action={formAction}>
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="memberId" value={memberId} />
      </form>
      <Button
        size="sm"
        variant={tone}
        type="button"
        onClick={() => onRequestAction({ memberId, memberName, memberAction })}
      >
        {memberAction === "promote" ? <ShieldCheck className="h-4 w-4" /> : <UserMinus className="h-4 w-4" />}
        {memberAction === "promote" ? "Promote" : "Kick"}
      </Button>
      {state.message ? (
        <p className={cn("mt-2 text-xs", state.ok ? "text-primary" : "text-destructive")}>{state.message}</p>
      ) : null}
    </>
  );
}

export function TeamRoster({ teamId, members, canManage }: { teamId: string; members: TeamMember[]; canManage: boolean }) {
  const [activeAction, setActiveAction] = useState<PendingAction | null>(null);

  return (
    <>
      <Card className="interactive-surface">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Team members</CardTitle>
            <CardDescription>
              Hover a teammate to hand off captaincy or remove them from the squad.
            </CardDescription>
          </div>
          {canManage ? <Badge className="border-primary/30 text-primary">Captain controls active</Badge> : null}
        </CardHeader>
        <CardContent className="grid gap-3">
          {members.map((member) => {
            const profile = member.users;
            const displayName = profile?.display_name ?? "Player";
            const memberUserId = profile?.id;

            return (
              <div
                key={member.id}
                className={cn(
                  "group rounded-lg border border-border/70 bg-card/70 p-3 transition-all duration-200 hover:border-primary/30 hover:bg-card",
                  canManage && !member.is_captain ? "md:hover:-translate-y-0.5" : ""
                )}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-md bg-secondary">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{displayName}</p>
                        {member.is_captain ? (
                          <Badge className="border-primary/30 text-primary">
                            <Crown className="mr-1 h-3 w-3" /> Captain
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {member.role ?? "role TBD"} - {profile?.rank ?? "unranked"}
                      </p>
                    </div>
                  </div>

                  {canManage && !member.is_captain && memberUserId ? (
                    <div className="flex flex-col gap-2 opacity-100 transition md:pointer-events-none md:flex-row md:items-center md:opacity-0 md:group-hover:pointer-events-auto md:group-hover:opacity-100">
                      <CaptainActionForm
                        teamId={teamId}
                        memberId={memberUserId}
                        memberName={displayName}
                        memberAction="promote"
                        tone="outline"
                        onRequestAction={setActiveAction}
                        onComplete={() => setActiveAction(null)}
                      />
                      <CaptainActionForm
                        teamId={teamId}
                        memberId={memberUserId}
                        memberName={displayName}
                        memberAction="remove"
                        tone="destructive"
                        onRequestAction={setActiveAction}
                        onComplete={() => setActiveAction(null)}
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {activeAction ? <TeamActionModal action={activeAction} onClose={() => setActiveAction(null)} /> : null}
    </>
  );
}