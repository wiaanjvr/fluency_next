"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ArrowLeft, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// ContextualNav — Slim secondary breadcrumb bar below the main navigation
//
// Only visible when inside a nested route (e.g. /songs/[songId], /propel/duel/...).
// Shows: Parent > Current page name. Parent is clickable.
// On activity pages, shows session timer from useTrackActivity on the right.
// Animates in/out with Framer Motion.
// ============================================================================

// ─── Route map: defines parent/child relationships for breadcrumbs ─────────

interface BreadcrumbRoute {
  /** Parent page label */
  parentLabel: string;
  /** Parent page href */
  parentHref: string;
  /** Current page label — may be a function of the path segment */
  label: string;
}

/**
 * Map of route prefixes to breadcrumb configurations.
 * Order matters: more specific routes checked first.
 */
const ROUTE_MAP: { pattern: RegExp; config: BreadcrumbRoute }[] = [
  // Propel sub-routes
  {
    pattern: /^\/propel\/duel\/[^/]+\/play/,
    config: {
      parentLabel: "Propel",
      parentHref: "/propel",
      label: "Duel",
    },
  },
  {
    pattern: /^\/propel\/duel\/settings/,
    config: {
      parentLabel: "Propel",
      parentHref: "/propel",
      label: "Duel Settings",
    },
  },
  {
    pattern: /^\/propel\/duel\/new/,
    config: {
      parentLabel: "Propel",
      parentHref: "/propel",
      label: "New Duel",
    },
  },
  {
    pattern: /^\/propel\/duel/,
    config: {
      parentLabel: "Propel",
      parentHref: "/propel",
      label: "Duel",
    },
  },
  {
    pattern: /^\/propel\/flashcards\/browser/,
    config: {
      parentLabel: "Flashcards",
      parentHref: "/propel/flashcards",
      label: "Card Browser",
    },
  },
  {
    pattern: /^\/propel\/flashcards\/stats/,
    config: {
      parentLabel: "Flashcards",
      parentHref: "/propel/flashcards",
      label: "Statistics",
    },
  },
  {
    pattern: /^\/propel\/flashcards\/[^/]+\/study/,
    config: {
      parentLabel: "Propel",
      parentHref: "/propel",
      label: "Flashcard Study",
    },
  },
  {
    pattern: /^\/propel\/flashcards\/[^/]+/,
    config: {
      parentLabel: "Propel",
      parentHref: "/propel",
      label: "Flashcard Deck",
    },
  },
  {
    pattern: /^\/propel\/flashcards/,
    config: {
      parentLabel: "Propel",
      parentHref: "/propel",
      label: "Flashcards",
    },
  },
  {
    pattern: /^\/propel\/cloze/,
    config: {
      parentLabel: "Propel",
      parentHref: "/propel",
      label: "Cloze",
    },
  },
  {
    pattern: /^\/propel\/pronunciation/,
    config: {
      parentLabel: "Propel",
      parentHref: "/propel",
      label: "Pronunciation",
    },
  },
  {
    pattern: /^\/propel\/conversation/,
    config: {
      parentLabel: "Propel",
      parentHref: "/propel",
      label: "Conversation",
    },
  },
  // Songs
  {
    pattern: /^\/songs\/[^/]+/,
    config: {
      parentLabel: "Course",
      parentHref: "/dashboard",
      label: "Song Learning",
    },
  },
  // Lessons
  {
    pattern: /^\/lesson-v2/,
    config: {
      parentLabel: "Course",
      parentHref: "/dashboard",
      label: "Lesson",
    },
  },
  {
    pattern: /^\/lesson\//,
    config: {
      parentLabel: "Course",
      parentHref: "/dashboard",
      label: "Lesson",
    },
  },
  {
    pattern: /^\/learn\//,
    config: {
      parentLabel: "Course",
      parentHref: "/dashboard",
      label: "Learning",
    },
  },
  // Grammar
  {
    pattern: /^\/grammar\/[^/]+/,
    config: {
      parentLabel: "Course",
      parentHref: "/dashboard",
      label: "Grammar",
    },
  },
  // Conjugation
  {
    pattern: /^\/conjugation/,
    config: {
      parentLabel: "Course",
      parentHref: "/dashboard",
      label: "Conjugation",
    },
  },
  // Community sub-routes
  {
    pattern: /^\/community\/[^/]+/,
    config: {
      parentLabel: "Community",
      parentHref: "/community",
      label: "Thread",
    },
  },
  // Goals / Chart
  {
    pattern: /^\/goals/,
    config: {
      parentLabel: "Course",
      parentHref: "/dashboard",
      label: "Chart",
    },
  },
  // Settings
  {
    pattern: /^\/settings/,
    config: {
      parentLabel: "Course",
      parentHref: "/dashboard",
      label: "Settings",
    },
  },
];

