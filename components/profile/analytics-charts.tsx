"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChartColumnIncreasing, Crown, Heart, Sparkles, Swords, Target, Trophy, Flame, TimerReset, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type AnalyticsChartsProps = {
  currentTsr: number;
  preferredRoles: string[];
  historyCount: number;
  tournamentWins: number;
  tournamentCompletedCount: number;
  tournamentActiveCount: number;
};

const roleMeta = [
  { name: "Top", icon: Swords, color: "bg-red-500", border: "border-red-500/20" },
  { name: "Jungle", icon: Sparkles, color: "bg-emerald-500", border: "border-emerald-500/20" },
  { name: "Mid", icon: Crown, color: "bg-amber-500", border: "border-amber-500/20" },
  { name: "Bot", icon: Swords, color: "bg-indigo-500", border: "border-indigo-500/20" },
  { name: "Support", icon: Heart, color: "bg-pink-500", border: "border-pink-500/20" }
];

export function AnalyticsCharts({
  currentTsr,
  preferredRoles = [],
  historyCount = 0,
  tournamentWins = 0,
  tournamentCompletedCount = 0,
  tournamentActiveCount = 0
}: AnalyticsChartsProps) {
  const [panel, setPanel] = useState<"overview" | "queue">("overview");

  const playedCount = historyCount;
  const winRate = playedCount > 0 ? Math.round((tournamentWins / playedCount) * 100) : 0;
  const completionRate = playedCount > 0 ? Math.round((tournamentCompletedCount / playedCount) * 100) : 0;
  const readinessScore = Math.min(100, Math.max(35, Math.round((currentTsr / 12) + preferredRoles.length * 7 + winRate * 0.6)));

  // Generate a premium progression line curve based on current TSR and history count.
  const baseTsr = Math.max(100, currentTsr - 250);
  const dataPoints = playedCount > 0
    ? [
        baseTsr,
        baseTsr + 70,
        Math.max(100, currentTsr - 80),
        Math.max(100, currentTsr - 120),
        currentTsr
      ]
    : [
        baseTsr,
        baseTsr + 40,
        baseTsr + 100,
        currentTsr
      ];

  const maxVal = Math.max(...dataPoints, 1200);
  const minVal = Math.min(...dataPoints, 100);
  const valRange = maxVal - minVal || 100;

  // Map data to SVG grid points
  const svgWidth = 500;
  const svgHeight = 160;
  const padding = 20;

  const points = dataPoints.map((val, idx) => {
    const x = padding + (idx / (dataPoints.length - 1)) * (svgWidth - padding * 2);
    const y = svgHeight - padding - ((val - minVal) / valRange) * (svgHeight - padding * 2);
    return { x, y, val };
  });

  const pathD = useMemo(() => {
    if (!points.length) return "";

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [points]);

  const areaD = pathD
    ? `${pathD} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`
    : "";

  const preferredRoleSet = new Set(preferredRoles.map((role) => role.toLowerCase()));
  const bestRole = roleMeta.find((role) => preferredRoleSet.has(role.name.toLowerCase()))?.name ?? "Unassigned";

  const topInsights = [
    {
      label: "TSR",
      value: currentTsr.toString(),
      note: playedCount > 0 ? "Live balance target" : "No matches yet",
      icon: ChartColumnIncreasing
    },
    {
      label: "Played",
      value: playedCount.toString(),
      note: "Tournament entries",
      icon: Target
    },
    {
      label: "Won",
      value: tournamentWins.toString(),
      note: "Confirmed final wins",
      icon: Trophy
    },
    {
      label: "Win rate",
      value: `${winRate}%`,
      note: "Wins per participation",
      icon: Flame
    }
  ];

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="relative overflow-hidden rounded-[28px] border border-red-500/20 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.12),transparent_28%),linear-gradient(180deg,rgba(9,9,11,0.98),rgba(16,16,18,0.96))] p-5 shadow-[0_28px_80px_-38px_rgba(0,0,0,0.9)] backdrop-blur-md sm:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="pointer-events-none absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-red-500/70 to-transparent" />

        <div className="relative flex flex-col gap-4 border-b border-white/10 pb-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.45em] text-red-400">Performance & Queue Calibration</p>
            <h4 className="text-2xl font-black tracking-tight text-foreground sm:text-[1.9rem]">Competitive snapshot</h4>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Wins, participation, and queue fit in one compact panel.
            </p>
          </div>
          <div className="inline-flex self-start rounded-full border border-red-500/20 bg-black/60 p-1 text-xs font-semibold shadow-sm backdrop-blur">
            <button
              type="button"
              onClick={() => setPanel("overview")}
              className={cn(
                "rounded-full px-3 py-1.5 transition",
                panel === "overview" ? "bg-red-500 text-white shadow-[0_0_22px_rgba(239,68,68,0.35)]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setPanel("queue")}
              className={cn(
                "rounded-full px-3 py-1.5 transition",
                panel === "queue" ? "bg-red-500 text-white shadow-[0_0_22px_rgba(239,68,68,0.35)]" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Queue fit
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {topInsights.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-black/35 p-4 transition hover:border-red-500/30 hover:bg-black/50">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.35em] text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-[2rem] font-black leading-none text-foreground">{item.value}</p>
                </div>
                <div className="rounded-full border border-red-500/20 bg-red-500/10 p-2 text-red-400 shadow-[0_0_18px_rgba(239,68,68,0.18)]">
                  <item.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{item.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.22fr)_minmax(0,0.78fr)]">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-red-400">Momentum curve</p>
                <p className="text-xs text-muted-foreground">TSR trend at a glance.</p>
              </div>
              <Badge className="gap-1 border border-red-500/20 bg-red-500/10 text-red-300">
                <TimerReset className="h-3.5 w-3.5" /> {completionRate}% completed
              </Badge>
            </div>

            <div className="relative mt-3">
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="h-auto w-full overflow-visible select-none">
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity="0.26" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.02" />
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="55%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>

                <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="rgba(255,255,255,0.04)" strokeDasharray="4 4" />
                <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="rgba(255,255,255,0.08)" />

                {areaD ? <path d={areaD} fill="url(#areaGrad)" /> : null}
                {pathD ? <path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="3.5" strokeLinecap="round" /> : null}

                {points.map((pt, idx) => (
                  <g key={`pt-${idx}`} className="group cursor-pointer">
                    <circle cx={pt.x} cy={pt.y} r="6" className="fill-zinc-950 stroke-[3] stroke-red-400 transition-all duration-200 group-hover:r-8" />
                    <circle cx={pt.x} cy={pt.y} r="2" className="fill-white" />
                    <foreignObject
                      x={pt.x - 25}
                      y={pt.y - 28}
                      width="50"
                      height="20"
                      className="pointer-events-none opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    >
                      <div className="rounded border border-red-500/20 bg-black/90 px-1 py-0.5 text-center text-[9px] font-bold text-white shadow-md">
                        Match {idx + 1}
                      </div>
                    </foreignObject>
                  </g>
                ))}
              </svg>
            </div>
          </div>

          <div className="rounded-2xl border border-red-500/15 bg-black/35 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.35em] text-red-400">Queue fit</p>
                <p className="text-xs text-muted-foreground">How the balancer sees you.</p>
              </div>
              <Badge className="gap-1 border border-red-500/20 bg-red-500/10 text-red-300">
                <BadgeCheck className="h-3.5 w-3.5" /> {readinessScore}% ready
              </Badge>
            </div>

            {panel === "overview" ? (
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Best queue role</span>
                    <span className="font-semibold text-foreground">{bestRole}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-secondary/60">
                    <div className="h-2 rounded-full bg-gradient-to-r from-red-500 via-orange-400 to-emerald-400" style={{ width: `${readinessScore}%` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div className="rounded-lg border border-white/10 p-2 text-center">{tournamentActiveCount} active</div>
                    <div className="rounded-lg border border-white/10 p-2 text-center">{tournamentCompletedCount} completed</div>
                    <div className="rounded-lg border border-white/10 p-2 text-center">{winRate}% win rate</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {roleMeta.map((role) => {
                  const isPreferred = preferredRoleSet.has(role.name.toLowerCase());
                  const percent = isPreferred ? (preferredRoles[0]?.toLowerCase() === role.name.toLowerCase() ? 96 : 74) : 18;

                  return (
                    <div key={role.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="inline-flex items-center gap-1.5 text-foreground/90">
                          <role.icon className="h-3.5 w-3.5 text-red-400" /> {role.name}
                        </span>
                        <span className="text-muted-foreground">{percent}% calibrated</span>
                      </div>
                      <div className={cn("h-2.5 w-full overflow-hidden rounded-full border bg-secondary/50", role.border)}>
                        <div className={cn("h-full rounded-full transition-all duration-500", role.color)} style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
