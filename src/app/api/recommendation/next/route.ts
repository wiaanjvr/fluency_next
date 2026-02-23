import { NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";
import { computeNextActivity } from "@/lib/recommendation/nextActivityEngine";

export async function GET() {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;

  const { user, supabase } = auth;

  try {
    // Determine target language from profile (default to French)
    const { data: profile } = await supabase
      .from("profiles")
      .select("target_language")
      .eq("id", user.id)
      .single();

    const language = profile?.target_language ?? "fr";

    const recommendation = await computeNextActivity(
      supabase,
      user.id,
      language,
    );

    return NextResponse.json(recommendation, {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    console.error("[recommendation/next] Error:", error);
    return NextResponse.json(
      { error: "Failed to compute recommendation" },
      { status: 500 },
    );
  }
}
