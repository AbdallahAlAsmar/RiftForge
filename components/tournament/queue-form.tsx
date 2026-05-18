"use client";

import { useState, useTransition } from "react";
import { joinQueue } from "@/lib/actions/queue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const roles = ["top", "jungle", "mid", "bot", "support", "fill"];

export function QueueForm({ tournamentId }: { tournamentId: string }) {
  const [mode, setMode] = useState("solo");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      action={(formData) => {
        startTransition(async () => {
          const result = await joinQueue(tournamentId, formData);
          setMessage(result.message);
        });
      }}
    >
      <div className="grid gap-2">
        <Label htmlFor="mode">Queue mode</Label>
        <Select id="mode" name="mode" value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="solo">Solo</option>
          <option value="duo">Duo</option>
        </Select>
      </div>
      {mode === "duo" ? (
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
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button disabled={isPending}>{isPending ? "Joining..." : "Join solo/duo queue"}</Button>
    </form>
  );
}
