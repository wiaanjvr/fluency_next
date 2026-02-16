"use client";

import React, { useState, useRef, useEffect } from "react";
import { ShadowingStage } from "@/types/lesson";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Waveform } from "@/components/ui/ocean-animations";
import {
  Volume2,
  Play,
  Pause,
  RotateCcw,
  ArrowRight,
  Mic,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ShadowingPhaseProps {
  stage: ShadowingStage;
  onComplete: (repeatCount: number) => void;
}

const MIN_REPEATS = 2;

export function ShadowingPhase({ stage, onComplete }: ShadowingPhaseProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatCount, setRepeatCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setRepeatCount((prev) => prev + 1);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const canProceed = repeatCount >= MIN_REPEATS;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center mb-3">
          <Volume2 className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
        </div>
        <CardTitle className="text-xl">Shadowing Practice</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Repeat along with the audio
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Hidden audio element */}
        <audio ref={audioRef} src={stage.audioUrl} preload="metadata" />

        {/* Instruction */}
        <div className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
          <div className="flex items-start gap-3">
            <Mic className="h-5 w-5 text-cyan-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-cyan-800 dark:text-cyan-200">
              {stage.instruction}
            </p>
          </div>
        </div>

        {/* Repeat count */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <CheckCircle
              className={cn(
                "h-4 w-4",
                canProceed ? "text-green-600" : "text-gray-400",
              )}
            />
            <span className="text-sm font-medium">
              Repeated: {repeatCount} / {MIN_REPEATS} times
            </span>
          </div>
        </div>

        {/* Audio controls */}
        <div className="space-y-4">
          {/* Audio waveform visualization */}
          <div className="flex items-center justify-center py-4">
            <Waveform isActive={isPlaying} bars={7} />
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={handleRestart}
              title="Restart"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>

            <Button
              size="lg"
              onClick={togglePlayPause}
              className={cn(
                "w-24 h-12",
                isPlaying && "bg-cyan-600 hover:bg-cyan-700",
              )}
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5 ml-1" />
              )}
            </Button>
          </div>
        </div>

        {/* Focus points */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-center">Focus on:</p>
          <ul className="space-y-1">
            {stage.focusPoints.map((point, idx) => (
              <li
                key={idx}
                className="text-sm text-muted-foreground flex items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        {/* Tips */}
        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            Tip: Don't worry about being perfect! Focus on matching the rhythm
            and flow of the speaker.
          </p>
        </div>

        {/* Continue button */}
        <Button
          onClick={() => onComplete(repeatCount)}
          disabled={!canProceed}
          className="w-full"
        >
          {canProceed ? (
            <>
              Continue to Final Recall
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          ) : (
            `Repeat ${MIN_REPEATS - repeatCount} more time${MIN_REPEATS - repeatCount > 1 ? "s" : ""}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
