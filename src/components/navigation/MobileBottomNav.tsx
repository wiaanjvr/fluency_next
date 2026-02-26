"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Compass, Waves, BarChart3, Users } from "lucide-react";
import { getDepthLevel } from "@/lib/progression/depthLevels";

// ============================================================================
// MobileBottomNav — Bottom tab bar for mobile devices
//
// 4 tabs: Course, Propel, Chart, Community
// Immerse is accessible via the AppNav header (headphones icon)
// Depth indicator shown in a sticky header bar above the bottom tabs (via AppNav)
// ============================================================================

const MOBILE_TABS = [
  { href: "/dashboard", label: "Course", icon: Compass },
  { href: "/propel", label: "Propel", icon: Waves },
  { href: "/goals", label: "Chart", icon: BarChart3 },
  { href: "/community", label: "Community", icon: Users },
] as const;

interface MobileBottomNavProps {
  wordsEncountered?: number;
  className?: string;
}

export function MobileBottomNav({
  wordsEncountered = 0,
  className,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const depthLevel = getDepthLevel(wordsEncountered);

  const isActiveRoute = (href: string): boolean => {
    if (href === "/dashboard") {
      return (
        pathname === "/dashboard" ||
        pathname.startsWith("/learn") ||
        pathname.startsWith("/lesson")
      );
    }
    return pathname.startsWith(href);
  };

  return (
    <nav
      className={cn("md:hidden fixed bottom-0 left-0 right-0 z-50", className)}
      style={{
        background: "rgba(1, 12, 16, 0.95)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255, 255, 255, 0.04)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-14">
        {MOBILE_TABS.map((tab) => {
          const isActive = isActiveRoute(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors duration-200"
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div className="relative">
                <Icon
                  className="w-5 h-5"
                  style={{
                    color: isActive
                      ? depthLevel.colorPrimaryHex
                      : "var(--text-muted, #2E5C54)",
                  }}
                />
                {isActive && (
                  <div
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{ background: depthLevel.colorPrimaryHex }}
                  />
                )}
              </div>
              <span
                className="text-[10px] font-medium"
                style={{
                  fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  color: isActive
                    ? depthLevel.colorPrimaryHex
                    : "var(--text-muted, #2E5C54)",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
