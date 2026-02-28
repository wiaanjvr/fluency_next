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
  teal: "var(--color-bioluminescent)",
  amber: "var(--color-bioluminescent)",
  blue: "var(--color-bioluminescent)",
  cyan: "var(--color-bioluminescent)",
  violet: "rgba(45,212,191,0.6)",
  purple: "rgba(45,212,191,0.6)",
  pink: "rgba(45,212,191,0.6)",
  rose: "rgba(45,212,191,0.6)",
  orange: "rgba(45,212,191,0.6)",
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
        className="relative w-full max-w-sm rounded-2xl overflow-hidden border
                    mb-20 sm:mb-24"
        initial={{ opacity: 0, scale: 0.85, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        style={{
          transformOrigin: "bottom right",
          background:
            "linear-gradient(160deg, var(--color-surface) 0%, var(--color-mid) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderColor: "var(--border-active)",
          boxShadow: "var(--glow-medium)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-2">
          <div className="flex items-center gap-2">
            <Compass
              className="w-4 h-4"
              style={{ color: "var(--color-bioluminescent)" }}
            />
            <h3
              className="text-base font-medium"
              style={{
                color: "var(--color-text-primary)",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
              }}
            >
              Today&apos;s dive plan
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08]
                        transition-colors duration-200"
          >
            <X
              className="w-3.5 h-3.5"
              style={{ color: "var(--color-text-secondary)" }}
            />
          </button>
        </div>

        {/* Activity list */}
        <div className="px-4 pb-2 space-y-2">
          {suggestedPlan.map((activity, idx) => {
            const Icon = ICON_MAP[activity.icon] ?? BookOpen;

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
                              text-[10px] font-bold flex-shrink-0"
                  style={{
                    background: "var(--color-bioluminescent-glow)",
                    color: "var(--color-bioluminescent)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  {idx + 1}
                </span>

                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: "var(--color-bioluminescent-glow)" }}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{ color: "var(--color-bioluminescent)" }}
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{
                      color: "var(--color-text-primary)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {activity.title}
                  </p>
                  <p
                    className="text-[10px] truncate"
                    style={{
                      color: "var(--color-text-secondary)",
                      opacity: 0.45,
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {activity.reason}
                  </p>
                </div>

                {/* Duration + chevron */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Clock
                    className="w-3 h-3"
                    style={{
                      color: "var(--color-text-secondary)",
                      opacity: 0.3,
                    }}
                  />
                  <span
                    className="text-[10px]"
                    style={{
                      color: "var(--color-text-secondary)",
                      opacity: 0.4,
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {activity.estimatedMinutes}m
                  </span>
                  <ChevronRight
                    className="w-3 h-3 opacity-0 group-hover/item:opacity-60 transition-opacity"
                    style={{ color: "var(--color-text-secondary)" }}
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
              style={{ color: "var(--color-text-secondary)", opacity: 0.35 }}
            />
            <span
              className="text-xs"
              style={{
                color: "var(--color-text-secondary)",
                opacity: 0.5,
                fontFamily: "var(--font-sans)",
              }}
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
              className="propel-btn-primary flex items-center gap-1.5 text-xs"
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
        className="propel-fab fixed bottom-24 right-6 z-[44]"
      >
        <Compass className="w-4 h-4" />
        <span>What next?</span>
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
