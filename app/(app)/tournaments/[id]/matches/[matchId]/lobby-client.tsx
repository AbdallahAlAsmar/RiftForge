"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Swords, User, ShieldAlert, BadgeInfo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils/cn";

type TeamInfo = {
  id: string;
  name: string;
  logo_url: string | null;
  captain_id: string;
  average_tsr: number;
};

type MatchWithTeams = {
  id: string;
  round: number;
  position: number;
  status: string;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_team_id: string | null;
  tournament_code: string | null;
  team_a?: TeamInfo | null;
  team_b?: TeamInfo | null;
};

type ChatMessage = {
  senderName: string;
  text: string;
  role: string;
  timestamp: number;
};

type DraftState = {
  turn: "team_a_ban_1" | "team_b_ban_1" | "team_a_ban_2" | "team_b_ban_2" | "team_a_pick_1" | "team_b_pick_1" | "team_a_pick_2" | "team_b_pick_2" | "finished";
  phaseIndex: number;
  bansA: string[];
  bansB: string[];
  picksA: string[];
  picksB: string[];
};

const CHAMPIONS = [
  { id: "aatrox", name: "Aatrox", role: "Top", color: "from-red-900/30 to-zinc-900 border-red-500/20" },
  { id: "ahri", name: "Ahri", role: "Mid", color: "from-fuchsia-900/30 to-zinc-900 border-fuchsia-500/20" },
  { id: "akali", name: "Akali", role: "Mid/Top", color: "from-emerald-900/30 to-zinc-900 border-emerald-500/20" },
  { id: "ezreal", name: "Ezreal", role: "Bot", color: "from-amber-900/30 to-zinc-900 border-amber-500/20" },
  { id: "jinx", name: "Jinx", role: "Bot", color: "from-pink-900/30 to-zinc-900 border-pink-500/20" },
  { id: "lee_sin", name: "Lee Sin", role: "Jungle", color: "from-orange-900/30 to-zinc-900 border-orange-500/20" },
  { id: "thresh", name: "Thresh", role: "Support", color: "from-cyan-900/30 to-zinc-900 border-cyan-500/20" },
  { id: "yasuo", name: "Yasuo", role: "Mid/Top", color: "from-sky-900/30 to-zinc-900 border-sky-500/20" },
  { id: "zed", name: "Zed", role: "Mid", color: "from-slate-900/30 to-zinc-900 border-slate-500/20" },
  { id: "vayne", name: "Vayne", role: "Bot/Top", color: "from-violet-900/30 to-zinc-900 border-violet-500/20" }
];

const DRAFT_PHASES: Array<DraftState["turn"]> = [
  "team_a_ban_1",
  "team_b_ban_1",
  "team_a_ban_2",
  "team_b_ban_2",
  "team_a_pick_1",
  "team_b_pick_1",
  "team_a_pick_2",
  "team_b_pick_2",
  "finished"
];

