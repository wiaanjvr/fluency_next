"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { DepthChart } from "./DepthChart";

// ============================================================================
// Depth Sidebar — fixed left panel showing the ocean depth gauge
// Width: 220px on desktop, hidden on mobile
// ============================================================================

interface DepthSidebarProps {
  wordCount: number;
  totalMinutes?: number;
  shadowingSessions?: number;
  className?: string;
}

export function DepthSidebar({
  wordCount,
  totalMinutes = 0,
  shadowingSessions = 0,
  className,
}: DepthSidebarProps) {
  return (
    <aside
      className={cn(
        "hidden md:flex fixed top-0 left-0 z-40 h-screen w-auto flex-col",
        "pt-20 pb-6 overflow-y-auto",
        className,
      )}
      style={{
        width: "max-content",
        minWidth: 300,
        paddingLeft: 20,
        paddingRight: 20,
        background:
          "linear-gradient(180deg, rgba(4, 16, 32, 0.96) 0%, rgba(2, 10, 24, 0.98) 100%)",
        borderRight: "1px solid rgba(61, 214, 181, 0.06)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <DepthChart
        wordCount={wordCount}
        totalMinutes={totalMinutes}
        shadowingSessions={shadowingSessions}
        className="w-full"
      />
    </aside>
  );
}

export default DepthSidebar;
