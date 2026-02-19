/**
 * Word Selector — Chooses which words to introduce and which to use in stories
 *
 * Rules:
 * - First 10 words: exactly 5 verbs + 5 nouns (be, have, go, eat, see / person, day, house, water, time)
 * - Subsequent words: frequency rank order
 * - New words in stories: only those already introduced in Phase 1
 * - 95:5 known-to-new ratio in every story
 */

import {
  LearnerWord,
  FrequencyCorpusWord,
  WordIntroductionItem,
} from "@/types/lesson-v2";
import {
  getFrequencyCorpus,
  getInitialWords,
  getNextWordsToIntroduce,
} from "@/data/frequency-corpus";
import {
  WORDS_PER_INTRODUCTION_SESSION,
  MAX_NEW_WORDS_PER_STORY,
} from "./progression";

// ═══════════════════════════════════════════════════════════════════
// PHASE 1 — SELECT WORDS TO INTRODUCE
// ═══════════════════════════════════════════════════════════════════

/**
 * Get the next batch of words for Phase 1 introduction.
 *
 * If the learner has fewer than 10 known words, the initial 10 words
 * (5 verbs + 5 nouns) are used and we return whatever portion hasn't
 * been introduced yet.
 *
 * After the initial 10, words follow corpus frequency rank.
 */
export function selectWordsForIntroduction(
  language: string,
  knownWords: LearnerWord[],
  batchSize: number = WORDS_PER_INTRODUCTION_SESSION,
): WordIntroductionItem[] {
  const knownLemmas = new Set(knownWords.map((w) => w.lemma.toLowerCase()));

  // Determine if we're still in the initial-10 phase
  const initialWords = getInitialWords(language);
  const unintroducedInitial = initialWords.filter(
    (w) => !knownLemmas.has(w.lemma.toLowerCase()),
  );

  let candidates: FrequencyCorpusWord[];

  if (unintroducedInitial.length > 0) {
    // Still have initial words to introduce — prioritize them
    candidates = unintroducedInitial.slice(0, batchSize);
  } else {
    // All initial words done — continue by frequency
    candidates = getNextWordsToIntroduce(language, knownLemmas, batchSize);
  }

  return candidates.map(corpusWordToIntroItem);
}

/**
 * Convert a corpus entry to a word-introduction item.
 */
function corpusWordToIntroItem(cw: FrequencyCorpusWord): WordIntroductionItem {
  return {
    word: cw.word,
    lemma: cw.lemma,
    translation: cw.translation,
    partOfSpeech: cw.pos,
    frequencyRank: cw.rank,
  };
}

// ═══════════════════════════════════════════════════════════════════
// PHASE 2 — SELECT WORDS FOR STORY
// ═══════════════════════════════════════════════════════════════════

export interface StoryWordSelection {
  /** Words the learner already knows/mastered — to be used in the story */
  knownVocab: LearnerWord[];
  /** 0-2 "introduced" words that will appear in story for the first time */
  newStoryWords: LearnerWord[];
  /** All lemmas available for target-language slots */
  targetLemmas: string[];
}

/**
 * Select the vocabulary pool for a story.
 *
 * - All mastered/learning words are available for re-use
 * - Up to MAX_NEW_WORDS_PER_STORY "introduced" words (seen in Phase 1
 *   but never used in a story) may appear as new story words
 */
export function selectWordsForStory(
  knownWords: LearnerWord[],
): StoryWordSelection {
  const eligible = knownWords.filter(
    (w) => w.status === "mastered" || w.status === "learning",
  );
  const introduced = knownWords.filter((w) => w.status === "introduced");

  // Pick 0-2 introduced words as "new" for this story
  const shuffled = [...introduced].sort(() => Math.random() - 0.5);
  const newStoryWords = shuffled.slice(
    0,
    Math.min(MAX_NEW_WORDS_PER_STORY, shuffled.length),
  );

  const allAvailable = [...eligible, ...newStoryWords];
  const targetLemmas = allAvailable.map((w) => w.lemma);

  return {
    knownVocab: eligible,
    newStoryWords,
    targetLemmas,
  };
}

/**
 * Build a word-translation lookup for the story generator prompt.
 * Returns { lemma → translation } for all available vocab.
 */
export function buildVocabLookup(
  knownWords: LearnerWord[],
): Record<string, string> {
  const lookup: Record<string, string> = {};
  for (const w of knownWords) {
    lookup[w.lemma] = w.translation;
  }
  return lookup;
}

/**
 * Check if a word has been introduced (Phase 1 completed).
 * A word must NOT appear in a story unless it has been introduced.
 */
export function hasBeenIntroduced(
  lemma: string,
  knownWords: LearnerWord[],
): boolean {
  return knownWords.some((w) => w.lemma.toLowerCase() === lemma.toLowerCase());
}

/**
 * Validate story words — ensure none are unseen/unintroduced.
 */
export function validateStoryWords(
  storyTargetWords: string[],
  knownWords: LearnerWord[],
): { valid: boolean; unknownWords: string[] } {
  const knownLemmas = new Set(knownWords.map((w) => w.lemma.toLowerCase()));
  const unknownWords = storyTargetWords.filter(
    (w) => !knownLemmas.has(w.toLowerCase()),
  );
  return { valid: unknownWords.length === 0, unknownWords };
}
