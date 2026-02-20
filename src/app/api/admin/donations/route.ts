import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/* =============================================================================
   ADMIN — COMMUNITY DONATIONS CRUD
   
   GET  /api/admin/donations          — list all donations (newest first)
   POST /api/admin/donations          — create a new community_donations row

   Auth: Supabase session + email must match ADMIN_EMAIL env var.
============================================================================= */

const getServiceSupabase = () =>
  createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

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

// ── GET /api/admin/donations ─────────────────────────────────────────────────
export async function GET() {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceSupabase = getServiceSupabase();

  const { data, error } = await serviceSupabase
    .from("community_donations")
    .select("*")
    .order("donated_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch donations" },
      { status: 500 },
    );
  }

  return NextResponse.json({ donations: data });
}

// ── POST /api/admin/donations ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const {
    amount_zar,
    amount_usd,
    bottles_intercepted,
    football_fields_swept,
    period_start,
    period_end,
    receipt_url,
    donated_at,
  } = body;

  // ── Validate required fields ────────────────────────────────────────────
  if (
    !amount_zar ||
    !amount_usd ||
    !bottles_intercepted ||
    !football_fields_swept ||
    !period_start ||
    !period_end
  ) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: amount_zar, amount_usd, bottles_intercepted, football_fields_swept, period_start, period_end",
      },
      { status: 400 },
    );
  }

  const serviceSupabase = getServiceSupabase();

  const { data, error } = await serviceSupabase
    .from("community_donations")
    .insert({
      amount_zar: Number(amount_zar),
      amount_usd: Number(amount_usd),
      bottles_intercepted: Number(bottles_intercepted),
      football_fields_swept: Number(football_fields_swept),
      period_start,
      period_end,
      receipt_url: receipt_url || null,
      donated_at: donated_at || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating donation:", error);
    return NextResponse.json(
      { error: "Failed to create donation" },
      { status: 500 },
    );
  }

  return NextResponse.json({ donation: data }, { status: 201 });
}
