"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGrammarProgress } from "@/hooks/useGrammarProgress";
import Link from "next/link";
import type { CEFRLevel, OceanZone } from "@/types/grammar.types";
import { OCEAN_ZONE_COLORS, CEFR_TO_OCEAN_ZONE } from "@/types/grammar.types";

interface GrammarProgressDashboardProps {
  languageCode: string;
}

export function GrammarProgressDashboard({
  languageCode,
}: GrammarProgressDashboardProps) {
  const { progress, loading, error } = useGrammarProgress(languageCode);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-ocean-turquoise" />
      </div>
    );
  }

  if (error || !progress) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>Unable to load progress data.</p>
      </div>
    );
  }

  const overallPct =
    progress.totalLessons > 0
      ? Math.round((progress.completedLessons / progress.totalLessons) * 100)
      : 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Overall progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <BarChart3 className="w-5 h-5 text-ocean-turquoise" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-ocean-turquoise rounded-full transition-all duration-700"
                  style={{ width: `${overallPct}%` }}
                />
              </div>
            </div>
            <span className="text-2xl font-light whitespace-nowrap">
              {progress.completedLessons}/{progress.totalLessons} lessons
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Continue CTA */}
      {progress.nextLesson && (
        <Card className="border-ocean-turquoise/30 bg-ocean-turquoise/5">
          <CardContent className="py-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                Continue where you left off
              </p>
              <p className="font-medium">{progress.nextLesson.lesson.title}</p>
              <p className="text-xs text-muted-foreground">
                {progress.nextLesson.category.name} ›{" "}
                {progress.nextLesson.topic.name}
              </p>
            </div>
            <Link
              href={`/grammar/${languageCode}/${progress.nextLesson.category.slug}/${progress.nextLesson.topic.slug}/${progress.nextLesson.subtopic.slug}`}
            >
              <Button className="rounded-xl bg-ocean-turquoise hover:bg-ocean-turquoise-dark text-white shrink-0">
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Per-category progress */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium">By Category</h2>
        <div className="grid gap-4">
          {progress.byCategory.map(
            ({ category, totalLessons, completedLessons }) => {
              const pct =
                totalLessons > 0
                  ? Math.round((completedLessons / totalLessons) * 100)
                  : 0;
              const zoneColor =
                OCEAN_ZONE_COLORS[category.ocean_zone as OceanZone] ||
                "#0077B6";
              return (
                <div key={category.id} className="flex items-center gap-4">
                  <span className="text-lg w-8 text-center">
                    {category.icon}
                  </span>
                  <span className="w-32 text-sm font-medium truncate">
                    {category.name}
                  </span>
                  <div className="flex-1 h-2 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: zoneColor,
                      }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-20 text-right">
                    {completedLessons}/{totalLessons}
                  </span>
                </div>
              );
            },
          )}
        </div>
      </div>

      {/* CEFR breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium">By CEFR Level</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(
            Object.entries(progress.byCefr) as [
              CEFRLevel,
              { total: number; completed: number },
            ][]
          )
            .filter(([_, v]) => v.total > 0)
            .map(([level, { total, completed }]) => {
              const pct = Math.round((completed / total) * 100);
              const zone = CEFR_TO_OCEAN_ZONE[level];
              const color = OCEAN_ZONE_COLORS[zone];
              return (
                <Card key={level}>
                  <CardContent className="py-4 text-center space-y-2">
                    <span
                      className="inline-block text-xs font-bold px-2.5 py-1 rounded-lg text-white"
                      style={{ backgroundColor: color }}
                    >
                      {level}
                    </span>
                    <p className="text-lg font-light">
                      {completed}/{total}
                    </p>
                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden mx-auto max-w-[80%]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      </div>

      {/* Recent completions */}
      {progress.recentCompletions.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Recently Completed</h2>
          <div className="space-y-2">
            {progress.recentCompletions.map((rc) => (
              <div
                key={rc.id}
                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-muted/20"
              >
                <CheckCircle2 className="w-4 h-4 text-feedback-success shrink-0" />
                <span className="text-sm flex-1">{rc.lesson.title}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(rc.completed_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
