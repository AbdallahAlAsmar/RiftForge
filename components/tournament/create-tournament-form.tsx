"use client";

import { useActionState } from "react";
import { createTournament } from "@/lib/actions/tournaments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";

const initialState = { ok: true, message: "" };

export function CreateTournamentForm() {
  const [state, action] = useActionState(createTournament, initialState);

  return (
    <Card className="interactive-surface bg-card/95">
      <CardHeader>
        <CardTitle>Create tournament</CardTitle>
        <CardDescription>Set the core rules. You can publish after reviewing.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="RiftForge Invitational" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="Rules, prizes, lobby details..." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="maxTeams">Max teams</Label>
              <Input id="maxTeams" name="maxTeams" type="number" min={2} max={128} defaultValue={8} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="format">Format</Label>
              <Select id="format" name="format" defaultValue="single_elimination">
                <option value="single_elimination">Single elimination</option>
                <option value="double_elimination">Double elimination</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="teamSize">Team size</Label>
            <Select id="teamSize" name="teamSize" defaultValue="5">
              <option value="1">1v1</option>
              <option value="2">2v2</option>
              <option value="5">5v5</option>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="minRank">Min rank</Label>
              <Select id="minRank" name="minRank" defaultValue="">
                <option value="">None</option>
                {rankOptions.map((rank) => (
                  <option key={rank} value={rank}>
                    {rank}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="maxRank">Max rank</Label>
              <Select id="maxRank" name="maxRank" defaultValue="">
                <option value="">None</option>
                {rankOptions.map((rank) => (
                  <option key={rank} value={rank}>
                    {rank}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startsAt">Start</Label>
              <Input id="startsAt" name="startsAt" type="datetime-local" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="checkInStartsAt">Check-in opens</Label>
              <Input id="checkInStartsAt" name="checkInStartsAt" type="datetime-local" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="checkInEndsAt">Check-in closes</Label>
              <Input id="checkInEndsAt" name="checkInEndsAt" type="datetime-local" />
            </div>
          </div>
          {state.message ? (
            <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>
              {state.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="reset" variant="ghost">
              Reset
            </Button>
            <SubmitButton>Create</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const rankOptions = [
  "iron",
  "bronze",
  "silver",
  "gold",
  "platinum",
  "emerald",
  "diamond",
  "master",
  "grandmaster",
  "challenger"
];
