// ==========================================================================
// Duel Round Question Generation via Gemini AI
//
// Generates 7 questions (one per category + one bonus from a rotated
// category) for a duel round using the shared AI client.
// ==========================================================================

import { generateJSON } from "@/lib/ai-client";
import type {
  DuelCategory,
  DuelDifficulty,
  DuelLanguage,
  DuelQuestion,
} from "@/types/duel";
import { LANGUAGE_LABELS, DUEL_CATEGORIES } from "@/types/duel";

interface GenerateRoundParams {
  supabase: Awaited<
    ReturnType<typeof import("@/lib/supabase/server").createClient>
  >;
  duelId: string;
  roundNumber: number;
  languageCode: DuelLanguage;
  difficulty: DuelDifficulty;
}

// 6 categories + 1 bonus (rotated based on round number)
function getCategoriesForRound(roundNumber: number): DuelCategory[] {
  const base: DuelCategory[] = [...DUEL_CATEGORIES]; // all 6
  // 7th question rotates through categories
  const bonusCategory =
    DUEL_CATEGORIES[(roundNumber - 1) % DUEL_CATEGORIES.length];
  return [...base, bonusCategory];
}

function buildPrompt(
  languageCode: DuelLanguage,
  difficulty: DuelDifficulty,
  categories: DuelCategory[],
): string {
  const lang = LANGUAGE_LABELS[languageCode];

  const categoryInstructions: Record<DuelCategory, string> = {
    vocabulary: `Generate a ${lang} ${difficulty} vocabulary question with 4 multiple choice options. Ask "What does '<${lang} word>' mean?" or "How do you say '<English word>' in ${lang}?" Include the correct answer and a brief explanation.`,
    cloze: `Generate a fill-in-the-blank sentence in ${lang} at ${difficulty} level. The sentence should have exactly one blank (shown as "___"). Provide 4 options for the blank. Include the correct answer and explanation of the grammar rule.`,
    conjugation: `Generate a ${lang} ${difficulty} verb conjugation question. Show a sentence with a verb to conjugate (e.g. "Ich ___ gestern ins Kino. (gehen, Perfekt)"). Provide 4 conjugation options. Include the correct answer and explanation.`,
    grammar: `Generate a ${lang} ${difficulty} grammar question. Show 4 sentences and ask which one is grammatically correct. Include the correct answer and explanation of the grammar rule tested.`,
    listening: `Generate a ${lang} ${difficulty} listening comprehension question. Provide a ${lang} word or short phrase (2-4 words) that would be spoken aloud. Give 4 written options representing what the learner might have heard. Include the correct answer. Set audio_text to the spoken text.`,
    translation: `Generate a simple ${lang} ${difficulty} sentence. Ask the user to type the English translation. The correct_answer should be the expected English translation. Set options to null since this is a free-text input. Include explanation.`,
  };

  const questionsSpec = categories
    .map((cat, i) => `Question ${i + 1} (${cat}): ${categoryInstructions[cat]}`)
    .join("\n\n");

  return `You are a language learning quiz generator. Generate exactly ${categories.length} quiz questions for a ${lang} language duel at ${difficulty} level.

Each question must be a JSON object with these fields:
- "index": number (0-based)
- "category": string (the category name)
- "prompt": string (the question text)
- "options": array of 4 strings OR null (null only for "translation" category)
- "correct_answer": string (must exactly match one of the options for MC, or be the expected answer for translations)
- "explanation": string (brief explanation of the correct answer)
- "audio_text": string or null (only set for "listening" category — the text to be spoken)

Important rules:
- All ${lang} text must be appropriate for ${difficulty} level learners
- Multiple choice questions must have exactly 4 options
- The correct_answer must EXACTLY match one of the options (for MC questions)
- Explanations should be concise and educational
- For listening questions, audio_text is the ${lang} text that will be spoken via TTS
- For translation questions, options MUST be null
- Vary the vocabulary topics and grammar structures

${questionsSpec}

Return a JSON array of ${categories.length} question objects. No markdown, no code blocks — pure JSON array only.`;
}

export async function generateDuelRound(params: GenerateRoundParams) {
  const { supabase, duelId, roundNumber, languageCode, difficulty } = params;

  const categories = getCategoriesForRound(roundNumber);

  const prompt = buildPrompt(
    languageCode as DuelLanguage,
    difficulty as DuelDifficulty,
    categories,
  );

  // Generate questions via Gemini
  const questions = await generateJSON<DuelQuestion[]>({
    contents: prompt,
    systemInstruction:
      "You are an expert language teacher who creates precise, pedagogically sound quiz questions. Always return valid JSON arrays.",
    temperature: 0.8,
    model: "gemini-2.5-flash-lite",
    timeoutMs: 45_000,
  });

  // Validate and fix indices
  const validatedQuestions = questions.map((q, i) => ({
    ...q,
    index: i,
    category: categories[i],
  }));

  // Store in duel_rounds
  const { error } = await supabase.from("duel_rounds").insert({
    duel_id: duelId,
    round_number: roundNumber,
    questions: validatedQuestions,
  });

  if (error) {
    throw new Error(`Failed to store round: ${error.message}`);
  }

  return validatedQuestions;
}
