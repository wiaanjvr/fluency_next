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

    // 4. Calculate story length based on 95% known-word rule
    const knownCount = knownSet.size;
    const storySpec = calculateStoryLength(knownCount);
    const languageName = LANGUAGE_NAMES[language] || language;

    // 5. Build the known word sample for the prompt
    const knownSample =
      knownList.length > 200
        ? knownList.sort(() => Math.random() - 0.5).slice(0, 200)
        : knownList;
    const knownWordList = knownSample.join(", ");

    // 6. Generate reading text via Gemini with strict 95% rule
    const storyPrompt =
      knownCount > 0
        ? `Write a ${storySpec.description} in ${languageName} about the topic: ${topic}.

STRICT RULES — violating these makes the story unusable:
1. The story must be EXACTLY ${storySpec.targetWords} words long (±5 words tolerance).
2. You may introduce AT MOST ${storySpec.maxNewWords} words that are not in the known words list below.
3. Every other word MUST come from the known words list below.
4. Do NOT use markdown, asterisks, bold, headers, or any formatting.
5. Write plain prose only. No titles.
6. The story must be grammatically correct and read naturally.

Known words the learner already knows (use ONLY these, plus your ${storySpec.maxNewWords} new words):
${knownWordList}

Return ONLY the story text. Nothing else.`
        : `Write a ${storySpec.description} in ${languageName} about the topic: ${topic}.

STRICT RULES:
1. The story must be EXACTLY ${storySpec.targetWords} words long (±5 words tolerance).
2. Use only the most basic, common words in ${languageName}.
3. You may introduce AT MOST ${storySpec.maxNewWords} slightly less common words.
4. Do NOT use markdown, asterisks, bold, headers, or any formatting.
5. Write plain prose only. No titles.
6. The story must be grammatically correct and read naturally.

Return ONLY the story text. Nothing else.`;

    const titlePrompt = `Given this ${cefrLevel} level ${languageName} story about "${topic}", generate a short, evocative title (3-6 words, in ${languageName}). Return ONLY the title, nothing else.`;

    // Generate story text (with retry on validation failure)
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
              `\n\nPREVIOUS ATTEMPT FAILED: too many unknown words. Be MUCH stricter — use ONLY words from the known list plus at most ${Math.max(1, storySpec.maxNewWords - 2)} new words.`,
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

    // 7. Identify new words (words in the story not in the known set)
    const storyWords =
      cleanedStory.match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) || [];
    const newWordsSet = new Set<string>();
    for (const w of storyWords) {
      const lower = w.toLowerCase();
      if (!knownSet.has(lower)) {
        newWordsSet.add(lower);
      }
    }

    // 8. Tokenize the cleaned text
    const contentTokens = tokenizeText(cleanedStory, knownSet, newWordsSet);
    const wordCount = contentTokens.filter((t) => !t.punctuation).length;

    // 9. Generate TTS audio via Gemini
    let audioUrl: string | null = null;
    try {
      const ai = getAI();
      const voiceName = VOICE_MAP[language] || "Aoede";

      const ttsResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: [{ parts: [{ text: cleanedStory }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
          httpOptions: { timeout: 60000 },
        } as any,
      });

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

    // 10. Store in database
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
