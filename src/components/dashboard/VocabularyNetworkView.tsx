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
        return "#f59e0b"; // amber — surfacing
      case "learning":
        return "#10b981"; // emerald — drifting
      case "known":
        return "#06b6d4"; // cyan — diving
      case "mastered":
        return "#818cf8"; // indigo — abyssal
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
      <Card
        className="lg:col-span-2 p-4 overflow-hidden"
        style={{
          background: "rgba(2,20,48,0.80)",
          border: "1px solid rgba(61,214,181,0.12)",
        }}
      >
        <div className="mb-4">
          <h3 className="font-semibold mb-2 text-[var(--sand)]">
            Word Currents
          </h3>
          <p className="text-sm" style={{ color: "rgba(125,214,197,0.65)" }}>
            Words cluster by depth stage. Click any node to inspect it.
          </p>
        </div>

        <div
          className="relative overflow-hidden rounded-xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(2,55,90,0.60) 0%, rgba(5,14,50,0.80) 100%)",
          }}
        >
          <svg
            viewBox="0 0 800 600"
            className="w-full h-auto"
            style={{ minHeight: "400px" }}
          >
            {/* Ambient background glow per zone */}
            <defs>
              <radialGradient id="glow-new" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="glow-learning" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="glow-known" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="glow-mastered" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Zone blob backgrounds */}
            <circle cx="150" cy="100" r="130" fill="url(#glow-new)" />
            <circle cx="650" cy="100" r="130" fill="url(#glow-learning)" />
            <circle cx="150" cy="500" r="130" fill="url(#glow-known)" />
            <circle cx="650" cy="500" r="130" fill="url(#glow-mastered)" />

            {/* Zone border rings */}
            <circle
              cx="150"
              cy="100"
              r="120"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1"
              strokeDasharray="3 6"
              strokeOpacity="0.25"
            />
            <circle
              cx="650"
              cy="100"
              r="120"
              fill="none"
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="3 6"
              strokeOpacity="0.25"
            />
            <circle
              cx="150"
              cy="500"
              r="120"
              fill="none"
              stroke="#06b6d4"
              strokeWidth="1"
              strokeDasharray="3 6"
              strokeOpacity="0.25"
            />
            <circle
              cx="650"
              cy="500"
              r="120"
              fill="none"
              stroke="#818cf8"
              strokeWidth="1"
              strokeDasharray="3 6"
              strokeOpacity="0.25"
            />

            {/* Zone labels */}
            <text
              x="150"
              y="28"
              textAnchor="middle"
              fill="#fbbf24"
              fontSize="10"
              fontWeight="600"
              opacity="0.75"
            >
              🪸 Surfacing ({stats.new})
            </text>
            <text
              x="650"
              y="28"
              textAnchor="middle"
              fill="#34d399"
              fontSize="10"
              fontWeight="600"
              opacity="0.75"
            >
              🐠 Drifting ({stats.learning})
            </text>
            <text
              x="150"
              y="578"
              textAnchor="middle"
              fill="#22d3ee"
              fontSize="10"
              fontWeight="600"
              opacity="0.75"
            >
              🐋 Diving ({stats.known})
            </text>
            <text
              x="650"
              y="578"
              textAnchor="middle"
              fill="#c4b5fd"
              fontSize="10"
              fontWeight="600"
              opacity="0.75"
            >
              ✨ Abyssal ({stats.mastered})
            </text>

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
          {[
            {
              color: "#f59e0b",
              glow: "rgba(245,158,11,0.6)",
              label: "🪸 Surfacing",
            },
            {
              color: "#10b981",
              glow: "rgba(16,185,129,0.6)",
              label: "🐠 Drifting",
            },
            {
              color: "#06b6d4",
              glow: "rgba(6,182,212,0.6)",
              label: "🐋 Diving",
            },
            {
              color: "#818cf8",
              glow: "rgba(129,140,248,0.6)",
              label: "✨ Abyssal",
            },
          ].map(({ color, glow, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ background: color, boxShadow: `0 0 6px ${glow}` }}
              />
              <span style={{ color: color, opacity: 0.85 }}>{label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Details panel */}
      <Card
        className="p-4"
        style={{
          background: "rgba(2,20,48,0.80)",
          border: "1px solid rgba(61,214,181,0.12)",
        }}
      >
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
                    "bg-amber-500/10 text-amber-400",
                  selectedWord.status === "learning" &&
                    "bg-emerald-500/10 text-emerald-400",
                  selectedWord.status === "known" &&
                    "bg-cyan-500/10 text-cyan-400",
                  selectedWord.status === "mastered" &&
                    "bg-indigo-400/10 text-indigo-400",
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
                    className="h-full"
                    style={
                      {
                        background:
                          "linear-gradient(90deg, #d97706 0%, #10b981 33%, #06b6d4 65%, #818cf8 100%)",
                      } as any
                    }
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
