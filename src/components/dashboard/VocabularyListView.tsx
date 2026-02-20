"use client";

import { useState, useMemo } from "react";
import { UserWord } from "@/types";
import { Card } from "@/components/ui/card";
import {
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";

interface VocabularyListViewProps {
  words: UserWord[];
  language: string;
}

type SortField =
  | "word"
  | "status"
  | "next_review"
  | "created_at"
  | "ease_factor";
type SortDirection = "asc" | "desc";

export function VocabularyListView({
  words,
  language,
}: VocabularyListViewProps) {
  const [sortField, setSortField] = useState<SortField>("next_review");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedWord, setExpandedWord] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loadingTranslations, setLoadingTranslations] = useState<Set<string>>(
    new Set(),
  );

  const sortedWords = useMemo(() => {
    return [...words].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "word":
          comparison = a.word.localeCompare(b.word);
          break;
        case "status":
          const statusOrder = { new: 0, learning: 1, known: 2, mastered: 3 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        case "next_review":
          comparison =
            new Date(a.next_review).getTime() -
            new Date(b.next_review).getTime();
          break;
        case "created_at":
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "ease_factor":
          comparison = a.ease_factor - b.ease_factor;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [words, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

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

  const toggleExpand = (wordId: string, word: string) => {
    if (expandedWord === wordId) {
      setExpandedWord(null);
    } else {
      setExpandedWord(wordId);
      getTranslation(wordId, word);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      case "learning":
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      case "known":
        return "text-green-500 bg-green-500/10 border-green-500/20";
      case "mastered":
        return "text-purple-500 bg-purple-500/10 border-purple-500/20";
      default:
        return "text-gray-500 bg-gray-500/10 border-gray-500/20";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "new":
        return <AlertCircle className="h-4 w-4" />;
      case "learning":
        return <TrendingUp className="h-4 w-4" />;
      case "known":
        return <CheckCircle2 className="h-4 w-4" />;
      case "mastered":
        return <CheckCircle2 className="h-4 w-4 fill-current" />;
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

  const SortButton = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleSort(field)}
      className="gap-1 h-8 text-xs font-medium"
    >
      {children}
      <ArrowUpDown
        className={cn(
          "h-3 w-3",
          sortField === field ? "opacity-100" : "opacity-50",
        )}
      />
    </Button>
  );

  if (words.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No words found</p>
      </Card>
    );
  }

  return (
    <Card>
      {/* Header */}
      <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 border-b text-xs font-medium text-muted-foreground">
        <div className="col-span-3">
          <SortButton field="word">Word</SortButton>
        </div>
        <div className="col-span-2">
          <SortButton field="status">Status</SortButton>
        </div>
        <div className="col-span-2">
          <SortButton field="ease_factor">Mastery</SortButton>
        </div>
        <div className="col-span-2">
          <SortButton field="next_review">Next Review</SortButton>
        </div>
        <div className="col-span-2">
          <SortButton field="created_at">Added</SortButton>
        </div>
        <div className="col-span-1"></div>
      </div>

      {/* Word list */}
      <div className="divide-y">
        {sortedWords.map((word) => {
          const isExpanded = expandedWord === word.id;
          const reviewStatus = getReviewStatus(word.next_review);
          const isLoadingTranslation = loadingTranslations.has(word.id);

          return (
            <div key={word.id} className="hover:bg-muted/50 transition-colors">
              <button
                onClick={() => toggleExpand(word.id, word.word)}
                className="w-full grid grid-cols-12 gap-4 p-4 text-left items-center"
              >
                <div className="col-span-3">
                  <div className="font-medium">{word.word}</div>
                  {word.lemma !== word.word && (
                    <div className="text-xs text-muted-foreground">
                      ({word.lemma})
                    </div>
                  )}
                </div>

                <div className="col-span-2">
                  <div
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium capitalize",
                      getStatusColor(word.status),
                    )}
                  >
                    {getStatusIcon(word.status)}
                    {word.status}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full transition-all",
                            word.status === "mastered"
                              ? "bg-purple-500"
                              : word.status === "known"
                                ? "bg-green-500"
                                : word.status === "learning"
                                  ? "bg-yellow-500"
                                  : "bg-blue-500",
                          )}
                          style={{
                            width: `${Math.min(100, (word.ease_factor / 2.5) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {word.ease_factor.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {word.repetitions} review{word.repetitions !== 1 ? "s" : ""}
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className={cn("h-3 w-3", reviewStatus.color)} />
                    <span className={cn("text-xs", reviewStatus.color)}>
                      {reviewStatus.text}
                    </span>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(word.created_at), {
                      addSuffix: true,
                    })}
                  </div>
                </div>

                <div className="col-span-1 flex justify-end">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 grid grid-cols-2 gap-4 bg-muted/30">
                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Translation
                    </div>
                    <div className="text-sm">
                      {isLoadingTranslation ? (
                        <span className="text-muted-foreground">
                          Loading...
                        </span>
                      ) : (
                        translations[word.id] || "Click to load translation"
                      )}
                    </div>
                  </div>

                  {word.part_of_speech && (
                    <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1">
                        Part of Speech
                      </div>
                      <div className="text-sm capitalize">
                        {word.part_of_speech}
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Ease Factor
                    </div>
                    <div className="text-sm">
                      {word.ease_factor.toFixed(2)} (
                      {word.ease_factor >= 2.2
                        ? "Excellent"
                        : word.ease_factor >= 1.8
                          ? "Good"
                          : "Needs practice"}
                      )
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-muted-foreground mb-1">
                      Interval
                    </div>
                    <div className="text-sm">
                      {word.interval < 1
                        ? `${Math.round(word.interval * 24)} hours`
                        : `${Math.round(word.interval)} days`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
