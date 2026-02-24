// ==========================================================================
// POST /api/duels/[duelId]/submit-turn — Submit answers for current round
// ==========================================================================

import { verifyAuth } from "@/lib/auth/verify-auth";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { generateDuelRound } from "@/lib/duel/generate-round";
import type { SubmitTurnRequest, DuelQuestion } from "@/types/duel";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ duelId: string }> },
) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;
  const { duelId } = await params;

  let body: SubmitTurnRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { round_id, answers } = body;

  if (!round_id || !answers) {
    return NextResponse.json(
      { error: "round_id and answers are required" },
      { status: 400 },
    );
  }

  // Fetch duel
  const { data: duel, error: duelError } = await supabase
    .from("duels")
    .select("*")
    .eq("id", duelId)
    .single();

  if (duelError || !duel) {
    return NextResponse.json({ error: "Duel not found" }, { status: 404 });
  }

  // Verify it's user's turn
  if (duel.current_turn !== user.id) {
    return NextResponse.json({ error: "It's not your turn" }, { status: 403 });
  }

  if (duel.status !== "active") {
    return NextResponse.json({ error: "Duel is not active" }, { status: 400 });
  }

  // Fetch the round
  const { data: round, error: roundError } = await supabase
    .from("duel_rounds")
    .select("*")
    .eq("id", round_id)
    .eq("duel_id", duelId)
    .single();

  if (roundError || !round) {
    return NextResponse.json({ error: "Round not found" }, { status: 404 });
  }

  const isChallenger = duel.challenger_id === user.id;

  // Check if user already submitted for this round
  if (isChallenger && round.challenger_completed_at) {
    return NextResponse.json(
      { error: "You already submitted answers for this round" },
      { status: 400 },
    );
  }
  if (!isChallenger && round.opponent_completed_at) {
    return NextResponse.json(
      { error: "You already submitted answers for this round" },
      { status: 400 },
    );
  }

  // Score the answers
  const questions: DuelQuestion[] = round.questions;
  const correct: boolean[] = [];
  let scoreThisRound = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const userAnswer = (answers[i] || "").trim().toLowerCase();
    const correctAnswer = q.correct_answer.trim().toLowerCase();

    // For translation questions, do a fuzzy match (exact for now, could be improved)
    const isCorrect = userAnswer === correctAnswer;
    correct.push(isCorrect);
    if (isCorrect) scoreThisRound++;
  }

  // Update the round with answers and score
  const roundUpdate: Record<string, unknown> = {};
  if (isChallenger) {
    roundUpdate.challenger_answers = answers;
    roundUpdate.challenger_score = scoreThisRound;
    roundUpdate.challenger_completed_at = new Date().toISOString();
  } else {
    roundUpdate.opponent_answers = answers;
    roundUpdate.opponent_score = scoreThisRound;
    roundUpdate.opponent_completed_at = new Date().toISOString();
  }

  const { error: roundUpdateError } = await supabase
    .from("duel_rounds")
    .update(roundUpdate)
    .eq("id", round_id);

  if (roundUpdateError) {
    return NextResponse.json(
      { error: roundUpdateError.message },
      { status: 500 },
    );
  }

  // Check if both players have completed this round
  const opponentCompleted = isChallenger
    ? round.opponent_completed_at
    : round.challenger_completed_at;

  let duelComplete = false;

  if (opponentCompleted) {
    // Both have played this round — update duel scores
    const opponentScoreThisRound = isChallenger
      ? round.opponent_score || 0
      : round.challenger_score || 0;

    const newChallengerScore =
      duel.challenger_score +
      (isChallenger ? scoreThisRound : opponentScoreThisRound);
    const newOpponentScore =
      duel.opponent_score +
      (!isChallenger ? scoreThisRound : opponentScoreThisRound);

    // Check if all rounds are complete
    if (duel.current_round >= duel.max_rounds) {
      // Duel is complete
      duelComplete = true;
      const winnerId =
        newChallengerScore > newOpponentScore
          ? duel.challenger_id
          : newOpponentScore > newChallengerScore
            ? duel.opponent_id
            : null; // tie

      await supabase
        .from("duels")
        .update({
          status: "completed",
          challenger_score: newChallengerScore,
          opponent_score: newOpponentScore,
          current_turn: null,
          winner_id: winnerId,
        })
        .eq("id", duelId);

      // Update stats for both players
      await updateDuelStats(
        supabase,
        duel.challenger_id,
        newChallengerScore > newOpponentScore,
        isChallenger ? scoreThisRound : round.challenger_score || 0,
        7,
      );
      await updateDuelStats(
        supabase,
        duel.opponent_id,
        newOpponentScore > newChallengerScore,
        !isChallenger ? scoreThisRound : round.opponent_score || 0,
        7,
      );

      // --- Goal tracking: log quiz_won for the winner ---
      if (winnerId) {
        try {
          const goalService = createServiceClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
          );
          await goalService.rpc("process_goal_event", {
            p_user_id: winnerId,
            p_event_type: "quiz_won",
            p_value: 1,
            p_metadata: { duel_id: duelId },
          });
        } catch (goalErr) {
          // Non-critical — don't fail the request
          console.warn("[submit-turn] Goal tracking failed:", goalErr);
        }
      }
    } else {
      // Advance to next round
      const nextRound = duel.current_round + 1;
      const nextTurn = duel.challenger_id; // Challenger always goes first in a new round

      await supabase
        .from("duels")
        .update({
          current_round: nextRound,
          challenger_score: newChallengerScore,
          opponent_score: newOpponentScore,
          current_turn: nextTurn,
        })
        .eq("id", duelId);

      // Generate questions for the next round
      try {
        await generateDuelRound({
          supabase,
          duelId,
          roundNumber: nextRound,
          languageCode: duel.language_code,
          difficulty: duel.difficulty,
        });
      } catch (err) {
        console.error("Failed to generate next round:", err);
      }
    }
  } else {
    // Flip the turn to the other player
    const nextTurn = isChallenger ? duel.opponent_id : duel.challenger_id;

    await supabase
      .from("duels")
      .update({ current_turn: nextTurn })
      .eq("id", duelId);
  }

  return NextResponse.json({
    correct,
    score_this_round: scoreThisRound,
    duel_complete: duelComplete,
  });
}

// ─── Helper: Update duel stats ───────────────────────────────────────────────

async function updateDuelStats(
  supabase: Awaited<
    ReturnType<typeof import("@/lib/supabase/server").createClient>
  >,
  userId: string,
  won: boolean,
  correctThisRound: number,
  questionsThisRound: number,
) {
  // Try to fetch existing stats
  const { data: existing } = await supabase
    .from("duel_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existing) {
    await supabase
      .from("duel_stats")
      .update({
        duels_played: existing.duels_played + 1,
        duels_won: existing.duels_won + (won ? 1 : 0),
        total_correct: existing.total_correct + correctThisRound,
        total_questions: existing.total_questions + questionsThisRound,
        current_streak: won ? existing.current_streak + 1 : 0,
        best_streak: won
          ? Math.max(existing.best_streak, existing.current_streak + 1)
          : existing.best_streak,
      })
      .eq("user_id", userId);
  } else {
    await supabase.from("duel_stats").insert({
      user_id: userId,
      duels_played: 1,
      duels_won: won ? 1 : 0,
      total_correct: correctThisRound,
      total_questions: questionsThisRound,
      current_streak: won ? 1 : 0,
      best_streak: won ? 1 : 0,
    });
  }
}
