/**
 * POST /api/ml/story/update-preferences
 *
 * Called after each story session to update the user's thematic preferences
 * based on engagement (time-on-segment).
 *
 * Request body:
 * {
 *   storyTopicTags: string[],
 *   timeOnSegmentMs: number,
 *   storyId?: string
 * }
 */

import { verifyAuth } from "@/lib/auth/verify-auth";
import { updateTopicPreferences } from "@/lib/ml-services/story-selector-client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { storyTopicTags, timeOnSegmentMs, storyId } = body as {
      storyTopicTags: string[];
      timeOnSegmentMs: number;
      storyId?: string;
    };

    if (!storyTopicTags || !Array.isArray(storyTopicTags)) {
      return NextResponse.json(
        { error: "storyTopicTags is required" },
        { status: 400 },
      );
    }

    const result = await updateTopicPreferences({
      userId: auth.user.id,
      storyTopicTags,
      timeOnSegmentMs: timeOnSegmentMs || 0,
      storyId,
    });

    if (!result) {
      // Service unavailable — non-critical, fire-and-forget
      return NextResponse.json({ status: "skipped" });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/ml/story/update-preferences] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
