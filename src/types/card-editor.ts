// ============================================================================
// Types for the Card Editor — Note Types, Fields, Media
// ============================================================================

// ── Note Type Field Definition ─────────────────────────────────────────────
export interface NoteField {
  /** Display name of the field */
  name: string;
  /** Whether field content persists when adding new cards */
  sticky: boolean;
  /** Custom font size for this field (optional) */
  font_size?: number;
  /** Right-to-left text direction (for Arabic, Hebrew, etc.) */
  rtl?: boolean;
}

// ── Card Template ──────────────────────────────────────────────────────────
export interface CardTemplate {
  name: string;
  front_template: string;
  back_template: string;
}

// ── Note Type ──────────────────────────────────────────────────────────────
export interface NoteType {
  id: string;
  user_id: string;
  name: string;
  fields: NoteField[];
  css: string;
  templates: CardTemplate[];
  sort_field: number;
  is_builtin: boolean;
  created_at: string;
  updated_at: string;
}

// ── Card Media ─────────────────────────────────────────────────────────────
export interface CardMedia {
  id: string;
  user_id: string;
  card_id: string | null;
  filename: string;
  mime_type: string;
  storage_path: string;
  file_size: number;
  created_at: string;
}

// ── Media types ────────────────────────────────────────────────────────────
export type MediaType = "image" | "audio" | "video";

export function getMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.startsWith("video/")) return "video";
  return "image"; // fallback
}

export const ACCEPTED_MEDIA_TYPES = {
  image: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
  audio: ["audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4"],
  video: ["video/mp4", "video/webm", "video/ogg"],
} as const;

export const ALL_ACCEPTED_TYPES = [
  ...ACCEPTED_MEDIA_TYPES.image,
  ...ACCEPTED_MEDIA_TYPES.audio,
  ...ACCEPTED_MEDIA_TYPES.video,
];

export const MAX_MEDIA_SIZE = 25 * 1024 * 1024; // 25 MB

// ── Card Editor State ──────────────────────────────────────────────────────
export interface CardEditorField {
  name: string;
  value: string; // HTML content
}

export interface CardEditorState {
  noteTypeId: string;
  deckId: string;
  fields: CardEditorField[];
  tags: string[];
}

// ── Duplicate Check Result ─────────────────────────────────────────────────
export interface DuplicateMatch {
  id: string;
  front: string;
  back: string;
  deck_name: string;
  similarity: number; // 0-1
}

// ── Built-in note type names ───────────────────────────────────────────────
export const BUILTIN_NOTE_TYPES = [
  "Basic",
  "Basic (and reversed)",
  "Cloze",
  "Image Occlusion",
  "Vocabulary",
] as const;

export type BuiltinNoteTypeName = (typeof BUILTIN_NOTE_TYPES)[number];
