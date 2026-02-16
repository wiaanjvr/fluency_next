"use client";

import { useState, useMemo, useEffect } from "react";
import { UserWord } from "@/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface VocabularyNetworkViewProps {
  words: UserWord[];
  language: string;
}

interface WordNode {
  id: string;
  word: UserWord;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function VocabularyNetworkView({
  words,
  language,
}: VocabularyNetworkViewProps) {
  const [selectedWord, setSelectedWord] = useState<UserWord | null>(null);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [loadingTranslation, setLoadingTranslation] = useState(false);

  // Group words by status
  const wordsByStatus = useMemo(() => {
    const groups = {
      new: [] as UserWord[],
      learning: [] as UserWord[],
      known: [] as UserWord[],
      mastered: [] as UserWord[],
    };

    words.forEach((word) => {
      if (word.status in groups) {
        groups[word.status].push(word);
      }
    });

    return groups;
  }, [words]);

  // Calculate positions for force-directed layout
  const nodes = useMemo(() => {
    const width = 800;
    const height = 600;
    const centerX = width / 2;
    const centerY = height / 2;

    const statusPositions = {
      new: { x: centerX - 250, y: centerY - 200 },
      learning: { x: centerX + 250, y: centerY - 200 },
      known: { x: centerX - 250, y: centerY + 200 },
      mastered: { x: centerX + 250, y: centerY + 200 },
    };

    const wordNodes: WordNode[] = [];

    Object.entries(wordsByStatus).forEach(([status, statusWords]) => {
      const center = statusPositions[status as keyof typeof statusPositions];
      const angleStep = (2 * Math.PI) / Math.max(statusWords.length, 1);

      statusWords.forEach((word, index) => {
        const angle = index * angleStep;
        const radius = 80 + Math.random() * 40;
        const x = center.x + Math.cos(angle) * radius;
        const y = center.y + Math.sin(angle) * radius;

        wordNodes.push({
          id: word.id,
          word,
          x,
          y,
          vx: 0,
          vy: 0,
        });
      });
    });

    return wordNodes;
  }, [wordsByStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "new":
        return "#3b82f6"; // blue
      case "learning":
        return "#eab308"; // yellow
      case "known":
        return "#22c55e"; // green
      case "mastered":
        return "#a855f7"; // purple
      default:
        return "#6b7280"; // gray
    }
  };

  const getTranslation = async (word: string) => {
    setLoadingTranslation(true);
    setTranslation(null);

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
        setTranslation(data.translation);
      }
    } catch (error) {
      console.error("Translation error:", error);
      setTranslation("Translation unavailable");
    } finally {
      setLoadingTranslation(false);
    }
  };

  const handleWordClick = (word: UserWord) => {
    setSelectedWord(word);
    getTranslation(word.word);
  };

  const stats = useMemo(() => {
    return {
      new: wordsByStatus.new.length,
      learning: wordsByStatus.learning.length,
      known: wordsByStatus.known.length,
      mastered: wordsByStatus.mastered.length,
    };
  }, [wordsByStatus]);

  if (words.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No words to visualize</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Network visualization */}
      <Card className="lg:col-span-2 p-4 overflow-hidden">
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Vocabulary Network</h3>
          <p className="text-sm text-muted-foreground">
            Words are clustered by learning status. Click a word to see details.
          </p>
        </div>

        <div className="relative bg-muted/30 rounded-lg overflow-hidden">
          <svg
            viewBox="0 0 800 600"
            className="w-full h-auto"
            style={{ minHeight: "400px" }}
          >
            {/* Status region labels */}
            <text x="150" y="30" className="fill-blue-500 text-xs font-medium">
              New ({stats.new})
            </text>
            <text
              x="650"
              y="30"
              className="fill-yellow-500 text-xs font-medium"
            >
              Learning ({stats.learning})
            </text>
            <text
              x="150"
              y="580"
              className="fill-green-500 text-xs font-medium"
            >
              Known ({stats.known})
            </text>
            <text
              x="650"
              y="580"
              className="fill-purple-500 text-xs font-medium"
            >
              Mastered ({stats.mastered})
            </text>

            {/* Status region backgrounds */}
            <circle
              cx="150"
              cy="100"
              r="120"
              className="fill-blue-500/5 stroke-blue-500/20"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <circle
              cx="650"
              cy="100"
              r="120"
              className="fill-yellow-500/5 stroke-yellow-500/20"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <circle
              cx="150"
              cy="500"
              r="120"
              className="fill-green-500/5 stroke-green-500/20"
              strokeWidth="2"
              strokeDasharray="4 4"
            />
            <circle
              cx="650"
              cy="500"
              r="120"
              className="fill-purple-500/5 stroke-purple-500/20"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* Word nodes */}
            {nodes.map((node) => {
              const isSelected = selectedWord?.id === node.id;
              const isHovered = hoveredWord === node.id;
              const color = getStatusColor(node.word.status);
              const radius = isSelected ? 8 : isHovered ? 6 : 4;

              return (
                <g key={node.id}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={radius}
                    fill={color}
                    className={cn(
                      "cursor-pointer transition-all",
                      isSelected && "stroke-white stroke-2",
                      isHovered && "opacity-80",
                    )}
                    onClick={() => handleWordClick(node.word)}
                    onMouseEnter={() => setHoveredWord(node.id)}
                    onMouseLeave={() => setHoveredWord(null)}
                  />
                  {(isSelected || isHovered) && (
                    <text
                      x={node.x}
                      y={node.y - 12}
                      textAnchor="middle"
                      className="text-xs font-medium fill-foreground pointer-events-none"
                    >
                      {node.word.word}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>New</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Learning</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Known</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span>Mastered</span>
          </div>
        </div>
      </Card>

      {/* Details panel */}
      <Card className="p-4">
        {selectedWord ? (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold mb-1">{selectedWord.word}</h3>
              {selectedWord.lemma !== selectedWord.word && (
                <p className="text-sm text-muted-foreground">
                  Base form: {selectedWord.lemma}
                </p>
              )}
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Translation
              </div>
              <div className="text-sm">
                {loadingTranslation
                  ? "Loading..."
                  : translation || "Click to load"}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Status
              </div>
              <div
                className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize",
                  selectedWord.status === "new" &&
                    "bg-blue-500/10 text-blue-500",
                  selectedWord.status === "learning" &&
                    "bg-yellow-500/10 text-yellow-500",
                  selectedWord.status === "known" &&
                    "bg-green-500/10 text-green-500",
                  selectedWord.status === "mastered" &&
                    "bg-purple-500/10 text-purple-500",
                )}
              >
                {selectedWord.status}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Mastery Level
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-green-500 to-purple-500"
                    style={{
                      width: `${Math.min(100, (selectedWord.ease_factor / 2.5) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium">
                  {selectedWord.ease_factor.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedWord.repetitions} review
                {selectedWord.repetitions !== 1 ? "s" : ""}
              </p>
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Next Review
              </div>
              <div className="text-sm">
                {new Date(selectedWord.next_review) <= new Date() ? (
                  <span className="text-red-500 font-medium">Due now</span>
                ) : (
                  formatDistanceToNow(new Date(selectedWord.next_review), {
                    addSuffix: true,
                  })
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                Review Interval
              </div>
              <div className="text-sm">
                {selectedWord.interval < 1
                  ? `${Math.round(selectedWord.interval * 24)} hours`
                  : selectedWord.interval < 30
                    ? `${Math.round(selectedWord.interval)} days`
                    : `${(selectedWord.interval / 30).toFixed(1)} months`}
              </div>
            </div>

            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">
                First Encountered
              </div>
              <div className="text-sm">
                {formatDistanceToNow(new Date(selectedWord.created_at), {
                  addSuffix: true,
                })}
              </div>
            </div>

            {selectedWord.part_of_speech && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Part of Speech
                </div>
                <div className="text-sm capitalize">
                  {selectedWord.part_of_speech}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              Click on a word in the network to see details
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
