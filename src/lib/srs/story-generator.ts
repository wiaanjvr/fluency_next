/**
 * Story Generation Algorithm
 * Generates comprehensible input stories using 95% known words + 5% new words
 * Integrates with spaced repetition for optimal learning
 */

import { UserWord, ProficiencyLevel, StoryGenerationParams } from "@/types";
import { selectWordsForStory, isWordDue } from "./algorithm";
import commonFrenchWords from "@/data/common-french-words.json";
import { LEVEL_WORD_ALLOCATION } from "./seed-vocabulary";

/**
 * Common French words by frequency (top 1000)
 * Now loaded from JSON data file
 */
const COMMON_FRENCH_WORDS = commonFrenchWords.words.map((w) => w.word);

export interface WordSelection {
  knownWords: string[]; // Words user already knows well
  reviewWords: string[]; // Words due for review
  newWords: string[]; // Brand new words to introduce
  allWords: string[]; // Combined list
}

/**
 * Select words for story generation based on user's vocabulary and SRS data
 */
export function selectWordsForGeneration(
  userWords: UserWord[],
  params: StoryGenerationParams,
): WordSelection {
  const { word_count_target, new_word_percentage, prioritize_review } = params;

  // Separate words by status
  const masteredAndKnown = userWords.filter(
    (w) => w.status === "known" || w.status === "mastered",
  );
  const learning = userWords.filter((w) => w.status === "learning");
  const dueWords = userWords.filter((w) => isWordDue(w));
  const totalKnownWords = masteredAndKnown.length + learning.length;

  // For complete beginners with 0 words, use only 5 simple words for a single sentence
  if (totalKnownWords === 0) {
    const existingLemmas = new Set(userWords.map((w) => w.lemma.toLowerCase()));
    const newWordCandidates = COMMON_FRENCH_WORDS.filter(
      (word) => !existingLemmas.has(word.toLowerCase()),
    );
    const newWords = newWordCandidates.slice(0, 5); // Only 5 words for single sentence

    return {
      knownWords: [],
      reviewWords: [],
      newWords: newWords,
      allWords: newWords,
    };
  }

  // For beginners with few words (1-9), use all new words
  if (totalKnownWords < 10) {
    const existingLemmas = new Set(userWords.map((w) => w.lemma.toLowerCase()));
    const newWordCandidates = COMMON_FRENCH_WORDS.filter(
      (word) => !existingLemmas.has(word.toLowerCase()),
    );
    const newWords = newWordCandidates.slice(0, word_count_target);

    return {
      knownWords: [],
      reviewWords: [],
      newWords: newWords,
      allWords: newWords,
    };
  }

  // Calculate word counts
  const newWordCount = Math.floor(word_count_target * new_word_percentage);
  const knownWordCount = word_count_target - newWordCount;

  // Select review words (prioritize overdue words)
  let reviewWords: UserWord[] = [];
  if (prioritize_review && dueWords.length > 0) {
    const reviewCount = Math.min(
      Math.floor(knownWordCount * 0.4), // 40% of known words should be reviews
      dueWords.length,
    );
    reviewWords = selectWordsForStory(dueWords, reviewCount, true);
  }

  // Select known words
  const remainingKnownCount = knownWordCount - reviewWords.length;
  const availableKnown = [...masteredAndKnown, ...learning].filter(
    (w) => !reviewWords.find((r) => r.id === w.id),
  );
  const knownWords = selectWordsForStory(
    availableKnown,
    remainingKnownCount,
    false, // Random selection for variety
  );

  // If we don't have enough known words, add more new words to compensate
  const actualKnownCount = knownWords.length + reviewWords.length;
  const shortfall = word_count_target - actualKnownCount;
  const adjustedNewWordCount = Math.max(newWordCount, shortfall);

  // Select new words from common words not yet learned
  const existingLemmas = new Set(userWords.map((w) => w.lemma.toLowerCase()));
  const newWordCandidates = COMMON_FRENCH_WORDS.filter(
    (word) => !existingLemmas.has(word.toLowerCase()),
  );
  const newWords = newWordCandidates.slice(0, adjustedNewWordCount);

  return {
    knownWords: knownWords.map((w) => w.lemma),
    reviewWords: reviewWords.map((w) => w.lemma),
    newWords: newWords,
    allWords: [
      ...knownWords.map((w) => w.lemma),
      ...reviewWords.map((w) => w.lemma),
      ...newWords,
    ],
  };
}

