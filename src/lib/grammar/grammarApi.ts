/* =============================================================================
   GRAMMAR API — All Supabase queries for the grammar module
   
   Client-side queries use the browser Supabase client.
   All content tables are publicly readable (no auth needed for browsing).
   User progress tables require authentication.
============================================================================= */

import { createClient } from "@/lib/supabase/client";
import type {
  GrammarCategory,
  GrammarTopic,
  GrammarSubtopic,
  GrammarLesson,
  GrammarExercise,
  CategoryWithTopics,
  TopicWithSubtopics,
  SubtopicWithLesson,
  UserLessonCompletion,
  GrammarProgressSummary,
  CEFRLevel,
} from "@/types/grammar.types";

function getSupabase() {
  return createClient();
}

// ---------------------------------------------------------------------------
// Content queries (public)
// ---------------------------------------------------------------------------

/** Fetch all categories for a language, ordered */
export async function getCategories(
  languageCode: string,
): Promise<GrammarCategory[]> {
  const { data, error } = await getSupabase()
    .from("grammar_categories")
    .select("*")
    .eq("language_code", languageCode)
    .order("order_index");

  if (error) throw error;
  return data || [];
}

/** Fetch topics within a category, ordered */
export async function getTopics(categoryId: string): Promise<GrammarTopic[]> {
  const { data, error } = await getSupabase()
    .from("grammar_topics")
    .select("*")
    .eq("category_id", categoryId)
    .order("order_index");

  if (error) throw error;
  return data || [];
}

/** Fetch subtopics within a topic, ordered */
export async function getSubtopics(
  topicId: string,
): Promise<GrammarSubtopic[]> {
  const { data, error } = await getSupabase()
    .from("grammar_subtopics")
    .select("*")
    .eq("topic_id", topicId)
    .order("order_index");

  if (error) throw error;
  return data || [];
}

/** Fetch a lesson by subtopic ID */
export async function getLessonBySubtopic(
  subtopicId: string,
): Promise<GrammarLesson | null> {
  const { data, error } = await getSupabase()
    .from("grammar_lessons")
    .select("*")
    .eq("subtopic_id", subtopicId)
    .single();

  if (error && error.code !== "PGRST116") throw error; // PGRST116 = no rows
  return data || null;
}

/** Fetch exercises for a lesson, ordered */
export async function getExercises(
  lessonId: string,
): Promise<GrammarExercise[]> {
  const { data, error } = await getSupabase()
    .from("grammar_exercises")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order_index");

  if (error) throw error;
  return data || [];
}

