"use client";

import { useActionState, useEffect, useRef } from "react";
import { createTeam } from "@/lib/actions/teams";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";

const initialState = { ok: true, message: "" };

export function CreateTeamForm({ tournamentId }: { tournamentId?: string }) {
  const [state, action] = useActionState(createTeam, initialState);
  const { toast } = useToast();
  const lastMessageRef = useRef<string>("");

  useEffect(() => {
    if (!state.message || state.message === lastMessageRef.current) return;
    lastMessageRef.current = state.message;

    toast({
      type: state.ok ? "success" : "error",
      title: state.ok ? "Team Created" : "Create Team Failed",
      message: state.message
    });
  }, [state.message, state.ok, toast]);

  return (
    <Card className="interactive-surface bg-card/95">
      <CardHeader>
        <CardTitle>Create team</CardTitle>
        <CardDescription>Captains can invite players and manage the roster.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          <input type="hidden" name="tournamentId" value={tournamentId ?? ""} />
          <div className="grid gap-2">
            <Label htmlFor="team-name">Team name</Label>
            <Input id="team-name" name="name" placeholder="Forgeborn" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="logo">Logo</Label>
            <Input id="logo" name="logo" type="file" accept="image/*" />
          </div>
          {state.message ? (
            <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>
              {state.message}
            </p>
          ) : null}
          <SubmitButton>Create team</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
