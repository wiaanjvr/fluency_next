// ==========================================================================
// POST /api/conjugation/sessions — Save completed drill session
// ==========================================================================

import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;
    const { user, supabase } = auth;

    const body = await request.json();
    const {
      language,
      config,
      total_questions,
      correct_answers,
      accuracy,
      time_taken_seconds,
      xp_earned,
      answers,
    } = body;

    if (!language || !config || total_questions === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 1. Insert session record
    const { data: session, error: sessionError } = await supabase
      .from("conjugation_sessions")
      .insert({
        user_id: user.id,
        language,
        config,
        total_questions,
        correct_answers,
        accuracy,
        time_taken_seconds,
        xp_earned,
      })
      .select("id")
      .single();

    if (sessionError) {
      return NextResponse.json(
        { error: sessionError.message },
        { status: 500 },
      );
    }

    // 2. Upsert conjugation_progress for each answered question
    if (Array.isArray(answers)) {
      // Group answers by verb_id + tense + pronoun_key
      const grouped = new Map<
        string,
        {
          verb_id: string;
          tense: string;
          pronoun_key: string;
          correct: number;
          total: number;
        }
      >();

      for (const answer of answers) {
        if (!answer.verb_id || !answer.tense || !answer.pronoun_key) continue;
        const key = `${answer.verb_id}|${answer.tense}|${answer.pronoun_key}`;
        const existing = grouped.get(key) ?? {
          verb_id: answer.verb_id,
          tense: answer.tense,
          pronoun_key: answer.pronoun_key,
          correct: 0,
          total: 0,
        };
        existing.total++;
        if (answer.is_correct) existing.correct++;
        grouped.set(key, existing);
      }

      // Upsert each progress record
      for (const [, stats] of grouped) {
        // First try to fetch existing progress
        const { data: existing } = await supabase
          .from("conjugation_progress")
          .select("*")
          .eq("user_id", user.id)
          .eq("verb_id", stats.verb_id)
          .eq("tense", stats.tense)
          .eq("pronoun_key", stats.pronoun_key)
          .single();

        const newCorrectCount = (existing?.correct_count ?? 0) + stats.correct;
        const newAttemptCount = (existing?.attempt_count ?? 0) + stats.total;
        const newProductionScore =
          newAttemptCount > 0
            ? Math.min(1.0, newCorrectCount / newAttemptCount)
            : 0;

        // Calculate streak
        let newStreak = existing?.streak ?? 0;
        if (stats.correct === stats.total) {
          // All correct in this session for this combo
          newStreak++;
        } else {
          newStreak = 0;
        }

        const { error: upsertError } = await supabase
          .from("conjugation_progress")
          .upsert(
            {
              user_id: user.id,
              verb_id: stats.verb_id,
              tense: stats.tense,
              pronoun_key: stats.pronoun_key,
              correct_count: newCorrectCount,
              attempt_count: newAttemptCount,
              production_score: Math.round(newProductionScore * 1000) / 1000,
              streak: newStreak,
              last_attempted_at: new Date().toISOString(),
            },
            {
              onConflict: "user_id,verb_id,tense,pronoun_key",
            },
          );

        if (upsertError) {
          console.error("Progress upsert error:", upsertError);
        }
      }
    }

    // 3. Award XP to user profile
    if (xp_earned > 0) {
      const { error: xpError } = await supabase.rpc("increment_xp", {
        p_user_id: user.id,
        p_amount: xp_earned,
      });

      // If the RPC doesn't exist, just log and continue — XP will be missing
      if (xpError) {
        console.warn(
          "[conjugation/sessions] Could not award XP:",
          xpError.message,
        );
      }
    }

    return NextResponse.json({
      sessionId: session?.id,
      xpEarned: xp_earned,
      levelUp: false, // TODO: implement level-up detection
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
