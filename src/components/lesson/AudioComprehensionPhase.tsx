"use client";

import React, { useState, useRef, useEffect } from "react";
import { Lesson } from "@/types/lesson";
import {
  Headphones,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  Volume2,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioComprehensionPhaseProps {
  lesson: Lesson;
  listenCount: number;
  onListenComplete: () => void;
  onPhaseComplete: () => void;
}

const MIN_LISTENS = 2; // Minimum listens before proceeding

export function AudioComprehensionPhase({
  lesson,
  listenCount,
  onListenComplete,
  onPhaseComplete,
}: AudioComprehensionPhaseProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      onListenComplete();
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [onListenComplete]);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = 0;
    setCurrentTime(0);
    audio.play();
    setIsPlaying(true);
  };

  const changeSpeed = (rate: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const canProceed = listenCount >= MIN_LISTENS;

  return (
    <div className="space-y-8">
      {/* Phase Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-library-brass/10 text-library-brass">
          <Headphones className="h-4 w-4" />
          <span className="text-sm font-medium">
            Phase 1: Listen & Understand
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-light tracking-tight">
          Listen to the{" "}
          <span className="font-serif italic text-library-brass">audio</span>
        </h1>
        <p className="text-muted-foreground font-light max-w-md mx-auto">
          Focus on understanding the meaning. Don't worry about every word.
          Listen at least {MIN_LISTENS} times before continuing.
        </p>
      </div>

      {/* Audio Player Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <span className="text-lg font-medium">{lesson.title}</span>
          <span className="text-sm text-muted-foreground capitalize px-3 py-1 bg-muted rounded-full">
            {lesson.level}
          </span>
        </div>

        <div className="p-6 space-y-6">
          <audio ref={audioRef} src={lesson.audioUrl} preload="metadata" />

          {/* Visualizer */}
          <div className="h-28 bg-gradient-to-r from-library-brass/5 via-library-brass/10 to-library-brass/5 rounded-xl flex items-center justify-center">
            <div
              className={cn(
                "flex items-center gap-1.5",
                isPlaying && "animate-pulse",
              )}
            >
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1.5 bg-library-brass/60 rounded-full transition-all duration-300",
                  )}
                  style={{
                    height: isPlaying ? `${Math.random() * 48 + 16}px` : "16px",
                    animationDelay: `${i * 0.08}s`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-library-brass rounded-full transition-all duration-150"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleRestart}
              className="h-12 w-12 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            >
              <RotateCcw className="h-5 w-5" />
            </button>

            <button
              onClick={togglePlayPause}
              className="h-16 w-16 rounded-2xl bg-library-brass hover:bg-library-brass/90 flex items-center justify-center transition-all duration-300 shadow-luxury"
            >
              {isPlaying ? (
                <Pause className="h-7 w-7 text-background" />
              ) : (
                <Play className="h-7 w-7 text-background ml-1" />
              )}
            </button>

            <button
              onClick={() => changeSpeed(playbackRate === 1 ? 0.75 : 1)}
              className="h-12 w-12 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            >
              <span className="text-sm font-medium">{playbackRate}x</span>
            </button>
          </div>

          {/* Speed options */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground mr-2">Speed:</span>
            {[0.5, 0.75, 1.0, 1.25].map((speed) => (
              <button
                key={speed}
                onClick={() => changeSpeed(speed)}
                className={cn(
                  "h-8 px-3 rounded-lg text-sm transition-all duration-200",
                  playbackRate === speed
                    ? "bg-library-brass text-background"
                    : "bg-muted hover:bg-muted/80",
                )}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Listen Counter */}
      <div
        className={cn(
          "bg-card border border-border rounded-2xl p-6 transition-all duration-300",
          canProceed && "border-green-500/30 bg-green-500/5",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                canProceed ? "bg-green-500 text-white" : "bg-muted",
              )}
            >
              {canProceed ? (
                <CheckCircle2 className="h-6 w-6" />
              ) : (
                <Volume2 className="h-6 w-6" />
              )}
            </div>
            <div>
              <p className="font-medium text-lg">
                {canProceed ? "Ready to continue!" : "Keep listening..."}
              </p>
              <p className="text-sm text-muted-foreground font-light">
                Listened {listenCount} of {MIN_LISTENS} times
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {[...Array(MIN_LISTENS)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-3 h-3 rounded-full transition-all duration-300",
                  i < listenCount ? "bg-green-500" : "bg-muted",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-library-brass/10 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="h-5 w-5 text-library-brass" />
          </div>
          <div>
            <h3 className="font-medium mb-3">Listening Tips</h3>
            <ul className="text-sm text-muted-foreground font-light space-y-2">
              <li>• Focus on the overall meaning, not individual words</li>
              <li>• Try to identify: Who? What? Where? When?</li>
              <li>• Use the slower speed if needed</li>
              <li>• Don't worry if you miss some details</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      <button
        onClick={onPhaseComplete}
        disabled={!canProceed}
        className={cn(
          "w-full py-4 px-8 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2",
          canProceed
            ? "bg-library-brass hover:bg-library-brass/90 text-background"
            : "bg-muted text-muted-foreground cursor-not-allowed",
        )}
      >
        {canProceed ? (
          <>
            Continue to Speaking
            <ArrowRight className="h-5 w-5" />
          </>
        ) : (
          <>
            Listen {MIN_LISTENS - listenCount} more time
            {MIN_LISTENS - listenCount > 1 ? "s" : ""}
          </>
        )}
      </button>
    </div>
  );
}
