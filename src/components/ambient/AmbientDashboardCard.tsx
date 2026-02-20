"use client";

/**
 * AmbientDashboardCard.tsx
 *
 * Replaces the NextLessonHero on the dashboard when ambient mode is active.
 * Styled identically to the lesson hero card (ocean-card, caustic-bg, same
 * min-height) with a professional voice-visualiser animation as the hero
 * element, and all the controls normally found on the bottom sound bar.
 */

import { useAmbientPlayer } from "@/contexts/AmbientPlayerContext";
import { cn } from "@/lib/utils";
import {
  Pause,
  Play,
  RotateCcw,
  X,
  Radio,
  Podcast,
  Volume2,
  VolumeX,
} from "lucide-react";

// ── Spectrum bars visualiser ──────────────────────────────────────────────────
// A wide array of bars at varying heights with staggered animations.
const BAR_COUNT = 28;

function SpectrumVisualiser({ isPlaying }: { isPlaying: boolean }) {
  return (
    <>
      <style>{`
        @keyframes specBar {
          0%, 100% { transform: scaleY(0.15); }
          50%       { transform: scaleY(1); }
        }
        .spec-bar {
          animation: specBar 0.9s ease-in-out infinite alternate;
          transform-origin: bottom;
        }
      `}</style>
      <div
        className="flex items-end justify-center gap-[3px]"
        style={{ height: 80, width: "100%" }}
        aria-hidden="true"
      >
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          // Vary bar height caps so they look organic
          const maxPct = 40 + Math.sin(i * 0.7) * 30 + Math.cos(i * 1.3) * 20;
          const delay = (i * 0.045).toFixed(3);
          const duration = (0.7 + (i % 5) * 0.12).toFixed(2);
          return (
            <span
              key={i}
              className={cn("rounded-full", isPlaying ? "spec-bar" : "")}
              style={{
                width: 4,
                height: isPlaying ? `${Math.max(12, maxPct)}%` : "10%",
                background: isPlaying
                  ? `linear-gradient(to top, var(--turquoise), rgba(61,214,181,0.35))`
                  : "rgba(61,214,181,0.18)",
                animationDuration: isPlaying ? `${duration}s` : undefined,
                animationDelay: isPlaying ? `${delay}s` : undefined,
                transition: "height 0.4s ease",
                opacity: isPlaying ? 0.85 + (i % 3) * 0.05 : 0.35,
              }}
            />
          );
        })}
      </div>
    </>
  );
}

// ── Pulsing orb behind the icon ───────────────────────────────────────────────
function PulsingOrb({ isPlaying }: { isPlaying: boolean }) {
  return (
    <>
      <style>{`
        @keyframes orbPulse {
          0%   { transform: scale(1);    opacity: 0.18; }
          50%  { transform: scale(1.35); opacity: 0.06; }
          100% { transform: scale(1);    opacity: 0.18; }
        }
        @keyframes orbPulse2 {
          0%   { transform: scale(1);    opacity: 0.12; }
          50%  { transform: scale(1.6);  opacity: 0.03; }
          100% { transform: scale(1);    opacity: 0.12; }
        }
        .orb-ring-1 { animation: orbPulse  2s ease-in-out infinite; }
        .orb-ring-2 { animation: orbPulse2 2.6s ease-in-out infinite 0.4s; }
      `}</style>

      {/* Outer ring */}
      <div
        className={cn(
          "absolute rounded-full pointer-events-none",
          isPlaying ? "orb-ring-2" : "",
        )}
        style={{
          width: 160,
          height: 160,
          background:
            "radial-gradient(circle, rgba(61,214,181,0.12) 0%, transparent 70%)",
          border: "1px solid rgba(61,214,181,0.12)",
        }}
      />
      {/* Inner ring */}
      <div
        className={cn(
          "absolute rounded-full pointer-events-none",
          isPlaying ? "orb-ring-1" : "",
        )}
        style={{
          width: 100,
          height: 100,
          background:
            "radial-gradient(circle, rgba(61,214,181,0.2) 0%, transparent 70%)",
          border: "1px solid rgba(61,214,181,0.22)",
        }}
      />
    </>
  );
}

