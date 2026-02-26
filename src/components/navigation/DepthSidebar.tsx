"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEPTH_LEVELS,
  getDepthLevel,
  getProgressToNextLevel,
  type DepthLevel,
} from "@/lib/progression/depthLevels";

// ============================================================================
// DepthSidebar — Redesigned as a diving instrument depth gauge
// Vertical pressure tube with filled gradient, zone rows, and depth needle.
// ============================================================================

interface DepthSidebarProps {
  wordCount: number;
  totalMinutes?: number;
  className?: string;
}

// ─── Tooltip for locked levels ──────────────────────────────────────────────

function LockedTooltip({ level }: { level: DepthLevel }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={{ duration: 0.15 }}
      className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 whitespace-nowrap"
    >
      <div
        className="px-3 py-2 rounded-lg text-xs"
        style={{
          background: "var(--bg-elevated, #0A2A38)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
          color: "var(--text-secondary, #7BA8A0)",
        }}
      >
        Reach{" "}
        <span
          className="font-semibold"
          style={{ color: level.colorPrimaryHex }}
        >
          {level.unlocksAt.toLocaleString()}
        </span>{" "}
        words to unlock
      </div>
    </motion.div>
  );
}

// ─── Single zone row ────────────────────────────────────────────────────────

function ZoneRow({
  level,
  isActive,
  isUnlocked,
  isPast,
}: {
  level: DepthLevel;
  isActive: boolean;
  isUnlocked: boolean;
  isPast: boolean;
}) {
  const [showTooltip, setShowTooltip] = useState(false);
  const isLocked = !isUnlocked;

  const handleClick = () => {
    if (isLocked) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
      return;
    }
    // TODO: Navigate to level course content
    // router.push(`/course/${level.slug}`);
  };

  const rangeLabel =
    level.wordRange[1] === Infinity
      ? `${level.wordRange[0].toLocaleString()}+`
      : `${level.wordRange[0].toLocaleString()} – ${level.wordRange[1].toLocaleString()}`;

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        className={cn(
          "relative w-full text-left transition-all duration-300",
          "rounded-r-lg",
          isLocked ? "cursor-default" : "cursor-pointer hover:bg-white/[0.03]",
        )}
        style={{
          padding: "14px 12px 14px 44px",
          opacity: isLocked ? 0.4 : isPast ? 0.7 : 1,
          background: isActive
            ? `linear-gradient(90deg, ${level.colorPrimaryHex}08 0%, transparent 100%)`
            : "transparent",
        }}
        aria-label={
          isLocked
            ? `${level.name} — locked. Requires ${level.unlocksAt} words.`
            : isActive
              ? `${level.name} — current depth level`
              : `${level.name} — unlocked`
        }
        aria-current={isActive ? "true" : undefined}
      >
        {/* YOU ARE HERE marker */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.2 }}
            className="absolute right-3 top-3"
          >
            <span
              className="text-[8px] font-bold uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-full"
              style={{
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                color: level.colorPrimaryHex,
                background: `${level.colorPrimaryHex}12`,
                border: `1px solid ${level.colorPrimaryHex}25`,
              }}
            >
              YOU ARE HERE
            </span>
          </motion.div>
        )}

        {/* Zone name — editorial serif for active, mono for rest */}
        <div
          className="mb-0.5"
          style={{
            fontFamily: isActive
              ? "var(--font-editorial, 'Cormorant Garamond', serif)"
              : "var(--font-mono, 'JetBrains Mono', monospace)",
            fontSize: isActive ? 14 : 11,
            fontWeight: isActive ? 500 : 600,
            fontStyle: isActive ? "italic" : "normal",
            letterSpacing: isActive ? "0.02em" : "0.1em",
            textTransform: isActive
              ? ("capitalize" as const)
              : ("uppercase" as const),
            color: isActive
              ? level.colorPrimaryHex
              : isLocked
                ? "var(--text-ghost, #1E4040)"
                : "var(--text-secondary, #6B9E96)",
            filter: isLocked ? "saturate(0.3)" : "none",
            transition: "all 0.3s ease",
          }}
        >
          {isActive ? level.name : level.name.toUpperCase()}
          {isLocked && (
            <Lock
              className="inline-block ml-1.5 w-3 h-3"
              style={{ color: "var(--text-ghost, #1E4040)" }}
            />
          )}
        </div>

        {/* Word range */}
        <div
          className="text-[10px] tabular-nums"
          style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            color: isActive
              ? "var(--text-secondary, #7BA8A0)"
              : "var(--text-ghost, #2D5A52)",
            opacity: isLocked ? 0.6 : 0.8,
          }}
        >
          {rangeLabel} words
        </div>

        {/* Description for active level */}
        {isActive && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mt-1.5"
          >
            <p
              className="text-[10px] italic leading-relaxed"
              style={{
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                color: "var(--text-secondary, #6B9E96)",
                opacity: 0.7,
              }}
            >
              {level.description.split(".")[0]}.
            </p>
          </motion.div>
        )}
      </button>

      {/* Locked tooltip */}
      <AnimatePresence>
        {showTooltip && isLocked && <LockedTooltip level={level} />}
      </AnimatePresence>
    </div>
  );
}

