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
  const { toast } = useToast();
  const allowDuo = teamSize > 1;

  return (
    <form
      className="grid gap-4"
      action={(formData) => {
        toast({
          type: "loading",
          title: "Joining Queue",
          message: "Submitting your queue request..."
        });

        startTransition(async () => {
          try {
            const result = await joinQueue(tournamentId, formData);
            if (result.ok) {
              toast({
                type: "success",
                title: "Queue Joined",
                message: result.message || "You are now in the matchmaking queue!"
              });
            } else {
              toast({
                type: "error",
                title: "Queue Failed",
                message: result.message || "Failed to join queue."
              });
            }
          } catch (err: any) {
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
      <Button disabled={isPending} className="font-bold">
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
            Joining...
          </>
        ) : teamSize === 5 ? (
          "Join solo/duo queue"
        ) : (
          `Join ${teamSize}v${teamSize} queue`
        )}
      </Button>
    </form>
  );
}
