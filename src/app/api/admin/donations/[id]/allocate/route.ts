import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* =============================================================================
   ADMIN — TRIGGER ALLOCATION

   POST /api/admin/donations/[id]/allocate

   Proxies to the internal /api/donations/allocate route (which requires
   x-admin-secret). This route authenticates via Supabase session instead,
   avoiding the need to expose ADMIN_SECRET in the browser.

   Auth: Supabase session + ADMIN_EMAIL env var.
============================================================================= */

async function getAdminUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || user.email !== adminEmail) return null;
  return user;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET not configured" },
      { status: 500 },
    );
  }

  // ── Forward to the internal allocation route ────────────────────────────
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/donations/allocate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": adminSecret,
    },
    body: JSON.stringify({ donation_id: id }),
  });

  const result = await response.json();

  return NextResponse.json(result, { status: response.status });
}
