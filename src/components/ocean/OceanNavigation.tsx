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
  Map,
  Flame,
  Headphones,
} from "lucide-react";
import { useImmerse } from "@/components/immerse";
import { DepthIndicator } from "@/components/navigation/DepthIndicator";
import { getDepthLevel } from "@/lib/progression/depthLevels";

// ============================================================================
// Ocean Navigation — Frosted glass top bar
// Logo + breadcrumb (language + depth zone) + streak/XP/avatar
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
  depthName?: string;
  onBeforeNavigate?: (href: string) => void;
}

const navItems = [
  { href: "/dashboard", label: "Course", icon: Compass },
  { href: "/propel", label: "Propel", icon: Waves },
  { href: "/goals", label: "Chart", icon: Map },
];

// Language flag emoji and name
const LANG_META: Record<string, { flag: string; name: string }> = {
  fr: { flag: "🇫🇷", name: "French" },
  es: { flag: "🇪🇸", name: "Spanish" },
  de: { flag: "🇩🇪", name: "German" },
  it: { flag: "🇮🇹", name: "Italian" },
  pt: { flag: "🇵🇹", name: "Portuguese" },
  ja: { flag: "🇯🇵", name: "Japanese" },
  ko: { flag: "🇰🇷", name: "Korean" },
  zh: { flag: "🇨🇳", name: "Chinese" },
  ru: { flag: "🇷🇺", name: "Russian" },
  ar: { flag: "🇸🇦", name: "Arabic" },
  nl: { flag: "🇳🇱", name: "Dutch" },
  sv: { flag: "🇸🇪", name: "Swedish" },
};

