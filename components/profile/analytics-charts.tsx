"use client";

import { Crown, Sparkles, Swords, Heart } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type AnalyticsChartsProps = {
  currentTsr: number;
  preferredRoles: string[];
  historyCount: number;
};

export function AnalyticsCharts({
  currentTsr,
  preferredRoles = [],
  historyCount = 0
}: AnalyticsChartsProps) {
  // Generate a premium progression line curve based on current TSR and history count
  const baseTsr = Math.max(100, currentTsr - 250);
  const dataPoints = historyCount > 0
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

  // Construct a smooth bezier curve path for SVG
  let pathD = "";
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cpX1 = p0.x + (p1.x - p0.x) / 2;
      const cpY1 = p0.y;
      const cpX2 = p0.x + (p1.x - p0.x) / 2;
      const cpY2 = p1.y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
    }
  }

  // Construct area gradient path under the curve
  const areaD = points.length > 0
    ? `${pathD} L ${points[points.length - 1].x} ${svgHeight - padding} L ${points[0].x} ${svgHeight - padding} Z`
    : "";

  // Normalize role selections for charting
  const roles = [
    { name: "Top", icon: Swords, color: "bg-red-500", border: "border-red-500/20" },
    { name: "Jungle", icon: Sparkles, color: "bg-emerald-500", border: "border-emerald-500/20" },
    { name: "Mid", icon: Crown, color: "bg-amber-500", border: "border-amber-500/20" },
    { name: "Bot", icon: Swords, color: "bg-indigo-500", border: "border-indigo-500/20" },
    { name: "Support", icon: Heart, color: "bg-pink-500", border: "border-pink-500/20" }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* TSR History SVG Chart */}
      <div className="rounded-xl border border-primary/20 bg-card/60 p-5 backdrop-blur-md">
        <div className="flex items-center justify-between border-b pb-3 mb-4">
          <div>
            <h4 className="text-sm font-bold tracking-wider uppercase text-primary">TSR Momentum</h4>
            <p className="text-xs text-muted-foreground">Historical progression index</p>
          </div>
          <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs font-black text-primary">
            {currentTsr} TSR
          </span>
        </div>

        <div className="relative">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible select-none"
          >
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.00" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="var(--primary)" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
            <line x1={padding} y1={svgHeight / 2} x2={svgWidth - padding} y2={svgHeight / 2} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
            <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="rgba(255,255,255,0.08)" />

            {/* Area gradient under path */}
            {areaD && <path d={areaD} fill="url(#areaGrad)" />}

            {/* Main Bezier Line */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            )}

            {/* Point circles */}
            {points.map((pt, idx) => (
              <g key={`pt-${idx}`} className="group cursor-pointer">
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="6"
                  className="fill-zinc-950 stroke-[3] stroke-primary transition-all duration-200 group-hover:r-8"
                />
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="2"
                  className="fill-white"
                />
                <foreignObject
                  x={pt.x - 25}
                  y={pt.y - 28}
                  width="50"
                  height="20"
                  className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                >
                  <div className="rounded bg-black/85 border border-white/10 px-1 py-0.5 text-[9px] text-center font-bold text-white shadow-md">
                    {Math.round(pt.val)}
                  </div>
                </foreignObject>
              </g>
            ))}
          </svg>
        </div>
      </div>

      {/* Preferred Role Distribution */}
      <div className="rounded-xl border border-primary/20 bg-card/60 p-5 backdrop-blur-md">
        <div>
          <h4 className="text-sm font-bold tracking-wider uppercase text-primary">Role Preference</h4>
          <p className="text-xs text-muted-foreground">Positional queue calibration</p>
        </div>

        <div className="mt-5 space-y-3.5">
          {roles.map((role) => {
            const isPreferred = preferredRoles.map(r => r.toLowerCase()).includes(role.name.toLowerCase());
            const percent = isPreferred ? (preferredRoles[0]?.toLowerCase() === role.name.toLowerCase() ? 95 : 75) : 20;

            return (
              <div key={role.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="inline-flex items-center gap-1.5 text-foreground/90">
                    <role.icon className="h-3.5 w-3.5 text-primary" /> {role.name}
                  </span>
                  <span className="text-muted-foreground">{percent}% calibrated</span>
                </div>
                <div className={cn("h-2.5 w-full rounded-full bg-secondary/50 border overflow-hidden", role.border)}>
                  <div
                    className={cn("h-full rounded-full transition-all duration-500 shadow-glow", role.color)}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
