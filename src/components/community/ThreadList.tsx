"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThreadCard, ThreadCardSkeleton } from "./ThreadCard";
import { useDispatchThreads } from "@/hooks/useDispatch";
import { OceanEmptyState } from "./OceanEmptyState";
import type { DispatchCategory } from "@/types/dive-tank";

const categories: { key: DispatchCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "grammar-help", label: "Grammar Help" },
  { key: "vocabulary", label: "Vocabulary" },
  { key: "culture", label: "Culture" },
  { key: "resources", label: "Resources" },
  { key: "study-methods", label: "Study Methods" },
  { key: "wins-struggles", label: "Wins & Struggles" },
];

interface ThreadListProps {
  onSelectThread: (thread: any) => void;
}

export function ThreadList({ onSelectThread }: ThreadListProps) {
  const [activeCategory, setActiveCategory] = useState<DispatchCategory>("all");

  const { threads, loading } = useDispatchThreads(
    activeCategory === "all"
      ? undefined
      : (activeCategory as Exclude<DispatchCategory, "all">),
  );

  // Pinned first, then by last_activity_at
  const sorted = [...threads].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div>
      {/* Category pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`relative whitespace-nowrap rounded-full px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeCategory === cat.key
                ? "text-teal-200 bg-teal-500/10 border border-teal-500/20"
                : "text-seafoam/40 bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Thread list */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <ThreadCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && sorted.length === 0 && (
        <OceanEmptyState message="No threads in this category yet" />
      )}

      {!loading && sorted.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {sorted.map((thread, i) => (
              <motion.div
                key={thread.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ delay: i * 0.03 }}
                layout
              >
                <ThreadCard
                  thread={thread}
                  onClick={() => onSelectThread(thread)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
