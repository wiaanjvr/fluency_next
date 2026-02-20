import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/*
  GET /api/admin/is-admin
  Returns { is_admin: true } when the current session user email matches
  the server-side ADMIN_EMAIL env var. Safe to call from the client.
*/

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ is_admin: false });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      return NextResponse.json({ is_admin: false });
    }

    return NextResponse.json({ is_admin: user.email === adminEmail });
  } catch (err) {
    console.error("is-admin check failed:", err);
    return NextResponse.json({ is_admin: false });
  }
}
