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
} from "lucide-react";
import { VocabularyListView } from "./VocabularyListView";
import { VocabularyNetworkView } from "./VocabularyNetworkView";
import { VocabularyCardView } from "./VocabularyCardView";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "network" | "cards";

interface VocabularyViewerProps {
  userId: string;
  language: string;
}

export function VocabularyViewer({ userId, language }: VocabularyViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [words, setWords] = useState<UserWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const supabase = createClient();

  useEffect(() => {
    const fetchVocabulary = async () => {
      setLoading(true);
      try {
        // Fetch from both tables to get a unified vocabulary view (scoped to the active language)
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

        // Map learner_words_v2 rows to the UserWord shape expected by child views
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
            // Map v2 status values to legacy WordStatus values
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

        // Add words from user_words (Propel) that don't exist in learner_words_v2
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

        // For words in BOTH tables, upgrade learner_words_v2 status if Propel
        // has a more advanced status (e.g. user practiced in flashcards → "known"
        // but learner_words_v2 still says "introduced")
        const statusRank: Record<string, number> = {
          new: 0,
          introduced: 0,
          learning: 1,
          known: 2,
          mastered: 3,
        };
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

        setWords([...merged, ...propelOnly]);
      } catch (error) {
        console.error("Error fetching vocabulary:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVocabulary();
  }, [userId, language, supabase]);

  // Filter and search words
  const filteredWords = useMemo(() => {
    return words.filter((word) => {
      const matchesSearch =
        searchQuery === "" ||
        word.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
        word.lemma.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter =
        filterStatus === "all" || word.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [words, searchQuery, filterStatus]);

  // Reset to page 1 whenever filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredWords.length / pageSize));
  const paginatedWords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredWords.slice(start, start + pageSize);
  }, [filteredWords, currentPage, pageSize]);

  const viewButtons = [
    { mode: "list" as ViewMode, icon: List, label: "List" },
    { mode: "network" as ViewMode, icon: Network, label: "Network" },
    { mode: "cards" as ViewMode, icon: Grid, label: "Cards" },
  ];

  if (loading) {
    return (
      <div className="w-full p-8 flex items-center justify-center">
        <div className="flex items-center gap-2 text-[var(--seafoam)]">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--turquoise)]" />
          <span>Loading your vocabulary...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* ── ROW 1: Title + view-mode switcher ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[var(--sand)]">
            Your Vocabulary
          </h2>
          <p className="text-sm mt-0.5 text-[var(--seafoam)]">
            {filteredWords.length} of {words.length} words
          </p>
        </div>

        {/* View-mode buttons */}
        <div className="flex gap-2">
          {viewButtons.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 min-h-touch rounded-xl text-xs font-medium transition-all duration-200 border",
                viewMode === mode
                  ? "bg-ocean-turquoise/[0.18] text-[var(--turquoise)] border-ocean-turquoise/40"
                  : "bg-white/5 text-[var(--seafoam)] border-white/10",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── ROW 2: Search + Status filter + Per-page + Pagination ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3 bg-ocean-turquoise/[0.06] border border-ocean-turquoise/[0.22]">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none text-[var(--turquoise)]" />
          <input
            type="text"
            placeholder="Search vocabulary..."
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
            <option value="all">All Status</option>
            <option value="new">New</option>
            <option value="learning">Learning</option>
            <option value="known">Known</option>
            <option value="mastered">Mastered</option>
          </select>
        </div>

        {/* Per-page selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium whitespace-nowrap text-[var(--seafoam)]">
            Per page
          </span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-xl text-sm outline-none cursor-pointer px-3 py-2 font-semibold bg-ocean-turquoise/15 border border-ocean-turquoise/40 text-[var(--turquoise)]"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-white/10" />

        {/* Pagination controls — inline, always visible */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 min-h-touch rounded-xl text-xs font-semibold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed bg-ocean-turquoise/[0.12] text-[var(--turquoise)] border border-ocean-turquoise/30"
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
            className="flex items-center gap-1 px-3 py-1.5 min-h-touch rounded-xl text-xs font-semibold transition-all duration-150 disabled:opacity-30 disabled:cursor-not-allowed bg-ocean-turquoise/[0.12] text-[var(--turquoise)] border border-ocean-turquoise/30"
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── ROW 3: Scrollable word list ── */}
      <div className="max-h-[520px] overflow-y-scroll overflow-x-hidden rounded-2xl [scrollbar-width:thin] [scrollbar-color:rgba(61,214,181,0.5)_rgba(255,255,255,0.04)]">
        <style>{`
          .vocab-scroll::-webkit-scrollbar { width: 6px; }
          .vocab-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.04); border-radius: 3px; }
          .vocab-scroll::-webkit-scrollbar-thumb { background: rgba(61,214,181,0.5); border-radius: 3px; }
          .vocab-scroll::-webkit-scrollbar-thumb:hover { background: rgba(61,214,181,0.8); }
        `}</style>
        <div className="vocab-scroll h-full">
          {viewMode === "list" && (
            <VocabularyListView words={paginatedWords} language={language} />
          )}
          {viewMode === "network" && (
            <VocabularyNetworkView words={paginatedWords} language={language} />
          )}
          {viewMode === "cards" && (
            <VocabularyCardView words={paginatedWords} language={language} />
          )}
        </div>
      </div>
    </div>
  );
}
