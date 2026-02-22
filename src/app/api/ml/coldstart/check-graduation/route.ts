/**
 * POST /api/ml/coldstart/check-graduation
 *
 * Proxy to the Python Cold Start service.
 * Checks if a user has enough events to graduate from cold start.
 */

import { verifyAuth } from "@/lib/auth/verify-auth";
import { checkGraduation } from "@/lib/ml-services/cold-start-client";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────────
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    // ── Forward to ML service ────────────────────────────────────────────
    const result = await checkGraduation({ userId: auth.user.id });

    if (!result) {
      return NextResponse.json(
        {
          userId: auth.user.id,
          eventCount: 0,
          threshold: 50,
          shouldGraduate: false,
          currentClusterId: null,
          graduated: false,
          _fallback: true,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/ml/coldstart/check-graduation] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
