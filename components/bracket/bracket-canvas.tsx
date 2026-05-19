"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Minus, Move, Plus, RotateCcw, ZoomIn } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type Point = { x: number; y: number };

const MIN_SCALE = 0.55;
const MAX_SCALE = 1.8;
const SCALE_STEP = 0.12;
const TOP_PADDING = 24;
const FIT_PADDING = 48;
const VIEWPORT_PADDING = 24;
const MIN_WRAPPER_HEIGHT = 360;

export function BracketCanvas({ children }: { children: ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const [scale, setScale] = useState(0.82);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [wrapperHeight, setWrapperHeight] = useState<number | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{ pointerX: number; pointerY: number; offset: Point } | null>(null);
  const activePointerId = useRef<number | null>(null);
  const manualControlRef = useRef(false);
  const scaleRef = useRef(scale);

  const zoomLabel = useMemo(() => `${Math.round(scale * 100)}%`, [scale]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    const updateHeight = () => {
      const wrapper = wrapperRef.current;
      if (!wrapper) return;
      const rect = wrapper.getBoundingClientRect();
      const available = window.innerHeight - rect.top - VIEWPORT_PADDING;
      setWrapperHeight(Math.max(MIN_WRAPPER_HEIGHT, Math.floor(available)));
    };

    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  function getBoardContentSize() {
    const board = boardRef.current;
    if (!board) return { width: 1, height: 1 };

    const width = board.scrollWidth || board.offsetWidth || 1;
    const height = board.scrollHeight || board.offsetHeight || 1;

    return { width, height };
  }

  function getFitScale() {
    const wrapper = wrapperRef.current;
    const board = boardRef.current;

    if (!wrapper || !board) {
      return scaleRef.current;
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    const { width: boardWidth, height: boardHeight } = getBoardContentSize();
    const availableWidth = Math.max(1, wrapperRect.width - FIT_PADDING * 2);
    const availableHeight = Math.max(1, wrapperRect.height - FIT_PADDING * 2);
    const fitScale = Math.min(availableWidth / boardWidth, availableHeight / boardHeight);

    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, fitScale));
  }

  function fitToView() {
    const nextScale = getFitScale();
    setScale(nextScale);
    setOffset(getCenterOffset(nextScale));
  }

  function clampOffset(nextOffset: Point, nextScale: number) {
    const wrapper = wrapperRef.current;
    const board = boardRef.current;

    if (!wrapper || !board) {
      return nextOffset;
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    const { width: boardWidth, height: boardHeight } = getBoardContentSize();
    const scaledBoardWidth = boardWidth * nextScale;
    const scaledBoardHeight = boardHeight * nextScale;

    const centeredX = (wrapperRect.width - scaledBoardWidth) / 2;
    const centeredY = Math.max(TOP_PADDING, (wrapperRect.height - scaledBoardHeight) / 2);

    const H_PEEK = 64;
    const minX = scaledBoardWidth <= wrapperRect.width ? centeredX - H_PEEK : wrapperRect.width - scaledBoardWidth;
    const maxX = scaledBoardWidth <= wrapperRect.width ? centeredX + H_PEEK : 0;
    const minY = scaledBoardHeight <= wrapperRect.height ? centeredY : wrapperRect.height - scaledBoardHeight;
    const maxY = scaledBoardHeight <= wrapperRect.height ? centeredY : TOP_PADDING;

    return {
      x: Math.min(maxX, Math.max(minX, nextOffset.x)),
      y: Math.min(maxY, Math.max(minY, nextOffset.y))
    };
  }

  function getCenterOffset(nextScale: number) {
    const wrapper = wrapperRef.current;
    const board = boardRef.current;

    if (!wrapper || !board) {
      return { x: 0, y: 0 };
    }

    const wrapperRect = wrapper.getBoundingClientRect();
    const { width: boardWidth, height: boardHeight } = getBoardContentSize();

    // Calculate proper centering accounting for scale
    const scaledBoardWidth = boardWidth * nextScale;
    const scaledBoardHeight = boardHeight * nextScale;

    return clampOffset(
      {
        x: (wrapperRect.width - scaledBoardWidth) / 2,
        y: (wrapperRect.height - scaledBoardHeight) / 2
      },
      nextScale
    );
  }

  function applyZoom(nextScale: number, anchor?: Point) {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      setScale(nextScale);
      return;
    }

    const rect = wrapper.getBoundingClientRect();
    const safeScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
    manualControlRef.current = true;

    if (!anchor) {
      setOffset(getCenterOffset(safeScale));
      setScale(safeScale);
      return;
    }

    setOffset((current) => {
      const worldX = (anchor.x - rect.left - current.x) / scale;
      const worldY = (anchor.y - rect.top - current.y) / scale;

      return clampOffset(
        {
        x: anchor.x - rect.left - worldX * safeScale,
        y: anchor.y - rect.top - worldY * safeScale
        },
        safeScale
      );
    });

    setScale(safeScale);
  }

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const board = boardRef.current;
    if (!wrapper || !board) return;

    const updatePosition = () => {
      if (manualControlRef.current) {
        setOffset((current) => clampOffset(current, scaleRef.current));
        return;
      }

      fitToView();
    };

    updatePosition();

    const resizeObserver = new ResizeObserver(updatePosition);
    resizeObserver.observe(wrapper);
    resizeObserver.observe(board);

    return () => resizeObserver.disconnect();
  }, [wrapperHeight]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
      applyZoom(scale + delta, { x: event.clientX, y: event.clientY });
    };

    wrapper.addEventListener("wheel", handleWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", handleWheel);
  }, [scale]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, form, [data-no-pan]")) {
      return;
    }

    event.preventDefault();
    setIsPanning(true);
    activePointerId.current = event.pointerId;
    manualControlRef.current = true;
    panStartRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      offset
    };

    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
  }

  const updatePan = (clientX: number, clientY: number) => {
    if (!panStartRef.current) return;
    const start = panStartRef.current;
    const dx = clientX - start.pointerX;
    const dy = clientY - start.pointerY;

    setOffset(clampOffset({ x: start.offset.x + dx, y: start.offset.y + dy }, scale));
  };

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!isPanning || !panStartRef.current) return;
    if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;

    updatePan(event.clientX, event.clientY);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!isPanning) return;
    if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;

    endPan(event.pointerId);
  }

  function endPan(pointerId?: number) {
    setIsPanning(false);
    panStartRef.current = null;
    activePointerId.current = null;
    const wrapper = wrapperRef.current;
    if (!wrapper || pointerId === undefined) return;
    try {
      wrapper.releasePointerCapture(pointerId);
    } catch {
      // noop
    }
  }

  useEffect(() => {
    if (!isPanning) return;

    const handleMove = (event: PointerEvent) => {
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;
      updatePan(event.clientX, event.clientY);
    };

    const handleUp = (event: PointerEvent) => {
      if (activePointerId.current !== null && event.pointerId !== activePointerId.current) return;
      endPan(event.pointerId);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [isPanning]);

  function resetView() {
    manualControlRef.current = false;
    fitToView();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-black/70 p-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300">
            <Move className="h-3.5 w-3.5" /> Live bracket board
          </p>
          <p className="text-sm text-muted-foreground">
            Drag to pan, scroll to zoom, and use the controls to reset the view.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ZoomPill value={zoomLabel} />
          <Button type="button" variant="outline" size="sm" onClick={() => applyZoom(scale + SCALE_STEP)}>
            <Plus className="h-4 w-4" /> Zoom in
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => applyZoom(scale - SCALE_STEP)}>
            <Minus className="h-4 w-4" /> Zoom out
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={resetView}>
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        </div>
      </div>

      <div
        ref={wrapperRef}
        className={cn(
          "relative min-h-[360px] touch-none select-none overflow-hidden rounded-[28px] border border-white/10 bg-[#050712] shadow-[0_40px_120px_rgba(0,0,0,0.65)]",
          isPanning ? "cursor-grabbing" : "cursor-grab"
        )}
        style={wrapperHeight ? { height: wrapperHeight } : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Background decorations */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(34,211,238,0.28),transparent_18%),radial-gradient(circle_at_88%_20%,rgba(109,40,217,0.22),transparent_24%),radial-gradient(circle_at_72%_76%,rgba(14,165,233,0.16),transparent_18%),linear-gradient(90deg,#0d6aa2_0%,#071d49_35%,#25124f_72%,#3f2d6e_100%)]" />
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(135deg,rgba(255,255,255,0.04)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.02)_50%,rgba(255,255,255,0.02)_75%,transparent_75%,transparent)] [background-size:320px_320px]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,18,0.46)_0%,rgba(3,7,18,0.1)_18%,transparent_28%,transparent_72%,rgba(3,7,18,0.08)_88%,rgba(3,7,18,0.36)_100%)]" />

        {/* Left rail */}
        <div className="absolute inset-y-0 left-0 hidden w-40 border-r border-cyan-400/30 lg:block">
          <div className="absolute left-6 top-8 flex flex-col gap-28 text-cyan-300/95">
            <span className="origin-left -rotate-90 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.6em]">
              Playoffs
            </span>
            <span className="origin-left -rotate-90 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.6em]">
              Playoffs
            </span>
            <span className="origin-left -rotate-90 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.6em]">
              Playoffs
            </span>
          </div>
          <div className="absolute inset-y-0 right-0 w-1 bg-cyan-300/70 shadow-[0_0_20px_rgba(34,211,238,0.7)]" />
        </div>

        {/* Board container with transform */}
        <motion.div
          ref={boardRef}
          className="relative origin-top-left p-10 lg:p-14"
          animate={{ x: offset.x, y: offset.y, scale }}
          transition={reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 220, damping: 28, mass: 0.8 }}
          style={{
            transformOrigin: "0 0",
            willChange: "transform"
          }}
        >
          {children}
        </motion.div>

        {/* Help text */}
        <div className="pointer-events-none absolute bottom-4 right-4 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-md">
          Tip: use trackpad pinch or mouse wheel for zoom
        </div>
      </div>
    </div>
  );
}

function ZoomPill({ value }: { value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-200">
      <ZoomIn className="h-3.5 w-3.5" />
      {value}
    </div>
  );
}
