"use client";

import { useActionState, useState, useTransition } from "react";
import { startRiotVerification, completeRiotVerification, cancelRiotVerification } from "@/lib/actions/riot-verification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { Info, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface RiotVerificationClientProps {
  riotAccount: any;
  pendingVerification: any;
  isMockEnabled: boolean;
}

export function RiotVerificationClient({
  riotAccount,
  pendingVerification,
  isMockEnabled
}: RiotVerificationClientProps) {
  const [startState, startAction] = useActionState(startRiotVerification, { ok: true, message: "" });
  const [isPendingComplete, startCompleteTransition] = useTransition();
  const [isPendingCancel, startCancelTransition] = useTransition();
  const [completeMsg, setCompleteMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [riotId, setRiotId] = useState("");
  const [region, setRegion] = useState("EUW");

  // 1. Linked State
  if (riotAccount) {
    return (
      <div className="rounded-md border border-primary/20 bg-[#0B0B0B]/80 p-5">
        <div className="flex items-center gap-3">
          {riotAccount.profile_icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={riotAccount.profile_icon_url}
              alt=""
              className="h-14 w-14 rounded-md border border-primary/40 object-cover"
            />
          ) : null}
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-black text-white">
                {riotAccount.game_name}
                <span className="text-primary/70">#{riotAccount.tag_line}</span>
              </p>
              <Badge className="border-primary/40 bg-transparent text-primary">
                Verified
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Region: <span className="font-bold text-white/90">{riotAccount.region}</span> • Automatically synced with Riot API
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Pending Verification State
  if (pendingVerification) {
    const requiredIconUrl = `https://ddragon.leagueoflegends.com/cdn/13.24.1/img/profileicon/${pendingVerification.required_icon_id}.png`;

    const handleComplete = () => {
      setCompleteMsg(null);
      startCompleteTransition(async () => {
        const res = await completeRiotVerification();
        if (res.ok) {
          setCompleteMsg({ ok: true, text: res.message });
        } else {
          setCompleteMsg({ ok: false, text: res.message });
        }
      });
    };

    const handleCancel = () => {
      setCompleteMsg(null);
      startCancelTransition(async () => {
        await cancelRiotVerification();
      });
    };

    return (
      <div className="scanline-overlay relative overflow-hidden rounded-md border border-primary/30 bg-[#0A0A0A] p-5">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold tracking-widest uppercase text-primary">
              Verification in progress
            </h4>
            <Badge className="animate-pulse bg-primary/20 text-primary border-primary/30">
              Awaiting Icon Change
            </Badge>
          </div>

          <div className="rounded border border-white/5 bg-white/[0.02] p-4 text-sm text-muted-foreground space-y-3">
            <p>
              RiftForge is linking <strong className="text-white">{pendingVerification.game_name}#{pendingVerification.tag_line}</strong> on <strong className="text-white">{pendingVerification.region}</strong>.
            </p>
            
            <div className="grid gap-4 sm:grid-cols-[100px_1fr] items-center pt-2">
              <div className="flex flex-col items-center gap-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={requiredIconUrl}
                  alt="Target Icon"
                  className="h-16 w-16 rounded-md border border-primary/60 object-cover shadow-[0_0_12px_rgba(235,65,65,0.4)]"
                />
                <span className="text-[10px] uppercase tracking-wide text-primary font-mono">
                  Icon ID: {pendingVerification.required_icon_id}
                </span>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs text-white font-medium">Follow these steps in League client:</p>
                <ol className="list-decimal list-inside text-[11px] space-y-1 text-muted-foreground">
                  <li>Open the League of Legends game client.</li>
                  <li>Go to your profile customization page and select the profile icon pictured here.</li>
                  <li>Click <strong className="text-white">Verify Connection</strong> below to let RiftForge query the Riot API and complete links.</li>
                </ol>
              </div>
            </div>
          </div>

          {isMockEnabled && (
            <div className="rounded border border-primary/20 bg-primary/5 p-3 flex items-start gap-2.5 text-xs text-primary/95">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold uppercase tracking-wide">Developer Sandbox Active</p>
                <p className="mt-0.5 text-muted-foreground text-[11px]">
                  Riot Games API simulation is active. No real client icon change is needed! Click "Verify Connection" to successfully verify instantly.
                </p>
              </div>
            </div>
          )}

          {completeMsg && (
            <div
              className={`rounded border p-3 flex items-start gap-2.5 text-xs ${
                completeMsg.ok
                  ? "border-green-500/30 bg-green-500/5 text-green-400"
                  : "border-destructive/30 bg-destructive/5 text-destructive-foreground"
              }`}
            >
              {completeMsg.ok ? (
                <CheckCircle className="h-4 w-4 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              )}
              <p className="text-[11px] leading-relaxed">{completeMsg.text}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              onClick={handleComplete}
              disabled={isPendingComplete || isPendingCancel}
              className="interactive-surface bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
            >
              {isPendingComplete ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking API...
                </>
              ) : (
                "Verify Connection"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isPendingComplete || isPendingCancel}
              className="border-white/10 text-muted-foreground hover:text-white"
            >
              {isPendingCancel ? "Cancelling..." : "Cancel Verification"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Initial Form State
  return (
    <div className="space-y-4">
      <form action={startAction} className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="riotId" className="text-xs uppercase tracking-widest text-muted-foreground">
            Riot ID (Name#Tag)
          </Label>
          <Input
            id="riotId"
            name="riotId"
            placeholder="Noteemwork#3949"
            required
            value={riotId}
            onChange={(e) => setRiotId(e.target.value)}
            className="border-white/10 bg-[#070707] placeholder:text-neutral-700"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="region" className="text-xs uppercase tracking-widest text-muted-foreground">
            Riot Account Region
          </Label>
          <Select
            id="region"
            name="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="border-white/10 bg-[#070707]"
          >
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

        {startState.message ? (
          <div className="rounded border border-destructive/20 bg-destructive/5 p-2.5 text-xs text-destructive-foreground">
            {startState.message}
          </div>
        ) : null}

        <SubmitButton className="interactive-surface w-fit mt-1">
          Link League Account
        </SubmitButton>
      </form>
    </div>
  );
}
