"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEPTH_LEVELS,
  getDepthLevel,
  getProgressToNextLevel,
  type DepthLevel,
} from "@/lib/progression/depthLevels";

// ============================================================================
// DepthSidebar — Rebuilt as a deep-sea sonar instrument
// Precision underwater gauge with glowing depth column and position marker.
// ============================================================================

interface DepthSidebarProps {
  wordCount: number;
  totalMinutes?: number;
  className?: string;
}

// ── Zone config for the depth column gradient ───────────────────────────────
const ZONE_GRADIENT_COLORS = [
  "#00e5cc", // The Shallows (bright cyan)
  "#00b4a0", // Sunlit Zone
  "#007a6e", // Twilight Zone
  "#004d45", // The Deep
  "#001f1c", // The Abyss (near black-teal)
];

// ── Pulse animation keyframes ───────────────────────────────────────────────
const pulseKeyframes = `
@keyframes sonarPulseMarker {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.3);
    opacity: 0.6;
  }
}
`;

// ── Depth Gauge Content (shared by desktop & mobile) ────────────────────────

function DepthGaugeContent({ wordCount }: { wordCount: number }) {
  const currentLevel = getDepthLevel(wordCount);
  const progress = getProgressToNextLevel(wordCount);
  const currentIndex = DEPTH_LEVELS.findIndex((l) => l.id === currentLevel.id);
  const totalZones = DEPTH_LEVELS.length;

  // Each zone occupies an equal fraction of the bar
  const zoneHeight = 100 / totalZones;
  // Marker position: center of the current zone + partial progress
  const markerPercent = currentIndex * zoneHeight + zoneHeight * 0.5;

  // Words to go for the target (next zone or infinity)
  const wordsToGo = progress.next ? progress.next.unlocksAt - wordCount : 0;

  return (
    <div className="flex flex-col h-full">
      {/* ── TOP LABEL ── */}
      <div
        style={{
          borderTop: "1px solid rgba(0, 210, 180, 0.2)",
          paddingTop: 12,
          paddingBottom: 16,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 9,
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#4a9e96",
          }}
        >
          DEPTH GAUGE
        </span>
      </div>

      {/* ── DEPTH COLUMN AREA ─ bar + labels + marker ── */}
      <div
        className="relative flex-1"
        style={{ minHeight: 0, paddingLeft: 16, paddingRight: 16 }}
      >
        {/* The vertical gradient bar — centered */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "4%",
            bottom: "4%",
            width: 3,
            transform: "translateX(-50%)",
            borderRadius: 2,
            background: `linear-gradient(to bottom, ${ZONE_GRADIENT_COLORS.join(", ")})`,
            filter: "drop-shadow(0 0 6px rgba(0, 229, 204, 0.5))",
          }}
        />

        {/* Zone labels + tick marks — all labels LEFT of bar */}
        {DEPTH_LEVELS.map((level, idx) => {
          const topPercent = idx * zoneHeight + zoneHeight * 0.5;
          const isActive = level.id === currentLevel.id;

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
              {/* Label to the LEFT of the bar */}
              <span
                style={{
                  position: "absolute",
                  right: "calc(50% + 16px)",
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: 8,
                  fontWeight: isActive ? 500 : 400,
                  fontStyle: "normal",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: isActive ? "#c0ebe5" : "#4a9e96",
                  textAlign: "right",
                  whiteSpace: "nowrap",
                }}
              >
                {level.name.toUpperCase()}
              </span>
              {/* Tick mark from label to bar */}
              <div
                style={{
                  position: "absolute",
                  right: "calc(50% + 2px)",
                  width: 12,
                  height: 1,
                  background: isActive
                    ? "rgba(0, 229, 204, 0.5)"
                    : "rgba(74, 158, 150, 0.25)",
                }}
              />
            </div>
          );
        })}

        {/* ── CURRENT POSITION MARKER ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          style={{
            position: "absolute",
            top: `${markerPercent}%`,
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            zIndex: 10,
          }}
        >
          {/* Diamond marker */}
          <div
            style={{
              width: 12,
              height: 12,
              transform: "rotate(45deg)",
              background: "#00e5cc",
              borderRadius: 2,
              boxShadow:
                "0 0 10px rgba(0, 229, 204, 0.7), 0 0 20px rgba(0, 229, 204, 0.3)",
              animation: "sonarPulseMarker 2.5s ease-in-out infinite",
              flexShrink: 0,
            }}
          />
          {/* Current zone name */}
          <span
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              color: "#ffffff",
              whiteSpace: "nowrap",
              letterSpacing: "0.08em",
              textShadow: "0 0 8px rgba(0, 229, 204, 0.4)",
            }}
          >
            {currentLevel.name.toUpperCase()}
          </span>
        </motion.div>
      </div>

      {/* ── WORD COUNT DISPLAY ── */}
      <div
        style={{
          textAlign: "center",
          paddingTop: 16,
          borderTop: "1px solid rgba(0, 210, 180, 0.1)",
        }}
      >
        <div
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: "#00e5cc",
            marginBottom: 2,
          }}
        >
          {wordCount.toLocaleString()} words learned
        </div>
        {wordsToGo > 0 && (
          <div
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: 11,
              fontWeight: 400,
              color: "#4a9e96",
            }}
          >
            {wordsToGo.toLocaleString()} words to go
          </div>
        )}
      </div>

      {/* ── ZONE LIST ── */}
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: "1px solid rgba(0, 210, 180, 0.08)",
          flexShrink: 0,
          overflowY: "auto",
        }}
      >
        {DEPTH_LEVELS.map((level) => {
          const isActive = level.id === currentLevel.id;
          const rangeLabel =
            level.wordRange[1] === Infinity
              ? `${level.wordRange[0].toLocaleString()}+`
              : `${level.wordRange[0].toLocaleString()} – ${level.wordRange[1].toLocaleString()}`;

          return (
            <div
              key={level.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "5px 8px 5px 10px",
                borderLeft: isActive
                  ? "2px solid #00e5cc"
                  : "2px solid transparent",
                marginBottom: 2,
              }}
            >
              <span
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: 9,
                  fontWeight: 400,
                  fontStyle: "normal",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: isActive ? "#c0ebe5" : "#4a9e96",
                }}
              >
                {level.name.toUpperCase()}
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9,
                  color: "#4a9e96",
                }}
              >
                {rangeLabel}
              </span>
            </div>
          );
        })}
      </div>

      {/* Inject pulse keyframes */}
      <style>{pulseKeyframes}</style>
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
              background: "#060f0f",
              borderTop: "1px solid rgba(0, 210, 180, 0.15)",
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
          background: "#060f0f",
          boxShadow: "inset -1px 0 0 rgba(0, 210, 180, 0.15)",
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
          background: "rgba(6, 15, 15, 0.85)",
          border: "1px solid rgba(0, 229, 204, 0.25)",
          boxShadow:
            "0 4px 24px rgba(0, 0, 0, 0.4), 0 0 12px rgba(0, 229, 204, 0.1)",
          backdropFilter: "blur(16px)",
        }}
        onClick={() => setMobileOpen(true)}
        aria-label={`Open depth gauge. Current depth: ${currentLevel.name}`}
      >
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{
            background: "#00e5cc",
            boxShadow: "0 0 6px rgba(0, 229, 204, 0.8)",
          }}
        />
        <span
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: 12,
            fontWeight: 500,
            color: "#00e5cc",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          {currentLevel.name}
        </span>
        <ChevronDown className="w-3 h-3" style={{ color: "#00e5cc" }} />
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
