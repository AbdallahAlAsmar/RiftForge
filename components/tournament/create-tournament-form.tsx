"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createTournament } from "@/lib/actions/tournaments";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/ui/submit-button";
import { useToast } from "@/components/ui/toast";

const initialState = { ok: true, message: "" };

export function CreateTournamentForm() {
  const [state, action] = useActionState(createTournament, initialState);
  const { toast } = useToast();
  const lastMessageRef = useRef<string>("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxTeams, setMaxTeams] = useState(8);
  const [format, setFormat] = useState("single_elimination");
  const [teamSize, setTeamSize] = useState("5");
  const [region, setRegion] = useState("EUW");
  const [mapType, setMapType] = useState("SUMMONERS_RIFT");
  const [minRank, setMinRank] = useState("");
  const [maxRank, setMaxRank] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [checkInStartsAt, setCheckInStartsAt] = useState("");
  const [checkInEndsAt, setCheckInEndsAt] = useState("");

  useEffect(() => {
    if (!state.message || state.message === lastMessageRef.current) return;
    lastMessageRef.current = state.message;

    toast({
      type: state.ok ? "success" : "error",
      title: state.ok ? "Tournament Created" : "Create Tournament Failed",
      message: state.message
    });
  }, [state.message, state.ok, toast]);

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
              <Label htmlFor="region">Riot Region</Label>
              <Select id="region" name="region" value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="EUW">Europe West (EUW)</option>
                <option value="EUNE">Europe Nordic & East (EUNE)</option>
                <option value="NA">North America (NA)</option>
                <option value="KR">Korea (KR)</option>
                <option value="BR">Brazil (BR)</option>
                <option value="LAN">Latin America North (LAN)</option>
                <option value="LAS">Latin America South (LAS)</option>
                <option value="OCE">Oceania (OCE)</option>
                <option value="TR">Turkey (TR)</option>
                <option value="RU">Russia (RU)</option>
                <option value="JP">Japan (JP)</option>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mapType">Arena Map</Label>
              <Select id="mapType" name="mapType" value={mapType} onChange={(e) => setMapType(e.target.value)}>
                <option value="SUMMONERS_RIFT">Summoner's Rift</option>
                <option value="HOWLING_ABYSS">Howling Abyss (ARAM)</option>
              </Select>
            </div>
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
                setRegion("EUW");
                setMapType("SUMMONERS_RIFT");
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
