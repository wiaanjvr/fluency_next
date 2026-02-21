"use client";

import { useState, useEffect } from "react";
import { resolveGrammarSlugs, getExercises } from "@/lib/grammar/grammarApi";
import type {
  GrammarCategory,
  GrammarTopic,
  GrammarSubtopic,
  GrammarLesson,
  GrammarExercise,
} from "@/types/grammar.types";

interface LessonData {
  category: GrammarCategory;
  topic: GrammarTopic;
  subtopic: GrammarSubtopic;
  lesson: GrammarLesson;
  exercises: GrammarExercise[];
}

export function useGrammarLesson(
  lang: string,
  categorySlug: string,
  topicSlug: string,
  subtopicSlug: string,
) {
  const [data, setData] = useState<LessonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await resolveGrammarSlugs(
          lang,
          categorySlug,
          topicSlug,
          subtopicSlug,
        );
        if (cancelled) return;
        if (!result || !result.lesson) {
          setError("Lesson not found");
          return;
        }

        const exercises = await getExercises(result.lesson.id);
        if (cancelled) return;

        setData({
          category: result.category,
          topic: result.topic,
          subtopic: result.subtopic,
          lesson: result.lesson,
          exercises,
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load lesson",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [lang, categorySlug, topicSlug, subtopicSlug]);

  return { data, loading, error };
}
