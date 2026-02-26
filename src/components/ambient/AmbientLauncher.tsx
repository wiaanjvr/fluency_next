"use client";

/**
 * AmbientLauncher.tsx
 *
 * A subtle button that lives in the dashboard nav area.
 * Clicking it opens a minimal popover with Radio / Podcast options
 * and a scrollable list of available stations or episodes.
 */

import { useAmbientPlayer } from "@/contexts/AmbientPlayerContext";
import type {
  AmbientStation,
  AmbientEpisode,
} from "@/contexts/AmbientPlayerContext";
import { cn } from "@/lib/utils";
import {
  Radio,
  Podcast,
  ChevronRight,
  Loader2,
  Headphones,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, KeyboardEvent } from "react";
import { createPortal } from "react-dom";

const LS_MODE_KEY = "fluensea_ambient_mode";

type Tab = "radio" | "podcast";

// ── Difficulty badge ─────────────────────────────────────────────────────────
function DifficultyBadge({ level }: { level: string }) {
  const colours: Record<string, string> = {
    beginner: "rgba(61,214,181,0.15)",
    elementary: "rgba(61,214,181,0.12)",
    intermediate: "rgba(42,100,160,0.2)",
    advanced: "rgba(100,42,42,0.2)",
  };
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize shrink-0"
      style={{
        background: colours[level] ?? "rgba(255,255,255,0.08)",
        color: "var(--seafoam, #6ecdc4)",
        border: "1px solid rgba(61,214,181,0.15)",
        fontFamily: "Outfit, sans-serif",
      }}
    >
      {level}
    </span>
  );
}

// ── Popover panel ─────────────────────────────────────────────────────────────
interface PopoverProps {
  onClose: () => void;
}

