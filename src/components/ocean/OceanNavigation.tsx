"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Flame, BookOpen, User } from "lucide-react";

// ============================================================================
// Ocean Navigation - Frosted glass top navigation bar
// ============================================================================

interface OceanNavigationProps {
  streak: number;
  wordsEncountered: number;
  avatarUrl?: string;
  currentPath?: string;
  className?: string;
}

const navTabs = [
  { href: "/learn/foundation", label: "Foundation", depth: "Surface" },
  { href: "/learn/sentences", label: "Sentences", depth: "Mid-water" },
  { href: "/learn/stories", label: "Stories", depth: "Deep" },
  { href: "/dashboard?view=mastery", label: "Mastery", depth: "Abyss" },
];

export function OceanNavigation({
  streak,
  wordsEncountered,
  avatarUrl,
  currentPath = "/dashboard",
  className,
}: OceanNavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [wordsCount, setWordsCount] = useState(0);

  // Detect scroll for nav compression
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Animated count up on mount
  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const streakStep = streak / steps;
    const wordsStep = wordsEncountered / steps;
    let current = 0;

    const interval = setInterval(() => {
      current++;
      setStreakCount(Math.min(Math.round(streakStep * current), streak));
      setWordsCount(
        Math.min(Math.round(wordsStep * current), wordsEncountered),
      );
      if (current >= steps) clearInterval(interval);
    }, duration / steps);

    return () => clearInterval(interval);
  }, [streak, wordsEncountered]);

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

        {/* Center: Navigation Tabs - Depth Markers */}
        <div className="hidden md:flex items-center gap-8">
          {navTabs.map((tab) => {
            const isActive = currentPath.includes(tab.href.split("?")[0]);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="nav-tab relative group"
              >
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "text-sm font-body font-medium transition-colors duration-200",
                      isActive
                        ? "text-turquoise"
                        : "text-sand opacity-70 group-hover:opacity-100",
                    )}
                    style={{
                      color: isActive ? "var(--turquoise)" : "var(--sand)",
                    }}
                  >
                    {tab.label}
                  </span>
                  {/* Depth indicator line */}
                  <div
                    className={cn(
                      "mt-1 h-0.5 rounded-full transition-all duration-300",
                      isActive
                        ? "w-full bg-turquoise opacity-100"
                        : "w-0 group-hover:w-full opacity-0 group-hover:opacity-50",
                    )}
                    style={{
                      background: isActive
                        ? "var(--turquoise)"
                        : "var(--seafoam)",
                    }}
                  />
                  {/* Active water drop indicator */}
                  {isActive && (
                    <div
                      className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                      style={{
                        background: "var(--turquoise)",
                        boxShadow: "0 0 8px var(--turquoise)",
                      }}
                    />
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Right: Stats & Avatar */}
        <div className="flex items-center gap-5">
          {/* Streak */}
          <div className="flex items-center gap-2">
            <div className="flame-flicker">
              <Flame
                className="w-5 h-5"
                style={{ color: "#ff9500" }}
                fill="#ff9500"
              />
            </div>
            <span
              className="text-sm font-body font-semibold count-up"
              style={{ color: "var(--sand)" }}
            >
              {streakCount}
            </span>
          </div>

          {/* Words */}
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" style={{ color: "var(--seafoam)" }} />
            <span
              className="text-sm font-body font-semibold"
              style={{ color: "var(--sand)" }}
            >
              {wordsCount}
            </span>
          </div>

          {/* Avatar */}
          <Link href="/settings">
            <div
              className="w-9 h-9 rounded-full overflow-hidden border-2 transition-all duration-300 hover:scale-105 hover:border-turquoise"
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
