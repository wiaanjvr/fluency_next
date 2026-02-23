"use client";

import { cn } from "@/lib/utils";

const TOPICS = [
  "Travel",
  "Family",
  "Nature",
  "Food",
  "City Life",
  "Work",
  "Technology",
  "History",
  "Sport",
  "Weather",
  "Friendship",
  "Daily Routine",
] as const;

export type ReadingTopic = (typeof TOPICS)[number];

interface TopicChipsProps {
  selected: string | null;
  onSelect: (topic: string) => void;
}

/**
 * A horizontally-scrollable grid of selectable topic pills.
 * Single-select: clicking a selected chip deselects it.
 */
export function TopicChips({ selected, onSelect }: TopicChipsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {TOPICS.map((topic) => {
        const isSelected = selected === topic;
        return (
          <button
            key={topic}
            onClick={() => onSelect(isSelected ? "" : topic)}
            className={cn(
              "rounded-full px-4 py-2 text-sm border transition-all duration-200",
              isSelected
                ? "bg-teal-400/20 border-teal-400 text-teal-300"
                : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10",
            )}
          >
            {topic}
          </button>
        );
      })}
    </div>
  );
}