// Content type instructions for varied content
const CONTENT_TYPE_INSTRUCTIONS: Record<string, string> = {
  narrative:
    "Write a short STORY with a clear beginning, middle, and end. Include characters and a simple plot arc.",
  dialogue:
    "Write a natural DIALOGUE/CONVERSATION between 2-3 people. Use quotation marks and speaker labels (e.g., 'Marie:', 'Pierre:'). Make exchanges realistic.",
  descriptive:
    "Write a vivid DESCRIPTION of a place, scene, or experience. Use sensory details (sight, sound, smell) to paint a picture.",
  opinion:
    "Write a first-person OPINION PIECE sharing thoughts on the topic. Include reasoning, examples, and personal reflections.",
};

/**
 * Generate story prompt for AI (OpenAI, Claude, etc.)
 * Emphasizes comprehensible input: 95% known words + 5% new words
 */
export function generateStoryPrompt(
  wordSelection: WordSelection,
  params: StoryGenerationParams,
): string {
  const { level, topic, content_type, word_count_target, language } = params;

  // If no words selected (beginner case), use top common words based on level
  const levelWordCount = LEVEL_WORD_ALLOCATION[level] || 50;
  const vocabularyToUse =
    wordSelection.allWords.length > 0
      ? wordSelection.allWords
      : COMMON_FRENCH_WORDS.slice(
          0,
          Math.max(levelWordCount, word_count_target),
        );

  // Calculate percentages for comprehensible input
  const knownWordCount =
    wordSelection.knownWords.length + wordSelection.reviewWords.length;
  const newWordCount = wordSelection.newWords.length;
  const totalWords = knownWordCount + newWordCount;
  const knownPercentage =
    totalWords > 0 ? Math.round((knownWordCount / totalWords) * 100) : 95;

  // Get content type instruction if specified
  const contentTypeInstruction =
    content_type && CONTENT_TYPE_INSTRUCTIONS[content_type]
      ? `\n**CONTENT STYLE:** ${CONTENT_TYPE_INSTRUCTIONS[content_type]}\n`
      : "";

  // Special case: Complete beginner with 0 known words
  if (knownWordCount === 0) {
    const simpleWords = wordSelection.newWords.slice(0, 5);

    const prompt = `Generate a single simple sentence in ${language} for an absolute beginner.

**🚨 CRITICAL: COMPLETE BEGINNER - SINGLE SENTENCE ONLY 🚨**

**REQUIREMENTS:**
- Generate ONLY ONE sentence
- Use MAXIMUM 5 words total (including articles)
- Use ONLY the most basic, common words from this list: ${simpleWords.join(", ")}
- The sentence must be extremely simple and clear
- Use present tense only
- Example structure: "Je suis Marie" or "Le chat dort"

**FORBIDDEN:**
- Do NOT write a story
- Do NOT use multiple sentences
- Do NOT use complex grammar
- Do NOT use words not in the provided list

Write the single sentence now. Return ONLY the sentence in ${language}, nothing else.`;

    return prompt;
  }

  // Calculate exact word distribution for 95%/5% ratio
  const targetKnownWordOccurrences = Math.floor(word_count_target * 0.95);
  const targetNewWordOccurrences = Math.ceil(word_count_target * 0.05);

  const prompt = `Generate a short story in ${language} for a ${level} language learner.
${contentTypeInstruction}
**🚨 CRITICAL: 95% KNOWN / 5% NEW WORD RATIO 🚨**
This is COMPREHENSIBLE INPUT - the learner MUST understand 95% of the story!

**EXACT WORD COUNT REQUIREMENTS:**
- Total story length: ~${word_count_target} words
- Words from KNOWN list: ~${targetKnownWordOccurrences} words (95%)
- Words from NEW list: ~${targetNewWordOccurrences} words MAXIMUM (5%)

**ABSOLUTE VOCABULARY RESTRICTION:**
You are STRICTLY FORBIDDEN from using ANY words outside these two lists:
1. KNOWN vocabulary list (${knownWordCount} words) - USE THESE FOR 95% OF THE STORY
2. NEW vocabulary list (${newWordCount} words) - USE THESE FOR ONLY 5% OF THE STORY

DO NOT use synonyms, DO NOT use related words, DO NOT add "just one more word" that seems useful.
If a word is not explicitly listed below, you CANNOT use it (except basic articles: le/la/les/un/une/des, and basic conjunctions: et/ou/mais).

**KNOWN Vocabulary - USE THESE FOR 95% OF ALL WORDS (${knownWordCount} words available, showing up to 200):**
${[...wordSelection.knownWords, ...wordSelection.reviewWords].slice(0, 200).join(", ") || vocabularyToUse.slice(0, 200).join(", ")}

${
  wordSelection.newWords.length > 0
    ? `**NEW Vocabulary - USE THESE FOR ONLY 5% OF ALL WORDS (${newWordCount} new words):**
${wordSelection.newWords.join(", ")}

IMPORTANT: Each new word should appear 2-3 times in the story to reach the 5% ratio, but NO additional unknown words beyond this list.`
    : "**NEW Vocabulary: NONE - Use only known words**"
}

**VERIFICATION CHECKLIST - YOU MUST:**
✓ Count every content word in your story
✓ Verify 95% come from the KNOWN list
✓ Verify only 5% come from the NEW list
✓ Confirm NO words appear that aren't in either list (except le/la/les/un/une/des/et/ou/mais)
✓ Make the content engaging and natural despite these strict constraints

**CONTENT REQUIREMENTS:**
- Topic: ${topic || "everyday situations, simple narratives, or common experiences"}
- Style: ${content_type || "engaging narrative"}
- Level: ${level} - use appropriate grammar and sentence structures
- Make new words understandable from context
- Create complete, coherent, interesting content
- Engage adult learners with relatable content

Write the content now. Return ONLY the text in ${language}, no commentary.`;

  return prompt;
}

