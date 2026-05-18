"use client";

import { useActionState, useState } from "react";
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

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxTeams, setMaxTeams] = useState(8);
  const [format, setFormat] = useState("single_elimination");
  const [teamSize, setTeamSize] = useState("5");
  const [minRank, setMinRank] = useState("");
  const [maxRank, setMaxRank] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [checkInStartsAt, setCheckInStartsAt] = useState("");
  const [checkInEndsAt, setCheckInEndsAt] = useState("");

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
            <Input id="name" name="name" placeholder="RiftForge Invitational" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" placeholder="Rules, prizes, lobby details..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="maxTeams">Max teams</Label>
              <Input id="maxTeams" name="maxTeams" type="number" min={2} max={128} value={String(maxTeams)} onChange={(e) => setMaxTeams(Number(e.target.value))} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="format">Format</Label>
              <Select id="format" name="format" value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="single_elimination">Single elimination</option>
                <option value="double_elimination">Double elimination</option>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="teamSize">Team size</Label>
            <Select id="teamSize" name="teamSize" value={teamSize} onChange={(e) => setTeamSize(e.target.value)}>
              <option value="1">1v1</option>
              <option value="2">2v2</option>
              <option value="5">5v5</option>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="minRank">Min rank</Label>
              <Select id="minRank" name="minRank" value={minRank} onChange={(e) => setMinRank(e.target.value)}>
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
              <Select id="maxRank" name="maxRank" value={maxRank} onChange={(e) => setMaxRank(e.target.value)}>
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
              <Input id="startsAt" name="startsAt" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="checkInStartsAt">Check-in opens</Label>
              <Input id="checkInStartsAt" name="checkInStartsAt" type="datetime-local" value={checkInStartsAt} onChange={(e) => setCheckInStartsAt(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="checkInEndsAt">Check-in closes</Label>
              <Input id="checkInEndsAt" name="checkInEndsAt" type="datetime-local" value={checkInEndsAt} onChange={(e) => setCheckInEndsAt(e.target.value)} />
            </div>
          </div>
          {state.message ? (
            <p className={state.ok ? "text-sm text-primary" : "text-sm text-destructive"}>
              {state.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setName("");
                setDescription("");
                setMaxTeams(8);
                setFormat("single_elimination");
                setTeamSize("5");
                setMinRank("");
                setMaxRank("");
                setStartsAt("");
                setCheckInStartsAt("");
                setCheckInEndsAt("");
              }}
            >
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
