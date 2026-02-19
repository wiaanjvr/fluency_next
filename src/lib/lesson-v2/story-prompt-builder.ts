/**
 * Story Prompt Builder — Constructs the AI prompt for story generation
 *
 * Story constraints:
 * - Exactly 5 sentences, max 5 words each
 * - Complete narrative arc (character/situation, development, resolution)
 * - Themed around one of the learner's 3 interests
 * - Language mixing per mastery stage
 * - Target-language words in semantically meaningful positions
 * - No unseen/unintroduced target-language words
 * - ≤ 2 new target-language words per story
 * - Emotional tone varies across sessions
 */

import {
  LearnerWord,
  GeneratedStory,
  StoryTone,
  MasteryStageConfig,
  LessonExercise,
  ComprehensionExercise,
  GuidedRecallExercise,
  ConstrainedProductionExercise,
  FullProductionExercise,
} from "@/types/lesson-v2";
import {
  getMasteryStage,
  getMixingRatio,
  getNextTone,
  getNextInterest,
} from "./progression";
import { selectWordsForStory, buildVocabLookup } from "./word-selector";

// ═══════════════════════════════════════════════════════════════════
// LANGUAGE NAMES (for prompts)
// ═══════════════════════════════════════════════════════════════════

const LANGUAGE_NAMES: Record<string, string> = {
  fr: "French",
  de: "German",
  it: "Italian",
  es: "Spanish",
  pt: "Portuguese",
};

function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code;
}

// ═══════════════════════════════════════════════════════════════════
// PROMPT CONSTRUCTION
// ═══════════════════════════════════════════════════════════════════

export interface StoryPromptParams {
  targetLanguage: string;
  interests: [string, string, string];
  knownWords: LearnerWord[];
  masteryCount: number;
  previousTone?: StoryTone;
  previousInterestIndex?: number;
}

export interface StoryPromptResult {
  systemPrompt: string;
  userPrompt: string;
  selectedTheme: string;
  selectedThemeIndex: number;
  selectedTone: StoryTone;
  stage: MasteryStageConfig;
  newStoryWordLemmas: string[];
}

/**
 * Build the full prompt for the AI story generator.
 */
export function buildStoryPrompt(params: StoryPromptParams): StoryPromptResult {
  const {
    targetLanguage,
    interests,
    knownWords,
    masteryCount,
    previousTone,
    previousInterestIndex,
  } = params;

  const stage = getMasteryStage(masteryCount);
  const { english, target } = getMixingRatio(masteryCount);
  const langName = getLanguageName(targetLanguage);
  const tone = getNextTone(previousTone);
  const { theme, index: themeIndex } = getNextInterest(
    interests,
    previousInterestIndex,
  );

  const wordSelection = selectWordsForStory(knownWords);
  const vocabLookup = buildVocabLookup(knownWords);

  // Cap the vocab list to the 200 most-recently-reviewed words to bound
  // input token cost. knownWords arrive sorted by frequency_rank ASC;
  // sort by lastReviewedAt DESC so active words appear first.
  const recentEntries = Object.entries(vocabLookup)
    .sort(([aLemma], [bLemma]) => {
      const aWord = knownWords.find((w) => w.lemma === aLemma);
      const bWord = knownWords.find((w) => w.lemma === bLemma);
      const aTime = aWord?.lastReviewedAt
        ? new Date(aWord.lastReviewedAt).getTime()
        : 0;
      const bTime = bWord?.lastReviewedAt
        ? new Date(bWord.lastReviewedAt).getTime()
        : 0;
      return bTime - aTime;
    })
    .slice(0, 200);

  // Build available vocab list for the prompt
  const vocabList = recentEntries
    .map(([lemma, translation]) => `${lemma} = "${translation}"`)
    .join(", ");

  const newWordLemmas = wordSelection.newStoryWords.map((w) => w.lemma);
  const newWordNote =
    newWordLemmas.length > 0
      ? `New words to introduce in the story (max 2): ${newWordLemmas.join(", ")}. These words HAVE been introduced to the learner already but are appearing in a story for the first time.`
      : "No new words for this story — use only previously mastered vocabulary.";

  // System prompt
  const systemPrompt = `You are a micro-story generator for language learners. You produce JSON only.

RULES — follow ALL of them exactly:
1. Every story has EXACTLY 5 sentences.
2. Each sentence has a MAXIMUM of 5 words.
3. The story has a complete narrative arc: a character or situation, a development, and a resolution.
4. The story must feel like a real micro-narrative, NOT a grammar exercise.
5. Emotional tone for this story: ${tone}.
6. Language mixing ratio: ${english}% English, ${target}% ${langName}.
7. ${langName} words must fill semantically meaningful positions — main verbs, subject nouns, direct objects. NEVER place them in filler or grammatically peripheral positions.
8. Known words to new words ratio must be at least 95:5. In a 25-word story, that means at most 1-2 new ${langName} words.
9. ONLY use ${langName} words from the approved vocabulary list below. NEVER invent or use a ${langName} word not in the list.
10. English words fill all remaining positions so sentences read naturally.
11. Output MUST be valid JSON matching the schema below.

APPROVED ${langName} VOCABULARY:
${vocabList}

${newWordNote}

OUTPUT JSON SCHEMA:
{
  "interest_theme": "string — which interest this story is about",
  "new_words_introduced": ["array of ${langName} words appearing for the first time in a story"],
  "story": [
    {
      "sentence_number": 1,
      "text": "The sentence in mixed or full ${langName}",
      "target_words_used": ["${langName} words in this sentence"],
      "english_translation": "Full English translation"
    }
  ]
}`;

  // User prompt
  const userPrompt = `Generate a 5-sentence micro-story themed around "${theme}".

Mastery stage: ${stage.label} (${masteryCount} words mastered).
Mixing ratio: ${english}% English / ${target}% ${langName}.
Tone: ${tone}.

The learner knows these ${langName} words: ${wordSelection.targetLemmas.slice(0, 200).join(", ") || "(none yet)"}.
${newWordLemmas.length > 0 ? `New words to weave in (max 2): ${newWordLemmas.join(", ")}.` : ""}

Remember: exactly 5 sentences, max 5 words each, complete narrative arc, natural reading, ${langName} words in meaningful positions only.`;

  return {
    systemPrompt,
    userPrompt,
    selectedTheme: theme,
    selectedThemeIndex: themeIndex,
    selectedTone: tone,
    stage,
    newStoryWordLemmas: newWordLemmas,
  };
}

