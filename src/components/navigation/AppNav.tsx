"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Users,
  Headphones,
  User,
  ChevronDown,
  Flame,
  Settings,
  Compass,
  Waves,
} from "lucide-react";
import { useImmerse } from "@/components/immerse";
import { DepthIndicator } from "@/components/navigation/DepthIndicator";
import { LanguageDepthSelector } from "@/components/navigation/LanguageDepthSelector";
import { getDepthLevel } from "@/lib/progression/depthLevels";

// ============================================================================
// AppNav — Redesigned top navigation bar
//
// Left zone:   Logo + LanguageDepthSelector
// Center zone: Primary nav (Course, Propel) — prominent pill items
// Right zone:  Secondary icons (Chart, Community) + Immerse + DepthIndicator + Avatar
// ============================================================================

interface AppNavProps {
  streak?: number;
  wordsEncountered?: number;
  avatarUrl?: string;
  className?: string;
  isAdmin?: boolean;
  onBeforeNavigate?: (href: string) => void;
}

// Primary navigation — always visible, prominent
const PRIMARY_NAV = [
  { href: "/dashboard", label: "Course", icon: Compass },
  { href: "/propel", label: "Propel", icon: Waves },
] as const;

// Secondary navigation — icon-only with tooltips
const SECONDARY_NAV = [
  { href: "/chart", label: "Chart", icon: BarChart3 },
  { href: "/community", label: "Community", icon: Users },
] as const;

