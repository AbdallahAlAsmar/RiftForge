"use client";

import { useState, useTransition } from "react";
import { joinQueue } from "@/lib/actions/queue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { Loader2 } from "lucide-react";

const roles = ["top", "jungle", "mid", "bot", "support", "fill"];

export function QueueForm({ tournamentId, teamSize = 5 }: { tournamentId: string; teamSize?: number }) {
  const [mode, setMode] = useState("solo");
  const [isPending, startTransition] = useTransition();
  const [queuedOptimistic, setQueuedOptimistic] = useState(false);
  const [queuedMessage, setQueuedMessage] = useState<string>("");
  const { toast, dismiss } = useToast();
  const allowDuo = teamSize > 1;

  return (
    <form
      className="grid gap-4"
      action={(formData) => {
        setQueuedOptimistic(true);
        setQueuedMessage("Queue request sent. Finalizing...");

        const toastId = toast({
          type: "loading",
          title: "Joining Queue",
          message: "Submitting your queue request..."
        });

        startTransition(async () => {
          try {
            const result = await joinQueue(tournamentId, formData);
            dismiss(toastId);
            if (result.ok) {
              setQueuedOptimistic(true);
              setQueuedMessage(result.message || "You are now in the matchmaking queue!");
              toast({
                type: "success",
                title: "Queue Joined",
                message: result.message || "You are now in the matchmaking queue!"
              });
            } else {
              setQueuedOptimistic(false);
              setQueuedMessage("");
              toast({
                type: "error",
                title: "Queue Failed",
                message: result.message || "Failed to join queue."
              });
            }
          } catch (err: any) {
            dismiss(toastId);
            setQueuedOptimistic(false);
            setQueuedMessage("");
            toast({
              type: "error",
              title: "Queue Error",
              message: err.message || "An unexpected error occurred."
            });
          }
        });
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="mode">Queue mode</Label>
        <Select id="mode" name="mode" value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="solo">Solo</option>
          {allowDuo ? <option value="duo">Duo</option> : null}
        </Select>
      </div>
      {mode === "duo" && allowDuo ? (
        <div className="grid gap-2">
          <Label htmlFor="partnerUserId">Duo partner user ID</Label>
          <Input id="partnerUserId" name="partnerUserId" placeholder="Paste teammate profile UUID" />
        </div>
      ) : null}
      <div className="grid gap-2">
        <Label>Preferred roles</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {roles.map((role) => (
            <label key={role} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <input name="preferredRoles" value={role} type="checkbox" />
              {role}
            </label>
          ))}
        </div>
      </div>
      <Button disabled={isPending || queuedOptimistic} className="font-bold">
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
            Joining...
          </>
        ) : queuedOptimistic ? (
          "Queued"
        ) : teamSize === 5 ? (
          "Join solo/duo queue"
        ) : (
          `Join ${teamSize}v${teamSize} queue`
        )}
      </Button>
      {queuedOptimistic && queuedMessage ? (
        <p className="text-xs text-primary">{queuedMessage}</p>
      ) : null}
    </form>
  );
}