// ═══════════════════════════════════════════════════════════════════
// EXERCISE GENERATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Build a post-story exercise matching the learner's mastery stage.
 */
export function buildExercisePrompt(
  stage: MasteryStageConfig,
  story: GeneratedStory,
  targetLanguage: string,
): { systemPrompt: string; userPrompt: string } {
  const langName = getLanguageName(targetLanguage);
  const storyText = story.story.map((s) => s.text).join(" ");
  const targetWords = story.story.flatMap((s) => s.target_words_used);

  switch (stage.exerciseType) {
    case "comprehension":
      return {
        systemPrompt: `Generate a simple comprehension question in English about a story a language learner just read. Output JSON: { "type": "comprehension", "question": "...", "options": ["A","B","C","D"], "correctIndex": 0 }`,
        userPrompt: `The learner just read this story:\n${storyText}\n\nEnglish translations:\n${story.story.map((s) => s.english_translation).join("\n")}\n\nCreate a meaning-check question in English with 4 options. The question should test whether the learner understood what happened in the story.`,
      };

    case "guided-recall":
      return {
        systemPrompt: `Generate a fill-in-the-blank exercise. Take a sentence from the story, remove one known ${langName} word, and create a blank. Output JSON: { "type": "guided-recall", "sentenceWithBlank": "...", "removedWord": "...", "hint": "English meaning of removed word", "options": ["word1","word2","word3","word4"] }`,
        userPrompt: `The learner read this story:\n${storyText}\n\n${langName} words used: ${targetWords.join(", ")}\n\nPick a sentence with a ${langName} word and remove that word, replacing it with ___. Give 4 word options including the correct one.`,
      };

    case "constrained-production":
      return {
        systemPrompt: `Generate a constrained production exercise. Give the learner key words and a prompt to construct a sentence. Output JSON: { "type": "constrained-production", "prompt": "...", "keyWords": ["word1","word2"], "mixingFormat": "description of expected language mix", "sampleAnswer": "..." }`,
        userPrompt: `The learner read a story about "${story.interest_theme}" using these ${langName} words: ${targetWords.join(", ")}.\n\nAsk them to write a sentence using 2-3 of these words. The sentence should use about ${stage.targetRatio}% ${langName}. Provide a sample answer.`,
      };

    case "full-production":
      return {
        systemPrompt: `Generate a full production exercise entirely in ${langName}. Give a simple prompt and key words. Output JSON: { "type": "full-production", "prompt": "...", "keyWords": ["word1","word2"], "sampleAnswer": "..." }`,
        userPrompt: `The learner read a story about "${story.interest_theme}" using these ${langName} words: ${targetWords.join(", ")}.\n\nAsk them to write a sentence entirely in ${langName} using 2-3 of these words. Provide a sample answer in ${langName}.`,
      };
  }
}

// ═══════════════════════════════════════════════════════════════════
// STORY VALIDATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Validate a generated story against the spec constraints.
 * Returns list of violations (empty if valid).
 */
export function validateGeneratedStory(
  story: GeneratedStory,
  knownLemmas: Set<string>,
): string[] {
  const violations: string[] = [];

  // Must have exactly 5 sentences
  if (story.story.length !== 5) {
    violations.push(`Expected 5 sentences, got ${story.story.length}`);
  }

  // Each sentence max 5 words
  for (const s of story.story) {
    const wordCount = s.text.trim().split(/\s+/).length;
    if (wordCount > 5) {
      violations.push(
        `Sentence ${s.sentence_number} has ${wordCount} words (max 5)`,
      );
    }
  }

  // No unintroduced target words
  for (const s of story.story) {
    for (const tw of s.target_words_used) {
      if (!knownLemmas.has(tw.toLowerCase())) {
        violations.push(
          `Target word "${tw}" in sentence ${s.sentence_number} was never introduced`,
        );
      }
    }
  }

  // Max 2 new words
  if (story.new_words_introduced.length > 2) {
    violations.push(
      `Too many new words: ${story.new_words_introduced.length} (max 2)`,
    );
  }

  return violations;
}
