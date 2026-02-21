"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  BookOpen,
} from "lucide-react";
import type {
  CategoryWithTopics,
  TopicWithSubtopics,
  OceanZone,
} from "@/types/grammar.types";
import { OCEAN_ZONE_COLORS } from "@/types/grammar.types";

interface TopicSidebarProps {
  categories: CategoryWithTopics[];
  languageCode: string;
  activePath?: {
    categorySlug?: string;
    topicSlug?: string;
    subtopicSlug?: string;
  };
}

export function TopicSidebar({
  categories,
  languageCode,
  activePath,
}: TopicSidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => {
      // Auto-expand the active category
      if (activePath?.categorySlug) {
        const cat = categories.find((c) => c.slug === activePath.categorySlug);
        if (cat) return new Set([cat.id]);
      }
      return new Set(categories.map((c) => c.id)); // default: all expanded
    },
  );
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(() => {
    if (activePath?.topicSlug) {
      for (const cat of categories) {
        const topic = cat.topics.find((t) => t.slug === activePath.topicSlug);
        if (topic) return new Set([topic.id]);
      }
    }
    return new Set();
  });

  const toggleCategory = (id: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTopic = (id: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <nav className="space-y-1">
      {categories.map((cat) => {
        const isExpanded = expandedCategories.has(cat.id);
        const zoneColor =
          OCEAN_ZONE_COLORS[cat.ocean_zone as OceanZone] || "#0077B6";
        const totalLessons = cat.topics.reduce(
          (sum, t) => sum + t.subtopics.filter((s) => s.lesson).length,
          0,
        );
        const completedLessons = cat.topics.reduce(
          (sum, t) => sum + t.subtopics.filter((s) => s.completed).length,
          0,
        );

        return (
          <div key={cat.id} className="rounded-xl overflow-hidden">
            {/* Category header */}
            <button
              onClick={() => toggleCategory(cat.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors duration-200",
                "hover:bg-muted/50 rounded-xl",
              )}
            >
              <div
                className="w-1.5 h-8 rounded-full shrink-0"
                style={{ backgroundColor: zoneColor }}
              />
              <span className="text-lg">{cat.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{cat.name}</p>
                <p className="text-xs text-muted-foreground">
                  {completedLessons}/{totalLessons} lessons
                </p>
              </div>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
            </button>

            {/* Topics */}
            {isExpanded && (
              <div className="ml-4 pl-4 border-l border-border/50 space-y-0.5 pb-2">
                {cat.topics.map((topic) => (
                  <TopicItem
                    key={topic.id}
                    topic={topic}
                    languageCode={languageCode}
                    categorySlug={cat.slug}
                    isExpanded={expandedTopics.has(topic.id)}
                    onToggle={() => toggleTopic(topic.id)}
                    activePath={activePath}
                    zoneColor={zoneColor}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

function TopicItem({
  topic,
  languageCode,
  categorySlug,
  isExpanded,
  onToggle,
  activePath,
  zoneColor,
}: {
  topic: TopicWithSubtopics;
  languageCode: string;
  categorySlug: string;
  isExpanded: boolean;
  onToggle: () => void;
  activePath?: TopicSidebarProps["activePath"];
  zoneColor: string;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-left text-sm rounded-lg transition-colors",
          "hover:bg-muted/40",
          activePath?.topicSlug === topic.slug && "bg-muted/40",
        )}
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
        <span className="flex-1 truncate">{topic.name}</span>
        {topic.cefr_level && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white shrink-0"
            style={{ backgroundColor: zoneColor }}
          >
            {topic.cefr_level}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="ml-5 space-y-0.5">
          {topic.subtopics.map((sub) => (
            <Link
              key={sub.id}
              href={`/grammar/${languageCode}/${categorySlug}/${topic.slug}/${sub.slug}`}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors",
                "hover:bg-ocean-turquoise/10",
                activePath?.subtopicSlug === sub.slug
                  ? "bg-ocean-turquoise/15 text-ocean-turquoise font-medium"
                  : "text-muted-foreground",
              )}
            >
              {sub.completed ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-feedback-success shrink-0" />
              ) : (
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="truncate">{sub.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
