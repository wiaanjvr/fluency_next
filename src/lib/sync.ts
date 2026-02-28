// ============================================================================
// Sync engine — bidirectional sync with cloud (AnkiWeb-compatible concept)
// ============================================================================

import { createClient } from "@/lib/supabase/client";
import type {
  SyncConfig,
  SyncResult,
  SyncConflict,
  SyncLogEntry,
  SyncState,
  SyncEntityType,
  ConflictResolution,
  MediaSyncEntry,
} from "@/types/sync-tags-import";

// ── Default sync config ────────────────────────────────────────────────────

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  autoSync: false,
  syncInterval: 0,
  syncMedia: true,
  conflictResolution: "remote",
  deviceName:
    typeof navigator !== "undefined"
      ? navigator.userAgent.slice(0, 50)
      : "unknown",
  deviceType: "web",
};

/** Get or initialise user sync config from localStorage */
export function getSyncConfig(): SyncConfig {
  if (typeof window === "undefined") return DEFAULT_SYNC_CONFIG;
  const stored = localStorage.getItem("lingua_sync_config");
  if (!stored) return DEFAULT_SYNC_CONFIG;
  try {
    return { ...DEFAULT_SYNC_CONFIG, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SYNC_CONFIG;
  }
}

export function saveSyncConfig(config: SyncConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("lingua_sync_config", JSON.stringify(config));
}

// ── Change tracking ────────────────────────────────────────────────────────

/** Mark an entity as modified (creates or updates sync_state) */
export async function markEntityModified(
  userId: string,
  entityType: SyncEntityType,
  entityId: string,
): Promise<void> {
  const supabase = createClient();
  await supabase.from("sync_state").upsert(
    {
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      local_mod: new Date().toISOString(),
      sync_status: "pending",
    },
    { onConflict: "user_id,entity_type,entity_id" },
  );
}

/** Get all pending (unsynced) changes */
export async function getPendingChanges(userId: string): Promise<SyncState[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sync_state")
    .select("*")
    .eq("user_id", userId)
    .eq("sync_status", "pending")
    .order("local_mod", { ascending: true });

  if (error) throw new Error(`Failed to get pending changes: ${error.message}`);
  return data ?? [];
}

/** Get all conflicts */
export async function getConflicts(userId: string): Promise<SyncState[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sync_state")
    .select("*")
    .eq("user_id", userId)
    .eq("sync_status", "conflict");

  if (error) throw new Error(`Failed to get conflicts: ${error.message}`);
  return data ?? [];
}

// ── Entity data fetching (for push) ────────────────────────────────────────

async function fetchEntityData(
  userId: string,
  entityType: SyncEntityType,
  entityId: string,
): Promise<Record<string, unknown> | null> {
  const supabase = createClient();
  const tableMap: Record<SyncEntityType, string> = {
    deck: "decks",
    flashcard: "flashcards",
    card_schedule: "card_schedules",
    review_log: "review_log",
    note_type: "note_types",
    tag: "flashcard_tags",
  };

  const table = tableMap[entityType];
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("id", entityId)
    .eq("user_id", userId)
    .single();

  if (error) return null;
  return data;
}

// ── Core sync operations ───────────────────────────────────────────────────

/** Push local changes to the cloud */
export async function pushChanges(
  userId: string,
  config: SyncConfig,
): Promise<{ pushed: number; errors: string[] }> {
  const supabase = createClient();
  const pending = await getPendingChanges(userId);
  let pushed = 0;
  const errors: string[] = [];

  for (const change of pending) {
    try {
      // Fetch the entity data
      const entityData = await fetchEntityData(
        userId,
        change.entity_type as SyncEntityType,
        change.entity_id,
      );

      if (!entityData) {
        // Entity was deleted locally — mark as synced (deletion)
        await supabase
          .from("sync_state")
          .update({
            sync_status: "synced",
            remote_mod: new Date().toISOString(),
          })
          .eq("id", change.id);
        pushed++;
        continue;
      }

      // In a real AnkiWeb integration, this would POST the entity to the server.
      // For now, Supabase IS the cloud, so "pushing" means ensuring the sync_state
      // is marked as synced (the data is already in Supabase).
      await supabase
        .from("sync_state")
        .update({
          sync_status: "synced",
          remote_mod: new Date().toISOString(),
        })
        .eq("id", change.id);

      pushed++;
    } catch (err) {
      errors.push(
        `Push failed for ${change.entity_type}/${change.entity_id}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  return { pushed, errors };
}

/** Pull remote changes from the cloud */
export async function pullChanges(
  userId: string,
  config: SyncConfig,
  lastSyncTime?: string,
): Promise<{ pulled: number; conflicts: SyncConflict[]; errors: string[] }> {
  const supabase = createClient();
  let pulled = 0;
  const conflicts: SyncConflict[] = [];
  const errors: string[] = [];

  // Since Supabase is already the cloud, "pulling" means checking for
  // changes made by other devices (rows updated after our last sync).
  // In a multi-device scenario, we compare updated_at timestamps.

  const since = lastSyncTime ?? new Date(0).toISOString();

  const tables: { type: SyncEntityType; table: string }[] = [
    { type: "deck", table: "decks" },
    { type: "flashcard", table: "flashcards" },
    { type: "card_schedule", table: "card_schedules" },
  ];

  for (const { type, table } of tables) {
    try {
      const { data: remoteEntities, error } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", userId)
        .gt("updated_at", since);

      if (error) {
        errors.push(`Pull failed for ${type}: ${error.message}`);
        continue;
      }

      for (const entity of remoteEntities ?? []) {
        // Check if we have a local pending change for this entity
        const { data: localState } = await supabase
          .from("sync_state")
          .select("*")
          .eq("user_id", userId)
          .eq("entity_type", type)
          .eq("entity_id", entity.id)
          .eq("sync_status", "pending")
          .maybeSingle();

        if (localState) {
          // Conflict: both local and remote modified
          const conflict: SyncConflict = {
            entityType: type,
            entityId: entity.id,
            localVersion: localState.conflict_data ?? {},
            remoteVersion: entity,
            localModified: localState.local_mod,
            remoteModified: entity.updated_at,
          };

          if (config.conflictResolution === "remote") {
            // Auto-resolve: use remote version (already in DB)
            await supabase
              .from("sync_state")
              .update({ sync_status: "synced", remote_mod: entity.updated_at })
              .eq("id", localState.id);
            pulled++;
          } else if (config.conflictResolution === "local") {
            // Auto-resolve: keep local (ignore remote change)
            // Mark as synced since we're keeping our version
            await supabase
              .from("sync_state")
              .update({ sync_status: "synced" })
              .eq("id", localState.id);
          } else {
            // Manual resolution needed
            await supabase
              .from("sync_state")
              .update({
                sync_status: "conflict",
                conflict_data: entity,
              })
              .eq("id", localState.id);
            conflicts.push(conflict);
          }
        } else {
          // No local changes — accept remote
          await supabase.from("sync_state").upsert(
            {
              user_id: userId,
              entity_type: type,
              entity_id: entity.id,
              local_mod: entity.updated_at,
              remote_mod: entity.updated_at,
              sync_status: "synced",
            },
            { onConflict: "user_id,entity_type,entity_id" },
          );
          pulled++;
        }
      }
    } catch (err) {
      errors.push(
        `Pull error for ${type}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return { pulled, conflicts, errors };
}

// ── Media sync ─────────────────────────────────────────────────────────────

/** Sync media files to cloud storage */
export async function syncMedia(
  userId: string,
): Promise<{ synced: number; errors: string[] }> {
  const supabase = createClient();
  let synced = 0;
  const errors: string[] = [];

  // Find unsynced media
  const { data: unsyncedMedia, error } = await supabase
    .from("card_media")
    .select("*")
    .eq("user_id", userId)
    .eq("sync_status", "local");

  if (error) {
    return {
      synced: 0,
      errors: [`Failed to fetch unsynced media: ${error.message}`],
    };
  }

  for (const media of unsyncedMedia ?? []) {
    try {
      // Mark as syncing
      await supabase
        .from("card_media")
        .update({ sync_status: "syncing" })
        .eq("id", media.id);

      // Check if file exists in storage
      const { data: fileData } = await supabase.storage
        .from("card-media")
        .download(media.storage_path);

      if (fileData) {
        // File exists — get public URL and mark as synced
        const { data: urlData } = supabase.storage
          .from("card-media")
          .getPublicUrl(media.storage_path);

        await supabase
          .from("card_media")
          .update({
            sync_status: "synced",
            remote_url: urlData.publicUrl,
            last_synced_at: new Date().toISOString(),
          })
          .eq("id", media.id);

        synced++;
      } else {
        await supabase
          .from("card_media")
          .update({ sync_status: "error" })
          .eq("id", media.id);
        errors.push(`Media file not found in storage: ${media.filename}`);
      }
    } catch (err) {
      await supabase
        .from("card_media")
        .update({ sync_status: "error" })
        .eq("id", media.id);
      errors.push(
        `Media sync failed for ${media.filename}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  return { synced, errors };
}

// ── Full bidirectional sync ────────────────────────────────────────────────

/** Perform a full bidirectional sync */
export async function performFullSync(
  userId: string,
  config?: Partial<SyncConfig>,
): Promise<SyncResult> {
  const mergedConfig = { ...getSyncConfig(), ...config };
  const supabase = createClient();
  const startTime = Date.now();

  const syncResult: SyncResult = {
    success: false,
    pushed: 0,
    pulled: 0,
    conflicts: [],
    errors: [],
    duration: 0,
  };

  // Create sync log entry
  const { data: logEntry } = await supabase
    .from("sync_log")
    .insert({
      user_id: userId,
      direction: "bidirectional",
      status: "in_progress",
      device_name: mergedConfig.deviceName,
      device_type: mergedConfig.deviceType,
    })
    .select("id")
    .single();

  try {
    // 1. Push local changes
    const pushResult = await pushChanges(userId, mergedConfig);
    syncResult.pushed = pushResult.pushed;
    syncResult.errors.push(...pushResult.errors);

    // 2. Pull remote changes
    const lastSync = await getLastSuccessfulSync(userId);
    const pullResult = await pullChanges(
      userId,
      mergedConfig,
      lastSync?.sync_finished_at ?? undefined,
    );
    syncResult.pulled = pullResult.pulled;
    syncResult.conflicts = pullResult.conflicts;
    syncResult.errors.push(...pullResult.errors);

    // 3. Sync media if enabled
    if (mergedConfig.syncMedia) {
      const mediaResult = await syncMedia(userId);
      syncResult.errors.push(...mediaResult.errors);
    }

    syncResult.success = syncResult.errors.length === 0;
    syncResult.duration = Date.now() - startTime;

    // Update sync log
    if (logEntry) {
      await supabase
        .from("sync_log")
        .update({
          sync_finished_at: new Date().toISOString(),
          status: syncResult.success
            ? "completed"
            : syncResult.conflicts.length > 0
              ? "partial"
              : "failed",
          entities_pushed: syncResult.pushed,
          entities_pulled: syncResult.pulled,
          conflicts: syncResult.conflicts.length,
          error_message:
            syncResult.errors.length > 0 ? syncResult.errors.join("; ") : null,
          details: {
            duration: syncResult.duration,
            conflictResolution: mergedConfig.conflictResolution,
          },
        })
        .eq("id", logEntry.id);
    }
  } catch (err) {
    syncResult.errors.push(
      `Sync failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    syncResult.duration = Date.now() - startTime;

    if (logEntry) {
      await supabase
        .from("sync_log")
        .update({
          sync_finished_at: new Date().toISOString(),
          status: "failed",
          error_message: syncResult.errors.join("; "),
        })
        .eq("id", logEntry.id);
    }
  }

  return syncResult;
}

// ── Conflict resolution ────────────────────────────────────────────────────

/** Resolve a conflict by choosing local or remote version */
export async function resolveConflict(
  userId: string,
  entityType: SyncEntityType,
  entityId: string,
  resolution: "local" | "remote",
): Promise<void> {
  const supabase = createClient();

  const { data: state } = await supabase
    .from("sync_state")
    .select("*")
    .eq("user_id", userId)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("sync_status", "conflict")
    .single();

  if (!state) throw new Error("Conflict not found");

  if (resolution === "remote" && state.conflict_data) {
    // Apply remote version to the entity
    const tableMap: Record<SyncEntityType, string> = {
      deck: "decks",
      flashcard: "flashcards",
      card_schedule: "card_schedules",
      review_log: "review_log",
      note_type: "note_types",
      tag: "flashcard_tags",
    };

    const table = tableMap[entityType];
    const {
      id: _,
      user_id: __,
      ...updateData
    } = state.conflict_data as Record<string, unknown>;

    await supabase.from(table).update(updateData).eq("id", entityId);
  }

  // Mark as resolved
  await supabase
    .from("sync_state")
    .update({
      sync_status: "synced",
      conflict_data: null,
      remote_mod: new Date().toISOString(),
    })
    .eq("id", state.id);
}

// ── Sync log / history ─────────────────────────────────────────────────────

/** Get sync history */
export async function getSyncHistory(
  userId: string,
  limit = 20,
): Promise<SyncLogEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("sync_log")
    .select("*")
    .eq("user_id", userId)
    .order("sync_started_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch sync log: ${error.message}`);
  return data ?? [];
}

/** Get last successful sync entry */
export async function getLastSuccessfulSync(
  userId: string,
): Promise<SyncLogEntry | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("sync_log")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("sync_finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data;
}

/** Get pending change count (for badge display) */
export async function getPendingChangeCount(userId: string): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("sync_state")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("sync_status", "pending");

  if (error) return 0;
  return count ?? 0;
}

// ── Auto-sync manager ──────────────────────────────────────────────────────

let autoSyncInterval: ReturnType<typeof setInterval> | null = null;

/** Start auto-sync with the configured interval */
export function startAutoSync(
  userId: string,
  config: SyncConfig,
  onSyncComplete?: (result: SyncResult) => void,
): void {
  stopAutoSync();
  if (!config.autoSync || config.syncInterval <= 0) return;

  autoSyncInterval = setInterval(async () => {
    try {
      const result = await performFullSync(userId, config);
      onSyncComplete?.(result);
    } catch {
      // Silent fail — will retry on next interval
    }
  }, config.syncInterval);
}

/** Stop auto-sync */
export function stopAutoSync(): void {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
}

/** Check if auto-sync is running */
export function isAutoSyncRunning(): boolean {
  return autoSyncInterval !== null;
}
