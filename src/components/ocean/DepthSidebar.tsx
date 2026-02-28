"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEPTH_LEVELS,
  getDepthLevel,
  getProgressToNextLevel,
} from "@/lib/progression/depthLevels";

// ============================================================================
// DepthSidebar — Landing-page-grade depth gauge
// Matches the Fluensea landing page's minimal, frosted, ocean-depth aesthetic.
// ============================================================================

interface DepthSidebarProps {
  wordCount: number;
  totalMinutes?: number;
  shadowingSessions?: number;
  className?: string;
  scrollable?: boolean;
}

/* ── Landing page design tokens ─────────────────────────────────────────── */
const LP = {
  bg: "#020F14",
  surface: "#041824",
  accent: "#0F9B8E",
  glow: "#2DD4BF",
  text: "#F0FDFA",
  textSecondary: "#94A3B8",
  border: "rgba(13,148,136,0.10)",
  borderFaint: "rgba(13,148,136,0.06)",
} as const;

/* ── Shared gauge content (desktop + mobile) ────────────────────────────── */

function DepthGaugeContent({ wordCount }: { wordCount: number }) {
  const currentLevel = getDepthLevel(wordCount);
  const progress = getProgressToNextLevel(wordCount);

  return (
    <div className="flex flex-col h-full select-none">
      {/* Section label – lp-section-label style */}
      <div className="pt-6 pb-1 px-1">
        <span
          className="text-[0.625rem] font-medium tracking-[0.25em] uppercase"
          style={{ color: LP.accent, opacity: 0.7 }}
        >
          Depth Gauge
        </span>
      </div>

      {/* Hero stat */}
      <div className="px-1 pt-3 pb-5">
        <p
          className="text-[2rem] font-semibold leading-none"
          style={{ color: LP.glow, letterSpacing: "-0.02em" }}
        >
          {wordCount.toLocaleString()}
        </p>
        <p
          className="text-xs mt-1.5"
          style={{ color: LP.textSecondary, opacity: 0.6 }}
        >
          words encountered
        </p>

        {/* Progress toward next depth */}
        {progress.next && (
          <div className="mt-5">
            <div className="flex items-baseline justify-between mb-2">
              <span
                className="text-[0.625rem] font-medium"
                style={{ color: LP.textSecondary, opacity: 0.5 }}
              >
                {progress.wordsRemaining.toLocaleString()} to{" "}
                {progress.next.name}
              </span>
              <span
                className="text-[0.625rem] tabular-nums"
                style={{ color: LP.accent, opacity: 0.6 }}
              >
                {progress.percentage}%
              </span>
            </div>
            <div
              className="h-[2px] rounded-full overflow-hidden"
              style={{ background: "rgba(13,148,136,0.12)" }}
            >
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                transition={{
                  duration: 1,
                  ease: [0.16, 1, 0.3, 1],
                  delay: 0.3,
                }}
                style={{
                  background: `linear-gradient(90deg, ${LP.accent}, ${LP.glow})`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="mx-1 h-px" style={{ background: LP.border }} />

      {/* Depth zones */}
      <div className="flex-1 pt-4 pb-2">
        <p
          className="px-1 mb-3 text-[0.625rem] font-medium tracking-[0.25em] uppercase"
          style={{ color: LP.textSecondary, opacity: 0.35 }}
        >
          Depth Zones
        </p>

        <div className="flex flex-col gap-[2px]">
          {DEPTH_LEVELS.map((level) => {
            const isActive = level.id === currentLevel.id;
            const isPast = level.id < currentLevel.id;
            const isFuture = level.id > currentLevel.id;

            const rangeLabel =
              level.wordRange[1] === Infinity
                ? `${level.wordRange[0].toLocaleString()}+`
                : `${level.wordRange[0].toLocaleString()}–${level.wordRange[1].toLocaleString()}`;

            return (
              <div
                key={level.id}
                className="relative flex items-center justify-between rounded-lg transition-all duration-300"
                style={{
                  padding: "9px 10px 9px 14px",
                  background: isActive
                    ? "rgba(13,148,136,0.07)"
                    : "transparent",
                  borderLeft: isActive
                    ? `2px solid ${LP.glow}`
                    : "2px solid transparent",
                  opacity: isFuture ? 0.3 : 1,
                }}
              >
                <span
                  className="text-[0.6875rem] leading-tight"
                  style={{
                    fontWeight: isActive ? 500 : 400,
                    color: isActive
                      ? LP.text
                      : isPast
                        ? LP.textSecondary
                        : "rgba(148,163,184,0.5)",
                    letterSpacing: "0.01em",
                  }}
                >
                  {level.name}
                </span>
                <span
                  className="text-[0.6rem] tabular-nums"
                  style={{
                    color: isActive
                      ? "rgba(148,163,184,0.6)"
                      : "rgba(148,163,184,0.3)",
                  }}
                >
                  {rangeLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: current zone label */}
      <div
        className="mt-auto px-1 py-3 text-center"
        style={{ borderTop: `1px solid ${LP.borderFaint}` }}
      >
        <p
          className="text-[0.6rem] font-medium tracking-[0.15em] uppercase"
          style={{ color: LP.textSecondary, opacity: 0.35 }}
        >
          {currentLevel.name}
        </p>
      </div>
    </div>
  );
}

/* ── Mobile bottom sheet ────────────────────────────────────────────────── */

function MobileDepthSheet({
  isOpen,
  onClose,
  wordCount,
}: {
  isOpen: boolean;
  onClose: () => void;
  wordCount: number;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl overflow-hidden"
            style={{
              background: LP.bg,
              borderTop: `1px solid ${LP.border}`,
              maxHeight: "75vh",
            }}
          >
            <div className="flex justify-center py-3">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: "rgba(148,163,184,0.15)" }}
              />
            </div>
            <div
              className="px-5 pb-8 overflow-y-auto"
              style={{ maxHeight: "calc(75vh - 40px)" }}
            >
              <DepthGaugeContent wordCount={wordCount} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Main export ────────────────────────────────────────────────────────── */

export function DepthSidebar({
  wordCount,
  totalMinutes = 0,
  shadowingSessions = 0,
  className,
  scrollable = true,
}: DepthSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentLevel = getDepthLevel(wordCount);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex fixed top-[64px] left-0 z-40 flex-col",
          scrollable ? "overflow-y-auto" : "overflow-hidden",
          className,
        )}
        style={{
          width: 240,
          height: "calc(100vh - 64px)",
          padding: "0 12px 12px",
          background: `linear-gradient(180deg, ${LP.bg} 0%, ${LP.surface} 100%)`,
          borderRight: `1px solid ${LP.border}`,
        }}
        aria-label="Depth gauge"
      >
        <DepthGaugeContent wordCount={wordCount} />
      </aside>

      {/* Mobile floating trigger */}
      <button
        className={cn(
          "fixed bottom-6 left-6 z-50 lg:hidden",
          "flex items-center gap-2 px-4 py-2.5 rounded-full",
          "transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
        )}
        style={{
          background: "rgba(2,15,20,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1px solid ${LP.border}`,
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}
        onClick={() => setMobileOpen(true)}
        aria-label={`Depth gauge — ${currentLevel.name}`}
      >
        <div
          className="w-2 h-2 rounded-full"
          style={{
            background: LP.glow,
            boxShadow: `0 0 6px ${LP.glow}`,
          }}
        />
        <span
          className="text-[0.6875rem] font-medium tracking-[0.05em] uppercase"
          style={{ color: LP.glow }}
        >
          {currentLevel.name}
        </span>
        <ChevronUp
          className="w-3 h-3"
          style={{ color: LP.textSecondary, opacity: 0.5 }}
        />
      </button>

      {/* Mobile bottom sheet */}
      <MobileDepthSheet
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        wordCount={wordCount}
      />
    </>
  );
}

export default DepthSidebar;
