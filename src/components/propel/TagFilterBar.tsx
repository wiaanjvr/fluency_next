"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ActivityTag } from "@/lib/activities/activityRegistry";

// ============================================================================
// TagFilterBar — Token-based pill filter
// Uses propel-theme.css design token classes. No hardcoded colors.
// ============================================================================

interface TagFilterBarProps {
  allTags: ActivityTag[];
  activeTags: ActivityTag[];
  onToggle: (tag: ActivityTag) => void;
  onClearAll: () => void;
}

export function TagFilterBar({
  allTags,
  activeTags,
  onToggle,
  onClearAll,
}: TagFilterBarProps) {
  const hasActive = activeTags.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* "All" button */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={onClearAll}
        className={cn(
          "propel-filter-pill",
          !hasActive && "propel-filter-pill--active",
        )}
      >
        All
      </motion.button>

      {allTags.map((tag) => {
        const isActive = activeTags.includes(tag);

        return (
          <motion.button
            key={tag}
            whileTap={{ scale: 0.96 }}
            onClick={() => onToggle(tag)}
            className={cn(
              "propel-filter-pill",
              isActive && "propel-filter-pill--active",
            )}
          >
            {tag}
          </motion.button>
        );
      })}
    </div>
  );
}
