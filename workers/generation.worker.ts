/**
 * BullMQ Worker — Background content generation
 *
 * Runs as a separate process via `npm run worker` (tsx workers/generation.worker.ts).
 * Pulls jobs off the "content-generation" queue and generates stories or word
 * content using the Gemini API, then stores results in the pre_generated_content
 * Supabase table.
 *
 * Because this runs outside of Next.js, it cannot use `@/` path aliases or
 * the Next.js server Supabase client. It creates its own Supabase admin client
 * using the service role key and calls the Gemini API directly.
 */

import dotenv from "dotenv";
import fs from "fs";
import https from "https";

// Prefer .env.local (used by Next.js) when present, otherwise fall back to .env
if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
} else {
  dotenv.config();
}
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import nodeFetch, { RequestInfo, RequestInit } from "node-fetch";

// Corporate/enterprise networks often intercept TLS with a self-signed cert.
// Disable TLS verification for this worker process (dev only).
// Covers: node-fetch (Supabase), native fetch (Gemini SDK), and any other HTTPS.
// Safe here because this worker only calls Supabase and Google Gemini API.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const tlsAgent = new https.Agent({ rejectUnauthorized: false });

/**
 * node-fetch wrapper that injects the permissive TLS agent on every HTTPS
 * request — passed to the Supabase client as `global.fetch`.
 */
function fetchWithTls(url: RequestInfo, init?: RequestInit) {
  return nodeFetch(url, { agent: tlsAgent, ...init });
}

// ─── Environment validation ─────────────────────────────────────────────────

