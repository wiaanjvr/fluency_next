"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  src: string;
  className?: string;
}

const SPEEDS = [0.75, 1, 1.25] as const;

/**
 * Minimal ocean-themed audio player with waveform-style progress bar.
 * Uses native <audio> element with custom controls.
 */
export function AudioPlayer({ src, className }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speedIndex, setSpeedIndex] = useState(1); // default 1x

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const cycleSpeed = useCallback(() => {
    const next = (speedIndex + 1) % SPEEDS.length;
    setSpeedIndex(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEEDS[next];
    }
  }, [speedIndex]);

  const handleSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const audio = audioRef.current;
      if (!audio || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const fraction = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width),
      );
      audio.currentTime = fraction * duration;
      setProgress(fraction * 100);
    },
    [duration],
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const currentTime = audioRef.current?.currentTime ?? 0;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-ocean-turquoise/20 bg-white/[0.03] px-4 py-3",
        className,
      )}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play / Pause */}
      <button
        onClick={togglePlay}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ocean-turquoise/15 text-ocean-turquoise transition-colors hover:bg-ocean-turquoise/25"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </button>

      {/* Waveform-style progress bar */}
      <div className="flex flex-1 flex-col gap-1">
        <div
          className="relative h-6 w-full cursor-pointer overflow-hidden rounded-lg"
          onClick={handleSeek}
          role="slider"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
        >
          {/* Fake waveform bars */}
          <div className="absolute inset-0 flex items-end gap-[2px] px-0.5">
            {Array.from({ length: 40 }).map((_, i) => {
              const height =
                30 + Math.sin(i * 0.7) * 25 + Math.cos(i * 1.3) * 20;
              const filled = (i / 40) * 100 <= progress;
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-full transition-colors duration-150",
                    filled ? "bg-ocean-turquoise" : "bg-white/10",
                  )}
                  style={{ height: `${Math.max(15, Math.min(100, height))}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* Time display */}
        <div className="flex items-center justify-between text-[10px] text-seafoam/50 font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{duration ? formatTime(duration) : "--:--"}</span>
        </div>
      </div>

      {/* Speed toggle */}
      <button
        onClick={cycleSpeed}
        className="shrink-0 rounded-lg bg-white/5 px-2 py-1 text-xs font-medium text-seafoam/70 transition-colors hover:bg-white/10 hover:text-seafoam"
      >
        {SPEEDS[speedIndex]}x
      </button>
    </div>
  );
}
