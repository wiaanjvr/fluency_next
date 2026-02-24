"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserGoal } from "@/types/goals";

/* =============================================================================
   GoalProgressToast — Lightweight toast notification for goal completions

   Shows: icon + "Goal complete: [title]" + reward hint
   Auto-dismisses after 4 seconds
   Stacks if multiple goals complete simultaneously
============================================================================= */

interface ToastItem {
  id: string;
  goal: UserGoal;
  icon: string;
  title: string;
}

interface GoalProgressToastProps {
  completedGoals: UserGoal[];
  onClear: () => void;
}

export function GoalProgressToast({
  completedGoals,
  onClear,
}: GoalProgressToastProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Add new toasts when completedGoals changes
  useEffect(() => {
    if (completedGoals.length === 0) return;

    const newToasts: ToastItem[] = completedGoals.map((goal) => ({
      id: goal.id + "-" + Date.now(),
      goal,
      icon: goal.template?.icon ?? "🎯",
      title: goal.template?.title ?? "Goal complete!",
    }));

    setToasts((prev) => [...prev, ...newToasts]);

    // Auto-dismiss after 4 seconds
    const timer = setTimeout(() => {
      setToasts((prev) =>
        prev.filter((t) => !newToasts.some((nt) => nt.id === t.id)),
      );
      onClear();
    }, 4000);

    return () => clearTimeout(timer);
  }, [completedGoals, onClear]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className={cn(
              "pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl",
              "bg-gray-900/95 backdrop-blur-md border border-emerald-500/30",
              "shadow-[0_4px_24px_rgba(16,185,129,0.15)]",
              "min-w-[280px] max-w-[380px]",
            )}
          >
            {/* Icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-base">{toast.icon}</span>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Goal complete
                </span>
              </div>
              <p className="text-sm text-white/80 truncate mt-0.5">
                {toast.title}
              </p>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => dismissToast(toast.id)}
              className="flex-shrink-0 text-white/30 hover:text-white/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Progress bar countdown */}
            <motion.div
              className="absolute bottom-0 left-0 h-0.5 bg-emerald-500/40 rounded-b-xl"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 4, ease: "linear" }}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
