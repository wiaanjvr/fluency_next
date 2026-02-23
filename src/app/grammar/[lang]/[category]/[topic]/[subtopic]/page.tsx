"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useGrammarLesson } from "@/hooks/useGrammarLesson";
import { GrammarLessonView } from "@/components/grammar/GrammarLesson";
import { ExerciseSession } from "@/components/grammar/ExerciseSession";
import type { GrammarLanguageCode } from "@/types/grammar.types";

export default function GrammarSubtopicPage() {
  const params = useParams();
  const lang = params.lang as string;
  const categorySlug = params.category as string;
  const topicSlug = params.topic as string;
  const subtopicSlug = params.subtopic as string;

  const { data, loading, error } = useGrammarLesson(
    lang,
    categorySlug,
    topicSlug,
    subtopicSlug,
  );

  const [mode, setMode] = useState<"lesson" | "exercises">("lesson");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-ocean-turquoise" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-destructive text-lg">
            {error || "Lesson not found"}
          </p>
          <a
            href={`/grammar/${lang}`}
            className="text-sm text-ocean-turquoise hover:underline"
          >
            ← Back to Grammar Hub
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {mode === "lesson" ? (
          <GrammarLessonView
            lesson={data.lesson}
            category={data.category}
            topic={data.topic}
            subtopic={data.subtopic}
            languageCode={lang}
            onStartExercises={() => setMode("exercises")}
          />
        ) : (
          <ExerciseSession
            exercises={data.exercises}
            lessonId={data.lesson.id}
            lessonTitle={data.lesson.title}
            languageCode={lang}
            grammarTag={data.lesson.grammar_tag ?? data.subtopic.slug}
            onDone={() => setMode("lesson")}
          />
        )}
      </div>
    </div>
  );
}
