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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              Listening {itemIndex + 1} of {totalItems}
            </CardTitle>
          </div>
          <span className="text-sm text-muted-foreground px-2 py-1 bg-muted rounded">
            {getDifficultyLabel(item.difficulty)}
          </span>
        </div>

        {/* Audio Player */}
        <div className="bg-muted/50 rounded-xl p-6">
          <audio
            ref={audioRef}
            src={item.audioUrl}
            onEnded={handleAudioEnded}
            preload="auto"
          />

          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Listen to the audio clip carefully. You can play it up to{" "}
              {maxPlays} times.
            </p>

            <div className="flex items-center gap-4">
              <Button
                size="lg"
                variant={isPlaying ? "secondary" : "default"}
                onClick={handlePlay}
                disabled={playCount >= maxPlays && !isPlaying}
                className="rounded-full h-16 w-16 p-0"
                aria-label={isPlaying ? "Pause audio" : "Play audio"}
              >
                {isPlaying ? (
                  <Pause className="h-8 w-8" strokeWidth={2.5} />
                ) : (
                  <Play className="h-8 w-8 ml-0.5" strokeWidth={2.5} />
                )}
              </Button>

              {playCount > 0 && (
                <div className="text-sm text-muted-foreground">
                  Plays: {playCount}/{maxPlays}
                </div>
              )}
            </div>

            {!hasPlayed && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Press play to listen before answering
              </p>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Question */}
        <div className="space-y-2">
          <h3 className="font-medium text-lg">{item.question}</h3>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {item.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelectOption(index)}
              disabled={!hasPlayed}
              className={cn(
                "w-full text-left p-4 rounded-lg border-2 transition-all",
                "hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed",
                selectedIndex === index
                  ? "border-primary bg-primary/5"
                  : "border-muted",
              )}
            >
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-muted text-sm font-medium mr-3">
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
          className="w-full"
          size="lg"
        >
          Submit Answer
        </Button>
      </CardContent>
    </Card>
  );
}
