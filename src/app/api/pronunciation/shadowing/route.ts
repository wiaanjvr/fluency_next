import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";
import { generateJSON } from "@/lib/ai-client";
import type { ShadowingAnalysis } from "@/types/pronunciation";

// GET /api/pronunciation/shadowing?language=de&level=A1
export async function GET(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;

  const { supabase } = auth;
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language") || "de";
  const level = searchParams.get("level") || "A1";

  const { data: phrases, error } = await supabase
    .from("shadowing_phrases")
    .select("*")
    .eq("language", language)
    .eq("cefr_level", level)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch phrases", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ phrases: phrases || [] });
}

// POST /api/pronunciation/shadowing — analyze user recording
export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;

  const { user, supabase } = auth;

  let body: {
    phrase_id: string;
    user_transcript: string;
    language: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { phrase_id, user_transcript, language } = body;

  if (!phrase_id || !user_transcript) {
    return NextResponse.json(
      { error: "phrase_id and user_transcript are required" },
      { status: 400 },
    );
  }

  // Fetch the target phrase
  const { data: phrase } = await supabase
    .from("shadowing_phrases")
    .select("*")
    .eq("id", phrase_id)
    .single();

  if (!phrase) {
    return NextResponse.json({ error: "Phrase not found" }, { status: 404 });
  }

  // Use Gemini to analyze phonetic comparison
  try {
    const analysis = await generateJSON<ShadowingAnalysis>({
      model: "gemini-2.5-flash",
      contents: `You are a phonetics expert analyzing pronunciation.

Target phrase: "${phrase.text}"
Target IPA: "${phrase.ipa_transcription || ""}"
Language: ${language}
User's spoken transcript (from speech recognition): "${user_transcript}"

Compare the user's pronunciation against the target. Analyze phoneme-level differences.

Return a JSON object with this exact structure:
{
  "overall_score": <number 0-100>,
  "phoneme_feedback": [
    {
      "target": "<target phoneme in IPA>",
      "produced": "<what user likely produced>",
      "word": "<the word where this occurred>",
      "advice": "<brief, practical correction tip>"
    }
  ],
  "general_tip": "<one encouraging, specific improvement tip>"
}

If the transcripts are very similar, give a high score and minimal feedback.
If speech recognition gave an empty or very different result, assume moderate pronunciation and give constructive feedback.
Always be encouraging. Limit phoneme_feedback to the 3 most important corrections.`,
      systemInstruction:
        "You are a kind but precise pronunciation coach. Always respond with valid JSON only.",
      temperature: 0.3,
      timeoutMs: 15000,
    });

    // Update user progress for the focus phoneme if applicable
    if (phrase.focus_phoneme_id) {
      const { data: existing } = await supabase
        .from("user_pronunciation_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("language", language)
        .eq("phoneme_id", phrase.focus_phoneme_id)
        .single();

      const newScore = {
        phrase_id,
        score: analysis.overall_score,
        recorded_at: new Date().toISOString(),
      };

      if (existing) {
        const scores = [...(existing.shadowing_scores || []), newScore].slice(
          -10,
        );
        await supabase
          .from("user_pronunciation_progress")
          .update({
            shadowing_scores: scores,
            times_practiced: (existing.times_practiced || 0) + 1,
            last_practiced_at: new Date().toISOString(),
            familiarity_score: Math.min(
              1,
              (existing.familiarity_score || 0) +
                (analysis.overall_score >= 70 ? 0.05 : 0),
            ),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("user_pronunciation_progress").insert({
          user_id: user.id,
          language,
          phoneme_id: phrase.focus_phoneme_id,
          shadowing_scores: [newScore],
          times_practiced: 1,
          last_practiced_at: new Date().toISOString(),
          familiarity_score: analysis.overall_score >= 70 ? 0.1 : 0,
        });
      }
    }

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error("Shadowing analysis failed:", err);
    // Return a graceful fallback
    return NextResponse.json({
      analysis: {
        overall_score: 50,
        phoneme_feedback: [],
        general_tip:
          "Keep practicing! Try to match the rhythm and sounds of the native speaker.",
      },
    });
  }
}
