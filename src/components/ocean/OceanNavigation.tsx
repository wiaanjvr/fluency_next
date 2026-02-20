"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Waves, BarChart3, Settings, User } from "lucide-react";
import { AmbientLauncher } from "@/components/ambient";

// ============================================================================
// Ocean Navigation - Simplified immersive nav
// Three destinations: Immerse, Progress, Settings
// No modes. No levels. Just depth.
// ============================================================================

interface OceanNavigationProps {
  streak?: number;
  wordsEncountered?: number;
  totalMinutes?: number;
  avatarUrl?: string;
  currentPath?: string;
  className?: string;
  isAdmin?: boolean;
}

const navItems = [
  { href: "/dashboard", label: "Immerse", icon: Waves },
  { href: "/dashboard?view=progress", label: "Progress", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function OceanNavigation({
  wordsEncountered = 0,
  totalMinutes = 0,
  avatarUrl,
  currentPath = "/dashboard",
  className,
  isAdmin = false,
}: OceanNavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [wordsCount, setWordsCount] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const wordsStep = wordsEncountered / steps;
    let current = 0;

    const interval = setInterval(() => {
      current++;
      setWordsCount(
        Math.min(Math.round(wordsStep * current), wordsEncountered),
      );
      if (current >= steps) clearInterval(interval);
    }, duration / steps);

    return () => clearInterval(interval);
  }, [wordsEncountered]);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <nav
      className={cn(
        "ocean-nav fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "py-3" : "py-4",
        className,
      )}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Left: Logo & Wordmark */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg overflow-hidden transition-transform duration-300 group-hover:scale-105 flex items-center justify-center">
            <Image
              src="/logo.png"
              alt="Fluensea"
              width={40}
              height={40}
              className="w-10 h-10 object-contain"
              priority
            />
          </div>
          <span
            className="text-xl font-display font-semibold tracking-wide"
            style={{ color: "var(--sand)" }}
          >
            Fluensea
          </span>
        </Link>

        {/* Center: Three Destinations */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? (currentPath === "/dashboard" &&
                    !currentPath.includes("progress")) ||
                  currentPath.startsWith("/learn") ||
                  currentPath.startsWith("/lesson")
                : item.href === "/dashboard?view=progress"
                  ? currentPath.includes("progress")
                  : currentPath.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="nav-tab relative group"
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className="w-4 h-4 transition-colors duration-200"
                    style={{
                      color: isActive ? "var(--turquoise)" : "var(--seafoam)",
                      opacity: isActive ? 1 : 0.6,
                    }}
                  />
                  <span
                    className={cn(
                      "text-sm font-body font-medium transition-colors duration-200",
                    )}
                    style={{
                      color: isActive ? "var(--turquoise)" : "var(--sand)",
                      opacity: isActive ? 1 : 0.7,
                    }}
                  >
                    {item.label}
                  </span>
                </div>
                {/* Active indicator */}
                <div
                  className={cn(
                    "mt-1 h-0.5 rounded-full transition-all duration-300",
                    isActive
                      ? "w-full opacity-100"
                      : "w-0 group-hover:w-full opacity-0 group-hover:opacity-30",
                  )}
                  style={{
                    background: isActive
                      ? "var(--turquoise)"
                      : "var(--seafoam)",
                  }}
                />
              </Link>
            );
          })}
          {/* Admin nav item (styled like others) */}
          {isAdmin &&
            (() => {
              const adminHref = "/admin/donations";
              const isActive = currentPath.startsWith(adminHref);
              return (
                <Link
                  key={adminHref}
                  href={adminHref}
                  className="nav-tab relative group"
                >
                  <div className="flex items-center gap-2">
                    <Settings
                      className="w-4 h-4 transition-colors duration-200"
                      style={{
                        color: isActive ? "var(--turquoise)" : "var(--seafoam)",
                        opacity: isActive ? 1 : 0.6,
                      }}
                    />
                    <span
                      className={cn(
                        "text-sm font-body font-medium transition-colors duration-200",
                      )}
                      style={{
                        color: isActive ? "var(--turquoise)" : "var(--sand)",
                        opacity: isActive ? 1 : 0.7,
                      }}
                    >
                      Donations
                    </span>
                  </div>
                  <div
                    className={cn(
                      "mt-1 h-0.5 rounded-full transition-all duration-300",
                      isActive
                        ? "w-full opacity-100"
                        : "w-0 group-hover:w-full opacity-0 group-hover:opacity-30",
                    )}
                    style={{
                      background: isActive
                        ? "var(--turquoise)"
                        : "var(--seafoam)",
                    }}
                  />
                </Link>
              );
            })()}
        </div>

        {/* Right: Immersion Stats & Avatar */}
        <div className="flex items-center gap-5">
          {/* Words absorbed */}
          <div className="flex items-center gap-2" title="Words absorbed">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "var(--turquoise)", opacity: 0.8 }}
            />
            <span
              className="text-sm font-body font-semibold tabular-nums"
              style={{ color: "var(--sand)" }}
            >
              {wordsCount}
            </span>
            <span
              className="text-xs font-body hidden sm:inline"
              style={{ color: "var(--seafoam)", opacity: 0.6 }}
            >
              words
            </span>
          </div>

          {/* Time immersed */}
          {totalMinutes > 0 && (
            <div className="flex items-center gap-2" title="Time immersed">
              <div
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--seafoam)", opacity: 0.6 }}
              />
              <span
                className="text-sm font-body font-semibold"
                style={{ color: "var(--sand)" }}
              >
                {formatTime(totalMinutes)}
              </span>
            </div>
          )}

          {/* Ambient Mode launcher */}
          <AmbientLauncher className="hidden sm:flex" />

          {/* Avatar */}
          <Link href="/settings">
            <div
              className="w-9 h-9 rounded-full overflow-hidden border-2 transition-all duration-300 hover:scale-105"
              style={{
                borderColor: "rgba(255, 255, 255, 0.1)",
                background: "var(--ocean-mid)",
              }}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User
                    className="w-5 h-5"
                    style={{ color: "var(--seafoam)" }}
                  />
                </div>
              )}
            </div>
          </Link>
        </div>
      </div>

      {/* Shimmer line on scroll */}
      {scrolled && (
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent 0%, rgba(61, 214, 181, 0.2) 50%, transparent 100%)`,
          }}
        />
      )}
    </nav>
  );
}

export default OceanNavigation;
