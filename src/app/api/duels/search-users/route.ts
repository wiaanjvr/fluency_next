// ==========================================================================
// GET /api/duels/search-users?q=<query> — Search users by name or email
// ==========================================================================

import { verifyAuth } from "@/lib/auth/verify-auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const auth = await verifyAuth();
  if (auth instanceof NextResponse) return auth;
  const { user, supabase } = auth;

  const q = request.nextUrl.searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json(
      { error: "Query must be at least 2 characters" },
      { status: 400 },
    );
  }

  // Search by full_name or email (case-insensitive)
  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, email")
    .or(`full_name.ilike.%${q}%,email.ilike.%${q}%`)
    .neq("id", user.id) // exclude self
    .limit(10);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Map to safe response shape
  const results = (users || []).map((u) => ({
    id: u.id,
    display_name: u.full_name,
    avatar_url: u.avatar_url,
    email: u.email,
  }));

  return NextResponse.json({ users: results });
}
