"use client";

import { useState, useMemo } from "react";
import { UserWord } from "@/types";
import { ChevronDown, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

// ============================================================================
// Vocabulary List View — Tonal depth bars, teal review badges
// ============================================================================

interface VocabularyListViewProps {
  words: UserWord[];
  language: string;
}

// --- Depth stages (single teal color system) ----------------------------------
const STAGE = {
  new: {
    label: "DRIFTING",
    depthBase: 0,
    depthRange: 20,
    desc: "Just encountered",
  },
  learning: {
    label: "SURFACING",
    depthBase: 20,
    depthRange: 32,
    desc: "Building familiarity",
  },
  known: {
    label: "CRUISING",
    depthBase: 52,
    depthRange: 24,
    desc: "Solid recall",
  },
  mastered: {
    label: "ABYSS",
    depthBase: 76,
    depthRange: 24,
    desc: "Deep memory",
  },
} as const;

type StageKey = keyof typeof STAGE;

function getStage(status: string): (typeof STAGE)[StageKey] {
  return STAGE[(status as StageKey) in STAGE ? (status as StageKey) : "new"];
}

function getDepthPercent(word: UserWord): number {
  const stage = getStage(word.status);
  const easePct = Math.max(
    0,
    Math.min(1, (word.ease_factor - 1.3) / (3.5 - 1.3)),
  );
  return Math.round(stage.depthBase + easePct * stage.depthRange);
}

// --- Depth gauge (single teal gradient) ---------------------------------------
function DepthGauge({ word }: { word: UserWord }) {
  const pct = getDepthPercent(word);
  const stage = getStage(word.status);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Track */}
      <div
        className="depth-bar-track relative w-full overflow-hidden"
        style={{
          height: 4,
          borderRadius: 4,
          background: "rgba(74, 127, 165, 0.2)",
          width: 140,
        }}
      >
        {/* Fill — teal gradient, variable width */}
        <div
          className="depth-bar-fill absolute inset-y-0 left-0 transition-all"
          style={{
            width: `${pct}%`,
            height: "100%",
            borderRadius: 4,
            background:
              "linear-gradient(90deg, var(--ocean-teal-primary, #00d4aa), #0891b2)",
            transition: "width 600ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        />
      </div>
      {/* Label */}
      <span
        className={cn(
          "depth-state-label",
          word.status === "mastered" && "state-ready",
        )}
        style={{
          fontFamily: "var(--font-inter, 'Inter', sans-serif)",
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.03em",
          padding: "2px 8px",
          borderRadius: 4,
          background: "var(--ocean-depth-3, #132638)",
          color:
            word.status === "mastered"
              ? "var(--ocean-teal-primary, #00d4aa)"
              : "var(--ocean-steel, #4a7fa5)",
          display: "inline-block",
        }}
      >
        {stage.label}
      </span>
    </div>
  );
}

// --- Review chip (teal badges, no red) ----------------------------------------
function ReviewChip({ nextReview }: { nextReview: string }) {
  const [badgeHovered, setBadgeHovered] = useState(false);
  const reviewDate = new Date(nextReview);
  const now = new Date();
  const isDue = reviewDate <= now;
  const diffMs = reviewDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (isDue) {
    return (
      <span
        className="review-badge review-badge-ready inline-flex items-center gap-1"
        onMouseEnter={() => setBadgeHovered(true)}
        onMouseLeave={() => setBadgeHovered(false)}
        style={{
          fontSize: 11,
          fontWeight: 500,
          fontFamily: "var(--font-inter, 'Inter', sans-serif)",
          background: badgeHovered
            ? "var(--ocean-teal-primary, #00d4aa)"
            : "transparent",
          border: "none",
          color: badgeHovered ? "#070f1a" : "var(--text-secondary, #94a3b8)",
          padding: badgeHovered ? "2px 8px" : 0,
          borderRadius: 4,
          transition: "all 0.15s ease",
        }}
      >
        <span
          style={{ color: "var(--ocean-teal-primary, #00d4aa)", fontSize: 10 }}
        >
          ↑
        </span>
        READY
      </span>
    );
  }
  if (diffDays < 1)
    return (
      <span
        className="review-badge review-badge-soon"
        style={{
          fontSize: 11,
          fontWeight: 500,
          fontFamily: "var(--font-inter, 'Inter', sans-serif)",
          color: "var(--text-muted, #4a6580)",
          background: "transparent",
          border: "none",
          padding: 0,
        }}
      >
        {Math.round(diffDays * 24)}h
      </span>
    );
  if (diffDays < 30)
    return (
      <span
        className="review-badge review-badge-later"
        style={{
          fontSize: 11,
          fontWeight: 500,
          fontFamily: "var(--font-inter, 'Inter', sans-serif)",
          color: "var(--text-muted, #4a6580)",
          background: "transparent",
          border: "none",
          padding: 0,
        }}
      >
        {Math.round(diffDays)}d
      </span>
    );
  return (
    <span
      style={{
        fontSize: 10,
        fontFamily: "var(--font-inter, 'Inter', sans-serif)",
        color: "var(--text-ghost, #2D5A52)",
      }}
    >
      {formatDistanceToNow(reviewDate, { addSuffix: true })}
    </span>
  );
}

// --- Main component -----------------------------------------------------------
export function VocabularyListView({
  words,
  language,
}: VocabularyListViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"word" | "status" | "next_review">(
    "next_review",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    const order: Record<string, number> = {
      new: 0,
      learning: 1,
      known: 2,
      mastered: 3,
    };
    return [...words].sort((a, b) => {
      let cmp = 0;
      if (sortField === "word") cmp = a.word.localeCompare(b.word);
      else if (sortField === "status")
        cmp = (order[a.status] ?? 0) - (order[b.status] ?? 0);
      else
        cmp =
          new Date(a.next_review).getTime() - new Date(b.next_review).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [words, sortField, sortDir]);

  const fetchTranslation = async (id: string, word: string) => {
    if (translations[id] || loadingIds.has(id)) return;
    setLoadingIds((s) => new Set(s).add(id));
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: word,
          targetLang: "en",
          sourceLang: language,
        }),
      });
      const data = await res.json();
      setTranslations((t) => ({ ...t, [id]: data.translation ?? "—" }));
    } catch {
      setTranslations((t) => ({ ...t, [id]: "Translation unavailable" }));
    } finally {
      setLoadingIds((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  const toggle = (id: string, word: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    fetchTranslation(id, word);
  };

  if (words.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-2 text-center">
        <span className="text-4xl">🌊</span>
        <p
          style={{
            color: "var(--text-muted, #4a6580)",
            fontFamily: "var(--font-inter, 'Inter', sans-serif)",
            fontSize: 14,
          }}
        >
          No words found in these waters.
        </p>
      </div>
    );
  }

  const ColHeader = ({
    field,
    children,
  }: {
    field: typeof sortField;
    children: React.ReactNode;
  }) => (
    <button
      onClick={() => handleSort(field)}
      className="text-left transition-colors"
      style={{
        fontFamily: "var(--font-inter, 'Inter', sans-serif)",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase" as const,
        color:
          sortField === field
            ? "var(--text-secondary, #94a3b8)"
            : "var(--text-muted, #4a6580)",
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
      }}
    >
      {children}
      {sortField === field && (
        <span style={{ marginLeft: 2, opacity: 0.7 }}>
          {sortDir === "asc" ? " ↑" : " ↓"}
        </span>
      )}
    </button>
  );

  return (
    <div className="w-full">
      {/* Column headers */}
      <div
        className="grid grid-cols-[1fr_180px_110px_28px] gap-3 px-4 py-2.5"
        style={{
          borderBottom: "1px solid var(--ocean-depth-4, rgba(26,51,71,0.6))",
        }}
      >
        <ColHeader field="word">Word</ColHeader>
        <ColHeader field="status">Depth</ColHeader>
        <ColHeader field="next_review">Review</ColHeader>
        <div />
      </div>

      {/* Rows */}
      <div role="list">
        {sorted.map((word, idx) => {
          const stage = getStage(word.status);
          const isExpanded = expandedId === word.id;
          const isHovered = hoveredId === word.id;

          return (
            <div key={word.id} role="listitem">
              {/* Row button */}
              <button
                className="vocab-row w-full text-left focus:outline-none focus-visible:ring-1"
                onClick={() => toggle(word.id, word.word)}
                onMouseEnter={() => setHoveredId(word.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  // @ts-expect-error CSS custom property
                  "--row-index": idx,
                  background: isExpanded
                    ? "var(--teal-glow, rgba(0, 212, 170, 0.08))"
                    : isHovered
                      ? "var(--teal-glow, rgba(0, 212, 170, 0.08))"
                      : "transparent",
                  borderLeft:
                    isHovered || isExpanded
                      ? "2px solid var(--ocean-teal-primary, #00d4aa)"
                      : "2px solid transparent",
                  transition: "all 0.18s ease",
                }}
              >
                <div className="grid grid-cols-[1fr_180px_110px_28px] gap-3 px-4 py-3.5 items-center">
                  {/* Word */}
                  <div>
                    <span
                      style={{
                        fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                        fontWeight: 500,
                        color: isHovered
                          ? "var(--text-primary, #e2e8f0)"
                          : "var(--text-secondary, #94a3b8)",
                        fontSize: 14,
                        transition: "color 0.15s ease",
                      }}
                    >
                      {word.word}
                    </span>
                    {word.lemma && word.lemma !== word.word && (
                      <span
                        style={{
                          marginLeft: 6,
                          fontSize: 11,
                          color: "var(--text-ghost, #2D5A52)",
                        }}
                      >
                        ({word.lemma})
                      </span>
                    )}
                  </div>

                  {/* Depth gauge */}
                  <DepthGauge word={word} />

                  {/* Review chip */}
                  <ReviewChip nextReview={word.next_review} />

                  {/* Chevron */}
                  <div
                    className="flex justify-center transition-transform duration-200"
                    style={{
                      color: "var(--text-ghost, #2D5A52)",
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      opacity: isHovered || isExpanded ? 0.8 : 0.25,
                    }}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </button>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div
                  className="px-4 pb-4 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-4"
                  style={{
                    background: "var(--ocean-depth-3, #132638)",
                    borderBottom: "1px solid var(--ocean-depth-4, #1a3347)",
                  }}
                >
                  {/* Translation */}
                  <div className="col-span-2 sm:col-span-1">
                    <div
                      style={{
                        fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                        fontSize: 9,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase" as const,
                        color: "var(--text-ghost, #2D5A52)",
                        marginBottom: 6,
                      }}
                    >
                      Translation
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--text-primary, #F0FDFA)",
                      }}
                    >
                      {loadingIds.has(word.id) ? (
                        <span
                          className="flex items-center gap-1.5"
                          style={{ color: "var(--text-ghost, #2D5A52)" }}
                        >
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Loading…
                        </span>
                      ) : (
                        (translations[word.id] ?? "—")
                      )}
                    </div>
                  </div>

                  {/* Stage badge */}
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                        fontSize: 9,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase" as const,
                        color: "var(--text-ghost, #2D5A52)",
                        marginBottom: 6,
                      }}
                    >
                      Stage
                    </div>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full"
                      style={{
                        fontSize: 10,
                        fontWeight: 500,
                        fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                        letterSpacing: "0.06em",
                        background: "var(--ocean-depth-3, #132638)",
                        border:
                          "1px solid var(--teal-border, rgba(0,212,170,0.18))",
                        color: "var(--text-muted, #4a6580)",
                      }}
                    >
                      {stage.label}
                    </span>
                    <div
                      style={{
                        fontSize: 10,
                        color: "var(--text-ghost, #2D5A52)",
                        marginTop: 4,
                      }}
                    >
                      {stage.desc}
                    </div>
                  </div>

                  {/* Reviews */}
                  <div>
                    <div
                      style={{
                        fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                        fontSize: 9,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase" as const,
                        color: "var(--text-ghost, #2D5A52)",
                        marginBottom: 6,
                      }}
                    >
                      Sessions
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "var(--text-secondary, #7BA8A0)",
                        fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                      }}
                    >
                      {word.repetitions} review
                      {word.repetitions !== 1 ? "s" : ""}
                    </div>
                  </div>

                  {/* Part of speech */}
                  {word.part_of_speech && (
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                          fontSize: 9,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase" as const,
                          color: "var(--text-ghost, #2D5A52)",
                          marginBottom: 6,
                        }}
                      >
                        Type
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          color: "var(--text-secondary, #7BA8A0)",
                          textTransform: "capitalize" as const,
                        }}
                      >
                        {word.part_of_speech}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
