"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SubmissionCard, SubmissionCardSkeleton } from "./SubmissionCardNew";
import { OceanEmptyState } from "./OceanEmptyState";
import type {
  DiveSubmissionWithProfile,
  SubmissionType,
  SubmissionSort,
} from "@/types/dive-tank";

const TYPE_FILTERS: { value: SubmissionType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "writing", label: "Writing" },
  { value: "speaking", label: "Speaking" },
  { value: "grammar", label: "Grammar" },
];

const SORT_OPTIONS: { value: SubmissionSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "most-urgent", label: "Most Urgent" },
  { value: "unanswered", label: "Unanswered" },
];

interface SubmissionFeedProps {
  submissions: DiveSubmissionWithProfile[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  filterType: SubmissionType | "all";
  onFilterChange: (type: SubmissionType | "all") => void;
  sort: SubmissionSort;
  onSortChange: (sort: SubmissionSort) => void;
}

export function SubmissionFeed({
  submissions,
  loading,
  hasMore,
  onLoadMore,
  filterType,
  onFilterChange,
  sort,
  onSortChange,
}: SubmissionFeedProps) {
  return (
    <div>
      {/* Filter + Sort bar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        {/* Type filter pills */}
        <div className="flex gap-1.5">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-medium transition-all border ${
                filterType === f.value
                  ? "bg-teal-500/10 border-teal-500/25 text-teal-300"
                  : "border-white/[0.06] text-seafoam/40 hover:border-white/[0.12] hover:text-seafoam/60"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as SubmissionSort)}
          className="rounded-lg bg-white/[0.03] border border-white/[0.06] px-3 py-1.5 text-[11px] text-seafoam/50 outline-none cursor-pointer backdrop-blur-sm"
        >
          {SORT_OPTIONS.map((s) => (
            <option
              key={s.value}
              value={s.value}
              className="bg-[var(--midnight)]"
            >
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Submissions list */}
      {loading && submissions.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <SubmissionCardSkeleton key={i} />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <OceanEmptyState message="The waters are calm — no submissions yet. Be the first to dive in." />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${filterType}-${sort}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {submissions.map((sub, idx) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                <SubmissionCard submission={sub} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Load more */}
      {hasMore && submissions.length > 0 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={onLoadMore}
            disabled={loading}
            className="rounded-2xl bg-white/5 px-6 py-3 text-sm font-medium text-seafoam/60 hover:bg-white/10 transition-colors border border-white/5 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more submissions"}
          </button>
        </div>
      )}
    </div>
  );
}
