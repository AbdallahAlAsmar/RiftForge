"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, UsersRound } from "lucide-react";
import { joinTournament } from "@/lib/actions/tournaments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

type JoinTournamentCardProps = {
  tournamentId: string;
  isJoined: boolean;
  teamName: string | null;
  initialMessage?: string;
};

export function JoinTournamentCard({
  tournamentId,
  isJoined,
  teamName,
  initialMessage
}: JoinTournamentCardProps) {
  const { toast } = useToast();
  const [joined, setJoined] = useState(isJoined);
  const [joinedTeamName, setJoinedTeamName] = useState<string | null>(teamName);
  const [message, setMessage] = useState(initialMessage ?? "");
  const [isPending, startTransition] = useTransition();

  async function handleJoin() {
    setJoined(true);
    setMessage("Joining tournament...");

    startTransition(async () => {
      const result = await joinTournament(tournamentId);
      if (result.ok) {
        setJoined(true);
        setMessage(result.message);
        toast({
          type: "success",
          title: "Tournament Joined",
          message: result.message || "You are registered for this tournament."
        });
        if (result.message.includes("placed in ")) {
          const teamMatch = result.message.match(/placed in (.+)\./i);
          setJoinedTeamName(teamMatch?.[1] ?? null);
        }
      } else {
        setJoined(false);
        setMessage(result.message);
        toast({
          type: "error",
          title: "Join Failed",
          message: result.message || "Could not join tournament."
        });
      }
    });
  }

  return (
    <Card className="interactive-surface bg-card/95">
      <CardHeader>
        <CardTitle>{joined ? "You're in the tournament" : "Join tournament"}</CardTitle>
        <CardDescription>
          {joined
            ? "Your tournament slot is active."
            : "Join once, then we will place you into a random team when one is available."}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {joined ? (
          <div className="rounded-md border border-border/60 bg-secondary/25 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" /> Joined
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{message || "You're registered for this tournament."}</p>
            <div className="mt-3 flex items-center gap-2 text-sm">
              <UsersRound className="h-4 w-4 text-primary" />
              <span>{joinedTeamName ? `Placed in ${joinedTeamName}` : "Waiting for a random team assignment"}</span>
            </div>
          </div>
        ) : (
          <Button className="w-full" onClick={handleJoin} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isPending ? "Joining..." : "Join tournament"}
          </Button>
        )}

        {message && !joined ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
    </Card>
  );
}