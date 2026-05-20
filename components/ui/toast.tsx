"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle2, AlertCircle, Info, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ToastType = "success" | "error" | "info" | "loading";

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);
      return id;
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-5 right-5 z-[9999] flex w-full max-w-sm flex-col gap-3 pointer-events-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const { id, type, title, message, duration } = toast;

  useEffect(() => {
    if (type === "loading" || duration === Infinity) return;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, type, duration, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 shadow-glow" />,
    error: <AlertCircle className="h-5 w-5 text-destructive shrink-0 shadow-glow" />,
    info: <Info className="h-5 w-5 text-primary shrink-0 shadow-glow" />,
    loading: <Loader2 className="h-5 w-5 text-primary animate-spin shrink-0" />
  };

  const borders = {
    success: "border-green-500/20 bg-green-950/20 shadow-green-500/5",
    error: "border-destructive/20 bg-destructive-950/20 shadow-destructive/5",
    info: "border-primary/20 bg-primary-950/20 shadow-primary/5",
    loading: "border-primary/20 bg-[#0B0B0B]/90 shadow-primary/5"
  };

  return (
    <div
      className={cn(
        "pointer-events-auto relative flex w-full items-start gap-3.5 overflow-hidden rounded-xl border bg-card/85 p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-slide-in",
        borders[type]
      )}
      role="alert"
    >
      {/* Left glowing strip */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1",
          type === "success" && "bg-green-500",
          type === "error" && "bg-destructive",
          (type === "info" || type === "loading") && "bg-primary"
        )}
      />

      {icons[type]}

      <div className="flex-1 space-y-0.5 pr-2">
        {title && <h5 className="text-xs font-black uppercase tracking-wider text-white">{title}</h5>}
        <p className="text-xs font-medium text-muted-foreground leading-relaxed">{message}</p>
      </div>

      {type !== "loading" && (
        <button
          onClick={() => onDismiss(id)}
          className="rounded-md p-1 text-muted-foreground/60 transition hover:bg-white/5 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
