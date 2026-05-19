"use client";

import { useEffect, useMemo, useState } from "react";

type Match = {
  id: string;
  round: number;
  position: number;
  next_match_id?: string | null;
};

export default function BracketConnectors({ matches }: { matches: Match[] }) {
  const [paths, setPaths] = useState<string[]>([]);
  const [bbox, setBbox] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    const board = document.querySelector(".bracket-board") as HTMLElement | null;
    if (!board) return;

    const boardRect = board.getBoundingClientRect();

    const newPaths: string[] = [];

    function getEl(matchId: string) {
      return board.querySelector(`.match-node[data-match-id=\"${matchId}\"]`) as HTMLElement | null;
    }

    for (const match of matches) {
      if (!match.next_match_id) continue;
      const src = getEl(match.id);
      const dst = getEl(match.next_match_id);
      if (!src || !dst) continue;

      const s = src.getBoundingClientRect();
      const d = dst.getBoundingClientRect();

      const start = { x: s.right - boardRect.left, y: s.top + s.height / 2 - boardRect.top };
      const end = { x: d.left - boardRect.left, y: d.top + d.height / 2 - boardRect.top };

      const dx = Math.max(24, Math.abs(end.x - start.x) * 0.45);
      const c1 = { x: start.x + dx, y: start.y };
      const c2 = { x: end.x - dx, y: end.y };

      const path = `M ${start.x},${start.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`;
      newPaths.push(path);
    }

    setPaths(newPaths);
    setBbox({ width: Math.max(100, boardRect.width), height: Math.max(100, boardRect.height) });
  }, [matches]);

  // Recompute on resize so connectors follow layout changes
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      // trigger effect by updating state with same matches (simple way)
      setPaths((p) => [...p]);
    });
    const board = document.querySelector(".bracket-board") as HTMLElement | null;
    if (board) ro.observe(board);
    return () => ro.disconnect();
  }, []);

  if (!paths.length) return null;

  return (
    <svg className="pointer-events-none absolute left-0 top-0" width={bbox.width} height={bbox.height} preserveAspectRatio="none">
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </feMerge>
      </defs>
      {paths.map((d, i) => (
        <g key={i} style={{ mixBlendMode: "screen" }}>
          <path d={d} stroke="#18c6e6" strokeWidth={2.5} fill="none" strokeOpacity={0.9} filter="url(#glow)" />
          <path d={d} stroke="#08303a" strokeWidth={8} fill="none" strokeOpacity={0.06} />
        </g>
      ))}
    </svg>
  );
}
