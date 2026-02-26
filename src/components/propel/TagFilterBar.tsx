"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ActivityTag } from "@/lib/activities/activityRegistry";
import { TAG_COLORS } from "@/lib/activities/activityRegistry";

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
        whileTap={{ scale: 0.95 }}
        onClick={onClearAll}
        className={cn(
          "font-body text-[12px] font-medium px-3 py-1.5 rounded-full",
          "border transition-colors duration-200",
          !hasActive
            ? "bg-[#3dd6b5]/15 border-[#3dd6b5]/30 text-[#3dd6b5]"
            : "bg-transparent border-white/10 text-white/40 hover:border-white/20 hover:text-white/60",
        )}
      >
        All
      </motion.button>

      {allTags.map((tag) => {
        const isActive = activeTags.includes(tag);
        const c = TAG_COLORS[tag];

        return (
          <motion.button
            key={tag}
            whileTap={{ scale: 0.95 }}
            onClick={() => onToggle(tag)}
            className={cn(
              "font-body text-[12px] font-medium px-3 py-1.5 rounded-full",
              "border transition-colors duration-200",
              isActive
                ? "border-transparent"
                : "bg-transparent border-white/10 text-white/40 hover:border-white/20 hover:text-white/60",
            )}
            style={
              isActive
                ? {
                    background: c.bg,
                    color: c.text,
                    borderColor: `${c.text}33`,
                  }
                : undefined
            }
          >
            {tag}
          </motion.button>
        );
      })}
    </div>
  );
}
