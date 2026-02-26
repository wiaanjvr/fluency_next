"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, X, Clock, ChevronRight, Play } from "lucide-react";
import {
  BookOpen,
  PenLine,
  Layers,
  GitBranch,
  Mic,
  MessageCircle,
  Swords,
  Music,
} from "lucide-react";
import { activityRegistry } from "@/lib/activities/activityRegistry";
import type { ActivityCategory } from "@/lib/activities/activityRegistry";
import type { ActivityInsight } from "@/lib/actions/getActivityInsights";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  BookOpen,
  PenLine,
  Layers,
  GitBranch,
  Mic,
  Compass,
  MessageCircle,
  Swords,
  Music,
};

const ACCENT_MAP: Record<string, string> = {
  teal: "#3dd6b5",
  amber: "#fbbf24",
  blue: "#8ab4f8",
  cyan: "#22d3ee",
  violet: "#a78bfa",
  purple: "#c084fc",
  pink: "#f9a8d4",
  rose: "#fb7185",
  orange: "#fb923c",
};

// Estimated session times per activity (in minutes)
const ESTIMATED_MINUTES: Record<string, number> = {
  "free-reading": 15,
  songs: 10,
  cloze: 8,
  flashcards: 10,
  conjugation: 8,
  grammar: 12,
  pronunciation: 10,
  conversation: 15,
  duel: 5,
};

// Categories that map to session types
const SESSION_CATEGORIES: Record<string, ActivityCategory[]> = {
  immersion: ["Immersion"],
  study: ["Study"],
  production: ["Produce"],
};

interface SuggestedActivity {
  activityId: string;
  title: string;
  icon: string;
  color: string;
  href: string;
  estimatedMinutes: number;
  reason: string;
}

interface WhatNextFABProps {
  insights: ActivityInsight[] | null;
}

/**
 * Pick the most neglected activity within a set of categories.
 * "Most neglected" = highest daysSinceLastSession,
 * or never tried (null = treated as Infinity).
 */
function pickMostNeglected(
  categories: ActivityCategory[],
  insights: ActivityInsight[],
): SuggestedActivity | null {
  const eligible = activityRegistry.filter(
    (a) => categories.includes(a.category) && a.id !== "duel",
  );

  if (eligible.length === 0) return null;

  let best = eligible[0];
  let bestDays = -1;

  for (const activity of eligible) {
    const insight = insights.find((i) => i.activityId === activity.id);
    const days =
      insight?.daysSinceLastSession === null
        ? 999 // never tried = max priority
        : (insight?.daysSinceLastSession ?? 999);

    if (days > bestDays) {
      bestDays = days;
      best = activity;
    }
  }

  const insight = insights.find((i) => i.activityId === best.id);
  const reason =
    insight?.daysSinceLastSession === null
      ? "Never explored"
      : insight?.daysSinceLastSession !== undefined &&
          insight.daysSinceLastSession >= 7
        ? `${insight.daysSinceLastSession} days since last dive`
        : "Keep the momentum";

  return {
    activityId: best.id,
    title: best.title,
    icon: best.icon,
    color: best.color,
    href: best.href,
    estimatedMinutes: ESTIMATED_MINUTES[best.id] ?? 10,
    reason,
  };
}

// =============================================================================
// SuggestedSessionModal
// =============================================================================

