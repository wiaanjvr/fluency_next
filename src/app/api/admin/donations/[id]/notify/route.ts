import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* =============================================================================
   ADMIN — TRIGGER IMPACT NOTIFICATIONS

   POST /api/admin/donations/[id]/notify

   Proxies to /api/notifications/impact (which requires x-admin-secret).
   Authenticates via Supabase session so the browser never needs ADMIN_SECRET.

   The underlying route sends emails to all users with un-notified user_impact
   rows (notified_at IS NULL). The donation id param is accepted here for
   context/logging but the notification route operates globally across all
   pending rows.

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

  // Resolve params (unused beyond validation, but required by Next.js typing)
  await params;

  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) {
    return NextResponse.json(
      { error: "ADMIN_SECRET not configured" },
      { status: 500 },
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/notifications/impact`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": adminSecret,
    },
  });

  const result = await response.json();

  return NextResponse.json(result, { status: response.status });
}