const REQUIRED_ENV = [
  "UPSTASH_REDIS_REDIS_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_API_KEY",
] as const;

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required env var: ${key}`);
    process.exit(1);
  }
}

// ─── Connections ─────────────────────────────────────────────────────────────

const connection = new IORedis(process.env.UPSTASH_REDIS_REDIS_URL!, {
  maxRetriesPerRequest: null, // Required by BullMQ for blocking commands
  retryStrategy(times: number) {
    // Exponential backoff capped at 10s; give up after 10 attempts
    if (times > 10) return null;
    return Math.min(times * 500, 10000);
  },
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    global: {
      // Use node-fetch with a permissive TLS agent to handle corporate HTTPS
      // proxy / SSL inspection environments ("unable to get local issuer cert")
      fetch: fetchWithTls as unknown as typeof fetch,
    },
    auth: { persistSession: false },
  },
);

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY! });

// ─── Timeout for all Gemini calls ────────────────────────────────────────────
const GEMINI_TIMEOUT_MS = 30_000; // 30 seconds

// ─── Types (mirrored from src/types/lesson-v2.ts to avoid @/ imports) ────────

interface GenerationJobData {
  userId: string;
  lessonId: string;
  type: "story" | "word" | "tts" | "log-session";
  targetLanguage: string;
  previousTone?: string;
  previousInterestIndex?: number;
  ttsText?: string;
  templateId?: string;
  sessionLogData?: Record<string, unknown>;
}

interface LearnerWordRow {
  word: string;
  lemma: string;
  translation: string;
  part_of_speech: string;
  frequency_rank: number;
  status: string;
  introduced_at: string;
  last_reviewed_at: string | null;
  correct_streak: number;
  total_reviews: number;
  total_correct: number;
}

// ─── Language names for prompts ──────────────────────────────────────────────

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

// ─── Mastery stages (mirrored from progression.ts) ──────────────────────────

interface MasteryStageConfig {
  stage: string;
  label: string;
  minMastery: number;
  englishRatio: number;
  targetRatio: number;
  exerciseType: string;
}

const MASTERY_STAGES: MasteryStageConfig[] = [
  {
    stage: "stage-1",
    label: "Comprehension",
    minMastery: 0,
    englishRatio: 80,
    targetRatio: 20,
    exerciseType: "comprehension",
  },
  {
    stage: "stage-2",
    label: "Guided Recall",
    minMastery: 30,
    englishRatio: 60,
    targetRatio: 40,
    exerciseType: "guided-recall",
  },
  {
    stage: "stage-3",
    label: "Balanced",
    minMastery: 50,
    englishRatio: 40,
    targetRatio: 60,
    exerciseType: "guided-recall",
  },
  {
    stage: "stage-4",
    label: "Production",
    minMastery: 75,
    englishRatio: 20,
    targetRatio: 80,
    exerciseType: "constrained-production",
  },
  {
    stage: "stage-5",
    label: "Full Production",
    minMastery: 150,
    englishRatio: 0,
    targetRatio: 100,
    exerciseType: "full-production",
  },
];

function getMasteryStage(count: number): MasteryStageConfig {
  for (let i = MASTERY_STAGES.length - 1; i >= 0; i--) {
    if (count >= MASTERY_STAGES[i].minMastery) return MASTERY_STAGES[i];
  }
  return MASTERY_STAGES[0];
}

// ─── Tone rotation ──────────────────────────────────────────────────────────

const TONES = [
  "cheerful",
  "mysterious",
  "adventurous",
  "calm",
  "humorous",
] as const;

function getNextTone(previous?: string): string {
  if (!previous) return TONES[0];
  const idx = TONES.indexOf(previous as (typeof TONES)[number]);
  return TONES[(idx + 1) % TONES.length];
}

function getNextInterest(
  interests: string[],
  previousIndex?: number,
): { theme: string; index: number } {
  const idx =
    previousIndex != null ? (previousIndex + 1) % interests.length : 0;
  return { theme: interests[idx], index: idx };
}

// ─── Story generation (mirrors generate-story/route.ts logic) ────────────────

async function generateStoryContent(
  job: Job<GenerationJobData>,
): Promise<object> {
  const { userId, targetLanguage, previousTone, previousInterestIndex } =
    job.data;

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("target_language, native_language, interests")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error(
      `Profile not found for user ${userId}: ${profileError?.message}`,
    );
  }

  const lang = targetLanguage || profile.target_language || "fr";
  const interests = (profile.interests || []).slice(0, 3) as string[];

  if (interests.length < 3) {
    throw new Error(
      `User ${userId} needs 3 interests configured (has ${interests.length})`,
    );
  }

  // Fetch learner words
  const { data: dbWords, error: wordsError } = await supabase
    .from("learner_words_v2")
    .select("*")
    .eq("user_id", userId)
    .order("frequency_rank", { ascending: true });

  if (wordsError) {
    throw new Error(
      `Failed to fetch words for user ${userId}: ${wordsError.message}`,
    );
  }

  const words: LearnerWordRow[] = dbWords || [];
  if (words.length === 0) {
    throw new Error(
      `User ${userId} has no introduced words — cannot generate story`,
    );
  }

  // Compute mastery count
  const masteryCount = words.filter(
    (w) =>
      w.status === "mastered" ||
      (w.correct_streak >= 3 && w.total_reviews >= 3),
  ).length;

  const stage = getMasteryStage(masteryCount);
  const langName = getLanguageName(lang);
  const tone = getNextTone(previousTone);
  const { theme, index: themeIndex } = getNextInterest(
    interests,
    previousInterestIndex,
  );

  // Cap to 200 most-recently-reviewed words to bound input token cost
  const recentWords = [...words]
    .sort((a, b) => {
      const aTime = a.last_reviewed_at
        ? new Date(a.last_reviewed_at).getTime()
        : 0;
      const bTime = b.last_reviewed_at
        ? new Date(b.last_reviewed_at).getTime()
        : 0;
      return bTime - aTime;
    })
    .slice(0, 200);

  // Build vocab lookup
  const vocabList = recentWords
    .map((w) => `${w.lemma} = "${w.translation}"`)
    .join(", ");

  const targetLemmas = recentWords.map((w) => w.lemma);

  // Select up to 2 "introduced" words as new story words
  const newStoryWords = words
    .filter((w) => w.status === "introduced")
    .slice(0, 2);
  const newWordLemmas = newStoryWords.map((w) => w.lemma);

  const newWordNote =
    newWordLemmas.length > 0
      ? `New words to introduce in the story (max 2): ${newWordLemmas.join(", ")}. These words HAVE been introduced to the learner already but are appearing in a story for the first time.`
      : "No new words for this story — use only previously mastered vocabulary.";

  // System prompt (exact same as in story-prompt-builder.ts)
  const systemPrompt = `You are a micro-story generator for language learners. You produce JSON only.

