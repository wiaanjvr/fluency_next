"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useDiveSubmissions } from "@/hooks/useDiveSubmissions";
import { WeeklyPromptCard } from "./WeeklyPromptCard";
import { AudioSubmissionCard } from "./AudioSubmissionCard";
import { SubmissionCardSkeleton } from "./SubmissionCardNew";
import { OceanEmptyState } from "./OceanEmptyState";

export function SpeakingLabTab() {
  const { submissions, loading, hasMore, loadMore } = useDiveSubmissions({
    speakingOnly: true,
  });

  return (
    <div>
      <WeeklyPromptCard />

      {loading && submissions.length === 0 ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SubmissionCardSkeleton key={i} />
          ))}
        </div>
      ) : submissions.length === 0 ? (
        <OceanEmptyState message="No speaking submissions yet. Record yourself and be the first!" />
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {submissions.map((sub, idx) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                <AudioSubmissionCard submission={sub} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {hasMore && submissions.length > 0 && (
        <div className="flex justify-center mt-6">
          <button
            onClick={loadMore}
            disabled={loading}
            className="rounded-2xl bg-white/5 px-6 py-3 text-sm font-medium text-seafoam/60 hover:bg-white/10 transition-colors border border-white/5 disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
