// ============================================================================
// Card Generator — produces flashcard rows from a note + note_type
// ============================================================================
// Given a set of field values and a note type (with templates), this module
// determines how many cards to generate and returns them ready for insertion.
//
// Handles:
// - Standard note types (1 card per template)
// - Reversed cards (multiple templates from one note)
// - Cloze deletions (1 card per cloze ordinal, auto-detected from fields)
// - Image occlusion (1 card per region or all-at-once)
// ============================================================================

import type { NoteType, CardTemplate } from "@/types/card-editor";
import type { CardSource } from "@/types/flashcards";
import type { OcclusionRegion, OcclusionMode } from "@/types/image-occlusion";
import {
  renderCardTemplate,
  extractClozeOrdinals,
} from "@/lib/flashcard-template";
import {
  renderImageOcclusionFront,
  renderImageOcclusionBack,
} from "@/lib/image-occlusion";

// ── Generated card descriptor ──────────────────────────────────────────────
export interface GeneratedCard {
  /** Legacy front field (rendered HTML) */
  front: string;
  /** Legacy back field (rendered HTML) */
  back: string;
  /** Which template index this card comes from */
  templateIndex: number;
  /** Template name (e.g. "Card 1", "Card 2", "Cloze 1") */
  templateName: string;
  /** Sibling group ID — all cards from the same note share this */
  siblingGroup: string;
  /** Source type for the card */
  source: CardSource;
  /** For cloze cards, which cloze ordinal */
  clozeOrdinal: number | null;
  /** Per-card CSS */
  css: string;
  /** Type-in-answer field name, if applicable */
  typeAnswerField: string | null;
  /** The structured field values (same for all siblings) */
  fields: Record<string, string>;
  /** Note type ID */
  noteTypeId: string;
  /** Deck override (optional, for per-card deck assignment) */
  deckOverride?: string;
}

// ── Options ────────────────────────────────────────────────────────────────
export interface GenerateCardsOptions {
  /** The note type that defines templates/fields */
  noteType: NoteType;
  /** The actual field values from the user */
  fields: Record<string, string>;
  /** Optional: override the deck for specific templates */
  deckOverrides?: Record<number, string>;
  /** For image occlusion: the occlusion regions */
  occlusionRegions?: OcclusionRegion[];
  /** For image occlusion: the mode */
  occlusionMode?: OcclusionMode;
  /** For image occlusion: the image URL */
  occlusionImageUrl?: string;
}

/**
 * Generate all cards from a note (field values + note type).
 *
 * Standard notes: 1 card per template.
 * Reversed notes: 2+ cards (one per template, same fields, different arrangement).
 * Cloze notes:    1 card per cloze ordinal found in the fields.
 * Image Occlusion: 1 card per region (one-by-one) or 1 card per region (all-at-once).
 */
export function generateCards(options: GenerateCardsOptions): GeneratedCard[] {
  const {
    noteType,
    fields,
    deckOverrides,
    occlusionRegions,
    occlusionMode,
    occlusionImageUrl,
  } = options;

  const siblingGroup = crypto.randomUUID();
  const isClozeType =
    noteType.name === "Cloze" ||
    noteType.templates.some(
      (t) =>
        t.front_template.includes("{{cloze:") ||
        t.back_template.includes("{{cloze:"),
    );
  const isImageOcclusion =
    noteType.name === "Image Occlusion" ||
    (occlusionRegions && occlusionRegions.length > 0);

  // ── Cloze cards ──────────────────────────────────────────────────────
  if (isClozeType) {
    return generateClozeCards(noteType, fields, siblingGroup, deckOverrides);
  }

  // ── Image occlusion cards ────────────────────────────────────────────
  if (isImageOcclusion && occlusionRegions && occlusionImageUrl) {
    return generateImageOcclusionCards(
      noteType,
      fields,
      siblingGroup,
      occlusionRegions,
      occlusionMode || "one-by-one",
      occlusionImageUrl,
      deckOverrides,
    );
  }

  // ── Standard / Reversed cards ────────────────────────────────────────
  return generateStandardCards(noteType, fields, siblingGroup, deckOverrides);
}

// ── Standard card generation (including reversed) ──────────────────────────

function generateStandardCards(
  noteType: NoteType,
  fields: Record<string, string>,
  siblingGroup: string,
  deckOverrides?: Record<number, string>,
): GeneratedCard[] {
  const cards: GeneratedCard[] = [];

  for (let i = 0; i < noteType.templates.length; i++) {
    const template = noteType.templates[i];

    // Skip templates whose front would be empty
    const rendered = renderCardTemplate({
      frontTemplate: template.front_template,
      backTemplate: template.back_template,
      fields,
      css: noteType.css || "",
    });

    // Don't generate a card if the front side is completely empty
    const frontStripped = rendered.front.replace(/<[^>]*>/g, "").trim();
    if (!frontStripped && !rendered.typeAnswerField) continue;

    cards.push({
      front: rendered.front,
      back: rendered.back,
      templateIndex: i,
      templateName: template.name,
      siblingGroup,
      source: "manual",
      clozeOrdinal: null,
      css: rendered.css,
      typeAnswerField: rendered.typeAnswerField,
      fields,
      noteTypeId: noteType.id,
      deckOverride: deckOverrides?.[i],
    });
  }

  return cards;
}

