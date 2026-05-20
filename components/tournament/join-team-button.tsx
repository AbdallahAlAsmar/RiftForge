"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, UsersRound } from "lucide-react";
import { joinTournamentWithTeam } from "@/lib/actions/tournaments";
import { useToast } from "@/components/ui/toast";

interface JoinTeamButtonProps {
  tournamentId: string;
  teamId: string;
  teamName: string;
}

export function JoinTeamButton({ tournamentId, teamId, teamName }: JoinTeamButtonProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleJoin = () => {
    // Show a loading toast
    const loadingToastId = toast({
      type: "loading",
      title: "Registering Team",
      message: `Enrolling ${teamName} into the tournament...`
    });

    startTransition(async () => {
      try {
        const res = await joinTournamentWithTeam(tournamentId, teamId);
        if (res.ok) {
          toast({
            type: "success",
            title: "Roster Enrolled",
            message: res.message || `${teamName} has successfully registered!`
          });
        } else {
          toast({
            type: "error",
            title: "Registration Failed",
            message: res.message || "Failed to register team."
          });
        }
      } catch (err: any) {
        toast({
          type: "error",
          title: "Registration Error",
          message: err.message || "An unexpected error occurred."
        });
      }
    });
  };

  return (
    <Button
      className="w-full interactive-surface font-bold mt-2"
      onClick={handleJoin}
      disabled={isPending}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
          Joining...
        </>
      ) : (
        <>
          <UsersRound className="mr-2 h-4 w-4" />
          Join with this team
        </>
      )}
    </Button>
  );
}
