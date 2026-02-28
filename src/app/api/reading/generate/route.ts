import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";
import { getAI } from "@/lib/ai-client";
import { generateText } from "@/lib/ai-client";
import {
  tokenizeText,
  randomTopic,
  cleanGeneratedText,
} from "@/lib/reading-utils";
import type { ReadingToken } from "@/lib/reading-utils";

// ─── Function / grammar word baselines ─────────────────────────────────────
// These ultra-common words appear in every sentence of the language yet are
// almost never explicitly "learned" via flashcards. Including them in the
// known-word set prevents them from eating into the 5% new-word budget.

const FUNCTION_WORDS: Record<string, string[]> = {
  fr: [
    "le",
    "la",
    "les",
    "de",
    "du",
    "des",
    "un",
    "une",
    "et",
    "est",
    "il",
    "elle",
    "ils",
    "elles",
    "je",
    "tu",
    "nous",
    "vous",
    "on",
    "se",
    "me",
    "te",
    "lui",
    "en",
    "y",
    "à",
    "au",
    "aux",
    "que",
    "qui",
    "ne",
    "pas",
    "plus",
    "très",
    "bien",
    "avec",
    "dans",
    "sur",
    "pour",
    "par",
    "son",
    "sa",
    "ses",
    "mon",
    "ma",
    "mes",
    "ton",
    "ta",
    "tes",
    "leur",
    "leurs",
    "ce",
    "cet",
    "cette",
    "ces",
    "tout",
    "tous",
    "toute",
    "toutes",
    "même",
    "mais",
    "ou",
    "donc",
    "ni",
    "car",
    "si",
    "quand",
    "comme",
    "aussi",
    "alors",
    "déjà",
    "encore",
    "toujours",
    "jamais",
    "ici",
    "là",
    "non",
    "oui",
    "voilà",
    "puis",
    "dont",
    "après",
    "avant",
    "pendant",
    "sans",
    "sous",
    "entre",
    "vers",
    "chez",
  ],
  de: [
    "der",
    "die",
    "das",
    "ein",
    "eine",
    "und",
    "ist",
    "er",
    "sie",
    "es",
    "ich",
    "du",
    "wir",
    "ihr",
    "nicht",
    "auch",
    "auf",
    "in",
    "mit",
    "von",
    "zu",
    "an",
    "den",
    "dem",
    "einen",
    "einer",
    "eines",
    "bei",
    "aus",
    "wenn",
    "als",
    "wie",
    "aber",
    "oder",
    "noch",
    "mehr",
    "sehr",
    "schon",
    "jetzt",
    "dann",
    "noch",
    "hier",
    "da",
    "so",
    "nun",
    "ja",
    "nein",
    "sich",
    "mir",
    "dir",
    "uns",
    "euch",
    "im",
    "am",
    "zum",
    "zur",
    "ins",
    "ans",
    "beim",
    "vom",
    "nach",
    "vor",
    "über",
    "unter",
    "zwischen",
    "durch",
    "für",
    "gegen",
    "ohne",
    "um",
  ],
  it: [
    "il",
    "la",
    "lo",
    "i",
    "gli",
    "le",
    "un",
    "una",
    "e",
    "è",
    "lui",
    "lei",
    "io",
    "tu",
    "noi",
    "voi",
    "che",
    "non",
    "con",
    "si",
    "del",
    "della",
    "dei",
    "degli",
    "delle",
    "al",
    "alla",
    "ai",
    "alle",
    "nel",
    "nella",
    "nei",
    "nelle",
    "su",
    "per",
    "da",
    "tra",
    "fra",
    "ma",
    "o",
    "anche",
    "come",
    "più",
    "molto",
    "quando",
    "se",
    "questo",
    "questa",
    "questi",
    "queste",
    "già",
    "ancora",
    "sempre",
    "mai",
    "qui",
    "lì",
    "sì",
    "no",
    "poi",
    "dove",
    "come",
    "ci",
    "ne",
  ],
  es: [
    "el",
    "la",
    "los",
    "las",
    "un",
    "una",
    "y",
    "es",
    "él",
    "ella",
    "yo",
    "tú",
    "nosotros",
    "vosotros",
    "que",
    "no",
    "con",
    "se",
    "del",
    "de",
    "al",
    "en",
    "por",
    "para",
    "pero",
    "o",
    "también",
    "como",
    "más",
    "muy",
    "cuando",
    "si",
    "esto",
    "esta",
    "estos",
    "estas",
    "ya",
    "todavía",
    "siempre",
    "nunca",
    "aquí",
    "allí",
    "sí",
    "no",
    "entonces",
    "donde",
    "quien",
    "cual",
    "cuales",
    "nos",
    "le",
    "les",
    "me",
    "te",
    "lo",
    "les",
    "su",
    "sus",
    "mi",
    "mis",
    "tu",
    "tus",
  ],
};

