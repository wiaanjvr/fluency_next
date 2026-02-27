"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEPTH_LEVELS,
  getDepthLevel,
  getProgressToNextLevel,
} from "@/lib/progression/depthLevels";

// ============================================================================
// DepthSidebar — Submarine observation deck aesthetic
// Calm, dark, slightly luminous. Deep ocean, not spaceship.
// ============================================================================

interface DepthSidebarProps {
  wordCount: number;
  totalMinutes?: number;
  className?: string;
}

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bgFrom: "var(--ocean-depth-1, #070f1a)",
  bgTo: "var(--ocean-depth-1, #070f1a)",
  gaugeTop: "#00d4aa",
  gaugeBottom: "#0891b2",
  gaugeTrack: "rgba(74, 127, 165, 0.2)",
  accentTeal: "#00d4aa",
  accentTealDim: "rgba(0, 212, 170, 0.12)",
  activeRowBg: "rgba(0, 212, 170, 0.07)",
  activeRowBdr: "#00d4aa",
  textPrimary: "#e2e8f0",
  textMuted: "#4a6580",
  textSub: "#94a3b8",
  divider: "rgba(0, 212, 170, 0.18)",
  dividerFaint: "rgba(0, 212, 170, 0.08)",
  font: "'Inter', 'DM Sans', system-ui, sans-serif",
} as const;

// ── Keyframes ────────────────────────────────────────────────────────────────
const keyframes = `
@keyframes depthPulse {
  0%, 100% { box-shadow: 0 0 0 4px rgba(0, 212, 170, 0.15), 0 0 12px rgba(0, 212, 170, 0.3); }
  50%       { box-shadow: 0 0 0 4px rgba(0, 212, 170, 0.04), 0 0 6px rgba(0, 212, 170, 0.08); }
}
`;

// ── Depth Gauge Content (shared by desktop & mobile) ────────────────────────

