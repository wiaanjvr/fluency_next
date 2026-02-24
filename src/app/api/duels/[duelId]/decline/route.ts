// ==========================================================================
// POST /api/duels/[duelId]/decline — Decline a duel challenge
// ==========================================================================

import { verifyAuth } from "@/lib/auth/verify-auth";
import { NextRequest, NextResponse } from "next/server";

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

  // Only the opponent can decline
  if (duel.opponent_id !== user.id) {
    return NextResponse.json(
      { error: "Only the challenged player can decline" },
      { status: 403 },
    );
  }

  if (duel.status !== "pending") {
    return NextResponse.json(
      { error: "Duel is not in pending state" },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase
    .from("duels")
    .update({ status: "declined" })
    .eq("id", duelId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, status: "declined" });
}
