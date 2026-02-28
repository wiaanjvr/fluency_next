// ============================================================================
// Types for Sync, Tags, and Import/Export features
// ============================================================================

// ── Tags ───────────────────────────────────────────────────────────────────

export interface FlashcardTag {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  color: string | null;
  created_at: string;
  updated_at: string;
}

/** Tree node for hierarchical tag display */
export interface TagTreeNode {
  tag: FlashcardTag;
  children: TagTreeNode[];
  /** Number of cards with this tag (including children) */
  cardCount: number;
  /** Depth level in hierarchy (0 = root) */
  depth: number;
  /** Whether the node is expanded in the UI */
  expanded?: boolean;
}

export interface TagRenamePayload {
  oldName: string;
  newName: string;
}

export interface TagDeletePayload {
  tagName: string;
  includeChildren: boolean;
}

export interface BulkTagOperation {
  cardIds: string[];
  tags: string[];
  action: "add" | "remove";
}

// ── Sync ───────────────────────────────────────────────────────────────────

export type SyncEntityType =
  | "deck"
  | "flashcard"
  | "card_schedule"
  | "review_log"
  | "note_type"
  | "tag";

export type SyncStatus = "pending" | "synced" | "conflict";
export type SyncDirection = "push" | "pull" | "bidirectional";
export type SyncLogStatus = "in_progress" | "completed" | "failed" | "partial";
export type DeviceType = "desktop" | "ios" | "android" | "web";
export type MediaSyncStatus = "local" | "syncing" | "synced" | "error";
export type ConflictResolution = "local" | "remote" | "manual";

export interface SyncState {
  id: string;
  user_id: string;
  entity_type: SyncEntityType;
  entity_id: string;
  local_mod: string;
  remote_mod: string | null;
  sync_status: SyncStatus;
  conflict_data: Record<string, unknown> | null;
  created_at: string;
}

export interface SyncLogEntry {
  id: string;
  user_id: string;
  sync_started_at: string;
  sync_finished_at: string | null;
  direction: SyncDirection;
  status: SyncLogStatus;
  entities_pushed: number;
  entities_pulled: number;
  conflicts: number;
  error_message: string | null;
  device_name: string | null;
  device_type: DeviceType | null;
  details: Record<string, unknown> | null;
}

export interface SyncConflict {
  entityType: SyncEntityType;
  entityId: string;
  localVersion: Record<string, unknown>;
  remoteVersion: Record<string, unknown>;
  localModified: string;
  remoteModified: string;
}

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  conflicts: SyncConflict[];
  errors: string[];
  duration: number;
}

export interface SyncConfig {
  /** Enable automatic sync on changes */
  autoSync: boolean;
  /** Sync interval in milliseconds (0 = manual only) */
  syncInterval: number;
  /** Include media files in sync */
  syncMedia: boolean;
  /** Default conflict resolution strategy */
  conflictResolution: ConflictResolution;
  /** Device identifier for multi-device tracking */
  deviceName: string;
  deviceType: DeviceType;
}

export interface MediaSyncEntry {
  id: string;
  filename: string;
  storage_path: string;
  sync_status: MediaSyncStatus;
  remote_url: string | null;
  checksum: string | null;
  last_synced_at: string | null;
}

// ── Import / Export ────────────────────────────────────────────────────────

export type ImportFormat = "apkg" | "colpkg" | "csv" | "txt";
export type ExportFormat = "apkg" | "colpkg" | "csv" | "txt";
export type DuplicateMode = "ignore" | "update" | "create_new";

export interface ImportOptions {
  format: ImportFormat;
  deckId?: string;
  /** For CSV: delimiter character */
  delimiter?: string;
  /** For CSV: field mapping from CSV columns to flashcard fields */
  fieldMapping?: Record<string, string>;
  /** Whether imported fields may contain HTML */
  allowHtml?: boolean;
  /** How to handle duplicates */
  duplicateMode: DuplicateMode;
  /** Whether to import scheduling data (apkg/colpkg) */
  importScheduling?: boolean;
  /** Whether to import media files (apkg/colpkg) */
  importMedia?: boolean;
  /** Tags to apply to all imported cards */
  additionalTags?: string[];
}

export interface ExportOptions {
  format: ExportFormat;
  deckIds?: string[];
  /** Export entire collection (overrides deckIds) */
  entireCollection?: boolean;
  /** Include scheduling data */
  includeScheduling: boolean;
  /** Include media files */
  includeMedia: boolean;
  /** For CSV/TXT: delimiter character */
  delimiter?: string;
  /** For CSV/TXT: which fields to include */
  fields?: string[];
  /** Include tags column */
  includeTags?: boolean;
}

export interface ImportResult {
  success: boolean;
  cardsImported: number;
  cardsSkipped: number;
  cardsUpdated: number;
  mediaImported: number;
  errors: string[];
  warnings: string[];
}

export interface ExportResult {
  success: boolean;
  filename: string;
  blob: Blob;
  cardCount: number;
  mediaCount: number;
}

export interface CSVFieldMapping {
  /** CSV column name → flashcard field */
  [csvColumn: string]: string;
}

export interface CSVPreviewRow {
  [column: string]: string;
}

export interface ImportExportLogEntry {
  id: string;
  user_id: string;
  operation: "import" | "export";
  format: ImportFormat | ExportFormat;
  filename: string | null;
  deck_id: string | null;
  card_count: number;
  media_count: number;
  duplicate_mode: DuplicateMode | null;
  include_scheduling: boolean;
  include_media: boolean;
  status: "pending" | "processing" | "completed" | "failed";
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

// ── Flashcard field options for CSV mapping ────────────────────────────────
export const FLASHCARD_FIELDS = [
  { key: "front", label: "Front", required: true },
  { key: "back", label: "Back", required: true },
  { key: "example_sentence", label: "Example Sentence", required: false },
  { key: "example_translation", label: "Example Translation", required: false },
  { key: "word_class", label: "Word Class", required: false },
  { key: "grammar_notes", label: "Grammar Notes", required: false },
  { key: "tags", label: "Tags (space-separated)", required: false },
  { key: "audio_url", label: "Audio URL", required: false },
  { key: "image_url", label: "Image URL", required: false },
] as const;

export type FlashcardFieldKey = (typeof FLASHCARD_FIELDS)[number]["key"];
