/**
 * POST /api/review
 *
 * Applies an SM-2 review to a single user_vocab row.
 *
 * Request body: { user_vocab_id: string, rating: 0 | 1 | 2 }
 *
 * Returns the updated user_vocab row.
 */

import { verifyAuth } from "@/lib/auth/verify-auth";
import {
  applyReview,
  isValidRating,
  type ReviewRating,
  type SrsState,
} from "@/lib/srs";
import { getUserVocabById, updateUserVocab } from "@/lib/vocab";
import { NextRequest, NextResponse } from "next/server";

interface ReviewRequestBody {
  user_vocab_id: string;
  rating: ReviewRating;
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth ────────────────────────────────────────────────────────────
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    const { user, supabase } = auth;

    // ── Validate body ───────────────────────────────────────────────────
    const body: unknown = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      !("user_vocab_id" in body) ||
      !("rating" in body)
    ) {
      return NextResponse.json(
        { error: "Missing required fields: user_vocab_id, rating" },
        { status: 400 },
      );
    }

    const { user_vocab_id, rating } = body as ReviewRequestBody;

    if (typeof user_vocab_id !== "string" || user_vocab_id.trim() === "") {
      return NextResponse.json(
        { error: "user_vocab_id must be a non-empty string" },
        { status: 400 },
      );
    }

    if (!isValidRating(rating)) {
      return NextResponse.json(
        { error: "rating must be 0 (forgot), 1 (hard), or 2 (easy)" },
        { status: 400 },
      );
    }

    // ── Fetch existing row ──────────────────────────────────────────────
    const existing = await getUserVocabById(supabase, user_vocab_id);

    if (!existing) {
      return NextResponse.json(
        { error: "user_vocab row not found" },
        { status: 404 },
      );
    }

    // RLS already enforces ownership, but double-check for safety
    if (existing.user_id !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to update this word" },
        { status: 403 },
      );
    }

    // ── Apply SM-2 ─────────────────────────────────────────────────────
    const currentState: SrsState = {
      status: existing.status,
      ease_factor: existing.ease_factor,
      interval_days: existing.interval_days,
      repetitions: existing.repetitions,
      next_review_at: new Date(existing.next_review_at),
    };

    const update = applyReview(currentState, rating);

    // ── Persist ─────────────────────────────────────────────────────────
    const updated = await updateUserVocab(supabase, user_vocab_id, update);

    return NextResponse.json({
      user_vocab: updated,
      applied: {
        rating,
        new_status: update.status,
        new_interval_days: update.interval_days,
        new_ease_factor: Math.round(update.ease_factor * 100) / 100,
        next_review_at: update.next_review_at.toISOString(),
      },
    });
  } catch (error) {
    console.error("[POST /api/review]", error);

    const message =
      error instanceof Error ? error.message : "Internal server error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
