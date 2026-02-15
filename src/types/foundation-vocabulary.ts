/**
 * Foundation Vocabulary Types
 * Types for the Phase 0 vocabulary learning system
 */

export interface FoundationWord {
  id: string;
  word: string;
  lemma: string;
  rank: number;
  pos: string; // part of speech
  translation: string;
  exampleSentence: {
    french: string;
    english: string;
  };
  imageKeyword: string; // keyword for image search
  audioUrl?: string;
  phonetic?: string;
  imageability: "high" | "medium" | "low"; // how easily visualized
  category:
    | "pronoun"
    | "verb"
    | "noun"
    | "adjective"
    | "adverb"
    | "preposition"
    | "conjunction"
    | "article"
    | "number"
    | "determiner"
    | "interjection";
}

export interface FoundationSession {
  id: string;
  sessionNumber: number;
  words: FoundationWord[];
  completed: boolean;
  startedAt?: string;
  completedAt?: string;
}

export interface FoundationProgress {
  userId: string;
  currentSessionIndex: number;
  completedSessions: number[];
  wordsLearned: string[]; // word IDs
  totalWordsLearned: number;
  lastSessionDate?: string;
}

// Exercise types
export type FoundationExerciseType =
  | "word-to-image" // See word → select correct image (4 options)
  | "image-to-word" // See image → type/select word
  | "audio-to-image" // Hear word → select correct image
  | "sentence-identify" // Hear sentence → identify which word is used
  | "introduction"; // Initial word introduction (not an exercise)

export interface FoundationExercise {
  type: FoundationExerciseType;
  targetWord: FoundationWord;
  options?: FoundationWord[]; // For multiple choice exercises
}

export interface ExerciseResult {
  wordId: string;
  exerciseType: FoundationExerciseType;
  correct: boolean;
  responseTimeMs: number;
  timestamp: string;
}

export interface SessionResults {
  sessionId: string;
  wordsIntroduced: number;
  exercisesCompleted: number;
  correctAnswers: number;
  totalExercises: number;
  accuracy: number;
  timeSpentSeconds: number;
  exerciseResults: ExerciseResult[];
}

// Image service types
export interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string;
  user: {
    name: string;
    links: {
      html: string;
    };
  };
  links: {
    html: string;
  };
}

export interface ImageSearchResult {
  imageUrl: string;
  thumbnailUrl: string;
  attribution: {
    photographerName: string;
    photographerUrl: string;
    source: string;
    sourceUrl: string;
  };
}
