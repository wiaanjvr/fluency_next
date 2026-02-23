// ==========================================================================
// Verb Conjugation Drill — TypeScript Types
// ==========================================================================

export type Language = "de" | "fr" | "es" | "it" | "pt" | "nl";

export type Tense =
  | "present"
  | "preterite"
  | "imperfect"
  | "future"
  | "conditional"
  | "subjunctive_present"
  | "subjunctive_imperfect"
  | "perfect"
  | "pluperfect"
  | "imperative"
  | "past_participle"
  | "gerund"
  | "future_perfect";

export type Mood = "indicative" | "subjunctive" | "imperative" | "infinitive";

export type PronounKey =
  | "1sg"
  | "2sg"
  | "3sg"
  | "1pl"
  | "2pl"
  | "3pl"
  | "2sg_formal";

// ---- Database row types ----

export interface ConjugationVerb {
  id: string;
  language: Language;
  infinitive: string;
  english_meaning: string | null;
  verb_class: string | null;
  tags: string[] | null;
  frequency_rank: number | null;
  created_at?: string;
}

export interface ConjugationForm {
  id: string;
  verb_id: string;
  tense: Tense;
  mood: Mood;
  pronoun: string;
  pronoun_key: PronounKey;
  conjugated_form: string;
  rule_explanation: string | null;
}

export interface ConjugationProgress {
  id: string;
  user_id: string;
  verb_id: string;
  tense: string;
  pronoun_key: PronounKey;
  correct_count: number;
  attempt_count: number;
  last_attempted_at: string | null;
  streak: number;
  production_score: number;
}

export interface ConjugationSession {
  id: string;
  user_id: string;
  language: Language;
  config: SessionConfig;
  total_questions: number;
  correct_answers: number;
  accuracy: number;
  time_taken_seconds: number;
  xp_earned: number;
  completed_at: string;
}

// ---- Session configuration ----

export interface SessionConfig {
  language: Language;
  tenses: Tense[];
  pronounKeys: PronounKey[];
  verbIds: string[]; // empty = all verbs for language
  timed: boolean;
  durationSeconds: number; // 0 = untimed
  questionCount: number; // 0 = unlimited
  useWeightedSelection: boolean; // default true for logged-in users
}

// ---- Drill engine types ----

export interface DrillQuestion {
  questionId: string;
  verbId: string;
  infinitive: string;
  englishMeaning: string;
  tense: Tense;
  mood: Mood;
  pronoun: string;
  pronounKey: PronounKey;
  correctForm: string;
  ruleExplanation?: string;
  weight: number;
}

export interface DrillAnswer {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  hintUsed: boolean;
  timeSpentMs: number;
}

export interface SessionResult {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  timeTakenSeconds: number;
  xpEarned: number;
  weakestVerbs: { infinitive: string; accuracy: number }[];
  strongestVerbs: { infinitive: string; accuracy: number }[];
  tenseBreakdown: { tense: Tense; correct: number; total: number }[];
}

// ---- Language configuration types ----

export interface TenseGroup {
  label: string;
  tenses: Tense[];
}

export interface PronounDisplay {
  key: PronounKey;
  display: string;
}

export interface PronounConfig {
  language: Language;
  pronouns: PronounDisplay[];
  excludedByDefault: PronounKey[];
}

export interface AccentConfig {
  language: Language;
  characters: string[];
}

export interface LanguageConfigEntry {
  tenseGroups: TenseGroup[];
  pronounConfig: PronounConfig;
  accentConfig: AccentConfig;
  defaultTenses: Tense[];
  tenseLabels: Record<string, string>;
}

// ---- Drill phase ----

export type DrillPhase = "config" | "drilling" | "feedback" | "results";

// ---- Verb seed data ----

export interface VerbSeedForm {
  tense: string;
  mood: string;
  pronoun: string;
  pronoun_key: string;
  conjugated_form: string;
  rule_explanation?: string;
}

export interface VerbSeedData {
  language: string;
  infinitive: string;
  english_meaning: string;
  verb_class: string;
  frequency_rank: number;
  tags: string[];
  forms: VerbSeedForm[];
}
