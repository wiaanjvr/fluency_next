"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Anchor } from "lucide-react";
import {
  BookOpen,
  PenLine,
  Layers,
  GitBranch,
  Mic,
  Compass,
  MessageCircle,
  Swords,
  Music,
} from "lucide-react";
import { activityRegistry } from "@/lib/activities/activityRegistry";
import type { PropelPersonalization } from "@/lib/actions/getActivityInsights";
import type { LucideIcon } from "lucide-react";

// Mirror the ICON_MAP from ActivityCard
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

interface PersonalizationBannerProps {
  personalization: PropelPersonalization | null;
}

export function PersonalizationBanner({
  personalization,
}: PersonalizationBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !personalization) return null;

  // Check if all activities were done within 3 days
  const allActivitiesRecent =
    personalization.neglectedActivityIds.length === 0 &&
    personalization.neverTriedActivityIds.length === 0;

  const recommendedActivity = activityRegistry.find(
    (a) => a.id === personalization.recommendedActivityId,
  );

  const Icon = recommendedActivity
    ? (ICON_MAP[recommendedActivity.icon] ?? Sparkles)
    : Sparkles;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] mb-6"
        style={{
          background:
            "linear-gradient(135deg, rgba(13,45,78,0.92) 0%, rgba(9,21,39,0.95) 50%, rgba(20,60,90,0.88) 100%)",
        }}
      >
        {/* Animated gradient shimmer */}
        <motion.div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(61,214,181,0.08) 30%, rgba(34,211,238,0.06) 60%, transparent 100%)",
          }}
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Dismiss button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3 right-3 z-10 p-1.5 rounded-full
                      bg-white/[0.04] hover:bg-white/[0.08]
                      transition-colors duration-200"
          aria-label="Dismiss recommendation"
        >
          <X className="w-3.5 h-3.5" style={{ color: "var(--seafoam)" }} />
        </button>

        <div className="relative z-[1] p-5 flex items-center gap-4">
          {allActivitiesRecent ? (
            /* ── Congratulatory state ── */
            <div className="flex items-center gap-4 w-full">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(61,214,181,0.15)" }}
              >
                <Anchor className="w-5 h-5" style={{ color: "#3dd6b5" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="font-display text-sm font-semibold"
                  style={{ color: "var(--sand)" }}
                >
                  All systems active. Keep the depth.
                </p>
                <p
                  className="font-body text-xs mt-0.5"
                  style={{ color: "var(--seafoam)", opacity: 0.5 }}
                >
                  Every activity explored recently — impressive.
                </p>
              </div>
            </div>
          ) : (
            /* ── Recommendation state ── */
            <>
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(61,214,181,0.15)" }}
              >
                <Icon className="w-5 h-5" style={{ color: "#3dd6b5" }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span
                    className="font-body text-[10px] font-semibold tracking-wider uppercase"
                    style={{ color: "#3dd6b5" }}
                  >
                    Recommended
                  </span>
                </div>
                <p
                  className="font-display text-sm font-semibold"
                  style={{ color: "var(--sand)" }}
                >
                  {recommendedActivity?.title ?? "Activity"}
                </p>
                <p
                  className="font-body text-xs mt-0.5 italic"
                  style={{ color: "var(--seafoam)", opacity: 0.6 }}
                >
                  {personalization.recommendationReason}
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (recommendedActivity) {
                    router.push(recommendedActivity.href);
                  }
                }}
                className="flex-shrink-0 px-4 py-2 rounded-xl font-body text-xs font-semibold
                            transition-all duration-200
                            hover:scale-[1.03] active:scale-[0.98]"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(61,214,181,0.2) 0%, rgba(34,211,238,0.15) 100%)",
                  color: "#3dd6b5",
                  border: "1px solid rgba(61,214,181,0.2)",
                }}
              >
                Dive in
              </button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// =============================================================================
// Skeleton placeholder for Suspense boundary
// =============================================================================

export function PersonalizationBannerSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-white/[0.05] mb-6 animate-pulse"
      style={{ background: "rgba(14,35,64,0.6)" }}
    >
      <div className="p-5 flex items-center gap-4">
        <div className="w-11 h-11 rounded-xl bg-white/[0.04]" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-20 rounded bg-white/[0.06]" />
          <div className="h-4 w-40 rounded bg-white/[0.06]" />
          <div className="h-3 w-56 rounded bg-white/[0.04]" />
        </div>
        <div className="h-9 w-20 rounded-xl bg-white/[0.04]" />
      </div>
    </div>
  );
}
