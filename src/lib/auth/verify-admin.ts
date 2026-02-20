import { NextRequest, NextResponse } from "next/server";

/* =============================================================================
   ADMIN AUTH VERIFICATION
   
   Validates x-admin-secret header against process.env.ADMIN_SECRET.
   Used by admin-only API routes (donation allocation, notifications, etc.)
============================================================================= */

/**
 * Verify that the request has a valid admin secret header.
 * Returns null if valid, or a NextResponse with 401/500 if not.
 */
export function verifyAdminSecret(request: NextRequest): NextResponse | null {
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret) {
    console.error("ADMIN_SECRET not configured in environment");
    return NextResponse.json(
      { error: "Server misconfiguration: admin secret not set" },
      { status: 500 },
    );
  }

  const providedSecret = request.headers.get("x-admin-secret");

  if (!providedSecret || providedSecret !== adminSecret) {
    return NextResponse.json(
      { error: "Unauthorized — invalid admin secret" },
      { status: 401 },
    );
  }

  return null; // Valid
}
