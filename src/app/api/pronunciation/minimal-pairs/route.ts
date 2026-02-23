import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";

// GET /api/pronunciation/minimal-pairs?language=de
export async function GET(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;

  const { user, supabase } = auth;
  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language") || "de";

  // Fetch user's weak phonemes to prioritize
  const { data: progress } = await supabase
    .from("user_pronunciation_progress")
    .select("phoneme_id, familiarity_score")
    .eq("user_id", user.id)
    .eq("language", language)
    .order("familiarity_score", { ascending: true });

  const weakPhonemeIds = new Set(
    (progress || [])
      .filter((p) => p.familiarity_score < 0.6)
      .map((p) => p.phoneme_id),
  );

  // Fetch all minimal pairs with phoneme data
  const { data: pairs, error } = await supabase
    .from("minimal_pairs")
    .select(
      `*, phoneme_a:phonemes!minimal_pairs_phoneme_a_id_fkey(*), phoneme_b:phonemes!minimal_pairs_phoneme_b_id_fkey(*)`,
    )
    .eq("language", language)
    .order("difficulty_rank", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch minimal pairs", details: error.message },
      { status: 500 },
    );
  }

  // Sort: weak phoneme pairs first
  const sorted = (pairs || []).sort((a, b) => {
    const aWeak =
      weakPhonemeIds.has(a.phoneme_a_id) || weakPhonemeIds.has(a.phoneme_b_id)
        ? 0
        : 1;
    const bWeak =
      weakPhonemeIds.has(b.phoneme_a_id) || weakPhonemeIds.has(b.phoneme_b_id)
        ? 0
        : 1;
    if (aWeak !== bWeak) return aWeak - bWeak;
    return a.difficulty_rank - b.difficulty_rank;
  });

  return NextResponse.json({ pairs: sorted });
}

// POST /api/pronunciation/minimal-pairs — submit result
export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;

  const { user, supabase } = auth;

  let body: { pair_id: string; was_correct: boolean; phoneme_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { pair_id, was_correct, phoneme_id } = body;

  if (!pair_id || !phoneme_id) {
    return NextResponse.json(
      { error: "pair_id and phoneme_id are required" },
      { status: 400 },
    );
  }

  // Fetch the pair to get related phonemes
  const { data: pair } = await supabase
    .from("minimal_pairs")
    .select("phoneme_a_id, phoneme_b_id, language")
    .eq("id", pair_id)
    .single();

  if (!pair) {
    return NextResponse.json({ error: "Pair not found" }, { status: 404 });
  }

  // Update progress for both phonemes in the pair
  const phonemeIds = [pair.phoneme_a_id, pair.phoneme_b_id];

  for (const pid of phonemeIds) {
    // Fetch existing progress
    const { data: existing } = await supabase
      .from("user_pronunciation_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("language", pair.language)
      .eq("phoneme_id", pid)
      .single();

    if (existing) {
      const oldAccuracy = existing.minimal_pair_accuracy || 0;
      const oldCount = existing.times_practiced || 0;
      const newAccuracy =
        (oldAccuracy * oldCount + (was_correct ? 1 : 0)) / (oldCount + 1);

      await supabase
        .from("user_pronunciation_progress")
        .update({
          minimal_pair_accuracy: Math.round(newAccuracy * 100) / 100,
          times_practiced: oldCount + 1,
          last_practiced_at: new Date().toISOString(),
          familiarity_score: Math.min(
            1,
            (existing.familiarity_score || 0) + (was_correct ? 0.05 : -0.02),
          ),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("user_pronunciation_progress").insert({
        user_id: user.id,
        language: pair.language,
        phoneme_id: pid,
        minimal_pair_accuracy: was_correct ? 1 : 0,
        times_practiced: 1,
        last_practiced_at: new Date().toISOString(),
        familiarity_score: was_correct ? 0.1 : 0,
      });
    }
  }

  return NextResponse.json({ success: true });
}
