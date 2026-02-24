// ==========================================================================
// Supabase Edge Function: generate-duel-round
//
// Reference implementation for generating duel round questions.
// The primary generation path uses the Next.js API route at
// /api/duels/[duelId]/accept and submit-turn, which call the shared
// AI client generate-round.ts internally.
//
// This edge function can be called directly for background generation
// or as a fallback when the Next.js serverless function is unavailable.
//
// Deploy with: supabase functions deploy generate-duel-round
// ==========================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LANGUAGE_LABELS: Record<string, string> = {
  de: "German",
  fr: "French",
  it: "Italian",
};

const CATEGORIES = [
  "vocabulary",
  "cloze",
  "conjugation",
  "grammar",
  "listening",
  "translation",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { duelId, roundNumber, languageCode, difficulty } = await req.json();

    if (!duelId || !roundNumber || !languageCode || !difficulty) {
      return new Response(
        JSON.stringify({
          error:
            "duelId, roundNumber, languageCode, and difficulty are required",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const lang = LANGUAGE_LABELS[languageCode] || languageCode;

    // Build categories for this round (6 base + 1 rotating bonus)
    const categories = [
      ...CATEGORIES,
      CATEGORIES[(roundNumber - 1) % CATEGORIES.length],
    ];

    const prompt = `You are a language learning quiz generator. Generate exactly ${categories.length} quiz questions for a ${lang} language duel at ${difficulty} level.

Each question must be a JSON object with these fields:
- "index": number (0-based)
- "category": string (the category name)
- "prompt": string (the question text)
- "options": array of 4 strings OR null (null only for "translation" category)
- "correct_answer": string (must exactly match one of the options for MC, or be the expected answer)
- "explanation": string (brief explanation of the correct answer)
- "audio_text": string or null (only set for "listening" category)

Categories for this round: ${categories.join(", ")}

Return a JSON array of ${categories.length} question objects. Pure JSON only.`;

    // Call Gemini
    const apiKey = Deno.env.get("GOOGLE_API_KEY");
    if (!apiKey) {
      throw new Error("GOOGLE_API_KEY not configured");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.8,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const questions = JSON.parse(text);

    // Validate and fix indices
    const validated = questions.map(
      (q: Record<string, unknown>, i: number) => ({
        ...q,
        index: i,
        category: categories[i],
      }),
    );

    // Store in duel_rounds
    const { error } = await supabase.from("duel_rounds").insert({
      duel_id: duelId,
      round_number: roundNumber,
      questions: validated,
    });

    if (error) {
      throw new Error(`Failed to store round: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, questionCount: validated.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
