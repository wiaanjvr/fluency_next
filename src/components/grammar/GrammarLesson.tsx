"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { BookOpen, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SummaryTable } from "./SummaryTable";
import type {
  GrammarLesson as GrammarLessonType,
  GrammarCategory,
  GrammarTopic,
  GrammarSubtopic,
  OceanZone,
} from "@/types/grammar.types";
import { OCEAN_ZONE_COLORS, CEFR_TO_OCEAN_ZONE } from "@/types/grammar.types";
import Link from "next/link";

interface GrammarLessonProps {
  lesson: GrammarLessonType;
  category: GrammarCategory;
  topic: GrammarTopic;
  subtopic: GrammarSubtopic;
  languageCode: string;
  onStartExercises: () => void;
}

export function GrammarLessonView({
  lesson,
  category,
  topic,
  subtopic,
  languageCode,
  onStartExercises,
}: GrammarLessonProps) {
  const zone =
    (lesson.cefr_level
      ? CEFR_TO_OCEAN_ZONE[lesson.cefr_level]
      : category.ocean_zone) || "shallow";
  const zoneColor = OCEAN_ZONE_COLORS[zone as OceanZone] || "#0077B6";

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
        <Link
          href={`/grammar/${languageCode}`}
          className="hover:text-foreground transition-colors"
        >
          Grammar
        </Link>
        <span>/</span>
        <Link
          href={`/grammar/${languageCode}/${category.slug}`}
          className="hover:text-foreground transition-colors"
        >
          {category.name}
        </Link>
        <span>/</span>
        <Link
          href={`/grammar/${languageCode}/${category.slug}/${topic.slug}`}
          className="hover:text-foreground transition-colors"
        >
          {topic.name}
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{subtopic.name}</span>
      </nav>

      {/* Title + badges */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-light tracking-tight">{lesson.title}</h1>
          {lesson.cefr_level && (
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-lg text-white"
              style={{ backgroundColor: zoneColor }}
            >
              {lesson.cefr_level}
            </span>
          )}
          <span
            className="text-xs px-2.5 py-1 rounded-lg border capitalize"
            style={{
              borderColor: zoneColor + "40",
              color: zoneColor,
            }}
          >
            {zone} zone
          </span>
        </div>
      </div>

      {/* Rule explanation */}
      <Card>
        <CardContent className="pt-6">
          <div className="prose prose-sm dark:prose-invert max-w-none grammar-markdown">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Render tables with ocean styling
                table: ({ children }) => (
                  <div className="overflow-x-auto rounded-lg border border-border/50 my-4">
                    <table className="w-full text-sm">{children}</table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-ocean-turquoise/10">{children}</thead>
                ),
                th: ({ children }) => (
                  <th className="px-4 py-2 text-left font-medium border-b border-border/50">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="px-4 py-2 border-b border-border/30">
                    {children}
                  </td>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    className="border-l-4 pl-4 my-4 italic text-muted-foreground rounded-r-lg bg-ocean-turquoise/5 py-3 pr-4"
                    style={{ borderColor: zoneColor }}
                  >
                    {children}
                  </blockquote>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">
                    {children}
                  </strong>
                ),
                code: ({ children, className: codeClassName }) => {
                  const isBlock = codeClassName?.includes("language-");
                  if (isBlock) {
                    return (
                      <code className="block bg-muted/50 p-4 rounded-lg text-sm">
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="bg-muted/50 px-1.5 py-0.5 rounded text-sm font-mono">
                      {children}
                    </code>
                  );
                },
              }}
            >
              {lesson.explanation_md}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      {/* Summary table */}
      {lesson.summary_table_json && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-ocean-turquoise" />
            Overview
          </h2>
          <SummaryTable
            data={lesson.summary_table_json}
            accentColor={zoneColor}
          />
        </div>
      )}

      {/* Examples */}
      {lesson.examples && lesson.examples.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">Examples</h2>
          <div className="space-y-3">
            {lesson.examples.map((ex, i) => (
              <Card
                key={i}
                className="border-l-4"
                style={{ borderLeftColor: zoneColor }}
              >
                <CardContent className="py-4">
                  <p className="text-base">
                    {renderHighlightedSentence(ex.sentence, ex.highlight)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 italic">
                    {ex.translation}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Start exercises CTA */}
      <div className="flex justify-center pt-4">
        <Button
          onClick={onStartExercises}
          size="lg"
          className="rounded-xl px-8 h-12 text-base font-medium bg-ocean-turquoise hover:bg-ocean-turquoise-dark text-white"
        >
          Start Exercises
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
}

/** Render a sentence with the highlight word wrapped in a styled mark */
function renderHighlightedSentence(sentence: string, highlight: string) {
  // Handle markdown bold (**word**) in the sentence
  const cleaned = sentence.replace(/\*\*/g, "");
  if (!highlight) return <span>{cleaned}</span>;

  // Split on the highlight and wrap it
  const parts = cleaned.split(new RegExp(`(${escapeRegex(highlight)})`, "gi"));
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark
            key={i}
            className="bg-[#F4A261]/30 text-foreground px-0.5 rounded font-semibold"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
      )}
    </span>
  );
}

function escapeRegex(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
