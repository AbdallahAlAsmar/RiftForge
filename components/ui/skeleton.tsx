import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-secondary/70 animate-pulse",
        className
      )}
      aria-hidden
    />
  );
}
