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

    // 4. Generate reading text via Gemini
    const knownSample =
      knownList.length > 200
        ? knownList.sort(() => Math.random() - 0.5).slice(0, 200)
        : knownList;

    const storyPrompt = `Write a ${cefrLevel} level story in ${language} about ${topic}.
The story should be exactly 250-350 words.
${knownSample.length > 0 ? `Use only these vocabulary words where possible: [${knownSample.join(", ")}]` : "Use simple, common vocabulary appropriate for the level."}
You may introduce up to 15 new words that would be appropriate for this level.
The story must be a coherent, interesting narrative — not a list of sentences.
Return ONLY the story text, no title, no explanation.`;

    const titlePrompt = `Given this ${cefrLevel} level ${language} story about "${topic}", generate a short, evocative title (3-6 words, in ${language}). Return ONLY the title, nothing else.`;

    // Generate story text
    const storyText = await generateText({
      contents: storyPrompt,
      systemInstruction: `You are a creative ${language} language writer crafting immersive stories for language learners. Write naturally and engagingly.`,
      temperature: 0.8,
      timeoutMs: 45000,
    });

    if (!storyText || storyText.length < 50) {
      return NextResponse.json(
        { error: "Failed to generate story text" },
        { status: 500 },
      );
    }

    // Clean markdown artefacts from AI output
    const cleanedStory = cleanGeneratedText(storyText);

    // Generate title
    const title = await generateText({
      contents: `${titlePrompt}\n\nStory:\n${storyText}`,
      temperature: 0.6,
      timeoutMs: 15000,
    });

    // 5. Identify new words (words in the story not in the known set)
    const storyWords =
      cleanedStory.match(/[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*/gu) || [];
    const newWordsSet = new Set<string>();
    for (const w of storyWords) {
      const lower = w.toLowerCase();
      if (!knownSet.has(lower)) {
        newWordsSet.add(lower);
      }
    }

    // 6. Tokenize the cleaned text
    const contentTokens = tokenizeText(cleanedStory, knownSet, newWordsSet);
    const wordCount = contentTokens.filter((t) => !t.punctuation).length;

    // 7. Generate TTS audio via Gemini
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

    // 8. Store in database
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
