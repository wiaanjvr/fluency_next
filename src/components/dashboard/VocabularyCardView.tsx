"use client";

import { useState } from "react";
import { UserWord } from "@/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface VocabularyCardViewProps {
  words: UserWord[];
  language: string;
}

export function VocabularyCardView({
  words,
  language,
}: VocabularyCardViewProps) {
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loadingTranslations, setLoadingTranslations] = useState<Set<string>>(
    new Set(),
  );

  const getTranslation = async (wordId: string, word: string) => {
    if (translations[wordId]) {
      return;
    }

    setLoadingTranslations((prev) => new Set(prev).add(wordId));

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: word,
          targetLang: "en",
          sourceLang: language,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setTranslations((prev) => ({ ...prev, [wordId]: data.translation }));
      }
    } catch (error) {
      console.error("Translation error:", error);
      setTranslations((prev) => ({
        ...prev,
        [wordId]: "Translation unavailable",
      }));
    } finally {
      setLoadingTranslations((prev) => {
        const newSet = new Set(prev);
        newSet.delete(wordId);
        return newSet;
      });
    }
  };

  const toggleFlip = (wordId: string, word: string) => {
    setFlippedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(wordId)) {
        newSet.delete(wordId);
      } else {
        newSet.add(wordId);
        getTranslation(wordId, word);
      }
      return newSet;
    });
  };

  const getMasteryCardClass = (status: string) => {
    switch (status) {
      case "new":
        return "mastery-card-new";
      case "learning":
        return "mastery-card-learning";
      case "known":
        return "mastery-card-known";
      case "mastered":
        return "mastery-card-mastered";
      default:
        return "";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "border-amber-500/40 bg-amber-500/[0.06]";
      case "learning":
        return "border-emerald-500/40 bg-emerald-500/[0.06]";
      case "known":
        return "border-cyan-500/40 bg-cyan-500/[0.06]";
      case "mastered":
        return "border-indigo-400/40 bg-indigo-400/[0.06]";
      default:
        return "border-white/10 bg-white/[0.03]";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new":
        return <AlertCircle className="h-5 w-5 text-amber-400" />;
      case "learning":
        return <TrendingUp className="h-5 w-5 text-emerald-400" />;
      case "known":
        return <CheckCircle2 className="h-5 w-5 text-cyan-400" />;
      case "mastered":
        return <Sparkles className="h-5 w-5 text-indigo-400" />;
      default:
        return null;
    }
  };

  const getReviewStatus = (nextReview: string) => {
    const reviewDate = new Date(nextReview);
    const now = new Date();
    const isPast = reviewDate <= now;

    return {
      isPast,
      text: isPast
        ? "Due now"
        : `Due ${formatDistanceToNow(reviewDate, { addSuffix: true })}`,
      color: isPast ? "text-red-500" : "text-muted-foreground",
    };
  };

  if (words.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No words found</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {words.map((word) => {
        const isFlipped = flippedCards.has(word.id);
        const isLoadingTranslation = loadingTranslations.has(word.id);
        const reviewStatus = getReviewStatus(word.next_review);

        return (
          <Card
            key={word.id}
            className={cn(
              "relative cursor-pointer transition-all hover:shadow-lg border-2 hover:scale-[1.02]",
              getStatusColor(word.status),
              getMasteryCardClass(word.status),
            )}
            onClick={() => toggleFlip(word.id, word.word)}
          >
            <div className="p-4 h-full min-h-[200px] flex flex-col">
              {!isFlipped ? (
                <>
                  {/* Front of card */}
                  <div className="flex items-start justify-between mb-3">
                    {getStatusIcon(word.status)}
                    {reviewStatus.isPast && (
                      <div
                        className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background: "rgba(248,113,113,0.15)",
                          color: "#fca5a5",
                          border: "1px solid rgba(248,113,113,0.28)",
                        }}
                      >
                        ⚡ Ready
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-center items-center text-center">
                    <h3 className="text-2xl font-bold mb-2">{word.word}</h3>
                    {word.lemma !== word.word && (
                      <p className="text-sm text-muted-foreground">
                        ({word.lemma})
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 mt-auto">
                    {/* Mastery bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Mastery</span>
                        <span className="font-medium">
                          {word.ease_factor.toFixed(1)}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            word.status === "mastered"
                              ? "bg-indigo-400"
                              : word.status === "known"
                                ? "bg-cyan-400"
                                : word.status === "learning"
                                  ? "bg-emerald-400"
                                  : "bg-amber-400",
                          )}
                          style={{
                            width: `${Math.min(100, (word.ease_factor / 2.5) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center justify-between text-xs">
                      <span
                        className={cn(
                          "capitalize font-medium",
                          word.status === "new"
                            ? "text-amber-400"
                            : word.status === "learning"
                              ? "text-emerald-400"
                              : word.status === "known"
                                ? "text-cyan-400"
                                : "text-indigo-400",
                        )}
                      >
                        {word.status}
                      </span>
                      <span className="text-muted-foreground">
                        {word.repetitions} reviews
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t text-center">
                    <p className="text-xs text-muted-foreground">
                      Click to see translation
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Back of card */}
                  <div className="flex-1 flex flex-col">
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold mb-2">{word.word}</h3>
                      <div className="text-lg">
                        {isLoadingTranslation ? (
                          <span className="text-muted-foreground">
                            Loading...
                          </span>
                        ) : (
                          <span className="font-medium">
                            {translations[word.id] || "Loading..."}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span
                          className={cn(
                            "capitalize font-medium",
                            word.status === "new"
                              ? "text-amber-400"
                              : word.status === "learning"
                                ? "text-emerald-400"
                                : word.status === "known"
                                  ? "text-cyan-400"
                                  : "text-indigo-400",
                          )}
                        >
                          {word.status}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Ease Factor:
                        </span>
                        <span className="font-medium">
                          {word.ease_factor.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reviews:</span>
                        <span className="font-medium">{word.repetitions}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interval:</span>
                        <span className="font-medium">
                          {word.interval < 1
                            ? `${Math.round(word.interval * 24)}h`
                            : `${Math.round(word.interval)}d`}
                        </span>
                      </div>

                      <div className="flex justify-between items-start">
                        <span className="text-muted-foreground">
                          Next Review:
                        </span>
                        <span className={cn("font-medium", reviewStatus.color)}>
                          {reviewStatus.text}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Added:</span>
                        <span className="font-medium">
                          {formatDistanceToNow(new Date(word.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>

                      {word.part_of_speech && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="capitalize font-medium">
                            {word.part_of_speech}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t text-center">
                    <p className="text-xs text-muted-foreground">
                      Click to flip back
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
