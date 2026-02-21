"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { BookOpen, BarChart3, Loader2, ChevronRight } from "lucide-react";
import { Card, CardContent, CardInteractive } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGrammarNavigation } from "@/hooks/useGrammarNavigation";
import { LanguageSelector } from "./LanguageSelector";
import { TopicSidebar } from "./TopicSidebar";
import { GrammarProgressDashboard } from "./GrammarProgressDashboard";
import Link from "next/link";
import type {
  GrammarLanguageCode,
  CategoryWithTopics,
  OceanZone,
  CEFRLevel,
} from "@/types/grammar.types";
import { OCEAN_ZONE_COLORS, CEFR_TO_OCEAN_ZONE } from "@/types/grammar.types";

interface GrammarHubProps {
  initialLang?: GrammarLanguageCode;
}

export function GrammarHub({ initialLang = "de" }: GrammarHubProps) {
  const [lang, setLang] = useState<GrammarLanguageCode>(initialLang);
  const [view, setView] = useState<"browse" | "progress">("browse");
  const [cefrFilter, setCefrFilter] = useState<CEFRLevel | "all">("all");
  const [zoneFilter, setZoneFilter] = useState<OceanZone | "all">("all");
  const { categories, loading, error, reload } = useGrammarNavigation(lang);

  const handleLanguageChange = (code: GrammarLanguageCode) => {
    setLang(code);
  };

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      topics: cat.topics.filter((t) => {
        if (cefrFilter !== "all" && t.cefr_level !== cefrFilter) return false;
        if (zoneFilter !== "all") {
          const topicZone = t.cefr_level
            ? CEFR_TO_OCEAN_ZONE[t.cefr_level]
            : null;
          if (topicZone !== zoneFilter) return false;
        }
        return true;
      }),
    }))
    .filter((cat) => {
      // If filtering by zone, also filter categories
      if (zoneFilter !== "all" && cat.ocean_zone !== zoneFilter)
        return cat.topics.length > 0;
      return true;
    });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-ocean-turquoise" />
              <h1 className="text-2xl font-light tracking-tight">Grammar</h1>
            </div>
            <LanguageSelector selected={lang} onChange={handleLanguageChange} />
          </div>

          {/* View toggle + filters */}
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-1 bg-muted/30 rounded-xl p-1">
              <button
                onClick={() => setView("browse")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm transition-all",
                  view === "browse"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Browse
              </button>
              <button
                onClick={() => setView("progress")}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-sm transition-all",
                  view === "progress"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <BarChart3 className="w-4 h-4 inline mr-1" />
                Progress
              </button>
            </div>

            {view === "browse" && (
              <>
                {/* CEFR filter */}
                <select
                  value={cefrFilter}
                  onChange={(e) =>
                    setCefrFilter(e.target.value as CEFRLevel | "all")
                  }
                  className="text-sm bg-muted/30 border-none rounded-lg px-3 py-1.5 text-muted-foreground"
                >
                  <option value="all">All levels</option>
                  <option value="A1">A1</option>
                  <option value="A2">A2</option>
                  <option value="B1">B1</option>
                  <option value="B2">B2</option>
                  <option value="C1">C1</option>
                  <option value="C2">C2</option>
                </select>

                {/* Zone filter */}
                <select
                  value={zoneFilter}
                  onChange={(e) =>
                    setZoneFilter(e.target.value as OceanZone | "all")
                  }
                  className="text-sm bg-muted/30 border-none rounded-lg px-3 py-1.5 text-muted-foreground"
                >
                  <option value="all">All zones</option>
                  <option value="surface">🌊 Surface</option>
                  <option value="shallow">🐠 Shallow</option>
                  <option value="reef">🪸 Reef</option>
                  <option value="deep">🐙 Deep</option>
                  <option value="abyss">🦑 Abyss</option>
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-ocean-turquoise" />
          </div>
        )}

        {error && (
          <div className="text-center py-20">
            <p className="text-destructive mb-4">{error}</p>
            <Button variant="outline" onClick={reload}>
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && view === "browse" && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
            {/* Sidebar */}
            <aside className="hidden lg:block">
              <TopicSidebar
                categories={filteredCategories}
                languageCode={lang}
              />
            </aside>

            {/* Main grid of category cards */}
            <main className="space-y-8">
              {filteredCategories.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>No grammar content available yet for this language.</p>
                  <p className="text-sm mt-1">Check back soon!</p>
                </div>
              ) : (
                filteredCategories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    languageCode={lang}
                  />
                ))
              )}
            </main>
          </div>
        )}

        {!loading && !error && view === "progress" && (
          <GrammarProgressDashboard languageCode={lang} />
        )}
      </div>
    </div>
  );
}

function CategoryCard({
  category,
  languageCode,
}: {
  category: CategoryWithTopics;
  languageCode: string;
}) {
  const zoneColor =
    OCEAN_ZONE_COLORS[category.ocean_zone as OceanZone] || "#0077B6";
  const totalLessons = category.topics.reduce(
    (sum, t) => sum + t.subtopics.filter((s) => s.lesson).length,
    0,
  );
  const completedLessons = category.topics.reduce(
    (sum, t) => sum + t.subtopics.filter((s) => s.completed).length,
    0,
  );
  const progressPct =
    totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div
          className="w-2 h-8 rounded-full"
          style={{ backgroundColor: zoneColor }}
        />
        <span className="text-2xl">{category.icon}</span>
        <h2 className="text-xl font-medium">{category.name}</h2>
        <span className="text-sm text-muted-foreground">
          {completedLessons}/{totalLessons} lessons
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden max-w-xs">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%`, backgroundColor: zoneColor }}
        />
      </div>

      {/* Topic cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {category.topics.map((topic) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            languageCode={languageCode}
            categorySlug={category.slug}
            zoneColor={zoneColor}
          />
        ))}
      </div>
    </div>
  );
}

function TopicCard({
  topic,
  languageCode,
  categorySlug,
  zoneColor,
}: {
  topic: CategoryWithTopics["topics"][number];
  languageCode: string;
  categorySlug: string;
  zoneColor: string;
}) {
  const totalLessons = topic.subtopics.filter((s) => s.lesson).length;
  const completedLessons = topic.subtopics.filter((s) => s.completed).length;

  return (
    <CardInteractive
      className="border-l-4"
      style={{ borderLeftColor: zoneColor } as React.CSSProperties}
    >
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-medium">{topic.name}</h3>
            <p className="text-xs text-muted-foreground">
              {completedLessons}/{totalLessons} lessons completed
            </p>
          </div>
          {topic.cefr_level && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white shrink-0"
              style={{ backgroundColor: zoneColor }}
            >
              {topic.cefr_level}
            </span>
          )}
        </div>

        {/* Subtopics list */}
        <div className="mt-3 space-y-1">
          {topic.subtopics.map((sub) => (
            <Link
              key={sub.id}
              href={`/grammar/${languageCode}/${categorySlug}/${topic.slug}/${sub.slug}`}
              className="flex items-center gap-2 text-sm py-1 text-muted-foreground hover:text-foreground transition-colors group"
            >
              <div
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  sub.completed
                    ? "bg-feedback-success"
                    : "bg-muted-foreground/30",
                )}
              />
              <span className="flex-1">{sub.name}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </CardContent>
    </CardInteractive>
  );
}
