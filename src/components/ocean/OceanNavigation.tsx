"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  Waves,
  Settings,
  User,
  Compass,
  ChevronDown,
  BarChart,
  Users,
  Target,
} from "lucide-react";
import { AmbientLauncher } from "@/components/ambient";
import { useAmbientPlayer } from "@/contexts/AmbientPlayerContext";

// ============================================================================
// Ocean Navigation - Simplified immersive nav
// Three destinations: Course, Immerse, Settings
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
  /** When provided, outbound link clicks call this instead of native navigation */
  onBeforeNavigate?: (href: string) => void;
}

const navItems = [
  { href: "/dashboard", label: "Course", icon: Compass },
  { href: "/propel", label: "Propel", icon: Waves },
  { href: "/goals", label: "Goals", icon: Target },
];

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
  onBeforeNavigate,
}: OceanNavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [wordsCount, setWordsCount] = useState(0);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const { ambientView, setAmbientView } = useAmbientPlayer();

  // Close account menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };
    if (accountMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountMenuOpen]);

  // Intercept link clicks for transition loading screens
  const handleLinkClick = useCallback(
    (e: React.MouseEvent, href: string) => {
      if (onBeforeNavigate && !currentPath.startsWith(href)) {
        e.preventDefault();
        onBeforeNavigate(href);
      }
    },
    [onBeforeNavigate, currentPath],
  );

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
        <Link
          href="/dashboard"
          className="flex items-center gap-3 group"
          onClick={(e) => handleLinkClick(e, "/dashboard")}
        >
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
                onClick={(e) => {
                  if (ambientView === "container") {
                    setAmbientView("soundbar");
                  } else if (ambientView === "soundbar") {
                    setAmbientView(null);
                  }
                  handleLinkClick(e, item.href);
                }}
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
          {/* Immerse — between Course and admin, nav-tab style */}
          <AmbientLauncher variant="nav" />

          {/* Community */}
          {(() => {
            const communityHref = "/community";
            const isActive = currentPath.startsWith(communityHref);
            return (
              <Link
                key={communityHref}
                href={communityHref}
                className="nav-tab relative group"
                onClick={(e) => handleLinkClick(e, communityHref)}
              >
                <div className="flex items-center gap-2">
                  <Users
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
                    Community
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
          })()}

          {/* Admin nav item */}
          {isAdmin && (
            <>
              {/* Donations */}
              {(() => {
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
                          color: isActive
                            ? "var(--turquoise)"
                            : "var(--seafoam)",
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

              {/* Costs */}
              {(() => {
                const costsHref = "/admin/costs";
                const isActive = currentPath.startsWith(costsHref);
                return (
                  <Link
                    key={costsHref}
                    href={costsHref}
                    className="nav-tab relative group"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart
                        className="w-4 h-4 transition-colors duration-200"
                        style={{
                          color: isActive
                            ? "var(--turquoise)"
                            : "var(--seafoam)",
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
                        Costs
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
            </>
          )}
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

          {/* Avatar — account dropdown trigger */}
          <div ref={accountMenuRef} className="relative">
            <button
              onClick={() => setAccountMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 group focus:outline-none"
              aria-expanded={accountMenuOpen}
              aria-haspopup="true"
            >
              <div
                className="w-9 h-9 rounded-full overflow-hidden border-2 transition-all duration-300 group-hover:scale-105"
                style={{
                  borderColor: accountMenuOpen
                    ? "rgba(61, 214, 181, 0.5)"
                    : "rgba(255, 255, 255, 0.1)",
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
              <ChevronDown
                className={cn(
                  "w-3 h-3 transition-transform duration-200",
                  accountMenuOpen ? "rotate-180" : "",
                )}
                style={{ color: "var(--seafoam)", opacity: 0.7 }}
              />
            </button>

            {/* Dropdown */}
            {accountMenuOpen && (
              <div
                className="absolute right-0 top-full mt-3 min-w-max rounded-2xl border overflow-hidden z-50"
                style={{
                  background: "var(--ocean-deep, #0a1628)",
                  borderColor: "rgba(61, 214, 181, 0.2)",
                  boxShadow:
                    "0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(61,214,181,0.12)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {(
                  [
                    { label: "Profile", href: "/settings#profile" },
                    { label: "Language", href: "/settings#language" },
                    { label: "Settings", href: "/settings#settings" },
                  ] as const
                ).map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center px-5 py-4 text-base font-body font-medium transition-all duration-150 border-b border-white/5 last:border-b-0 hover:bg-white/5 whitespace-nowrap"
                    style={{ color: "var(--sand)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--turquoise)";
                      e.currentTarget.style.backgroundColor =
                        "rgba(61, 214, 181, 0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--sand)";
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    onClick={() => setAccountMenuOpen(false)}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
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