RULES — follow ALL of them exactly:
1. Every story has EXACTLY 5 sentences.
2. Each sentence has a MAXIMUM of 5 words.
3. The story has a complete narrative arc: a character or situation, a development, and a resolution.
4. The story must feel like a real micro-narrative, NOT a grammar exercise.
5. Emotional tone for this story: ${tone}.
6. Language mixing ratio: ${stage.englishRatio}% English, ${stage.targetRatio}% ${langName}.
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

  const userPrompt = `Generate a 5-sentence micro-story themed around "${theme}".

Mastery stage: ${stage.label} (${masteryCount} words mastered).
Mixing ratio: ${stage.englishRatio}% English / ${stage.targetRatio}% ${langName}.
Tone: ${tone}.

The learner knows these ${langName} words: ${targetLemmas.join(", ") || "(none yet)"}.
${newWordLemmas.length > 0 ? `New words to weave in (max 2): ${newWordLemmas.join(", ")}.` : ""}

Remember: exactly 5 sentences, max 5 words each, complete narrative arc, natural reading, ${langName} words in meaningful positions only.`;

  // Generate story with retry (same as the route)
  let story: any;
  let retries = 0;
  const maxRetries = 2;

  while (true) {
    const completion = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
        maxOutputTokens: 512,
        responseMimeType: "application/json",
        httpOptions: { timeout: GEMINI_TIMEOUT_MS },
      },
    });

    const raw = completion.text || "{}";
    story = JSON.parse(raw);

    // Validate: check sentence count and unknown words
    const knownLemmasSet = new Set(words.map((w) => w.lemma.toLowerCase()));
    const violations: string[] = [];

    if (story.story?.length !== 5) {
      violations.push(`Expected 5 sentences, got ${story.story?.length}`);
    }
    for (const s of story.story || []) {
      const wc = s.text?.trim().split(/\s+/).length || 0;
      if (wc > 5)
        violations.push(`Sentence ${s.sentence_number} has ${wc} words`);
      for (const tw of s.target_words_used || []) {
        if (!knownLemmasSet.has(tw.toLowerCase())) {
          violations.push(`Unknown word "${tw}"`);
        }
      }
    }

    if (violations.length === 0) break;
    retries++;
    if (retries > maxRetries) {
      console.warn(
        `[worker] Story validation failed after ${maxRetries} retries:`,
        violations,
      );
      break;
    }
  }

  // Generate exercise
  const exercisePrompt = buildExercisePromptForWorker(stage, story, langName);
  const exerciseCompletion = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: exercisePrompt.userPrompt,
    config: {
      systemInstruction: exercisePrompt.systemPrompt,
      temperature: 0.6,
      maxOutputTokens: 256,
      responseMimeType: "application/json",
      httpOptions: { timeout: GEMINI_TIMEOUT_MS },
    },
  });

  const exercise = JSON.parse(exerciseCompletion.text || "{}");

  return {
    story,
    exercise,
    tone,
    stage: stage.stage,
    interestTheme: theme,
    interestIndex: themeIndex,
    masteryCount,
  };
}

// ─── Exercise prompt builder (mirrors story-prompt-builder.ts) ───────────────

