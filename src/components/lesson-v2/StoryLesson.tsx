"use client";

/**
 * StoryLesson — Phase 2 Component
 *
 * Displays the AI-generated micro-story with:
 * - Sentence-by-sentence rendering
 * - Target-language words highlighted
 * - English translations available on hover/tap
 * - Narrative arc visualization
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  GeneratedStory,
  StorySentence,
  MasteryStageConfig,
} from "@/types/lesson-v2";
import { BookOpen, ArrowRight, Eye, EyeOff, Volume2 } from "lucide-react";

interface Props {
  story: GeneratedStory;
  stage: MasteryStageConfig;
  language: string;
  onComplete: () => void;
}

export default function StoryLesson({
  story,
  stage,
  language,
  onComplete,
}: Props) {
  const [showTranslations, setShowTranslations] = useState(false);
  const [revealedSentences, setRevealedSentences] = useState<Set<number>>(
    new Set(),
  );
  const [currentSentence, setCurrentSentence] = useState(0);
  const [storyRead, setStoryRead] = useState(false);

  const allRevealed = revealedSentences.size === story.story.length;

  const handleRevealNext = () => {
    setRevealedSentences((prev) => {
      const next = new Set(prev);
      next.add(currentSentence);
      return next;
    });

    if (currentSentence < story.story.length - 1) {
      setCurrentSentence((i) => i + 1);
    } else {
      setStoryRead(true);
    }
  };

  const handleRevealAll = () => {
    const all = new Set<number>();
    story.story.forEach((_, i) => all.add(i));
    setRevealedSentences(all);
    setCurrentSentence(story.story.length - 1);
    setStoryRead(true);
  };

  const speakSentence = (text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      // Mixed-language sentences: use target lang to get correct pronunciation for target words
      utterance.lang =
        language === "fr" ? "fr-FR" : language === "de" ? "de-DE" : "it-IT";
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
          Phase 2 — Story
        </span>
        <h2 className="text-lg font-semibold text-foreground">
          <BookOpen className="inline h-5 w-5 mr-2 text-primary" />
          {story.interest_theme}
        </h2>
        <p className="text-sm text-muted-foreground">
          Stage: {stage.label} · {stage.targetRatio}% target language
        </p>
      </div>

      {/* Story Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Read the Story</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranslations(!showTranslations)}
            >
              {showTranslations ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" /> Hide translations
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" /> Show translations
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {story.story.map((sentence, idx) => {
            const isRevealed = revealedSentences.has(idx);
            const isCurrent = idx === currentSentence && !storyRead;

            return (
              <div
                key={sentence.sentence_number}
                className={`
                  p-4 rounded-xl transition-all duration-500
                  ${isRevealed ? "opacity-100" : isCurrent ? "opacity-80" : "opacity-30"}
                  ${isCurrent ? "ring-2 ring-primary/30 bg-primary/5" : "bg-muted/30"}
                `}
              >
                {/* Sentence text with target words highlighted */}
                <div className="flex items-start gap-2">
                  <span className="text-xs text-muted-foreground font-mono mt-1 flex-shrink-0">
                    {sentence.sentence_number}.
                  </span>
                  <div className="flex-1">
                    <p className="text-lg leading-relaxed">
                      {renderHighlightedSentence(
                        sentence.text,
                        sentence.target_words_used,
                      )}
                    </p>

                    {/* Translation */}
                    {showTranslations && isRevealed && (
                      <p className="text-sm text-muted-foreground mt-1 italic">
                        {sentence.english_translation}
                      </p>
                    )}
                  </div>

                  {/* Audio for this sentence */}
                  {isRevealed && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => speakSentence(sentence.text)}
                      className="flex-shrink-0"
                    >
                      <Volume2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {/* New words badge */}
          {story.new_words_introduced.length > 0 && (
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/20">
              <p className="text-xs text-muted-foreground mb-1">
                New words in this story:
              </p>
              <div className="flex flex-wrap gap-2">
                {story.new_words_introduced.map((w) => (
                  <span
                    key={w}
                    className="px-2 py-1 rounded-lg bg-accent/20 text-accent text-sm font-medium"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Controls */}
      <div className="space-y-3">
        {!storyRead ? (
          <div className="flex gap-3">
            <Button onClick={handleRevealNext} className="flex-1" size="lg">
              {allRevealed ? "Continue" : "Next Sentence"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {!allRevealed && (
              <Button variant="outline" onClick={handleRevealAll}>
                Show All
              </Button>
            )}
          </div>
        ) : (
          <Button onClick={onComplete} className="w-full" size="lg">
            Continue to Exercise
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * Render a sentence with target-language words highlighted.
 */
function renderHighlightedSentence(
  text: string,
  targetWords: string[],
): React.ReactNode {
  if (targetWords.length === 0) return text;

  // Create a regex to match target words (case-insensitive)
  const escapedWords = targetWords.map((w) =>
    w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  const pattern = new RegExp(`\\b(${escapedWords.join("|")})\\b`, "gi");

  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const isTarget = targetWords.some(
      (w) => w.toLowerCase() === part.toLowerCase(),
    );
    if (isTarget) {
      return (
        <span
          key={i}
          className="font-semibold text-primary underline decoration-primary/30 decoration-2 underline-offset-2"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}
