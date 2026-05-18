"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils/cn";

type MotionDivProps = HTMLMotionProps<"div">;

type RevealProps = MotionDivProps & {
  children: ReactNode;
  delay?: number;
  distance?: number;
  once?: boolean;
};

const ease = [0.22, 1, 0.36, 1] as const;

function useMotionEnabled() {
  const reduceMotion = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  return hydrated && !reduceMotion;
}

export function Reveal({
  children,
  className,
  delay = 0,
  distance = 20,
  once = true,
  ...props
}: RevealProps) {
  const motionEnabled = useMotionEnabled();

  return (
    <motion.div
      className={className}
      initial={motionEnabled ? { opacity: 0, y: distance } : false}
      whileInView={motionEnabled ? { opacity: 1, y: 0 } : undefined}
      viewport={motionEnabled ? { once, amount: 0.2 } : undefined}
      transition={motionEnabled ? { duration: 0.55, ease, delay } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type HoverLiftProps = MotionDivProps & {
  children: ReactNode;
};

export function HoverLift({ children, className, ...props }: HoverLiftProps) {
  const motionEnabled = useMotionEnabled();

  return (
    <motion.div
      className={className}
      whileHover={motionEnabled ? { y: -6, scale: 1.01 } : undefined}
      whileTap={motionEnabled ? { scale: 0.99 } : undefined}
      transition={motionEnabled ? { duration: 0.25, ease } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}

type FloatProps = MotionDivProps & {
  children: ReactNode;
  intensity?: number;
  duration?: number;
};

export function Float({
  children,
  className,
  intensity = 8,
  duration = 4.5,
  ...props
}: FloatProps) {
  const motionEnabled = useMotionEnabled();

  return (
    <motion.div
      className={className}
      animate={motionEnabled ? { y: [0, -intensity, 0] } : undefined}
      transition={
        motionEnabled
          ? { duration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
          : undefined
      }
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function LiveBackdrop({ className }: { className?: string }) {
  const motionEnabled = useMotionEnabled();

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <motion.span
        className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
        animate={
          motionEnabled
            ? { x: [0, 30, -15, 0], y: [0, -20, 15, 0], scale: [1, 1.1, 0.95, 1] }
            : undefined
        }
        transition={motionEnabled ? { duration: 14, repeat: Infinity, ease: "easeInOut" } : undefined}
      />
      <motion.span
        className="absolute -right-16 top-12 h-56 w-56 rounded-full bg-accent/15 blur-3xl"
        animate={
          motionEnabled
            ? { x: [0, -20, 10, 0], y: [0, 15, -10, 0], scale: [1, 0.95, 1.08, 1] }
            : undefined
        }
        transition={
          motionEnabled
            ? { duration: 12, repeat: Infinity, ease: "easeInOut", delay: 0.5 }
            : undefined
        }
      />
      <motion.span
        className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl"
        animate={
          motionEnabled
            ? { x: [0, 20, -25, 0], y: [0, -18, 10, 0], scale: [1, 1.05, 0.9, 1] }
            : undefined
        }
        transition={
          motionEnabled
            ? { duration: 16, repeat: Infinity, ease: "easeInOut", delay: 0.8 }
            : undefined
        }
      />
    </div>
  );
}