function buildExercisePromptForWorker(
  stage: MasteryStageConfig,
  story: any,
  langName: string,
): { systemPrompt: string; userPrompt: string } {
  const storyText = (story.story || []).map((s: any) => s.text).join(" ");
  const targetWords = (story.story || []).flatMap(
    (s: any) => s.target_words_used || [],
  );

  switch (stage.exerciseType) {
    case "comprehension":
      return {
        systemPrompt: `Generate a simple comprehension question in English about a story a language learner just read. Output JSON: { "type": "comprehension", "question": "...", "options": ["A","B","C","D"], "correctIndex": 0 }`,
        userPrompt: `The learner just read this story:\n${storyText}\n\nEnglish translations:\n${(story.story || []).map((s: any) => s.english_translation).join("\n")}\n\nCreate a meaning-check question in English with 4 options. The question should test whether the learner understood what happened in the story.`,
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

    default:
      return {
        systemPrompt: `Generate a simple comprehension question in English about a story a language learner just read. Output JSON: { "type": "comprehension", "question": "...", "options": ["A","B","C","D"], "correctIndex": 0 }`,
        userPrompt: `The learner just read this story:\n${storyText}\n\nCreate a meaning-check question in English with 4 options.`,
      };
  }
}

// ─── TTS generation (offloaded from lesson generate route) ───────────────────

/**
 * Wrap raw PCM data from Gemini TTS in a WAV container.
 */
function pcmToWav(
  pcm: Buffer,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16,
): Buffer {
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE((sampleRate * channels * bitsPerSample) / 8, 28);
  header.writeUInt16LE((channels * bitsPerSample) / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}

async function generateTTSContent(
  job: Job<GenerationJobData>,
): Promise<object> {
  const { userId, lessonId, ttsText, templateId } = job.data;

  if (!ttsText) {
    throw new Error("ttsText is required for TTS jobs");
  }

  console.log(`[worker] Generating TTS audio for lesson ${lessonId}...`);

  const ttsResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: [{ parts: [{ text: ttsText }] }],
    config: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Aoede",
          },
        },
      },
      httpOptions: { timeout: GEMINI_TIMEOUT_MS },
    } as any,
  });

  const audioBase64 =
    ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!audioBase64) {
    throw new Error("Gemini TTS returned no audio data");
  }

  const pcm = Buffer.from(audioBase64, "base64");
  const buffer = pcmToWav(pcm);

  // Upload to Supabase Storage
  const fileName = `${userId}/${lessonId}.wav`;
  const { error: uploadError } = await supabase.storage
    .from("lesson-audio")
    .upload(fileName, buffer, {
      contentType: "audio/wav",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Failed to upload audio: ${uploadError.message}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("lesson-audio").getPublicUrl(fileName);

  // Update the lesson row with the audio URL
  const { error: updateError } = await supabase
    .from("lessons")
    .update({ audio_url: publicUrl })
    .eq("id", lessonId)
    .eq("user_id", userId);

  if (updateError) {
    console.warn(
      `[worker] Failed to update lesson audio_url: ${updateError.message}`,
    );
  }

  // Also update the template if provided
  if (templateId) {
    await supabase
      .from("lesson_templates")
      .update({ audio_url: publicUrl })
      .eq("id", templateId);
  }

  console.log(
    `[worker] TTS audio uploaded for lesson ${lessonId}: ${publicUrl}`,
  );
  return { audioUrl: publicUrl };
}

// ─── Word generation ─────────────────────────────────────────────────────────

async function generateWordContent(
  job: Job<GenerationJobData>,
): Promise<object> {
  const { userId, targetLanguage } = job.data;

  // Fetch profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("target_language, native_language")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    throw new Error(
      `Profile not found for user ${userId}: ${profileError?.message ?? "no data returned"}`,
    );
  }

  const lang = targetLanguage || profile.target_language || "fr";
  const langName = getLanguageName(lang);

  // Get existing words to know which ones NOT to re-introduce
  const { data: existingWords } = await supabase
    .from("learner_words_v2")
    .select("lemma")
    .eq("user_id", userId);

  const knownLemmas = new Set(
    (existingWords || []).map((w: any) => w.lemma.toLowerCase()),
  );

  // Ask Gemini for the next batch of useful words
  const systemPrompt = `You are a language teaching assistant. Given a list of words a learner already knows, suggest the next 5 most useful ${langName} words to learn, ordered by frequency. Output JSON: { "words": [{ "word": "...", "lemma": "...", "translation": "...", "partOfSpeech": "noun|verb|adjective|adverb|other", "frequencyRank": 123, "exampleSentence": "...", "exampleTranslation": "..." }] }`;

  const userPrompt = `The learner already knows these ${langName} words: ${[...knownLemmas].join(", ") || "(none)"}.

Suggest the next 5 most useful ${langName} words to learn. They should be high-frequency, practical words that are NOT in the known list. Include a simple example sentence using each word.`;

  const completion = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite",
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature: 0.5,
      maxOutputTokens: 512,
      responseMimeType: "application/json",
      httpOptions: { timeout: GEMINI_TIMEOUT_MS },
    },
  });

  const result = JSON.parse(completion.text || '{ "words": [] }');
  return result;
}

