"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserWord } from "@/types";
import {
  List,
  Network,
  Grid,
  Loader2,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Waves,
  Zap,
} from "lucide-react";
import { VocabularyListView } from "./VocabularyListView";
import { VocabularyNetworkView } from "./VocabularyNetworkView";
import { VocabularyCardView } from "./VocabularyCardView";
import { VocabularyOceanFloor } from "./VocabularyOceanFloor";
import { cn } from "@/lib/utils";

type ViewMode = "ocean" | "list" | "network" | "cards";

interface VocabularyViewerProps {
  userId: string;
  language: string;
}

// --- View definitions ---------------------------------------------------------
const VIEW_BUTTONS: {
  mode: ViewMode;
  icon: React.ElementType;
  label: string;
  hint: string;
  earlyOnly?: boolean;
}[] = [
  {
    mode: "ocean",
    icon: Waves,
    label: "Ocean",
    hint: "Your words as living creatures",
    earlyOnly: true, // promoted while word count is low
  },
  {
    mode: "list",
    icon: List,
    label: "List",
    hint: "Scan & sort your fleet",
  },
  {
    mode: "network",
    icon: Network,
    label: "Network",
    hint: "Chart your word currents",
  },
  {
    mode: "cards",
    icon: Grid,
    label: "Cards",
    hint: "Test your depth",
  },
];

// --- Due-words urgency banner -------------------------------------------------
function UrgencyBanner({ dueWords, total }: { dueWords: number; total: number }) {
  if (dueWords === 0) return null;
  const pct = Math.round((dueWords / total) * 100);
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-2xl border"
      style={{
        background: "rgba(248,113,113,0.07)",
        borderColor: "rgba(248,113,113,0.25)",
      }}
    >
      <Zap className="h-4 w-4 shrink-0" style={{ color: "#fca5a5" }} />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold" style={{ color: "#fca5a5" }}>
          {dueWords} word{dueWords !== 1 ? "s" : ""} ready to review
        </span>
        <span className="ml-2 text-xs" style={{ color: "rgba(252,165,165,0.6)" }}>
          — {pct}% of your collection
        </span>
      </div>
      {/* Mini progress bar showing proportion due */}
      <div
        className="hidden sm:block w-24 h-1.5 rounded-full overflow-hidden shrink-0"
        style={{ background: "rgba(255,255,255,0.07)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #f87171, #fca5a5)",
          }}
        />
      </div>
    </div>
  );
}

