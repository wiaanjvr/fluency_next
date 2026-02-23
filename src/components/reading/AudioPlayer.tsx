"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatTimeMs } from "@/lib/reading-utils";
import { Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  /** URL of the audio file */
  audioUrl: string;
  /** Called on each animation frame with current time in ms */
  onTimeUpdate: (currentTimeMs: number) => void;
  /** Called when playback starts/stops */
  onPlayStateChange: (isPlaying: boolean) => void;
  /** Called when audio duration is known */
  onDurationReady: (durationMs: number) => void;
  /** External play/pause control */
  isPlaying: boolean;
  /** External playback rate control */
  playbackRate: number;
  /** Called when user changes playback rate */
  onPlaybackRateChange: (rate: number) => void;
  /** Called when audio reaches the end */
  onEnded?: () => void;
}

const PLAYBACK_RATES = [0.75, 1, 1.25] as const;

/**
 * Sticky bottom audio player with seekable progress bar,
 * playback speed control, and frame-accurate time updates
 * for word highlighting sync.
 *
 * Style: bg-[#0d2137]/95 backdrop-blur-sm border-t border-white/10
 * Rounded top corners, ~80px mobile / ~72px desktop.
 */
export function AudioPlayer({
  audioUrl,
  onTimeUpdate,
  onPlayStateChange,
  onDurationReady,
  isPlaying,
  playbackRate,
  onPlaybackRateChange,
  onEnded,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const rafRef = useRef<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // ─── requestAnimationFrame loop for smooth time tracking ──────────

  const tick = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      const ms = audioRef.current.currentTime * 1000;
      setCurrentTimeMs(ms);
      onTimeUpdate(ms);
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [onTimeUpdate]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  // ─── Audio metadata ───────────────────────────────────────────────

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      const dur = audioRef.current.duration * 1000;
      setDurationMs(dur);
      onDurationReady(dur);
    }
  }, [onDurationReady]);

  const handleEnded = useCallback(() => {
    onPlayStateChange(false);
    onEnded?.();
  }, [onPlayStateChange, onEnded]);

  // ─── Play/pause sync ────────────────────────────────────────────

  useEffect(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.play().catch(() => {
        // Browser may block autoplay; that's okay
        onPlayStateChange(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, onPlayStateChange]);

  // ─── Playback rate sync ──────────────────────────────────────────

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // ─── Toggle play/pause ───────────────────────────────────────────

  const togglePlay = useCallback(() => {
    onPlayStateChange(!isPlaying);
  }, [isPlaying, onPlayStateChange]);

  // ─── Seek on progress bar click/drag ─────────────────────────────

  const seekToPosition = useCallback(
    (clientX: number) => {
      if (!progressRef.current || !audioRef.current || durationMs === 0) return;
      const rect = progressRef.current.getBoundingClientRect();
      const ratio = Math.max(
        0,
        Math.min(1, (clientX - rect.left) / rect.width),
      );
      const newTimeMs = ratio * durationMs;
      audioRef.current.currentTime = newTimeMs / 1000;
      setCurrentTimeMs(newTimeMs);
      onTimeUpdate(newTimeMs);
    },
    [durationMs, onTimeUpdate],
  );

  const handleProgressClick = useCallback(
    (e: React.MouseEvent) => seekToPosition(e.clientX),
    [seekToPosition],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      seekToPosition(e.clientX);
    },
    [seekToPosition],
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e: MouseEvent) => seekToPosition(e.clientX);
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, seekToPosition]);

  // ─── Touch support for mobile seek ───────────────────────────────

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true);
      seekToPosition(e.touches[0].clientX);
    },
    [seekToPosition],
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleTouchMove = (e: TouchEvent) =>
      seekToPosition(e.touches[0].clientX);
    const handleTouchEnd = () => setIsDragging(false);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, seekToPosition]);

  const progress = durationMs > 0 ? (currentTimeMs / durationMs) * 100 : 0;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-[#0d2137]/95 backdrop-blur-sm border-t border-white/10 rounded-t-2xl">
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <div className="max-w-2xl mx-auto px-4 md:px-6 py-3 md:py-2.5">
        {/* Progress bar */}
        <div
          ref={progressRef}
          className="relative h-1.5 bg-white/10 rounded-full cursor-pointer mb-3 group"
          onClick={handleProgressClick}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Filled portion */}
          <div
            className="absolute inset-y-0 left-0 bg-teal-400 rounded-full transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          />
          {/* Seek thumb */}
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-teal-400 rounded-full",
              "shadow-[0_0_8px_rgba(45,212,191,0.4)]",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
              isDragging && "opacity-100",
            )}
            style={{ left: `calc(${progress}% - 6px)` }}
          />
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-4">
          {/* Play/Pause — large teal filled circle */}
          <button
            onClick={togglePlay}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center shrink-0",
              "bg-teal-400 text-white hover:bg-teal-300",
              "transition-all duration-300",
              "active:scale-95",
              "shadow-[0_0_16px_rgba(45,212,191,0.3)]",
            )}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </button>

          {/* Time display */}
          <div className="flex-1 flex items-center justify-center text-sm font-body text-gray-400 tabular-nums">
            <span>{formatTimeMs(currentTimeMs)}</span>
            <span className="mx-1.5 text-gray-600">/</span>
            <span>{formatTimeMs(durationMs)}</span>
          </div>

          {/* Speed controls — text buttons */}
          <div className="flex items-center gap-0.5">
            {PLAYBACK_RATES.map((rate) => (
              <button
                key={rate}
                onClick={() => onPlaybackRateChange(rate)}
                className={cn(
                  "px-2 py-1 rounded text-xs font-body transition-all duration-200",
                  playbackRate === rate
                    ? "text-teal-400 font-medium"
                    : "text-gray-500 hover:text-gray-300",
                )}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