// ── Volume slider ─────────────────────────────────────────────────────────────
function VolumeControl({
  volume,
  onChange,
}: {
  volume: number;
  onChange: (v: number) => void;
}) {
  const pct = Math.round(volume * 100);
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(volume === 0 ? 0.4 : 0)}
        aria-label={volume === 0 ? "Unmute" : "Mute"}
        style={{ color: "var(--seafoam)", opacity: 0.7 }}
        className="transition-opacity hover:opacity-100"
      >
        {volume === 0 ? (
          <VolumeX className="w-4 h-4" />
        ) : (
          <Volume2 className="w-4 h-4" />
        )}
      </button>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label="Volume"
        className="ambient-dash-volume"
        style={{
          ["--val" as string]: `${pct}`,
          width: 96,
        }}
      />
      <style>{`
        .ambient-dash-volume {
          -webkit-appearance: none;
          appearance: none;
          height: 3px;
          border-radius: 9999px;
          outline: none;
          cursor: pointer;
          background: linear-gradient(
            to right,
            var(--turquoise) 0%,
            var(--turquoise) calc(var(--val, 40) * 1%),
            rgba(255,255,255,0.1) calc(var(--val, 40) * 1%),
            rgba(255,255,255,0.1) 100%
          );
        }
        .ambient-dash-volume::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px; height: 12px;
          border-radius: 50%;
          background: var(--turquoise);
          cursor: pointer;
          box-shadow: 0 0 6px rgba(61,214,181,0.5);
        }
        .ambient-dash-volume::-moz-range-thumb {
          width: 12px; height: 12px;
          border: none; border-radius: 50%;
          background: var(--turquoise); cursor: pointer;
        }
      `}</style>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AmbientDashboardCard({ className }: { className?: string }) {
  const {
    mode,
    isPlaying,
    volume,
    currentStation,
    currentEpisode,
    streamError,
    togglePlay,
    closeAmbient,
    setVolume,
    retryStream,
    retryEpisode,
  } = useAmbientPlayer();

  const isRadio = mode === "radio";

  const title = streamError
    ? "No working streams found"
    : isRadio
      ? (currentStation?.name ?? "Finding station…")
      : (currentEpisode?.episode_title ?? "Finding episode…");

  const subtitle = streamError
    ? "Select a different station from Ambient"
    : isRadio
      ? [
          currentStation?.country,
          currentStation?.bitrate ? `${currentStation.bitrate} kbps` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : currentEpisode?.feed_title;

  const badge = isRadio ? "Radio" : "Podcast";
  const BadgeIcon = isRadio ? Radio : Podcast;

  return (
    <div
      className={cn(
        "ocean-card caustic-bg relative overflow-hidden w-full",
        "ocean-card-animate",
        className,
      )}
      style={{
        background: `linear-gradient(135deg, rgba(13, 27, 42, 0.97) 0%, rgba(8, 18, 32, 0.95) 100%)`,
        minHeight: "320px",
      }}
    >
      {/* Caustic shimmer layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 30% 60%, rgba(30, 107, 114, 0.1) 0%, transparent 55%)`,
          animation: "caustic3 22s ease-in-out infinite",
        }}
      />

      {/* Glowing teal accent top-right */}
      <div
        className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none"
        style={{
          background: `radial-gradient(circle, rgba(61,214,181,0.06) 0%, transparent 70%)`,
          filter: "blur(24px)",
          transform: "translate(30%, -30%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-10 flex flex-col h-full min-h-[320px]">
        {/* Top row: badge + close */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BadgeIcon
              className="w-4 h-4"
              style={{
                color: streamError
                  ? "rgba(255,160,100,0.8)"
                  : "var(--turquoise)",
              }}
            />
            <span
              className="text-xs font-semibold tracking-widest uppercase"
              style={{
                color: streamError
                  ? "rgba(255,160,100,0.8)"
                  : "var(--turquoise)",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              {badge}
            </span>
            {/* Live pulse dot */}
            {!streamError && isPlaying && (
              <span
                className="w-1.5 h-1.5 rounded-full ambient-pulse"
                style={{
                  background: "var(--turquoise)",
                  boxShadow: "0 0 6px var(--turquoise)",
                }}
              />
            )}
          </div>

          {/* Close / stop */}
          <button
            onClick={closeAmbient}
            aria-label="Stop ambient audio"
            className="flex items-center justify-center w-8 h-8 rounded-full transition-all duration-150 hover:opacity-100"
            style={{
              background: "rgba(255,255,255,0.04)",
              color: "var(--seafoam)",
              opacity: 0.5,
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main layout: visualiser left, info right */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 flex-1">
          {/* ── Voice visualiser column ── */}
          <div className="flex flex-col items-center gap-6 shrink-0">
            {/* Orb + icon */}
            <div
              className="relative flex items-center justify-center"
              style={{ width: 160, height: 160 }}
            >
              <PulsingOrb isPlaying={isPlaying && !streamError} />
              {/* Centre circle */}
              <div
                className="relative z-10 flex items-center justify-center rounded-full"
                style={{
                  width: 72,
                  height: 72,
                  background: streamError
                    ? "rgba(255,100,60,0.08)"
                    : "rgba(61,214,181,0.1)",
                  border: `1.5px solid ${streamError ? "rgba(255,160,100,0.3)" : "rgba(61,214,181,0.3)"}`,
                  boxShadow:
                    isPlaying && !streamError
                      ? "0 0 24px rgba(61,214,181,0.2), inset 0 0 16px rgba(61,214,181,0.08)"
                      : "none",
                  transition: "box-shadow 0.4s ease",
                }}
              >
                <BadgeIcon
                  className="w-7 h-7"
                  style={{
                    color: streamError
                      ? "rgba(255,160,100,0.7)"
                      : "var(--turquoise)",
                  }}
                />
              </div>
            </div>

            {/* Spectrum bars */}
            <div style={{ width: 160 }}>
              <SpectrumVisualiser isPlaying={isPlaying && !streamError} />
            </div>
          </div>

          {/* ── Info + controls column ── */}
          <div className="flex flex-col flex-1 min-w-0 justify-between h-full gap-6">
            {/* Title & subtitle */}
            <div>
              <h2
                className="font-display text-3xl md:text-4xl font-semibold mb-2 tracking-tight"
                style={{
                  color: streamError ? "rgba(255,200,150,0.9)" : "var(--sand)",
                  lineHeight: 1.15,
                }}
              >
                {title}
              </h2>
              {subtitle && (
                <p
                  className="text-sm font-body"
                  style={{ color: "var(--seafoam)", opacity: 0.7 }}
                >
                  {subtitle}
                </p>
              )}
            </div>

            {/* Ambient label */}
            {!streamError && (
              <p
                className="text-xs uppercase tracking-widest font-medium"
                style={{
                  color: "var(--seafoam)",
                  opacity: 0.45,
                  fontFamily: "Outfit, sans-serif",
                }}
              >
                Now playing · Ambient mode
              </p>
            )}

            {/* Controls */}
            <div className="flex items-center gap-5 flex-wrap">
              {/* Play / Pause / Retry */}
              {streamError ? (
                <button
                  onClick={isRadio ? retryStream : retryEpisode}
                  aria-label="Retry"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                  style={{
                    background: "rgba(255,160,100,0.1)",
                    color: "rgba(255,160,100,0.9)",
                    border: "1px solid rgba(255,160,100,0.2)",
                    fontFamily: "Outfit, sans-serif",
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry
                </button>
              ) : (
                <button
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    background: "rgba(61,214,181,0.15)",
                    border: "1.5px solid rgba(61,214,181,0.3)",
                    color: "var(--turquoise)",
                    boxShadow: isPlaying
                      ? "0 0 16px rgba(61,214,181,0.2)"
                      : "none",
                  }}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 translate-x-0.5" />
                  )}
                </button>
              )}

              {/* Volume */}
              {!streamError && (
                <VolumeControl volume={volume} onChange={setVolume} />
              )}
            </div>
          </div>
        </div>

        {/* Bottom hint */}
        <div className="mt-8 flex items-center gap-2">
          <div
            className="w-px h-3"
            style={{ background: "rgba(255,255,255,0.1)" }}
          />
          <span
            className="text-xs font-body"
            style={{ color: "var(--seafoam)", opacity: 0.35 }}
          >
            Click <strong style={{ opacity: 0.7 }}>Immerse</strong> in the nav
            to return to your lessons — audio keeps playing
          </span>
        </div>
      </div>

      <style>{`
        @keyframes ambientPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.75); }
        }
        .ambient-pulse { animation: ambientPulse 1.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

export default AmbientDashboardCard;