function getRouteConfig(pathname: string): BreadcrumbRoute | null {
  for (const { pattern, config } of ROUTE_MAP) {
    if (pattern.test(pathname)) {
      return config;
    }
  }
  return null;
}

// ─── Helper to format seconds as m:ss ──────────────────────────────────────

function formatSessionTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// ─── Component ──────────────────────────────────────────────────────────────

interface ContextualNavProps {
  /** Session duration in seconds, from useTrackActivity.sessionDurationSeconds */
  sessionDurationSeconds?: number;
  className?: string;
}

export function ContextualNav({
  sessionDurationSeconds,
  className,
}: ContextualNavProps) {
  const pathname = usePathname();

  const routeConfig = useMemo(() => getRouteConfig(pathname), [pathname]);

  // Top-level pages (dashboard, propel, community) don't show breadcrumbs
  const isTopLevel =
    pathname === "/dashboard" ||
    pathname === "/propel" ||
    pathname === "/community" ||
    pathname === "/chart";

  const showBreadcrumb = routeConfig && !isTopLevel;

  return (
    <AnimatePresence mode="wait">
      {showBreadcrumb && routeConfig && (
        <motion.div
          key="contextual-nav"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 36 }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className={cn(
            "fixed top-16 left-0 right-0 z-40 overflow-hidden",
            className,
          )}
          style={{
            background: "rgba(1, 12, 16, 0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.03)",
          }}
        >
          <div className="w-full h-full px-4 md:px-6 flex items-center justify-between">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5">
              <Link
                href={routeConfig.parentHref}
                className="flex items-center gap-1 transition-colors duration-150 group"
                style={{ color: "var(--text-muted, #2E5C54)" }}
              >
                <ArrowLeft className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                <span
                  className="text-xs font-medium group-hover:underline underline-offset-2"
                  style={{
                    fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                    color: "var(--text-secondary, #7BA8A0)",
                  }}
                >
                  {routeConfig.parentLabel}
                </span>
              </Link>
              <ChevronRight
                className="w-3 h-3"
                style={{ color: "var(--text-ghost, #2D5A52)" }}
              />
              <span
                className="text-xs font-medium"
                style={{
                  fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  color: "var(--text-primary, #F0FDFA)",
                }}
              >
                {routeConfig.label}
              </span>
            </div>

            {/* Session timer — only visible on activity pages */}
            {sessionDurationSeconds !== undefined &&
              sessionDurationSeconds > 0 && (
                <div
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <Clock
                    className="w-3 h-3"
                    style={{ color: "var(--text-muted, #2E5C54)" }}
                  />
                  <span
                    className="text-[10px] tabular-nums font-medium"
                    style={{
                      fontFamily:
                        "var(--font-inter, 'Inter', system-ui, sans-serif)",
                      color: "var(--text-secondary, #7BA8A0)",
                    }}
                  >
                    Session: {formatSessionTime(sessionDurationSeconds)}
                  </span>
                </div>
              )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
