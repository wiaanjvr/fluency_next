// ==========================================================================
// GET /api/duels/[duelId] — full duel state with rounds
// ==========================================================================

import { verifyAuth } from "@/lib/auth/verify-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ duelId: string }> },
) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;
  const { duelId } = await params;

  // Fetch the duel
  const { data: duel, error: duelError } = await supabase
    .from("duels")
    .select("*")
    .eq("id", duelId)
    .single();

  if (duelError || !duel) {
    return NextResponse.json({ error: "Duel not found" }, { status: 404 });
  }

  // Verify the user is a participant
  if (duel.challenger_id !== user.id && duel.opponent_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Fetch profiles
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", [duel.challenger_id, duel.opponent_id]);

  const profileMap = new Map(
    (profiles || []).map((p) => [
      p.id,
      { id: p.id, display_name: p.full_name, avatar_url: p.avatar_url },
    ]),
  );

  // Fetch all rounds for this duel
  const { data: rounds } = await supabase
    .from("duel_rounds")
    .select("*")
    .eq("duel_id", duelId)
    .order("round_number", { ascending: true });

  // Determine user role
  const isChallenger = duel.challenger_id === user.id;

  // For each round, mask the opponent's answers if they haven't completed their turn yet
  const sanitizedRounds = (rounds || []).map((round) => {
    const myCompleted = isChallenger
      ? round.challenger_completed_at
      : round.opponent_completed_at;
    const opponentCompleted = isChallenger
      ? round.opponent_completed_at
      : round.challenger_completed_at;

    // Only show questions if it's currently the user's turn or both have played
    const bothCompleted = !!myCompleted && !!opponentCompleted;

    return {
      ...round,
      // Hide opponent answers until both have completed the round
      challenger_answers:
        isChallenger || bothCompleted ? round.challenger_answers : null,
      opponent_answers:
        !isChallenger || bothCompleted ? round.opponent_answers : null,
      // Only show questions if user hasn't played yet (their turn) or round is complete
      questions:
        !myCompleted || bothCompleted ? round.questions : round.questions,
    };
  });

  return NextResponse.json({
    duel: {
      ...duel,
      challenger_profile: profileMap.get(duel.challenger_id),
      opponent_profile: profileMap.get(duel.opponent_id),
    },
    rounds: sanitizedRounds,
    isChallenger,
  });
}
