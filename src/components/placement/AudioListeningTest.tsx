"use client";

import React, { useState, useRef, useEffect } from "react";
import { AudioTestItem, TestResponse } from "@/types/placement-test";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Play, Pause, Volume2 } from "lucide-react";

interface AudioListeningTestProps {
  item: AudioTestItem;
  itemIndex: number;
  totalItems: number;
  onAnswer: (response: TestResponse) => void;
}

export function AudioListeningTest({
  item,
  itemIndex,
  totalItems,
  onAnswer,
}: AudioListeningTestProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playCount, setPlayCount] = useState(0);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [startTime] = useState(Date.now());
  const audioRef = useRef<HTMLAudioElement>(null);

  const maxPlays = 3;

  useEffect(() => {
    // Reset state when item changes
    setSelectedIndex(null);
    setIsPlaying(false);
    setPlayCount(0);
    setHasPlayed(false);
  }, [item.id]);

  const handlePlay = () => {
    if (!audioRef.current || playCount >= maxPlays) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setIsPlaying(true);
      setPlayCount((prev) => prev + 1);
      setHasPlayed(true);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleSelectOption = (index: number) => {
    if (!hasPlayed) return; // Must listen first
    setSelectedIndex(index);
  };

  const handleSubmit = () => {
    if (selectedIndex === null) return;

    const response: TestResponse = {
      itemId: item.id,
      selectedIndex,
      isCorrect: selectedIndex === item.correctIndex,
      timeSpentMs: Date.now() - startTime,
    };

    onAnswer(response);
  };

  const getDifficultyLabel = (difficulty: string) => {
    const labels: Record<string, string> = {
      A1: "Beginner",
      A2: "Elementary",
      B1: "Intermediate",
      B2: "Upper Intermediate",
      C1: "Advanced",
    };
    return labels[difficulty] || difficulty;
  };

  return (
    <Card className="ocean-card w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-4 text-sm text-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              Listening {itemIndex + 1} of {totalItems}
            </CardTitle>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-teal-900/40 text-teal-300 border border-teal-700/30">
            {getDifficultyLabel(item.difficulty)}
          </span>
        </div>

        {/* Audio Player */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <audio
            ref={audioRef}
            src={item.audioUrl}
            onEnded={handleAudioEnded}
            preload="auto"
          />

          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-gray-400 text-center">
              Listen carefully. You can play it up to {maxPlays} times.
            </p>

            <div className="flex items-center gap-5">
              {/* Button + ripple wrapper */}
              <div className="relative flex items-center justify-center">
                {isPlaying && (
                  <>
                    <span className="audio-ripple audio-ripple-1" />
                    <span className="audio-ripple audio-ripple-2" />
                    <span className="audio-ripple audio-ripple-3" />
                  </>
                )}
                <Button
                  size="lg"
                  variant={isPlaying ? "secondary" : "default"}
                  onClick={handlePlay}
                  disabled={playCount >= maxPlays && !isPlaying}
                  className={cn(
                    "relative rounded-full h-16 w-16 p-0 z-10 transition-transform duration-150 hover:scale-105",
                    !hasPlayed && !isPlaying && "play-btn-pulse",
                  )}
                  style={{
                    boxShadow:
                      "0 0 0 8px rgba(0,212,184,0.1), 0 0 30px rgba(0,212,184,0.3)",
                  }}
                  aria-label={isPlaying ? "Pause audio" : "Play audio"}
                >
                  {isPlaying ? (
                    <Pause className="h-8 w-8" strokeWidth={2.5} />
                  ) : (
                    <Play className="h-8 w-8 ml-0.5" strokeWidth={2.5} />
                  )}
                </Button>
              </div>

              {playCount > 0 && (
                <div className="text-sm text-teal-300/60">
                  {playCount}/{maxPlays}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 text-sm text-gray-300">
        {/* Question */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-300">{item.question}</h3>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {item.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelectOption(index)}
              disabled={!hasPlayed}
              className={cn(
                "w-full text-left px-4 py-3 rounded-lg border transition-all duration-150",
                "border-white/10 bg-white/[0.03] text-gray-200",
                "hover:border-teal-500/40 hover:bg-teal-500/[0.08] hover:translate-x-1",
                "disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:hover:border-white/10 disabled:hover:bg-white/[0.03]",
                selectedIndex === index
                  ? "border-teal-400/60 bg-teal-500/[0.15] translate-x-0"
                  : "",
              )}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center w-6 h-6 rounded text-xs font-semibold mr-3 flex-shrink-0 transition-colors duration-150",
                  selectedIndex === index
                    ? "bg-teal-500 text-white"
                    : "bg-white/10 text-gray-300",
                )}
              >
                {String.fromCharCode(65 + index)}
              </span>
              {option}
            </button>
          ))}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={selectedIndex === null}
          className={cn(
            "w-full transition-all duration-200",
            selectedIndex === null
              ? "opacity-40 cursor-not-allowed pointer-events-none"
              : "shadow-[0_0_20px_rgba(0,212,184,0.25)]",
          )}
          size="lg"
        >
          Submit Answer
        </Button>
      </CardContent>
    </Card>
  );
}
