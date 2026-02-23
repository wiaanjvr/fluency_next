import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth/verify-auth";

// GET /api/pronunciation/phonemes?language=de
export async function GET(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const language = searchParams.get("language") || "de";

  const { supabase } = auth;

  const { data: phonemes, error } = await supabase
    .from("phonemes")
    .select("*")
    .eq("language", language)
    .order("difficulty_rank", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch phonemes", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ phonemes: phonemes || [] });
}
