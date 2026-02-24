// ==========================================================================
// POST /api/duels/[duelId]/accept — Accept a duel challenge
// ==========================================================================

import { verifyAuth } from "@/lib/auth/verify-auth";
import { NextRequest, NextResponse } from "next/server";
import { generateDuelRound } from "@/lib/duel/generate-round";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ duelId: string }> },
) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;
  const { duelId } = await params;

  // Fetch duel
  const { data: duel, error: duelError } = await supabase
    .from("duels")
    .select("*")
    .eq("id", duelId)
    .single();

  if (duelError || !duel) {
    return NextResponse.json({ error: "Duel not found" }, { status: 404 });
  }

  // Only the opponent can accept
  if (duel.opponent_id !== user.id) {
    return NextResponse.json(
      { error: "Only the challenged player can accept" },
      { status: 403 },
    );
  }

  if (duel.status !== "pending") {
    return NextResponse.json(
      { error: "Duel is not in pending state" },
      { status: 400 },
    );
  }

  // Update duel to active, set turn to challenger (they go first)
  const { error: updateError } = await supabase
    .from("duels")
    .update({
      status: "active",
      current_turn: duel.challenger_id,
      current_round: 1,
    })
    .eq("id", duelId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Generate the first round of questions
  try {
    await generateDuelRound({
      supabase,
      duelId,
      roundNumber: 1,
      languageCode: duel.language_code,
      difficulty: duel.difficulty,
    });
  } catch (err) {
    console.error("Failed to generate round:", err);
    return NextResponse.json(
      { error: "Failed to generate questions for round 1" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, status: "active" });
}
