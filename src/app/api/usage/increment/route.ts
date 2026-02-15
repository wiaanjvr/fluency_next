import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { incrementSessionCount, SessionType } from "@/lib/usage-limits";

/**
 * POST /api/usage/increment - Increment session count after completion
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

    const result = await incrementSessionCount(user.id, sessionType);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error incrementing usage:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
