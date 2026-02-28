import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/flashcards/sync/conflicts - Resolve a sync conflict
 */
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

    const body = await request.json();
    const { sync_state_id, resolution } = body;

    if (!sync_state_id || !resolution) {
      return NextResponse.json(
        {
          error:
            "sync_state_id and resolution (keep_local|use_remote) are required",
        },
        { status: 400 },
      );
    }

    if (!["keep_local", "use_remote"].includes(resolution)) {
      return NextResponse.json(
        { error: "resolution must be 'keep_local' or 'use_remote'" },
        { status: 400 },
      );
    }

    // Get the conflict
    const { data: syncState, error: fetchError } = await supabase
      .from("sync_state")
      .select("*")
      .eq("id", sync_state_id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !syncState) {
      return NextResponse.json(
        { error: "Sync state not found" },
        { status: 404 },
      );
    }

    if (resolution === "use_remote" && syncState.conflict_data) {
      // Apply the remote version
      const conflictData = syncState.conflict_data as Record<string, unknown>;
      const remoteData = conflictData.remote_data as Record<string, unknown>;

      if (remoteData && syncState.entity_type && syncState.entity_id) {
        const { error: updateError } = await supabase
          .from(syncState.entity_type as string)
          .update(remoteData)
          .eq("id", syncState.entity_id);

        if (updateError) {
          return NextResponse.json(
            { error: updateError.message },
            { status: 500 },
          );
        }
      }
    }

    // Clear the conflict
    const { error: clearError } = await supabase
      .from("sync_state")
      .update({
        conflict_data: null,
        is_synced: true,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", sync_state_id);

    if (clearError) {
      return NextResponse.json({ error: clearError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      resolution,
      sync_state_id,
    });
  } catch (error) {
    console.error("Error in POST /api/flashcards/sync/conflicts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/flashcards/sync/conflicts - List all unresolved conflicts
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: conflicts, error } = await supabase
      .from("sync_state")
      .select("*")
      .eq("user_id", user.id)
      .not("conflict_data", "is", null)
      .order("local_updated_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ conflicts: conflicts || [] });
  } catch (error) {
    console.error("Error in GET /api/flashcards/sync/conflicts:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
