"use client";

import React, { useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

// ============================================================================
// RouteTransition — Shared layout transitions between primary routes
//
// Course → Propel: content slides left (going deeper)
// Propel → Course: content slides right (surfacing)
// Duration: 0.25s ease-out
// Only wraps the main content area, not the nav or sidebar
// ============================================================================

// Map primary routes to direction indices
const ROUTE_ORDER: Record<string, number> = {
  "/dashboard": 0,
  "/propel": 1,
};

function getRouteIndex(pathname: string): number {
  // Check exact match first
  if (ROUTE_ORDER[pathname] !== undefined) return ROUTE_ORDER[pathname];
  // Check prefix for sub-routes
  if (pathname.startsWith("/propel")) return 1;
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/learn") ||
    pathname.startsWith("/lesson")
  ) {
    return 0;
  }
  // Non-primary routes don't animate, return -1
  return -1;
}

interface RouteTransitionProps {
  children: React.ReactNode;
}

export function RouteTransition({ children }: RouteTransitionProps) {
  const pathname = usePathname();
  const prevIndexRef = useRef<number>(getRouteIndex(pathname));
  const currentIndex = getRouteIndex(pathname);

  // Determine direction: positive = going deeper (left), negative = surfacing (right)
  const direction =
    currentIndex >= 0 && prevIndexRef.current >= 0
      ? currentIndex > prevIndexRef.current
        ? 1
        : currentIndex < prevIndexRef.current
          ? -1
          : 0
      : 0;

  // Update previous after computing direction
  if (currentIndex >= 0) {
    prevIndexRef.current = currentIndex;
  }

  // Only animate between primary routes
  const shouldAnimate = currentIndex >= 0 && direction !== 0;

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
    }),
  };

  return (
    <AnimatePresence mode="wait" custom={direction} initial={false}>
      <motion.div
        key={pathname}
        custom={direction}
        variants={shouldAnimate ? variants : undefined}
        initial={shouldAnimate ? "enter" : false}
        animate="center"
        exit={shouldAnimate ? "exit" : undefined}
        transition={{
          duration: 0.25,
          ease: [0.25, 0.1, 0.25, 1], // ease-out
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
