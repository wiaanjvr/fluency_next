// ==========================================================================
// Supabase Edge Function: generate-reading-text
//
// This is a reference implementation. The primary generation path uses
// the Next.js API route at /api/reading/generate, which has access to
// the project's shared AI client and Supabase server libraries.
//
// Deploy with: supabase functions deploy generate-reading-text
// ==========================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { userId, language, cefrLevel, topic } = await req.json();

    if (!userId || !language || !cefrLevel) {
      return new Response(
        JSON.stringify({
          error: "userId, language, and cefrLevel are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 1. Fetch user's known words
    const { data: knownWordsData } = await supabase
      .from("learner_words_v2")
      .select("word, lemma")
      .eq("user_id", userId)
      .eq("language", language);

    const knownSet = new Set<string>();
    const knownList: string[] = [];
    for (const row of knownWordsData || []) {
      const w = (row.lemma || row.word).toLowerCase();
      if (!knownSet.has(w)) {
        knownSet.add(w);
        knownList.push(w);
      }
    }

    // 2. Call Gemini to generate text
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not configured");
    }

    const selectedTopic = topic || "daily life";
    const knownSample =
      knownList.length > 200
        ? knownList.sort(() => Math.random() - 0.5).slice(0, 200)
        : knownList;

    const prompt = `Write a ${cefrLevel} level story in ${language} about ${selectedTopic}.
The story should be exactly 250-350 words.
${knownSample.length > 0 ? `Use only these vocabulary words where possible: [${knownSample.join(", ")}]` : "Use simple, common vocabulary appropriate for the level."}
You may introduce up to 15 new words that would be appropriate for this level.
The story must be a coherent, interesting narrative — not a list of sentences.
Return ONLY the story text, no title, no explanation.`;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.8 },
        }),
      },
    );

    const geminiData = await geminiResponse.json();
    const storyText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

    if (!storyText || storyText.length < 50) {
      throw new Error("Failed to generate story text");
    }

    // 3. Tokenize
    const rawTokens =
      storyText.match(
        /[\p{L}\p{N}]+(?:['-][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]+/gu,
      ) || [];

    const PUNCTUATION_REGEX = /^[.,!?;:""''"\-–—…()[\]{}/\\<>«»„"‹›]+$/;
    const storyWords = storyText.match(/[\p{L}\p{N}]+/gu) || [];
    const newWordsSet = new Set<string>();
    for (const w of storyWords) {
      if (!knownSet.has(w.toLowerCase())) {
        newWordsSet.add(w.toLowerCase());
      }
    }

    const contentTokens = rawTokens.map((word: string, index: number) => {
      const punct = PUNCTUATION_REGEX.test(word.trim());
      const lower = word.toLowerCase();
      return {
        word,
        index,
        is_known: punct ? true : knownSet.has(lower),
        is_new: punct ? false : newWordsSet.has(lower),
        punctuation: punct || undefined,
      };
    });

    const wordCount = contentTokens.filter(
      (t: { punctuation?: boolean }) => !t.punctuation,
    ).length;

    // 4. Store (audio generation is handled by the Next.js API route)
    const { data: insertedText, error: insertError } = await supabase
      .from("reading_texts")
      .insert({
        user_id: userId,
        language,
        title: selectedTopic,
        content: storyText,
        content_tokens: contentTokens,
        audio_url: null,
        cefr_level: cefrLevel,
        topic: selectedTopic,
        word_count: wordCount,
      })
      .select(
        "id, title, content, content_tokens, audio_url, cefr_level, topic, word_count",
      )
      .single();

    if (insertError) {
      throw new Error(`Database insert failed: ${insertError.message}`);
    }

    return new Response(JSON.stringify(insertedText), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
