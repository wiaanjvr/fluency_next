import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/* =============================================================================
   AUTH CHECK API ROUTE
   
   GET /api/auth/check
   
   Checks if user is currently authenticated
============================================================================= */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        {
          authenticated: false,
          user: null,
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
      },
      { status: 200 },
    );
  }
}
