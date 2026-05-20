"use client";

import { useState, useTransition } from "react";
import { Rocket, Bot, GitBranch, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { publishTournament } from "@/lib/actions/tournaments";
import { generateBalancedTeams } from "@/lib/actions/queue";
import { generateBracket } from "@/lib/actions/brackets";

interface AdminControlPanelProps {
  tournamentId: string;
  status: string;
}

export function AdminControlPanel({ tournamentId, status }: AdminControlPanelProps) {
  const [isPendingPublish, startPublishTransition] = useTransition();
  const [isPendingBalance, startBalanceTransition] = useTransition();
  const [isPendingBracket, startBracketTransition] = useTransition();
  const { toast, dismiss } = useToast();
  const [optimisticPublished, setOptimisticPublished] = useState(
    status === "published" || status === "active" || status === "completed"
  );

  const handlePublish = () => {
    setOptimisticPublished(true);

    const toastId = toast({
      type: "loading",
      title: "Publishing Tournament",
      message: "Making this tournament public..."
    });

    startPublishTransition(async () => {
      try {
        const res = await publishTournament(tournamentId);
        dismiss(toastId);
        if (res.ok) {
          toast({
            type: "success",
            title: "Published Successfully",
            message: res.message || "The tournament is now live!"
          });
        } else {
          setOptimisticPublished(false);
          toast({
            type: "error",
            title: "Publish Failed",
            message: res.message || "Failed to publish tournament."
          });
        }
      } catch (err: any) {
        setOptimisticPublished(false);
        dismiss(toastId);
        toast({
          type: "error",
          title: "Publish Error",
          message: err.message || "An unexpected error occurred."
        });
      }
    });
  };

  const handleBalance = () => {
    const toastId = toast({
      type: "loading",
      title: "Balancing Roster Teams",
      message: "Calculating optimal positional queue balance..."
    });

    startBalanceTransition(async () => {
      try {
        const res = await generateBalancedTeams(tournamentId);
        dismiss(toastId);
        if (res.ok) {
          toast({
            type: "success",
            title: "Teams Balanced",
            message: res.message || "Roster teams generated successfully."
          });
        } else {
          toast({
            type: "error",
            title: "Balancing Failed",
            message: res.message || "Failed to balance teams."
          });
        }
      } catch (err: any) {
        dismiss(toastId);
        toast({
          type: "error",
          title: "Balancing Error",
          message: err.message || "An unexpected error occurred."
        });
      }
    });
  };

  const handleBracket = () => {
    const toastId = toast({
      type: "loading",
      title: "Generating Brackets",
      message: "Seeding players and creating match brackets..."
    });

    startBracketTransition(async () => {
      try {
        const res = await generateBracket(tournamentId);
        dismiss(toastId);
        if (res.ok) {
          toast({
            type: "success",
            title: "Bracket Generated",
            message: res.message || "Match bracket generated successfully."
          });
        } else {
          toast({
            type: "error",
            title: "Generation Failed",
            message: res.message || "Failed to generate bracket."
          });
        }
      } catch (err: any) {
        dismiss(toastId);
        toast({
          type: "error",
          title: "Bracket Error",
          message: err.message || "An unexpected error occurred."
        });
      }
    });
  };

  const isPublished = optimisticPublished;

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="outline"
        onClick={handlePublish}
        disabled={isPendingPublish || isPublished}
        className="font-bold interactive-surface"
      >
        {isPendingPublish ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
        ) : (
          <Rocket className="mr-2 h-4 w-4" />
        )}
        {isPublished ? "Published" : "Publish"}
      </Button>

      <Button
        variant="outline"
        onClick={handleBalance}
        disabled={isPendingBalance}
        className="font-bold interactive-surface"
      >
        {isPendingBalance ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
        ) : (
          <Bot className="mr-2 h-4 w-4" />
        )}
        Build balanced teams
      </Button>

      <Button
        onClick={handleBracket}
        disabled={isPendingBracket}
        className="font-bold interactive-surface bg-primary text-primary-foreground"
      >
        {isPendingBracket ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <GitBranch className="mr-2 h-4 w-4" />
        )}
        Generate bracket
      </Button>
    </div>
  );
}
