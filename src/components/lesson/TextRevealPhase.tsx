"use client";

import React, { useState, useRef, useEffect } from "react";
import { Lesson, LessonWord, VocabularyRating } from "@/types/lesson";
import { WordRating } from "@/types";
import {
  Eye,
  ArrowRight,
  Play,
  Pause,
  Volume2,
  CheckCircle2,
  BookOpen,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TextRevealPhaseProps {
  lesson: Lesson;
  onWordRating: (rating: VocabularyRating) => void;
  vocabularyRatings: VocabularyRating[];
  onPhaseComplete: () => void;
}

// 4 word rating options mapping to SRS ratings
const RATING_OPTIONS: {
  rating: WordRating;
  label: string;
  description: string;
  color: string;
}[] = [
  {
    rating: 0,
    label: "Don't Know",
    description: "Unfamiliar word",
    color: "bg-red-500",
  },
  {
    rating: 2,
    label: "Hard",
    description: "Difficult to recall",
    color: "bg-orange-500",
  },
  {
    rating: 3,
    label: "Good",
    description: "Know with thought",
    color: "bg-lime-500",
  },
  {
    rating: 5,
    label: "Easy",
    description: "Know instantly",
    color: "bg-emerald-500",
  },
];

export function TextRevealPhase({
  lesson,
  onWordRating,
  vocabularyRatings,
  onPhaseComplete,
}: TextRevealPhaseProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedWord, setSelectedWord] = useState<LessonWord | null>(null);
  const [revealedWords, setRevealedWords] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement>(null);

  // Get words that need rating (new or due for review)
  const wordsToRate = lesson.words.filter((w) => w.isNew || w.isDueForReview);
  const ratedWordLemmas = new Set(vocabularyRatings.map((r) => r.lemma));
  const allWordsRated = wordsToRate.every((w) => ratedWordLemmas.has(w.lemma));
  const progress =
    (vocabularyRatings.length / Math.max(wordsToRate.length, 1)) * 100;

  // Debug logging
  useEffect(() => {
    console.log("TextRevealPhase - Lesson words analysis:", {
      totalWords: lesson.words.length,
      wordsToRate: wordsToRate.length,
      newWords: lesson.words.filter((w) => w.isNew).length,
      reviewWords: lesson.words.filter((w) => w.isDueForReview).length,
      alreadyRated: vocabularyRatings.length,
      words: lesson.words.map((w) => ({
        word: w.word,
        lemma: w.lemma,
        isNew: w.isNew,
        isDueForReview: w.isDueForReview,
        userKnowledge: w.userKnowledge,
      })),
    });
  }, [lesson.words, wordsToRate.length, vocabularyRatings.length]);

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

  const handleWordClick = (word: LessonWord) => {
    if (word.isNew || word.isDueForReview) {
      setSelectedWord(word);
    }
  };

  const handleRating = (rating: WordRating) => {
    if (!selectedWord) return;

    const vocabRating: VocabularyRating = {
      lessonId: lesson.id,
      word: selectedWord.word,
      lemma: selectedWord.lemma,
      rating,
      context: extractContext(lesson.targetText, selectedWord.word),
    };

    onWordRating(vocabRating);
    setRevealedWords((prev) => new Set(prev).add(selectedWord.lemma));
    setSelectedWord(null);
  };

  const extractContext = (text: string, word: string): string => {
    const sentences = text.split(/[.!?]+/);
    const sentence = sentences.find((s) =>
      s.toLowerCase().includes(word.toLowerCase()),
    );
    return sentence?.trim() || "";
  };

  const renderWord = (word: LessonWord, index: number) => {
    const isRated = ratedWordLemmas.has(word.lemma);
    const isTargetWord = word.isNew || word.isDueForReview;
    const isSelected = selectedWord?.position === word.position;

    // Whitespace and punctuation
    if (/^[\s]+$/.test(word.word)) {
      return <span key={index}> </span>;
    }
    if (/^[.,;:!?'"()]+$/.test(word.word)) {
      return <span key={index}>{word.word}</span>;
    }

    let className = "transition-all duration-200 inline px-0.5 rounded ";

    if (isTargetWord) {
      if (isRated) {
        // Already rated - show green
        className +=
          "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 ";
      } else if (word.isNew) {
        // New word - highlight yellow, clickable
        className +=
          "bg-amber-200 dark:bg-amber-700/50 text-amber-900 dark:text-amber-100 cursor-pointer hover:bg-amber-300 dark:hover:bg-amber-600/50 font-medium ";
      } else {
        // Review word - highlight blue, clickable
        className +=
          "bg-blue-200 dark:bg-blue-700/50 text-blue-900 dark:text-blue-100 cursor-pointer hover:bg-blue-300 dark:hover:bg-blue-600/50 ";
      }
    }

    if (isSelected) {
      className += "ring-2 ring-primary ring-offset-2 ";
    }

    // Check if next word is punctuation (don't add space before punctuation)
    const nextWord = lesson.words[index + 1];
    const needsSpace = !nextWord || !/^[.,;:!?'"()]+$/.test(nextWord.word);

    return (
      <React.Fragment key={index}>
        <span
          className={className}
          onClick={() => isTargetWord && !isRated && handleWordClick(word)}
        >
          {word.word}
        </span>
        {needsSpace && " "}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-6">
      {/* Phase Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-library-brass/10 text-library-brass">
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">
            Phase 4: Text & Vocabulary
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-light tracking-tight">
          Read & Rate Your{" "}
          <span className="font-serif italic text-library-brass">
            Knowledge
          </span>
        </h1>
        <p className="text-muted-foreground font-light max-w-md mx-auto">
          Now you can see the text! Highlighted words are new or due for review.
          Click each one to rate how well you know it.
        </p>
      </div>

      {/* Progress */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Vocabulary Progress</span>
          <span className="text-sm text-muted-foreground font-light">
            {vocabularyRatings.length} / {wordsToRate.length} words
          </span>
        </div>
        <div className="w-full bg-background rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-library-brass transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {wordsToRate.length > 0 && vocabularyRatings.length === 0 && (
          <p className="text-xs text-muted-foreground font-light mt-3">
            💡 Tip: Click on highlighted words in the text below to rate your
            knowledge
          </p>
        )}
      </div>

      {/* Audio Player */}
      <div className="bg-card border border-library-brass/20 rounded-2xl p-6">
        <audio
          ref={audioRef}
          src={lesson.audioUrl}
          onEnded={() => setIsPlaying(false)}
        />
        <div className="flex items-center gap-4">
          <button
            onClick={togglePlayPause}
            className="h-12 w-12 rounded-xl bg-transparent border border-border hover:bg-card flex items-center justify-center transition-colors"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 text-foreground" />
            ) : (
              <Play className="h-5 w-5 ml-0.5 text-foreground" />
            )}
          </button>
          <div>
            <p className="font-medium">Listen while reading</p>
            <p className="text-sm text-muted-foreground font-light">
              Follow along with the audio
            </p>
          </div>
        </div>
      </div>

      {/* Text Display */}
      <div className="bg-card border border-border rounded-2xl">
        <div className="p-6 border-b border-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-library-brass/10 flex items-center justify-center">
            <BookOpen className="h-5 w-5 text-library-brass" />
          </div>
          <h2 className="text-lg font-light">{lesson.title}</h2>
        </div>
        <div className="p-6">
          <div className="text-lg leading-relaxed font-serif">
            {lesson.words.map((word, index) => renderWord(word, index))}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-border flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-amber-200 dark:bg-amber-700/50" />
              <span className="font-light">New word (click to rate)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-blue-200 dark:bg-blue-700/50" />
              <span className="font-light">Review word</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-green-100 dark:bg-green-900/30" />
              <span className="font-light">Rated</span>
            </div>
          </div>
        </div>
      </div>

      {/* Word Rating Modal */}
      {selectedWord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-library-brass rounded-2xl shadow-lg w-full max-w-md">
            <div className="p-6 border-b border-border text-center">
              <h2 className="text-lg sm:text-xl font-light">
                How well do you know:{" "}
                <span className="text-library-brass font-serif italic">
                  "{selectedWord.word}"
                </span>
                ?
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {selectedWord.translation && (
                <p className="text-center text-muted-foreground font-light">
                  Translation: {selectedWord.translation}
                </p>
              )}

              {/* Rating Buttons */}
              <div className="grid grid-cols-2 gap-3">
                {RATING_OPTIONS.map((option) => (
                  <button
                    key={option.rating}
                    className="bg-transparent border border-border hover:bg-card rounded-xl py-4 flex flex-col items-center gap-1 transition-colors"
                    onClick={() => handleRating(option.rating)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={cn("w-3 h-3 rounded-full", option.color)}
                      />
                      <span className="font-medium">{option.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-light">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>

              <button
                className="w-full py-3 text-muted-foreground hover:text-foreground font-light transition-colors"
                onClick={() => setSelectedWord(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Translation (collapsed by default) */}
      <details className="group">
        <summary className="cursor-pointer list-none">
          <div className="bg-card border border-border rounded-2xl p-6 hover:bg-card/80 transition-colors">
            <div className="flex items-center justify-between">
              <span className="font-medium">Show Translation</span>
              <span className="text-sm text-muted-foreground font-light group-open:hidden">
                Click to reveal
              </span>
              <span className="text-sm text-muted-foreground font-light hidden group-open:inline">
                Translation shown
              </span>
            </div>
          </div>
        </summary>
        <div className="bg-card border border-border rounded-2xl p-6 mt-2">
          <p className="text-muted-foreground font-light">
            {lesson.translation}
          </p>
        </div>
      </details>

      {/* Continue Button */}
      <button
        onClick={onPhaseComplete}
        disabled={!allWordsRated}
        className={cn(
          "w-full py-4 px-8 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors",
          allWordsRated
            ? "bg-library-brass hover:bg-library-brass/90 text-background"
            : "bg-card border border-border text-muted-foreground cursor-not-allowed",
        )}
      >
        {allWordsRated ? (
          <>
            Continue to Exercises
            <ArrowRight className="h-5 w-5" />
          </>
        ) : (
          <>
            Rate {wordsToRate.length - vocabularyRatings.length} more word
            {wordsToRate.length - vocabularyRatings.length > 1 ? "s" : ""}
          </>
        )}
      </button>
    </div>
  );
}
