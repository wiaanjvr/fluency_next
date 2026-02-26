"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

// ============================================================================
// Vocabulary Viewer — Pill toggles, frosted search bar, teal design system
// ============================================================================

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
        <div
          className="flex items-center gap-2"
          style={{ color: "var(--text-secondary, #7BA8A0)" }}
        >
          <Loader2
            className="h-5 w-5 animate-spin"
            style={{ color: "var(--text-muted, #2E5C54)" }}
          />
          <span
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 13,
            }}
          >
            Loading vocabulary...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="vocab-section w-full flex flex-col gap-4">
      {/* ── ROW 1: Title + pill toggle group ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              fontStyle: "normal",
              color: "#ffffff",
              margin: 0,
            }}
          >
            <span
              style={{ fontFamily: "var(--font-inter, 'Inter', sans-serif)" }}
            >
              Your{" "}
            </span>
            <span
              style={{
                fontFamily: "var(--font-inter, 'Inter', sans-serif)",
                fontWeight: 700,
                fontStyle: "normal",
              }}
            >
              Vocabulary
            </span>
          </h2>
          {/* Count chip */}
          <span
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 11,
              color: "var(--text-muted, #2E5C54)",
              padding: "2px 8px",
              borderRadius: 100,
              background: "transparent",
              border: "none",
              letterSpacing: "0.06em",
            }}
          >
            {filteredWords.length} / {words.length}
          </span>
        </div>

        {/* Pill toggle group */}
        <div
          className="pill-toggle-group flex"
          style={{
            background: "rgba(4, 24, 36, 0.6)",
            borderRadius: 10,
            padding: 3,
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          {viewButtons.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all duration-200",
              )}
              style={{
                borderRadius: 8,
                border:
                  viewMode === mode
                    ? "1px solid var(--border-dim, rgba(255,255,255,0.07))"
                    : "none",
                cursor: "pointer",
                background:
                  viewMode === mode
                    ? "var(--bg-elevated, #052030)"
                    : "transparent",
                color:
                  viewMode === mode
                    ? "var(--text-primary, #EDF6F4)"
                    : "var(--text-ghost, #1A3832)",
                fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
                fontSize: 11,
                letterSpacing: "0.02em",
              }}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── ROW 2: Frosted search / filter bar ── */}
      <div
        className="vocab-filter-bar flex flex-wrap items-center gap-3 px-4 py-3"
        style={{
          borderRadius: 14,
          background: "rgba(4, 24, 36, 0.5)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[160px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
            style={{ color: "var(--text-ghost, #2D5A52)" }}
          />
          <input
            type="text"
            placeholder="Search vocabulary..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm outline-none"
            style={{
              borderRadius: 10,
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              color: "var(--text-primary, #F0FDFA)",
              fontFamily: "var(--font-inter, 'Inter', sans-serif)",
              fontSize: 13,
            }}
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          <SlidersHorizontal
            className="h-4 w-4 shrink-0"
            style={{ color: "var(--text-ghost, #2D5A52)" }}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm outline-none cursor-pointer"
            style={{
              borderRadius: 10,
              padding: "6px 12px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              color: "var(--text-secondary, #7BA8A0)",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 11,
            }}
          >
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="learning">Learning</option>
            <option value="known">Known</option>
            <option value="mastered">Mastered</option>
          </select>
        </div>

        {/* Per-page selector */}
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs whitespace-nowrap"
            style={{
              color: "var(--text-ghost, #2D5A52)",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 10,
            }}
          >
            Show
          </span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="text-sm outline-none cursor-pointer"
            style={{
              borderRadius: 8,
              padding: "4px 8px",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-dim, rgba(255,255,255,0.07))",
              color: "var(--text-secondary, #6B9E96)",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 11,
              fontWeight: 600,
            }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        {/* Divider */}
        <div
          className="hidden sm:block w-px h-5"
          style={{ background: "rgba(255, 255, 255, 0.06)" }}
        />

        {/* Pagination controls */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed"
            style={{
              borderRadius: 8,
              border: "1px solid var(--border-dim, rgba(255,255,255,0.07))",
              background: "rgba(255, 255, 255, 0.03)",
              color: "var(--text-secondary, #6B9E96)",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 11,
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
            }}
          >
            <ChevronLeft className="h-3 w-3" />
            Prev
          </button>

          <span
            className="tabular-nums px-1"
            style={{
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 11,
              color: "var(--text-ghost, #1A3832)",
            }}
          >
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-all duration-150 disabled:opacity-25 disabled:cursor-not-allowed"
            style={{
              borderRadius: 8,
              border: "1px solid var(--border-dim, rgba(255,255,255,0.07))",
              background: "rgba(255, 255, 255, 0.03)",
              color: "var(--text-secondary, #6B9E96)",
              fontFamily: "var(--font-mono, 'JetBrains Mono', monospace)",
              fontSize: 11,
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
            }}
          >
            Next
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── ROW 3: Scrollable word list with animated transitions ── */}
      <div
        className="dashboard-scroll overflow-y-auto overflow-x-hidden"
        style={{
          maxHeight: 520,
          borderRadius: 16,
          border: "1px solid rgba(0, 229, 204, 0.12)",
          background: "#060f0f",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {viewMode === "list" && (
              <VocabularyListView words={paginatedWords} language={language} />
            )}
            {viewMode === "network" && (
              <VocabularyNetworkView
                words={paginatedWords}
                language={language}
              />
            )}
            {viewMode === "cards" && (
              <VocabularyCardView words={paginatedWords} language={language} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