/** Fetch full category tree with nested topics & subtopics for a language */
export async function getCategoryTree(
  languageCode: string,
  completedLessonIds: Set<string> = new Set(),
): Promise<CategoryWithTopics[]> {
  // Fetch all in parallel
  const [categoriesRes, topicsRes, subtopicsRes, lessonsRes] =
    await Promise.all([
      getSupabase()
        .from("grammar_categories")
        .select("*")
        .eq("language_code", languageCode)
        .order("order_index"),
      getSupabase()
        .from("grammar_topics")
        .select("*, grammar_categories!inner(language_code)")
        .eq("grammar_categories.language_code", languageCode)
        .order("order_index"),
      getSupabase()
        .from("grammar_subtopics")
        .select(
          "*, grammar_topics!inner(*, grammar_categories!inner(language_code))",
        )
        .eq("grammar_topics.grammar_categories.language_code", languageCode)
        .order("order_index"),
      getSupabase()
        .from("grammar_lessons")
        .select("*")
        .eq("language_code", languageCode),
    ]);

  const categories = (categoriesRes.data || []) as GrammarCategory[];
  const topics = (topicsRes.data || []) as (GrammarTopic & {
    grammar_categories: { language_code: string };
  })[];
  const subtopics = (subtopicsRes.data || []) as (GrammarSubtopic & {
    grammar_topics: {
      id: string;
      grammar_categories: { language_code: string };
    };
  })[];
  const lessons = (lessonsRes.data || []) as GrammarLesson[];

  // Build lesson map: subtopic_id → lesson
  const lessonMap = new Map<string, GrammarLesson>();
  for (const l of lessons) lessonMap.set(l.subtopic_id, l);

  // Build subtopic map: topic_id → subtopics
  const subtopicMap = new Map<string, SubtopicWithLesson[]>();
  for (const st of subtopics) {
    const topicId = st.topic_id;
    const lesson = lessonMap.get(st.id) || null;
    const entry: SubtopicWithLesson = {
      id: st.id,
      topic_id: st.topic_id,
      name: st.name,
      slug: st.slug,
      order_index: st.order_index,
      lesson,
      completed: lesson ? completedLessonIds.has(lesson.id) : false,
    };
    if (!subtopicMap.has(topicId)) subtopicMap.set(topicId, []);
    subtopicMap.get(topicId)!.push(entry);
  }

  // Build topic map: category_id → topics
  const topicMap = new Map<string, TopicWithSubtopics[]>();
  for (const t of topics) {
    const catId = t.category_id;
    const entry: TopicWithSubtopics = {
      id: t.id,
      category_id: t.category_id,
      name: t.name,
      slug: t.slug,
      cefr_level: t.cefr_level,
      order_index: t.order_index,
      subtopics: subtopicMap.get(t.id) || [],
    };
    if (!topicMap.has(catId)) topicMap.set(catId, []);
    topicMap.get(catId)!.push(entry);
  }

  return categories.map((cat) => ({
    ...cat,
    topics: topicMap.get(cat.id) || [],
  }));
}

/** Resolve slugs to the subtopic + lesson */
export async function resolveGrammarSlugs(
  languageCode: string,
  categorySlug: string,
  topicSlug: string,
  subtopicSlug: string,
): Promise<{
  category: GrammarCategory;
  topic: GrammarTopic;
  subtopic: GrammarSubtopic;
  lesson: GrammarLesson | null;
} | null> {
  const { data: cat } = await getSupabase()
    .from("grammar_categories")
    .select("*")
    .eq("language_code", languageCode)
    .eq("slug", categorySlug)
    .single();
  if (!cat) return null;

  const { data: topic } = await getSupabase()
    .from("grammar_topics")
    .select("*")
    .eq("category_id", cat.id)
    .eq("slug", topicSlug)
    .single();
  if (!topic) return null;

  const { data: subtopic } = await getSupabase()
    .from("grammar_subtopics")
    .select("*")
    .eq("topic_id", topic.id)
    .eq("slug", subtopicSlug)
    .single();
  if (!subtopic) return null;

  const lesson = await getLessonBySubtopic(subtopic.id);

  return { category: cat, topic, subtopic, lesson };
}

// ---------------------------------------------------------------------------
// User progress queries (authenticated)
// ---------------------------------------------------------------------------

/** Fetch all lesson IDs completed by the current user */
export async function getUserCompletedLessonIds(): Promise<Set<string>> {
  const {
    data: { user },
  } = await getSupabase().auth.getUser();
  if (!user) return new Set();

  const { data, error } = await getSupabase()
    .from("user_lesson_completions")
    .select("lesson_id")
    .eq("user_id", user.id);

  if (error) throw error;
  return new Set((data || []).map((r: { lesson_id: string }) => r.lesson_id));
}

