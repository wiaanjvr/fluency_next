"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface XPToastProps {
  xp: number;
  show: boolean;
  onDone?: () => void;
}

export function XPToast({ xp, show, onDone }: XPToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show && xp > 0) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        onDone?.();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, xp, onDone]);

  if (!visible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-8 right-8 z-50 rounded-2xl border-[1.5px] border-ocean-turquoise/40",
        "bg-[var(--midnight)]/90 backdrop-blur-md px-6 py-4",
        "flex items-center gap-3 shadow-xl",
        "animate-in slide-in-from-bottom-5 fade-in duration-500",
      )}
    >
      <span className="text-3xl">🌊</span>
      <div>
        <p className="text-lg font-semibold text-ocean-turquoise">+{xp} XP</p>
        <p className="text-xs text-muted-foreground font-light">Keep going!</p>
      </div>
    </div>
  );
}