function SuggestedSessionModal({
  onClose,
  insights,
}: {
  onClose: () => void;
  insights: ActivityInsight[];
}) {
  const router = useRouter();

  const suggestedPlan = useMemo(() => {
    const plan: SuggestedActivity[] = [];

    // 1 immersion + 1 study + 1 production
    const immersion = pickMostNeglected(SESSION_CATEGORIES.immersion, insights);
    const study = pickMostNeglected(SESSION_CATEGORIES.study, insights);
    const production = pickMostNeglected(
      SESSION_CATEGORIES.production,
      insights,
    );

    if (immersion) plan.push(immersion);
    if (study) plan.push(study);
    if (production) plan.push(production);

    return plan;
  }, [insights]);

  const totalMinutes = suggestedPlan.reduce(
    (sum, a) => sum + a.estimatedMinutes,
    0,
  );

  return (
    <motion.div
      className="fixed inset-0 z-[45] flex items-end justify-end p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <motion.div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-white/[0.08]
                    mb-20 sm:mb-24"
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          transformOrigin: "bottom right",
          background:
            "linear-gradient(180deg, rgba(14,35,64,0.97) 0%, rgba(9,21,39,0.99) 100%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4" style={{ color: "#3dd6b5" }} />
            <h3
              className="font-display text-base font-semibold"
              style={{ color: "var(--sand)" }}
            >
              Today&apos;s dive plan
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08]
                        transition-colors duration-200"
          >
            <X className="w-3.5 h-3.5" style={{ color: "var(--seafoam)" }} />
          </button>
        </div>

        {/* Activity list */}
        <div className="px-4 pb-2 space-y-2">
          {suggestedPlan.map((activity, idx) => {
            const Icon = ICON_MAP[activity.icon] ?? BookOpen;
            const accent = ACCENT_MAP[activity.color] ?? "#3dd6b5";

            return (
              <motion.button
                key={activity.activityId}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + idx * 0.08 }}
                onClick={() => {
                  onClose();
                  router.push(activity.href);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-xl
                            bg-white/[0.03] hover:bg-white/[0.06]
                            border border-white/[0.04] hover:border-white/[0.08]
                            transition-all duration-200 text-left group/item"
              >
                {/* Step number */}
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center
                              font-body text-[10px] font-bold flex-shrink-0"
                  style={{
                    background: `${accent}18`,
                    color: accent,
                  }}
                >
                  {idx + 1}
                </span>

                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${accent}12` }}
                >
                  <Icon className="w-4 h-4" style={{ color: accent }} />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-body text-sm font-medium truncate"
                    style={{ color: "var(--sand)" }}
                  >
                    {activity.title}
                  </p>
                  <p
                    className="font-body text-[10px] truncate"
                    style={{ color: "var(--seafoam)", opacity: 0.45 }}
                  >
                    {activity.reason}
                  </p>
                </div>

                {/* Duration + chevron */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Clock
                    className="w-3 h-3"
                    style={{ color: "var(--seafoam)", opacity: 0.3 }}
                  />
                  <span
                    className="font-body text-[10px]"
                    style={{ color: "var(--seafoam)", opacity: 0.4 }}
                  >
                    {activity.estimatedMinutes}m
                  </span>
                  <ChevronRight
                    className="w-3 h-3 opacity-0 group-hover/item:opacity-60 transition-opacity"
                    style={{ color: "var(--seafoam)" }}
                  />
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Clock
              className="w-3.5 h-3.5"
              style={{ color: "var(--seafoam)", opacity: 0.35 }}
            />
            <span
              className="font-body text-xs"
              style={{ color: "var(--seafoam)", opacity: 0.5 }}
            >
              ~{totalMinutes} min total
            </span>
          </div>

          {suggestedPlan.length > 0 && (
            <button
              onClick={() => {
                onClose();
                router.push(suggestedPlan[0].href);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-body text-xs font-semibold
                          transition-all duration-200
                          hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background:
                  "linear-gradient(135deg, rgba(61,214,181,0.2) 0%, rgba(34,211,238,0.15) 100%)",
                color: "#3dd6b5",
                border: "1px solid rgba(61,214,181,0.2)",
              }}
            >
              <Play className="w-3 h-3" />
              Start session
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// =============================================================================
// WhatNextFAB — floating action button
// =============================================================================

export function WhatNextFAB({ insights }: WhatNextFABProps) {
  const [open, setOpen] = useState(false);

  if (!insights || insights.length === 0) return null;

  return (
    <>
      {/* FAB button — fixed bottom-right, above Immerse mini-player (z-50 at 72px) */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-6 z-[44] flex items-center gap-2
                    px-4 py-3 rounded-2xl
                    border border-white/[0.08]
                    transition-all duration-300
                    hover:border-white/[0.15] hover:scale-[1.03]
                    active:scale-[0.97]
                    shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
        style={{
          background:
            "linear-gradient(135deg, rgba(14,35,64,0.95) 0%, rgba(20,55,85,0.92) 100%)",
        }}
      >
        <Compass className="w-4 h-4" style={{ color: "#3dd6b5" }} />
        <span
          className="font-body text-xs font-semibold"
          style={{ color: "var(--sand)" }}
        >
          What next?
        </span>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <SuggestedSessionModal
            onClose={() => setOpen(false)}
            insights={insights}
          />
        )}
      </AnimatePresence>
    </>
  );
}
