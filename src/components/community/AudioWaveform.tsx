"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause } from "lucide-react";

interface AudioWaveformProps {
  audioUrl?: string;
  duration?: number;
  barCount?: number;
  className?: string;
  onTimeClick?: (seconds: number) => void;
}

export function AudioWaveform({
  audioUrl,
  duration = 0,
  barCount = 30,
  className = "",
  onTimeClick,
}: AudioWaveformProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<number>();

  // Generate deterministic bar heights
  const bars = Array.from({ length: barCount }, (_, i) => {
    const seed = Math.sin(i * 12.4 + 3.14) * 43758.5453;
    return 15 + Math.abs(seed - Math.floor(seed)) * 85;
  });

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.addEventListener("ended", () => {
        setIsPlaying(false);
        setProgress(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
      });
    }

    if (isPlaying) {
      audioRef.current.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      audioRef.current.play();
      intervalRef.current = window.setInterval(() => {
        if (audioRef.current) {
          setProgress(
            audioRef.current.currentTime / (audioRef.current.duration || 1),
          );
        }
      }, 50);
    }
    setIsPlaying(!isPlaying);
  };

  const handleBarClick = (index: number) => {
    const time = (index / barCount) * (duration || 1);
    if (onTimeClick) onTimeClick(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(index / barCount);
    }
  };

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        onClick={togglePlay}
        disabled={!audioUrl}
        className="shrink-0 w-9 h-9 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 hover:bg-teal-500/30 transition-colors disabled:opacity-30"
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4 ml-0.5" />
        )}
      </button>

      <div className="flex-1 flex items-end gap-[3px] h-8">
        {bars.map((height, i) => {
          const filled = i / barCount <= progress;
          return (
            <button
              key={i}
              onClick={() => handleBarClick(i)}
              className={`w-[2px] rounded-full transition-all duration-150 cursor-pointer hover:opacity-100 ${
                filled ? "bg-teal-400 opacity-80" : "bg-white/20 opacity-50"
              } ${isPlaying ? "animate-waveform" : ""}`}
              style={{
                height: `${height}%`,
                animationDelay: isPlaying ? `${i * 0.05}s` : undefined,
              }}
            />
          );
        })}
      </div>

      {duration > 0 && (
        <span className="shrink-0 text-[11px] text-seafoam/40 font-mono tabular-nums">
          {formatDuration(duration)}
        </span>
      )}

      <style jsx>{`
        @keyframes waveform {
          0%,
          100% {
            transform: scaleY(1);
          }
          50% {
            transform: scaleY(0.6);
          }
        }
        .animate-waveform {
          animation: waveform 0.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