export function MatchLobbyClient({
  match,
  currentRole
}: {
  match: MatchWithTeams;
  tournamentId: string;
  currentUser: any;
  currentRole: "captain_a" | "captain_b" | "admin" | "spectator";
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  // Simulator & Copy state
  const [copied, setCopied] = useState(false);
  const [simulating, setSimulating] = useState(false);

  // Pick ban state
  const [draft, setDraft] = useState<DraftState>({
    turn: "team_a_ban_1",
    phaseIndex: 0,
    bansA: [],
    bansB: [],
    picksA: [],
    picksB: []
  });
  const [selectedChampion, setSelectedChampion] = useState<string | null>(null);
  const [refAlert, setRefAlert] = useState(false);

  const teamAName = match.team_a?.name || "Team A";
  const teamBName = match.team_b?.name || "Team B";

  const isMyTurn =
    (draft.turn.startsWith("team_a") && currentRole === "captain_a") ||
    (draft.turn.startsWith("team_b") && currentRole === "captain_b");

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const lobbyChannel = supabase.channel(`match_lobby_${match.id}`);

    lobbyChannel
      .on("broadcast", { event: "message" }, (payload) => {
        setMessages((prev) => [...prev, payload.payload as ChatMessage]);
      })
      .on("broadcast", { event: "draft_update" }, (payload) => {
        setDraft(payload.payload.draftState as DraftState);
      })
      .on("broadcast", { event: "ref_call" }, () => {
        setRefAlert(true);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // Send join alert
          const systemMsg: ChatMessage = {
            senderName: "System",
            text: `${currentRole === "spectator" ? "A spectator" : currentRole.replace("_", " ")} joined the match room.`,
            role: "system",
            timestamp: Date.now()
          };
          setMessages((prev) => [...prev, systemMsg]);
        }
      });

    channelRef.current = lobbyChannel;

    return () => {
      supabase.removeChannel(lobbyChannel);
    };
  }, [match.id, currentRole]);

  function sendMessage() {
    if (!inputText.trim() || !channelRef.current) return;

    const newMsg: ChatMessage = {
      senderName:
        currentRole === "captain_a"
          ? teamAName
          : currentRole === "captain_b"
            ? teamBName
            : currentRole === "admin"
              ? "Tournament Host"
              : "Spectator",
      text: inputText.trim(),
      role: currentRole,
      timestamp: Date.now()
    };

    // Broadcast message
    channelRef.current.send({
      type: "broadcast",
      event: "message",
      payload: newMsg
    });

    setMessages((prev) => [...prev, newMsg]);
    setInputText("");
  }

  function handleCallReferee() {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "ref_call",
      payload: {}
    });
    setRefAlert(true);
  }

  function lockInDraftSelection() {
    if (!selectedChampion || !isMyTurn || !channelRef.current) return;

    const currentTurn = draft.turn;
    const nextPhaseIndex = draft.phaseIndex + 1;
    const nextTurn = DRAFT_PHASES[nextPhaseIndex] || "finished";

    const nextDraft: DraftState = {
      ...draft,
      turn: nextTurn,
      phaseIndex: nextPhaseIndex
    };

    if (currentTurn.includes("ban")) {
      if (currentTurn.startsWith("team_a")) {
        nextDraft.bansA = [...draft.bansA, selectedChampion];
      } else {
        nextDraft.bansB = [...draft.bansB, selectedChampion];
      }
    } else {
      if (currentTurn.startsWith("team_a")) {
        nextDraft.picksA = [...draft.picksA, selectedChampion];
      } else {
        nextDraft.picksB = [...draft.picksB, selectedChampion];
      }
    }

    // Broadcast draft update
    channelRef.current.send({
      type: "broadcast",
      event: "draft_update",
      payload: { draftState: nextDraft }
    });

    // Send system update message
    const announcement: ChatMessage = {
      senderName: "System",
      text: `${currentRole === "captain_a" ? teamAName : teamBName} has ${currentTurn.includes("ban") ? "banned" : "picked"} ${CHAMPIONS.find((c) => c.id === selectedChampion)?.name || selectedChampion}.`,
      role: "system",
      timestamp: Date.now()
    };

    channelRef.current.send({
      type: "broadcast",
      event: "message",
      payload: announcement
    });

    setDraft(nextDraft);
    setMessages((prev) => [...prev, announcement]);
    setSelectedChampion(null);
  }

  function copyToClipboard() {
    if (!match.tournament_code) return;
    navigator.clipboard.writeText(match.tournament_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function simulateRiotCallback(winnerId: string) {
    setSimulating(true);
    try {
      const res = await fetch("/api/riot/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          shortCode: match.tournament_code,
          winnerTeamId: winnerId
        })
      });
      const data = await res.json();
      if (data.ok) {
        window.location.reload();
      } else {
        alert(`Simulation error: ${data.error}`);
      }
    } catch (err) {
      console.error("[Simulation Failed]", err);
    } finally {
      setSimulating(false);
    }
  }

  const isBanned = (champId: string) => draft.bansA.includes(champId) || draft.bansB.includes(champId);
  const isPicked = (champId: string) => draft.picksA.includes(champId) || draft.picksB.includes(champId);
  const isUnavailable = (champId: string) => isBanned(champId) || isPicked(champId);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        {/* Riot Games Tournament Code Panel */}
        <div className="rounded-xl border border-primary/20 bg-card/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-md">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary">Riot Games Tournament Code</span>
            <p className="text-xs text-muted-foreground">Copy this code to join the automated custom lobby inside the League of Legends client.</p>
          </div>
          <div className="flex items-center gap-2">
            <code className="rounded bg-secondary/80 border border-white/10 px-3 py-1.5 text-xs font-mono font-bold text-foreground">
              {match.tournament_code || "Generating..."}
            </code>
            <Button size="sm" onClick={copyToClipboard} variant="outline" className="h-9">
              {copied ? "COPIED!" : "COPY CODE"}
            </Button>
          </div>
        </div>

        {/* Picks and Bans Panels */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Blue Side */}
          <div className="rounded-xl border border-sky-500/25 bg-sky-950/10 p-5 backdrop-blur-md">
            <h3 className="text-lg font-bold text-sky-400">{teamAName} (Blue)</h3>
            <p className="text-xs text-muted-foreground">{match.team_a?.average_tsr} avg TSR</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Picks</span>
                <div className="flex flex-col gap-1.5">
                  {[0, 1].map((idx) => {
                    const pick = draft.picksA[idx];
                    return (
                      <div key={`pickA-${idx}`} className="flex h-9 items-center justify-between rounded-md border border-sky-500/20 bg-sky-950/30 px-3 py-1">
                        <span className="text-sm font-medium">{pick ? CHAMPIONS.find((c) => c.id === pick)?.name : "-"}</span>
                        <span className="text-[10px] text-sky-400/70 font-semibold">{pick ? "PICKED" : "EMPTY"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bans</span>
                <div className="flex flex-col gap-1.5">
                  {[0, 1].map((idx) => {
                    const ban = draft.bansA[idx];
                    return (
                      <div key={`banA-${idx}`} className="flex h-9 items-center justify-between rounded-md border border-red-500/20 bg-red-950/20 px-3 py-1">
                        <span className="text-sm font-medium">{ban ? CHAMPIONS.find((c) => c.id === ban)?.name : "-"}</span>
                        <span className="text-[10px] text-red-400/70 font-semibold">{ban ? "BANNED" : "EMPTY"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Red Side */}
          <div className="rounded-xl border border-red-500/25 bg-red-950/10 p-5 backdrop-blur-md">
            <h3 className="text-lg font-bold text-red-400">{teamBName} (Red)</h3>
            <p className="text-xs text-muted-foreground">{match.team_b?.average_tsr} avg TSR</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Picks</span>
                <div className="flex flex-col gap-1.5">
                  {[0, 1].map((idx) => {
                    const pick = draft.picksB[idx];
                    return (
                      <div key={`pickB-${idx}`} className="flex h-9 items-center justify-between rounded-md border border-red-500/20 bg-red-950/30 px-3 py-1">
                        <span className="text-sm font-medium">{pick ? CHAMPIONS.find((c) => c.id === pick)?.name : "-"}</span>
                        <span className="text-[10px] text-red-400/70 font-semibold">{pick ? "PICKED" : "EMPTY"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Bans</span>
                <div className="flex flex-col gap-1.5">
                  {[0, 1].map((idx) => {
                    const ban = draft.bansB[idx];
                    return (
                      <div key={`banB-${idx}`} className="flex h-9 items-center justify-between rounded-md border border-red-500/20 bg-red-950/20 px-3 py-1">
                        <span className="text-sm font-medium">{ban ? CHAMPIONS.find((c) => c.id === ban)?.name : "-"}</span>
                        <span className="text-[10px] text-red-400/70 font-semibold">{ban ? "BANNED" : "EMPTY"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Draft Central Board */}
        <div className="rounded-xl border bg-card/65 p-6 backdrop-blur-lg">
          <div className="flex flex-col items-center justify-between border-b pb-4 sm:flex-row">
            <div>
              <h4 className="text-lg font-bold tracking-tight">Champion Draft Board</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Select a champion and click Lock In to ban/pick.</p>
            </div>
            <div className="mt-2 sm:mt-0">
              {draft.turn === "finished" ? (
                <span className="rounded bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">Draft Completed</span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    {draft.turn.replace(/_/g, " ")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {draft.turn !== "finished" && (
            <div className="mt-6">
              {/* Turn Banner */}
              <div className={cn(
                "rounded-md border p-3.5 text-center text-sm font-bold uppercase tracking-wider transition-colors",
                isMyTurn ? "bg-amber-500/10 border-amber-500/35 text-amber-400 animate-pulse" : "bg-secondary/30 border-white/5 text-muted-foreground"
              )}>
                {isMyTurn ? "🔔 YOUR TURN TO CHOOSE!" : `💤 WAITING ON ${draft.turn.startsWith("team_a") ? teamAName : teamBName}`}
              </div>

              {/* Champion Grid */}
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-5 gap-3">
                {CHAMPIONS.map((champ) => {
                  const unavailable = isUnavailable(champ.id);
                  const selected = selectedChampion === champ.id;
                  return (
                    <button
                      key={champ.id}
                      disabled={unavailable || !isMyTurn}
                      onClick={() => setSelectedChampion(champ.id)}
                      className={cn(
                        "group relative rounded-xl border bg-gradient-to-b p-3.5 text-left transition-all overflow-hidden",
                        champ.color,
                        selected && "ring-2 ring-primary border-primary bg-primary/5 scale-105",
                        unavailable && "opacity-40 cursor-not-allowed saturate-50",
                        !unavailable && isMyTurn && "hover:border-primary/50 hover:shadow-glow cursor-pointer"
                      )}
                    >
                      <span className="text-sm font-bold block">{champ.name}</span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">{champ.role}</span>
                      {isBanned(champ.id) && (
                        <span className="absolute bottom-2 right-2 rounded bg-red-500/25 border border-red-500/20 px-1 py-0.5 text-[8px] font-black text-red-400 uppercase">Ban</span>
                      )}
                      {isPicked(champ.id) && (
                        <span className="absolute bottom-2 right-2 rounded bg-sky-500/25 border border-sky-500/20 px-1 py-0.5 text-[8px] font-black text-sky-400 uppercase">Pick</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  disabled={!selectedChampion || !isMyTurn}
                  onClick={lockInDraftSelection}
                  className="interactive-surface shadow-glow"
                >
                  <Swords className="mr-2 h-4 w-4" /> LOCK IN SELECTION
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat and Admin Panels */}
      <aside className="space-y-4">
        {/* Support Ticket Box */}
        <div className="glass-panel border-red-500/25 bg-red-950/10 p-5 rounded-2xl">
          <h4 className="flex items-center gap-2 text-sm font-bold text-red-400">
            <ShieldAlert className="h-4 w-4" /> Need Assistance?
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Call a referee if the other team is late or violates any rules.
          </p>
          {refAlert ? (
            <div className="mt-3 rounded border border-red-500/40 bg-red-950/30 p-2.5 text-center text-xs font-semibold text-red-400 animate-pulse">
              🚨 Referee Alert Active
            </div>
          ) : (
            <Button
              onClick={handleCallReferee}
              variant="outline"
              size="sm"
              className="mt-3 w-full border-red-500/40 hover:bg-red-950/40 hover:text-red-400 transition"
            >
              Call Tournament Admin
            </Button>
          )}
        </div>

        {/* Riot API Webhook Simulator Panel */}
        <div className="glass-panel border-amber-500/25 bg-amber-950/10 p-5 rounded-2xl">
          <h4 className="flex items-center gap-2 text-sm font-bold text-amber-400">
            ⚡ Riot Games Simulator
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Simulate Riot Games reporting match completion. Testing webhook auto-advancement loop.
          </p>
          <div className="mt-3.5 space-y-2">
            <Button
              disabled={simulating || match.status === "confirmed"}
              onClick={() => match.team_a_id && simulateRiotCallback(match.team_a_id)}
              className="w-full h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black font-extrabold transition shadow-glow"
            >
              {simulating ? "Simulating..." : `Simulate ${teamAName} Win`}
            </Button>
            <Button
              disabled={simulating || match.status === "confirmed"}
              onClick={() => match.team_b_id && simulateRiotCallback(match.team_b_id)}
              className="w-full h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black font-extrabold transition shadow-glow"
            >
              {simulating ? "Simulating..." : `Simulate ${teamBName} Win`}
            </Button>
          </div>
        </div>

        {/* Lobby Chat */}
        <div className="rounded-xl border bg-card/65 p-4 flex flex-col h-[400px] backdrop-blur-lg">
          <h4 className="text-sm font-bold border-b pb-2 flex items-center gap-2">
            <BadgeInfo className="h-4 w-4 text-primary" /> Lobby Chat
          </h4>
          <div className="flex-1 overflow-y-auto space-y-2 py-3 pr-1 text-xs">
            {messages.map((msg, index) => {
              const isSystem = msg.role === "system";
              return (
                <div
                  key={`msg-${index}`}
                  className={cn(
                    "rounded-md p-2 max-w-[90%] break-words animate-in slide-in-from-bottom-2 duration-200",
                    isSystem
                      ? "bg-secondary/40 border border-white/5 text-muted-foreground mx-auto text-center"
                      : msg.role === currentRole
                        ? "bg-primary/10 border border-primary/25 text-foreground ml-auto"
                        : "bg-secondary/70 text-foreground mr-auto"
                  )}
                >
                  {!isSystem && (
                    <span className="font-bold text-[10px] text-primary block mb-0.5">
                      {msg.senderName} ({msg.role.replace("captain_", "Captain ")})
                    </span>
                  )}
                  <p className={isSystem ? "italic text-[10px]" : ""}>{msg.text}</p>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Send message..."
              className="h-8 text-xs"
            />
            <Button size="icon" className="h-8 w-8 shrink-0" onClick={sendMessage}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}