// ─── Mobile Bottom Sheet ────────────────────────────────────────────────────

function MobileDepthSheet({
  isOpen,
  onClose,
  wordCount,
  currentLevel,
}: {
  isOpen: boolean;
  onClose: () => void;
  wordCount: number;
  currentLevel: DepthLevel;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl overflow-hidden"
            style={{
              background:
                "linear-gradient(to bottom, #031A22 0%, #020F16 100%)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              maxHeight: "80vh",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 rounded-full bg-white/10" />
            </div>

            {/* Content */}
            <div
              className="px-5 pb-8 overflow-y-auto"
              style={{ maxHeight: "calc(80vh - 40px)" }}
            >
              <h3
                className="text-sm font-semibold mb-4"
                style={{
                  fontFamily: "var(--font-display, 'Playfair Display', serif)",
                  color: "var(--text-primary, #F0FDFA)",
                }}
              >
                Depth Gauge
              </h3>

              <DepthGaugeContent wordCount={wordCount} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Shared gauge content (used by both desktop sidebar and mobile sheet) ───

function DepthGaugeContent({ wordCount }: { wordCount: number }) {
  const currentLevel = getDepthLevel(wordCount);
  const progress = getProgressToNextLevel(wordCount);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Calculate fill percentage for pressure tube
  // Fill goes from top (Shallows = 0) down to current level
  const currentIndex = DEPTH_LEVELS.findIndex((l) => l.id === currentLevel.id);
  const totalZones = DEPTH_LEVELS.length;
  // Fill covers all completed zones + partial current zone progress
  const basePercentage = (currentIndex / totalZones) * 100;
  const zonePartial = (progress.percentage / 100) * (100 / totalZones);
  const fillPercentage = Math.min(basePercentage + zonePartial, 100);

  return (
    <div className="relative flex flex-col">
      {/* Pressure tube — vertical line running through all zones */}
      <div
        className="absolute"
        style={{
          left: 15,
          top: 8,
          bottom: 8,
          width: 3,
          borderRadius: 2,
          background: "rgba(255,255,255,0.03)",
          overflow: "hidden",
        }}
      >
        {/* Filled portion with gradient */}
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: mounted ? `${fillPercentage}%` : 0 }}
          transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
          style={{
            width: "100%",
            borderRadius: 2,
            background: `linear-gradient(to bottom, 
              ${DEPTH_LEVELS[0].colorPrimaryHex} 0%, 
              ${DEPTH_LEVELS[1].colorPrimaryHex} 25%,
              ${DEPTH_LEVELS[2].colorPrimaryHex} 50%,
              ${DEPTH_LEVELS[3].colorPrimaryHex} 75%,
              ${DEPTH_LEVELS[4].colorPrimaryHex} 100%
            )`,
          }}
        />
      </div>

      {/* Depth needle at current position */}
      <motion.div
        className="absolute"
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: mounted ? 1 : 0,
          scale: mounted ? 1 : 0,
        }}
        transition={{ duration: 0.4, delay: 1.0 }}
        style={{
          left: 9,
          top: `calc(${((currentIndex + 0.5) / totalZones) * 100}% - 7px)`,
          zIndex: 10,
        }}
      >
        <div
          className="w-[14px] h-[14px] rounded-full"
          style={{
            background: currentLevel.colorPrimaryHex,
            boxShadow: `0 0 12px ${currentLevel.colorPrimaryHex}80, 0 0 24px ${currentLevel.colorPrimaryHex}30`,
            border: "2px solid rgba(255,255,255,0.15)",
          }}
        />
      </motion.div>

      {/* Zone rows */}
      {DEPTH_LEVELS.map((level) => {
        const isActive = level.id === currentLevel.id;
        const isUnlocked = wordCount >= level.unlocksAt;
        const isPast = level.id < currentLevel.id;

        return (
          <ZoneRow
            key={level.id}
            level={level}
            isActive={isActive}
            isUnlocked={isUnlocked}
            isPast={isPast}
          />
        );
      })}

      {/* Stats at bottom */}
      <div
        className="mt-4 pt-4"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.04)",
          paddingLeft: 44,
        }}
      >
        <div className="mb-3">
          <div
            className="text-sm font-semibold tabular-nums"
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              color: currentLevel.colorPrimaryHex,
            }}
          >
            {wordCount.toLocaleString()}{" "}
            <span
              className="text-[9px] tracking-[0.15em] uppercase font-normal"
              style={{ color: "var(--text-ghost, #2D5A52)" }}
            >
              Words
            </span>
          </div>
        </div>

        {/* Progress to next */}
        {progress.next && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-[9px] tracking-[0.12em] uppercase"
                style={{
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  color: "var(--text-ghost, #2D5A52)",
                }}
              >
                Next depth
              </span>
              <span
                className="text-[9px] tabular-nums"
                style={{
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  color: "var(--text-secondary, #6B9E96)",
                }}
              >
                {progress.wordsRemaining.toLocaleString()} to go
              </span>
            </div>
            <div
              className="w-full h-1 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)" }}
            >
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: mounted ? `${progress.percentage}%` : 0 }}
                transition={{
                  duration: 1,
                  delay: 0.5,
                  ease: [0.23, 1, 0.32, 1],
                }}
                style={{
                  background: `linear-gradient(90deg, ${currentLevel.colorPrimaryHex}, ${currentLevel.colorSecondaryHex})`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Sidebar Component ─────────────────────────────────────────────────

export function DepthSidebar({
  wordCount,
  totalMinutes = 0,
  className,
}: DepthSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentLevel = getDepthLevel(wordCount);

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex fixed top-[64px] left-0 z-40 flex-col",
          "overflow-y-auto overflow-x-hidden dashboard-scroll",
          className,
        )}
        style={{
          width: 240,
          height: "calc(100vh - 64px)",
          padding: "20px 12px 20px 16px",
          background:
            "linear-gradient(to bottom, #031A22 0%, #020F16 40%, #010C12 100%)",
          borderRight: "1px solid rgba(255, 255, 255, 0.04)",
        }}
        aria-label="Depth gauge navigation"
        role="navigation"
      >
        {/* Title — editorial serif */}
        <div
          className="px-3 mb-4"
          style={{
            fontFamily: "var(--font-editorial, 'Cormorant Garamond', serif)",
            fontSize: 14,
            fontStyle: "italic",
            fontWeight: 500,
            letterSpacing: "0.04em",
            color: "var(--text-secondary, #6B9E96)",
          }}
        >
          Depth Gauge
        </div>

        <DepthGaugeContent wordCount={wordCount} />
      </aside>

      {/* Mobile floating depth button */}
      <button
        className="fixed bottom-6 left-6 z-50 lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-full"
        style={{
          background: `linear-gradient(135deg, ${currentLevel.colorPrimaryHex}20, ${currentLevel.colorPrimaryHex}08)`,
          border: `1px solid ${currentLevel.colorPrimaryHex}30`,
          boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 12px ${currentLevel.colorPrimaryHex}15`,
          backdropFilter: "blur(16px)",
        }}
        onClick={() => setMobileOpen(true)}
        aria-label={`Open depth gauge. Current depth: ${currentLevel.name}`}
      >
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{
            background: currentLevel.colorPrimaryHex,
            boxShadow: `0 0 6px ${currentLevel.colorPrimaryHex}80`,
          }}
        />
        <span
          className="text-xs font-medium"
          style={{
            fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
            color: currentLevel.colorPrimaryHex,
          }}
        >
          {currentLevel.name}
        </span>
        <ChevronDown
          className="w-3 h-3"
          style={{ color: currentLevel.colorPrimaryHex }}
        />
      </button>

      {/* Mobile bottom sheet */}
      <MobileDepthSheet
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        wordCount={wordCount}
        currentLevel={currentLevel}
      />
    </>
  );
}

export default DepthSidebar;
