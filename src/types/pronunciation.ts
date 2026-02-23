// ============================================================================
// Pronunciation Training — shared types
// ============================================================================

export interface PhonemeExample {
  word: string;
  translation: string;
  audio_url?: string;
}

export interface Phoneme {
  id: string;
  language: string;
  ipa_symbol: string;
  label: string | null;
  description: string | null;
  example_words: PhonemeExample[];
  audio_url: string | null;
  difficulty_rank: number;
  native_language_equivalent: string | null;
  created_at: string;
}

export interface MinimalPair {
  id: string;
  language: string;
  phoneme_a_id: string;
  phoneme_b_id: string;
  example_word_a: string;
  example_word_b: string;
  audio_url_a: string | null;
  audio_url_b: string | null;
  difficulty_rank: number;
  created_at: string;
  // Joined data
  phoneme_a?: Phoneme;
  phoneme_b?: Phoneme;
}

export interface ShadowingPhrase {
  id: string;
  language: string;
  text: string;
  ipa_transcription: string | null;
  audio_url: string | null;
  cefr_level: string;
  focus_phoneme_id: string | null;
  created_at: string;
}

export interface UserPronunciationProgress {
  id: string;
  user_id: string;
  language: string;
  phoneme_id: string;
  familiarity_score: number;
  times_practiced: number;
  last_practiced_at: string | null;
  minimal_pair_accuracy: number | null;
  shadowing_scores: ShadowingScore[];
  created_at: string;
  // Joined
  phoneme?: Phoneme;
}

export interface ShadowingScore {
  phrase_id: string;
  score: number;
  recorded_at: string;
}

export interface UserPronunciationSession {
  id: string;
  user_id: string;
  language: string;
  module_type: "sound_inventory" | "minimal_pairs" | "shadowing";
  duration_seconds: number;
  items_practiced: number;
  accuracy: number | null;
  session_data: Record<string, unknown>;
  created_at: string;
}

export interface PhonemeFeedback {
  target: string;
  produced: string;
  word: string;
  advice: string;
}

export interface ShadowingAnalysis {
  overall_score: number;
  phoneme_feedback: PhonemeFeedback[];
  general_tip: string;
}

export type PronunciationModule =
  | "sound_inventory"
  | "minimal_pairs"
  | "shadowing";

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "it", name: "Italian", flag: "🇮🇹" },
];

export const MODULE_INFO: Record<
  PronunciationModule,
  { name: string; description: string; icon: string }
> = {
  sound_inventory: {
    name: "Sound Inventory",
    description: "Learn the sounds that don't exist in English",
    icon: "ear",
  },
  minimal_pairs: {
    name: "Minimal Pairs",
    description: "Train your ear to distinguish similar sounds",
    icon: "split",
  },
  shadowing: {
    name: "Shadowing Studio",
    description: "Record, compare, and refine your pronunciation",
    icon: "mic",
  },
};
