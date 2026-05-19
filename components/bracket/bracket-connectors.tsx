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
  const [endpoints, setEndpoints] = useState<{ x: number; y: number; color?: string }[]>([]);
  const [bbox, setBbox] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  useEffect(() => {
    const board = document.querySelector(".bracket-board") as HTMLElement | null;
    if (!board) return;

    const parent = board.parentElement as HTMLElement | null;
    let ticking = false;

    const compute = () => {
      const boardRect = board.getBoundingClientRect();
      const newPaths: string[] = [];

      function getEl(matchId: string) {
        return board?.querySelector(`.match-node[data-match-id=\"${matchId}\"]`) as HTMLElement | null;
      }

      const newEndpoints: { x: number; y: number; color?: string }[] = [];
      for (const match of matches) {
        if (!match.next_match_id) continue;
        const src = getEl(match.id);
        const dst = getEl(match.next_match_id);
        if (!src || !dst) continue;

        const s = src.getBoundingClientRect();
        const d = dst.getBoundingClientRect();

        const start = { x: s.right - boardRect.left, y: s.top + s.height / 2 - boardRect.top };
        const end = { x: d.left - boardRect.left, y: d.top + d.height / 2 - boardRect.top };

        const dist = Math.abs(end.x - start.x);
        const dx = Math.max(24, dist * 0.6);
        const c1 = { x: start.x + dx, y: start.y };
        const c2 = { x: end.x - dx, y: end.y };

        const path = `M ${start.x},${start.y} C ${c1.x},${c1.y} ${c2.x},${c2.y} ${end.x},${end.y}`;
        newPaths.push(path);
        newEndpoints.push({ x: start.x, y: start.y, color: "#00ffe1" });
        newEndpoints.push({ x: end.x, y: end.y, color: "#7be3ff" });
      }

      setPaths(newPaths);
      setEndpoints(newEndpoints);
      setBbox({ width: Math.max(100, boardRect.width), height: Math.max(100, boardRect.height) });
      ticking = false;
    };

    const schedule = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(compute);
    };

    // Observe style mutations on the motion wrapper (parent) so transforms trigger recompute
    const mo = new MutationObserver(schedule);
    if (parent) mo.observe(parent, { attributes: true, attributeFilter: ["style", "transform"] });

    // Resize observer for layout changes
    const ro = new ResizeObserver(schedule);
    ro.observe(board);
    if (parent) ro.observe(parent);

    // Also update during pointer and wheel interactions for snappy feedback
    const onPointer = () => schedule();
    const onWheel = () => schedule();
    window.addEventListener("pointermove", onPointer);
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("pointerup", onPointer);
    window.addEventListener("wheel", onWheel, { passive: true });

    // initial compute
    schedule();

    return () => {
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("pointerup", onPointer);
      window.removeEventListener("wheel", onWheel);
    };
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
        </filter>
      </defs>
      {paths.map((d, i) => (
        <g key={i} style={{ mixBlendMode: "screen" }}>
          <path d={d} stroke="#18c6e6" strokeWidth={2.5} fill="none" strokeOpacity={0.95} filter="url(#glow)" />
          <path d={d} stroke="#031419" strokeWidth={8} fill="none" strokeOpacity={0.08} />
        </g>
      ))}
      {endpoints.map((pt, i) => (
        <circle key={`ep-${i}`} cx={pt.x} cy={pt.y} r={4} fill={pt.color ?? "#00ffe1"} opacity={0.95} />
      ))}
    </svg>
  );
}
