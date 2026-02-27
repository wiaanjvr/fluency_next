"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { DepthChart } from "./DepthChart";

// ============================================================================
// Depth Sidebar — fixed left panel, physical depth gauge visualization
// Width: 220px on desktop, hidden on mobile
// ============================================================================

interface DepthSidebarProps {
  wordCount: number;
  totalMinutes?: number;
  shadowingSessions?: number;
  className?: string;
  scrollable?: boolean;
}

export function DepthSidebar({
  wordCount,
  totalMinutes = 0,
  shadowingSessions = 0,
  className,
  scrollable = true,
}: DepthSidebarProps) {
  return (
    <aside
      className={cn(
        "hidden lg:flex fixed top-[64px] left-0 z-40 flex-col",
        scrollable ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden",
        "dashboard-scroll",
        className,
      )}
      style={{
        width: 220,
        height: "calc(100vh - 64px)",
        padding: "24px 16px 20px",
        background: "linear-gradient(180deg, #0a1628 0%, #0d1f35 100%)",
        borderRight: "1px solid rgba(45, 212, 191, 0.15)",
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
