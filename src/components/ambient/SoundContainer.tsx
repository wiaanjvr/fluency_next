"use client";

/**
 * SoundContainer.tsx
 *
 * Full-featured ambient player card shown in the dashboard hero area when the
 * user clicks "Immerse" while ambient mode is active.
 *
 * Replaces both the bottom soundbar AND the AmbientLauncher pop-over —
 * everything you need is in this single card.
 */

import { useAmbientPlayer } from "@/contexts/AmbientPlayerContext";
import type {
  AmbientStation,
  AmbientEpisode,
} from "@/contexts/AmbientPlayerContext";
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
  Headphones,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useState } from "react";

// ── Animated spectrum bars ────────────────────────────────────────────────────
const BAR_COUNT = 32;

function SpectrumVisualiser({ isPlaying }: { isPlaying: boolean }) {
  return (
    <>
      <style>{`
        @keyframes scBar {
          0%, 100% { transform: scaleY(0.12); }
          50%       { transform: scaleY(1); }
        }
        .sc-bar {
          animation: scBar 0.9s ease-in-out infinite alternate;
          transform-origin: bottom;
        }
      `}</style>
      <div
        className="flex items-end justify-center gap-[2px]"
        style={{ height: 56, width: "100%" }}
        aria-hidden="true"
      >
        {Array.from({ length: BAR_COUNT }).map((_, i) => {
          const maxPct = 35 + Math.sin(i * 0.65) * 28 + Math.cos(i * 1.2) * 18;
          const delay = (i * 0.04).toFixed(3);
          const dur = (0.65 + (i % 5) * 0.11).toFixed(2);
          return (
            <span
              key={i}
              className={cn("rounded-full", isPlaying ? "sc-bar" : "")}
              style={{
                width: 3,
                height: isPlaying ? `${Math.max(8, maxPct)}%` : "8%",
                background: isPlaying
                  ? `linear-gradient(to top, var(--turquoise), rgba(61,214,181,0.3))`
                  : "rgba(61,214,181,0.15)",
                animationDuration: isPlaying ? `${dur}s` : undefined,
                animationDelay: isPlaying ? `${delay}s` : undefined,
                transition: "height 0.4s ease",
                opacity: isPlaying ? 0.8 + (i % 3) * 0.07 : 0.3,
              }}
            />
          );
        })}
      </div>
    </>
  );
}

// ── Pulsing orb ───────────────────────────────────────────────────────────────
function PulsingOrb({ isPlaying }: { isPlaying: boolean }) {
  return (
    <>
      <style>{`
        @keyframes scOrbA { 0%,100%{transform:scale(1);opacity:.16;} 50%{transform:scale(1.4);opacity:.05;} }
        @keyframes scOrbB { 0%,100%{transform:scale(1);opacity:.1;}  50%{transform:scale(1.7);opacity:.02;} }
        .sc-orb-a{animation:scOrbA 2s ease-in-out infinite;}
        .sc-orb-b{animation:scOrbB 2.8s ease-in-out infinite 0.5s;}
      `}</style>
      <div
        className={cn(
          "absolute rounded-full pointer-events-none",
          isPlaying ? "sc-orb-b" : "",
        )}
        style={{
          width: 140,
          height: 140,
          background:
            "radial-gradient(circle,rgba(61,214,181,.1) 0%,transparent 70%)",
          border: "1px solid rgba(61,214,181,.08)",
        }}
      />
      <div
        className={cn(
          "absolute rounded-full pointer-events-none",
          isPlaying ? "sc-orb-a" : "",
        )}
        style={{
          width: 88,
          height: 88,
          background:
            "radial-gradient(circle,rgba(61,214,181,.18) 0%,transparent 70%)",
          border: "1px solid rgba(61,214,181,.18)",
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
        className="sc-volume-slider"
        style={{ ["--val" as string]: `${pct}`, width: 80 }}
      />
      <style>{`
        .sc-volume-slider {
          -webkit-appearance:none; appearance:none;
          height:3px; border-radius:9999px; outline:none; cursor:pointer;
          background:linear-gradient(to right,var(--turquoise) 0%,var(--turquoise) calc(var(--val,40)*1%),rgba(255,255,255,.1) calc(var(--val,40)*1%),rgba(255,255,255,.1) 100%);
        }
        .sc-volume-slider::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:11px;border-radius:50%;background:var(--turquoise);cursor:pointer;box-shadow:0 0 5px rgba(61,214,181,.5);}
        .sc-volume-slider::-moz-range-thumb{width:11px;height:11px;border:none;border-radius:50%;background:var(--turquoise);cursor:pointer;}
      `}</style>
    </div>
  );
}

// ── Difficulty badge ──────────────────────────────────────────────────────────
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
        background: colours[level] ?? "rgba(255,255,255,.08)",
        color: "var(--seafoam)",
        border: "1px solid rgba(61,214,181,0.15)",
        fontFamily: "Outfit,sans-serif",
      }}
    >
      {level}
    </span>
  );
}

