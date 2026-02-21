/* =============================================================================
   GRAMMAR MODULE TYPES
   
   TypeScript interfaces matching the Supabase schema for the Lingolia-style
   grammar learning system. Used throughout the grammar feature.
============================================================================= */

// ---------------------------------------------------------------------------
// Ocean zone & CEFR types
// ---------------------------------------------------------------------------
export type OceanZone = "surface" | "shallow" | "reef" | "deep" | "abyss";
export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const OCEAN_ZONE_COLORS: Record<OceanZone, string> = {
  surface: "#00B4D8",
  shallow: "#0077B6",
  reef: "#023E8A",
  deep: "#03045E",
  abyss: "#010014",
};

export const CEFR_TO_OCEAN_ZONE: Record<CEFRLevel, OceanZone> = {
  A1: "surface",
  A2: "shallow",
  B1: "reef",
  B2: "deep",
  C1: "abyss",
  C2: "abyss",
};

// ---------------------------------------------------------------------------
// Database row types
// ---------------------------------------------------------------------------
export interface GrammarCategory {
  id: string;
  language_code: string;
  name: string;
  slug: string;
  icon: string | null;
  ocean_zone: OceanZone | null;
  order_index: number;
}

export interface GrammarTopic {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  cefr_level: CEFRLevel | null;
  order_index: number;
}

export interface GrammarSubtopic {
  id: string;
  topic_id: string;
  name: string;
  slug: string;
  order_index: number;
}

export interface GrammarExample {
  sentence: string;
  translation: string;
  highlight: string;
}

export interface SummaryTableData {
  headers: string[];
  rows: string[][];
}

export interface GrammarLesson {
  id: string;
  subtopic_id: string;
  language_code: string;
  title: string;
  explanation_md: string;
  summary_table_json: SummaryTableData | null;
  examples: GrammarExample[];
  cefr_level: CEFRLevel | null;
  created_at: string;
}

export type ExerciseType =
  | "fill_blank"
  | "multiple_choice"
  | "sentence_transform"
  | "error_correction";

export interface MCOption {
  text: string;
  is_correct: boolean;
}

export interface GrammarExercise {
  id: string;
  lesson_id: string;
  language_code: string;
  type: ExerciseType;
  prompt: string;
  options: MCOption[] | null;
  correct_answer: string;
  explanation: string;
  difficulty: 1 | 2 | 3;
  order_index: number;
}

export interface UserLessonCompletion {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: string;
}

export interface UserExerciseAttempt {
  id: string;
  user_id: string;
  exercise_id: string;
  was_correct: boolean;
  user_answer: string | null;
  attempted_at: string;
}

// ---------------------------------------------------------------------------
// Content authoring types (used in seed files, no `id` fields)
// ---------------------------------------------------------------------------
export interface GrammarLessonContent {
  title: string;
  cefr_level: CEFRLevel;
  explanation_md: string;
  summary_table_json?: SummaryTableData;
  examples: GrammarExample[];
}

export interface GrammarExerciseContent {
  type: ExerciseType;
  prompt: string;
  options?: MCOption[];
  correct_answer: string;
  explanation: string;
  difficulty: 1 | 2 | 3;
}

export interface GrammarContentFile {
  /** Path segments: [category_slug, topic_slug, subtopic_slug] */
  path: {
    language_code: string;
    category: { name: string; slug: string; icon?: string };
    topic: { name: string; slug: string; cefr_level: CEFRLevel };
    subtopic: { name: string; slug: string };
  };
  lesson: GrammarLessonContent;
  exercises: GrammarExerciseContent[];
}

// ---------------------------------------------------------------------------
// UI / component prop types
// ---------------------------------------------------------------------------
export type ExerciseSessionState =
  | "idle"
  | "in_progress"
  | "reviewing_answer"
  | "complete";

export interface ExerciseResult {
  exercise_id: string;
  was_correct: boolean;
  user_answer: string;
}

export interface ExerciseSessionData {
  state: ExerciseSessionState;
  exercises: GrammarExercise[];
  currentIndex: number;
  results: ExerciseResult[];
  score: number;
}

/** Enriched category with nested topics + progress */
export interface CategoryWithTopics extends GrammarCategory {
  topics: TopicWithSubtopics[];
}

export interface TopicWithSubtopics extends GrammarTopic {
  subtopics: SubtopicWithLesson[];
}

export interface SubtopicWithLesson extends GrammarSubtopic {
  lesson: GrammarLesson | null;
  completed: boolean;
}

/** Grammar progress summary for a user */
export interface GrammarProgressSummary {
  totalLessons: number;
  completedLessons: number;
  byCategory: {
    category: GrammarCategory;
    totalLessons: number;
    completedLessons: number;
  }[];
  byCefr: Record<CEFRLevel, { total: number; completed: number }>;
  recentCompletions: (UserLessonCompletion & { lesson: GrammarLesson })[];
  nextLesson: {
    lesson: GrammarLesson;
    subtopic: GrammarSubtopic;
    topic: GrammarTopic;
    category: GrammarCategory;
  } | null;
}

/** Supported grammar languages */
export const GRAMMAR_LANGUAGES = [
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
] as const;

export type GrammarLanguageCode = (typeof GRAMMAR_LANGUAGES)[number]["code"];