// --- Main component -----------------------------------------------------------
export function VocabularyViewer({ userId, language }: VocabularyViewerProps) {
  const isEarlyStage = (count: number) => count < 50;
  const [words, setWords] = useState<UserWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("ocean");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const supabase = createClient();

  useEffect(() => {
    const fetchVocabulary = async () => {
      setLoading(true);
      try {
        const [{ data: learnerData, error: learnerErr }, { data: propelData }] =
          await Promise.all([
            supabase
              .from("learner_words_v2")
              .select(
                "id, word, lemma, status, part_of_speech, frequency_rank, introduced_at, last_reviewed_at, correct_streak, total_reviews, total_correct",
              )
              .eq("user_id", userId)
              .eq("language", language)
              .order("introduced_at", { ascending: false }),
            supabase
              .from("user_words")
              .select(
                "id, word, lemma, status, frequency_rank, created_at, last_reviewed, exposure_count, production_score, pronunciation_score, recognition_score",
              )
              .eq("user_id", userId)
              .eq("language", language)
              .order("created_at", { ascending: false }),
          ]);

        if (learnerErr) throw learnerErr;

        const now = new Date().toISOString();
        const seenLemmas = new Set<string>();

        const learnerMapped: UserWord[] = (learnerData || []).map((w: any) => {
          const lemma = (w.lemma || w.word || "").toLowerCase();
          seenLemmas.add(lemma);
          return {
            id: w.id,
            user_id: userId,
            word: w.word,
            language,
            lemma: w.lemma,
            status: (w.status === "introduced" ? "new" : w.status) as any,
            ease_factor: 2.5,
            repetitions: w.total_reviews ?? 0,
            interval: 0,
            next_review: now,
            created_at: w.introduced_at ?? now,
            updated_at: w.last_reviewed_at ?? w.introduced_at ?? now,
            part_of_speech: w.part_of_speech,
            frequency_rank: w.frequency_rank,
            rating: w.total_correct ?? 0,
          };
        });

        const propelOnly: UserWord[] = (propelData || [])
          .filter((w: any) => {
            const lemma = (w.lemma || w.word || "").toLowerCase();
            return lemma && !seenLemmas.has(lemma);
          })
          .map((w: any) => {
            const lemma = (w.lemma || w.word || "").toLowerCase();
            seenLemmas.add(lemma);
            return {
              id: w.id,
              user_id: userId,
              word: w.word,
              language,
              lemma: w.lemma || w.word,
              status: w.status as any,
              ease_factor: 2.5,
              repetitions: w.exposure_count ?? 0,
              interval: 0,
              next_review: now,
              created_at: w.created_at ?? now,
              updated_at: w.last_reviewed ?? w.created_at ?? now,
              frequency_rank: w.frequency_rank,
              rating: 0,
            };
          });

        const statusRank: Record<string, number> = { new: 0, introduced: 0, learning: 1, known: 2, mastered: 3 };
        const propelByLemma = new Map<string, any>();
        (propelData || []).forEach((w: any) => {
          const lemma = (w.lemma || w.word || "").toLowerCase();
          if (lemma) propelByLemma.set(lemma, w);
        });

        const merged = learnerMapped.map((w) => {
          const lemma = (w.lemma || w.word || "").toLowerCase();
          const propel = propelByLemma.get(lemma);
          if (propel) {
            const propelStatus = propel.status as string;
            if ((statusRank[propelStatus] ?? 0) > (statusRank[w.status] ?? 0)) {
              return { ...w, status: propelStatus as any };
            }
          }
          return w;
        });

        const allWords = [...merged, ...propelOnly];
        setWords(allWords);

        // Auto-select most useful default view
        setViewMode(isEarlyStage(allWords.length) ? "ocean" : "list");
      } catch (error) {
        console.error("Error fetching vocabulary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVocabulary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, language]);

  const filteredWords = useMemo(() => {
    return words.filter((word) => {
      const matchesSearch =
        searchQuery === "" ||
        word.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        word.lemma.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = filterStatus === "all" || word.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [words, searchQuery, filterStatus]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterStatus, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / pageSize));
  const paginatedWords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWords.slice(start, start + pageSize);
  }, [filteredWords, currentPage, pageSize]);

  const dueCount = useMemo(() => {
    const now = new Date();
    return words.filter((w) => new Date(w.next_review) <= now).length;
  }, [words]);

  const early = isEarlyStage(words.length);

  if (loading) {
    return (
      <div className="w-full p-8 flex items-center justify-center">
        <div className="flex items-center gap-2 text-[var(--seafoam)]">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--turquoise)]" />
          <span>Diving into your vocabulary…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* -- ROW 1: Title + view-mode switcher -- */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[var(--sand)]">
            Your Vocabulary
          </h2>
          <p className="text-sm mt-0.5 text-[var(--seafoam)]">
            {words.length} word{words.length !== 1 ? "s" : ""} collected
            {filteredWords.length < words.length && ` � ${filteredWords.length} shown`}
          </p>
        </div>

        {/* View-mode buttons — more prominent */}
        <div className="flex gap-1.5 p-1 rounded-2xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {VIEW_BUTTONS.filter((v) => !v.earlyOnly || early || viewMode === v.mode).map(({ mode, icon: Icon, label, hint }) => {
            const active = viewMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                title={hint}
                className={cn(
                  "group flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200",
                  active
                    ? "bg-ocean-turquoise/[0.18] text-[var(--turquoise)] shadow-sm"
                    : "text-[var(--seafoam)]/60 hover:text-[var(--seafoam)] hover:bg-white/[0.05]",
                )}
                style={{
                  boxShadow: active ? "0 0 14px rgba(61,214,181,0.18)" : undefined,
                  border: active ? "1px solid rgba(61,214,181,0.28)" : "1px solid transparent",
                }}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
                {/* Hint tooltip on larger screens */}
                <span
                  className="hidden lg:inline text-[10px] opacity-50 font-normal"
                  style={{ maxWidth: "90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  — {hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* -- Urgency banner (only if there are due words) -- */}
      <UrgencyBanner dueWords={dueCount} total={words.length} />

      {/* -- Ocean floor view has no search/filter bar (it''s visual) -- */}
      {viewMode === "ocean" ? (
        <div className="rounded-2xl overflow-hidden border border-white/[0.06]">
          <VocabularyOceanFloor words={filteredWords} language={language} />
        </div>
      ) : (
        <>
          {/* -- ROW 2: Search + Filter + Pagination -- */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 bg-ocean-turquoise/[0.06] border border-ocean-turquoise/[0.22]">
            {/* Search */}
            <div className="relative flex-1 min-w-[160px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-[var(--turquoise)]" />
              <input
                type="text"
                placeholder="Search vocabulary…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm outline-none bg-white/[0.07] border border-ocean-turquoise/25 text-[var(--sand)] caret-[var(--turquoise)]"
              />
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="h-4 w-4 shrink-0 text-[var(--turquoise)]" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl text-sm outline-none cursor-pointer px-3 py-2 bg-white/[0.07] border border-ocean-turquoise/25 text-[var(--sand)]"
              >
                <option value="all">All Stages</option>
                <option value="new">?? Surfacing</option>
                <option value="learning">?? Drifting</option>
                <option value="known">?? Diving</option>
                <option value="mastered">? Abyssal</option>
              </select>
            </div>

            {/* Per-page */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium whitespace-nowrap text-[var(--seafoam)]">Per page</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-xl text-sm outline-none cursor-pointer px-3 py-2 font-semibold bg-ocean-turquoise/15 border border-ocean-turquoise/40 text-[var(--turquoise)]"
              >
                {[10, 25, 50, 100].map((n) => (<option key={n} value={n}>{n}</option>))}
              </select>
            </div>

            <div className="hidden sm:block w-px h-6 bg-white/10" />

            {/* Pagination */}
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed bg-ocean-turquoise/[0.12] text-[var(--turquoise)] border border-ocean-turquoise/30"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Prev
              </button>
              <span className="text-xs font-semibold px-1 tabular-nums text-[var(--turquoise)]">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed bg-ocean-turquoise/[0.12] text-[var(--turquoise)] border border-ocean-turquoise/30"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* -- ROW 3: Content view -- */}
          <div className="max-h-[520px] overflow-y-scroll overflow-x-hidden rounded-2xl [scrollbar-width:thin] [scrollbar-color:rgba(61,214,181,0.5)_rgba(255,255,255,0.04)]">
            <style>{`
              .vocab-scroll::-webkit-scrollbar { width: 6px; }
              .vocab-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 3px; }
              .vocab-scroll::-webkit-scrollbar-thumb { background: rgba(61,214,181,0.5); border-radius: 3px; }
              .vocab-scroll::-webkit-scrollbar-thumb:hover { background: rgba(61,214,181,0.8); }
            `}</style>
            <div className="vocab-scroll h-full">
              {/* Wrap list view in ocean-dark background */}
              {viewMode === "list" && (
                <div
                  className="rounded-2xl overflow-hidden border border-white/[0.06]"
                  style={{ background: "rgba(2,25,50,0.70)" }}
                >
                  <VocabularyListView words={paginatedWords} language={language} />
                </div>
              )}
              {viewMode === "network" && (
                <VocabularyNetworkView words={paginatedWords} language={language} />
              )}
              {viewMode === "cards" && (
                <VocabularyCardView words={paginatedWords} language={language} />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