/** Mark a lesson as completed for the current user */
export async function markLessonComplete(
  lessonId: string,
): Promise<UserLessonCompletion | null> {
  const {
    data: { user },
  } = await getSupabase().auth.getUser();
  if (!user) return null;

  const { data, error } = await getSupabase()
    .from("user_lesson_completions")
    .upsert(
      { user_id: user.id, lesson_id: lessonId },
      { onConflict: "user_id,lesson_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/** Record an exercise attempt */
export async function recordExerciseAttempt(
  exerciseId: string,
  wasCorrect: boolean,
  userAnswer: string,
): Promise<void> {
  const {
    data: { user },
  } = await getSupabase().auth.getUser();
  if (!user) return;

  const { error } = await getSupabase().from("user_exercise_attempts").insert({
    user_id: user.id,
    exercise_id: exerciseId,
    was_correct: wasCorrect,
    user_answer: userAnswer,
  });

  if (error) throw error;
}

/** Fetch grammar progress summary for the current user */
export async function getGrammarProgress(
  languageCode: string,
): Promise<GrammarProgressSummary> {
  const completedIds = await getUserCompletedLessonIds();

  // Fetch all lessons for this language
  const { data: allLessons } = await getSupabase()
    .from("grammar_lessons")
    .select("*")
    .eq("language_code", languageCode);
  const lessons = (allLessons || []) as GrammarLesson[];

  // Fetch categories
  const categories = await getCategories(languageCode);

  // Map lessons to subtopics, then to categories
  const { data: allSubtopics } = await getSupabase()
    .from("grammar_subtopics")
    .select("*, grammar_topics!inner(*, grammar_categories!inner(*))")
    .order("order_index");
  const subtopics = (allSubtopics || []) as (GrammarSubtopic & {
    grammar_topics: GrammarTopic & { grammar_categories: GrammarCategory };
  })[];

  // Lesson → category mapping
  const lessonSubtopicMap = new Map<string, string>();
  for (const l of lessons) lessonSubtopicMap.set(l.id, l.subtopic_id);

  const subtopicCategoryMap = new Map<string, string>();
  for (const st of subtopics) {
    subtopicCategoryMap.set(st.id, st.grammar_topics.grammar_categories.id);
  }

  // Build by-category progress
  const byCategory = categories.map((cat) => {
    const catLessons = lessons.filter((l) => {
      const stId = lessonSubtopicMap.get(l.id);
      if (!stId) return false;
      return subtopicCategoryMap.get(stId) === cat.id;
    });
    return {
      category: cat,
      totalLessons: catLessons.length,
      completedLessons: catLessons.filter((l) => completedIds.has(l.id)).length,
    };
  });

  // Build by-CEFR progress
  const cefrLevels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
  const byCefr = {} as Record<CEFRLevel, { total: number; completed: number }>;
  for (const level of cefrLevels) {
    const levelLessons = lessons.filter((l) => l.cefr_level === level);
    byCefr[level] = {
      total: levelLessons.length,
      completed: levelLessons.filter((l) => completedIds.has(l.id)).length,
    };
  }

  // Recent completions
  const {
    data: { user },
  } = await getSupabase().auth.getUser();
  let recentCompletions: (UserLessonCompletion & {
    lesson: GrammarLesson;
  })[] = [];
  if (user) {
    const { data: recentData } = await getSupabase()
      .from("user_lesson_completions")
      .select("*, grammar_lessons(*)")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(5);

    recentCompletions = (recentData || []).map(
      (r: UserLessonCompletion & { grammar_lessons: GrammarLesson }) => ({
        ...r,
        lesson: r.grammar_lessons,
      }),
    );
  }

  // Find next incomplete lesson
  let nextLesson: GrammarProgressSummary["nextLesson"] = null;
  for (const st of subtopics) {
    const lesson = lessons.find((l) => l.subtopic_id === st.id);
    if (lesson && !completedIds.has(lesson.id)) {
      nextLesson = {
        lesson,
        subtopic: st,
        topic: st.grammar_topics,
        category: st.grammar_topics.grammar_categories,
      };
      break;
    }
  }

  return {
    totalLessons: lessons.length,
    completedLessons: lessons.filter((l) => completedIds.has(l.id)).length,
    byCategory,
    byCefr,
    recentCompletions,
    nextLesson,
  };
}
