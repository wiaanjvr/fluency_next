"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Waves, Settings, User } from "lucide-react";
import { AmbientLauncher } from "@/components/ambient";
import { useAmbientPlayer } from "@/contexts/AmbientPlayerContext";

// ============================================================================
// Ocean Navigation - Simplified immersive nav
// Three destinations: Immerse, Progress, Settings
// No modes. No levels. Just depth.
// ============================================================================

interface OceanNavigationProps {
  streak?: number;
  avgScore?: number;
  wordsEncountered?: number;
  totalMinutes?: number;
  avatarUrl?: string;
  currentPath?: string;
  className?: string;
  isAdmin?: boolean;
  isProgressView?: boolean;
  targetLanguage?: string;
}

const navItems = [{ href: "/dashboard", label: "Immerse", icon: Waves }];

export function OceanNavigation({
  streak = 0,
  avgScore = 0,
  wordsEncountered = 0,
  totalMinutes = 0,
  avatarUrl,
  currentPath = "/dashboard",
  className,
  isAdmin = false,
  isProgressView = false,
  targetLanguage,
}: OceanNavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [wordsCount, setWordsCount] = useState(0);
  const { ambientView, setAmbientView } = useAmbientPlayer();

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
      <div
        className={cn(
          "max-w-7xl mx-auto px-6 flex items-center justify-between transition-all duration-300",
          isProgressView ? "md:ml-[360px]" : "md:ml-[385px]",
        )}
      >
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
        <div className="hidden md:flex items-center gap-4">
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
                onClick={() => {
                  if (ambientView === "container") {
                    // SoundContainer → soundbar mode
                    setAmbientView("soundbar");
                  } else if (ambientView === "soundbar") {
                    // soundbar mode → normal lesson hero (audio keeps playing)
                    setAmbientView(null);
                  }
                  // null → navigate normally, no state change
                }}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className="w-4 h-4 transition-colors duration-200"
                    style={{
                      color:
                        isActive && ambientView === null
                          ? "var(--turquoise)"
                          : "var(--seafoam)",
                      opacity: isActive && ambientView === null ? 1 : 0.45,
                    }}
                  />
                  <span
                    className={cn(
                      "text-sm font-body font-medium transition-colors duration-200",
                    )}
                    style={{
                      color:
                        isActive && ambientView === null
                          ? "var(--turquoise)"
                          : "var(--sand)",
                      opacity: isActive && ambientView === null ? 1 : 0.45,
                    }}
                  >
                    {item.label}
                  </span>
                </div>
                {/* Active indicator */}
                <div
                  className={cn(
                    "mt-1 h-0.5 rounded-full transition-all duration-300",
                    isActive && ambientView === null
                      ? "w-full opacity-100"
                      : "w-0 group-hover:w-full opacity-0 group-hover:opacity-30",
                  )}
                  style={{
                    background:
                      isActive && ambientView === null
                        ? "var(--turquoise)"
                        : "var(--seafoam)",
                  }}
                />
              </Link>
            );
          })}
          {/* Ambient — between Immerse and Settings, nav-tab style */}
          <AmbientLauncher variant="nav" />

          {/* Settings nav item */}
          {(() => {
            const settingsHref = "/settings";
            const isActive = currentPath.startsWith(settingsHref);
            return (
              <Link href={settingsHref} className="nav-tab relative group">
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
                    Settings
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

          {/* Admin nav item */}
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

        {/* Right: Stats & Avatar */}
        <div className="flex items-center gap-3">
          {/* Daily streak */}
          {streak > 0 && (
            <div className="flex items-center gap-1.5" title="Daily streak">
              <span className="text-base leading-none">🔥</span>
              <span
                className="text-sm font-body font-semibold tabular-nums"
                style={{ color: "var(--sand)" }}
              >
                {streak}
              </span>
            </div>
          )}

          {/* Language flag (image-based for cross-platform reliability) */}
          {targetLanguage && (
            <div
              className="flex items-center justify-center shrink-0"
              title={`Learning: ${targetLanguage.toUpperCase()}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://flagcdn.com/24x18/${targetLanguage.toLowerCase()}.png`}
                srcSet={`https://flagcdn.com/48x36/${targetLanguage.toLowerCase()}.png 2x`}
                width={24}
                height={18}
                alt={targetLanguage.toUpperCase()}
                style={{ borderRadius: 2, display: "block" }}
              />
            </div>
          )}

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
