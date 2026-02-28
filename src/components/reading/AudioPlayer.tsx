"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { formatTimeMs } from "@/lib/reading-utils";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Mic2,
  Loader2,
} from "lucide-react";

interface AudioPlayerProps {
  /** URL of the audio file (null = not yet available) */
  audioUrl: string | null;
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
  /** Whether karaoke highlighting is active */
  karaokeEnabled?: boolean;
  /** Toggle karaoke mode */
  onToggleKaraoke?: () => void;
}

const PLAYBACK_RATES = [0.75, 1, 1.25] as const;

/**
 * Floating audio player dock — centered, minimal, glassy.
 * Rewind/Forward 10s, Play/Pause circle, thin progress bar,
 * time display, karaoke toggle.
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
  karaokeEnabled = true,
  onToggleKaraoke,
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

  // ─── Skip forward/back 10s ───────────────────────────────────────

  const skip = useCallback(
    (seconds: number) => {
      if (!audioRef.current) return;
      const newTime = Math.max(
        0,
        Math.min(
          audioRef.current.duration,
          audioRef.current.currentTime + seconds,
        ),
      );
      audioRef.current.currentTime = newTime;
      const ms = newTime * 1000;
      setCurrentTimeMs(ms);
      onTimeUpdate(ms);
    },
    [onTimeUpdate],
  );

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
    <div
      className={cn(
        "fixed bottom-8 left-1/2 -translate-x-1/2 z-50",
        "bg-[#0d1b2a]/90 backdrop-blur-xl",
        "border border-white/[0.08] rounded-2xl",
        "px-6 py-3 min-w-[320px] max-w-[420px]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.5)]",
        "flex items-center gap-4",
      )}
    >
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="auto"
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      )}

      {/* Rewind 10s */}
      <button
        onClick={() => skip(-10)}
        disabled={!audioUrl}
        className={cn(
          "transition-colors shrink-0",
          audioUrl
            ? "text-[var(--seafoam)]/60 hover:text-[var(--seafoam)]"
            : "text-[var(--seafoam)]/20 cursor-default",
        )}
        aria-label="Rewind 10 seconds"
      >
        <SkipBack className="w-4 h-4" />
      </button>

      {/* Play/Pause — circle accent */}
      <button
        onClick={togglePlay}
        disabled={!audioUrl}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          "border transition-all duration-300",
          audioUrl
            ? "bg-[#3dd6b5]/10 border-[#3dd6b5]/20 text-[#3dd6b5] hover:bg-[#3dd6b5]/20 active:scale-95"
            : "bg-white/5 border-white/10 text-white/20 cursor-default",
        )}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {!audioUrl ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-4 h-4" />
        ) : (
          <Play className="w-4 h-4 ml-0.5" />
        )}
      </button>

      {/* Forward 10s */}
      <button
        onClick={() => skip(10)}
        disabled={!audioUrl}
        className={cn(
          "transition-colors shrink-0",
          audioUrl
            ? "text-[var(--seafoam)]/60 hover:text-[var(--seafoam)]"
            : "text-[var(--seafoam)]/20 cursor-default",
        )}
        aria-label="Forward 10 seconds"
      >
        <SkipForward className="w-4 h-4" />
      </button>

      {/* Progress bar — thin, minimal */}
      <div
        ref={progressRef}
        className="flex-1 h-0.5 bg-white/10 rounded-full cursor-pointer relative group"
        onClick={handleProgressClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div
          className="absolute inset-y-0 left-0 bg-[#3dd6b5] rounded-full transition-[width] duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Time display */}
      <span className="text-xs text-[var(--seafoam)]/50 font-body tabular-nums whitespace-nowrap shrink-0">
        {formatTimeMs(currentTimeMs)}
        <span className="mx-1 text-[var(--seafoam)]/30">/</span>
        {formatTimeMs(durationMs)}
      </span>

      {/* Karaoke toggle */}
      {onToggleKaraoke && (
        <button
          onClick={onToggleKaraoke}
          className={cn(
            "p-1.5 rounded-lg transition-all duration-200 shrink-0",
            karaokeEnabled
              ? "text-[#3dd6b5]"
              : "text-[var(--seafoam)]/40 hover:text-[var(--seafoam)]/70",
          )}
          aria-label={karaokeEnabled ? "Disable karaoke" : "Enable karaoke"}
          title={karaokeEnabled ? "Karaoke on" : "Karaoke off"}
        >
          <Mic2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