/**
 * Generate story metadata for database storage
 */
export function createStoryMetadata(
  wordSelection: WordSelection,
  storyText: string,
  params: StoryGenerationParams,
) {
  // Count actual words in story
  const wordCount = storyText.split(/\s+/).length;

  return {
    language: params.language,
    level: params.level,
    word_count: wordCount,
    new_words: wordSelection.newWords,
    review_words: wordSelection.reviewWords,
    known_words: wordSelection.knownWords,
    generation_params: {
      target_word_count: params.word_count_target,
      new_word_percentage: params.new_word_percentage,
      prioritize_review: params.prioritize_review,
      topic: params.topic,
    },
  };
}

/**
 * Validate that generated story meets requirements
 */
export function validateGeneratedStory(
  storyText: string,
  wordSelection: WordSelection,
  targetWordCount: number,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check word count
  const actualWordCount = storyText.split(/\s+/).length;
  if (
    actualWordCount < targetWordCount * 0.7 ||
    actualWordCount > targetWordCount * 1.5
  ) {
    errors.push(
      `Word count ${actualWordCount} is outside acceptable range (${Math.floor(targetWordCount * 0.7)}-${Math.floor(targetWordCount * 1.5)})`,
    );
  }

  // Check that new words are present
  const storyLower = storyText.toLowerCase();
  const missingNewWords = wordSelection.newWords.filter(
    (word) => !storyLower.includes(word.toLowerCase()),
  );

  if (missingNewWords.length > 0) {
    errors.push(`Missing new words: ${missingNewWords.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Parse story text and identify words for interactive highlighting
 */
export function parseStoryWords(
  storyText: string,
  userWords: UserWord[],
  newWords: string[],
): Array<{
  word: string;
  isNew: boolean;
  isDueForReview: boolean;
  index: number;
}> {
  // Simple word tokenization (can be improved with proper NLP)
  const words = storyText.split(/(\s+|[.,;:!?'"()])/);

  const userWordMap = new Map(userWords.map((w) => [w.lemma.toLowerCase(), w]));
  const newWordSet = new Set(newWords.map((w) => w.toLowerCase()));

  return words
    .map((word, index) => {
      const cleanWord = word.trim().toLowerCase();
      if (!cleanWord || /^\s*$/.test(word)) {
        return null;
      }

      const userWord = userWordMap.get(cleanWord);
      const isNew = newWordSet.has(cleanWord);
      const isDueForReview = userWord ? isWordDue(userWord) : false;

      return {
        word,
        isNew,
        isDueForReview,
        index,
      };
    })
    .filter((w): w is NonNullable<typeof w> => w !== null);
}

/**
 * Get recommended word count based on proficiency level
 */
export function getRecommendedWordCount(level: ProficiencyLevel): number {
  const wordCounts: Record<ProficiencyLevel, number> = {
    A0: 50,
    A1: 75,
    A2: 100,
    B1: 150,
    B2: 200,
    C1: 250,
    C2: 300,
  };

  return wordCounts[level] || 100;
}

/**
 * Get recommended new word percentage based on proficiency level
 */
export function getRecommendedNewWordPercentage(
  level: ProficiencyLevel,
): number {
  const percentages: Record<ProficiencyLevel, number> = {
    A0: 0.1, // 10% new words for absolute beginners
    A1: 0.08,
    A2: 0.05,
    B1: 0.05,
    B2: 0.03,
    C1: 0.02,
    C2: 0.02,
  };

  return percentages[level] || 0.05;
}