function getDepthZoneName(wordCount: number): string {
  return getDepthLevel(wordCount).name;
}

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
  depthName,
  onBeforeNavigate,
}: OceanNavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const {
    isPlaying: immerseIsPlaying,
    isOpen: immerseIsOpen,
    openSelectModal,
  } = useImmerse();

  const zoneName = depthName || getDepthZoneName(wordsEncountered);
  const langMeta = LANG_META[targetLanguage || "fr"] || {
    flag: "🌍",
    name: targetLanguage || "Language",
  };

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

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <nav
      className={cn(
        "dashboard-topnav fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        className,
      )}
      style={{
        height: 64,
        background: scrolled ? "rgba(1, 12, 16, 0.9)" : "rgba(1, 12, 16, 0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: `1px solid rgba(255, 255, 255, 0.04)`,
      }}
    >
      <div className="w-full h-full px-6 flex items-center justify-between">
        {/* Left: Logo & Wordmark */}
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 group"
          onClick={(e) => handleLinkClick(e, "/dashboard")}
        >
          {/* Wave SVG icon */}
          <div className="w-8 h-8 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path
                d="M4 16C6 13 8.5 12 11 14C13.5 16 16 15 18 13C20 11 22.5 12 24 14"
                stroke="var(--text-secondary, #6B9E96)"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M4 20C6 17 8.5 16 11 18C13.5 20 16 19 18 17C20 15 22.5 16 24 18"
                stroke="var(--text-muted, #2E5C54)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.5"
              />
            </svg>
          </div>
          <span
            style={{
              fontFamily: "var(--font-display, 'Playfair Display', serif)",
              fontWeight: 600,
              fontStyle: "italic",
              fontSize: 18,
              letterSpacing: "0.02em",
              color: "var(--text-primary, #F0FDFA)",
            }}
          >
            Fluensea
          </span>
        </Link>

        {/* Center: Breadcrumb — language + depth zone */}
        <div className="hidden md:flex items-center gap-6">
          {/* Breadcrumb */}
          <div
            className="flex items-center gap-2"
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 12,
              letterSpacing: "0.06em",
              color: "var(--text-secondary, #7BA8A0)",
            }}
          >
            <span style={{ fontSize: 16 }}>{langMeta.flag}</span>
            <span>{langMeta.name}</span>
            <span style={{ color: "var(--text-ghost, #2D5A52)", fontSize: 14 }}>
              ›
            </span>
            <span style={{ color: "var(--text-secondary, #6B9E96)" }}>
              {zoneName}
            </span>
          </div>

          {/* Nav items */}
          <div className="flex items-center gap-1">
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
                  className="group"
                  onClick={(e) => {
                    handleLinkClick(e, item.href);
                  }}
                >
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 relative"
                    style={{
                      background: "transparent",
                    }}
                  >
                    <Icon
                      className="w-3.5 h-3.5"
                      style={{
                        color: isActive
                          ? "var(--text-primary, #EDF6F4)"
                          : "var(--text-muted, #2E5C54)",
                      }}
                    />
                    <span
                      className="text-xs font-medium"
                      style={{
                        fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                        color: isActive
                          ? "var(--text-primary, #EDF6F4)"
                          : "var(--text-muted, #2E5C54)",
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      {item.label}
                    </span>
                    {isActive && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: -2,
                          left: 0,
                          right: 0,
                          height: 2,
                          background: "var(--teal, #0D9488)",
                          borderRadius: 1,
                        }}
                      />
                    )}
                  </div>
                </Link>
              );
            })}

            {/* Immerse button — opens stream selection modal */}
            <button
              onClick={openSelectModal}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 relative"
              style={{ background: "transparent" }}
              aria-label="Open immersion streams"
            >
              {immerseIsPlaying && (
                <span
                  className="absolute -top-0.5 -right-0.5 block h-2 w-2 rounded-full"
                  style={{
                    background: "var(--teal, #0D9488)",
                    boxShadow: "0 0 6px rgba(13, 148, 136, 0.6)",
                    animation: "immerse-pulse 2s ease-in-out infinite",
                  }}
                />
              )}
              <Headphones
                className="w-3.5 h-3.5"
                style={{
                  color: immerseIsOpen
                    ? "var(--teal, #0D9488)"
                    : "var(--text-muted, #2E5C54)",
                }}
              />
              <span
                className="text-xs font-medium"
                style={{
                  fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  color: immerseIsOpen
                    ? "var(--teal, #0D9488)"
                    : "var(--text-muted, #2E5C54)",
                  fontWeight: immerseIsOpen ? 500 : 400,
                }}
              >
                Immerse
              </span>
              <style jsx>{`
                @keyframes immerse-pulse {
                  0%,
                  100% {
                    opacity: 1;
                    transform: scale(1);
                  }
                  50% {
                    opacity: 0.6;
                    transform: scale(1.3);
                  }
                }
              `}</style>
            </button>

            {/* Community */}
            {(() => {
              const communityHref = "/community";
              const isActive = currentPath.startsWith(communityHref);
              return (
                <Link
                  key={communityHref}
                  href={communityHref}
                  className="group"
                  onClick={(e) => handleLinkClick(e, communityHref)}
                >
                  <div
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 relative"
                    style={{
                      background: "transparent",
                    }}
                  >
                    <Users
                      className="w-3.5 h-3.5"
                      style={{
                        color: isActive
                          ? "var(--text-primary, #EDF6F4)"
                          : "var(--text-muted, #2E5C54)",
                      }}
                    />
                    <span
                      className="text-xs font-medium"
                      style={{
                        fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                        color: isActive
                          ? "var(--text-primary, #EDF6F4)"
                          : "var(--text-muted, #2E5C54)",
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      Community
                    </span>
                    {isActive && (
                      <span
                        style={{
                          position: "absolute",
                          bottom: -2,
                          left: 0,
                          right: 0,
                          height: 2,
                          background: "var(--teal, #0D9488)",
                          borderRadius: 1,
                        }}
                      />
                    )}
                  </div>
                </Link>
              );
            })()}

            {/* Admin nav items */}
            {isAdmin && (
              <>
                {(() => {
                  const adminHref = "/admin/donations";
                  const isActive = currentPath.startsWith(adminHref);
                  return (
                    <Link key={adminHref} href={adminHref} className="group">
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 relative"
                        style={{
                          background: "transparent",
                        }}
                      >
                        <Settings
                          className="w-3.5 h-3.5"
                          style={{
                            color: isActive
                              ? "var(--text-primary, #EDF6F4)"
                              : "var(--text-muted, #2E5C54)",
                          }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{
                            fontFamily:
                              "var(--font-inter, 'Inter', sans-serif)",
                            color: isActive
                              ? "var(--text-primary, #EDF6F4)"
                              : "var(--text-muted, #2E5C54)",
                          }}
                        >
                          Donations
                        </span>
                        {isActive && (
                          <span
                            style={{
                              position: "absolute",
                              bottom: -2,
                              left: 0,
                              right: 0,
                              height: 2,
                              background: "var(--teal, #0D9488)",
                              borderRadius: 1,
                            }}
                          />
                        )}
                      </div>
                    </Link>
                  );
                })()}
                {(() => {
                  const costsHref = "/admin/costs";
                  const isActive = currentPath.startsWith(costsHref);
                  return (
                    <Link key={costsHref} href={costsHref} className="group">
                      <div
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 relative"
                        style={{
                          background: "transparent",
                        }}
                      >
                        <BarChart
                          className="w-3.5 h-3.5"
                          style={{
                            color: isActive
                              ? "var(--text-primary, #EDF6F4)"
                              : "var(--text-muted, #2E5C54)",
                          }}
                        />
                        <span
                          className="text-xs font-medium"
                          style={{
                            fontFamily:
                              "var(--font-inter, 'Inter', sans-serif)",
                            color: isActive
                              ? "var(--text-primary, #EDF6F4)"
                              : "var(--text-muted, #2E5C54)",
                          }}
                        >
                          Costs
                        </span>
                        {isActive && (
                          <span
                            style={{
                              position: "absolute",
                              bottom: -2,
                              left: 0,
                              right: 0,
                              height: 2,
                              background: "var(--teal, #0D9488)",
                              borderRadius: 1,
                            }}
                          />
                        )}
                      </div>
                    </Link>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        {/* Right: Streak + XP chip + Avatar */}
        <div className="flex items-center gap-3">
          {/* Streak */}
          {streak > 0 && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-dim, rgba(255,255,255,0.07))",
              }}
              title="Daily streak"
            >
              <Flame
                className="w-3.5 h-3.5"
                style={{ color: "var(--text-muted, #2E5C54)" }}
              />
              <span
                className="text-xs font-semibold tabular-nums"
                style={{
                  fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                  color: "var(--text-secondary, #6B9E96)",
                }}
              >
                {streak}
              </span>
            </div>
          )}

          {/* Depth Indicator — replaces simple word count chip */}
          <DepthIndicator wordCount={wordsEncountered} />

          {/* Avatar dropdown trigger */}
          <div ref={accountMenuRef} className="relative">
            <button
              onClick={() => setAccountMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 group focus:outline-none"
              aria-expanded={accountMenuOpen}
              aria-haspopup="true"
            >
              <div
                className="w-8 h-8 rounded-full overflow-hidden transition-all duration-300 group-hover:scale-105"
                style={{
                  border: `2px solid ${accountMenuOpen ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.08)"}`,
                  background: "var(--bg-surface, #031820)",
                }}
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt="Avatar"
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User
                      className="w-4 h-4"
                      style={{ color: "var(--text-ghost, #2D5A52)" }}
                    />
                  </div>
                )}
              </div>
              <ChevronDown
                className={cn(
                  "w-3 h-3 transition-transform duration-200",
                  accountMenuOpen ? "rotate-180" : "",
                )}
                style={{ color: "var(--text-ghost, #2D5A52)" }}
              />
            </button>

            {/* Dropdown */}
            {accountMenuOpen && (
              <div
                className="absolute right-0 top-full mt-3 min-w-max rounded-xl border overflow-hidden z-50"
                style={{
                  background: "var(--bg-elevated, #052030)",
                  borderColor: "var(--border-dim, rgba(255,255,255,0.07))",
                  boxShadow:
                    "0 12px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
                  backdropFilter: "blur(16px)",
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
                    className="flex items-center px-5 py-3 text-sm font-medium transition-all duration-150 border-b last:border-b-0 whitespace-nowrap"
                    style={{
                      fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                      color: "var(--text-primary, #F0FDFA)",
                      borderColor: "rgba(255, 255, 255, 0.04)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color =
                        "var(--text-primary, #EDF6F4)";
                      e.currentTarget.style.backgroundColor =
                        "rgba(255, 255, 255, 0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color =
                        "var(--text-primary, #EDF6F4)";
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

      {/* Bottom shimmer line on scroll */}
      {scrolled && (
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.06) 50%, transparent 100%)",
          }}
        />
      )}
    </nav>
  );
}

export default OceanNavigation;
