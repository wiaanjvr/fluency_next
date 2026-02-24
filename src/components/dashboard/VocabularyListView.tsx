"use client";

import { useState, useMemo } from "react";
import { UserWord } from "@/types";
import { ChevronDown, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface VocabularyListViewProps {
  words: UserWord[];
  language: string;
}

// --- Ocean depth stages -------------------------------------------------------
const STAGE = {
  new: {
    label: "Surfacing",
    emoji: "🪸",
    depthBase: 0,
    depthRange: 20,
    glow: "rgba(245, 158, 11, 0.18)",
    hoverGlow: "rgba(245, 158, 11, 0.40)",
    pill: {
      bg: "rgba(245,158,11,0.10)",
      border: "rgba(245,158,11,0.28)",
      text: "#fbbf24",
    },
    desc: "Just encountered",
  },
  learning: {
    label: "Drifting",
    emoji: "🐠",
    depthBase: 20,
    depthRange: 32,
    glow: "rgba(16, 185, 129, 0.16)",
    hoverGlow: "rgba(16, 185, 129, 0.38)",
    pill: {
      bg: "rgba(16,185,129,0.10)",
      border: "rgba(16,185,129,0.28)",
      text: "#34d399",
    },
    desc: "Building familiarity",
  },
  known: {
    label: "Diving",
    emoji: "🐋",
    depthBase: 52,
    depthRange: 24,
    glow: "rgba(6, 182, 212, 0.16)",
    hoverGlow: "rgba(6, 182, 212, 0.40)",
    pill: {
      bg: "rgba(6,182,212,0.10)",
      border: "rgba(6,182,212,0.28)",
      text: "#22d3ee",
    },
    desc: "Solid recall",
  },
  mastered: {
    label: "Abyssal",
    emoji: "✨",
    depthBase: 76,
    depthRange: 24,
    glow: "rgba(167, 139, 250, 0.18)",
    hoverGlow: "rgba(167, 139, 250, 0.45)",
    pill: {
      bg: "rgba(167,139,250,0.10)",
      border: "rgba(167,139,250,0.28)",
      text: "#c4b5fd",
    },
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

// --- Depth gauge --------------------------------------------------------------
function DepthGauge({ word }: { word: UserWord }) {
  const pct = getDepthPercent(word);
  const stage = getStage(word.status);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div
        className="relative w-full h-[5px] rounded-full overflow-hidden"
        style={{ background: "rgba(255,255,255,0.07)" }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background:
              "linear-gradient(90deg, #d97706 0%, #10b981 33%, #06b6d4 65%, #818cf8 100%)",
          }}
        />
      </div>
      <span
        className="text-[10px] font-semibold uppercase tracking-wide"
        style={{ color: stage.pill.text }}
      >
        {stage.emoji} {stage.label}
      </span>
    </div>
  );
}

// --- Review chip --------------------------------------------------------------
function ReviewChip({ nextReview }: { nextReview: string }) {
  const reviewDate = new Date(nextReview);
  const now = new Date();
  const isDue = reviewDate <= now;
  const diffMs = reviewDate.getTime() - now.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (isDue) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[rgba(248,113,113,0.12)] border border-[rgba(248,113,113,0.28)] text-[#fca5a5]">
        <Zap className="h-2.5 w-2.5" />
        Ready
      </span>
    );
  }
  if (diffDays < 1)
    return (
      <span className="text-xs text-[var(--turquoise)]">
        in {Math.round(diffDays * 24)}h
      </span>
    );
  if (diffDays < 30)
    return (
      <span className="text-xs text-[var(--seafoam)]">
        in {Math.round(diffDays)}d
      </span>
    );
  return (
    <span className="text-xs text-[var(--seafoam)]">
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
        <p className="text-[var(--seafoam)] text-sm">
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
      className={cn(
        "text-[11px] font-semibold uppercase tracking-wider transition-colors text-left",
        sortField === field
          ? "text-[var(--turquoise)]"
          : "text-[var(--seafoam)]/50 hover:text-[var(--seafoam)]",
      )}
    >
      {children}
      {sortField === field && (
        <span className="ml-0.5 opacity-70">
          {sortDir === "asc" ? " ↑" : " ↓"}
        </span>
      )}
    </button>
  );

  return (
    <div className="w-full">
      {/* Column headers */}
      <div className="grid grid-cols-[1fr_180px_110px_28px] gap-3 px-4 py-2.5 border-b border-white/[0.06]">
        <ColHeader field="word">Word</ColHeader>
        <ColHeader field="status">Depth</ColHeader>
        <ColHeader field="next_review">Next Review</ColHeader>
        <div />
      </div>

      {/* Rows */}
      <div role="list">
        {sorted.map((word) => {
          const stage = getStage(word.status);
          const isExpanded = expandedId === word.id;
          const isHovered = hoveredId === word.id;

          return (
            <div key={word.id} role="listitem">
              {/* Row button */}
              <button
                className="w-full text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--turquoise)]"
                onClick={() => toggle(word.id, word.word)}
                onMouseEnter={() => setHoveredId(word.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: isExpanded
                    ? stage.pill.bg
                    : isHovered
                      ? stage.glow
                      : "transparent",
                  boxShadow:
                    isHovered || isExpanded
                      ? `inset 0 0 0 1px ${stage.pill.border}, 0 0 20px ${stage.hoverGlow}`
                      : undefined,
                  transition: "background 0.16s ease, box-shadow 0.20s ease",
                }}
              >
                <div className="grid grid-cols-[1fr_180px_110px_28px] gap-3 px-4 py-3.5 items-center">
                  {/* Word */}
                  <div>
                    <span className="font-semibold text-[var(--sand)] text-sm tracking-wide">
                      {word.word}
                    </span>
                    {word.lemma && word.lemma !== word.word && (
                      <span className="ml-1.5 text-[11px] text-[var(--seafoam)]/50">
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
                      color: stage.pill.text,
                      transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      opacity: isHovered || isExpanded ? 1 : 0.3,
                    }}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </button>

              {/* Expanded detail panel */}
              {isExpanded && (
                <div
                  className="px-4 pb-4 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b"
                  style={{
                    background: `linear-gradient(180deg, ${stage.pill.bg} 0%, transparent 120%)`,
                    borderColor: stage.pill.border,
                  }}
                >
                  {/* Translation */}
                  <div className="col-span-2 sm:col-span-1">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--seafoam)]/45 mb-1.5">
                      Translation
                    </div>
                    <div className="text-sm font-medium text-[var(--sand)]">
                      {loadingIds.has(word.id) ? (
                        <span className="flex items-center gap-1.5 text-[var(--seafoam)]/50">
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
                    <div className="text-[10px] uppercase tracking-wider text-[var(--seafoam)]/45 mb-1.5">
                      Stage
                    </div>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border"
                      style={{
                        background: stage.pill.bg,
                        borderColor: stage.pill.border,
                        color: stage.pill.text,
                      }}
                    >
                      {stage.emoji} {stage.label}
                    </span>
                    <div className="text-[10px] text-[var(--seafoam)]/50 mt-1">
                      {stage.desc}
                    </div>
                  </div>

                  {/* Reviews */}
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[var(--seafoam)]/45 mb-1.5">
                      Sessions
                    </div>
                    <div className="text-sm text-[var(--sand)]">
                      {word.repetitions} review
                      {word.repetitions !== 1 ? "s" : ""}
                    </div>
                  </div>

                  {/* Part of speech */}
                  {word.part_of_speech && (
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-[var(--seafoam)]/45 mb-1.5">
                        Type
                      </div>
                      <div className="text-sm capitalize text-[var(--sand)]">
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
