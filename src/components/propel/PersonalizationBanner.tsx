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

// ============================================================================
// PersonalizationBanner — Underwater atmospheric recommendation card
// Uses propel-theme.css design tokens. Zero hardcoded colors.
// ============================================================================

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
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="propel-banner mb-8"
      >
        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-3.5 right-3.5 z-10 p-1.5 rounded-full
                      transition-colors duration-200 hover:bg-white/[0.06]"
          style={{ background: "rgba(255,255,255,0.03)" }}
          aria-label="Dismiss recommendation"
        >
          <X
            className="w-3.5 h-3.5"
            style={{ color: "var(--color-text-secondary)" }}
          />
        </button>

        <div className="relative z-[1] p-6 flex items-center gap-5">
          {allActivitiesRecent ? (
            /* ── Congratulatory state ── */
            <div className="flex items-center gap-4 w-full">
              <div className="propel-icon-container">
                <Anchor />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  All systems active. Keep the depth.
                </p>
                <p className="propel-card-description text-xs mt-1">
                  Every activity explored recently — impressive.
                </p>
              </div>
            </div>
          ) : (
            /* ── Recommendation state ── */
            <>
              <div className="propel-icon-container">
                <Icon />
              </div>

              <div className="flex-1 min-w-0">
                <span className="propel-eyebrow">Recommended</span>
                <p
                  className="text-sm font-medium mt-1"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  {recommendedActivity?.title ?? "Activity"}
                </p>
                <p className="propel-card-description text-xs mt-0.5">
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
                className="propel-btn-primary flex-shrink-0"
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
    <div className="propel-banner mb-8 animate-pulse" style={{ opacity: 0.5 }}>
      <div className="p-6 flex items-center gap-5">
        <div
          className="w-10 h-10 rounded-full"
          style={{ background: "rgba(255,255,255,0.03)" }}
        />
        <div className="flex-1 space-y-2">
          <div
            className="h-3 w-20 rounded"
            style={{ background: "rgba(255,255,255,0.04)" }}
          />
          <div
            className="h-4 w-40 rounded"
            style={{ background: "rgba(255,255,255,0.04)" }}
          />
          <div
            className="h-3 w-56 rounded"
            style={{ background: "rgba(255,255,255,0.03)" }}
          />
        </div>
        <div
          className="h-10 w-20 rounded-full"
          style={{ background: "rgba(255,255,255,0.03)" }}
        />
      </div>
    </div>
  );
}
