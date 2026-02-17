// EXAMPLE: Refactored API Route using verifyAuth
// This demonstrates how to migrate existing API routes to use the new auth helper

import { verifyAuth } from "@/lib/auth/verify-auth";
import { NextRequest, NextResponse } from "next/server";

// ============================================
// BEFORE (Old Pattern)
// ============================================
/*
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Your API logic here...
    const body = await request.json();
    
    const { data } = await supabase
      .from("your_table")
      .select("*")
      .eq("user_id", user.id);

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
*/

// ============================================
// AFTER (New Pattern with verifyAuth)
// ============================================

export async function POST(request: NextRequest) {
  try {
    // Step 1: Verify authentication (replaces 8 lines of code!)
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    const { user, supabase } = auth;

    // Step 2: Your API logic here...
    const body = await request.json();

    const { data } = await supabase
      .from("your_table")
      .select("*")
      .eq("user_id", user.id);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================
// Alternative: Using checkAuth for custom errors
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const auth = await verifyAuth();
    if (auth instanceof NextResponse) return auth;

    const { user, supabase } = auth;

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("id");

    if (!itemId) {
      return NextResponse.json({ error: "Missing item ID" }, { status: 400 });
    }

    // Check ownership before deleting
    const { data: item } = await supabase
      .from("items")
      .select("user_id")
      .eq("id", itemId)
      .single();

    if (!item || item.user_id !== user.id) {
      return NextResponse.json(
        { error: "Item not found or access denied" },
        { status: 404 },
      );
    }

    // Delete the item
    await supabase.from("items").delete().eq("id", itemId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================
// Benefits of the New Pattern:
// ============================================
// ✅ Less boilerplate (8 lines → 2 lines)
// ✅ Consistent error responses across all APIs
// ✅ Better error handling built-in
// ✅ Type-safe user and supabase objects
// ✅ Easier to test and maintain
// ✅ Single source of truth for auth logic