function AmbientPopover({ onClose }: PopoverProps) {
  const {
    stations,
    episodes,
    isLoading,
    currentStation,
    currentEpisode,
    fetchStations,
    fetchEpisodes,
    openAmbient,
    playStation,
    playEpisode,
  } = useAmbientPlayer();

  const defaultTab: Tab =
    typeof window !== "undefined"
      ? ((localStorage.getItem(LS_MODE_KEY) as Tab | null) ?? "radio")
      : "radio";

  const [tab, setTab] = useState<Tab>(defaultTab);

  // Fetch data for the active tab when the popover mounts or the tab changes.
  // We call fetchStations/fetchEpisodes directly — NOT openAmbient — so we
  // only load data without triggering auto-play or ambientView changes.
  useEffect(() => {
    if (tab === "radio") {
      fetchStations();
    } else {
      fetchEpisodes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleStationClick = (station: AmbientStation) => {
    playStation(station);
    onClose();
  };

  const handleEpisodeClick = (episode: AmbientEpisode) => {
    playEpisode(episode);
    onClose();
  };

  const handleTabSwitch = (next: Tab) => {
    setTab(next);
  };

  return (
    <div
      className="rounded-xl overflow-hidden shadow-2xl"
      style={{
        background: "rgba(11, 28, 44, 0.97)",
        border: "1px solid rgba(61, 214, 181, 0.14)",
        backdropFilter: "blur(16px)",
        width: 280,
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <span
          className="text-sm font-semibold tracking-wide"
          style={{ color: "var(--sand)", fontFamily: "Outfit, sans-serif" }}
        >
          Ambient Mode
        </span>
        <div
          className="flex items-center gap-1 p-0.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          {(["radio", "podcast"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTabSwitch(t)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-200",
              )}
              style={{
                fontFamily: "Outfit, sans-serif",
                background: tab === t ? "rgba(61,214,181,0.15)" : "transparent",
                color: tab === t ? "var(--turquoise)" : "rgba(255,255,255,0.4)",
              }}
            >
              {t === "radio" ? (
                <Radio className="w-3 h-3" />
              ) : (
                <Podcast className="w-3 h-3" />
              )}
              {t === "radio" ? "Radio" : "Podcasts"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto" style={{ maxHeight: 300 }}>
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6">
            <Loader2
              className="w-4 h-4 animate-spin"
              style={{ color: "var(--turquoise)" }}
            />
            <span
              className="text-xs"
              style={{
                color: "rgba(255,255,255,0.4)",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              Loading…
            </span>
          </div>
        ) : tab === "radio" ? (
          stations.length === 0 ? (
            <EmptyState label="No stations found for your language." />
          ) : (
            stations.map((s: AmbientStation) => (
              <button
                key={s.id}
                onClick={() => handleStationClick(s)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left group transition-colors duration-150"
                style={{
                  background:
                    currentStation?.id === s.id
                      ? "rgba(61,214,181,0.07)"
                      : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (currentStation?.id !== s.id)
                    (e.currentTarget as HTMLElement).style.background =
                      "rgba(255,255,255,0.04)";
                }}
                onMouseLeave={(e) => {
                  if (currentStation?.id !== s.id)
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                }}
              >
                <Radio
                  className="w-3.5 h-3.5 shrink-0"
                  style={{
                    color:
                      currentStation?.id === s.id
                        ? "var(--turquoise)"
                        : "rgba(255,255,255,0.25)",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm truncate font-medium"
                    style={{
                      color:
                        currentStation?.id === s.id
                          ? "var(--turquoise)"
                          : "var(--sand)",
                      fontFamily: "Outfit, sans-serif",
                    }}
                  >
                    {s.name}
                  </p>
                  <p
                    className="text-xs"
                    style={{
                      color: "rgba(255,255,255,0.35)",
                      fontFamily: "Outfit, sans-serif",
                    }}
                  >
                    {s.country}
                    {s.bitrate > 0 && ` · ${s.bitrate} kbps`}
                  </p>
                </div>
                {currentStation?.id === s.id && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "var(--turquoise)" }}
                  />
                )}
              </button>
            ))
          )
        ) : episodes.length === 0 ? (
          <EmptyState label="No podcast episodes found for your language." />
        ) : (
          episodes.map((ep: AmbientEpisode, i: number) => (
            <button
              key={`${ep.feed_title}-${i}`}
              onClick={() => handleEpisodeClick(ep)}
              className="w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors duration-150"
              style={{
                background:
                  currentEpisode?.audio_url === ep.audio_url
                    ? "rgba(61,214,181,0.07)"
                    : "transparent",
              }}
              onMouseEnter={(e) => {
                if (currentEpisode?.audio_url !== ep.audio_url)
                  (e.currentTarget as HTMLElement).style.background =
                    "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                if (currentEpisode?.audio_url !== ep.audio_url)
                  (e.currentTarget as HTMLElement).style.background =
                    "transparent";
              }}
            >
              <Podcast
                className="w-3.5 h-3.5 shrink-0 mt-0.5"
                style={{
                  color:
                    currentEpisode?.audio_url === ep.audio_url
                      ? "var(--turquoise)"
                      : "rgba(255,255,255,0.25)",
                }}
              />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm truncate font-medium"
                  style={{
                    color:
                      currentEpisode?.audio_url === ep.audio_url
                        ? "var(--turquoise)"
                        : "var(--sand)",
                    fontFamily: "Outfit, sans-serif",
                  }}
                >
                  {ep.episode_title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p
                    className="text-xs truncate"
                    style={{
                      color: "rgba(255,255,255,0.35)",
                      fontFamily: "Outfit, sans-serif",
                    }}
                  >
                    {ep.feed_title}
                  </p>
                  <DifficultyBadge level={ep.difficulty} />
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div
        className="px-4 py-2 flex items-center gap-1.5"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <ChevronRight
          className="w-3 h-3"
          style={{ color: "rgba(255,255,255,0.2)" }}
        />
        <span
          className="text-[10px]"
          style={{
            color: "rgba(255,255,255,0.2)",
            fontFamily: "Outfit, sans-serif",
          }}
        >
          Audio continues while you navigate
        </span>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p
      className="text-xs text-center py-6 px-4"
      style={{
        color: "rgba(255,255,255,0.3)",
        fontFamily: "Outfit, sans-serif",
      }}
    >
      {label}
    </p>
  );
}

/**
 * PopoverPortalContainer
 * Renders children into document.body and positions the panel near the
 * anchorRef (the launcher button). This avoids clipping by header stacking
 * contexts and ensures the popover is visible above other content.
 */
function PopoverPortalContainer({
  anchorRef,
  children,
  onClose,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    function compute() {
      const anchor = anchorRef.current;
      const width = 280;
      if (!anchor) {
        setPos({ left: window.innerWidth - width - 12, top: 56 });
        return;
      }
      const rect = anchor.getBoundingClientRect();
      // try to align right edge of panel with right edge of anchor
      let left = Math.round(rect.right - width);
      left = Math.min(
        Math.max(8, left),
        Math.max(8, window.innerWidth - width - 8),
      );
      const top = Math.round(rect.bottom + 8);
      setPos({ left, top });
    }

    compute();
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [anchorRef]);

  // Close when clicking outside BOTH the anchor button and this panel.
  // This must live here because the panel is portalled into document.body —
  // it is never a DOM descendant of the anchor, so a check against anchorRef
  // alone in AmbientLauncher would always treat panel clicks as "outside".
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insidePanel = panelRef.current?.contains(target) ?? false;
      const insideAnchor = anchorRef.current?.contains(target) ?? false;
      if (!insidePanel && !insideAnchor) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [anchorRef, onClose]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        width: 280,
        zIndex: 9999,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

// ── Launcher trigger button ───────────────────────────────────────────────────

export function AmbientLauncher({
  className,
  variant = "default",
}: {
  className?: string;
  variant?: "default" | "nav";
}) {
  const { isPlaying, ambientView } = useAmbientPlayer();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  // Consider the Immerse nav-tab active only when the full container view is open.
  // This prevents the nav tab from being highlighted simply because the bottom
  // soundbar is playing audio.
  const isActive = ambientView === "container";

  const handleClick = () => {
    setOpen((o) => !o);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {variant === "nav" ? (
        // ── Nav-tab style (matches Course / Settings appearance) ──────────
        <button
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label="Open ambient mode"
          className="nav-tab relative group"
        >
          <div className="flex items-center gap-2">
            <Headphones
              className="w-4 h-4 transition-colors duration-200"
              style={{
                color: isActive ? "var(--turquoise)" : "var(--seafoam)",
                opacity: isActive ? 1 : 0.6,
              }}
            />
            <span
              className="text-sm font-body font-medium transition-colors duration-200"
              style={{
                color: isActive ? "var(--turquoise)" : "var(--sand)",
                opacity: isActive ? 1 : 0.7,
              }}
            >
              Immerse
            </span>
            {/* Playing indicator dot */}
            {isActive && isPlaying && (
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 ambient-pulse"
                style={{
                  background: "var(--turquoise)",
                  boxShadow: "0 0 6px var(--turquoise)",
                }}
              />
            )}
          </div>
          {/* Active indicator underline */}
          <div
            className={cn(
              "mt-1 h-0.5 rounded-full transition-all duration-300",
              isActive
                ? "w-full opacity-100"
                : "w-0 group-hover:w-full opacity-0 group-hover:opacity-30",
            )}
            style={{
              background: isActive ? "var(--turquoise)" : "var(--seafoam)",
            }}
          />
          <style>{`
            @keyframes ambientPulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.4; transform: scale(0.75); }
            }
            .ambient-pulse { animation: ambientPulse 1.5s ease-in-out infinite; }
          `}</style>
        </button>
      ) : (
        // ── Default pill style ──────────────────────────────────────────────
        <button
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-expanded={open}
          aria-haspopup="true"
          aria-label="Open ambient mode"
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg",
            "text-xs font-medium transition-all duration-200",
            "hover:opacity-90 active:scale-95",
          )}
          style={{
            fontFamily: "Outfit, sans-serif",
            background: isActive
              ? "rgba(61, 214, 181, 0.12)"
              : "rgba(255, 255, 255, 0.05)",
            color: isActive ? "var(--turquoise)" : "rgba(255,255,255,0.5)",
            border: `1px solid ${
              isActive ? "rgba(61,214,181,0.25)" : "rgba(255,255,255,0.07)"
            }`,
          }}
        >
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-300",
              isActive && isPlaying ? "ambient-pulse" : "",
            )}
            style={{
              background: isActive
                ? "var(--turquoise)"
                : "rgba(255,255,255,0.2)",
              boxShadow:
                isActive && isPlaying ? "0 0 6px var(--turquoise)" : "none",
            }}
          />
          <span>Ambient</span>
          <style>{`
            @keyframes ambientPulse {
              0%, 100% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.4; transform: scale(0.75); }
            }
            .ambient-pulse { animation: ambientPulse 1.5s ease-in-out infinite; }
          `}</style>
        </button>
      )}

      {/* Popover: render into body via portal so it won't be clipped by header */}
      {open && (
        <PopoverPortalContainer
          anchorRef={containerRef}
          onClose={() => setOpen(false)}
        >
          <AmbientPopover onClose={() => setOpen(false)} />
        </PopoverPortalContainer>
      )}
    </div>
  );
}

export default AmbientLauncher;
