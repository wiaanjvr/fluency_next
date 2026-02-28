import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/flashcards/sync - Perform a full sync
 * Returns sync results including conflicts
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
    const { device_name, device_type, include_media = true } = body;

    // Get pending changes (entities modified locally that haven't been synced)
    const { data: pendingChanges, error: pendingError } = await supabase
      .from("sync_state")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_synced", false);

    if (pendingError) {
      return NextResponse.json(
        { error: pendingError.message },
        { status: 500 },
      );
    }

    let pushed = 0;
    let pulled = 0;
    let conflicts = 0;

    // Mark all pending changes as synced (since Supabase is the cloud)
    if (pendingChanges && pendingChanges.length > 0) {
      for (const change of pendingChanges) {
        const { error: updateError } = await supabase
          .from("sync_state")
          .update({
            is_synced: true,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", change.id);

        if (!updateError) pushed++;
      }
    }

    // Check for conflicts (entities modified on multiple devices)
    const { data: conflictData } = await supabase
      .from("sync_state")
      .select("*")
      .eq("user_id", user.id)
      .not("conflict_data", "is", null);

    conflicts = conflictData?.length || 0;

    // Sync media if requested
    let mediaSynced = 0;
    if (include_media) {
      const { data: unsyncedMedia } = await supabase
        .from("card_media")
        .select("id")
        .eq("sync_status", "pending");

      if (unsyncedMedia) {
        for (const media of unsyncedMedia) {
          const { error: mediaError } = await supabase
            .from("card_media")
            .update({
              sync_status: "synced",
              last_synced_at: new Date().toISOString(),
            })
            .eq("id", media.id);

          if (!mediaError) mediaSynced++;
        }
      }
    }

    // Log the sync
    const { error: logError } = await supabase.from("sync_log").insert({
      user_id: user.id,
      direction: "both",
      status: conflicts > 0 ? "conflict" : "success",
      entities_pushed: pushed,
      entities_pulled: pulled,
      conflicts_found: conflicts,
      conflicts_resolved: 0,
      device_name: device_name || "unknown",
      device_type: device_type || "web",
      duration_ms: 0,
    });

    if (logError) {
      console.error("Error logging sync:", logError);
    }

    return NextResponse.json({
      success: true,
      pushed,
      pulled,
      conflicts,
      media_synced: mediaSynced,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in POST /api/flashcards/sync:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/flashcards/sync - Get sync status and history
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "10");

    // Pending change count
    const { count: pendingCount } = await supabase
      .from("sync_state")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_synced", false);

    // Conflict count
    const { count: conflictCount } = await supabase
      .from("sync_state")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .not("conflict_data", "is", null);

    // Recent sync history
    const { data: history } = await supabase
      .from("sync_log")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false })
      .limit(limit);

    // Last successful sync
    const { data: lastSync } = await supabase
      .from("sync_log")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "success")
      .order("started_at", { ascending: false })
      .limit(1);

    return NextResponse.json({
      pending_changes: pendingCount || 0,
      conflicts: conflictCount || 0,
      last_sync: lastSync?.[0] || null,
      history: history || [],
    });
  } catch (error) {
    console.error("Error in GET /api/flashcards/sync:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
