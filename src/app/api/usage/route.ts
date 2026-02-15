import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import {
  canStartSession,
  getTodayUsage,
  getRemainingSessionsByType,
  SessionType,
} from "@/lib/usage-limits";

/**
 * GET /api/usage - Get user's current daily usage and limits
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get usage stats
    const remaining = await getRemainingSessionsByType(user.id);
    const usage = await getTodayUsage(user.id);

    return NextResponse.json({
      usage: usage || {
        foundation_sessions: 0,
        sentence_sessions: 0,
        microstory_sessions: 0,
        main_lessons: 0,
      },
      remaining,
    });
  } catch (error) {
    console.error("Error fetching usage:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/usage/check - Check if user can start a specific session type
 * Body: { sessionType: 'foundation' | 'sentence' | 'microstory' | 'main' }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionType } = await request.json();

    if (!sessionType) {
      return NextResponse.json(
        { error: "sessionType is required" },
        { status: 400 },
      );
    }

    const validTypes: SessionType[] = [
      "foundation",
      "sentence",
      "microstory",
      "main",
    ];
    if (!validTypes.includes(sessionType)) {
      return NextResponse.json(
        { error: "Invalid session type" },
        { status: 400 },
      );
    }

    const status = await canStartSession(user.id, sessionType);

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error checking usage:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