// ── Cloze card generation ──────────────────────────────────────────────────

function generateClozeCards(
  noteType: NoteType,
  fields: Record<string, string>,
  siblingGroup: string,
  deckOverrides?: Record<number, string>,
): GeneratedCard[] {
  const ordinals = extractClozeOrdinals(fields);
  if (ordinals.length === 0) return [];

  const cards: GeneratedCard[] = [];
  // Use the first (usually only) template for cloze types
  const template = noteType.templates[0];
  if (!template) return [];

  for (const ordinal of ordinals) {
    const rendered = renderCardTemplate({
      frontTemplate: template.front_template,
      backTemplate: template.back_template,
      fields,
      css: noteType.css || "",
      clozeOrdinal: ordinal,
    });

    cards.push({
      front: rendered.front,
      back: rendered.back,
      templateIndex: 0,
      templateName: `Cloze ${ordinal}`,
      siblingGroup,
      source: "cloze",
      clozeOrdinal: ordinal,
      css: rendered.css,
      typeAnswerField: rendered.typeAnswerField,
      fields,
      noteTypeId: noteType.id,
      deckOverride: deckOverrides?.[ordinal - 1],
    });
  }

  return cards;
}

// ── Image occlusion card generation ────────────────────────────────────────

function generateImageOcclusionCards(
  noteType: NoteType,
  fields: Record<string, string>,
  siblingGroup: string,
  regions: OcclusionRegion[],
  mode: OcclusionMode,
  imageUrl: string,
  deckOverrides?: Record<number, string>,
): GeneratedCard[] {
  const cards: GeneratedCard[] = [];

  if (mode === "one-by-one") {
    // Each region generates a separate card.
    // Front: all regions occluded, Back: the active region revealed, others still occluded.
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      const front = renderImageOcclusionFront(
        imageUrl,
        regions,
        i,
        "one-by-one",
      );
      const back = renderImageOcclusionBack(imageUrl, regions, i, "one-by-one");

      cards.push({
        front,
        back,
        templateIndex: 0,
        templateName: `Occlusion ${i + 1}${region.label ? `: ${region.label}` : ""}`,
        siblingGroup,
        source: "manual",
        clozeOrdinal: null,
        css: noteType.css || "",
        typeAnswerField: null,
        fields: {
          ...fields,
          _occlusion_regions: JSON.stringify(regions),
          _occlusion_mode: mode,
          _occlusion_image: imageUrl,
          _occlusion_active: String(i),
        },
        noteTypeId: noteType.id,
        deckOverride: deckOverrides?.[i],
      });
    }
  } else {
    // "all-at-once" — one card per region, but on front ALL regions are occluded,
    // and on back ALL regions are revealed.
    for (let i = 0; i < regions.length; i++) {
      const region = regions[i];
      const front = renderImageOcclusionFront(
        imageUrl,
        regions,
        i,
        "all-at-once",
      );
      const back = renderImageOcclusionBack(
        imageUrl,
        regions,
        i,
        "all-at-once",
      );

      cards.push({
        front,
        back,
        templateIndex: 0,
        templateName: `Occlusion ${i + 1}${region.label ? `: ${region.label}` : ""}`,
        siblingGroup,
        source: "manual",
        clozeOrdinal: null,
        css: noteType.css || "",
        typeAnswerField: null,
        fields: {
          ...fields,
          _occlusion_regions: JSON.stringify(regions),
          _occlusion_mode: mode,
          _occlusion_image: imageUrl,
          _occlusion_active: String(i),
        },
        noteTypeId: noteType.id,
        deckOverride: deckOverrides?.[i],
      });
    }
  }

  return cards;
}

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Check if a note type generates multiple cards (reversed / cloze / occlusion).
 */
export function isMultiCardNoteType(noteType: NoteType): boolean {
  return (
    noteType.templates.length > 1 ||
    noteType.name === "Cloze" ||
    noteType.name === "Image Occlusion" ||
    noteType.templates.some(
      (t) =>
        t.front_template.includes("{{cloze:") ||
        t.back_template.includes("{{cloze:}"),
    )
  );
}

/**
 * Count how many cards a set of fields would generate for a given note type.
 */
export function countGeneratedCards(
  noteType: NoteType,
  fields: Record<string, string>,
  occlusionRegions?: OcclusionRegion[],
): number {
  const isCloze =
    noteType.name === "Cloze" ||
    noteType.templates.some(
      (t) =>
        t.front_template.includes("{{cloze:") ||
        t.back_template.includes("{{cloze:"),
    );

  if (isCloze) {
    return extractClozeOrdinals(fields).length;
  }

  if (occlusionRegions && occlusionRegions.length > 0) {
    return occlusionRegions.length;
  }

  return noteType.templates.length;
}
