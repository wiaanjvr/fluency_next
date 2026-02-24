// ==========================================================================
// GET  /api/duels           — list user's active/pending/completed duels
// POST /api/duels           — create a new duel (send challenge)
// ==========================================================================

import { verifyAuth } from "@/lib/auth/verify-auth";
import { NextRequest, NextResponse } from "next/server";
import type { CreateDuelRequest, DuelWithProfiles } from "@/types/duel";

// ─── GET: List user's duels ──────────────────────────────────────────────────

export async function GET() {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  // Auto-link any pending email invites sent to this user's address.
  // When the invitee signs up/logs in, the next fetch promotes the row.
  if (user.email) {
    await supabase
      .from("duels")
      .update({ opponent_id: user.id, opponent_email: null })
      .is("opponent_id", null)
      .ilike("opponent_email", user.email);
  }

  // Fetch all duels where user is participant
  const { data: duels, error } = await supabase
    .from("duels")
    .select("*")
    .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Collect unique opponent IDs to batch-fetch profiles
  const profileIds = new Set<string>();
  for (const d of duels || []) {
    profileIds.add(d.challenger_id);
    profileIds.add(d.opponent_id);
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", Array.from(profileIds));

  const profileMap = new Map(
    (profiles || []).map((p) => [
      p.id,
      { id: p.id, display_name: p.full_name, avatar_url: p.avatar_url },
    ]),
  );

  // Attach profiles to duels. For email-only invites, opponent_id is null
  // so opponent_profile will be undefined — the UI falls back to opponent_email.
  const enriched: DuelWithProfiles[] = (duels || []).map((d) => ({
    ...d,
    challenger_profile: profileMap.get(d.challenger_id),
    opponent_profile: d.opponent_id ? profileMap.get(d.opponent_id) : undefined,
  }));

  return NextResponse.json({ duels: enriched });
}

// ─── POST: Create a new duel ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  let body: CreateDuelRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { opponent_id, opponent_email, language_code, difficulty } = body;

  // Must supply exactly one of opponent_id or opponent_email
  if (!opponent_id && !opponent_email) {
    return NextResponse.json(
      { error: "opponent_id or opponent_email is required" },
      { status: 400 },
    );
  }

  // Validation
  if (!language_code || !difficulty) {
    return NextResponse.json(
      { error: "language_code and difficulty are required" },
      { status: 400 },
    );
  }

  if (!["de", "fr", "it"].includes(language_code)) {
    return NextResponse.json(
      { error: "language_code must be de, fr, or it" },
      { status: 400 },
    );
  }

  if (!["A1", "A2", "B1", "B2"].includes(difficulty)) {
    return NextResponse.json(
      { error: "difficulty must be A1, A2, B1, or B2" },
      { status: 400 },
    );
  }

  // ── Resolve the opponent ─────────────────────────────────────────────────

  let resolvedOpponentId: string | null = opponent_id ?? null;
  let resolvedOpponentEmail: string | null = null;

  if (!opponent_id && opponent_email) {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(opponent_email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    const normalised = opponent_email.toLowerCase().trim();

    // Is there already a registered user with this email?
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", normalised)
      .single();

    if (existingProfile) {
      // Treat as a normal opponent_id invite
      resolvedOpponentId = existingProfile.id;
    } else {
      // Unregistered — store the email, leave opponent_id null
      resolvedOpponentEmail = normalised;
    }
  }

  if (resolvedOpponentId && resolvedOpponentId === user.id) {
    return NextResponse.json(
      { error: "You cannot challenge yourself" },
      { status: 400 },
    );
  }

  // If we have an opponent_id, verify the profile exists
  if (resolvedOpponentId) {
    const { data: opponentProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", resolvedOpponentId)
      .single();

    if (!opponentProfile) {
      return NextResponse.json(
        { error: "Opponent not found" },
        { status: 404 },
      );
    }
  }

  // Create the duel
  const { data: duel, error } = await supabase
    .from("duels")
    .insert({
      challenger_id: user.id,
      opponent_id: resolvedOpponentId,
      opponent_email: resolvedOpponentEmail,
      language_code,
      difficulty,
      status: "pending",
      current_turn: null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ duel }, { status: 201 });
}