// ─── Voice map per language ─────────────────────────────────────────────────

const VOICE_MAP: Record<string, string> = {
  fr: "Aoede",
  de: "Kore",
  it: "Aoede",
  es: "Aoede",
};

// ─── Language display names ─────────────────────────────────────────────────

const LANGUAGE_NAMES: Record<string, string> = {
  fr: "French",
  de: "German",
  it: "Italian",
  es: "Spanish",
};

// ─── 95 % known-word rule ───────────────────────────────────────────────────

function calculateStoryLength(knownCount: number): {
  targetWords: number;
  maxNewWords: number;
  description: string;
} {
  if (knownCount < 20) {
    return { targetWords: 18, maxNewWords: 1, description: "very short" };
  } else if (knownCount < 50) {
    return { targetWords: 48, maxNewWords: 3, description: "short" };
  } else if (knownCount < 100) {
    return { targetWords: 95, maxNewWords: 5, description: "short paragraph" };
  } else if (knownCount < 200) {
    return { targetWords: 190, maxNewWords: 10, description: "paragraph" };
  } else if (knownCount < 500) {
    return { targetWords: 280, maxNewWords: 15, description: "short story" };
  } else {
    return { targetWords: 380, maxNewWords: 20, description: "story" };
  }
}

function validateKnownRatio(
  text: string,
  knownWords: Set<string>,
  maxNewWords: number,
): { valid: boolean; unknownWords: string[]; unknownCount: number } {
  const words =
    text.match(/[a-zA-ZÀ-ÿäöüÄÖÜß]+(?:[-'][a-zA-ZÀ-ÿäöüÄÖÜß]+)*/g) || [];
  const unknownSet = new Set<string>();
  for (const w of words) {
    if (!knownWords.has(w.toLowerCase())) unknownSet.add(w.toLowerCase());
  }
  return {
    valid: unknownSet.size <= maxNewWords,
    unknownWords: [...unknownSet],
    unknownCount: unknownSet.size,
  };
}

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
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE((sampleRate * channels * bitsPerSample) / 8, 28);
  header.writeUInt16LE((channels * bitsPerSample) / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}

// ─── Fisher-Yates shuffle ───────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ─── Cross-reference tokens against a known-word set ────────────────────────
// Re-labels is_known / is_new using the requesting user's vocabulary so
// curated/cached stories display correctly for each individual learner.

function crossReferenceTokens(
  tokens: ReadingToken[],
  knownSet: Set<string>,
): ReadingToken[] {
  return tokens.map((t) => {
    if (t.punctuation) return t;
    const isKnown = knownSet.has(t.word.toLowerCase());
    return { ...t, is_known: isKnown, is_new: !isKnown };
  });
}

// ─── Cache lookup: find a pre-generated story that passes 95/5 for this user ─

async function findCachedStory(
  supabase: Awaited<
    ReturnType<typeof import("@/lib/supabase/server").createClient>
  >,
  language: string,
  cefrLevel: string,
  knownSet: Set<string>,
  maxNewWords: number,
  knownCount: number,
): Promise<{
  id: string;
  title: string;
  content: string;
  content_tokens: ReadingToken[];
  audio_url: string | null;
  cefr_level: string;
  topic: string | null;
  word_count: number;
} | null> {
  // Narrow candidates by vocab-size window (±50%) to avoid obviously mis-matched stories.
  const lo = Math.max(0, Math.floor(knownCount * 0.5));
  const hi = Math.ceil(knownCount * 1.5);

  const { data: candidates, error } = await supabase
    .from("reading_texts")
    .select(
      "id, title, content, content_tokens, audio_url, cefr_level, topic, word_count",
    )
    .eq("language", language)
    .eq("cefr_level", cefrLevel)
    .gte("known_word_count", lo)
    .lte("known_word_count", hi)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !candidates || candidates.length === 0) return null;

  for (const story of candidates) {
    const validation = validateKnownRatio(story.content, knownSet, maxNewWords);
    if (validation.valid) {
      const tokens = (story.content_tokens as ReadingToken[]) ?? [];
      return {
        ...story,
        content_tokens: crossReferenceTokens(tokens, knownSet),
      };
    }
  }
  return null;
}

// ─── POST /api/reading/generate ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 1. Auth
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  // 2. Parse body
  let body: { language?: string; cefrLevel?: string; topic?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const language = body.language || "fr";
  const cefrLevel = body.cefrLevel || "A2";
  const topic = body.topic || randomTopic();

  try {
    // 3. Fetch user's known words from learner_words_v2
    const { data: knownWordsData } = await supabase
      .from("learner_words_v2")
      .select("word, lemma")
      .eq("user_id", user.id)
      .eq("language", language);

    // Also fetch from user_words (Propel vocabulary)
    const { data: propelWordsData } = await supabase
      .from("user_words")
      .select("word, lemma")
      .eq("user_id", user.id)
      .eq("language", language)
      .in("status", ["learning", "known", "mastered"]);

    // Combine into a unique set
    const knownSet = new Set<string>();
    const knownList: string[] = [];

    for (const row of [...(knownWordsData || []), ...(propelWordsData || [])]) {
      const w = (row.lemma || row.word).toLowerCase();
      if (!knownSet.has(w)) {
        knownSet.add(w);
        knownList.push(w);
      }
    }

    // Always treat common function / grammar words as known.
    // These appear in every sentence but are almost never explicitly studied,
    // so without this they eat into the 5% unknown budget unfairly.
    for (const fw of FUNCTION_WORDS[language] ?? []) {
      if (!knownSet.has(fw)) {
        knownSet.add(fw);
        knownList.push(fw);
      }
    }

    // 4. Calculate story length based on 95% known-word rule
    // knownCount intentionally excludes function words (they're not "vocabulary")
    const knownCount = knownSet.size - (FUNCTION_WORDS[language]?.length ?? 0);
    const storySpec = calculateStoryLength(Math.max(0, knownCount));
    const languageName = LANGUAGE_NAMES[language] || language;

    // 5. Cache lookup — avoid a Gemini call if an existing story already
    //    satisfies the 95/5 rule for this user's vocabulary.
    const cached = await findCachedStory(
      supabase,
      language,
      cefrLevel,
      knownSet,
      storySpec.maxNewWords,
      Math.max(0, knownCount),
    );
    if (cached) {
      // Re-tokenize content words against user's known set and return immediately
      const wordCount = cached.content_tokens.filter(
        (t) => !t.punctuation,
      ).length;
      return NextResponse.json({ ...cached, word_count: wordCount });
    }

    // 6. Fetch SRS-informed priority words — these are the words the learner
    //    SHOULD encounter next, biased toward due flashcards and new vocab.
    let priorityNewWords: string[] = [];
    try {
      // 6a. Overdue flashcard fronts (words due for review via FSRS)
      const { data: dueCards } = await supabase
        .from("card_schedules")
        .select("card_id, due, flashcards(front, language)")
        .lte("due", new Date().toISOString())
        .eq("state", "review")
        .order("due", { ascending: true })
        .limit(20);

      const dueWords = (dueCards ?? [])
        .filter((d: any) => d.flashcards?.language === language)
        .map((d: any) => (d.flashcards?.front ?? "").toLowerCase())
        .filter((w: string) => w && !knownSet.has(w));

      // 6b. New / early-stage words not yet scheduled
      const { data: newVocab } = await supabase
        .from("user_words")
        .select("word")
        .eq("user_id", user.id)
        .eq("language", language)
        .eq("status", "new")
        .order("last_seen", { ascending: true })
        .limit(20);

      const newWords = (newVocab ?? [])
        .map((v: any) => v.word.toLowerCase())
        .filter((w: string) => w && !knownSet.has(w));

      // Combine: due flashcards first, then new vocab.
      // Give Gemini ~3x the budget so it has options to choose naturally.
      priorityNewWords = [...new Set([...dueWords, ...newWords])].slice(
        0,
        storySpec.maxNewWords * 3,
      );
    } catch (srsFetchErr) {
      // Non-critical — continue without SRS words
      console.warn("SRS priority fetch failed:", srsFetchErr);
    }

    // 7. Build a small vocabulary hint (≤20 words) from the learner's known
    //    words so Gemini has a flavour of their vocabulary without us sending
    //    the entire word list (which can be hundreds of tokens).
    //    The full known-word set is retained server-side for post-generation
    //    validation (step 9), so we don't lose correctness by not sending it.
    const HINT_SAMPLE_SIZE = 20;
    const hintSample =
      knownList.length > HINT_SAMPLE_SIZE
        ? shuffle(knownList).slice(0, HINT_SAMPLE_SIZE)
        : knownList;
    const hintWords = hintSample.join(", ");

    // Build the priority words prompt section
    const prioritySection =
      priorityNewWords.length > 0
        ? `\nPriority words to include in your story (try to use ${storySpec.maxNewWords} of these as the new words):\n${priorityNewWords.join(", ")}\n`
        : "";

    // 8. Generate reading text via Gemini with strict 95% rule.
    //    Known-word enforcement is done entirely server-side (steps 9–10) using
    //    the full DB-fetched set — no need to send the full list to Gemini.
    const storyPrompt =
      knownCount > 0
        ? `Write a ${storySpec.description} in ${languageName} about the topic: ${topic}.

STRICT RULES — violating these makes the story unusable:
1. The story must be EXACTLY ${storySpec.targetWords} words long (±5 words tolerance).
2. Target ${cefrLevel} proficiency level — use only vocabulary and grammar structures appropriate for ${cefrLevel} learners.
3. Introduce AT MOST ${storySpec.maxNewWords} words that go beyond common ${cefrLevel}-level vocabulary.
4. Do NOT use markdown, asterisks, bold, headers, or any formatting.
5. Write plain prose only. No titles.
6. The story must be grammatically correct and read naturally.

Here are a few example words from this learner's vocabulary (use similar-level words throughout):
${hintWords}
${prioritySection}
Return ONLY the story text. Nothing else.`
        : `Write a ${storySpec.description} in ${languageName} about the topic: ${topic}.

STRICT RULES:
1. The story must be EXACTLY ${storySpec.targetWords} words long (±5 words tolerance).
2. Use only the most basic, common words in ${languageName} (A1 level).
3. You may introduce AT MOST ${storySpec.maxNewWords} slightly less common words.
4. Do NOT use markdown, asterisks, bold, headers, or any formatting.
5. Write plain prose only. No titles.
6. The story must be grammatically correct and read naturally.
${prioritySection}
Return ONLY the story text. Nothing else.`;

    const titlePrompt = `Given this ${cefrLevel} level ${languageName} story about "${topic}", generate a short, evocative title (3-6 words, in ${languageName}). Return ONLY the title, nothing else.`;

    // 9. Generate story text (with retry on validation failure)
    let cleanedStory = "";
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;
      const raw = await generateText({
        contents:
          attempts === 1
            ? storyPrompt
            : storyPrompt +
              `\n\nPREVIOUS ATTEMPT FAILED: too many uncommon words. Be MUCH stricter — use only the most frequent, basic ${cefrLevel} vocabulary. Introduce AT MOST ${Math.max(1, storySpec.maxNewWords - 2)} words that go beyond everyday ${cefrLevel} vocabulary.`,
        systemInstruction: `You are a creative ${languageName} language writer crafting immersive stories for language learners. Write naturally and engagingly.`,
        temperature: attempts === 1 ? 0.8 : 0.5,
        timeoutMs: 45000,
      });

      if (!raw || raw.length < 20) {
        if (attempts >= maxAttempts) {
          return NextResponse.json(
            { error: "Failed to generate story text" },
            { status: 500 },
          );
        }
        continue;
      }

      cleanedStory = cleanGeneratedText(raw);

      // Validate 95% known-word rule
      const validation = validateKnownRatio(
        cleanedStory,
        knownSet,
        storySpec.maxNewWords,
      );

      if (validation.valid || knownCount === 0) {
        break; // passes validation or no known words to check against
      }

      // On final attempt, truncate story to enforce the ratio
      if (attempts >= maxAttempts && !validation.valid) {
        // Truncate: keep only sentences where cumulative unknown count <= maxNewWords
        const sentences = cleanedStory.match(/[^.!?]+[.!?]+/g) || [
          cleanedStory,
        ];
        let truncated = "";
        let unknownSoFar = 0;
        const seenUnknown = new Set<string>();

        for (const sentence of sentences) {
          const sentenceWords =
            sentence.match(
              /[a-zA-ZÀ-ÿäöüÄÖÜß]+(?:[-'][a-zA-ZÀ-ÿäöüÄÖÜß]+)*/g,
            ) || [];
          for (const w of sentenceWords) {
            if (
              !knownSet.has(w.toLowerCase()) &&
              !seenUnknown.has(w.toLowerCase())
            ) {
              seenUnknown.add(w.toLowerCase());
              unknownSoFar++;
            }
          }
          if (unknownSoFar > storySpec.maxNewWords) break;
          truncated += sentence;
        }

        if (truncated.trim().length > 20) {
          cleanedStory = truncated.trim();
        }
        break;
      }
    }

    // Generate title
    const title = await generateText({
      contents: `${titlePrompt}\n\nStory:\n${cleanedStory}`,
      temperature: 0.6,
      timeoutMs: 15000,
    });

    // 8. Identify new words (words in the story not in the known set)
    const storyWords =
      cleanedStory.match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) || [];
    const newWordsSet = new Set<string>();
    for (const w of storyWords) {
      const lower = w.toLowerCase();
      if (!knownSet.has(lower)) {
        newWordsSet.add(lower);
      }
    }

    // 9. Tokenize the cleaned text
    const contentTokens = tokenizeText(cleanedStory, knownSet, newWordsSet);
    const wordCount = contentTokens.filter((t) => !t.punctuation).length;

    // 10. Generate TTS audio via Gemini
    let audioUrl: string | null = null;
    try {
      const ai = getAI();
      const voiceName = VOICE_MAP[language] || "Aoede";

      // Hard-cap TTS at 20 s — httpOptions.timeout inside config is sometimes
      // ignored by the SDK transport layer, so we use Promise.race as the real guard.
      const TTS_TIMEOUT_MS = 20_000;
      const ttsResponse = await Promise.race([
        ai.models.generateContent({
          model: "gemini-2.5-flash-preview-tts",
          contents: [{ parts: [{ text: cleanedStory }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName },
              },
            },
            httpOptions: { timeout: TTS_TIMEOUT_MS },
          } as any,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`TTS timed out after ${TTS_TIMEOUT_MS}ms`)),
            TTS_TIMEOUT_MS,
          ),
        ),
      ]);

      const audioBase64 =
        ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

      if (audioBase64) {
        const pcm = Buffer.from(audioBase64, "base64");
        const wavBuffer = pcmToWav(pcm);

        // We need a temporary ID for the file name; use a UUID-like timestamp
        const tempId = crypto.randomUUID();
        const fileName = `${user.id}/${tempId}.wav`;

        const { error: uploadError } = await supabase.storage
          .from("reading-audio")
          .upload(fileName, wavBuffer, {
            contentType: "audio/wav",
            upsert: true,
          });

        if (!uploadError) {
          const {
            data: { publicUrl },
          } = supabase.storage.from("reading-audio").getPublicUrl(fileName);
          audioUrl = publicUrl;
        } else {
          console.error("Audio upload failed:", uploadError.message);
        }
      }
    } catch (ttsErr) {
      console.error("TTS generation failed, continuing without audio:", ttsErr);
    }

    // 11. Store in database
    const { data: insertedText, error: insertError } = await supabase
      .from("reading_texts")
      .insert({
        user_id: user.id,
        language,
        title: title || `${topic}`,
        content: cleanedStory,
        content_tokens: contentTokens,
        audio_url: audioUrl,
        cefr_level: cefrLevel,
        topic,
        word_count: wordCount,
        // Record vocab size so future cache lookups can narrow candidates
        known_word_count: Math.max(0, knownCount),
      })
      .select(
        "id, title, content, content_tokens, audio_url, cefr_level, topic, word_count",
      )
      .single();

    if (insertError || !insertedText) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save reading text" },
        { status: 500 },
      );
    }

    return NextResponse.json(insertedText);
  } catch (err) {
    console.error("Reading generation error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to generate reading",
      },
      { status: 500 },
    );
  }
}