export function AppNav({
  streak = 0,
  wordsEncountered = 0,
  avatarUrl,
  className,
  isAdmin = false,
  onBeforeNavigate,
}: AppNavProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const {
    isPlaying: immerseIsPlaying,
    isOpen: immerseIsOpen,
    openSelectModal,
  } = useImmerse();

  const depthLevel = getDepthLevel(wordsEncountered);

  // Track scroll
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close account menu on outside click
  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountMenuOpen]);

  const handleLinkClick = useCallback(
    (e: React.MouseEvent, href: string) => {
      if (onBeforeNavigate && !pathname.startsWith(href)) {
        e.preventDefault();
        onBeforeNavigate(href);
      }
    },
    [onBeforeNavigate, pathname],
  );

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
      className={cn(
        "dashboard-topnav fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled && "scrolled",
        className,
      )}
      style={{
        height: 64,
      }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="w-full h-full px-4 md:px-6 flex items-center justify-between">
        {/* ── Left zone: Logo + Language selector ────────────────────── */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 group"
            onClick={(e) => handleLinkClick(e, "/dashboard")}
          >
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
              className="hidden sm:inline"
              style={{
                fontFamily: "var(--font-display, 'Playfair Display', serif)",
                fontWeight: 600,
                fontStyle: "normal",
                fontSize: 18,
                letterSpacing: "0.02em",
                color: "var(--text-primary, #F0FDFA)",
              }}
            >
              Fluensea
            </span>
          </Link>

          {/* Language + depth selector */}
          <div className="hidden md:block">
            <LanguageDepthSelector wordCount={wordsEncountered} />
          </div>
        </div>

        {/* ── Center zone: Primary navigation — pill-style switcher ── */}
        <div className="hidden md:flex items-center gap-0">
          <div
            className="nav-pill-toggle flex"
            style={{
              background: "rgba(4, 24, 36, 0.6)",
              borderRadius: 12,
              padding: 3,
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            {PRIMARY_NAV.map((item) => {
              const isActive = isActiveRoute(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group"
                  onClick={(e) => handleLinkClick(e, item.href)}
                >
                  <div
                    className="flex items-center gap-2 px-4 py-2 rounded-[10px] transition-all duration-200 relative"
                    style={{
                      background: isActive
                        ? "var(--bg-elevated, #052030)"
                        : "transparent",
                      border: isActive
                        ? "1px solid rgba(255, 255, 255, 0.08)"
                        : "1px solid transparent",
                    }}
                  >
                    <Icon
                      className="w-4 h-4"
                      style={{
                        color: isActive
                          ? depthLevel.colorPrimaryHex
                          : "var(--text-muted, #2E5C54)",
                      }}
                    />
                    <span
                      className="text-sm font-medium"
                      style={{
                        fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                        color: isActive
                          ? "var(--text-primary, #F0FDFA)"
                          : "var(--text-muted, #2E5C54)",
                        fontWeight: isActive ? 600 : 400,
                      }}
                    >
                      {item.label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="primary-nav-indicator"
                        className="absolute inset-0 rounded-[10px] -z-10"
                        style={{
                          background: `${depthLevel.colorPrimaryHex}10`,
                        }}
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ── Right zone: Secondary nav + Immerse + Depth + Avatar ──── */}
        <div className="flex items-center gap-1.5">
          {/* Secondary nav: icon-only buttons with tooltips */}
          {SECONDARY_NAV.map((item) => {
            const isActive = isActiveRoute(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={(e) => handleLinkClick(e, item.href)}
                className="relative group"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                  style={{
                    background: isActive
                      ? "rgba(255,255,255,0.08)"
                      : "transparent",
                  }}
                  aria-label={item.label}
                >
                  <Icon
                    className="w-4 h-4"
                    style={{
                      color: isActive
                        ? "var(--text-primary, #F0FDFA)"
                        : "var(--text-muted, #2E5C54)",
                    }}
                  />
                  {/* TODO: Notification dot for Community (unread messages) */}
                  {item.href === "/community" && (
                    <span className="sr-only">
                      {/* Placeholder: notification dot would go here */}
                    </span>
                  )}
                </div>
                {/* Tooltip */}
                <div
                  className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
                  style={{
                    background: "var(--bg-elevated, #052030)",
                    color: "var(--text-secondary, #7BA8A0)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                  }}
                >
                  {item.label}
                </div>
              </Link>
            );
          })}

          {/* Divider */}
          <div
            className="hidden md:block w-px h-5 mx-1"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />

          {/* Immerse button — opens modal, NOT a nav link */}
          <button
            onClick={openSelectModal}
            className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 group"
            style={{
              background: immerseIsOpen
                ? "rgba(13,148,136,0.15)"
                : "transparent",
            }}
            aria-label="Open immersion streams"
          >
            {immerseIsPlaying && (
              <span
                className="absolute -top-0.5 -right-0.5 block h-2 w-2 rounded-full"
                style={{
                  background: "var(--teal, #0D9488)",
                  boxShadow: "0 0 6px rgba(13, 148, 136, 0.6)",
                  animation: "appnav-immerse-pulse 2s ease-in-out infinite",
                }}
              />
            )}
            <Headphones
              className="w-4 h-4"
              style={{
                color:
                  immerseIsOpen || immerseIsPlaying
                    ? "var(--teal, #0D9488)"
                    : "var(--text-muted, #2E5C54)",
              }}
            />
            {/* Tooltip */}
            <div
              className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
              style={{
                background: "var(--bg-elevated, #052030)",
                color: "var(--text-secondary, #7BA8A0)",
                border: "1px solid rgba(255,255,255,0.08)",
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
              }}
            >
              Immerse
            </div>
          </button>

          {/* Streak */}
          {streak > 0 && (
            <div
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid var(--border-dim, rgba(255,255,255,0.07))",
              }}
              title={`${streak} day streak`}
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

          {/* Depth indicator */}
          <div className="hidden md:block">
            <DepthIndicator wordCount={wordsEncountered} />
          </div>

          {/* Avatar dropdown */}
          <div ref={accountMenuRef} className="relative">
            <button
              onClick={() => setAccountMenuOpen((prev) => !prev)}
              className="flex items-center gap-1 group focus:outline-none"
              aria-expanded={accountMenuOpen}
              aria-haspopup="true"
              aria-label="Account menu"
            >
              <div
                className="w-8 h-8 rounded-full overflow-hidden transition-all duration-300 group-hover:scale-105"
                style={{
                  border: `2px solid ${accountMenuOpen ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.08)"}`,
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
                  "w-3 h-3 transition-transform duration-200 hidden sm:block",
                  accountMenuOpen && "rotate-180",
                )}
                style={{ color: "var(--text-ghost, #2D5A52)" }}
              />
            </button>

            {/* Account dropdown menu */}
            <AnimatePresence>
              {accountMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute right-0 top-full mt-3 min-w-max rounded-xl border overflow-hidden z-50"
                  style={{
                    transformOrigin: "top right",
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
                        e.currentTarget.style.backgroundColor =
                          "rgba(255, 255, 255, 0.04)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                      onClick={() => setAccountMenuOpen(false)}
                    >
                      {label}
                    </Link>
                  ))}

                  {/* Admin links */}
                  {isAdmin && (
                    <>
                      <div
                        style={{
                          height: 1,
                          background: "rgba(255,255,255,0.06)",
                        }}
                      />
                      {(
                        [
                          { label: "Donations", href: "/admin/donations" },
                          { label: "Costs", href: "/admin/costs" },
                        ] as const
                      ).map(({ label, href }) => (
                        <Link
                          key={href}
                          href={href}
                          className="flex items-center px-5 py-3 text-sm font-medium transition-all duration-150 border-b last:border-b-0 whitespace-nowrap"
                          style={{
                            fontFamily:
                              "var(--font-inter, 'Inter', sans-serif)",
                            color: "var(--text-secondary, #7BA8A0)",
                            borderColor: "rgba(255, 255, 255, 0.04)",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(255, 255, 255, 0.04)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }}
                          onClick={() => setAccountMenuOpen(false)}
                        >
                          <Settings className="w-3.5 h-3.5 mr-2 opacity-50" />
                          {label}
                        </Link>
                      ))}
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Bottom shimmer line on scroll */}
      {scrolled && (
        <div
          className="absolute bottom-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
          }}
        />
      )}

      {/* Pulse animation for immerse button */}
      <style jsx>{`
        @keyframes appnav-immerse-pulse {
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
    </nav>
  );
}

export default AppNav;