// ── Tab type ──────────────────────────────────────────────────────────────────
type Tab = "radio" | "podcast";

// ── Main component ────────────────────────────────────────────────────────────
export function SoundContainer({ className }: { className?: string }) {
  const {
    mode,
    isPlaying,
    volume,
    currentStation,
    currentEpisode,
    stations,
    episodes,
    isLoading,
    streamError,
    togglePlay,
    closeAmbient,
    setVolume,
    retryStream,
    retryEpisode,
    openAmbient,
    playStation,
    playEpisode,
  } = useAmbientPlayer();

  const [tab, setTab] = useState<Tab>(mode === "podcast" ? "podcast" : "radio");

  const isRadio = mode === "radio";

  const title = streamError
    ? "No working streams found"
    : isRadio
      ? (currentStation?.name ?? "Finding station…")
      : (currentEpisode?.episode_title ?? "Finding episode…");

  const subtitle = streamError
    ? "Select a different station from the list"
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

  const handleTabSwitch = (next: Tab) => {
    setTab(next);
    openAmbient(next);
  };

  const handleStationClick = (s: AmbientStation) => {
    openAmbient("radio");
    playStation(s);
  };

  const handleEpisodeClick = (ep: AmbientEpisode) => {
    openAmbient("podcast");
    playEpisode(ep);
  };

  const handleClose = () => {
    closeAmbient();
  };

  return (
    <div
      className={cn(
        "ocean-card relative overflow-hidden w-full ocean-card-animate",
        className,
      )}
      style={{
        background:
          "linear-gradient(135deg,rgba(13,27,42,.98) 0%,rgba(8,18,32,.96) 100%)",
        minHeight: 340,
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 20% 50%,rgba(30,107,114,.12) 0%,transparent 55%)",
        }}
      />
      <div
        className="absolute top-0 right-0 w-72 h-72 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle,rgba(61,214,181,.05) 0%,transparent 70%)",
          filter: "blur(32px)",
          transform: "translate(30%,-30%)",
        }}
      />

      <div className="relative z-10 p-6 md:p-8 flex flex-col gap-6">
        {/* ── Header row ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Headphones
              className="w-4 h-4"
              style={{ color: "var(--turquoise)" }}
            />
            <span
              className="text-xs font-semibold tracking-widest uppercase"
              style={{
                color: "var(--turquoise)",
                fontFamily: "Outfit,sans-serif",
              }}
            >
              Ambient
            </span>
            {!streamError && isPlaying && (
              <span
                className="w-1.5 h-1.5 rounded-full sc-pulse"
                style={{
                  background: "var(--turquoise)",
                  boxShadow: "0 0 6px var(--turquoise)",
                }}
              />
            )}
            <style>{`
              @keyframes scPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.35;transform:scale(.7);}}
              .sc-pulse{animation:scPulse 1.6s ease-in-out infinite;}
            `}</style>
          </div>

          <button
            onClick={handleClose}
            aria-label="Close ambient player"
            className="flex items-center justify-center w-7 h-7 rounded-full transition-all hover:opacity-100"
            style={{
              background: "rgba(255,255,255,.04)",
              color: "var(--seafoam)",
              opacity: 0.5,
            }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Body: player left + track list right ──────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT — Now playing */}
          <div className="flex flex-col items-center lg:items-center gap-5 lg:flex-1 lg:shrink">
            {/* Orb + icon */}
            <div
              className="relative flex items-center justify-center"
              style={{ width: 130, height: 130 }}
            >
              <PulsingOrb isPlaying={isPlaying && !streamError} />
              <div
                className="relative z-10 flex items-center justify-center rounded-full"
                style={{
                  width: 64,
                  height: 64,
                  background: streamError
                    ? "rgba(255,100,60,.08)"
                    : "rgba(61,214,181,.1)",
                  border: `1.5px solid ${streamError ? "rgba(255,160,100,.3)" : "rgba(61,214,181,.3)"}`,
                  boxShadow:
                    isPlaying && !streamError
                      ? "0 0 20px rgba(61,214,181,.2),inset 0 0 12px rgba(61,214,181,.07)"
                      : "none",
                  transition: "box-shadow .4s ease",
                }}
              >
                <BadgeIcon
                  className="w-6 h-6"
                  style={{
                    color: streamError
                      ? "rgba(255,160,100,.7)"
                      : "var(--turquoise)",
                  }}
                />
              </div>
            </div>

            {/* Title & subtitle */}
            <div className="text-center lg:text-center w-full">
              <p
                className="text-xs uppercase tracking-widest font-medium mb-1"
                style={{
                  color: streamError
                    ? "rgba(255,160,100,.7)"
                    : "var(--turquoise)",
                  opacity: 0.6,
                  fontFamily: "Outfit,sans-serif",
                }}
              >
                {badge} · Now Playing
              </p>
              <h3
                className="font-display text-xl font-semibold leading-tight truncate"
                style={{
                  color: streamError ? "rgba(255,200,150,.9)" : "var(--sand)",
                }}
              >
                {title}
              </h3>
              {subtitle && (
                <p
                  className="text-xs mt-0.5 truncate"
                  style={{
                    color: "var(--seafoam)",
                    opacity: 0.65,
                    fontFamily: "Outfit,sans-serif",
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>

            {/* Spectrum */}
            <div className="w-full">
              <SpectrumVisualiser isPlaying={isPlaying && !streamError} />
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              {streamError ? (
                <button
                  onClick={isRadio ? retryStream : retryEpisode}
                  aria-label="Retry"
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
                  style={{
                    background: "rgba(255,160,100,.1)",
                    color: "rgba(255,160,100,.9)",
                    border: "1px solid rgba(255,160,100,.2)",
                    fontFamily: "Outfit,sans-serif",
                  }}
                >
                  <RotateCcw className="w-4 h-4" /> Retry
                </button>
              ) : (
                <button
                  onClick={togglePlay}
                  aria-label={isPlaying ? "Pause" : "Play"}
                  className="flex items-center justify-center w-11 h-11 rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
                  style={{
                    background: "rgba(61,214,181,.14)",
                    border: "1.5px solid rgba(61,214,181,.3)",
                    color: "var(--turquoise)",
                    boxShadow: isPlaying
                      ? "0 0 14px rgba(61,214,181,.2)"
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
              {!streamError && (
                <VolumeControl volume={volume} onChange={setVolume} />
              )}
            </div>
          </div>

          {/* RIGHT — Track list */}
          <div
            className="flex-1 flex flex-col min-w-0"
            style={{ borderLeft: "1px solid rgba(255,255,255,.05)" }}
          >
            {/* Tab switcher */}
            <div
              className="px-4 pb-3 flex items-center gap-1"
              style={{ borderBottom: "1px solid rgba(255,255,255,.05)" }}
            >
              {(["radio", "podcast"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTabSwitch(t)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                  style={{
                    fontFamily: "Outfit,sans-serif",
                    background:
                      tab === t ? "rgba(61,214,181,.13)" : "transparent",
                    color:
                      tab === t ? "var(--turquoise)" : "rgba(255,255,255,.35)",
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

            {/* Track list */}
            <div className="overflow-y-auto flex-1" style={{ maxHeight: 200 }}>
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 py-6">
                  <Loader2
                    className="w-4 h-4 animate-spin"
                    style={{ color: "var(--turquoise)" }}
                  />
                  <span
                    className="text-xs"
                    style={{
                      color: "rgba(255,255,255,.35)",
                      fontFamily: "Outfit,sans-serif",
                    }}
                  >
                    Loading…
                  </span>
                </div>
              ) : tab === "radio" ? (
                stations.length === 0 ? (
                  <p
                    className="text-xs text-center py-6 px-4"
                    style={{
                      color: "rgba(255,255,255,.3)",
                      fontFamily: "Outfit,sans-serif",
                    }}
                  >
                    No stations found for your language.
                  </p>
                ) : (
                  stations.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleStationClick(s)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-150"
                      style={{
                        background:
                          currentStation?.id === s.id
                            ? "rgba(61,214,181,.07)"
                            : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (currentStation?.id !== s.id)
                          (e.currentTarget as HTMLElement).style.background =
                            "rgba(255,255,255,.03)";
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
                              : "rgba(255,255,255,.22)",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium truncate"
                          style={{
                            color:
                              currentStation?.id === s.id
                                ? "var(--turquoise)"
                                : "var(--sand)",
                            fontFamily: "Outfit,sans-serif",
                          }}
                        >
                          {s.name}
                        </p>
                        <p
                          className="text-xs"
                          style={{
                            color: "rgba(255,255,255,.3)",
                            fontFamily: "Outfit,sans-serif",
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
                <p
                  className="text-xs text-center py-6 px-4"
                  style={{
                    color: "rgba(255,255,255,.3)",
                    fontFamily: "Outfit,sans-serif",
                  }}
                >
                  No podcast episodes found for your language.
                </p>
              ) : (
                episodes.map((ep, i) => (
                  <button
                    key={`${ep.feed_title}-${i}`}
                    onClick={() => handleEpisodeClick(ep)}
                    className="w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors duration-150"
                    style={{
                      background:
                        currentEpisode?.audio_url === ep.audio_url
                          ? "rgba(61,214,181,.07)"
                          : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (currentEpisode?.audio_url !== ep.audio_url)
                        (e.currentTarget as HTMLElement).style.background =
                          "rgba(255,255,255,.03)";
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
                            : "rgba(255,255,255,.22)",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium truncate"
                        style={{
                          color:
                            currentEpisode?.audio_url === ep.audio_url
                              ? "var(--turquoise)"
                              : "var(--sand)",
                          fontFamily: "Outfit,sans-serif",
                        }}
                      >
                        {ep.episode_title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <p
                          className="text-xs truncate"
                          style={{
                            color: "rgba(255,255,255,.3)",
                            fontFamily: "Outfit,sans-serif",
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
              className="px-4 pt-3 flex items-center gap-1.5"
              style={{ borderTop: "1px solid rgba(255,255,255,.04)" }}
            >
              <ChevronRight
                className="w-3 h-3"
                style={{ color: "rgba(255,255,255,.2)" }}
              />
              <span
                className="text-[10px]"
                style={{
                  color: "rgba(255,255,255,.2)",
                  fontFamily: "Outfit,sans-serif",
                }}
              >
                Audio continues while you navigate · Click{" "}
                <strong style={{ opacity: 0.6 }}>Immerse</strong> again to
                toggle
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SoundContainer;
