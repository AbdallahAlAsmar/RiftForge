"use client";

import { useEffect, useMemo, useState } from "react";

type Match = {
  id: string;
  round: number;
  position: number;
  next_match_id?: string | null;
};

interface BracketConnectorsProps {
  matches: Match[];
  rounds: number[];
  bracketSize: number;
  matchHeight: number;
  matchWidth: number;
  columnGap: number;
  minVerticalGap: number;
}

export default function BracketConnectors({
  matches,
  rounds,
  bracketSize,
  matchHeight,
  matchWidth,
  columnGap,
  minVerticalGap
}: BracketConnectorsProps) {
  const [paths, setPaths] = useState<Array<{ d: string; color: string }>>([]);
  const [svgDimensions, setSvgDimensions] = useState({ width: 0, height: 0 });

  // Memoize the calculation of vertical gaps per round
  const verticalGapsByRound = useMemo(() => {
    const gaps: Record<number, number> = {};
    for (const round of rounds) {
      const matchesInRound = bracketSize / Math.pow(2, round);
      const totalHeight = bracketSize * matchHeight;
      const availableSpacing = totalHeight - matchesInRound * matchHeight;
      gaps[round] = Math.max(minVerticalGap, availableSpacing / (matchesInRound - 1));
    }
    return gaps;
  }, [rounds, bracketSize, matchHeight, minVerticalGap]);

  useEffect(() => {
    const board = document.querySelector(".bracket-board") as HTMLElement | null;
    if (!board) return;

    const computeConnectors = () => {
      const newPaths: Array<{ d: string; color: string }> = [];
      const boardRect = board.getBoundingClientRect();
      const rawWidth = board.offsetWidth || 1;
      const rawHeight = board.offsetHeight || 1;
      const scaleX = boardRect.width / rawWidth;
      const scaleY = boardRect.height / rawHeight;
      const safeScaleX = Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1;
      const safeScaleY = Number.isFinite(scaleY) && scaleY > 0 ? scaleY : 1;

      // Calculate position of a match element
      const getMatchPosition = (matchId: string) => {
        const element = board.querySelector(`[data-match-id="${matchId}"]`) as HTMLElement | null;
        if (!element) return null;

        const rect = element.getBoundingClientRect();
        return {
          x: (rect.left - boardRect.left) / safeScaleX,
          y: (rect.top - boardRect.top) / safeScaleY,
          width: rect.width / safeScaleX,
          height: rect.height / safeScaleY
        };
      };

      // Process each match and its connection to the next match
      for (const match of matches) {
        if (!match.next_match_id) continue;

        const srcPos = getMatchPosition(match.id);
        const dstPos = getMatchPosition(match.next_match_id);

        if (!srcPos || !dstPos) continue;

        // Calculate connection points
        const startX = srcPos.x + srcPos.width;
        const startY = srcPos.y + srcPos.height / 2;

        const endX = dstPos.x;
        const endY = dstPos.y + dstPos.height / 2;

        // Create a classic bracket connector with right angles
        const midX = startX + (endX - startX) / 2;
        const pathData = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;
        newPaths.push({
          d: pathData,
          color: "#FF3B3B"
        });
      }

      setPaths(newPaths);

      // Set SVG dimensions to match board
      setSvgDimensions({
        width: rawWidth,
        height: rawHeight
      });
    };

    // Initial computation
    computeConnectors();

    // Set up observers for dynamic updates
    let animationFrameId: number;
    const scheduleCompute = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(computeConnectors);
    };

    // Observe mutations
    const mutationObserver = new MutationObserver(scheduleCompute);
    mutationObserver.observe(board, {
      childList: true,
      subtree: true,
      attributes: true
    });

    // Observe resize
    const resizeObserver = new ResizeObserver(scheduleCompute);
    resizeObserver.observe(board);

    // Listen for scroll and pointer events
    const handleScroll = () => scheduleCompute();
    const handlePointer = () => scheduleCompute();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pointermove", handlePointer, { passive: true });
    window.addEventListener("pointerup", handlePointer, { passive: true });
    window.addEventListener("wheel", handleScroll, { passive: true });

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pointermove", handlePointer);
      window.removeEventListener("pointerup", handlePointer);
      window.removeEventListener("wheel", handleScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, [matches, verticalGapsByRound]);

  if (!paths.length) return null;

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0"
      width={svgDimensions.width}
      height={svgDimensions.height}
      preserveAspectRatio="none"
      style={{ overflow: "visible" }}
    >
      <defs>
        <filter id="bracket-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="connector-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF3B3B" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FF5252" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* Render connector paths */}
      {paths.map((path, index) => (
        <g key={`connector-${index}`} style={{ mixBlendMode: "screen" }}>
          {/* Glow layer */}
          <path
            d={path.d}
            stroke={path.color}
            strokeWidth={3}
            fill="none"
            strokeOpacity={0.6}
            filter="url(#bracket-glow)"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Main line */}
          <path
            d={path.d}
            stroke="url(#connector-gradient)"
            strokeWidth={2}
            fill="none"
            strokeOpacity={0.95}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Shadow layer */}
          <path
            d={path.d}
            stroke="#031419"
            strokeWidth={6}
            fill="none"
            strokeOpacity={0.1}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      ))}
    </svg>
  );
}
