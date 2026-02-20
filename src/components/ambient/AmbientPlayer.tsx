"use client";

/**
 * AmbientPlayer.tsx
 *
 * Fixed bottom bar — 56 px tall — that slides up when ambient mode is active.
 * Frosted-glass effect over the midnight navy background.
 * Pure CSS animated wave icon; no external animation library.
 */

import { useAmbientPlayer } from "@/contexts/AmbientPlayerContext";
import { cn } from "@/lib/utils";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ── CSS-only wave bars ────────────────────────────────────────────────────────
function WaveBars({ isPlaying }: { isPlaying: boolean }) {
  return (
    <div
      className="flex items-end gap-[2px] h-5 w-5"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn("w-[3px] rounded-full", isPlaying ? "wave-bar" : "")}
          style={{
            background: "var(--turquoise)",
            height: isPlaying ? undefined : "30%",
            opacity: isPlaying ? 1 : 0.4,
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
      {/* Keyframes injected inline once at component level — see <style> below */}
    </div>
  );
}

// ── Volume slider ─────────────────────────────────────────────────────────────
function VolumeSlider({
  volume,
  onChange,
}: {
  volume: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={0}
      max={1}
      step={0.01}
      value={volume}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      aria-label="Volume"
      className="ambient-volume-slider"
      style={{ width: 72 }}
    />
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AmbientPlayer() {
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

  // Animate in/out
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const prevMode = useRef<typeof mode>(null);

  useEffect(() => {
    if (mode !== null && prevMode.current === null) {
      setMounted(true);
      requestAnimationFrame(() => setVisible(true));
    } else if (mode === null && prevMode.current !== null) {
      setVisible(false);
      prevMode.current = null; // update before early return so next open works
      const t = setTimeout(() => setMounted(false), 350);
      return () => clearTimeout(t);
    }
    prevMode.current = mode;
  }, [mode]);

  if (!mounted) return null;

  const isRadio = mode === "radio";
  const title = streamError
    ? "No working streams found"
    : isRadio
      ? (currentStation?.name ?? "Finding station…")
      : (currentEpisode?.episode_title ?? "Finding episode…");
  const subtitle = streamError
    ? "Check the launcher to pick a station manually"
    : !isRadio
      ? currentEpisode?.feed_title
      : undefined;
  const badge = isRadio ? "Radio" : "Podcast";

  return (
    <>
      {/* Wave-bar keyframes — injected once, lightweight */}
      <style>{`
        .wave-bar {
          animation: waveRise 0.7s ease-in-out infinite alternate;
        }
        @keyframes waveRise {
          0%   { height: 25%; }
          100% { height: 100%; }
        }
        .ambient-volume-slider {
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
        .ambient-volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: var(--turquoise);
          cursor: pointer;
          box-shadow: 0 0 4px rgba(61,214,181,0.5);
        }
        .ambient-volume-slider::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border: none;
          border-radius: 50%;
          background: var(--turquoise);
          cursor: pointer;
        }
      `}</style>

      <div
        role="region"
        aria-label="Ambient audio player"
        className={cn(
          // Layout
          "fixed bottom-0 left-0 right-0 z-[60]",
          "h-[56px] px-4 md:px-6",
          "flex items-center gap-4",
          // Glass effect
          "backdrop-blur-md",
          // Transition
          "transition-transform duration-350 ease-out",
        )}
        style={{
          background: "rgba(11, 28, 44, 0.82)",
          borderTop: "1px solid rgba(61, 214, 181, 0.18)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
        }}
      >
        {/* LEFT — Wave icon */}
        <WaveBars isPlaying={isPlaying} />

        {/* CENTRE — Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="text-[10px] font-semibold tracking-widest uppercase shrink-0"
              style={{
                color: streamError
                  ? "rgba(255,160,100,0.8)"
                  : "var(--turquoise)",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              {badge}
            </span>
            <span
              className="text-sm font-medium truncate"
              style={{
                color: streamError ? "rgba(255,200,150,0.8)" : "var(--sand)",
                fontFamily: "Outfit, sans-serif",
              }}
            >
              {title}
            </span>
          </div>
          {subtitle && (
            <span
              className="text-xs truncate"
              style={{
                color: streamError
                  ? "rgba(255,180,120,0.5)"
                  : "var(--seafoam, #6ecdc4)",
                opacity: 0.7,
                fontFamily: "Outfit, sans-serif",
              }}
            >
              {subtitle}
            </span>
          )}
        </div>

        {/* RIGHT — Controls */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Volume slider — hidden on mobile */}
          <div className="hidden md:flex items-center">
            <VolumeSlider
              volume={volume}
              onChange={(v) => {
                setVolume(v);
                // update CSS custom property for the gradient track
                const el = document.querySelector(
                  ".ambient-volume-slider",
                ) as HTMLInputElement | null;
                el?.style.setProperty("--val", String(Math.round(v * 100)));
              }}
            />
          </div>

          {/* Play / Pause — or Retry when all streams failed */}
          {streamError ? (
            <button
              onClick={mode === "podcast" ? retryEpisode : retryStream}
              aria-label={
                mode === "podcast" ? "Retry podcast" : "Retry radio stream"
              }
              title="Retry from first item"
              className="flex items-center justify-center transition-opacity duration-150 hover:opacity-80 active:scale-95"
              style={{ color: "rgba(255,160,100,0.9)" }}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={togglePlay}
              aria-label={
                isPlaying ? "Pause ambient audio" : "Play ambient audio"
              }
              className="flex items-center justify-center transition-opacity duration-150 hover:opacity-80 active:scale-95"
              style={{ color: "var(--turquoise)" }}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>
          )}

          {/* Close */}
          <button
            onClick={closeAmbient}
            aria-label="Close ambient player"
            className="flex items-center justify-center transition-opacity duration-150 hover:opacity-80 active:scale-95"
            style={{ color: "var(--seafoam, #6ecdc4)", opacity: 0.5 }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
}

export default AmbientPlayer;