function DepthGaugeContent({ wordCount }: { wordCount: number }) {
  const [hoveredZone, setHoveredZone] = useState<number | null>(null);
  const currentLevel = getDepthLevel(wordCount);
  const progress = getProgressToNextLevel(wordCount);
  const currentIndex = DEPTH_LEVELS.findIndex((l) => l.id === currentLevel.id);
  const totalZones = DEPTH_LEVELS.length;

  // Each zone occupies an equal fraction of the bar
  const zoneHeight = 100 / totalZones;
  // Marker: center of current zone + partial progress within it
  const progressFrac = progress.next
    ? (wordCount - currentLevel.wordRange[0]) /
      (progress.next.unlocksAt - currentLevel.wordRange[0])
    : 1;
  const markerPercent = currentIndex * zoneHeight + zoneHeight * progressFrac;

  const wordsToGo = progress.next ? progress.next.unlocksAt - wordCount : 0;

  return (
    <div className="flex flex-col h-full">
      {/* ── SECTION LABEL ── */}
      <div
        style={{
          borderTop: `1px solid ${T.divider}`,
          paddingTop: 12,
          paddingBottom: 14,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: T.font,
            fontSize: 9,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: T.textMuted,
          }}
        >
          DEPTH GAUGE
        </span>
      </div>

      {/* ── GAUGE COLUMN: track + gradient fill + labels + marker ── */}
      <div
        className="relative flex-1"
        style={{ minHeight: 0, paddingLeft: 16, paddingRight: 16 }}
      >
        {/* Track (barely visible background line) */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "3%",
            bottom: "3%",
            width: 2,
            transform: "translateX(-50%)",
            borderRadius: 2,
            background: T.gaugeTrack,
          }}
        />

        {/* Filled gradient: from top down to current marker */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "3%",
            height: `${markerPercent * 0.94}%`,
            width: 2,
            transform: "translateX(-50%)",
            borderRadius: 2,
            background: `linear-gradient(to bottom, ${T.gaugeTop}, ${T.gaugeBottom})`,
            transition: "height 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />

        {/* Dashed remaining: marker to bottom — "yet to be explored" */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: `${3 + markerPercent * 0.94}%`,
            bottom: "3%",
            width: 0,
            transform: "translateX(-50%)",
            borderLeft: "2px dashed var(--ocean-depth-4, #1a3347)",
          }}
        />

        {/* Depth labels — left of bar with tick marks */}
        {DEPTH_LEVELS.map((level, idx) => {
          const topPercent = idx * zoneHeight + zoneHeight * 0.5;
          const isActive = level.id === currentLevel.id;
          const isPast = idx < currentIndex;

          return (
            <div
              key={level.id}
              style={{
                position: "absolute",
                top: `${topPercent}%`,
                transform: "translateY(-50%)",
                left: 0,
                right: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Label + depth number — right-aligned, connects to tick */}
              <div
                style={{
                  position: "absolute",
                  right: "calc(50% + 22px)",
                  textAlign: "right",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontFamily: T.font,
                    fontSize: 9,
                    fontWeight: isActive ? 600 : 400,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                    color: isActive
                      ? T.textPrimary
                      : isPast
                        ? T.textSub
                        : T.textMuted,
                    whiteSpace: "nowrap",
                    lineHeight: 1.2,
                  }}
                >
                  {level.name}
                </span>
                <span
                  style={{
                    display: "block",
                    fontFamily: T.font,
                    fontSize: 8,
                    fontWeight: 400,
                    color: T.textMuted,
                    whiteSpace: "nowrap",
                    lineHeight: 1.3,
                    marginTop: 1,
                  }}
                >
                  {level.wordRange[0].toLocaleString()}w
                </span>
              </div>
              {/* 16px horizontal tick — ocean-depth-4 */}
              <div
                style={{
                  position: "absolute",
                  right: "calc(50% + 2px)",
                  width: 16,
                  height: 1,
                  background: isActive
                    ? T.accentTealDim
                    : "var(--ocean-depth-4, #1a3347)",
                }}
              />
            </div>
          );
        })}

        {/* ── POSITION MARKER: diver descends on load ── */}
        <motion.div
          initial={{ opacity: 0, top: "3%" }}
          animate={{ opacity: 1, top: `${3 + markerPercent * 0.94}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          style={{
            position: "absolute",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          {/* Glow circle */}
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: T.accentTeal,
              boxShadow:
                "0 0 0 4px rgba(0, 212, 170, 0.15), 0 0 12px rgba(0, 212, 170, 0.3)",
              flexShrink: 0,
              animation: "depthPulse 2.5s ease-in-out infinite",
            }}
          />
          {/* Current zone label to the right of marker */}
          <span
            style={{
              fontFamily: T.font,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: T.accentTeal,
              whiteSpace: "nowrap",
            }}
          >
            {currentLevel.name}
          </span>
        </motion.div>
      </div>

      {/* ── WORD COUNT STATS ── */}
      <div
        style={{
          textAlign: "center",
          padding: "14px 0 4px",
          borderTop: `1px solid ${T.dividerFaint}`,
        }}
      >
        <div
          style={{
            fontFamily: T.font,
            fontSize: 22,
            fontWeight: 700,
            color: T.accentTeal,
            marginBottom: 3,
            letterSpacing: "-0.02em",
          }}
        >
          {wordCount.toLocaleString()} words learned
        </div>
        {wordsToGo > 0 && (
          <div
            style={{
              fontFamily: T.font,
              fontSize: 12,
              fontWeight: 500,
              color: T.textMuted,
              letterSpacing: "0.01em",
            }}
          >
            {wordsToGo.toLocaleString()} to next depth
          </div>
        )}
      </div>

      {/* ── ZONE LIST — landing page table aesthetic ── */}
      <div
        style={{
          borderTop: `1px solid ${T.divider}`,
          margin: "16px 0 0",
          paddingTop: 8,
          flexShrink: 0,
        }}
      >
        {DEPTH_LEVELS.map((level) => {
          const isActive = level.id === currentLevel.id;
          const rangeLabel =
            level.wordRange[1] === Infinity
              ? `${level.wordRange[0].toLocaleString()}+`
              : `${level.wordRange[0].toLocaleString()}–${level.wordRange[1].toLocaleString()}`;

          const isHoveredZone = !isActive && hoveredZone === level.id;
          return (
            <div
              key={level.id}
              onMouseEnter={() => setHoveredZone(level.id)}
              onMouseLeave={() => setHoveredZone(null)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                marginBottom: 2,
                borderLeft: isActive
                  ? `3px solid ${T.activeRowBdr}`
                  : isHoveredZone
                    ? `3px solid var(--ocean-steel, #4a7fa5)`
                    : "3px solid transparent",
                background: isActive
                  ? T.activeRowBg
                  : isHoveredZone
                    ? "rgba(74, 127, 165, 0.08)"
                    : "transparent",
                borderRadius: 6,
                cursor: "pointer",
                transition: "background 0.15s ease, border-color 0.15s ease",
              }}
            >
              <span
                style={{
                  fontFamily: T.font,
                  fontSize: 11,
                  fontWeight: 500,
                  color: isActive
                    ? T.accentTeal
                    : "var(--ocean-steel-muted, rgba(74,127,165,0.45))",
                }}
              >
                {level.name}
              </span>
              <span
                style={{
                  fontFamily: T.font,
                  fontSize: 11,
                  fontWeight: 400,
                  color: isActive
                    ? T.textMuted
                    : "var(--ocean-steel-muted, rgba(74,127,165,0.45))",
                }}
              >
                {rangeLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Inject keyframes */}
      <style>{keyframes}</style>
    </div>
  );
}

// ── Mobile Bottom Sheet ─────────────────────────────────────────────────────

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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50"
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
              background: `linear-gradient(180deg, ${T.bgFrom} 0%, ${T.bgTo} 100%)`,
              borderTop: `1px solid ${T.divider}`,
              maxHeight: "80vh",
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center py-3">
              <div
                className="w-10 h-1 rounded-full"
                style={{ background: "rgba(148, 163, 184, 0.2)" }}
              />
            </div>

            {/* Content */}
            <div
              className="px-5 pb-8 overflow-y-auto"
              style={{ maxHeight: "calc(80vh - 40px)" }}
            >
              <DepthGaugeContent wordCount={wordCount} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Main Sidebar Component ──────────────────────────────────────────────────

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
          minWidth: 200,
          height: "calc(100vh - 64px)",
          padding: "0 16px 16px 16px",
          background: `linear-gradient(180deg, ${T.bgFrom} 0%, ${T.bgTo} 100%)`,
          borderRight: `1px solid ${T.divider}`,
        }}
        aria-label="Depth gauge navigation"
        role="navigation"
      >
        <DepthGaugeContent wordCount={wordCount} />
      </aside>

      {/* Mobile floating depth button */}
      <button
        className="fixed bottom-6 left-6 z-50 lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-full"
        style={{
          background: "var(--ocean-depth-2, #0d1d2e)",
          border: `1px solid ${T.divider}`,
          boxShadow: `0 4px 24px rgba(0, 0, 0, 0.4), 0 0 12px rgba(0, 212, 170, 0.08)`,
        }}
        onClick={() => setMobileOpen(true)}
        aria-label={`Open depth gauge. Current depth: ${currentLevel.name}`}
      >
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{
            background: T.accentTeal,
            boxShadow: `0 0 6px rgba(0, 212, 170, 0.6)`,
          }}
        />
        <span
          style={{
            fontFamily: T.font,
            fontSize: 12,
            fontWeight: 500,
            color: T.accentTeal,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {currentLevel.name}
        </span>
        <ChevronDown className="w-3 h-3" style={{ color: T.textMuted }} />
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
