import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

/* =============================================================================
   ADMIN — UPDATE RECEIPT URL

   PATCH /api/admin/donations/[id]/receipt
   Body: { receipt_url: string }

   Auth: Supabase session + ADMIN_EMAIL env var.
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { receipt_url } = body;

  if (!receipt_url || typeof receipt_url !== "string") {
    return NextResponse.json(
      { error: "receipt_url is required (string)" },
      { status: 400 },
    );
  }

  const serviceSupabase = getServiceSupabase();

  const { data, error } = await serviceSupabase
    .from("community_donations")
    .update({ receipt_url })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Error updating receipt_url:", error);
    return NextResponse.json(
      { error: "Failed to update receipt URL" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Donation not found" }, { status: 404 });
  }

  return NextResponse.json({ donation: data });
}
