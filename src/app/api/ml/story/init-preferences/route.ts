/**
 * POST /api/ml/story/init-preferences
 *
 * Called at signup when user selects their topic interests.
 * Builds the initial 16-dim topic preference vector.
 *
 * Request body:
 * { selectedTopics: string[] }
 *
 * GET /api/ml/story/init-preferences
 *
 * Returns available topic tags for the signup selector UI.
 */

import { verifyAuth } from "@/lib/auth/verify-auth";
import {
  initTopicPreferences,
  getTopicTaxonomy,
} from "@/lib/ml-services/story-selector-client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { selectedTopics } = body as { selectedTopics: string[] };

    if (
      !selectedTopics ||
      !Array.isArray(selectedTopics) ||
      selectedTopics.length === 0
    ) {
      return NextResponse.json(
        { error: "selectedTopics must be a non-empty array" },
        { status: 400 },
      );
    }

    const result = await initTopicPreferences({
      userId: auth.user.id,
      selectedTopics,
    });

    if (!result) {
      return NextResponse.json(
        { error: "Topic preference service unavailable" },
        { status: 503 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/ml/story/init-preferences] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const result = await getTopicTaxonomy();
    if (!result) {
      // Fallback: return a static list
      return NextResponse.json({
        topics: [
          { tag: "daily_life", label: "Daily Life & Routines" },
          { tag: "food_cooking", label: "Food & Cooking" },
          { tag: "travel", label: "Travel & Geography" },
          { tag: "culture_arts", label: "Culture & Arts" },
          { tag: "nature_environment", label: "Nature & Environment" },
          { tag: "sports_health", label: "Sports & Health" },
          { tag: "entertainment", label: "Entertainment & Media" },
          { tag: "family_relationships", label: "Family & Relationships" },
          { tag: "work_career", label: "Work & Career" },
          { tag: "technology", label: "Technology & Science" },
          { tag: "history", label: "History & Society" },
          { tag: "animals", label: "Animals & Pets" },
          { tag: "shopping_fashion", label: "Shopping & Fashion" },
          { tag: "education", label: "Education & Learning" },
          { tag: "emotions_personality", label: "Emotions & Personality" },
        ],
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/ml/story/init-preferences GET] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