// ─── Job processor ───────────────────────────────────────────────────────────

async function processJob(job: Job<GenerationJobData>): Promise<void> {
  const { userId, lessonId, type } = job.data;
  console.log(
    `[worker] Processing job ${job.id}: type=${type}, user=${userId}, lesson=${lessonId}`,
  );

  // Check for existing content to avoid duplicates
  const { data: existing } = await supabase
    .from("pre_generated_content")
    .select("id")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .eq("type", type)
    .eq("status", "ready")
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(
      `[worker] Content already exists for lesson ${lessonId}, skipping`,
    );
    return;
  }

  let content: object;

  if (type === "log-session") {
    // Session log jobs bypass the deduplication and pre_generated_content insert.
    // They write directly to lesson_sessions_v2.
    const logData = job.data.sessionLogData;
    if (!logData) {
      throw new Error("log-session job missing sessionLogData");
    }
    const { error: logError } = await supabase
      .from("lesson_sessions_v2")
      .insert(logData);
    if (logError) {
      throw new Error(`Failed to log session: ${logError.message}`);
    }
    console.log(`[worker] Session logged for user ${userId}`);
    return;
  }

  if (type === "story") {
    content = await generateStoryContent(job);
  } else if (type === "tts") {
    content = await generateTTSContent(job);
  } else {
    content = await generateWordContent(job);
  }

  // Save to Supabase
  const { error: insertError } = await supabase
    .from("pre_generated_content")
    .insert({
      user_id: userId,
      lesson_id: lessonId,
      type,
      content,
      status: "ready",
    });

  if (insertError) {
    throw new Error(
      `Failed to save pre-generated content: ${insertError.message}`,
    );
  }

  console.log(
    `[worker] Successfully generated ${type} content for lesson ${lessonId}`,
  );
}

// ─── Worker setup ────────────────────────────────────────────────────────────

const worker = new Worker<GenerationJobData>("content-generation", processJob, {
  connection: connection as any,
  concurrency: 5,
  limiter: { max: 30, duration: 60000 }, // 30 jobs per minute — increased to accommodate log-session jobs alongside TTS/story generation
});

worker.on("completed", (job) => {
  console.log(`[worker] Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(
    `[worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts.attempts}):`,
    err.message,
  );
});

worker.on("error", (err) => {
  console.error("[worker] Worker error:", err);
});

console.log("[worker] Content generation worker started. Waiting for jobs...");

// ─── Graceful shutdown ───────────────────────────────────────────────────────

async function shutdown() {
  console.log("[worker] Shutting down...");
  await worker.close();
  connection.disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
